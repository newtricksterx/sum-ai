from django.conf import settings
from rest_framework.permissions import SAFE_METHODS
from rest_framework_simplejwt.authentication import JWTAuthentication

from api.csrf_utils import enforce_csrf


class CookieJWTAuthentication(JWTAuthentication):
    """
    Authenticate using standard Bearer header first, then fallback to JWT cookie.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is not None:
                validated_token = self.get_validated_token(raw_token)
                return (self.get_user(validated_token), validated_token)

        cookie_name = settings.SIMPLE_JWT.get("AUTH_COOKIE")
        if not cookie_name:
            return None

        raw_token = request.COOKIES.get(cookie_name)
        if raw_token is None:
            return None

        if request.method not in SAFE_METHODS:
            enforce_csrf(request)

        validated_token = self.get_validated_token(raw_token)
        return (self.get_user(validated_token), validated_token)
