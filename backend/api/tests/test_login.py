import json

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, Client

from django.urls import reverse

User = get_user_model()

class LoginTest(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.client = Client()
        self.login_url = reverse("login-user")

        User.objects.create_user(
            email="test@example.com",
            username="test-user",
            password="StrongPassword123!",
        )

    def test_login_pass(self):
        payload = {
            "email": "test@example.com",
            "password": "StrongPassword123!"
        }

        response = self.client.post(
            self.login_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

    def test_login_fail(self):
        payload = {
            "email": "fail@example.com",
            "password": "StrongPassword123!"
        }

        response = self.client.post(
            self.login_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    def test_login_creates_tokens(self):
        payload = {
            "email": "test@example.com",
            "password": "StrongPassword123!"
        }

        response = self.client.post(
            self.login_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.cookies.get("access_token"))
        self.assertTrue(response.cookies.get("refresh_token"))

    def test_login_fails_when_email_missing(self):
        payload = {
            "password": "StrongPassword123!",
        }

        response = self.client.post(
            self.login_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())

    def test_login_fails_when_password_missing(self):
        payload = {
            "email": "test@example.com",
        }

        response = self.client.post(
            self.login_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())

    def test_login_rejects_inactive_user(self):
        User.objects.create_user(
            email="inactive@example.com",
            username="inactive-user",
            password="StrongPassword123!",
            is_active=False,
        )

        payload = {
            "email": "inactive@example.com",
            "password": "StrongPassword123!",
        }

        response = self.client.post(
            self.login_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertIn(response.json()["detail"], ["User is not active.", "Invalid email or password."])

    def test_login_response_does_not_expose_password(self):
        payload = {
            "email": "test@example.com",
            "password": "StrongPassword123!"
        }

        response = self.client.post(
            self.login_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("user", body)
        self.assertNotIn("password", body["user"])

