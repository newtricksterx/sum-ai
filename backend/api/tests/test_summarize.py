import json
from datetime import timedelta
from unittest.mock import patch

import fitz
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, Client, override_settings
from django.urls import reverse
from django.utils import timezone

from api.models import Subscription
from api.tests.helpers import authenticate_client_with_jwt


def build_test_pdf_bytes(text: str = "Hello PDF world") -> bytes:
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), text)
    pdf_bytes = document.tobytes()
    document.close()
    return pdf_bytes

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
    @patch("api.views.SumAI.SummarizeContent", return_value={"success": True, "content": "<p>ok</p>"})
    def test_throttle_returns_structured_response(self, _mock_summarize):
        payload = {
            "source_content": "some page content",
            "source_url": "https://example.com/article",
            "source_type": "webpage",
            "length": "short",
            "format": "bullet-point",
            "language": "english",
        }

        first_response = self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(first_response.status_code, 200)
        self.assertTrue(first_response.json()["isSuccess"])

        throttled_response = self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(throttled_response.status_code, 429)

        body = throttled_response.json()
        self.assertFalse(body["isSuccess"])
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
                    "source_type": "webpage",
                    "length": "short",
                    "format": "bullet-point",
                    "language": "english",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["isSuccess"])
        self.assertEqual(response.json()["error"], "Missing required field: 'content'")
        mock_summarize.assert_not_called()

    @patch("api.views.SumAI.SummarizeContent", return_value={"success": True, "content": "<p>summary</p>"})
    def test_summarize_passes_arguments_to_summarizer(self, mock_summarize):
        payload = {
            "source_content": "My source text",
            "source_url": "https://example.com/article",
            "source_type": "webpage",
            "length": "short",
            "format": "bullet-point",
            "language": "english",
        }

        response = self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["isSuccess"])
        self.assertEqual(response.json()["data"], "<p>summary</p>")
        mock_summarize.assert_called_once_with(
            "My source text",
            "short",
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

    @patch("api.views.SumAI.SummarizeContent", return_value={"success": True, "content": "<p>summary</p>"})
    def test_authenticated_summary_increments_usage_counter(self, _mock_summarize):
        self._authenticate()

        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "source_content": "My source text",
                    "source_url": "https://example.com/article",
                    "source_type": "webpage",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["isSuccess"])
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.summaries_used, 1)

    @patch("api.views.SumAI.SummarizeContent", return_value={"success": True, "content": "<p>summary</p>"})
    def test_authenticated_summary_is_blocked_when_limit_reached(self, mock_summarize):
        self._authenticate()
        self.subscription.summaries_used = self.subscription.summary_limit  # type: ignore
        self.subscription.save(update_fields=["summaries_used", "updated_at"])

        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "source_content": "My source text",
                    "source_url": "https://example.com/article",
                    "source_type": "webpage",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertEqual(body["error"], "summary_limit_reached")
        self.assertEqual(body["code"], "summary_limit_reached")
        self.assertEqual(body["summary_limit"], self.subscription.summary_limit)
        self.assertEqual(body["summaries_used"], self.subscription.summary_limit)
        self.assertEqual(body["billing_interval"], self.subscription.billing_interval)

        mock_summarize.assert_not_called()
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.summaries_used, self.subscription.summary_limit)

    @patch("api.views.SumAI.SummarizeContent", return_value={"success": True, "content": "<p>summary</p>"})
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
                    "source_content": "My source text",
                    "source_url": "https://example.com/article",
                    "source_type": "webpage",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["isSuccess"])
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.summaries_used, 1)
        self.assertGreater(self.subscription.current_period_start, expired_period_start)

    @patch("api.views.SumAI.SummarizeContent", return_value={"success": True, "content": "<p>summary</p>"})
    def test_authenticated_summary_uses_standard_plan_character_limit(self, mock_summarize):
        self._authenticate()
        self.subscription.plan_slug = "standard"
        self.subscription.save(update_fields=["plan_slug", "updated_at"])

        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "source_content": "My source text",
                    "source_url": "https://example.com/article",
                    "source_type": "webpage",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["isSuccess"])
        self.assertEqual(mock_summarize.call_args.kwargs["max_input_chars"], 30000)

    @patch("api.views.SumAI.SummarizeContent", return_value={"success": True, "content": "<p>summary</p>"})
    def test_authenticated_summary_uses_unlimited_character_limit_for_pro(self, mock_summarize):
        self._authenticate()
        self.subscription.plan_slug = "pro"
        self.subscription.save(update_fields=["plan_slug", "updated_at"])

        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "source_content": "My source text",
                    "source_url": "https://example.com/article",
                    "source_type": "webpage",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["isSuccess"])
        self.assertIsNone(mock_summarize.call_args.kwargs["max_input_chars"])

    @patch.dict("rest_framework.throttling.AnonRateThrottle.THROTTLE_RATES", {"anon": "1/min"})
    @patch("api.views.SumAI.SummarizeContent", return_value={"success": True, "content": "<p>summary</p>"})
    def test_authenticated_summary_is_not_limited_by_anon_throttle(self, _mock_summarize):
        self._authenticate()
        self.subscription.plan_slug = "pro"
        self.subscription.save(update_fields=["plan_slug", "updated_at"])

        payload = {
            "source_content": "My source text",
            "source_url": "https://example.com/article",
            "source_type": "webpage",
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
        self.assertTrue(first_response.json()["isSuccess"])
        self.assertTrue(second_response.json()["isSuccess"])


class PdfSummarizeTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.url = reverse("summarize-text")

    def _post_pdf(self, *, pdf_bytes: bytes, source_url: str = "https://example.com/foo.pdf"):
        upload = SimpleUploadedFile("foo.pdf", pdf_bytes, content_type="application/pdf")
        return self.client.post(
            self.url,
            data={
                "pdf": upload,
                "source_url": source_url,
                "source_type": "pdf",
                "length": "short",
                "format": "bullet-point",
                "language": "english",
            },
        )

    @patch(
        "api.views.SumAI.SummarizeContent",
        return_value={"success": True, "content": "<p>summary</p>"},
    )
    def test_pdf_upload_extracts_text_and_forwards_to_summarizer(self, mock_summarize):
        response = self._post_pdf(pdf_bytes=build_test_pdf_bytes("Quarterly results were strong"))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["isSuccess"])
        mock_summarize.assert_called_once()
        forwarded_text = mock_summarize.call_args.args[0]
        self.assertIn("Quarterly results were strong", forwarded_text)
        self.assertEqual(
            mock_summarize.call_args.kwargs["source_url"],
            "https://example.com/foo.pdf",
        )

    @patch("api.views.SumAI.SummarizeContent")
    def test_missing_pdf_returns_400(self, mock_summarize):
        response = self.client.post(
            self.url,
            data={
                "source_url": "https://example.com/foo.pdf",
                "source_type": "pdf",
                "length": "short",
                "format": "bullet-point",
                "language": "english",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Missing required file: 'pdf'")
        mock_summarize.assert_not_called()

    @patch("api.views.SumAI.SummarizeContent")
    def test_corrupt_pdf_returns_400_with_pdf_unreadable(self, mock_summarize):
        response = self._post_pdf(pdf_bytes=b"not a pdf at all")

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertEqual(body["error"], "pdf_unreadable")
        mock_summarize.assert_not_called()
