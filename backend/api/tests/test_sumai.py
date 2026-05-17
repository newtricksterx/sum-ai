import os
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from scripts.SumAI import SumAI
from scripts.SumAI.llm import get_default_provider, reset_default_provider


class SumAIScriptTest(SimpleTestCase):
    def setUp(self):
        reset_default_provider()

    @patch.dict(
        os.environ,
        {
            "GEMINI_API_KEY": "test-key",
            "GEMINI_API_MODEL": "gemini-2.5-flash-lite",
        },
    )
    @patch("scripts.SumAI.llm.gemini.genai.Client")
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
    @patch("scripts.SumAI.llm.gemini.genai.Client")
    def test_query_ai_raises_runtime_error_for_empty_response(self, mock_client_ctor):
        empty_response = SimpleNamespace(text=None)
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = empty_response
        mock_client_ctor.return_value = mock_client

        with self.assertRaises(RuntimeError) as context:
            SumAI.QueryAI("Summarize this.")

        self.assertEqual(str(context.exception), "Gemini summary request failed.")
        self.assertEqual(mock_client.models.generate_content.call_count, 1)

    @patch("scripts.SumAI.llm.gemini.genai.Client")
    def test_default_provider_caches_per_api_key(self, mock_client_ctor):
        mock_client_ctor.side_effect = [MagicMock(name="client_one"), MagicMock(name="client_two")]

        with patch.dict(
            os.environ,
            {"GEMINI_API_KEY": "same-key", "GEMINI_API_MODEL": "gemini-2.5-flash-lite"},
        ):
            first_provider = get_default_provider()
            second_provider = get_default_provider()

        with patch.dict(
            os.environ,
            {"GEMINI_API_KEY": "different-key", "GEMINI_API_MODEL": "gemini-2.5-flash-lite"},
        ):
            third_provider = get_default_provider()

        self.assertIs(first_provider, second_provider)
        self.assertIsNot(first_provider, third_provider)
        self.assertEqual(mock_client_ctor.call_count, 2)
