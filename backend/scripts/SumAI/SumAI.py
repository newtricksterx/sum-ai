import json
import logging
import os
import time

from . import formats, prompts, response, schemas
from .llm import LLMProvider, get_default_provider

DEBUG_MODE = os.getenv("DEBUG", "False").lower() == "true"
ECHO_PROMPT_MODE = os.getenv("GEMINI_ECHO_PROMPT", "False").lower() == "true"

if DEBUG_MODE:
    import certifi
    os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
    os.environ["SSL_CERT_FILE"] = certifi.where()

logger = logging.getLogger(__name__)


def QueryAI(
    query: str,
    response_mime_type: str | None = None,
    response_schema: dict | None = None,
    validate_payload=None,
    provider: LLMProvider | None = None,
) -> str:
    provider = provider or get_default_provider()
    return provider.generate(
        query,
        response_mime_type=response_mime_type,
        response_schema=response_schema,
        validate_payload=validate_payload,
    )


def SummarizeContent(content, length, format, language, provider: LLMProvider | None = None) -> dict:
    logger.debug("SummarizeContent request received at %s", time.time())

    try:
        text = prompts.to_text(content)
        normalized_format = prompts.normalize_format(format)
        query = prompts.build_summary_query(text, length, format, language)
        result = query if ECHO_PROMPT_MODE else QueryAI(
            query,
            response_mime_type="application/json",
            response_schema=schemas.SUMMARY_RESPONSE_SCHEMAS[normalized_format],
            validate_payload=lambda payload: response.validate_summary_document(payload, normalized_format),
            provider=provider,
        )
        return {"isSuccess": True, "content": result}
    except Exception:
        logger.exception("Failed to generate summary output.")
        return {
            "isSuccess": False,
            "content": json.dumps(formats.SUMMARY_ERROR_DOCUMENT),
        }


def ActionContent(type, language, content, quizDifficulty, provider: LLMProvider | None = None) -> dict:
    normalized_type = prompts.normalize_action_type(type)
    logger.debug("Action type: %s, Received at: %s", normalized_type, time.time())

    if not prompts.is_supported_action_type(normalized_type):
        logger.warning("Unsupported action type requested: %s", normalized_type)
        return {"isSuccess": False, "content": None}

    try:
        query = prompts.build_action_query(normalized_type, language, content, quizDifficulty)
        if not query:
            return {"isSuccess": False, "content": None}

        result = query if ECHO_PROMPT_MODE else QueryAI(
            query,
            response_mime_type="application/json",
            response_schema=schemas.ACTION_RESPONSE_SCHEMAS[normalized_type],
            validate_payload=lambda payload: response.validate_action_document(payload, normalized_type),
            provider=provider,
        )
        document = response.parse_action_document(result)
        if not isinstance(document, dict) or not document.get("blocks"):
            return {"isSuccess": False, "content": None}
        return {"isSuccess": True, "content": document}
    except Exception:
        logger.exception("Failed to generate %s output.", normalized_type)
        return {"isSuccess": False, "content": None}
