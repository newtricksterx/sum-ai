import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.conf import settings
from django.test import Client, TestCase
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class RefreshTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.login_url = reverse("login-user")
        self.refresh_url = reverse("token-refresh")
        self.access_cookie_name = settings.SIMPLE_JWT["AUTH_COOKIE"]
        self.refresh_cookie_name = settings.SIMPLE_JWT["AUTH_REFRESH_COOKIE"]

        User.objects.create_user(
            email="test@example.com",
            password="StrongPassword123!",
        ) # type: ignore

        login_response = self.client.post(
            self.login_url,
            data=json.dumps(
                {
                    "email": "test@example.com",
                    "password": "StrongPassword123!",
                }
            ),
            content_type="application/json",
            secure=True,
        )
        self.assertEqual(login_response.status_code, 200)

    def test_refresh_rotates_access_and_refresh_cookies(self):
        old_refresh = self.client.cookies[self.refresh_cookie_name].value
        old_access = self.client.cookies[self.access_cookie_name].value

        response = self.client.post(
            self.refresh_url,
            data=json.dumps({}),
            content_type="application/json",
            secure=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn(self.access_cookie_name, response.cookies)
        self.assertIn(self.refresh_cookie_name, response.cookies)

        new_refresh = response.cookies[self.refresh_cookie_name].value
        new_access = response.cookies[self.access_cookie_name].value
        
        self.assertNotEqual(new_refresh, old_refresh)
        self.assertNotEqual(new_access, old_access)

    def test_refresh_token_cannot_be_reused_after_rotation(self):
        used_refresh = self.client.cookies[self.refresh_cookie_name].value

        first_refresh = self.client.post(
            self.refresh_url,
            data=json.dumps({}),
            content_type="application/json",
            secure=True,
        )
        self.assertEqual(first_refresh.status_code, 200)

        # Reuse the old refresh token on purpose; it should now be blacklisted.
        self.client.cookies[self.refresh_cookie_name] = used_refresh

        second_refresh = self.client.post(
            self.refresh_url,
            data=json.dumps({}),
            content_type="application/json",
            secure=True,
        )

        self.assertEqual(second_refresh.status_code, 401)
        self.assertEqual(second_refresh.json()["detail"], "Refresh token is invalid or expired.")

    def test_expired_refresh_token_cannot_be_used(self):
        user = User.objects.get(email="test@example.com")
        expired_refresh_token = RefreshToken.for_user(user)
        expired_refresh_token.set_exp(lifetime=timedelta(days=-1))

        self.client.cookies[self.refresh_cookie_name] = str(expired_refresh_token)

        response = self.client.post(
            self.refresh_url,
            data=json.dumps({}),
            content_type="application/json",
            secure=True,
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Refresh token is invalid or expired.")

    def test_missing_refresh_cookie_returns_401(self):
        self.client.cookies.pop(self.refresh_cookie_name, None)

        response = self.client.post(
            self.refresh_url,
            data=json.dumps({}),
            content_type="application/json",
            secure=True,
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Refresh token missing.")

    def test_invalid_refresh_token_cannot_be_used(self):
        self.client.cookies[self.refresh_cookie_name] = "invalid-refresh-token"

        response = self.client.post(
            self.refresh_url,
            data=json.dumps({}),
            content_type="application/json",
            secure=True,
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Refresh token is invalid or expired.")

    def test_refresh_token_for_deleted_user_cannot_be_used(self):
        user = User.objects.get(email="test@example.com")
        refresh_token_for_deleted_user = str(RefreshToken.for_user(user))
        user.delete()

        self.client.cookies[self.refresh_cookie_name] = refresh_token_for_deleted_user

        response = self.client.post(
            self.refresh_url,
            data=json.dumps({}),
            content_type="application/json",
            secure=True,
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "User not found.")
