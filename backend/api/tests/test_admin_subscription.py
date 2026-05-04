import json

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client, TestCase
from django.urls import reverse

from api.models import Subscription


User = get_user_model()


class AdminUserSubscriptionViewTest(TestCase):
    def setUp(self):
        cache.clear()
        self.anonymous_client = Client()
        self.admin_client = Client()
        self.non_admin_client = Client()
        self.login_url = reverse("login-user")

        self.target_user = User.objects.create_user(  # type: ignore
            email="target-user@example.com",
            password="StrongPassword123!",
        )
        self.admin_user = User.objects.create_user(  # type: ignore
            email="admin-user@example.com",
            password="StrongPassword123!",
            is_staff=True,
        )
        self.non_admin_user = User.objects.create_user(  # type: ignore
            email="non-admin-user@example.com",
            password="StrongPassword123!",
        )

        self.url = reverse(
            "admin-user-subscription",
            kwargs={"user_id": self.target_user.id},
        )

    def _login(self, client: Client, email: str, password: str):
        response = client.post(
            self.login_url,
            data=json.dumps({"email": email, "password": password}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

    def test_patch_requires_authentication(self):
        response = self.anonymous_client.patch(
            self.url,
            data=json.dumps({"plan_slug": "pro"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())

    def test_patch_requires_admin_permissions(self):
        self._login(
            self.non_admin_client,
            "non-admin-user@example.com",
            "StrongPassword123!",
        )

        response = self.non_admin_client.patch(
            self.url,
            data=json.dumps({"plan_slug": "pro"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("detail", response.json())

    def test_patch_updates_target_user_subscription_for_admin(self):
        self._login(
            self.admin_client,
            "admin-user@example.com",
            "StrongPassword123!",
        )

        response = self.admin_client.patch(
            self.url,
            data=json.dumps({"plan_slug": "pro"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["subscription"]["plan_slug"], "pro")
        self.assertIsNone(response.json()["subscription"]["summary_limit"])
        self.assertIsNone(response.json()["subscription"]["character_limit"])

        target_subscription = Subscription.objects.get(user=self.target_user)
        self.assertEqual(target_subscription.plan_slug, "pro")

    def test_patch_returns_404_for_unknown_user(self):
        self._login(
            self.admin_client,
            "admin-user@example.com",
            "StrongPassword123!",
        )
        missing_url = reverse("admin-user-subscription", kwargs={"user_id": 999999})

        response = self.admin_client.patch(
            missing_url,
            data=json.dumps({"plan_slug": "pro"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 404)

    def test_patch_rejects_invalid_plan_slug(self):
        self._login(
            self.admin_client,
            "admin-user@example.com",
            "StrongPassword123!",
        )

        response = self.admin_client.patch(
            self.url,
            data=json.dumps({"plan_slug": "Pro"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("plan_slug", response.json())
