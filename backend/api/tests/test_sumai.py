import os
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from scripts import SumAI


class SumAIScriptTest(SimpleTestCase):
    def setUp(self):
        SumAI._GEMINI_CLIENT = None
        SumAI._GEMINI_CLIENT_API_KEY = None

    def test_extract_links_includes_source_url_and_dedupes(self):
        content = """
            <p>Read more:</p>
            <a href="https://example.com/a">A</a>
            <a href="https://example.com/a">A again</a>
            https://example.com/b
        """
        links = SumAI._extract_links(content, source_url="https://example.com/source")

        self.assertEqual(links[0], "https://example.com/source")
        self.assertIn("https://example.com/a", links)
        self.assertIn("https://example.com/b", links)
        self.assertEqual(len(links), len(set(links)))

    def test_clean_ai_output_injects_key_point_and_sources_when_missing(self):
        result = "<h1>Title</h1><h2>Summary</h2><ul><li>First item</li></ul>"
        cleaned = SumAI._clean_ai_output(result, fallback_links=["https://example.com/source"])

        self.assertIn("<strong>Key point:", cleaned)
        self.assertIn('href="https://example.com/source"', cleaned)
        self.assertIn('target="_blank"', cleaned)
        self.assertIn('rel="noopener noreferrer"', cleaned)

    @patch.dict(
        os.environ,
        {
            "GEMINI_API_KEY": "test-key",
            "GEMINI_API_MODEL": "gemini-2.5-flash-lite",
        },
    )
    @patch("scripts.SumAI.genai.Client")
    def test_query_ai_returns_response_text(self, mock_client_ctor):
        response = SimpleNamespace(text="Recovered summary text")
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = response
        mock_client_ctor.return_value = mock_client

        result = SumAI.QueryAI("Summarize this.")

        self.assertEqual(result, "Recovered summary text")
        self.assertEqual(mock_client.models.generate_content.call_count, 1)

    @patch.dict(
        os.environ,
        {
            "GEMINI_API_KEY": "test-key",
            "GEMINI_API_MODEL": "gemini-2.5-flash-lite",
        },
    )
    @patch("scripts.SumAI.genai.Client")
    def test_query_ai_raises_runtime_error_for_empty_response(self, mock_client_ctor):
        empty_response = SimpleNamespace(text=None)
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = empty_response
        mock_client_ctor.return_value = mock_client

        with self.assertRaises(RuntimeError) as context:
            SumAI.QueryAI("Summarize this.")

        self.assertEqual(str(context.exception), "Gemini summary request failed.")
        self.assertEqual(mock_client.models.generate_content.call_count, 1)

    @patch("scripts.SumAI.genai.Client")
    def test_get_gemini_client_reuses_singleton_for_same_api_key(self, mock_client_ctor):
        mock_client_ctor.side_effect = [MagicMock(name="client_one"), MagicMock(name="client_two")]

        first_client = SumAI._get_gemini_client("same-key")
        second_client = SumAI._get_gemini_client("same-key")
        third_client = SumAI._get_gemini_client("different-key")

        self.assertIs(first_client, second_client)
        self.assertIsNot(first_client, third_client)
        self.assertEqual(mock_client_ctor.call_count, 2)
