import logging
from typing import Callable

from api.plans import get_character_limit
from scripts.SumAI import SumAI
from scripts.sources import ExtractionResult, default_registry

logger = logging.getLogger(__name__)

# Hard ceiling applied to every request regardless of plan. Bounds prompt size
# sent to Gemini (cost / abuse / memory). Raise deliberately; do not remove.
MAX_CONTENT_CHARACTERS = 250_000


def _resolve_character_limit(character_limit: int | None) -> int:
    if character_limit is None:
        free_limit = get_character_limit("free")
        return min(free_limit, MAX_CONTENT_CHARACTERS) if free_limit else MAX_CONTENT_CHARACTERS
    return min(character_limit, MAX_CONTENT_CHARACTERS)


def _truncate(text: str, character_limit: int) -> str:
    if character_limit > 0:
        return text[:character_limit]
    return text


def _run_pipeline(request, character_limit: int | None, llm_call: Callable[[str], dict]) -> dict:
    source: ExtractionResult = default_registry.extract(request)
    if not source.is_success:
        return {"isSuccess": False, "content": source.error}

    limit = _resolve_character_limit(character_limit)
    text = _truncate(source.content or "", limit)

    result = llm_call(text)
    return {
        "isSuccess": result.get("isSuccess"),
        "content": result.get("content"),
    }


def get_summary(request, character_limit: int | None = None) -> dict:
    return _run_pipeline(
        request,
        character_limit,
        lambda text: SumAI.SummarizeContent(
            text,
            request.data.get("length"),
            request.data.get("format"),
            request.data.get("language"),
        ),
    )


def get_action_item(request, character_limit: int | None = None) -> dict:
    return _run_pipeline(
        request,
        character_limit,
        lambda text: SumAI.ActionContent(
            request.data.get("type"),
            request.data.get("language"),
            text,
            request.data.get("quiz_difficulty"),
        ),
    )
