from . import utils


def _parse_action_document(raw_output):
    payload = utils._load_json_like_payload(raw_output)
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
