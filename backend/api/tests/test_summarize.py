import json
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, Client, override_settings
from django.urls import reverse
from django.utils import timezone

from api.models import Subscription
from api.tests.helpers import authenticate_client_with_jwt

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
            "source_url": "https://example.com/article",
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
                    "source_url": "https://example.com/article",
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
            "source_url": "https://example.com/article",
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
            max_input_chars=10000,
            source_url="https://example.com/article",
        )


class AuthenticatedSummaryLimitTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.url = reverse("summarize-text")
        self.email = "summary-user@example.com"
        self.password = "StrongPassword123!"

        self.user = User.objects.create_user(  # type: ignore
            email=self.email,
            password=self.password,
        )
        self.subscription = Subscription.objects.get(user=self.user)

    def _authenticate(self):
        authenticate_client_with_jwt(self.client, self.user)

    @patch("api.views.SumAI.SummarizeContent", return_value="<p>summary</p>")
    def test_authenticated_summary_increments_usage_counter(self, _mock_summarize):
        self._authenticate()

        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "content": "My source text",
                    "source_url": "https://example.com/article",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.summaries_used, 1)

    @patch("api.views.SumAI.SummarizeContent", return_value="<p>summary</p>")
    def test_authenticated_summary_is_blocked_when_limit_reached(self, mock_summarize):
        self._authenticate()
        self.subscription.summaries_used = self.subscription.summary_limit  # type: ignore
        self.subscription.save(update_fields=["summaries_used", "updated_at"])

        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "content": "My source text",
                    "source_url": "https://example.com/article",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        body = response.json()
        self.assertEqual(body["error"], "summary_limit_reached")
        self.assertEqual(body["code"], "summary_limit_reached")
        self.assertEqual(body["summary_limit"], 2)
        self.assertEqual(body["summaries_used"], 2)

        mock_summarize.assert_not_called()
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.summaries_used, 2)

    @patch("api.views.SumAI.SummarizeContent", return_value="<p>summary</p>")
    def test_authenticated_summary_resets_usage_after_period_rollover(self, _mock_summarize):
        self._authenticate()
        expired_period_start = timezone.now() - timedelta(days=31)
        self.subscription.summaries_used = 2
        self.subscription.current_period_start = expired_period_start
        self.subscription.save(
            update_fields=["summaries_used", "current_period_start", "updated_at"]
        )

        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "content": "My source text",
                    "source_url": "https://example.com/article",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.summaries_used, 1)
        self.assertGreater(self.subscription.current_period_start, expired_period_start)

    @patch("api.views.SumAI.SummarizeContent", return_value="<p>summary</p>")
    def test_authenticated_summary_uses_standard_plan_character_limit(self, mock_summarize):
        self._authenticate()
        self.subscription.plan_slug = "standard"
        self.subscription.save(update_fields=["plan_slug", "updated_at"])

        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "content": "My source text",
                    "source_url": "https://example.com/article",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(mock_summarize.call_args.kwargs["max_input_chars"], 30000)

    @patch("api.views.SumAI.SummarizeContent", return_value="<p>summary</p>")
    def test_authenticated_summary_uses_unlimited_character_limit_for_pro(self, mock_summarize):
        self._authenticate()
        self.subscription.plan_slug = "pro"
        self.subscription.save(update_fields=["plan_slug", "updated_at"])

        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "content": "My source text",
                    "source_url": "https://example.com/article",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(mock_summarize.call_args.kwargs["max_input_chars"])

    @patch.dict("rest_framework.throttling.AnonRateThrottle.THROTTLE_RATES", {"anon": "1/min"})
    @patch("api.views.SumAI.SummarizeContent", return_value="<p>summary</p>")
    def test_authenticated_summary_is_not_limited_by_anon_throttle(self, _mock_summarize):
        self._authenticate()
        self.subscription.plan_slug = "pro"
        self.subscription.save(update_fields=["plan_slug", "updated_at"])

        payload = {
            "content": "My source text",
            "source_url": "https://example.com/article",
        }

        first_response = self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        second_response = self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
