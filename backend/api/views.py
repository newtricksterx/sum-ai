from rest_framework import generics
from rest_framework import permissions
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import User
from django.contrib.auth import authenticate


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

class LoginUserView(generics.CreateAPIView):
    serializer_class  = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data

        email = data.get('email')
        password = data.get('password')

        user = authenticate(username=email, password=password)

        if user is None:
            raise AuthenticationFailed("Invalid email or password.")
        
        result = _get_tokens_for_user(user=user) 
        return Response(result, status=status.HTTP_200_OK)
        

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
