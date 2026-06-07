from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models.subscription import Subscription
from .plans import PLANS, get_price_currency, get_price_minor

User = get_user_model()


class SubscriptionReadSerializer(serializers.ModelSerializer):
    plan_name = serializers.SerializerMethodField()
    billing_interval = serializers.CharField(read_only=True)
    price_minor = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    action_limit = serializers.IntegerField(read_only=True, allow_null=True)
    history_limit = serializers.IntegerField(read_only=True, allow_null=True)
    character_limit = serializers.IntegerField(read_only=True, allow_null=True)
    actions_used = serializers.IntegerField(read_only=True)
    current_period_start = serializers.DateTimeField(read_only=True)
    current_period_end = serializers.DateTimeField(read_only=True, allow_null=True)
    cancel_at_period_end = serializers.BooleanField(read_only=True)
    payment_problem_reason = serializers.CharField(read_only=True, allow_null=True)
    payment_problem_at = serializers.DateTimeField(read_only=True, allow_null=True)

    def get_plan_name(self, obj: Subscription) -> str:
        return obj.plan["name"]

    def _get_requested_currency(self) -> str | None:
        context_currency = self.context.get("currency")
        if isinstance(context_currency, str):
            return context_currency
        return None

    def get_currency(self, obj: Subscription) -> str:
        return get_price_currency(obj.plan_slug, self._get_requested_currency())

    def get_price_minor(self, obj: Subscription) -> int:
        return get_price_minor(obj.plan_slug, self.get_currency(obj))

    class Meta:
        model = Subscription
        fields = (
            "plan_slug",
            "plan_name",
            "billing_interval",
            "price_minor",
            "currency",
            "action_limit",
            "history_limit",
            "character_limit",
            "actions_used",
            "current_period_start",
            "current_period_end",
            "cancel_at_period_end",
            "payment_problem_reason",
            "payment_problem_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class UserReadSerializer(serializers.ModelSerializer):
    subscription = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    def get_subscription(self, obj):
        subscription = getattr(obj, "subscription", None)
        if subscription is None:
            return None
        return SubscriptionReadSerializer(subscription, context=self.context).data

    def get_avatar_url(self, obj):
        social_accounts = getattr(obj, "socialaccount_set", None)
        if social_accounts is None:
            return None

        social_account = social_accounts.filter(provider="google").first()
        if social_account is None:
            social_account = social_accounts.first()

        if social_account is None:
            return None

        extra_data = getattr(social_account, "extra_data", None)
        if isinstance(extra_data, dict):
            for key in ("picture", "avatar_url", "avatar", "profile_image_url"):
                avatar_url = extra_data.get(key)
                if isinstance(avatar_url, str) and avatar_url.strip():
                    return avatar_url

        try:
            avatar_url = social_account.get_avatar_url()
        except Exception:
            return None

        if isinstance(avatar_url, str) and avatar_url.strip():
            return avatar_url
        return None

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "avatar_url",
            "subscription",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class SubscriptionPlanUpdateSerializer(serializers.ModelSerializer):
    plan_slug = serializers.ChoiceField(
        choices=tuple((slug, slug) for slug in PLANS.keys()),
    )

    class Meta:
        model = Subscription
        fields = ("plan_slug",)


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, value):
        if value is None:
            return None

        normalized_username = value.strip()
        if not normalized_username:
            return None

        instance = getattr(self, "instance", None)
        duplicate_username_exists = User.objects.filter(username__iexact=normalized_username)
        if instance is not None:
            duplicate_username_exists = duplicate_username_exists.exclude(pk=instance.pk)

        if duplicate_username_exists.exists():
            raise serializers.ValidationError("A user with this username already exists.")

        return normalized_username

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        instance = getattr(self, "instance", None)

        duplicate_email_exists = User.objects.filter(email__iexact=normalized_email)
        if instance is not None:
            duplicate_email_exists = duplicate_email_exists.exclude(pk=instance.pk)

        if duplicate_email_exists.exists():
            raise serializers.ValidationError("A user with this email already exists.")

        return normalized_email

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "password",
            "is_active",
            "is_staff",
        )
        read_only_fields = ("id", "is_active", "is_staff")


