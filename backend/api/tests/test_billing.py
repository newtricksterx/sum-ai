"""
Tests for backend/api/views/billing.py — webhook handlers and session_action.

Webhook tests use RequestFactory + direct webhook_view() calls to bypass URL
routing and signature verification. session_action tests use the real Django
test client with JWT cookies + CSRF headers to exercise CookieJWTAuthentication
end to end.
"""
import json
import os
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import Client, RequestFactory, TestCase
from django.urls import reverse

from api.models import Subscription
from api.tests.helpers import authenticate_client_with_jwt, get_csrf_headers
from api.views import billing


User = get_user_model()


# Stub price ids — tests patch billing.get_plan_type to map these.
PRICE_STANDARD = "price_TEST_STANDARD"
PRICE_PRO = "price_TEST_PRO"

# Fixed Unix timestamps so period-comparison logic is deterministic.
PERIOD1_START = 1700000000
PERIOD1_END = PERIOD1_START + 31 * 86400
PERIOD2_START = PERIOD1_END
PERIOD2_END = PERIOD2_START + 31 * 86400


def fake_get_plan_type(price_id):
    if price_id == PRICE_STANDARD:
        return "standard"
    if price_id == PRICE_PRO:
        return "pro"
    return "free"


def _post_webhook(event_type, data_object, event_id="evt_test"):
    """Build a synthetic Stripe webhook request and dispatch directly."""
    payload = json.dumps(
        {"id": event_id, "type": event_type, "data": {"object": data_object}}
    ).encode("utf-8")
    request = RequestFactory().post(
        "/api/billing/webhook", data=payload, content_type="application/json"
    )
    return billing.webhook_view(request)


class _WebhookTestBase(TestCase):
    """Disable signature verification + stub get_plan_type for all webhook tests."""

    def setUp(self):
        self._secret_patcher = patch.object(billing, "webhook_secret", "")
        self._secret_patcher.start()
        self._gpt_patcher = patch.object(
            billing, "get_plan_type", side_effect=fake_get_plan_type
        )
        self._gpt_patcher.start()

    def tearDown(self):
        self._gpt_patcher.stop()
        self._secret_patcher.stop()


