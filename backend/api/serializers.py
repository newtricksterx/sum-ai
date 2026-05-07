from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models.subscription import Subscription
from .plans import PLANS

User = get_user_model()


class SubscriptionReadSerializer(serializers.ModelSerializer):
    plan_name = serializers.SerializerMethodField()
    summary_limit = serializers.IntegerField(read_only=True, allow_null=True)
    history_limit = serializers.IntegerField(read_only=True, allow_null=True)
    character_limit = serializers.IntegerField(read_only=True, allow_null=True)
    summaries_used = serializers.IntegerField(read_only=True)
    current_period_start = serializers.DateTimeField(read_only=True)
    current_period_end = serializers.DateTimeField(read_only=True, allow_null=True)

    def get_plan_name(self, obj: Subscription) -> str:
        return obj.plan["name"]

    class Meta:
        model = Subscription
        fields = (
            "plan_slug",
            "plan_name",
            "summary_limit",
            "history_limit",
            "character_limit",
            "summaries_used",
            "current_period_start",
            "current_period_end",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class UserReadSerializer(serializers.ModelSerializer):
    subscription = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    def get_subscription(self, obj):
        subscription, _ = Subscription.objects.get_or_create(
            user=obj,
            defaults={"plan_slug": "free"},
        )
        return SubscriptionReadSerializer(subscription).data

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


class BaseUserWriteSerializer(serializers.ModelSerializer):
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


class UserCreateSerializer(BaseUserWriteSerializer):
    is_active = serializers.BooleanField(required=False, default=True)
    is_staff = serializers.BooleanField(required=False, default=False)

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
        read_only_fields = ("id",)


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("first_name", "last_name")
