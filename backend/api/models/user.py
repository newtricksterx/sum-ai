import re

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.db import models


username_validator = UnicodeUsernameValidator()


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _clean_username(self, username: str) -> str:
        cleaned = self.model.normalize_username(username.strip())
        if not cleaned:
            raise ValueError("The given username must be set")
        return cleaned

    def _generate_unique_username(self, email: str) -> str:
        local_part = email.split("@", 1)[0].lower()
        base = re.sub(r"[^A-Za-z0-9@.+_-]", "", local_part) or "user"
        base = base[:150]
        candidate = base
        counter = 1

        while self.model._default_manager.filter(username__iexact=candidate).exists():
            suffix = str(counter)
            candidate = f"{base[:150 - len(suffix)]}{suffix}"
            counter += 1
        return candidate

    def create_user(self, email, password=None, username=None, **extra_fields):
        if not email:
            raise ValueError("The given email must be set")

        email = self.normalize_email(email).strip().lower()

        provided_username = username
        if provided_username is None:
            provided_username = extra_fields.pop("username", None)

        if provided_username:
            username = self._clean_username(provided_username)
            if self.model._default_manager.filter(username__iexact=username).exists():
                raise ValueError("A user with this username already exists.")
        else:
            username = self._generate_unique_username(email)

        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, username=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, username=username, **extra_fields)


class User(AbstractUser):
    username = models.CharField(
        "username",
        max_length=150,
        unique=True,
        blank=True,
        null=True,
        help_text="150 characters or fewer. Letters, digits and @/./+/-/_ only.",
        validators=[username_validator],
        error_messages={"unique": "A user with that username already exists."},
    )
    email = models.EmailField("email address", unique=True)
    stripe_customer_id = models.CharField(
        max_length=255,
        unique=True,
        blank=True,
        null=True,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager() # type: ignore

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self) -> str:
        return self.username or self.email
