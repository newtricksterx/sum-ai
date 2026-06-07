from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta

from api.models import Subscription
from api.plans import get_billing_interval, get_character_limit, get_history_limit, get_action_limit


User = get_user_model()


class SubscriptionTest(TestCase):
    def setUp(self):  
        self.user_test = User.objects.create_user(
            email="subscriber@example.com",
            password="StrongPassword123!",
        )  # type: ignore

    def test_create_user_assigns_free_subscription(self):
        subscription = Subscription.objects.get(user=self.user_test)
        self.assertEqual(subscription.plan_slug, "free")
        self.assertEqual(subscription.action_limit, get_action_limit("free"))
        self.assertEqual(subscription.history_limit, get_history_limit("free"))
        self.assertEqual(subscription.character_limit, get_character_limit("free"))
        self.assertEqual(subscription.billing_interval, get_billing_interval("free"))
        self.assertEqual(subscription.actions_used, 0)
        self.assertLessEqual(subscription.current_period_start, timezone.now())
        self.assertIsNone(subscription.current_period_end)

    def test_usage_period_end_uses_current_period_end_when_set(self):
        subscription = Subscription.objects.get(user=self.user_test)
        subscription.plan_slug = "standard"
        expected_end = timezone.now() + timedelta(days=40)
        subscription.current_period_end = expected_end

        self.assertEqual(subscription.usage_period_ends_at(), expected_end)

    def test_monthly_free_plan_uses_current_period_end_when_set(self):
        subscription = Subscription.objects.get(user=self.user_test)
        subscription.current_period_start = timezone.now() - timedelta(days=2)
        expected_end = timezone.now() + timedelta(days=20)
        subscription.current_period_end = expected_end

        self.assertEqual(subscription.usage_period_ends_at(), expected_end)

    def test_set_subscription_standard(self):
        Subscription.objects.update_or_create(user=self.user_test, defaults={"plan_slug" : "standard"})

        subscription = Subscription.objects.get(user=self.user_test)
        self.assertEqual(subscription.plan_slug, "standard")
        self.assertEqual(subscription.action_limit, 300)
        self.assertEqual(subscription.history_limit, 5)
        self.assertEqual(subscription.character_limit, 30000)
        

    def test_set_subscription_pro(self):
        Subscription.objects.update_or_create(user=self.user_test, defaults={"plan_slug" : "pro"})

        subscription = Subscription.objects.get(user=self.user_test)
        self.assertEqual(subscription.plan_slug, "pro")
        self.assertEqual(subscription.action_limit, 1200)
        self.assertEqual(subscription.history_limit, 10)
        self.assertIsNone(subscription.character_limit)
        
