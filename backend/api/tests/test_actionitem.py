import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from api.models import Subscription
from api.plans import get_action_limit
from api.tests.helpers import authenticate_client_with_jwt, get_csrf_headers
from scripts.sources import ExtractionResult


User = get_user_model()

TEST_REST_FRAMEWORK = {
    "EXCEPTION_HANDLER": "api.exception_handlers.custom_exception_handler",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "api.authentication.CookieJWTAuthentication",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/min",
    },
}


def _flashcards_document():
    return {
        "title": "Flashcards",
        "format": "flashcards",
        "blocks": [
            {
                "type": "flashcard",
                "front": [{"text": "What is an LLM?"}],
                "back": [{"text": "A large language model."}],
            }
        ],
    }


def _quiz_document():
    return {
        "title": "Quiz",
        "format": "quiz",
        "blocks": [
            {
                "type": "question",
                "question": [{"text": "What is self-supervised learning?"}],
                "options": [
                    {"key": "A", "correct": False, "children": [{"text": "Using labels for every sample"}]},
                    {"key": "B", "correct": True, "children": [{"text": "Predicting the next token from context"}]},
                    {"key": "C", "correct": False, "children": [{"text": "Only trial-and-error rewards"}]},
                    {"key": "D", "correct": False, "children": [{"text": "Removing all context windows"}]},
                ],
                "explanation": [{"text": "LLMs are trained to predict the next token in context."}],
            }
        ],
    }


def _summary_document_json():
    return '{"title":"Summary","format":"paragraph","blocks":[{"type":"paragraph","children":[{"text":"Result"}]}]}'


def _webpage_payload(action_type, **overrides):
    payload = {
        "type": action_type,
        "language": "english",
        "source_content": "Raw source",
        "source_url": "https://example.com/article",
        "source_type": "webpage",
        "length": "short",
        "format": "bullet-point",
    }
    payload.update(overrides)
    return payload


def _pdf_payload(action_type, **overrides):
    payload = {
        "type": action_type,
        "language": "english",
        "source_url": "https://example.com/document.pdf",
        "source_type": "pdf",
        "length": "short",
        "format": "bullet-point",
        "pdf": SimpleUploadedFile(
            "document.pdf",
            b"%PDF-1.4 fake test pdf bytes",
            content_type="application/pdf",
        ),
    }
    payload.update(overrides)
    return payload