class WebhookCheckoutSessionCompletedTests(_WebhookTestBase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(  # type: ignore
            email="checkout-test@example.com", password="x"
        )

    def test_happy_path_links_customer_and_subscription(self):
        resp = _post_webhook(
            "checkout.session.completed",
            {
                "id": "cs_TEST_1",
                "customer": "cus_TEST_1",
                "subscription": "sub_TEST_1",
                "customer_details": {"email": "checkout-test@example.com"},
            },
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.stripe_customer_id, "cus_TEST_1")
        self.assertEqual(self.user.subscription.stripe_subscription_id, "sub_TEST_1")
        # Plan is NOT granted at checkout — that happens on invoice.paid.
        self.assertEqual(self.user.subscription.plan_slug, "free")

    def test_case_insensitive_email_match(self):
        """Mixed-case email in event payload should still match the local user.

        Regression test for billing.py:93 where filter(email=email) was
        case-sensitive and missed users whose stored email is lowercased.
        """
        resp = _post_webhook(
            "checkout.session.completed",
            {
                "id": "cs_TEST_2",
                "customer": "cus_TEST_2",
                "subscription": "sub_TEST_2",
                "customer_details": {"email": "CHECKOUT-TEST@EXAMPLE.COM"},
            },
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.stripe_customer_id, "cus_TEST_2")

    def test_unknown_email_returns_200_no_db_change(self):
        resp = _post_webhook(
            "checkout.session.completed",
            {
                "id": "cs_TEST_3",
                "customer": "cus_ORPHAN",
                "subscription": "sub_ORPHAN",
                "customer_details": {"email": "nobody@example.invalid"},
            },
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(
            User.objects.filter(stripe_customer_id="cus_ORPHAN").exists()
        )


class WebhookInvoicePaidTests(_WebhookTestBase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(  # type: ignore
            email="invoice-test@example.com", password="x"
        )
        self.user.stripe_customer_id = "cus_INV_1"
        self.user.save(update_fields=["stripe_customer_id", "updated_at"])
        # post_save signal in api/signals.py already created a free Subscription.
        # Just update the existing row.
        self.subscription = self.user.subscription
        self.subscription.stripe_subscription_id = "sub_INV_1"
        self.subscription.save(update_fields=["stripe_subscription_id", "updated_at"])

    def _invoice_payload(
        self,
        customer="cus_INV_1",
        customer_email="invoice-test@example.com",
        subscription="sub_INV_1",
        price=PRICE_STANDARD,
        period_start=PERIOD1_START,
        period_end=PERIOD1_END,
    ):
        return {
            "id": "in_TEST",
            "customer": customer,
            "customer_email": customer_email,
            "parent": {"subscription_details": {"subscription": subscription}},
            "lines": {
                "data": [
                    {
                        "pricing": {"price_details": {"price": price}},
                        "period": {"start": period_start, "end": period_end},
                    }
                ]
            },
        }

    def test_happy_path_grants_plan_and_sets_period(self):
        resp = _post_webhook("invoice.paid", self._invoice_payload())
        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan_slug, "standard")
        self.assertEqual(self.subscription.stripe_price_id, PRICE_STANDARD)
        self.assertFalse(self.subscription.cancel_at_period_end)
        self.assertEqual(self.subscription.actions_used, 0)
        self.assertEqual(
            int(self.subscription.current_period_start.timestamp()), PERIOD1_START
        )
        self.assertEqual(
            int(self.subscription.current_period_end.timestamp()), PERIOD1_END
        )

    def test_replay_preserves_actions_used_idempotency(self):
        # First event sets the period
        _post_webhook("invoice.paid", self._invoice_payload())
        # User consumes some quota between webhook deliveries
        self.subscription.refresh_from_db()
        self.subscription.actions_used = 7
        self.subscription.save(update_fields=["actions_used"])
        # Same event replays (Stripe retry) — period_start unchanged
        resp = _post_webhook("invoice.paid", self._invoice_payload())
        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.actions_used, 7)

    def test_new_period_resets_actions_used(self):
        # First period
        _post_webhook("invoice.paid", self._invoice_payload())
        self.subscription.refresh_from_db()
        self.subscription.actions_used = 5
        self.subscription.save(update_fields=["actions_used"])
        # Renewal: new period_start
        resp = _post_webhook(
            "invoice.paid",
            self._invoice_payload(
                period_start=PERIOD2_START, period_end=PERIOD2_END
            ),
        )
        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.actions_used, 0)
        self.assertEqual(
            int(self.subscription.current_period_start.timestamp()), PERIOD2_START
        )

    def test_unknown_price_id_preserves_plan_slug(self):
        # Pre-set to pro so we can detect if the handler downgrades it
        self.subscription.plan_slug = "pro"
        self.subscription.save(update_fields=["plan_slug"])
        resp = _post_webhook(
            "invoice.paid", self._invoice_payload(price="price_UNKNOWN")
        )
        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        # plan_slug stays pro (no silent downgrade)
        self.assertEqual(self.subscription.plan_slug, "pro")
        # but stripe_price_id IS updated (source of truth from Stripe)
        self.assertEqual(self.subscription.stripe_price_id, "price_UNKNOWN")

    def test_email_fallback_backfills_stripe_customer_id(self):
        """If invoice.paid arrives before checkout.session.completed, look up
        the user by customer_email and back-fill stripe_customer_id."""
        # Simulate out-of-order delivery: user has no stripe_customer_id yet
        self.user.stripe_customer_id = None
        self.user.save(update_fields=["stripe_customer_id", "updated_at"])

        resp = _post_webhook(
            "invoice.paid",
            self._invoice_payload(
                customer="cus_NEW",
                customer_email="invoice-test@example.com",
            ),
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.stripe_customer_id, "cus_NEW")


