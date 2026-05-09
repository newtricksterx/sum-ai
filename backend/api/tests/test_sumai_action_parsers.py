from django.test import SimpleTestCase

from scripts.SumAI import SumAI


class SumAIActionParserTest(SimpleTestCase):
    def test_parse_quiz_accepts_json_like_output(self):
        raw_output = """
        ```json
        [
          {
            prompt: "What is an LLM trained to do first?",
            options: [
              "Classify labels only",
              "Predict the next token",
              "Ignore context",
              "Output random text",
            ],
            correctIndex: 1,
            explanation: "Base pretraining predicts the next token from context.",
          },
        ]
        ```
        """

        parsed = SumAI._parse_quiz(raw_output)

        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["correctIndex"], 1)
        self.assertEqual(len(parsed[0]["options"]), 4)
        self.assertEqual(parsed[0]["prompt"], "What is an LLM trained to do first?")

    def test_parse_quiz_skips_invalid_items(self):
        raw_output = """
        [
          {
            "prompt": "Valid question",
            "options": ["A", "B", "C", "D"],
            "correctIndex": 2,
            "explanation": "Valid explanation"
          },
          {
            "prompt": "Bad index",
            "options": ["A", "B"],
            "correctIndex": 5,
            "explanation": "Invalid index should be dropped"
          }
        ]
        """

        parsed = SumAI._parse_quiz(raw_output)

        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["prompt"], "Valid question")
