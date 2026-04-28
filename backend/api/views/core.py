from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.views import APIView

from api.models.subscription import Subscription
from api.serializers import SubscriptionPlanUpdateSerializer, UserReadSerializer


class ApiRootView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "summarize": reverse("summarize-text", request=request),
                "register": reverse("register-user", request=request),
                "login": reverse("login-user", request=request),
                "logout": reverse("logout-user", request=request),
                "token_refresh": reverse("token-refresh", request=request),
                "create_user": reverse("create-user", request=request),
                "me": reverse("me", request=request),
            }
        )


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserReadSerializer(request.user).data)

    def patch(self, request):
        subscription, _ = Subscription.objects.get_or_create(
            user=request.user,
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
            UserReadSerializer(request.user).data,
            status=status.HTTP_200_OK,
        )
