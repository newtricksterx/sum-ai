_LENGTH_GUIDANCE = {
    "short": "Target 90 to 140 words total.",
    "medium": "Target 180 to 260 words total.",
    "long": "Target 320 to 450 words total.",
}

_FORMAT_GUIDANCE = {
    "bullet-point": "Use one <ul> with 5 to 8 concise <li> items. Max 25 words per <li>",
    "paragraph": "Use 2 to 4 short <p> paragraphs.",
    "tl-dr": (
        "One <p> that begins with <strong>TL;DR:</strong>, "
    ),
    "key-takeaways": (
        "Use one <ul> with 4 to 7 <li> items. Each item should begin with "
        "a short <strong>label:</strong> followed by an explanation."
    ),
    "action-items": (
        "Use one <ol> with 4 to 8 concrete actions. "
        "Each <li> should start with a verb."
    ),
    "q-and-a": (
        "Create 4 to 6 Q&A pairs using repeating blocks of "
        "<h3>Question</h3> then <p>Answer</p>."
    ),
    "pros-cons": (
        "Use <h3>Pros</h3> + <ul> (3 to 6 <li>) and "
        "<h3>Cons</h3> + <ul> (2 to 5 <li>)."
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
