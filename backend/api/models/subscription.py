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
    get_summary_limit,
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
    summaries_used = models.PositiveIntegerField(default=0)
    current_period_start = models.DateTimeField(default=timezone.now)
    current_period_end = models.DateTimeField(blank=True, null=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self) -> str:
        return f"{self.user.email} ({self.plan_slug})"

    @property
    def plan(self) -> dict:
        return get_plan(self.plan_slug)

    @property
    def summary_limit(self) -> int | None:
        return get_summary_limit(self.plan_slug)

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
        self.summaries_used = 0
        self.current_period_start = reference_time or timezone.now()
        if self.billing_interval == "daily":
            # Keep free plan rolling interval derived from current_period_start.
            self.current_period_end = None
        elif self.current_period_end is not None:
            self.current_period_end = self._calculate_period_end_from_start(
                self.current_period_start
            )
