from django.urls import path

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)



from api.views import (
    ApiRootView,
    CreateUserView,
    RegisterUserView,
    SummarizeText,
    LoginUserView,
    MeView,
)

urlpatterns = [
    path("", ApiRootView.as_view(), name="api-root"),
    path("summarize", SummarizeText.as_view(), name="summarize-text"),
    path("register", RegisterUserView.as_view(), name="register-user"),
    path("login", LoginUserView.as_view(), name="login-user"),
    path("token/refresh", TokenRefreshView.as_view(), name="token-refresh"),
    path("users/me", MeView.as_view(), name="me"),
    path("users/create", CreateUserView.as_view(), name="create-user"),
]
