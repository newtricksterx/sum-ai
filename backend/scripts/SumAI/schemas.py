"""Gemini response schemas (constrained decoding) for summary formats and action types.

These enforce STRUCTURE only: field names, types, block shapes, option counts.
Semantic rules a schema cannot express (exactly one correct quiz option, mark
usage, content quality) live in formats.py prompt text and are checked by
response.validate_* inside the provider retry loop.

Schemas are plain dicts in the Gemini OpenAPI-subset style (uppercase types,
propertyOrdering) accepted by GenerateContentConfig.response_schema.
"""

_INLINE_SEGMENT = {
    "type": "OBJECT",
    "properties": {
        "text": {"type": "STRING"},
        "bold": {"type": "BOOLEAN"},
        "italic": {"type": "BOOLEAN"},
        "code": {"type": "BOOLEAN"},
        "var": {"type": "BOOLEAN"},
        "link": {"type": "STRING"},
    },
    "required": ["text"],
    "propertyOrdering": ["text", "bold", "italic", "code", "var", "link"],
}

_INLINE_ARRAY = {"type": "ARRAY", "minItems": 1, "items": _INLINE_SEGMENT}

# For fields the prompts require to be plain text (questions, flashcard fronts,
# headings stay prompt-enforced): no mark properties at all.
_PLAIN_TEXT_ARRAY = {
    "type": "ARRAY",
    "minItems": 1,
    "items": {
        "type": "OBJECT",
        "properties": {"text": {"type": "STRING"}},
        "required": ["text"],
    },
}


def _children_block(block_types: list[str]) -> dict:
    return {
        "type": "OBJECT",
        "properties": {
            "type": {"type": "STRING", "enum": block_types},
            "children": _INLINE_ARRAY,
        },
        "required": ["type", "children"],
        "propertyOrdering": ["type", "children"],
    }


def _document_schema(format_value: str, block_schema: dict, *, max_blocks: int | None = None) -> dict:
    blocks: dict = {"type": "ARRAY", "minItems": 1, "items": block_schema}
    if max_blocks is not None:
        blocks["maxItems"] = max_blocks
    return {
        "type": "OBJECT",
        "properties": {
            "title": {"type": "STRING"},
            "format": {"type": "STRING", "enum": [format_value]},
            "blocks": blocks,
        },
        "required": ["title", "format", "blocks"],
        "propertyOrdering": ["title", "format", "blocks"],
    }


_QNA_PAIR_BLOCK = {
    "type": "OBJECT",
    "properties": {
        "type": {"type": "STRING", "enum": ["qna_pair"]},
        "question": _PLAIN_TEXT_ARRAY,
        "answer": _INLINE_ARRAY,
    },
    "required": ["type", "question", "answer"],
    "propertyOrdering": ["type", "question", "answer"],
}

_FLASHCARD_BLOCK = {
    "type": "OBJECT",
    "properties": {
        "type": {"type": "STRING", "enum": ["flashcard"]},
        "front": _PLAIN_TEXT_ARRAY,
        "back": _INLINE_ARRAY,
    },
    "required": ["type", "front", "back"],
    "propertyOrdering": ["type", "front", "back"],
}

_QUIZ_OPTION = {
    "type": "OBJECT",
    "properties": {
        "key": {"type": "STRING", "enum": ["A", "B", "C", "D"]},
        "correct": {"type": "BOOLEAN"},
        "children": _INLINE_ARRAY,
    },
    "required": ["key", "correct", "children"],
    "propertyOrdering": ["key", "correct", "children"],
}

_QUIZ_QUESTION_BLOCK = {
    "type": "OBJECT",
    "properties": {
        "type": {"type": "STRING", "enum": ["question"]},
        "question": _PLAIN_TEXT_ARRAY,
        "options": {"type": "ARRAY", "minItems": 4, "maxItems": 4, "items": _QUIZ_OPTION},
        "explanation": _INLINE_ARRAY,
    },
    "required": ["type", "question", "options", "explanation"],
    "propertyOrdering": ["type", "question", "options", "explanation"],
}


SUMMARY_RESPONSE_SCHEMAS = {
    "bullet-point": _document_schema("bullet-point", _children_block(["bullet"])),
    "paragraph": _document_schema("paragraph", _children_block(["heading", "paragraph"])),
    "tl-dr": _document_schema("tl-dr", _children_block(["tl-dr"]), max_blocks=1),
    "q-and-a": _document_schema("q-and-a", _QNA_PAIR_BLOCK),
    "pros-cons": _document_schema("pros-cons", _children_block(["pro", "con"])),
}

ACTION_RESPONSE_SCHEMAS = {
    "flashcards": _document_schema("flashcards", _FLASHCARD_BLOCK, max_blocks=12),
    "quiz": _document_schema("quiz", _QUIZ_QUESTION_BLOCK, max_blocks=10),
}
