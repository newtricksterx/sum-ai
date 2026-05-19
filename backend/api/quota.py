from django.db import transaction
from django.db.models import F
from django.utils import timezone

from api.models.subscription import Subscription


class QuotaExceeded(Exception):
    """Raised when a user has used all their request slots for the current period."""

    def __init__(self, subscription: Subscription):
        super().__init__("action_limit_reached")
        self.subscription = subscription


def reserve_request_slot(user) -> tuple[Subscription, int | None]:
    """Atomically reserve one request slot for `user`.

    Returns (subscription, character_limit). Raises QuotaExceeded when the user
    is at or above their plan's action_limit. Resets the usage period first
    if the previous period has ended.
    """
    now = timezone.now()
    with transaction.atomic():
        subscription, _ = Subscription.objects.select_for_update().get_or_create(
            user=user,
            defaults={"plan_slug": "free", "current_period_start": now},
        )

        if subscription.should_reset_usage_period(reference_time=now):
            subscription.reset_usage_period(reference_time=now)
            subscription.save(
                update_fields=[
                    "actions_used",
                    "current_period_start",
                    "current_period_end",
                    "updated_at",
                ]
            )

        limit = subscription.action_limit
        if limit is not None and subscription.actions_used >= limit:
            raise QuotaExceeded(subscription)

        Subscription.objects.filter(pk=subscription.pk).update(
            actions_used=F("actions_used") + 1
        )
        subscription.refresh_from_db(fields=["actions_used"]) # type: ignore

    return subscription, subscription.character_limit


def release_request_slot(subscription_pk: int) -> None:
    """Refund one slot. Guarded so a double-release cannot push the counter below zero."""
    Subscription.objects.filter(
        pk=subscription_pk,
        actions_used__gt=0,
    ).update(actions_used=F("actions_used") - 1)
