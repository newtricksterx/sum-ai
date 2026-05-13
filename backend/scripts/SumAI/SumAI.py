import os
import json
import ast
import certifi
import logging
import re
import time
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from google import genai
from google.genai import errors as genai_errors

from api.plans import get_character_limit

from .utils import utils, formats, parsers

DEBUG_MODE = os.getenv("DEBUG", "False").lower() == "true"
ECHO_PROMPT_MODE = os.getenv("GEMINI_ECHO_PROMPT", "False").lower() == "true"
# Default for anonymous requests and fallbacks (Free plan).
MAX_INPUT_CHARS = get_character_limit("free") or 10000


logger = logging.getLogger(__name__)

if DEBUG_MODE:
    os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()
    os.environ['SSL_CERT_FILE'] = certifi.where()  


utils._log_startup_config()


_LENGTH_GUIDANCE = formats._LENGTH_GUIDANCE
_JSON_FORMAT_GUIDANCE = formats._JSON_FORMAT_GUIDANCE
_TYPE_FORMAT_GUIDANCE = formats._TYPE_FORMAT_GUIDANCE
_INLINE_MARKS_RULES = formats._INLINE_MARKS_RULES


def CreateSummaryQuery(page_content, length, format, language, max_input_chars=MAX_INPUT_CHARS, source_url=None):
    text = utils._to_text(page_content)
    if isinstance(max_input_chars, int) and max_input_chars > 0:
        text = text[:max_input_chars]

    if not text:
        raise ValueError("Cannot summarize empty content.")

    normalized_length = utils._normalize_length(length)
    normalized_format = utils._normalize_format(format)
    normalized_language = utils._normalize_language(language)

    query = f"""\
ROLE: Summarization engine producing rich-text JSON.
TASK: Summarize SOURCE_TEXT in {normalized_language}.
PARAMETERS:
- Length: {normalized_length} ({_LENGTH_GUIDANCE[normalized_length]})

Schema:
{_JSON_FORMAT_GUIDANCE[normalized_format]}

{_INLINE_MARKS_RULES}

SOURCE_TEXT:
{text}
"""

    return query

def QueryAI(query, response_mime_type=None):
    api_key, model_name, missing = utils._get_gemini_config()
    if missing:
        raise RuntimeError(
            "Gemini is not configured. Missing env var(s): "
            + ", ".join(missing)
        )

    client = utils._get_gemini_client(api_key)
    fallback_model = utils._get_gemini_fallback_model()

    try:
        return utils._generate_with_retries(
            client, model_name, query, response_mime_type=response_mime_type,
        )
    except Exception as primary_exc:
        # Fall back to a secondary model on transient API errors AND on
        # repeated invalid-JSON responses (some models drift on long schemas).
        if (
            fallback_model
            and fallback_model != model_name
            and utils._should_retry(primary_exc)
        ):
            logger.warning(
                "Gemini primary model %s exhausted retries; falling back to %s",
                model_name, fallback_model,
            )
            try:
                return utils._generate_with_retries(
                    client, fallback_model, query, response_mime_type=response_mime_type,
                )
            except Exception as fallback_exc:
                logger.exception("Gemini fallback model also failed.")
                raise RuntimeError("Gemini summary request failed.") from fallback_exc

        logger.exception("Gemini summary request failed.")
        raise RuntimeError("Gemini summary request failed.") from primary_exc

   
def SummarizeContent(content, length, format, language, max_input_chars=MAX_INPUT_CHARS, source_url=None):
    logger.debug(f"SummarizeContent request received at {time.time()}")

    try:
        query = CreateSummaryQuery(
            content,
            length,
            format,
            language,
            max_input_chars=max_input_chars,
            source_url=source_url,
        )
        result = query if ECHO_PROMPT_MODE else QueryAI(
            query=query, response_mime_type="application/json",
        )
        return (
            {
                "success": True,
                "content": result,
            }
        )
    except Exception:
        logger.exception("Failed to generate summary output.")
        error_document = {
            "title": "Summary unavailable",
            "format": "error",
            "blocks": [
                {
                    "type": "paragraph",
                    "children": [
                        {"text": "We could not generate a summary right now. Please try again."},
                    ],
                },
            ],
        }
        return (
            {
                "success": False,
                "content": json.dumps(error_document),
            }
        )
    

def CreateActionQuery(type, language, content):
    if not content:
        return ""
    
    query = f"""\
ROLE: Engine that generates {type} content from a source summary.
TASK: Produce {type} based on SOURCE_CONTENT, in {language}.

Schema:
{_TYPE_FORMAT_GUIDANCE[type]}

{_INLINE_MARKS_RULES}

SOURCE_CONTENT:
{content}
"""
    return query


def CreateActionContent(type, language, content):
    normalized_type = utils._to_text(type).lower()
    if normalized_type not in {"flashcards", "quiz"}:
        raise ValueError("CreateActionContent currently supports only flashcards and quiz.")

    query = CreateActionQuery(normalized_type, language, content)
    if not query:
        return None

    result = query if ECHO_PROMPT_MODE else QueryAI(
        query=query, response_mime_type="application/json",
    )
    return parsers._parse_action_document(result)


def ActionContent(type, language, content):
    normalized_type = utils._to_text(type).lower()
    logger.debug(f'Action type: {normalized_type}, Received at: {time.time()}')

    try:
        return CreateActionContent(normalized_type, language, content)
    except Exception:
        logger.exception(f"Failed to generate {normalized_type} output.")
        return None
