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


def CreateSummaryQuery(page_content, length, format, language, max_input_chars=MAX_INPUT_CHARS, source_url=None):
    text = utils._to_text(page_content)
    if isinstance(max_input_chars, int) and max_input_chars > 0:
        text = text[:max_input_chars]

    if not text:
        raise ValueError("Cannot summarize empty content.")

    normalized_length = utils._normalize_length(length)
    normalized_format = utils._normalize_format(format)
    normalized_language = utils._normalize_language(language)

    query = f"""
            ROLE:
            You are a backend summarization engine that takes content and summarizes that content in rich-text JSON.

            TASK:
            Summarize SOURCE_TEXT in {normalized_language}.

            PARAMETERS:
            - Length profile: {normalized_length} ({_LENGTH_GUIDANCE[normalized_length]})
            
            Return ONLY a valid JSON object. Do not wrap the response in markdown fences.
            Do not include explanations, comments, or text outside the JSON.

            Use this exact schema:
            - Format rule: {_JSON_FORMAT_GUIDANCE[normalized_format]}

            - Return valid JSON only.
            - Do not use markdown formatting such as ```json.
            - Do not add fields outside this schema.
            - "title" should be a concise title for the summarized content.
            - Each item in "children" must contain a "text" field.
            - Split text into separate children only when formatting changes.
            - Plain text should stay in one segment when possible.
            - Inline marks are optional. The allowed marks are "bold", "italic", "code", "var", and "link".
              Each mark has ONE meaning. Do not substitute one mark for another, and do not invent new marks.

              * "bold": true — the single most important concept being introduced in that bullet or paragraph.
                  - At most ONE bold segment per bullet/paragraph.
                  - Never bold whole sentences.
                  - Never use "bold" for source code, variables, equations, or URLs — those use "code", "var", or "link".

              * "italic": true — contrast, foreign/loanwords, or titles of works (books, papers, films).
                  - Use sparingly. Do not use "italic" as a generic emphasis substitute for "bold".

              * "code": true — LITERAL source code, as it would be typed into a file or terminal.
                  Use ONLY for: function/method calls with parentheses, identifiers from a real codebase,
                  file paths, CLI flags, shell commands, JSON/YAML keys, HTML/XML tags, regex literals.
                  Examples: fit(), useState, /etc/hosts, --verbose, <div>, npm install.
                  DO NOT use "code" for mathematical content. Single-letter math variables like x, A, or b
                  are NOT code even though they look like identifiers — they use "var".

              * "var": true — MATHEMATICAL notation, as it would be typeset in LaTeX math mode ($...$).
                  Use ONLY for: math variables (x, y, A), matrix/vector names, equations (Ax = b, y = mx + c),
                  function notation in math (f(x), sin θ), Greek letters (σ, π, λ), and math operators in context.
                  DO NOT use "var" for programming identifiers or any text that would appear in a code editor.

                  Notation rules — write the FORMATTED form directly inside the "text" string.
                  Never use caret (^) or underscore (_) ASCII notation when a Unicode glyph exists.
                    - Exponents/powers: use Unicode superscripts ⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ.
                        Write "x²", "σ²", "eⁿ", "e⁻ⁿ", "10⁻³". Never "x^2", "x**2", or "10e-3".
                    - Inverses: write the Unicode superscript "⁻¹" appended to the symbol.
                        Write "A⁻¹", "B⁻¹", "(AB)⁻¹". Never "A^-1", "A^(-1)", or "inv(A)".
                    - Subscripts: use Unicode subscripts ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎.
                        Write "x₁", "x₂", "b₃", "a₀", "x₁ + x₂ = b₁". Never "x_1" or "x_{1}".
                    - Greek letters: use the Unicode glyph directly: α β γ δ ε ζ η θ ι κ λ μ ν ξ π ρ σ τ φ χ ψ ω, and capitals Α Β Γ Δ Θ Λ Π Σ Φ Ω.
                        Never spell them out ("alpha", "sigma") and never escape them ("\\sigma", "&sigma;").
                    - Compound expressions stay in ONE "var" segment so the whole equation renders together.
                        Good: {{ "text": "Ax = b", "var": true }}. Bad: splitting "A", "x", " = ", "b" into four segments.
                    - Fallback ONLY when no Unicode glyph exists (e.g., exponent is a variable letter or a multi-term expression):
                        Use parenthesized inline form inside the same segment, e.g., "x^(k)" or "e^(a+b)". This is a last resort.

                  Examples: x, A⁻¹, Ax = b, σ², f(x), x₁ + x₂ = b₁, e⁻ⁿ, sin θ, ∑ᵢ xᵢ.

              * "link": "<full URL>" — ONLY when the source content contains an actual URL.
                  "text" is the visible label; "link" is the full URL. Never invent URLs.

            - Decision rule for "code" vs "var":
                If the segment would be set in a code editor's monospace font → "code".
                If it would be set in math typography (LaTeX $...$) → "var".
                For an isolated single letter referring to a math object, prefer "var".

            - Marks may be combined when both genuinely apply, e.g. {{ "text": "fit()", "bold": true, "var": true }}.
              Do NOT combine "code" and "var" on the same segment — pick whichever fits the source meaning.

            - Split text into separate children ONLY when a mark applies to a sub-span.
              Plain text without marks stays in a single segment.

            - Do not invent URLs, facts, or details that are not present in the source content.
            

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

    query = f""" 
            # ROLE: You are an engine that generates {type} content.

            # TASK: Based on SOURCE_CONTENT - generate new content as {type}

            # RESPONSE RULES:
            1) Return the new generated content in this format: {_TYPE_FORMAT_GUIDANCE[type]}
            2) Only use the context provided in #SOURCE_CONTENT
            3) Be faithful to SOURCE_CONTENT. Do not invent facts, quotes, or stats.
            4) It must be done in language: {language}


            # SOURCE_CONTENT:
            {content}
            """
    
    return query


def CreateActionContent(type, language, content):
    normalized_type = utils._to_text(type).lower()
    parser_by_type = {
        "flashcards": parsers._parse_flashcards,
        "quiz": parsers._parse_quiz,
    }
    if normalized_type not in parser_by_type:
        raise ValueError("CreateActionContent currently supports only flashcards and quiz.")

    query = CreateActionQuery(normalized_type, language, content)
    if not query:
        return []

    result = query if ECHO_PROMPT_MODE else QueryAI(query=query)
    return parser_by_type[normalized_type](result)

    
def ActionContent(type, language, content):
    normalized_type = utils._to_text(type).lower()
    logger.debug(f'Action type: {normalized_type}, Received at: {time.time()}')

    try:
        return CreateActionContent(normalized_type, language, content)
    except Exception:
        logger.exception(f"Failed to generate {normalized_type} output.")
        if normalized_type in {"flashcards", "quiz"}:
            return []
        return (
            f"<h1>{normalized_type} unavailable</h1>"
            f"<p>We could not generate a {normalized_type} right now. Please try again.</p>"
        )
