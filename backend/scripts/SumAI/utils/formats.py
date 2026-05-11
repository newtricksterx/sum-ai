_LENGTH_GUIDANCE = {
    "short": "Target 30 to 100 words total.",
    "medium": "Target 120 to 240 words total.",
    "long": "Target 260 to 420 words total.",
}

_FORMAT_GUIDANCE = {
    "bullet-point": (
        "Use one <ul> with 5 to 8 concise <li> items. Max 25 words per <li>"
    ),
    "paragraph": (
        "Use 2 to 4 short <p> paragraphs."
    ),
    "tl-dr": (
        "On TL;DR block, 1-3 sentences and 100 words maximum. Structure: "
        "<h3>tl;dr: <h3>"
        "<p>[tl;dr contents]<p>"
    ),
    "q-and-a": (
        "Create 4 to 6 Q&A pairs using repeating blocks of "
        "<h3>Question: [QUESTION]</h3> then <p>Answer: [ANSWER]</p>."
    ),
    "pros-cons": (
        "Use <h3>Pros:</h3> + <ul> (3 to 6 <li>) and "
        "<h3>Cons:</h3> + <ul> (2 to 5 <li>)."
    ),
}

_LANGUAGE_DISPLAY = {
    "english": "English",
    "french": "French",
    "spanish": "Spanish",
    "mandarin": "Mandarin Chinese",
    "hindi": "Hindi",
}

_TYPE_FORMAT_GUIDANCE = {
    "flashcards": (
        "Return ONLY valid JSON as an array of objects with keys "
        '"question" and "answer". Example: '
        '[{"question":"What is X?","answer":"X is ..."}]. '
        "Create 4 to 8 cards. "
        "Question must be maximum 20 words. "
        "Answer must be maximum 20 words."
    ),

    "quiz": (
        "Return ONLY valid JSON as an array of objects with keys "
        '"prompt", "options", "correctIndex", and "explanation". '
        "Each options value must be an array of 4 strings. "
        "Exactly one option is correct, and correctIndex must be the zero-based index "
        "of the correct option in options. "
        "Create 5 to 10 quiz objects. "
        'Example: [{"prompt":"...","options":["A","B","C","D"],"correctIndex":1,"explanation":"..."}]'
    ),
}
