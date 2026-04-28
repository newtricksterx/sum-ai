from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()

class UserReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class BaseUserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)

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
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class RegisterSerializer(BaseUserWriteSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "password",
        )
        read_only_fields = ("id",)

class LoginSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = User
        fields = (
            "email",
            "password",
        )


class UserCreateSerializer(BaseUserWriteSerializer):
    is_active = serializers.BooleanField(required=False, default=True)
    is_staff = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "password",
            "is_active",
            "is_staff",
        )
        read_only_fields = ("id",)


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("first_name", "last_name", "username")
