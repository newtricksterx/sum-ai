import json
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, Client, override_settings

from django.urls import reverse

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
