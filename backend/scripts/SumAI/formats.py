LENGTH_GUIDANCE = {
    "short": "Target 50 to 100 words total.",
    "medium": "Target 150 to 250 words total.",
    "long": "Target 400 to 700 words total.",
}

INLINE_MARKS_RULES = """\
HARD CONSTRAINTS (violating any of these = invalid output):
1. Return ONE valid JSON object. No markdown fences, no commentary, no extra fields.
2. Never combine "code" and "var" on the same segment.
3. Never invent URLs or facts not present in the source.
4. "title" must be concise and derived from the source.

SEGMENT STRUCTURE:
Each inline element is {"text": <string>} with optional marks. Keep plain runs as one segment; split only where a mark begins or ends.
Marks may combine when both genuinely apply (e.g. {"text": "Ax = b", "var": true, "italic": true}).

MARK DEFINITIONS (each has ONE meaning — never invent or substitute):
- "bold": the single most important concept per bullet/paragraph. Never bold whole sentences, code, math, or URLs.
- "italic": contrast, foreign words, or titles of works. Use sparingly.
- "code": LITERAL source code — function calls, identifiers, file paths, CLI flags, JSON/HTML/regex. NOT math variables.
- "var": MATHEMATICAL notation — variables, equations, Greek letters, operators. NOT code identifiers.
- "link": "<full URL>" present in the source. Never invent a URL.

Deciding "code" vs "var": if it belongs in a code editor, use "code"; if it belongs in a math equation, use "var". A single letter naming a math object → "var".

MATH FORMATTING (inside "var" segments, write the formatted form directly in "text"):
- Unicode superscripts/subscripts: x², σ², A⁻¹, x₁, e⁻ⁿ. Never x^2 or x_1.
- Unicode Greek glyphs: α β γ θ σ Σ Ω. Never spell out or escape.
- Keep compound expressions in ONE segment: {"text": "Ax = b", "var": true}.
- Parenthesized fallback only when no Unicode glyph exists: e^(a+b).

CONTENT-AWARE MARKING: match marks to the source domain — technical docs/code → favor "code"; math/science → favor "var"; general prose → favor "bold" and "italic" only."""


JSON_FORMAT_GUIDANCE = {
    "bullet-point": """\
{
  "title": "...",
  "format": "bullet-point",
  "blocks": [
    {"type": "bullet", "children": [{"text": "..."}, {"text": "...", "bold": true}]}
  ]
}
Rules: one "bullet" block per point. No nested or empty bullets.""",

    "paragraph": """\
{
  "title": "...",
  "format": "paragraph",
  "blocks": [
    {"type": "heading",   "children": [{"text": "<2-5 word label, plain text>"}]},
    {"type": "paragraph", "children": [{"text": "..."}]}
  ]
}
Rules: alternate one "heading" with one or more "paragraph" blocks. One cohesive idea per paragraph. Headings are plain text (no marks).""",

    "tl-dr": """\
{
  "title": "...",
  "format": "tl-dr",
  "blocks": [
    {"type": "tl-dr", "children": [{"text": "..."}]}
  ]
}
Rules: exactly ONE "tl-dr" block. One or two dense sentences, leading with the takeaway. No headings, bullets, or extra paragraphs.""",

    "q-and-a": """\
{
  "title": "...",
  "format": "q-and-a",
  "blocks": [
    {"type": "qna_pair",
     "question": [{"text": "<plain text question>"}],
     "answer":   [{"text": "..."}]}
  ]
}
Rules: each block is "qna_pair". "question" is plain text only (no marks) and is a genuine question, not a heading rephrased. "answer" does not restate the question.""",

    "pros-cons": """\
{
  "title": "...",
  "format": "pros-cons",
  "blocks": [
    {"type": "pro", "children": [{"text": "..."}]},
    {"type": "con", "children": [{"text": "..."}]}
  ]
}
Rules: flat list of "pro" and "con" blocks (do not group). Each is one distinct point stated as a direct claim. Lead with the strongest pro and the strongest con. Keep counts balanced (≤2 difference).""",
}


LANGUAGE_DISPLAY = {
    "english": "English",
    "french": "French",
    "spanish": "Spanish",
    "mandarin": "Mandarin Chinese",
    "hindi": "Hindi",
}


QUIZ_DIFFICULTY_GUIDANCE = {
    "easy": "introductory — focus on recall of key facts and definitions",
    "medium": "intermediate — mix recall with application and comparison",
    "hard": "advanced — emphasis on analysis, edge cases, and synthesis",
}


ACTION_FORMAT_GUIDANCE = {
    "flashcards": """\
{
  "title": "...",
  "format": "flashcards",
  "blocks": [
    {"type": "flashcard",
     "front": [{"text": "<plain text question or term>"}],
     "back":  [{"text": "..."}]}
  ]
}
Rules: each block is "flashcard". "front" is plain text only — a focused question or term, answerable in 1-2 sentences (split into two cards otherwise). "back" is a direct answer, not a restatement of the front. One idea per card.""",

    "quiz": """\
{
  "title": "...",
  "format": "quiz",
  "blocks": [
    {"type": "question",
     "question": [{"text": "<plain text question>"}],
     "options": [
       {"key": "A", "correct": false, "children": [{"text": "..."}]},
       {"key": "B", "correct": true,  "children": [{"text": "..."}]},
       {"key": "C", "correct": false, "children": [{"text": "..."}]},
       {"key": "D", "correct": false, "children": [{"text": "..."}]}
     ],
     "explanation": [{"text": "..."}]}
  ]
}
Rules: each block is "question" with plain-text "question" (no marks), exactly 4 options keyed A-D, and "explanation". Exactly ONE option has "correct": true; vary which key is correct across questions. Wrong options must be plausible (common misconceptions, not absurd filler). Up to 10 questions.""",
}


SUMMARY_ERROR_DOCUMENT = {
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
