from . import formats


def to_text(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _normalize_option(value, options, default: str) -> str:
    key = to_text(value).lower()
    return key if key in options else default


def normalize_length(value) -> str:
    return _normalize_option(value, formats.LENGTH_GUIDANCE, "medium")


def normalize_format(value) -> str:
    return _normalize_option(value, formats.JSON_FORMAT_GUIDANCE, "bullet-point")


def normalize_language(value) -> str:
    return formats.LANGUAGE_DISPLAY.get(to_text(value).lower(), "English")


def normalize_action_type(value) -> str:
    return to_text(value).lower()


def is_supported_action_type(value: str) -> bool:
    return value in formats.ACTION_FORMAT_GUIDANCE


def build_summary_query(text: str, length, format, language) -> str:
    if not text:
        raise ValueError("Cannot summarize empty content.")

    normalized_length = normalize_length(length)
    normalized_format = normalize_format(format)
    normalized_language = normalize_language(language)

    return f"""\
            INLINE_MARKS_RULES: {formats.INLINE_MARKS_RULES}

            ROLE: Summarization engine producing rich-text JSON.

            TASK: Summarize SOURCE_TEXT in {normalized_language}.
            PARAMETERS:
            - Length: {normalized_length} ({formats.LENGTH_GUIDANCE[normalized_length]})

            Schema:
            {formats.JSON_FORMAT_GUIDANCE[normalized_format]}

            SOURCE_TEXT:
            {text}
"""


def build_action_query(action_type: str, language, content: str, quiz_difficulty) -> str:
    if not content:
        return ""

    normalized_language = normalize_language(language)

    query = f"""\
            INLINE_MARKS_RULES: {formats.INLINE_MARKS_RULES}

            ROLE: Engine that generates {action_type} content from a source summary.

            TASK: Produce {action_type} based on SOURCE_CONTENT, in {normalized_language}.

            Schema:
            {formats.ACTION_FORMAT_GUIDANCE[action_type]}

            SOURCE_CONTENT:
            {content}

            """

    if quiz_difficulty:
        query += f"DIFFICULTY: Generate quiz with {quiz_difficulty} difficulty."
    return query
