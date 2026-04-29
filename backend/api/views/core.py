from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

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

    def delete(self, request):
        access_cookie_name = settings.SIMPLE_JWT["AUTH_COOKIE"]
        refresh_cookie_name = settings.SIMPLE_JWT["AUTH_REFRESH_COOKIE"]
        cookie_path = settings.SIMPLE_JWT["AUTH_COOKIE_PATH"]
        cookie_domain = settings.SIMPLE_JWT["AUTH_COOKIE_DOMAIN"]
        cookie_same_site = settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"]

        refresh_token = request.COOKIES.get(refresh_cookie_name)
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except Exception:
                # Account deletion should still complete even if token blacklisting fails.
                pass

        request.user.delete()

        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(
            key=access_cookie_name,
            path=cookie_path,
            domain=cookie_domain,
            samesite=cookie_same_site,  # type: ignore
        )
        response.delete_cookie(
            key=refresh_cookie_name,
            path=cookie_path,
            domain=cookie_domain,
            samesite=cookie_same_site,  # type: ignore
        )
        return response
