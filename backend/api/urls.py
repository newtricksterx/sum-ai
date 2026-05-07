from django.urls import path

from api.views import (
    AdminUserSubscriptionView,
    ApiRootView,
    SocialAuthCompleteView,
    SocialJWTBridgeView,
    CreateUserView,
    SummarizeText,
    LogoutUserView,
    CookieTokenRefreshView,
    MeView,
)

urlpatterns = [
    path("", ApiRootView.as_view(), name="api-root"),
    path("summarize", SummarizeText.as_view(), name="summarize-text"),
    path("logout", LogoutUserView.as_view(), name="logout-user"),
    path("auth/social/complete", SocialAuthCompleteView.as_view(), name="social-auth-complete"),
    path("auth/social/jwt", SocialJWTBridgeView.as_view(), name="social-jwt-bridge"),
    path("token/refresh", CookieTokenRefreshView.as_view(), name="token-refresh"),
    path("users/me", MeView.as_view(), name="me"),
    path("users/create", CreateUserView.as_view(), name="create-user"),
    path(
        "admin/users/<int:user_id>/subscription",
        AdminUserSubscriptionView.as_view(),
        name="admin-user-subscription",
    ),
]