class WebhookSubscriptionUpdatedTests(_WebhookTestBase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(  # type: ignore
            email="sub-updated@example.com", password="x"
        )
        self.user.stripe_customer_id = "cus_UPD"
        self.user.save(update_fields=["stripe_customer_id", "updated_at"])
        self.subscription = self.user.subscription
        self.subscription.plan_slug = "standard"
        self.subscription.stripe_subscription_id = "sub_UPD"
        self.subscription.stripe_price_id = PRICE_STANDARD
        self.subscription.save()

    def _sub_payload(
        self,
        cancel_at_period_end=False,
        cancel_at=None,
        price=PRICE_STANDARD,
        sub_id="sub_UPD",
    ):
        return {
            "id": sub_id,
            "cancel_at_period_end": cancel_at_period_end,
            "cancel_at": cancel_at,
            "items": {
                "data": [
                    {
                        "price": {"id": price},
                        "current_period_start": PERIOD1_START,
                        "current_period_end": PERIOD1_END,
                    }
                ]
            },
        }

    def test_legacy_cancel_at_period_end_flag(self):
        resp = _post_webhook(
            "customer.subscription.updated",
            self._sub_payload(cancel_at_period_end=True),
        )
        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertTrue(self.subscription.cancel_at_period_end)

    def test_modern_cancel_via_cancel_at_timestamp(self):
        """Stripe API 2026-04-22+ signals scheduled cancellation via the
        cancel_at timestamp even when cancel_at_period_end is False.

        Regression test for the bug fixed at billing.py around line 225."""
        resp = _post_webhook(
            "customer.subscription.updated",
            self._sub_payload(cancel_at_period_end=False, cancel_at=PERIOD1_END),
        )
        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertTrue(self.subscription.cancel_at_period_end)

    def test_un_cancel_clears_local_flag(self):
        # Start with a scheduled cancel
        self.subscription.cancel_at_period_end = True
        self.subscription.save(update_fields=["cancel_at_period_end"])
        resp = _post_webhook(
            "customer.subscription.updated",
            self._sub_payload(cancel_at_period_end=False, cancel_at=None),
        )
        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertFalse(self.subscription.cancel_at_period_end)

    def test_plan_swap_standard_to_pro(self):
        resp = _post_webhook(
            "customer.subscription.updated", self._sub_payload(price=PRICE_PRO)
        )
        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan_slug, "pro")
        self.assertEqual(self.subscription.stripe_price_id, PRICE_PRO)

    def test_unknown_subscription_id_returns_200(self):
        resp = _post_webhook(
            "customer.subscription.updated",
            self._sub_payload(sub_id="sub_NEVER_EXISTED"),
        )
        # Returns 200 (not 4xx/5xx) so Stripe stops retrying
        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        # Our local row is untouched
        self.assertEqual(self.subscription.stripe_subscription_id, "sub_UPD")


class WebhookSubscriptionDeletedTests(_WebhookTestBase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(  # type: ignore
            email="sub-deleted@example.com", password="x"
        )
        self.user.stripe_customer_id = "cus_DEL"
        self.user.save(update_fields=["stripe_customer_id", "updated_at"])
        self.subscription = self.user.subscription
        self.subscription.plan_slug = "pro"
        self.subscription.stripe_subscription_id = "sub_DEL"
        self.subscription.stripe_price_id = PRICE_PRO
        self.subscription.cancel_at_period_end = True
        self.subscription.save()

    def test_terminal_cancellation_downgrades_to_free(self):
        resp = _post_webhook(
            "customer.subscription.deleted", {"id": "sub_DEL"}
        )
        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan_slug, "free")
        self.assertIsNone(self.subscription.stripe_subscription_id)
        self.assertIsNone(self.subscription.stripe_price_id)
        self.assertFalse(self.subscription.cancel_at_period_end)

    def test_preserves_user_stripe_customer_id(self):
        """user.stripe_customer_id is intentionally kept so re-subscription
        reuses the same Stripe customer."""
        _post_webhook("customer.subscription.deleted", {"id": "sub_DEL"})
        self.user.refresh_from_db()
        self.assertEqual(self.user.stripe_customer_id, "cus_DEL")

    def test_unknown_subscription_id_returns_200(self):
        resp = _post_webhook(
            "customer.subscription.deleted", {"id": "sub_NEVER_EXISTED"}
        )
        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        # Local row untouched
        self.assertEqual(self.subscription.plan_slug, "pro")


