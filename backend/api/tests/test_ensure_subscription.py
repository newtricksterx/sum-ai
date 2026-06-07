from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from api.models import Subscription

User = get_user_model()


class EnsureForUserTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="ensure-sub@example.com",
            password="StrongPassword123!",
        )

    def test_returns_existing_subscription(self):
        existing = Subscription.objects.get(user=self.user)
        result = Subscription.ensure_for_user(self.user)
        self.assertEqual(result.pk, existing.pk)
        self.assertEqual(result.plan_slug, "free")

    def test_creates_subscription_if_missing(self):
        Subscription.objects.filter(user=self.user).delete()
        self.assertFalse(Subscription.objects.filter(user=self.user).exists())

        result = Subscription.ensure_for_user(self.user)

        self.assertEqual(result.plan_slug, "free")
        self.assertEqual(result.user, self.user)
        self.assertTrue(Subscription.objects.filter(user=self.user).exists())

    def test_does_not_overwrite_existing_plan(self):
        sub = Subscription.objects.get(user=self.user)
        sub.plan_slug = "pro"
        sub.save()

        result = Subscription.ensure_for_user(self.user)
        self.assertEqual(result.plan_slug, "pro")

    def test_select_for_update_flag(self):
        result = Subscription.ensure_for_user(self.user, select_for_update_=True)
        self.assertEqual(result.plan_slug, "free")
        self.assertEqual(result.user, self.user)

    def test_extra_defaults_applied_on_creation(self):
        Subscription.objects.filter(user=self.user).delete()
        now = timezone.now()

        result = Subscription.ensure_for_user(
            self.user, defaults={"current_period_start": now},
        )

        self.assertEqual(result.current_period_start, now)
        self.assertEqual(result.plan_slug, "free")

    def test_extra_defaults_ignored_when_existing(self):
        original_start = Subscription.objects.get(user=self.user).current_period_start
        later = timezone.now()

        result = Subscription.ensure_for_user(
            self.user, defaults={"current_period_start": later},
        )

        self.assertEqual(result.current_period_start, original_start)

    def test_idempotent_when_called_twice(self):
        first = Subscription.ensure_for_user(self.user)
        second = Subscription.ensure_for_user(self.user)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(Subscription.objects.filter(user=self.user).count(), 1)