@override_settings(REST_FRAMEWORK=TEST_REST_FRAMEWORK)
class ActionItemEndpointTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client(enforce_csrf_checks=True)
        self.url = reverse("action-item")
        self.user = User.objects.create_user(  # type: ignore
            email="action-item-user@example.com",
            password="StrongPassword123!",
        )

    def test_missing_type_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"source_content": "Body", "source_url": "https://x", "source_type": "webpage"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["isSuccess"])
        self.assertEqual(response.json()["error"], "Missing required field: 'type'")

    def test_unsupported_type_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"type": "outline", "source_url": "https://x", "source_type": "webpage", "source_content": "x"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertEqual(body["error"], "Unsupported action type.")
        self.assertEqual(body["supported_types"], ["export", "flashcards", "quiz", "summary"])

    def test_missing_source_returns_soft_failure(self):
        # No source_url / source_content -> _extract_source_text returns isSuccess=False
        # which the endpoint surfaces as a 200 with isSuccess=false (parity with summary).
        response = self.client.post(
            self.url,
            data=json.dumps({"type": "flashcards", "language": "english"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertEqual(body["content"], "Error: Invalid request.")

    def test_missing_source_returns_same_soft_failure_for_summary(self):
        # Sharing the helper means summary and flashcards return identical invalid-request shapes.
        response = self.client.post(
            self.url,
            data=json.dumps({"type": "summary", "language": "english"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertEqual(body["content"], "Error: Invalid request.")

    def test_pdf_source_without_file_returns_soft_failure(self):
        response = self.client.post(
            self.url,
            data={
                "type": "flashcards",
                "language": "english",
                "source_url": "https://example.com/document.pdf",
                "source_type": "pdf",
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertEqual(body["content"], "Error: Invalid request.")

    @patch(
        "scripts.summary.SumAI.ActionContent",
        return_value={"isSuccess": True, "content": _flashcards_document()},
    )
    def test_authenticated_cookie_request_without_csrf_returns_403(self, _mock_action_content):
        authenticate_client_with_jwt(self.client, self.user)

        response = self.client.post(
            self.url,
            data=json.dumps(_webpage_payload("flashcards")),
            content_type="application/json",
            secure=True,
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("detail", response.json())
        self.assertIn("csrf", str(response.json()["detail"]).lower())

    @patch(
        "scripts.summary.SumAI.ActionContent",
        return_value={"isSuccess": True, "content": _flashcards_document()},
    )
    def test_authenticated_cookie_request_with_csrf_returns_200(self, _mock_action_content):
        authenticate_client_with_jwt(self.client, self.user)

        response = self.client.post(
            self.url,
            data=json.dumps(_webpage_payload("flashcards")),
            content_type="application/json",
            secure=True,
            **get_csrf_headers(self.client),
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["isSuccess"])

    @patch(
        "scripts.summary.SumAI.ActionContent",
        return_value={"isSuccess": True, "content": _flashcards_document()},
    )
    @patch("scripts.sources.pdf.fitz.open")
    def test_pdf_under_limit_is_accepted(self, mock_fitz_open, _mock_action_content):
        class _Page:
            def get_text(self):
                return "Page text"

        class _Document:
            def pages(self, stop=None):
                return [_Page()]

        class _DocumentContext:
            def __enter__(self):
                return _Document()

            def __exit__(self, exc_type, exc, tb):
                return False

        mock_fitz_open.return_value = _DocumentContext()
        authenticate_client_with_jwt(self.client, self.user)

        with self.settings(PDF_MAX_UPLOAD_SIZE_BYTES=20):
            response = self.client.post(
                self.url,
                data={
                    "type": "flashcards",
                    "language": "english",
                    "source_url": "https://example.com/document.pdf",
                    "source_type": "pdf",
                    "pdf": SimpleUploadedFile(
                        "small.pdf",
                        b"%PDF-1.4\nsmall\n",
                        content_type="application/pdf",
                    ),
                },
                secure=True,
                **get_csrf_headers(self.client),
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["isSuccess"])

    def test_pdf_over_limit_returns_clear_error(self):
        authenticate_client_with_jwt(self.client, self.user)

        with self.settings(PDF_MAX_UPLOAD_SIZE_BYTES=8):
            response = self.client.post(
                self.url,
                data={
                    "type": "flashcards",
                    "language": "english",
                    "source_url": "https://example.com/document.pdf",
                    "source_type": "pdf",
                    "pdf": SimpleUploadedFile(
                        "too-large.pdf",
                        b"%PDF-1.4-too-large",
                        content_type="application/pdf",
                    ),
                },
                secure=True,
                **get_csrf_headers(self.client),
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertIn("Maximum allowed size", body["content"])

    @patch(
        "scripts.summary.SumAI.ActionContent",
        return_value={"isSuccess": True, "content": _flashcards_document()},
    )
    @patch(
        "scripts.sources.pdf.PdfExtractor.extract",
        return_value=ExtractionResult(is_success=True, content="Raw PDF source"),
    )
    def test_flashcards_accepts_pdf_upload(self, mock_pdf_extract, mock_action_content):
        response = self.client.post(self.url, data=_pdf_payload("flashcards"))

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["isSuccess"])
        self.assertEqual(body["content"], _flashcards_document())
        mock_pdf_extract.assert_called_once()
        mock_action_content.assert_called_once_with("flashcards", "english", "Raw PDF source", None)

    @patch(
        "scripts.summary.SumAI.ActionContent",
        return_value={"isSuccess": True, "content": _flashcards_document()},
    )
    def test_flashcards_returns_generated_content(self, mock_action_content):
        response = self.client.post(
            self.url,
            data=json.dumps(_webpage_payload("flashcards")),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["isSuccess"])
        self.assertEqual(body["content"], _flashcards_document())
        # Source text (not a pre-summarized JSON) is what reaches the LLM helper.
        mock_action_content.assert_called_once_with("flashcards", "english", "Raw source", None)

    @patch(
        "scripts.summary.SumAI.ActionContent",
        return_value={"isSuccess": False, "content": None},
    )
    def test_flashcards_returns_502_when_generation_fails(self, mock_action_content):
        response = self.client.post(
            self.url,
            data=json.dumps(_webpage_payload("flashcards")),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 502)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertEqual(body["error"], "Could not generate action content.")
        mock_action_content.assert_called_once_with("flashcards", "english", "Raw source", None)

    @patch(
        "scripts.summary.SumAI.ActionContent",
        return_value={"isSuccess": True, "content": _quiz_document()},
    )
    def test_quiz_returns_generated_content(self, mock_action_content):
        response = self.client.post(
            self.url,
            data=json.dumps(_webpage_payload("quiz")),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["isSuccess"])
        self.assertEqual(body["content"]["format"], "quiz")
        self.assertEqual(len(body["content"]["blocks"]), 1)
        mock_action_content.assert_called_once_with("quiz", "english", "Raw source", None)

    @patch(
        "scripts.summary.SumAI.SummarizeContent",
        return_value={"isSuccess": True, "content": _summary_document_json()},
    )
    def test_summary_returns_summarize_content_shape(self, mock_summarize):
        response = self.client.post(
            self.url,
            data=json.dumps(_webpage_payload("summary")),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["isSuccess"])
        self.assertEqual(body["content"], _summary_document_json())
        mock_summarize.assert_called_once_with(
            "Raw source",
            "short",
            "bullet-point",
            "english",
        )

    @patch(
        "scripts.summary.SumAI.SummarizeContent",
        return_value={"isSuccess": False, "content": _summary_document_json()},
    )
    def test_summary_surfaces_unsuccessful_summarize_result(self, mock_summarize):
        response = self.client.post(
            self.url,
            data=json.dumps(_webpage_payload("summary")),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertEqual(body["content"], _summary_document_json())
        self.assertEqual(mock_summarize.call_count, 1)

    @patch(
        "scripts.summary.SumAI.SummarizeContent",
        return_value={"isSuccess": False, "content": None},
    )
    def test_summary_returns_502_when_summarizer_returns_invalid_payload(self, mock_summarize):
        response = self.client.post(
            self.url,
            data=json.dumps(_webpage_payload("summary")),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 502)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertEqual(body["error"], "Could not generate summary content.")
        self.assertEqual(mock_summarize.call_count, 1)


def _youtube_export_payload(**overrides):
    payload = {
        "type": "export",
        "source_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "source_type": "youtube",
    }
    payload.update(overrides)
    return payload


_MOCK_PARAGRAPHS = [
    {"timestamp": 0.0, "text": "Hello and welcome to the video."},
    {"timestamp": 35.2, "text": "Now lets get into the topic."},
]


@override_settings(REST_FRAMEWORK=TEST_REST_FRAMEWORK)
class ActionItemExportTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.url = reverse("action-item")

    def test_export_non_youtube_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps(_youtube_export_payload(source_type="webpage")),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertIn("YouTube", body["error"])

    @patch(
        "api.views.actionitem.YouTubeExtractor.extract_transcript_as_list",
        return_value={"is_success": True, "paragraphs": _MOCK_PARAGRAPHS},
    )
    def test_export_youtube_returns_paragraphs(self, mock_extract):
        response = self.client.post(
            self.url,
            data=json.dumps(_youtube_export_payload()),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["isSuccess"])
        self.assertEqual(body["paragraphs"], _MOCK_PARAGRAPHS)
        mock_extract.assert_called_once()

    @patch(
        "api.views.actionitem.YouTubeExtractor.extract_transcript_as_list",
        return_value={"is_success": False, "error": "Could not fetch a transcript for this YouTube video."},
    )
    def test_export_youtube_fetch_failure_returns_502(self, mock_extract):
        response = self.client.post(
            self.url,
            data=json.dumps(_youtube_export_payload()),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 502)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertIn("Could not fetch", body["error"])
        mock_extract.assert_called_once()

    def test_export_missing_source_type_returns_400(self):
        payload = _youtube_export_payload()
        del payload["source_type"]
        response = self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["isSuccess"])


@override_settings(REST_FRAMEWORK=TEST_REST_FRAMEWORK)
class ActionItemQuotaTest(TestCase):
    def setUp(self):
        cache.clear()
        # DRF's APIClient.force_authenticate works regardless of the configured auth backend
        # (the app uses JWT cookies via CookieJWTAuthentication).
        self.client = APIClient()
        self.url = reverse("action-item")
        self.user = User.objects.create_user(  # type: ignore
            email="quota-view@example.com",
            password="StrongPassword123!",
        )
        self.client.force_authenticate(user=self.user)

    def _used(self):
        return Subscription.objects.get(user=self.user).actions_used

    @patch(
        "scripts.summary.SumAI.SummarizeContent",
        return_value={"isSuccess": True, "content": _summary_document_json()},
    )
    def test_authenticated_summary_under_limit_increments_counter(self, _mock):
        self.assertEqual(self._used(), 0)
        response = self.client.post(
            self.url,
            data=json.dumps(_webpage_payload("summary")),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._used(), 1)

    @patch(
        "scripts.summary.SumAI.ActionContent",
        return_value={"isSuccess": True, "content": _flashcards_document()},
    )
    def test_authenticated_flashcards_increments_counter(self, _mock):
        response = self.client.post(
            self.url,
            data=json.dumps(_webpage_payload("flashcards")),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._used(), 1)

    def test_user_at_limit_returns_403(self):
        free_limit = get_action_limit("free")
        Subscription.objects.filter(user=self.user).update(actions_used=free_limit)

        response = self.client.post(
            self.url,
            data=json.dumps(_webpage_payload("flashcards")),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertEqual(body["error"], "action_limit_reached")
        self.assertEqual(body["action_limit"], free_limit)
        # Counter unchanged when rejected pre-call.
        self.assertEqual(self._used(), free_limit)

    @patch(
        "scripts.summary.SumAI.ActionContent",
        return_value={"isSuccess": False, "content": None},
    )
    def test_action_item_hard_failure_refunds_slot(self, _mock):
        response = self.client.post(
            self.url,
            data=json.dumps(_webpage_payload("flashcards")),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(self._used(), 0)

    @patch(
        "scripts.summary.SumAI.SummarizeContent",
        return_value={"isSuccess": False, "content": _summary_document_json()},
    )
    def test_summary_soft_failure_refunds_slot(self, _mock):
        response = self.client.post(
            self.url,
            data=json.dumps(_webpage_payload("summary")),
            content_type="application/json",
        )

        # Soft failures still return 200 with isSuccess=false; the slot is refunded.
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["isSuccess"])
        self.assertEqual(self._used(), 0)

    @patch(
        "scripts.summary.SumAI.SummarizeContent",
        return_value={"isSuccess": False, "content": None},
    )
    def test_summary_hard_failure_refunds_slot(self, _mock):
        response = self.client.post(
            self.url,
            data=json.dumps(_webpage_payload("summary")),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(self._used(), 0)


@override_settings(REST_FRAMEWORK=TEST_REST_FRAMEWORK)
class ActionItemAnonymousQuotaTest(TestCase):
    """Anonymous users should bypass quota gating entirely (only AnonRateThrottle applies)."""

    def setUp(self):
        cache.clear()
        self.client = Client()
        self.url = reverse("action-item")

    @patch(
        "scripts.summary.SumAI.ActionContent",
        return_value={"isSuccess": True, "content": _flashcards_document()},
    )
    def test_anonymous_user_can_still_call_endpoint(self, _mock):
        response = self.client.post(
            self.url,
            data=json.dumps(_webpage_payload("flashcards")),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        # No Subscription row is created for anonymous requests.
        self.assertFalse(Subscription.objects.exists())
