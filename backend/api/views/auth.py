from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from rest_framework import generics, permissions, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.throttling import ScopedRateThrottle

from api.jwt_tokens import _get_tokens_for_user
from api.serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserCreateSerializer,
    UserReadSerializer,
)

User = get_user_model()


class RegisterUserView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'


class LogoutUserView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_scope = 'auth'

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

        response = Response({"detail": "Logout successful."}, status=status.HTTP_200_OK)

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


class CookieTokenRefreshView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_scope = 'auth'


    def post(self, request):
        refresh_cookie_name = settings.SIMPLE_JWT["AUTH_REFRESH_COOKIE"]
        access_cookie_name = settings.SIMPLE_JWT["AUTH_COOKIE"]
        cookie_domain = settings.SIMPLE_JWT["AUTH_COOKIE_DOMAIN"]
        cookie_path = settings.SIMPLE_JWT["AUTH_COOKIE_PATH"]
        cookie_secure = settings.SIMPLE_JWT["AUTH_COOKIE_SECURE"]
        cookie_http_only = settings.SIMPLE_JWT["AUTH_COOKIE_HTTP_ONLY"]
        cookie_same_site = settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"]

        refresh_token = request.COOKIES.get(refresh_cookie_name)
        if not refresh_token:
            return Response({"detail": "Refresh token missing."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            refresh = RefreshToken(refresh_token)
        except TokenError:
            return Response({"detail": "Refresh token is invalid or expired."}, status=status.HTTP_401_UNAUTHORIZED)

        user_id = refresh.get("user_id")
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            refresh.blacklist()
        except Exception:
            # Continue with rotation; blacklist failures should not block refresh for valid token.
            pass

        rotated_tokens = _get_tokens_for_user(user=user)

        response = Response({"detail": "Token refreshed."}, status=status.HTTP_200_OK)
        response.set_cookie(
            key=access_cookie_name,
            value=rotated_tokens["access"],
            max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
            secure=cookie_secure,
            httponly=cookie_http_only,
            samesite=cookie_same_site,
            path=cookie_path,
            domain=cookie_domain,
        )
        response.set_cookie(
            key=refresh_cookie_name,
            value=rotated_tokens["refresh"],
            max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
            secure=cookie_secure,
            httponly=cookie_http_only,
            samesite=cookie_same_site,
            path=cookie_path,
            domain=cookie_domain,
        )
        return response


class LoginUserView(APIView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        user = authenticate(request=request, email=email, password=password)
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
