from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.cache import cache
from django.test import Client, TestCase
from django.urls import reverse
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken
import json

from api.models import Subscription

User = get_user_model()

class TestMe(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.me_url = reverse("me")
        self.login_url = reverse("login-user")
        self.access_cookie_name = settings.SIMPLE_JWT["AUTH_COOKIE"]
        self.refresh_cookie_name = settings.SIMPLE_JWT["AUTH_REFRESH_COOKIE"]

        User.objects.create_user(
            email="test@example.com",
            password="StrongPassword123!",
        ) # type: ignore

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
        self.assertEqual(me_response.json()["subscription"]["plan_slug"], "free")

    def test_me_does_not_expose_user_id(self):
        payload = {
            "email": "test@example.com",
            "password": "StrongPassword123!",
        }

        login_response = self.client.post(
            self.login_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        me_response = self.client.get(self.me_url)

        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(me_response.status_code, 200)
        self.assertNotIn("id", me_response.json())

    def test_me_requires_authentication(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())

    def test_me_patch_requires_authentication(self):
        response = self.client.patch(
            self.me_url,
            data=json.dumps({"plan_slug": "pro"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())

    def test_me_delete_requires_authentication(self):
        response = self.client.delete(self.me_url)
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())

    def test_me_patch_updates_subscription_plan(self):
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

        patch_response = self.client.patch(
            self.me_url,
            data=json.dumps({"plan_slug": "pro"}),
            content_type="application/json",
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.json()["subscription"]["plan_slug"], "pro")
        self.assertIsNone(patch_response.json()["subscription"]["summary_limit"])
        self.assertEqual(patch_response.json()["subscription"]["history_limit"], 10)

        user = User.objects.get(email="test@example.com")
        self.assertEqual(Subscription.objects.get(user=user).plan_slug, "pro")

    def test_me_patch_rejects_invalid_plan_slug(self):
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

        patch_response = self.client.patch(
            self.me_url,
            data=json.dumps({"plan_slug": "Pro"}),
            content_type="application/json",
        )
        self.assertEqual(patch_response.status_code, 400)
        self.assertIn("plan_slug", patch_response.json())

    def test_me_delete_user_and_clears_session(self):
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

        delete_response = self.client.delete(self.me_url)
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(User.objects.filter(email="test@example.com").exists())

        me_response = self.client.get(self.me_url)
        self.assertEqual(me_response.status_code, 401)
        self.assertIn("detail", me_response.json())

        self.assertIn(self.access_cookie_name, delete_response.cookies)
        self.assertIn(self.refresh_cookie_name, delete_response.cookies)
        self.assertEqual(delete_response.cookies[self.access_cookie_name].value, "")
        self.assertEqual(delete_response.cookies[self.refresh_cookie_name].value, "")

        client_access_cookie = self.client.cookies.get(self.access_cookie_name)
        client_refresh_cookie = self.client.cookies.get(self.refresh_cookie_name)
        self.assertIsNotNone(client_access_cookie)
        self.assertIsNotNone(client_refresh_cookie)
        self.assertEqual(client_access_cookie.value, "") # type: ignore
        self.assertEqual(client_refresh_cookie.value, "") # type: ignore

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

        expired_access_token = RefreshToken.for_user(user).access_token
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
