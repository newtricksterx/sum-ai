import os
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from backend.scripts.SumAI import SumAI


class SumAIScriptTest(SimpleTestCase):
    def setUp(self):
        SumAI.utils._GEMINI_CLIENT = None
        SumAI.utils._GEMINI_CLIENT_API_KEY = None

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

        first_client = SumAI.utils._get_gemini_client("same-key")
        second_client = SumAI.utils._get_gemini_client("same-key")
        third_client = SumAI.utils._get_gemini_client("different-key")

        self.assertIs(first_client, second_client)
        self.assertIsNot(first_client, third_client)
        self.assertEqual(mock_client_ctor.call_count, 2)
