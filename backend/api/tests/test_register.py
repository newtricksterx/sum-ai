import json

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, Client

from django.urls import reverse

User = get_user_model()

class RegisterTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.register_url = reverse("register-user")

        User.objects.create_user(
            email="test@example.com",
            username="test-user",
            password="StrongPassword123!",
        )

     
    def test_register_creates_user(self):
        payload = {
            "email": "new-user@example.com",
            "password": "StrongPassword123!",
        }

        self.assertFalse(User.objects.filter(email=payload["email"]).exists())

        response = self.client.post(
            self.register_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertNotIn("password", response.json())

        created_user = User.objects.get(email="new-user@example.com")

        self.assertEqual(created_user.email, payload["email"])
        self.assertTrue(created_user.check_password("StrongPassword123!"))
        self.assertFalse(created_user.is_staff)
        self.assertTrue(created_user.is_active)

    
    def test_register_rejects_duplicate_email(self):
        payload = {
            "email": "test@example.com",
            "password": "StrongPassword123!",
        }

        response = self.client.post(
            self.register_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_register_rejects_duplicate_email_case_insensitive(self):
        payload = {
            "email": "  TEST@EXAMPLE.COM  ",
            "password": "StrongPassword123!",
        }

        response = self.client.post(
            self.register_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.json())

    def test_register_normalizes_email(self):
        payload = {
            "email": "  NEW-USER@EXAMPLE.COM  ",
            "password": "StrongPassword123!",
        }

        response = self.client.post(
            self.register_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        created_user = User.objects.get(email="new-user@example.com")
        self.assertEqual(created_user.email, "new-user@example.com")

    def test_register_rejects_missing_email(self):
        payload = {
            "password": "StrongPassword123!",
        }

        response = self.client.post(
            self.register_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.json())

    def test_register_rejects_missing_password(self):
        payload = {
            "email": "new-user@example.com",
        }

        response = self.client.post(
            self.register_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.json())

    def test_register_rejects_weak_password(self):
        payload = {
            "email": "new-user@example.com",
            "password": "123",
        }

        response = self.client.post(
            self.register_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.json())


