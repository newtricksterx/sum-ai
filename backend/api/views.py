from rest_framework import generics
from rest_framework import permissions
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import User
from django.contrib.auth import authenticate

from rest_framework_simplejwt.tokens import RefreshToken

from django.conf import settings
from scripts import SumAI

from .serializers import (
    RegisterSerializer,
    UserCreateSerializer,
    LoginSerializer,
    UserReadSerializer,
)

from .jwt_tokens import _get_tokens_for_user


class ApiRootView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "summarize": reverse("summarize-text", request=request),
                "register": reverse("register-user", request=request),
                "login": reverse("login-user", request=request),
                "logout": reverse("logout-user", request=request),
                "create_user": reverse("create-user", request=request),
                "me": reverse("me", request=request),
            }
        )

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserReadSerializer(request.user).data)

class RegisterUserView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class LogoutUserView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = []

    def post(self, request):
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
                # Logout should still clear cookies even if token blacklisting fails.
                pass

        response = Response({"detail" : "Logout successful."}, status=status.HTTP_200_OK)

        response.delete_cookie(
            key=access_cookie_name,
            path=cookie_path,
            domain=cookie_domain,
            samesite=cookie_same_site, # type: ignore
        )

        response.delete_cookie(
            key=refresh_cookie_name,
            path=cookie_path,
            domain=cookie_domain,
            samesite=cookie_same_site, # type: ignore
        )

        return response


class LoginUserView(APIView):
    serializer_class  = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        user = authenticate(username=email, password=password)
        if user is None:
            raise AuthenticationFailed("Invalid email or password.")
        if not user.is_active:
            raise AuthenticationFailed("User is not active.")

        tokens = _get_tokens_for_user(user=user)

        access_cookie_name = settings.SIMPLE_JWT["AUTH_COOKIE"]
        refresh_cookie_name = settings.SIMPLE_JWT["AUTH_REFRESH_COOKIE"]
        cookie_domain = settings.SIMPLE_JWT["AUTH_COOKIE_DOMAIN"]
        cookie_path = settings.SIMPLE_JWT["AUTH_COOKIE_PATH"]
        cookie_secure = settings.SIMPLE_JWT["AUTH_COOKIE_SECURE"]
        cookie_http_only = settings.SIMPLE_JWT["AUTH_COOKIE_HTTP_ONLY"]
        cookie_same_site = settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"]

        response = Response(
            {
                "detail": "Login successful.",
                "user": UserReadSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )

        response.set_cookie(
            key=access_cookie_name,
            value=tokens["access"],
            max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
            secure=cookie_secure,
            httponly=cookie_http_only,
            samesite=cookie_same_site,
            path=cookie_path,
            domain=cookie_domain,
        )

        response.set_cookie(
            key=refresh_cookie_name,
            value=tokens["refresh"],
            max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
            secure=cookie_secure,
            httponly=cookie_http_only,
            samesite=cookie_same_site,
            path=cookie_path,
            domain=cookie_domain,
        )

        return response


class CreateUserView(generics.CreateAPIView):
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.IsAdminUser]


class SummarizeText(APIView):
    def post(self, request):
        content = request.data.get("content")

        if not content:
            return Response(
                {"error": "Missing required field: 'content'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        summary = SumAI.SummarizeContent(
            request.data.get("content"),
            request.data.get("length"),
            request.data.get("regenerate"),
            request.data.get("format"),
            request.data.get("language"),
        )

        return Response({"data": summary})
