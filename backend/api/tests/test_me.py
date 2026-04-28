from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.cache import cache
from django.test import Client, TestCase
from django.urls import reverse
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken
import json

User = get_user_model()

class TestMe(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.me_url = reverse("me")
        self.login_url = reverse("login-user")

        User.objects.create_user(
            email="test@example.com",
            username="test-user",
            password="StrongPassword123!",
        )

    def test_found_user(self):
        payload = {
            "email": "test@example.com",
            "password": "StrongPassword123!",
        }

        login_response = self.client.post(
            self.login_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        me_response = self.client.get(
            self.me_url,
        )

        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.json()["email"], "test@example.com")

    def test_me_requires_authentication(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())

    def test_found_user_then_deleted_user_not_found(self):
        payload = {
            "email": "test@example.com",
            "password": "StrongPassword123!",
        }

        login_response = self.client.post(
            self.login_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(login_response.status_code, 200)

        me_response = self.client.get(self.me_url)
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.json()["email"], "test@example.com")

        User.objects.get(email="test@example.com").delete()

        deleted_user_response = self.client.get(self.me_url)
        self.assertEqual(deleted_user_response.status_code, 401)
        self.assertIn("detail", deleted_user_response.json())

    def test_expired_access_token_cannot_access_user(self):
        user = User.objects.get(email="test@example.com")
        access_cookie_name = settings.SIMPLE_JWT["AUTH_COOKIE"]

        expired_access_token = RefreshToken.for_user(user).access_token
        expired_access_token.set_exp(lifetime=timedelta(minutes=-1))

        self.client.cookies[access_cookie_name] = str(expired_access_token)

        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())

    def test_invalid_access_token_cannot_access_user(self):
        access_cookie_name = settings.SIMPLE_JWT["AUTH_COOKIE"]
        self.client.cookies[access_cookie_name] = "not-a-valid-jwt"

        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())
