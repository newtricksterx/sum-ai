from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import HttpResponseRedirect
from django.middleware.csrf import CsrfViewMiddleware, get_token
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

from api.jwt_tokens import _get_tokens_for_user
from api.serializers import (
    UserCreateSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class _CSRFCheck(CsrfViewMiddleware):
    def _reject(self, request, reason):  # type: ignore[override]
        return reason


def _set_auth_cookies(response: Response | HttpResponseRedirect, access_token: str, refresh_token: str):
    access_cookie_name = settings.SIMPLE_JWT["AUTH_COOKIE"]
    refresh_cookie_name = settings.SIMPLE_JWT["AUTH_REFRESH_COOKIE"]
    cookie_domain = settings.SIMPLE_JWT["AUTH_COOKIE_DOMAIN"]
    cookie_path = settings.SIMPLE_JWT["AUTH_COOKIE_PATH"]
    refresh_cookie_path = settings.SIMPLE_JWT.get("AUTH_REFRESH_COOKIE_PATH", cookie_path)
    cookie_secure = settings.SIMPLE_JWT["AUTH_COOKIE_SECURE"]
    cookie_http_only = settings.SIMPLE_JWT["AUTH_COOKIE_HTTP_ONLY"]
    cookie_same_site = settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"]

    response.set_cookie(
        key=access_cookie_name,
        value=access_token,
        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        secure=cookie_secure,
        httponly=cookie_http_only,
        samesite=cookie_same_site,
        path=cookie_path,
        domain=cookie_domain,
    )
    response.set_cookie(
        key=refresh_cookie_name,
        value=refresh_token,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        secure=cookie_secure,
        httponly=cookie_http_only,
        samesite=cookie_same_site,
        path=refresh_cookie_path,
        domain=cookie_domain,
    )


def _clear_session_cookie(response: Response | HttpResponseRedirect):
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path=settings.SESSION_COOKIE_PATH,
        domain=settings.SESSION_COOKIE_DOMAIN,
        samesite=settings.SESSION_COOKIE_SAMESITE, # type: ignore
    )


def _has_valid_csrf_token(request) -> bool:
    check = _CSRFCheck(lambda req: None) # type: ignore
    check.process_request(request)
    original_csrf_bypass = getattr(request, "_dont_enforce_csrf_checks", False)
    request._dont_enforce_csrf_checks = False
    try:
        rejection_reason = check.process_view(request, None, (), {})
    finally:
        request._dont_enforce_csrf_checks = original_csrf_bypass

    if rejection_reason is None:
        return True

    logger.warning("CSRF validation failed for %s: %s", request.path, rejection_reason)
    return False


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
        access_cookie_name = settings.SIMPLE_JWT["AUTH_COOKIE"]
        refresh_cookie_name = settings.SIMPLE_JWT["AUTH_REFRESH_COOKIE"]
        cookie_path = settings.SIMPLE_JWT["AUTH_COOKIE_PATH"]
        refresh_cookie_path = settings.SIMPLE_JWT.get("AUTH_REFRESH_COOKIE_PATH", cookie_path)
        cookie_domain = settings.SIMPLE_JWT["AUTH_COOKIE_DOMAIN"]
        cookie_same_site = settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"]

        logger.info("[logout] request received from %s", request.META.get("REMOTE_ADDR"))
        logger.debug("[logout] cookies present: %s", list(request.COOKIES.keys()))

        if not _has_valid_csrf_token(request):
            logger.warning("[logout] CSRF validation failed")
            return Response(
                {"detail": "CSRF token missing or invalid."},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh_token = request.COOKIES.get(refresh_cookie_name)
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
                logger.info("[logout] refresh token blacklisted")
            except Exception:
                logger.warning("[logout] refresh token blacklisting failed", exc_info=True)
        else:
            logger.info("[logout] no refresh token cookie present (path=%s)", refresh_cookie_path)

        has_access = access_cookie_name in request.COOKIES
        logger.info(
            "[logout] clearing cookies: access=%s (present=%s), refresh=%s (present=%s)",
            access_cookie_name, has_access, refresh_cookie_name, bool(refresh_token),
        )

        response = Response({"detail": "Logout successful."}, status=status.HTTP_200_OK)

        response.delete_cookie(
            key=access_cookie_name,
            path=cookie_path,
            domain=cookie_domain,
            samesite=cookie_same_site,  # type: ignore
        )
        response.delete_cookie(
            key=refresh_cookie_name,
            path=refresh_cookie_path,
            domain=cookie_domain,
            samesite=cookie_same_site,  # type: ignore
        )

        logger.info("[logout] complete — delete-cookie headers set")
        return response


class CookieTokenRefreshView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_scope = 'auth'


    def post(self, request):
        if not _has_valid_csrf_token(request):
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
