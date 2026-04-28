from django.conf import settings
from django.db import models

from api.plans import PLANS, get_history_limit, get_plan, get_summary_limit


PLAN_CHOICES = tuple((slug, plan["name"]) for slug, plan in PLANS.items())


class Subscription(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    plan_slug = models.CharField(max_length=32, choices=PLAN_CHOICES, default="free")
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
