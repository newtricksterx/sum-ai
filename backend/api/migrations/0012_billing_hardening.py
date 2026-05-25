# Generated manually for Stripe billing hardening.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0011_subscription_cancel_at_period_end_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscription",
            name="payment_problem_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="subscription",
            name="payment_problem_reason",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.CreateModel(
            name="ProcessedStripeEvent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "stripe_event_id",
                    models.CharField(db_index=True, max_length=255, unique=True),
                ),
                ("event_type", models.CharField(blank=True, max_length=255)),
                ("processed_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ("-processed_at",),
            },
        ),
        migrations.CreateModel(
            name="PendingCheckoutSession",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "plan_slug",
                    models.CharField(
                        choices=[
                            ("free", "Free"),
                            ("standard", "Standard"),
                            ("pro", "Pro"),
                        ],
                        max_length=32,
                    ),
                ),
                ("currency", models.CharField(max_length=3)),
                (
                    "stripe_session_id",
                    models.CharField(db_index=True, max_length=255, unique=True),
                ),
                ("url", models.URLField(max_length=2048)),
                ("expires_at", models.DateTimeField(db_index=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="pending_checkout_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ("-created_at",),
            },
        ),
        migrations.AddConstraint(
            model_name="pendingcheckoutsession",
            constraint=models.UniqueConstraint(
                fields=("user", "plan_slug", "currency"),
                name="unique_pending_checkout_per_plan_currency",
            ),
        ),
        migrations.AddIndex(
            model_name="pendingcheckoutsession",
            index=models.Index(
                fields=["user", "plan_slug", "currency", "expires_at"],
                name="api_pending_user_id_5f25cc_idx",
            ),
        ),
    ]
