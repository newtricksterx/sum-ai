from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from api.models import Subscription
from api.quota import QuotaExceeded, release_request_slot, reserve_request_slot
from api.plans import get_character_limit, get_action_limit


User = get_user_model()


class ReserveRequestSlotTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(  # type: ignore
            email="quota@example.com",
            password="StrongPassword123!",
        )

    def test_increments_counter_on_free_plan(self):
        subscription, character_limit = reserve_request_slot(self.user)

        self.assertEqual(subscription.actions_used, 1)
        self.assertEqual(character_limit, get_character_limit("free"))

        # Verify it actually hit the DB.
        self.assertEqual(
            Subscription.objects.get(user=self.user).actions_used,
            1,
        )

    def test_multiple_reservations_stack(self):
        for _ in range(3):
            reserve_request_slot(self.user)

        self.assertEqual(
            Subscription.objects.get(user=self.user).actions_used,
            3,
        )

    def test_raises_when_user_is_at_limit(self):
        subscription = Subscription.objects.get(user=self.user)
        subscription.actions_used = get_action_limit("free") # type: ignore
        subscription.save(update_fields=["actions_used"])

        with self.assertRaises(QuotaExceeded) as ctx:
            reserve_request_slot(self.user)

        self.assertEqual(ctx.exception.subscription.pk, subscription.pk)
        self.assertEqual(
            Subscription.objects.get(user=self.user).actions_used,
            get_action_limit("free"),
        )

    def test_pro_plan_with_none_limit_never_raises(self):
        Subscription.objects.update_or_create(
            user=self.user,
            defaults={"plan_slug": "pro", "actions_used": 10_000},
        )

        subscription, _ = reserve_request_slot(self.user)
        self.assertEqual(subscription.actions_used, 10_001)

    def test_resets_usage_period_when_expired(self):
        subscription = Subscription.objects.get(user=self.user)
        # Free plan is monthly — push the start ~5 weeks back so the period has rolled over.
        subscription.current_period_start = timezone.now() - timedelta(days=35)
        subscription.actions_used = get_action_limit("free") # type: ignore
        subscription.save(update_fields=["current_period_start", "actions_used"])

        result_subscription, _ = reserve_request_slot(self.user)

        # Period was reset to 0 then incremented to 1.
        self.assertEqual(result_subscription.actions_used, 1)
        refreshed = Subscription.objects.get(user=self.user)
        self.assertEqual(refreshed.actions_used, 1)
        self.assertGreater(refreshed.current_period_start, timezone.now() - timedelta(minutes=1))


class ReleaseRequestSlotTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(  # type: ignore
            email="release@example.com",
            password="StrongPassword123!",
        )
        self.subscription = Subscription.objects.get(user=self.user)

    def test_decrements_counter(self):
        self.subscription.actions_used = 3
        self.subscription.save(update_fields=["actions_used"])

        release_request_slot(self.subscription.pk)

        self.assertEqual(
            Subscription.objects.get(pk=self.subscription.pk).actions_used,
            2,
        )

    def test_never_goes_below_zero(self):
        # actions_used starts at 0 from setUp.
        release_request_slot(self.subscription.pk)
        release_request_slot(self.subscription.pk)

        self.assertEqual(
            Subscription.objects.get(pk=self.subscription.pk).actions_used,
            0,
        )

    def test_unknown_pk_is_a_noop(self):
        # Should not raise.
        release_request_slot(999_999)
