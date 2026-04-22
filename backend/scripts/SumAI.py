import os
import certifi
import logging
import re
import time

from bs4 import BeautifulSoup
from google import genai

DEBUG_MODE = os.getenv("DEBUG", "False").lower() == "true"
MAX_INPUT_CHARS = 10000

logger = logging.getLogger(__name__)

if DEBUG_MODE:
    os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()
    os.environ['SSL_CERT_FILE'] = certifi.where()


def _get_gemini_config():
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_API_MODEL")
    missing = []
    if not api_key:
        missing.append("GEMINI_API_KEY")
    if not model_name:
        missing.append("GEMINI_API_MODEL")
    return api_key, model_name, missing


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


_log_startup_config()

def _to_text(value):
    if value is None:
        return ""
    return str(value).strip()


def _extract_link_string(page_content):
    # Extension requests currently pass plain text; only parse if HTML anchors exist.
    if "<a" not in page_content.lower():
        return ""

    soup = BeautifulSoup(page_content, "html.parser")
    links = soup.find_all("a", href=True)
    return ", ".join(link["href"] for link in links[:15])


def _clean_ai_output(result):
    cleaned = re.sub(r"```html|```", "", result or "").strip()
    if not cleaned:
        return ""

    # Convert common markdown fallbacks so frontend still gets HTML.
    cleaned = re.sub(r"^### (.*)$", r"<h3>\1</h3>", cleaned, flags=re.M)
    cleaned = re.sub(r"^## (.*)$", r"<h2>\1</h2>", cleaned, flags=re.M)
    cleaned = re.sub(r"^# (.*)$", r"<h1>\1</h1>", cleaned, flags=re.M)
    cleaned = re.sub(r"^\* (.*)$", r"<li>\1</li>", cleaned, flags=re.M)
    return cleaned

def CreateQuery(page_content, length, regenerate, format, language):
    text = _to_text(page_content)[:MAX_INPUT_CHARS]
    if not text:
        raise ValueError("Cannot summarize empty content.")

    normalized_length = _to_text(length) or "medium"
    normalized_format = _to_text(format) or "paragraphs"
    normalized_language = _to_text(language) or "English"
    link_string = _extract_link_string(text)
    different = "It also must be a different version" if regenerate else ""

    query = f"""
        # ROLE
        You are a specialized API that converts text into raw, semantic HTML. You do not talk to the user.

        # TASK
        Summarize the following text in {normalized_language}.
        Text: "{text}"

        # CONSTRAINTS
        - Length: {normalized_length}
        - Style: {different}
        - Format: Use {normalized_format} structure.
        - Links: Reference these URLs if relevant: {link_string}. 
        - Link Safety: All <a> tags must include target="_blank" and rel="noopener noreferrer".
        - Forbidden: No Markdown (###, **, ```), no 'class', no 'style', no <html>/<body> tags.

        # OUTPUT TEMPLATE
        <h1>Title of the Summary</h1>
        <h2>Introduction</h2>
        (write a 1 sentence introduction of the contents here)
        <h2>Summary</h2>
        (Output based on Format goes here)
        <strong>(any key points)</strong>
        """

    return query
    

def QueryAI(query):
    api_key, model_name, missing = _get_gemini_config()
    if missing:
        raise RuntimeError(
            "Gemini is not configured. Missing env var(s): "
            + ", ".join(missing)
        )

    client = genai.Client(api_key=api_key)

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=query
        )
        if not getattr(response, "text", None):
            raise RuntimeError("Gemini returned an empty response.")
        return response.text
    except Exception as exc:
        logger.exception("Gemini summary request failed.")
        raise RuntimeError("Gemini summary request failed.") from exc

   
def SummarizeContent(content, length, regenerate, format, language):
    logger.debug("SummarizeContent request received at %s", time.time())

    try:
        query = CreateQuery(content, length, regenerate, format, language)
        result = query if DEBUG_MODE else QueryAI(query=query)
        return _clean_ai_output(result)
    except Exception:
        logger.exception("Failed to generate summary output.")
        return (
            "<h1>Summary unavailable</h1>"
            "<p>We could not generate a summary right now. Please try again.</p>"
        )
