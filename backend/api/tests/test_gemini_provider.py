import os
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from scripts.SumAI.llm.gemini import (
    get_default_provider,
    reset_default_provider,
)


_TEST_ENV = {
    "GEMINI_API_KEY": "test-key",
    "GEMINI_API_MODEL": "gemini-2.5-flash-lite",
}


@patch("scripts.SumAI.llm.gemini.genai.Client")
class GetDefaultProviderTests(SimpleTestCase):
    def setUp(self):
        reset_default_provider()

    def tearDown(self):
        reset_default_provider()

    @patch.dict(os.environ, _TEST_ENV)
    def test_returns_provider_instance(self, mock_client_cls):
        provider = get_default_provider()
        self.assertIsNotNone(provider)
        mock_client_cls.assert_called_once_with(api_key="test-key")

    @patch.dict(os.environ, _TEST_ENV)
    def test_returns_same_instance_on_second_call(self, mock_client_cls):
        first = get_default_provider()
        second = get_default_provider()
        self.assertIs(first, second)
        self.assertEqual(mock_client_cls.call_count, 1)

    @patch.dict(os.environ, _TEST_ENV)
    def test_creates_new_instance_when_api_key_changes(self, mock_client_cls):
        first = get_default_provider()

        with patch.dict(os.environ, {"GEMINI_API_KEY": "new-key"}):
            second = get_default_provider()

        self.assertIsNot(first, second)
        self.assertEqual(mock_client_cls.call_count, 2)

    def test_raises_when_env_vars_missing(self, mock_client_cls):
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("GEMINI_API_KEY", None)
            os.environ.pop("GEMINI_API_MODEL", None)
            with self.assertRaises(RuntimeError) as ctx:
                get_default_provider()
            self.assertIn("GEMINI_API_KEY", str(ctx.exception))
            self.assertIn("GEMINI_API_MODEL", str(ctx.exception))

    @patch.dict(os.environ, _TEST_ENV)
    def test_thread_safety_single_instance(self, mock_client_cls):
        results = []

        def _get():
            results.append(get_default_provider())

        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = [pool.submit(_get) for _ in range(20)]
            for f in futures:
                f.result()

        self.assertEqual(len(results), 20)
        first = results[0]
        for r in results[1:]:
            self.assertIs(r, first)


@patch("scripts.SumAI.llm.gemini.genai.Client")
class ResetDefaultProviderTests(SimpleTestCase):
    def setUp(self):
        reset_default_provider()

    def tearDown(self):
        reset_default_provider()

    @patch.dict(os.environ, _TEST_ENV)
    def test_reset_clears_cached_instance(self, mock_client_cls):
        first = get_default_provider()
        reset_default_provider()
        second = get_default_provider()
        self.assertIsNot(first, second)
        self.assertEqual(mock_client_cls.call_count, 2)


@patch("scripts.SumAI.llm.gemini.genai.Client")
class FallbackModelTests(SimpleTestCase):
    def setUp(self):
        reset_default_provider()

    def tearDown(self):
        reset_default_provider()

    @patch.dict(os.environ, {**_TEST_ENV, "GEMINI_API_FALLBACK_MODEL": "gemini-fallback"})
    def test_provider_has_fallback_model(self, mock_client_cls):
        provider = get_default_provider()
        self.assertEqual(provider._fallback_model, "gemini-fallback")

    @patch.dict(os.environ, {**_TEST_ENV, "GEMINI_API_FALLBACK_MODEL": ""})
    def test_empty_fallback_is_none(self, mock_client_cls):
        provider = get_default_provider()
        self.assertIsNone(provider._fallback_model)

    @patch.dict(os.environ, {**_TEST_ENV, "GEMINI_API_FALLBACK_MODEL": "gemini-2.5-flash-lite"})
    def test_fallback_same_as_primary_is_none(self, mock_client_cls):
        provider = get_default_provider()
        self.assertIsNone(provider._fallback_model)
