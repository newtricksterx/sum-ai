import json
from unittest.mock import patch

from django.core.cache import cache
from django.test import Client, TestCase
from django.test import override_settings
from django.urls import reverse

TEST_REST_FRAMEWORK = {
    "EXCEPTION_HANDLER": "api.exception_handlers.custom_exception_handler",
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


@override_settings(REST_FRAMEWORK=TEST_REST_FRAMEWORK)
class ActionItemEndpointTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.url = reverse("action-item")

    def test_missing_type_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"content": "<h1>Summary</h1><p>Body</p>"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["isSuccess"])
        self.assertEqual(response.json()["error"], "Missing required field: 'type'")

    def test_unsupported_type_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"type": "outline", "content": "<h1>Summary</h1><p>Body</p>"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertEqual(body["error"], "Unsupported action type.")
        self.assertEqual(body["supported_types"], ["flashcards", "quiz"])

    def test_missing_content_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"type": "flashcards"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["isSuccess"])
        self.assertEqual(response.json()["error"], "Missing required field: 'content'")

    @patch("api.views.actionitem.SumAI.ActionContent", return_value=_flashcards_document())
    def test_flashcards_returns_generated_content(self, mock_action_content):
        summary_content = '{"title":"S","format":"paragraph","blocks":[]}'
        response = self.client.post(
            self.url,
            data=json.dumps({"type": "flashcards", "language": "english", "content": summary_content}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["isSuccess"])
        self.assertEqual(body["content"], _flashcards_document())
        mock_action_content.assert_called_once_with("flashcards", "english", summary_content)

    @patch("api.views.actionitem.SumAI.ActionContent", return_value=None)
    def test_flashcards_returns_502_when_generation_fails(self, mock_action_content):
        summary_content = '{"title":"S","format":"paragraph","blocks":[]}'
        response = self.client.post(
            self.url,
            data=json.dumps({"type": "flashcards", "language": "english", "content": summary_content}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 502)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertEqual(body["error"], "Could not generate action content.")
        mock_action_content.assert_called_once_with("flashcards", "english", summary_content)

    @patch("api.views.actionitem.SumAI.ActionContent", return_value=_quiz_document())
    def test_quiz_returns_generated_content(self, mock_action_content):
        summary_content = '{"title":"S","format":"paragraph","blocks":[]}'
        response = self.client.post(
            self.url,
            data=json.dumps({"type": "quiz", "language": "english", "content": summary_content}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["isSuccess"])
        self.assertEqual(body["content"]["format"], "quiz")
        self.assertEqual(len(body["content"]["blocks"]), 1)
        mock_action_content.assert_called_once_with("quiz", "english", summary_content)

    @patch("api.views.actionitem.SumAI.ActionContent", return_value={"title": "Quiz", "format": "quiz", "blocks": []})
    def test_quiz_returns_502_when_blocks_empty(self, mock_action_content):
        summary_content = '{"title":"S","format":"paragraph","blocks":[]}'
        response = self.client.post(
            self.url,
            data=json.dumps({"type": "quiz", "language": "english", "content": summary_content}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 502)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertEqual(body["error"], "Could not generate action content.")
        mock_action_content.assert_called_once_with("quiz", "english", summary_content)
