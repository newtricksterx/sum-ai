import ast
import json
import re
from urllib.parse import urlsplit


def _to_text(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _strip_markdown_fence(text: str) -> str:
    fenced_match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, flags=re.S | re.I)
    if fenced_match:
        return fenced_match.group(1).strip()
    return text.strip()


def _extract_json_array_segment(text: str) -> str:
    start_index = text.find("[")
    end_index = text.rfind("]")
    if start_index == -1 or end_index == -1 or end_index <= start_index:
        return text
    return text[start_index : end_index + 1]


def _sanitize_json_candidate(candidate: str) -> str:
    sanitized = re.sub(r",\s*([}\]])", r"\1", candidate)
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

        try:
            parsed_literal = ast.literal_eval(normalized_candidate)
            if isinstance(parsed_literal, (list, dict)):
                return parsed_literal
        except Exception:
            continue

    return None

def parse_action_document(raw_output) -> dict | None:
    payload = _load_json_like_payload(raw_output)
    if not isinstance(payload, dict):
        return None

    title = payload.get("title")
    format_value = payload.get("format")
    blocks = payload.get("blocks")
    if not isinstance(title, str) or not isinstance(format_value, str):
        return None
    if not isinstance(blocks, list) or not blocks:
        return None

    return payload


def _is_inline_array(value) -> bool:
    return (
        isinstance(value, list)
        and len(value) > 0
        and all(isinstance(item, dict) and isinstance(item.get("text"), str) for item in value)
    )


def _has_document_envelope(payload, expected_format: str) -> bool:
    return (
        isinstance(payload, dict)
        and isinstance(payload.get("title"), str)
        and payload.get("format") == expected_format
        and isinstance(payload.get("blocks"), list)
        and len(payload["blocks"]) > 0
    )


def _is_children_block(block, allowed_types: frozenset) -> bool:
    return (
        isinstance(block, dict)
        and block.get("type") in allowed_types
        and _is_inline_array(block.get("children"))
    )


def _is_qna_pair_block(block) -> bool:
    return (
        isinstance(block, dict)
        and block.get("type") == "qna_pair"
        and _is_inline_array(block.get("question"))
        and _is_inline_array(block.get("answer"))
    )


def _is_flashcard_block(block) -> bool:
    return (
        isinstance(block, dict)
        and block.get("type") == "flashcard"
        and _is_inline_array(block.get("front"))
        and _is_inline_array(block.get("back"))
    )


def _is_quiz_question_block(block) -> bool:
    if not isinstance(block, dict) or block.get("type") != "question":
        return False
    if not _is_inline_array(block.get("question")) or not _is_inline_array(block.get("explanation")):
        return False
    options = block.get("options")
    if not isinstance(options, list) or len(options) != 4:
        return False
    correct_count = 0
    for option in options:
        if not isinstance(option, dict) or not isinstance(option.get("key"), str):
            return False
        if not _is_inline_array(option.get("children")):
            return False
        if option.get("correct") is True:
            correct_count += 1
    return correct_count == 1


_SUMMARY_BLOCK_TYPES = {
    "bullet-point": frozenset({"bullet"}),
    "paragraph": frozenset({"heading", "paragraph"}),
    "tl-dr": frozenset({"tl-dr"}),
    "pros-cons": frozenset({"pro", "con"}),
}


def validate_summary_document(payload, expected_format: str) -> bool:
    """Shape check for a parsed summary payload, mirroring what the frontend
    renderer for `expected_format` needs. Used inside the provider retry loop
    so a wrong-shaped response is retried instead of degrading silently."""
    if not _has_document_envelope(payload, expected_format):
        return False
    blocks = payload["blocks"]
    if expected_format == "q-and-a":
        return all(_is_qna_pair_block(block) for block in blocks)
    if expected_format == "tl-dr" and len(blocks) != 1:
        return False
    allowed_types = _SUMMARY_BLOCK_TYPES.get(expected_format)
    if allowed_types is None:
        return True
    return all(_is_children_block(block, allowed_types) for block in blocks)


def validate_action_document(payload, action_type: str) -> bool:
    """Shape check for a parsed action payload. Covers rules the response
    schema cannot express, e.g. exactly one correct quiz option."""
    if not _has_document_envelope(payload, action_type):
        return False
    blocks = payload["blocks"]
    if action_type == "flashcards":
        return all(_is_flashcard_block(block) for block in blocks)
    if action_type == "quiz":
        return all(_is_quiz_question_block(block) for block in blocks)
    return True

