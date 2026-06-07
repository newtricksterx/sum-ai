from django.contrib.auth import get_user_model
from django.test import TestCase, RequestFactory
from django.middleware.csrf import get_token
from rest_framework import exceptions

from api.csrf_utils import enforce_csrf, has_valid_csrf_token

User = get_user_model()


class EnforceCsrfTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory(enforce_csrf_checks=True)

    def test_raises_permission_denied_without_csrf_token(self):
        request = self.factory.post("/fake-path")
        with self.assertRaises(exceptions.PermissionDenied):
            enforce_csrf(request)

    def test_passes_with_valid_csrf_token(self):
        request = self.factory.get("/fake-path")
        token = get_token(request)

        request = self.factory.post(
            "/fake-path",
            HTTP_X_CSRFTOKEN=token,
            HTTP_COOKIE=f"csrftoken={token}",
        )
        request.COOKIES["csrftoken"] = token
        request.META["CSRF_COOKIE"] = token
        enforce_csrf(request)

    def test_restores_dont_enforce_flag(self):
        request = self.factory.post("/fake-path")
        request._dont_enforce_csrf_checks = True
        with self.assertRaises(exceptions.PermissionDenied):
            enforce_csrf(request)
        self.assertTrue(request._dont_enforce_csrf_checks)


class HasValidCsrfTokenTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory(enforce_csrf_checks=True)

    def test_returns_false_without_csrf_token(self):
        request = self.factory.post("/fake-path")
        self.assertFalse(has_valid_csrf_token(request))

    def test_returns_true_with_valid_csrf_token(self):
        request = self.factory.get("/fake-path")
        token = get_token(request)

        request = self.factory.post(
            "/fake-path",
            HTTP_X_CSRFTOKEN=token,
            HTTP_COOKIE=f"csrftoken={token}",
        )
        request.COOKIES["csrftoken"] = token
        request.META["CSRF_COOKIE"] = token
        self.assertTrue(has_valid_csrf_token(request))

    def test_restores_dont_enforce_flag_on_failure(self):
        request = self.factory.post("/fake-path")
        request._dont_enforce_csrf_checks = True
        has_valid_csrf_token(request)
        self.assertTrue(request._dont_enforce_csrf_checks)
