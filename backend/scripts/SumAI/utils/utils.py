import os
import certifi
import logging
import re
import time
from urllib.parse import urlparse
import json
import ast

from bs4 import BeautifulSoup
from google import genai
from google.genai import errors as genai_errors

from api.plans import get_character_limit
from . import formats

logger = logging.getLogger(__name__)
_GEMINI_CLIENT = None
_GEMINI_CLIENT_API_KEY = None

# Transient Gemini failures that are worth retrying.
_RETRYABLE_STATUS_CODES = {429, 500, 503, 504}
_MAX_ATTEMPTS_PER_MODEL = 3
_RETRY_BASE_DELAY_SECONDS = 1.0


def _get_gemini_config():
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_API_MODEL")
    missing = []
    if not api_key:
        missing.append("GEMINI_API_KEY")
    if not model_name:
        missing.append("GEMINI_API_MODEL")
    return api_key, model_name, missing


def _get_gemini_fallback_model():
    name = os.getenv("GEMINI_API_FALLBACK_MODEL", "").strip()
    return name or None


def _log_startup_config():
    _, model_name, missing = _get_gemini_config()
    if missing:
        logger.error(
            "Gemini is not fully configured. Missing env var(s): %s. "
            "Add them to backend/.env before calling summarize.",
            ", ".join(missing)
        )
    else:
        logger.info("Gemini config loaded. Using model: %s", model_name)


def _get_gemini_client(api_key):
    global _GEMINI_CLIENT, _GEMINI_CLIENT_API_KEY
    if _GEMINI_CLIENT is None or _GEMINI_CLIENT_API_KEY != api_key:
        _GEMINI_CLIENT = genai.Client(api_key=api_key)
        _GEMINI_CLIENT_API_KEY = api_key
    return _GEMINI_CLIENT


def _to_text(value):
    if value is None:
        return ""
    return str(value).strip()


def _normalize_http_url(value):
    candidate = _to_text(value)
    if not candidate:
        return ""

    parsed = urlparse(candidate)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ""
    return parsed.geturl()


def _extract_links(page_content, source_url=None):
    unique_links = []

    # Parse anchors if HTML was provided.
    if "<a" in page_content.lower():
        soup = BeautifulSoup(page_content, "html.parser")
        links = soup.find_all("a", href=True)
        for link in links[:15]:
            href = _normalize_http_url(link.get("href")) # type: ignore[arg-type]
            if href and href not in unique_links:
                unique_links.append(href)

    # Also capture raw URLs in plain text.
    raw_urls = re.findall(r"https?://[^\s<>()\"']+", page_content, flags=re.I)
    for raw_url in raw_urls[:15]:
        href = _normalize_http_url(raw_url.rstrip(".,;:!?"))
        if href and href not in unique_links:
            unique_links.append(href)

    source_href = _normalize_http_url(source_url)
    if source_href and source_href not in unique_links:
        unique_links.insert(0, source_href)

    return unique_links[:15]


def _truncate_key_point(text, max_chars=180):
    candidate = _to_text(text)
    if len(candidate) <= max_chars:
        return candidate
    cut = candidate[:max_chars].rsplit(" ", 1)[0].strip()
    if not cut:
        cut = candidate[:max_chars].strip()
    return f"{cut}..."


def _ensure_required_markup(html, fallback_links):
    soup = BeautifulSoup(html, "html.parser")

    title_heading = soup.find("h1")
    if title_heading is not None:
        title_heading["class"] = ["summary-title"]  # type: ignore[index]

    if soup.find("h2") is None:
        default_h2 = soup.new_tag("h2")
        default_h2.string = "Summary"
        if title_heading is not None:
            title_heading.insert_after(default_h2)
        else:
            soup.insert(0, default_h2)

    anchors = soup.find_all("a", href=True)
    for anchor in anchors:
        anchor["target"] = "_blank" # type: ignore
        anchor["rel"] = "noopener noreferrer" # type: ignore

    if not anchors and fallback_links:
        source_paragraph = soup.new_tag("p")
        strong_label = soup.new_tag("strong")
        strong_label.string = "Sources:"
        source_paragraph.append(strong_label)
        source_paragraph.append(" ")
        for index, href in enumerate(fallback_links[:2]):
            anchor = soup.new_tag("a", href=href)
            anchor["target"] = "_blank"
            anchor["rel"] = "noopener noreferrer"
            anchor.string = f"Source {index + 1}"
            source_paragraph.append(anchor)
            if index < min(len(fallback_links), 2) - 1:
                source_paragraph.append(" | ")
        soup.append(source_paragraph)

    return str(soup)


