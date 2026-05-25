from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models.subscription import (
    PendingCheckoutSession,
    ProcessedStripeEvent,
    Subscription,
)
from .models.user import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("id",)
    list_display = ("username", "email", "stripe_customer_id", "is_staff", "is_active")
    search_fields = ("username", "email", "first_name", "last_name", "stripe_customer_id")

    fieldsets = (
        (None, {"fields": ("username", "email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name")}),
        ("Stripe", {"fields": ("stripe_customer_id",)}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "email", "password1", "password2", "is_staff", "is_active"),
            },
        ),
    )


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "plan_slug",
        "stripe_subscription_id",
        "stripe_price_id",
        "cancel_at_period_end",
        "payment_problem_reason",
        "payment_problem_at",
        "current_period_end",
        "updated_at",
    )
    search_fields = (
        "user__email",
        "plan_slug",
        "stripe_subscription_id",
        "stripe_price_id",
        "payment_problem_reason",
    )
    list_filter = ("plan_slug", "cancel_at_period_end", "payment_problem_reason")


@admin.register(ProcessedStripeEvent)
class ProcessedStripeEventAdmin(admin.ModelAdmin):
    list_display = ("stripe_event_id", "event_type", "processed_at")
    search_fields = ("stripe_event_id", "event_type")
    list_filter = ("event_type",)
    readonly_fields = ("stripe_event_id", "event_type", "processed_at")


@admin.register(PendingCheckoutSession)
class PendingCheckoutSessionAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "plan_slug",
        "currency",
        "stripe_session_id",
        "expires_at",
        "updated_at",
    )
    search_fields = ("user__email", "stripe_session_id", "plan_slug", "currency")
    list_filter = ("plan_slug", "currency")
    readonly_fields = ("created_at", "updated_at")
