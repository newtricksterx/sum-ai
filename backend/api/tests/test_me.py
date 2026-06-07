from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client, TestCase
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from api.tests.helpers import authenticate_client_with_jwt


User = get_user_model()


class TestMe(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.me_url = reverse("me")
        self.access_cookie_name = settings.SIMPLE_JWT["AUTH_COOKIE"]
        self.refresh_cookie_name = settings.SIMPLE_JWT["AUTH_REFRESH_COOKIE"]

        self.user = User.objects.create_user(  # type: ignore
            email="test@example.com",
            password="StrongPassword123!",
        )

    def _authenticate(self):
        authenticate_client_with_jwt(self.client, self.user)

    def test_found_user(self):
        self._authenticate()

        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], "test@example.com")
        self.assertEqual(response.json()["subscription"]["plan_slug"], "free")
        self.assertEqual(response.json()["subscription"]["billing_interval"], "monthly")
        self.assertEqual(response.json()["subscription"]["currency"], "USD")
        self.assertEqual(response.json()["subscription"]["price_minor"], 0)
        self.assertIn("username", response.json())
        self.assertIn("avatar_url", response.json())

    def test_me_supports_requested_currency(self):
        self._authenticate()

        response = self.client.get(f"{self.me_url}?currency=CAD")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["subscription"]["currency"], "CAD")
        self.assertEqual(response.json()["subscription"]["price_minor"], 0)

    def test_me_supports_euro_alias(self):
        self._authenticate()

        response = self.client.get(f"{self.me_url}?currency=EURO")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["subscription"]["currency"], "EUR")
        self.assertEqual(response.json()["subscription"]["price_minor"], 0)

    def test_me_does_not_expose_user_id(self):
        self._authenticate()

        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("id", response.json())

    def test_me_requires_authentication(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())

    def test_found_user_then_deleted_user_not_found(self):
        self._authenticate()

        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 200)

        self.user.delete()

        deleted_user_response = self.client.get(self.me_url)
        self.assertEqual(deleted_user_response.status_code, 401)
        self.assertIn("detail", deleted_user_response.json())

    def test_expired_access_token_cannot_access_user(self):
        expired_access_token = RefreshToken.for_user(self.user).access_token
        expired_access_token.set_exp(lifetime=timedelta(minutes=-1))
        self.client.cookies[self.access_cookie_name] = str(expired_access_token)

        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())

    def test_invalid_access_token_cannot_access_user(self):
        self.client.cookies[self.access_cookie_name] = "not-a-valid-jwt"

        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())
