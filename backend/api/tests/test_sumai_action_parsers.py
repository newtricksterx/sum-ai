from django.test import SimpleTestCase

from scripts.SumAI.response import parse_action_document


class ParseActionDocumentTest(SimpleTestCase):
    def test_accepts_fenced_flashcards_document(self):
        raw_output = """
        ```json
        {
          "title": "Flashcards",
          "format": "flashcards",
          "blocks": [
            {
              "type": "flashcard",
              "front": [{ "text": "What is an LLM?" }],
              "back": [{ "text": "A large language model." }]
            }
          ]
        }
        ```
        """

        parsed = parse_action_document(raw_output)

        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["format"], "flashcards")
        self.assertEqual(len(parsed["blocks"]), 1)
        self.assertEqual(parsed["blocks"][0]["type"], "flashcard")

    def test_accepts_quiz_document(self):
        raw_output = """
        {
          "title": "Quiz",
          "format": "quiz",
          "blocks": [
            {
              "type": "question",
              "question": [{"text": "Q?"}],
              "options": [
                {"key": "A", "correct": true,  "children": [{"text": "right"}]},
                {"key": "B", "correct": false, "children": [{"text": "wrong"}]}
              ],
              "explanation": [{"text": "Because."}]
            }
          ]
        }
        """

        parsed = parse_action_document(raw_output)

        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["format"], "quiz")
        self.assertEqual(parsed["blocks"][0]["options"][0]["correct"], True)

    def test_rejects_non_dict_payload(self):
        self.assertIsNone(parse_action_document("[1, 2, 3]"))

    def test_rejects_missing_blocks(self):
        raw_output = '{"title": "X", "format": "flashcards"}'
        self.assertIsNone(parse_action_document(raw_output))

    def test_rejects_empty_blocks(self):
        raw_output = '{"title": "X", "format": "flashcards", "blocks": []}'
        self.assertIsNone(parse_action_document(raw_output))

    def test_rejects_unparseable_text(self):
        self.assertIsNone(parse_action_document("not json at all"))
