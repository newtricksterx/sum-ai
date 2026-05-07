from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken


def authenticate_client_with_jwt(client, user):
    refresh = RefreshToken.for_user(user)
    access_cookie_name = settings.SIMPLE_JWT["AUTH_COOKIE"]
    refresh_cookie_name = settings.SIMPLE_JWT["AUTH_REFRESH_COOKIE"]

    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    client.cookies[access_cookie_name] = access_token
    client.cookies[refresh_cookie_name] = refresh_token

    return access_token, refresh_token
