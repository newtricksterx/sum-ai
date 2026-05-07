from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from api.models.subscription import Subscription
from api.serializers import SubscriptionPlanUpdateSerializer, UserReadSerializer

User = get_user_model()


class ApiRootView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "summarize": reverse("summarize-text", request=request),
                "logout": reverse("logout-user", request=request),
                "social_auth_complete": reverse("social-auth-complete", request=request),
                "social_jwt_bridge": reverse("social-jwt-bridge", request=request),
                "token_refresh": reverse("token-refresh", request=request),
                "create_user": reverse("create-user", request=request),
                "me": reverse("me", request=request),
            }
        )


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'auth'

    def get(self, request):
        return Response(UserReadSerializer(request.user).data)


class AdminUserSubscriptionView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, user_id: int):
        target_user = get_object_or_404(User, pk=user_id)
        subscription, _ = Subscription.objects.get_or_create(
            user=target_user,
            defaults={"plan_slug": "free"},
        )

        serializer = SubscriptionPlanUpdateSerializer(
            instance=subscription,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            UserReadSerializer(target_user).data,
            status=status.HTTP_200_OK,
        )
