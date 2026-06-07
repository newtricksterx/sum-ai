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

