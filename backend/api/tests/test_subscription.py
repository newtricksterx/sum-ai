from django.contrib.auth import get_user_model
from django.test import TestCase

from api.models import Subscription


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
        self.assertEqual(subscription.summary_limit, 2)
        self.assertEqual(subscription.history_limit, 1)

    def set_subscription_pro(self):
        Subscription.objects.update_or_create(user=self.user_test, defaults={"plan_slug" : "pro"})

        subscription = Subscription.objects.get(user=self.user_test)
        self.assertEqual(subscription.plan_slug, "pro")
        self.assertEqual(subscription.summary_limit, None)
        self.assertEqual(subscription.history_limit, 10)
        


