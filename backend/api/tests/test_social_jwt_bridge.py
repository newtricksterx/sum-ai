from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client, TestCase
from django.urls import reverse


User = get_user_model()


class SocialJWTBridgeTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.bridge_url = reverse("social-jwt-bridge")
        self.access_cookie_name = settings.SIMPLE_JWT["AUTH_COOKIE"]
        self.refresh_cookie_name = settings.SIMPLE_JWT["AUTH_REFRESH_COOKIE"]
        self.session_cookie_name = settings.SESSION_COOKIE_NAME
        self.complete_url = reverse("social-auth-complete")

        self.user = User.objects.create_user(  # type: ignore
            email="google-user@example.com",
            password="StrongPassword123!",
        )

    def test_bridge_requires_authenticated_session(self):
        response = self.client.get(self.bridge_url)
        self.assertIn(response.status_code, (401, 403))

    def test_bridge_sets_jwt_cookies_and_clears_session(self):
        self.client.force_login(self.user)

        response = self.client.get(self.bridge_url)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], settings.SOCIAL_AUTH_SUCCESS_REDIRECT_URL)
        self.assertIn(self.access_cookie_name, response.cookies)
        self.assertIn(self.refresh_cookie_name, response.cookies)

        self.assertIn(self.session_cookie_name, response.cookies)
        self.assertEqual(response.cookies[self.session_cookie_name].value, "")

    def test_bridge_allows_safe_next_redirect_on_same_host(self):
        self.client.force_login(self.user)
        response = self.client.get(
            self.bridge_url,
            data={"next": "http://testserver/api/users/me"},
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "http://testserver/api/users/me")
        self.assertIn(self.access_cookie_name, response.cookies)
        self.assertIn(self.refresh_cookie_name, response.cookies)

    def test_bridge_rejects_unsafe_external_next_redirect(self):
        self.client.force_login(self.user)
        response = self.client.get(
            self.bridge_url,
            data={"next": "https://evil.example.com/steal"},
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], settings.SOCIAL_AUTH_SUCCESS_REDIRECT_URL)

    def test_social_auth_complete_renders_auto_close_script(self):
        response = self.client.get(self.complete_url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("window.close()", response.content.decode("utf-8"))
