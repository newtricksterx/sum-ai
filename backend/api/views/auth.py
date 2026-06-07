from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import HttpResponseRedirect
from django.middleware.csrf import get_token
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator
import logging
from rest_framework import generics, permissions, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import render

from api.csrf_utils import has_valid_csrf_token
from api.jwt_tokens import _get_tokens_for_user
from api.serializers import (
    UserCreateSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


def _get_cookie_config() -> dict:
    jwt = settings.SIMPLE_JWT
    cookie_path = jwt["AUTH_COOKIE_PATH"]
    return {
        "access_cookie_name": jwt["AUTH_COOKIE"],
        "refresh_cookie_name": jwt["AUTH_REFRESH_COOKIE"],
        "cookie_domain": jwt["AUTH_COOKIE_DOMAIN"],
        "cookie_path": cookie_path,
        "refresh_cookie_path": jwt.get("AUTH_REFRESH_COOKIE_PATH", cookie_path),
        "cookie_secure": jwt["AUTH_COOKIE_SECURE"],
        "cookie_http_only": jwt["AUTH_COOKIE_HTTP_ONLY"],
        "cookie_same_site": jwt["AUTH_COOKIE_SAMESITE"],
    }


def _set_auth_cookies(response: Response | HttpResponseRedirect, access_token: str, refresh_token: str):
    cfg = _get_cookie_config()

    response.set_cookie(
        key=cfg["access_cookie_name"],
        value=access_token,
        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        secure=cfg["cookie_secure"],
        httponly=cfg["cookie_http_only"],
        samesite=cfg["cookie_same_site"],
        path=cfg["cookie_path"],
        domain=cfg["cookie_domain"],
    )
    response.set_cookie(
        key=cfg["refresh_cookie_name"],
        value=refresh_token,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        secure=cfg["cookie_secure"],
        httponly=cfg["cookie_http_only"],
        samesite=cfg["cookie_same_site"],
        path=cfg["refresh_cookie_path"],
        domain=cfg["cookie_domain"],
    )


def _clear_session_cookie(response: Response | HttpResponseRedirect):
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path=settings.SESSION_COOKIE_PATH,
        domain=settings.SESSION_COOKIE_DOMAIN,
        samesite=settings.SESSION_COOKIE_SAMESITE, # type: ignore
    )


@method_decorator(never_cache, name="dispatch")
class CSRFTokenView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"csrfToken": get_token(request)}, status=status.HTTP_200_OK)


class LogoutUserView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_scope = 'auth'

    def post(self, request):
        cfg = _get_cookie_config()

        logger.info("[logout] request received from %s", request.META.get("REMOTE_ADDR"))
        logger.debug("[logout] cookies present: %s", list(request.COOKIES.keys()))

        if not has_valid_csrf_token(request):
            logger.warning("[logout] CSRF validation failed")
            return Response(
                {"detail": "CSRF token missing or invalid."},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh_token = request.COOKIES.get(cfg["refresh_cookie_name"])
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
                logger.info("[logout] refresh token blacklisted")
            except Exception:
                logger.warning("[logout] refresh token blacklisting failed", exc_info=True)
        else:
            logger.info("[logout] no refresh token cookie present (path=%s)", cfg["refresh_cookie_path"])

        has_access = cfg["access_cookie_name"] in request.COOKIES
        logger.info(
            "[logout] clearing cookies: access=%s (present=%s), refresh=%s (present=%s)",
            cfg["access_cookie_name"], has_access, cfg["refresh_cookie_name"], bool(refresh_token),
        )

        response = Response({"detail": "Logout successful."}, status=status.HTTP_200_OK)

        response.delete_cookie(
            key=cfg["access_cookie_name"],
            path=cfg["cookie_path"],
            domain=cfg["cookie_domain"],
            samesite=cfg["cookie_same_site"],  # type: ignore
        )
        response.delete_cookie(
            key=cfg["refresh_cookie_name"],
            path=cfg["refresh_cookie_path"],
            domain=cfg["cookie_domain"],
            samesite=cfg["cookie_same_site"],  # type: ignore
        )

        logger.info("[logout] complete — delete-cookie headers set")
        return response


class CookieTokenRefreshView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_scope = 'auth'


    def post(self, request):
        if not has_valid_csrf_token(request):
            return Response(
                {"detail": "CSRF token missing or invalid."},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh_cookie_name = settings.SIMPLE_JWT["AUTH_REFRESH_COOKIE"]
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
        _set_auth_cookies(
            response=response,
            access_token=rotated_tokens["access"],
            refresh_token=rotated_tokens["refresh"],
        )
        return response


class SocialJWTBridgeView(APIView):
    """
    Exchange an authenticated allauth session for JWT cookies.
    """

    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [SessionAuthentication]
    throttle_scope = 'auth'

    def get(self, request):
        redirect_to = request.GET.get("next") or settings.SOCIAL_AUTH_SUCCESS_REDIRECT_URL

        allowed_hosts = set(settings.ALLOWED_HOSTS)
        current_host = request.get_host()
        if current_host:
            allowed_hosts.add(current_host)

        if not url_has_allowed_host_and_scheme(
            url=redirect_to,
            allowed_hosts=allowed_hosts,
            require_https=request.is_secure(),
        ):
            redirect_to = settings.SOCIAL_AUTH_SUCCESS_REDIRECT_URL

        tokens = _get_tokens_for_user(user=request.user)

        response = HttpResponseRedirect(redirect_to)
        _set_auth_cookies(
            response=response,
            access_token=tokens["access"],
            refresh_token=tokens["refresh"],
        )

        request.session.flush()
        _clear_session_cookie(response)
        return response


class SocialAuthCompleteView(APIView):
    """
    Final landing page for social login opened in a dedicated auth tab.
    Attempts to close the tab automatically, with a visible fallback message.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        template_url = "../templates/socialaccount/complete.html"

        return render(request=request, template_name=template_url)


class CreateUserView(generics.CreateAPIView):
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.IsAdminUser]
