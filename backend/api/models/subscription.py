import calendar
from datetime import datetime, timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

from api.plans import (
    PLANS,
    get_billing_interval,
    get_character_limit,
    get_history_limit,
    get_plan,
    get_action_limit,
)


PLAN_CHOICES = tuple((slug, plan["name"]) for slug, plan in PLANS.items())


def _add_months(value: datetime, months: int) -> datetime:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


class Subscription(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    plan_slug = models.CharField(max_length=32, choices=PLAN_CHOICES, default="free")
    stripe_subscription_id = models.CharField(
        max_length=255,
        unique=True,
        blank=True,
        null=True,
        db_index=True,
    )
    actions_used = models.PositiveIntegerField(default=0)
    current_period_start = models.DateTimeField(default=timezone.now)
    current_period_end = models.DateTimeField(blank=True, null=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    stripe_price_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    cancel_at_period_end = models.BooleanField(default=False)
    payment_problem_reason = models.CharField(max_length=255, blank=True, null=True)
    payment_problem_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self) -> str:
        return f"{self.user.email} ({self.plan_slug})"

    @classmethod
    def ensure_for_user(cls, user, *, select_for_update_=False, defaults=None):
        qs = cls.objects.select_for_update() if select_for_update_ else cls.objects
        base_defaults = {"plan_slug": "free"}
        if defaults:
            base_defaults.update(defaults)
        subscription, _ = qs.get_or_create(user=user, defaults=base_defaults)
        return subscription

    @property
    def plan(self) -> dict:
        return get_plan(self.plan_slug)

    @property
    def action_limit(self) -> int | None:
        return get_action_limit(self.plan_slug)

    @property
    def history_limit(self) -> int | None:
        return get_history_limit(self.plan_slug)

    @property
    def character_limit(self) -> int | None:
        return get_character_limit(self.plan_slug)

    @property
    def billing_interval(self) -> str:
        return get_billing_interval(self.plan_slug)

    def _calculate_period_end_from_start(self, period_start: datetime) -> datetime:
        interval = self.billing_interval

        if interval == "monthly":
            return _add_months(period_start, 1)
        if interval == "yearly":
            return _add_months(period_start, 12)
        if interval == "weekly":
            return period_start + timedelta(weeks=1)
        if interval == "daily":
            return period_start + timedelta(days=1)

        return _add_months(period_start, 1)

    def usage_period_ends_at(self) -> datetime:
        if self.billing_interval == "daily":
            return self._calculate_period_end_from_start(self.current_period_start)

        if self.current_period_end is not None:
            return self.current_period_end
        return self._calculate_period_end_from_start(self.current_period_start)

    def should_reset_usage_period(self, reference_time: datetime | None = None) -> bool:
        now = reference_time or timezone.now()
        return now >= self.usage_period_ends_at()

    def reset_usage_period(self, reference_time: datetime | None = None) -> None:
        self.actions_used = 0
        self.current_period_start = reference_time or timezone.now()
        if self.billing_interval == "daily":
            # Keep free plan rolling interval derived from current_period_start.
            self.current_period_end = None
        elif self.current_period_end is not None:
            self.current_period_end = self._calculate_period_end_from_start(
                self.current_period_start
            )


class ProcessedStripeEvent(models.Model):
    stripe_event_id = models.CharField(max_length=255, unique=True, db_index=True)
    event_type = models.CharField(max_length=255, blank=True)
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-processed_at",)

    def __str__(self) -> str:
        return f"{self.stripe_event_id} ({self.event_type})"


class PendingCheckoutSession(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pending_checkout_sessions",
    )
    plan_slug = models.CharField(max_length=32, choices=PLAN_CHOICES)
    currency = models.CharField(max_length=3)
    stripe_session_id = models.CharField(max_length=255, unique=True, db_index=True)
    url = models.URLField(max_length=2048)
    expires_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["user", "plan_slug", "currency"],
                name="unique_pending_checkout_per_plan_currency",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "plan_slug", "currency", "expires_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} {self.plan_slug} {self.currency} ({self.stripe_session_id})"