def _clean_ai_output(result, fallback_links=None):
    cleaned = re.sub(r"```html|```", "", result or "").strip()
    if not cleaned:
        return ""

    # Convert common markdown fallbacks so frontend still gets HTML.
    cleaned = re.sub(r"^### (.*)$", r"<h3>\1</h3>", cleaned, flags=re.M)
    cleaned = re.sub(r"^## (.*)$", r"<h2>\1</h2>", cleaned, flags=re.M)
    cleaned = re.sub(r"^# (.*)$", r"<h1>\1</h1>", cleaned, flags=re.M)
    cleaned = re.sub(r"^\* (.*)$", r"<li>\1</li>", cleaned, flags=re.M)
    cleaned = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", cleaned)
    cleaned = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2">\1</a>', cleaned)
    return _ensure_required_markup(cleaned, fallback_links or [])


def _normalize_option(value, options, default):
    key = _to_text(value).lower()
    return key if key in options else default


def _normalize_length(value):
    return _normalize_option(value, formats._LENGTH_GUIDANCE, "medium")


def _normalize_format(value):
    return _normalize_option(value, formats._FORMAT_GUIDANCE, "paragraph")


def _normalize_language(value):
    return formats._LANGUAGE_DISPLAY.get(_to_text(value).lower(), "English")

def _strip_markdown_fence(text):
    fenced_match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, flags=re.S | re.I)
    if fenced_match:
        return fenced_match.group(1).strip()
    return text.strip()


def _extract_json_array_segment(text):
    start_index = text.find("[")
    end_index = text.rfind("]")
    if start_index == -1 or end_index == -1 or end_index <= start_index:
        return text
    return text[start_index : end_index + 1]


def _sanitize_json_candidate(candidate):
    # Remove trailing commas like {"a":1,} or [1,2,]
    sanitized = re.sub(r",\s*([}\]])", r"\1", candidate)
    # Quote bare object keys like { prompt: "..." }.
    sanitized = re.sub(r'([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:', r'\1"\2":', sanitized)
    return sanitized


def _load_json_like_payload(raw_output):
    text = _to_text(raw_output)
    if not text:
        return None

    stripped_text = _strip_markdown_fence(text)
    candidates = [stripped_text]
    array_segment = _extract_json_array_segment(stripped_text)
    if array_segment and array_segment not in candidates:
        candidates.append(array_segment)

    for candidate in candidates:
        normalized_candidate = candidate.strip()
        if not normalized_candidate:
            continue

        for attempt in [normalized_candidate, _sanitize_json_candidate(normalized_candidate)]:
            try:
                return json.loads(attempt)
            except Exception:
                continue

        # Fallback parser for Python-like list/dict syntax.
        try:
            parsed_literal = ast.literal_eval(normalized_candidate)
            if isinstance(parsed_literal, (list, dict)):
                return parsed_literal
        except Exception:
            continue

    return None

def _is_retryable_gemini_error(exc):
    return (
        isinstance(exc, genai_errors.APIError)
        and getattr(exc, "code", None) in _RETRYABLE_STATUS_CODES
    )


def _generate_with_retries(client, model_name, query):
    last_exc = None
    for attempt in range(1, _MAX_ATTEMPTS_PER_MODEL + 1):
        try:
            response = client.models.generate_content(
                model=model_name,  # type: ignore
                contents=query,
            )
            if not getattr(response, "text", None):
                raise RuntimeError("Gemini returned an empty response.")
            return response.text
        except Exception as exc:
            last_exc = exc
            if not _is_retryable_gemini_error(exc) or attempt == _MAX_ATTEMPTS_PER_MODEL:
                raise
            delay = _RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1))
            logger.warning(
                "Gemini %s returned %s; retry %d/%d after %.1fs",
                model_name, getattr(exc, "code", "error"),
                attempt, _MAX_ATTEMPTS_PER_MODEL - 1, delay,
            )
            time.sleep(delay)
    # Unreachable, but keeps type checkers happy.
    raise last_exc  # type: ignore[misc]
