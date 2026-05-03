import os
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from scripts import SumAI


class SumAIScriptTest(SimpleTestCase):
    def test_extract_text_prefers_response_text(self):
        response = SimpleNamespace(text="Direct summary text", candidates=[])
        extracted = SumAI._extract_text_from_gemini_response(response)
        self.assertEqual(extracted, "Direct summary text")

    def test_extract_text_falls_back_to_candidate_parts(self):
        candidate = SimpleNamespace(
            content=SimpleNamespace(
                parts=[
                    SimpleNamespace(text="Line one."),
                    {"text": "Line two."},
                ]
            )
        )
        response = SimpleNamespace(text=None, candidates=[candidate])
        extracted = SumAI._extract_text_from_gemini_response(response)
        self.assertEqual(extracted, "Line one. Line two.")

    @patch.dict(
        os.environ,
        {
            "GEMINI_API_KEY": "test-key",
            "GEMINI_API_MODEL": "gemini-2.5-flash-lite",
        },
    )
    @patch("scripts.SumAI.genai.Client")
    def test_query_ai_retries_once_after_empty_response(self, mock_client_ctor):
        empty_response = SimpleNamespace(
            text=None,
            candidates=[],
            prompt_feedback=None,
        )
        retry_response = SimpleNamespace(
            text="Recovered summary text",
            candidates=[],
            prompt_feedback=None,
        )

        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = [empty_response, retry_response]
        mock_client_ctor.return_value = mock_client

        result = SumAI.QueryAI("Summarize this.")

        self.assertEqual(result, "Recovered summary text")
        self.assertEqual(mock_client.models.generate_content.call_count, 2)
        first_call = mock_client.models.generate_content.call_args_list[0]
        generation_config = first_call.kwargs["config"]
        self.assertTrue(generation_config.automatic_function_calling.disable)

