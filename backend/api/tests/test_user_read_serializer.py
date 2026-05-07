from allauth.socialaccount.models import SocialAccount
from django.contrib.auth import get_user_model
from django.test import TestCase

from api.serializers import UserReadSerializer


User = get_user_model()


class UserReadSerializerAvatarTests(TestCase):
    def test_includes_google_avatar_url_when_available(self):
        user = User.objects.create_user(  # type: ignore
            email="avatar-user@example.com",
            password="StrongPassword123!",
        )
        SocialAccount.objects.create(
            user=user,
            provider="google",
            uid="google-user-1",
            extra_data={"picture": "https://example.com/avatar.png"},
        )

        serialized_user = UserReadSerializer(user).data

        self.assertEqual(serialized_user["avatar_url"], "https://example.com/avatar.png")

    def test_avatar_url_is_none_without_social_account(self):
        user = User.objects.create_user(  # type: ignore
            email="no-avatar-user@example.com",
            password="StrongPassword123!",
        )

        serialized_user = UserReadSerializer(user).data

        self.assertIsNone(serialized_user["avatar_url"])
