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

    @patch("api.views.actionitem.SumAI.ActionContent", return_value=[("Q1", "A1"), ("Q2", "A2")])
    def test_flashcards_returns_generated_content(self, mock_action_content):
        summary_html = "<h1>Summary</h1><p>Body</p>"
        response = self.client.post(
            self.url,
            data=json.dumps({"type": "flashcards", "content": summary_html}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["isSuccess"])
        self.assertEqual(body["content"], [["Q1", "A1"], ["Q2", "A2"]])
        mock_action_content.assert_called_once_with("flashcards", summary_html)

    @patch("api.views.actionitem.SumAI.ActionContent", return_value=[])
    def test_flashcards_returns_502_when_generation_fails(self, mock_action_content):
        summary_html = "<h1>Summary</h1><p>Body</p>"
        response = self.client.post(
            self.url,
            data=json.dumps({"type": "flashcards", "content": summary_html}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 502)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertEqual(body["error"], "Could not generate action content.")
        mock_action_content.assert_called_once_with("flashcards", summary_html)

    @patch(
        "api.views.actionitem.SumAI.ActionContent",
        return_value=[
            {
                "prompt": "What is self-supervised learning?",
                "options": [
                    "Using labels for every sample",
                    "Predicting the next token from context",
                    "Only trial-and-error rewards",
                    "Removing all context windows",
                ],
                "correctIndex": 1,
                "explanation": "LLMs are trained to predict the next token in context.",
            }
        ],
    )
    def test_quiz_returns_generated_content(self, mock_action_content):
        summary_html = "<h1>Summary</h1><p>Body</p>"
        response = self.client.post(
            self.url,
            data=json.dumps({"type": "quiz", "content": summary_html}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["isSuccess"])
        self.assertEqual(len(body["content"]), 1)
        self.assertEqual(body["content"][0]["correctIndex"], 1)
        self.assertEqual(
            body["content"][0]["prompt"],
            "What is self-supervised learning?",
        )
        mock_action_content.assert_called_once_with("quiz", summary_html)

    @patch("api.views.actionitem.SumAI.ActionContent", return_value=[])
    def test_quiz_returns_502_when_generation_fails(self, mock_action_content):
        summary_html = "<h1>Summary</h1><p>Body</p>"
        response = self.client.post(
            self.url,
            data=json.dumps({"type": "quiz", "content": summary_html}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 502)
        body = response.json()
        self.assertFalse(body["isSuccess"])
        self.assertEqual(body["error"], "Could not generate action content.")
        mock_action_content.assert_called_once_with("quiz", summary_html)
