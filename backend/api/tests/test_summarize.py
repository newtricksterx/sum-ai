import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, Client, override_settings

from django.urls import reverse

User = get_user_model()

TEST_REST_FRAMEWORK = {
    "EXCEPTION_HANDLER": "api.exception_handlers.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "1/min",
    },
}


@override_settings(
    REST_FRAMEWORK=TEST_REST_FRAMEWORK,
    THROTTLE_SUMMARIES_COUNT=1,
    THROTTLE_SUMMARIES_PERIOD="min",
)
class ThrottleResponseTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.url = reverse('summarize-text')

    @patch.dict("rest_framework.throttling.AnonRateThrottle.THROTTLE_RATES", {"anon": "1/min"}, clear=True)
    @patch("api.views.SumAI.SummarizeContent", return_value="<p>ok</p>")
    def test_throttle_returns_structured_response(self, _mock_summarize):
        payload = {
            "content": "some page content",
            "length": "short",
            "regenerate": False,
            "format": "bullet-point",
            "language": "english",
        }

        first_response = self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(first_response.status_code, 200)

        throttled_response = self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(throttled_response.status_code, 429)

        body = throttled_response.json()
        self.assertEqual(body["error"], "rate_limited")
        self.assertEqual(body["code"], "throttled")
        self.assertEqual(body["summaries_limit"], 1)
        self.assertEqual(body["limit_period"], "min")
        self.assertEqual(body["rate"], "1/min")
        self.assertIn("message", body)
        self.assertIn("detail", body)
        self.assertIn("retry_after_seconds", body)
        self.assertIn("Retry-After", throttled_response.headers)


class SummarizeEndpointTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.url = reverse("summarize-text")

    @patch("api.views.SumAI.SummarizeContent")
    def test_missing_content_returns_400_without_calling_summarizer(self, mock_summarize):
        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "length": "short",
                    "regenerate": False,
                    "format": "bullet-point",
                    "language": "english",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Missing required field: 'content'")
        mock_summarize.assert_not_called()

    @patch("api.views.SumAI.SummarizeContent", return_value="<p>summary</p>")
    def test_summarize_passes_arguments_to_summarizer(self, mock_summarize):
        payload = {
            "content": "My source text",
            "length": "short",
            "regenerate": True,
            "format": "bullet-point",
            "language": "english",
        }

        response = self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"], "<p>summary</p>")
        mock_summarize.assert_called_once_with(
            "My source text",
            "short",
            True,
            "bullet-point",
            "english",
        )
