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
from google.genai import types as genai_types

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


def _normalize_option(value, options, default):
    key = _to_text(value).lower()
    return key if key in options else default


def _normalize_length(value):
    return _normalize_option(value, formats._LENGTH_GUIDANCE, "medium")


def _normalize_format(value):
    return _normalize_option(value, formats._JSON_FORMAT_GUIDANCE, "bullet-point")


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

class _InvalidJSONResponse(RuntimeError):
    """Raised when Gemini returns a body that does not parse as JSON, despite a JSON mime type being requested."""


def _is_retryable_gemini_error(exc):
    return (
        isinstance(exc, genai_errors.APIError)
        and getattr(exc, "code", None) in _RETRYABLE_STATUS_CODES
    )


def _should_retry(exc):
    return isinstance(exc, _InvalidJSONResponse) or _is_retryable_gemini_error(exc)


def _generate_with_retries(client, model_name, query, response_mime_type=None):
    last_exc = None
    require_json = response_mime_type == "application/json"

    request_kwargs = {"model": model_name, "contents": query}
    if response_mime_type:
        request_kwargs["config"] = genai_types.GenerateContentConfig(
            response_mime_type=response_mime_type,
        )

    for attempt in range(1, _MAX_ATTEMPTS_PER_MODEL + 1):
        try:
            response = client.models.generate_content(**request_kwargs)  # type: ignore[arg-type]
            text = getattr(response, "text", None)
            if not text:
                raise RuntimeError("Gemini returned an empty response.")
            if require_json:
                try:
                    json.loads(text)
                except json.JSONDecodeError as parse_exc:
                    logger.warning(
                        "Gemini %s returned invalid JSON on attempt %d.", model_name, attempt,
                    )
                    raise _InvalidJSONResponse(
                        "Gemini returned invalid JSON."
                    ) from parse_exc
            return text
        except Exception as exc:
            last_exc = exc
            if not _should_retry(exc) or attempt == _MAX_ATTEMPTS_PER_MODEL:
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
