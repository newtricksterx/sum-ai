_LENGTH_GUIDANCE = {
    "short": "Target 50 to 100 words total.",
    "medium": "Target 150 to 250 words total.",
    "long": "Target 400 to 700 words total.",
}

_JSON_FORMAT_GUIDANCE = {
    "bullet-point": (
        """
        {
            "title": "Title of the summary",
            "format": "bullet-point",
            "blocks": [
                {
                    "type": "bullet",
                    "children": [
                        { "text": <plain text segment> },
                        { "text": <Important term>, "bold": true },
                        { "text": <code>", "code": true },
                        { "text": <emphasized word>, "italic": true },
                        { "text": <link text>, "link": "https://example.com" },
                        { "text": <variable>, "var": true}
                    ]
                }
            ]
        }

        Rules:
        - "format" must always be "bullet-point".
        - "blocks" must be an array.
        - Each bullet must be one object in "blocks" with "type": "bullet".
        - Each bullet must have a "children" array.
        - Do not nest bullets inside bullets.
        - Do not output empty bullets.
        """
    ),

    "paragraph": (
        """
        {
            "title": "Title of the summary",
            "format": "paragraph",
            "blocks": [
                {
                    "type": "heading",
                    "children": [
                        { "text": "<short descriptive heading>" }
                    ]
                },
                {
                    "type": "paragraph",
                    "children": [
                        { "text": "<plain text segment>" },
                        { "text": "<important term>", "bold": true },
                        { "text": "<code>", "code": true },
                        { "text": "<emphasized word>", "italic": true },
                        { "text": "<link text>", "link": "https://example.com" },
                        { "text": "<variable>", "var": true}
                    ]
                }
            ]
        }

        Rules:
        - Alternate between one "heading" block followed by one or more "paragraph" blocks
        - Each heading is a short 2-5 word label for the section that follows it
        - Each paragraph is one cohesive idea — do not dump the entire summary into one paragraph
        - Each block has a "children" array of inline text segments
        - Split text into segments only where formatting changes — plain runs stay as one segment
        - Headings never have marks — plain text only
        """
    ),

    "tl-dr" : (
        """
            {
                "title": "title of the summary",
                "format": "tl-dr",
                "blocks": [
                    {
                    "type": "tl-dr",
                    "children": [
                        { "text": "<plain text segment>" },
                        { "text": "<important term>", "bold": true },
                        { "text": "<code>", "code": true },
                        { "text": "<emphasized word>", "italic": true },
                        { "text": "<link text>", "link": "https://example.com" },
                        { "text": "<variable>", "var": true}
                    ]
                    }
                ]
                }

                Rules:
                - "blocks" contains exactly one object with type "tl-dr" — never more than one
                - Write it as a single, dense sentence or two — the kind you'd say out loud to a friend
                - Lead with the most important takeaway, not background context
                - Each block has a "children" array of inline text segments
                - Split text into segments only where formatting changes — plain runs stay as one segment
                - Do not use headings, bullets, or multiple paragraphs
                - Do not add any fields outside this schema
        """
    ),

    "q-and-a" : (
        """
            {
            "title": "Title of the summary",
            "format": "q-and-a",
            "blocks": [
                {
                    "type": "qna_pair",
                    "question": [
                        { "text": "<plain text question>", "bold": true }
                    ],
                    "answer": [
                        { "text": "<plain text segment>" },
                        { "text": "<important term>", "bold": true },
                        { "text": "<code>", "code": true },
                        { "text": "<emphasized word>", "italic": true },
                        { "text": "<link text>", "link": "https://example.com" },
                        { "text": "<variable>", "var": true}
                    ]
                }
            ]
            }

            Rules:
            - Each block has type "qna_pair" with two fields: "question" and "answer"
            - "question" is always plain text only — no bold, italic, or code marks
            - "question" must be a genuine question a curious reader would actually ask — not a heading rephrased as a question
            - Questions should be short, direct, and self-contained — readable without needing the answer for context
            - "answer" is a concise, direct response to its question — do not repeat the question inside the answer
            - Each "answer" has a "children" array of inline text segments
            - Split text into segments only where formatting changes — plain runs stay as one segment
            - Do not add any fields outside this schema
        """
    ),

    "pros-cons" : (
        """
        {
            "title": "Title of summary",
            "format": "pros-cons",
            "blocks": [
                {
                "type": "pro",
                "children": [
                    { "text": "<plain text segment>" },
                    { "text": "<important term>", "bold": true },
                    { "text": "<code>", "code": true },
                    { "text": "<emphasized word>", "italic": true },
                    { "text": "<link text>", "link": "https://example.com" },
                    { "text": "<variable>", "var": true}
                ]
                },
                {
                "type": "con",
                "children": [
                    { "text": "<plain text segment>" },
                    { "text": "<important term>", "bold": true },
                    { "text": "<code>", "code": true },
                    { "text": "<emphasized word>", "italic": true },
                    { "text": "<link text>", "link": "https://example.com" },
                    { "text": "<variable>", "var": true}
                ]
                }
            ]
        }

        Rules:
        - "blocks" contains a flat list of "pro" and "con" objects — do not nest them into separate groups
        - Each block has type "pro" or "con" and a "children" array of inline text segments
        - Your renderer will group them by type — you just emit them in discovery order
        - Each pro or con is one distinct point — do not combine multiple ideas into one block
        - State each point as a direct claim, not a question or a heading
        - Lead with the most impactful pro and the most impactful con
        - Split text into segments only where formatting changes — plain runs stay as one segment
        - Do not add any fields outside this schema
        - Aim for a balanced count — never more than 2 extra points on either side
        """
    )


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
