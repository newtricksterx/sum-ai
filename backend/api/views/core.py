from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.views import APIView

from api.serializers import UserReadSerializer


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
