from django.db import models


class Plan(models.Model):
    class BillingInterval(models.TextChoices):
        MONTH = "month", "Month"
        YEAR = "year", "Year"

    code = models.CharField(max_length=32, unique=True, db_index=True)
    name = models.CharField(max_length=64)
    summary_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum summaries per billing period. Null means unlimited.",
    )
    history_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum history items retained. Null means unlimited.",
    )
    price_cents = models.PositiveIntegerField(default=0)
    billing_interval = models.CharField(
        max_length=16,
        choices=BillingInterval.choices,
        default=BillingInterval.MONTH,
    )
    priority_level = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("price_cents", "id")

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"