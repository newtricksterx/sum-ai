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


class UserEndpointsTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.register_url = reverse("register-user")
        self.create_user_url = reverse("create-user")

    def test_register_creates_user(self):
        payload = {
            "email": "new-user@example.com",
            "username": "new-user",
            "password": "StrongPassword123!",
            "first_name": "New",
            "last_name": "User",
        }

        response = self.client.post(
            self.register_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertNotIn("password", response.json())

        created_user = User.objects.get(email="new-user@example.com")
        self.assertTrue(created_user.check_password("StrongPassword123!"))
        self.assertFalse(created_user.is_staff)

    def test_create_user_requires_admin_permissions(self):
        regular_user = User.objects.create_user(
            email="regular@example.com",
            username="regular",
            password="StrongPassword123!",
        )
        self.client.force_login(regular_user)

        payload = {
            "email": "created-by-regular@example.com",
            "username": "created-by-regular",
            "password": "StrongPassword123!",
        }

        response = self.client.post(
            self.create_user_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.filter(email=payload["email"]).exists())

    def test_admin_can_create_user(self):
        admin_user = User.objects.create_user(
            email="admin@example.com",
            username="admin",
            password="StrongPassword123!",
            is_staff=True,
        )
        self.client.force_login(admin_user)

        payload = {
            "email": "created-by-admin@example.com",
            "username": "created-by-admin",
            "password": "StrongPassword123!",
            "first_name": "Created",
            "last_name": "By Admin",
            "is_active": True,
            "is_staff": True,
        }

        response = self.client.post(
            self.create_user_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)

        created_user = User.objects.get(email=payload["email"])
        self.assertTrue(created_user.check_password(payload["password"]))
        self.assertTrue(created_user.is_staff)
