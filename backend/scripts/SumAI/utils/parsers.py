from . import utils
import re

def _parse_quiz(raw_output):
    payload = utils._load_json_like_payload(raw_output)
    if not isinstance(payload, list):
        return []

    quiz_items = []
    for item in payload:
        if not isinstance(item, dict):
            continue

        prompt = utils._to_text(item.get("prompt"))
        explanation = utils._to_text(item.get("explanation"))
        options_raw = item.get("options")
        correct_index_raw = item.get("correctIndex")

        if not prompt or not explanation or not isinstance(options_raw, list):
            continue

        options = []
        for option in options_raw:
            option_text = utils._to_text(option)
            if option_text:
                options.append(option_text)

        if len(options) < 2:
            continue

        correct_index = None
        if isinstance(correct_index_raw, int) and not isinstance(correct_index_raw, bool):
            correct_index = correct_index_raw
        elif isinstance(correct_index_raw, str) and correct_index_raw.strip().isdigit():
            correct_index = int(correct_index_raw.strip())

        if correct_index is None or correct_index < 0 or correct_index >= len(options):
            continue

        quiz_items.append(
            {
                "prompt": prompt,
                "options": options,
                "correctIndex": correct_index,
                "explanation": explanation,
            }
        )

    return quiz_items

def _parse_flashcards(raw_output):
    cards = []
    payload = utils._load_json_like_payload(raw_output)
    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict):
                question = utils._to_text(item.get("question"))
                answer = utils._to_text(item.get("answer"))
                if question and answer:
                    cards.append((question, answer))
            elif isinstance(item, (list, tuple)) and len(item) == 2:
                question = utils._to_text(item[0])
                answer = utils._to_text(item[1])
                if question and answer:
                    cards.append((question, answer))

    # Regex fallback: parse simple text forms like "Q: ... A: ...".
    if cards:
        return cards

    text = utils._to_text(raw_output)
    if not text:
        return []

    pairs = re.findall(
        r"(?:^|\n)\s*(?:Q(?:uestion)?\s*[:\-]\s*)(.+?)\s*(?:\n\s*(?:A(?:nswer)?\s*[:\-]\s*)(.+?))(?=\n\s*(?:Q(?:uestion)?\s*[:\-]|$)|$)",
        text,
        flags=re.I | re.S,
    )
    for question, answer in pairs:
        q = utils._to_text(question)
        a = utils._to_text(answer)
        if q and a:
            cards.append((q, a))

    return cards