@patch.dict(
    os.environ,
    {
        "STRIPE_PRICE_STANDARD_USD": PRICE_STANDARD,
        "STRIPE_PRICE_PRO_USD": PRICE_PRO,
        "STRIPE_CHECKOUT_SUCCESS_URL": "http://localhost:8000/success",
        "STRIPE_CHECKOUT_CANCEL_URL": "http://localhost:8000/cancel",
        "STRIPE_PORTAL_RETURN_URL": "http://localhost:8000/return",
    },
)
@patch("api.views.billing.client")
class SessionActionTests(TestCase):
    def setUp(self):
        self.url = reverse("billing-checkout-session")
        self.user = User.objects.create_user(  # type: ignore
            email="session-action@example.com", password="x"
        )
        self.client_csrf = Client(enforce_csrf_checks=True)

    def _authed_post(self, body):
        authenticate_client_with_jwt(self.client_csrf, self.user)
        headers = get_csrf_headers(self.client_csrf)
        return self.client_csrf.post(
            self.url,
            data=json.dumps(body),
            content_type="application/json",
            secure=True,
            **headers,
        )

    @staticmethod
    def _fake_session_response(mock_client, url="https://stripe.test/SESSION"):
        fake = MagicMock()
        fake.url = url
        mock_client.v1.checkout.sessions.create.return_value = fake
        mock_client.v1.billing_portal.sessions.create.return_value = fake

    def test_unauthenticated_returns_401(self, mock_client):
        # No JWT cookie, no CSRF — DRF's IsAuthenticated rejects first
        resp = self.client_csrf.post(
            self.url, data="{}", content_type="application/json", secure=True
        )
        self.assertEqual(resp.status_code, 401)
        mock_client.v1.checkout.sessions.create.assert_not_called()
        mock_client.v1.billing_portal.sessions.create.assert_not_called()

    def test_missing_plan_slug_returns_400(self, mock_client):
        self._fake_session_response(mock_client)
        resp = self._authed_post({})
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json().get("error"), "invalid_plan_slug")
        mock_client.v1.checkout.sessions.create.assert_not_called()

    def test_free_plan_slug_rejected(self, mock_client):
        self._fake_session_response(mock_client)
        resp = self._authed_post({"plan_slug": "free"})
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json().get("error"), "invalid_plan_slug")

    def test_unknown_plan_slug_rejected(self, mock_client):
        self._fake_session_response(mock_client)
        resp = self._authed_post({"plan_slug": "enterprise"})
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json().get("error"), "invalid_plan_slug")

    def test_jpy_currency_normalizes_to_usd(self, mock_client):
        """Unsupported currency falls back to USD via normalize_currency,
        not a 4xx error."""
        self._fake_session_response(mock_client)
        resp = self._authed_post({"plan_slug": "standard", "currency": "JPY"})
        self.assertEqual(resp.status_code, 200)
        mock_client.v1.checkout.sessions.create.assert_called_once()

    def test_routes_to_checkout_for_new_subscriber(self, mock_client):
        self._fake_session_response(mock_client, url="https://stripe.test/CHECKOUT")
        resp = self._authed_post({"plan_slug": "standard", "currency": "USD"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["url"], "https://stripe.test/CHECKOUT")
        mock_client.v1.checkout.sessions.create.assert_called_once()
        mock_client.v1.billing_portal.sessions.create.assert_not_called()

    def test_routes_to_portal_for_existing_subscriber(self, mock_client):
        sub = self.user.subscription
        sub.plan_slug = "standard"
        sub.stripe_subscription_id = "sub_EXISTING"
        sub.save()
        self.user.stripe_customer_id = "cus_EXISTING"
        self.user.save(update_fields=["stripe_customer_id", "updated_at"])
        self._fake_session_response(mock_client, url="https://stripe.test/PORTAL")

        resp = self._authed_post({"plan_slug": "standard", "currency": "USD"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["url"], "https://stripe.test/PORTAL")
        mock_client.v1.billing_portal.sessions.create.assert_called_once()
        mock_client.v1.checkout.sessions.create.assert_not_called()

    def test_customer_not_linked_guard_returns_500(self, mock_client):
        """Edge case: subscription_id exists locally but stripe_customer_id
        is missing. Guarded by an explicit 500 in session_action's portal branch."""
        sub = self.user.subscription
        sub.plan_slug = "standard"
        sub.stripe_subscription_id = "sub_ORPHAN"
        sub.save()
        # stripe_customer_id deliberately NOT set on the user

        resp = self._authed_post({"plan_slug": "standard", "currency": "USD"})
        self.assertEqual(resp.status_code, 500)
        self.assertEqual(resp.json().get("error"), "customer_not_linked")
        mock_client.v1.billing_portal.sessions.create.assert_not_called()
