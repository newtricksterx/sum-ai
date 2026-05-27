import itertools
import json
import os
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import stripe
from django.contrib.auth import get_user_model
from django.test import Client, RequestFactory, TestCase
from django.urls import reverse
from django.utils import timezone

from api.billing import stripe_client
from api.models import PendingCheckoutSession, ProcessedStripeEvent
from api.tests.helpers import authenticate_client_with_jwt, get_csrf_headers
from api.views import billing


User = get_user_model()

PRICE_STANDARD = "price_TEST_STANDARD"
PRICE_PRO = "price_TEST_PRO"

PERIOD1_START = 1700000000
PERIOD1_END = PERIOD1_START + 31 * 86400
PERIOD2_START = PERIOD1_END
PERIOD2_END = PERIOD2_START + 31 * 86400

_event_counter = itertools.count(1)


class AttrDict(dict):
    def __getattr__(self, key):
        try:
            return self[key]
        except KeyError as exc:
            raise AttributeError(key) from exc


def fake_get_plan_type(price_id):
    if price_id == PRICE_STANDARD:
        return "standard"
    if price_id == PRICE_PRO:
        return "pro"
    return "free"


def _post_webhook(event_type, data_object, event_id=None):
    event_id = event_id or f"evt_{next(_event_counter)}"
    payload = json.dumps(
        {"id": event_id, "type": event_type, "data": {"object": data_object}}
    ).encode("utf-8")
    request = RequestFactory().post(
        "/api/billing/webhook", data=payload, content_type="application/json"
    )
    return billing.webhook_view(request)


def _stripe_subscription_payload(
    sub_id="sub_INV_1",
    price=PRICE_STANDARD,
    period_start=PERIOD1_START,
    period_end=PERIOD1_END,
    status="active",
    cancel_at_period_end=False,
    cancel_at=None,
    pending_update=None,
):
    return {
        "id": sub_id,
        "status": status,
        "cancel_at_period_end": cancel_at_period_end,
        "cancel_at": cancel_at,
        "pending_update": pending_update,
        "items": {
            "data": [
                {
                    "price": {"id": price},
                    "current_period_start": period_start,
                    "current_period_end": period_end,
                }
            ]
        },
    }


def _stripe_missing_error(message="No such customer"):
    return stripe.error.InvalidRequestError(
        message,
        param="customer",
        code="resource_missing",
    )


class _WebhookTestBase(TestCase):
    def setUp(self):
        # Bypass signature verification for tests by stubbing _construct_event
        # to parse the raw JSON payload directly. Production requires a real
        # webhook_secret (see billing._construct_event).
        def _unsigned_construct_event(payload, _sig_header):
            return AttrDict(json.loads(payload))

        self._secret_patcher = patch.object(stripe_client, "webhook_secret", "whsec_TEST")
        self._secret_patcher.start()
        self._construct_patcher = patch.object(
            billing, "_construct_event", side_effect=_unsigned_construct_event
        )
        self._construct_patcher.start()
        self._gpt_patcher = patch.object(
            stripe_client, "get_plan_type", side_effect=fake_get_plan_type
        )
        self._gpt_patcher.start()
        self._client_patcher = patch.object(stripe_client, "client")
        self.mock_client = self._client_patcher.start()

    def tearDown(self):
        self._client_patcher.stop()
        self._gpt_patcher.stop()
        self._construct_patcher.stop()
        self._secret_patcher.stop()


class WebhookCheckoutSessionCompletedTests(_WebhookTestBase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email="checkout-test@example.com", password="x"
        )

    def test_happy_path_links_customer_and_subscription_without_granting_plan(self):
        resp = _post_webhook(
            "checkout.session.completed",
            {
                "id": "cs_TEST_1",
                "customer": "cus_TEST_1",
                "subscription": "sub_TEST_1",
                "client_reference_id": str(self.user.pk),
            },
        )

        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.stripe_customer_id, "cus_TEST_1")
        self.assertEqual(self.user.subscription.stripe_subscription_id, "sub_TEST_1")
        self.assertEqual(self.user.subscription.plan_slug, "free")

    def test_customer_email_alone_does_not_bind_account(self):
        """Regression for the email-spoofing exploit: a checkout.session.completed
        carrying only customer_email (no client_reference_id, no metadata.user_id,
        no pre-linked customer_id) must NOT bind the attacker's Stripe customer
        to the victim's account."""
        resp = _post_webhook(
            "checkout.session.completed",
            {
                "id": "cs_SPOOF_1",
                "customer": "cus_ATTACKER",
                "subscription": "sub_ATTACKER",
                "customer_details": {"email": "checkout-test@example.com"},
                "customer_email": "checkout-test@example.com",
            },
        )

        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.stripe_customer_id)
        self.assertFalse(
            User.objects.filter(stripe_customer_id="cus_ATTACKER").exists()
        )

    def test_metadata_user_id_takes_precedence_over_email(self):
        resp = _post_webhook(
            "checkout.session.completed",
            {
                "id": "cs_TEST_2",
                "customer": "cus_TEST_2",
                "subscription": "sub_TEST_2",
                "client_reference_id": str(self.user.pk),
                "metadata": {"user_id": str(self.user.pk)},
                "customer_details": {"email": "wrong@example.invalid"},
            },
        )

        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.stripe_customer_id, "cus_TEST_2")
        self.assertEqual(self.user.subscription.stripe_subscription_id, "sub_TEST_2")

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
        self.assertFalse(User.objects.filter(stripe_customer_id="cus_ORPHAN").exists())

    def test_checkout_completion_deletes_pending_session(self):
        PendingCheckoutSession.objects.create(
            user=self.user,
            plan_slug="standard",
            currency="USD",
            stripe_session_id="cs_PENDING",
            url="https://stripe.test/PENDING",
            expires_at=timezone.now() + timedelta(hours=1),
        )

        _post_webhook(
            "checkout.session.completed",
            {
                "id": "cs_PENDING",
                "customer": "cus_TEST_4",
                "subscription": "sub_TEST_4",
                "client_reference_id": str(self.user.pk),
            },
        )

        self.assertFalse(
            PendingCheckoutSession.objects.filter(stripe_session_id="cs_PENDING").exists()
        )

    def test_refuses_assignment_when_customer_id_already_owned_by_another_user(self):
        """Regression for M6: if another local user already has this
        stripe_customer_id (admin paste, data drift), refuse the assignment
        loudly. Returning 200 prevents Stripe from looping retries; the error
        log is the operator signal."""
        existing_owner = User.objects.create_user(
            email="existing-owner@example.com", password="x"
        )
        existing_owner.stripe_customer_id = "cus_COLLIDE"
        existing_owner.save(update_fields=["stripe_customer_id", "updated_at"])

        resp = _post_webhook(
            "checkout.session.completed",
            {
                "id": "cs_COLLIDE",
                "customer": "cus_COLLIDE",
                "subscription": "sub_COLLIDE",
                "client_reference_id": str(self.user.pk),
                "customer_details": {"email": self.user.email},
            },
        )

        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        # Target user did NOT get the colliding customer_id.
        self.assertIsNone(self.user.stripe_customer_id)
        # Original owner still has it.
        existing_owner.refresh_from_db()
        self.assertEqual(existing_owner.stripe_customer_id, "cus_COLLIDE")


class WebhookInvoicePaidTests(_WebhookTestBase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email="invoice-test@example.com", password="x"
        )
        self.user.stripe_customer_id = "cus_INV_1"
        self.user.save(update_fields=["stripe_customer_id", "updated_at"])
        self.subscription = self.user.subscription
        self.subscription.stripe_subscription_id = "sub_INV_1"
        self.subscription.save(update_fields=["stripe_subscription_id", "updated_at"])
        self.mock_client.v1.subscriptions.retrieve.return_value = _stripe_subscription_payload()

    def _invoice_payload(
        self,
        customer="cus_INV_1",
        customer_email="invoice-test@example.com",
        subscription="sub_INV_1",
    ):
        return {
            "id": "in_TEST",
            "customer": customer,
            "customer_email": customer_email,
            "parent": {
                "subscription_details": {
                    "subscription": subscription,
                    "metadata": {"user_id": str(self.user.pk)},
                }
            },
            "lines": {
                "data": [
                    {
                        "pricing": {"price_details": {"price": "price_PRORATION"}},
                        "period": {"start": PERIOD1_START - 100, "end": PERIOD1_END},
                    },
                    {
                        "pricing": {"price_details": {"price": PRICE_STANDARD}},
                        "period": {"start": PERIOD1_START, "end": PERIOD1_END},
                    },
                ]
            },
        }

    def test_happy_path_grants_plan_and_sets_period_from_subscription(self):
        resp = _post_webhook("invoice.paid", self._invoice_payload())

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan_slug, "standard")
        self.assertEqual(self.subscription.stripe_price_id, PRICE_STANDARD)
        self.assertFalse(self.subscription.cancel_at_period_end)
        self.assertIsNone(self.subscription.payment_problem_reason)
        self.assertEqual(self.subscription.actions_used, 0)
        self.assertEqual(
            int(self.subscription.current_period_start.timestamp()), PERIOD1_START
        )
        self.assertEqual(
            int(self.subscription.current_period_end.timestamp()), PERIOD1_END
        )

    def test_requires_active_subscription_to_grant_plan(self):
        self.mock_client.v1.subscriptions.retrieve.return_value = _stripe_subscription_payload(
            status="past_due"
        )

        resp = _post_webhook("invoice.paid", self._invoice_payload())

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan_slug, "free")

    def test_replay_preserves_actions_used_idempotency_for_same_period(self):
        _post_webhook("invoice.paid", self._invoice_payload())
        self.subscription.refresh_from_db()
        self.subscription.actions_used = 7
        self.subscription.save(update_fields=["actions_used"])

        resp = _post_webhook("invoice.paid", self._invoice_payload())

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.actions_used, 7)

    def test_duplicate_event_id_is_processed_once(self):
        event_id = "evt_DUPLICATE_INVOICE"
        _post_webhook("invoice.paid", self._invoice_payload(), event_id=event_id)
        self.mock_client.v1.subscriptions.retrieve.return_value = _stripe_subscription_payload(
            price=PRICE_PRO
        )

        resp = _post_webhook("invoice.paid", self._invoice_payload(), event_id=event_id)

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan_slug, "standard")
        self.assertEqual(
            ProcessedStripeEvent.objects.filter(stripe_event_id=event_id).count(), 1
        )

    def test_new_period_resets_actions_used(self):
        _post_webhook("invoice.paid", self._invoice_payload())
        self.subscription.refresh_from_db()
        self.subscription.actions_used = 5
        self.subscription.save(update_fields=["actions_used"])
        self.mock_client.v1.subscriptions.retrieve.return_value = _stripe_subscription_payload(
            period_start=PERIOD2_START,
            period_end=PERIOD2_END,
        )

        resp = _post_webhook("invoice.paid", self._invoice_payload())

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.actions_used, 0)
        self.assertEqual(
            int(self.subscription.current_period_start.timestamp()), PERIOD2_START
        )

    def test_older_invoice_cannot_roll_period_backward_or_reset_usage(self):
        self.mock_client.v1.subscriptions.retrieve.return_value = _stripe_subscription_payload(
            period_start=PERIOD2_START,
            period_end=PERIOD2_END,
        )
        _post_webhook("invoice.paid", self._invoice_payload())
        self.subscription.refresh_from_db()
        self.subscription.actions_used = 9
        self.subscription.save(update_fields=["actions_used"])
        self.mock_client.v1.subscriptions.retrieve.return_value = _stripe_subscription_payload(
            period_start=PERIOD1_START,
            period_end=PERIOD1_END,
        )

        resp = _post_webhook("invoice.paid", self._invoice_payload())

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.actions_used, 9)
        self.assertEqual(
            int(self.subscription.current_period_start.timestamp()), PERIOD2_START
        )

    def test_unknown_price_id_preserves_plan_slug(self):
        self.subscription.plan_slug = "pro"
        self.subscription.save(update_fields=["plan_slug"])
        self.mock_client.v1.subscriptions.retrieve.return_value = _stripe_subscription_payload(
            price="price_UNKNOWN"
        )

        resp = _post_webhook("invoice.paid", self._invoice_payload())

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan_slug, "pro")
        self.assertEqual(self.subscription.stripe_price_id, "price_UNKNOWN")

    def test_metadata_user_id_backfills_stripe_customer_id(self):
        """When the invoice has metadata.user_id (set during checkout) but the
        local user has no stripe_customer_id yet (e.g., partial state from a
        previous flow), the handler should backfill from invoice.customer."""
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

    def test_customer_email_alone_does_not_resolve_user(self):
        """Regression for the email-spoofing exploit on invoice.paid: when
        metadata.user_id is absent and no user owns invoice.customer, the
        handler must NOT find a user via customer_email."""
        self.user.stripe_customer_id = None
        self.user.save(update_fields=["stripe_customer_id", "updated_at"])

        payload = self._invoice_payload(
            customer="cus_ATTACKER",
            customer_email="invoice-test@example.com",
        )
        # Strip metadata to simulate an invoice that wasn't generated by our
        # checkout flow.
        payload["parent"] = {"subscription_details": {"subscription": "sub_ATTACKER"}}

        resp = _post_webhook("invoice.paid", payload)

        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.stripe_customer_id)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan_slug, "free")

    def test_invoice_without_subscription_is_ignored(self):
        payload = self._invoice_payload()
        payload["parent"] = {"subscription_details": {"subscription": None}}

        resp = _post_webhook("invoice.paid", payload)

        self.assertEqual(resp.status_code, 200)
        self.mock_client.v1.subscriptions.retrieve.assert_not_called()

    def test_invoice_for_old_subscription_does_not_clobber_newer_local_state(self):
        """Regression for M3: a redelivered invoice.paid for an old (upgraded-
        away) subscription must not silently downgrade the user. Local state is
        on sub_NEW with period ending later; event is for sub_OLD with period
        ending earlier. The cross-subscription staleness guard refuses."""
        # Local: on Pro with sub_NEW, period ending at PERIOD2_END (newer)
        self.subscription.plan_slug = "pro"
        self.subscription.stripe_subscription_id = "sub_NEW"
        self.subscription.stripe_price_id = PRICE_PRO
        self.subscription.current_period_end = datetime.fromtimestamp(
            PERIOD2_END, tz=UTC
        )
        self.subscription.save()

        # Event: invoice.paid for sub_OLD on Standard with older period_end
        self.mock_client.v1.subscriptions.retrieve.return_value = (
            _stripe_subscription_payload(
                sub_id="sub_OLD",
                price=PRICE_STANDARD,
                period_start=PERIOD1_START,
                period_end=PERIOD1_END,
            )
        )
        resp = _post_webhook(
            "invoice.paid", self._invoice_payload(subscription="sub_OLD")
        )

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        # No silent downgrade — local Pro state is preserved.
        self.assertEqual(self.subscription.plan_slug, "pro")
        self.assertEqual(self.subscription.stripe_subscription_id, "sub_NEW")
        self.assertEqual(self.subscription.stripe_price_id, PRICE_PRO)

    def test_invoice_for_new_subscription_with_later_period_end_is_accepted(self):
        """Counterpart to the M3 guard: a legitimate upgrade (new sub with
        period_end NEWER than local) must NOT be refused. Local was on Standard
        with sub_OLD; event is invoice.paid for sub_NEW on Pro with later
        period_end. The user genuinely upgraded — accept the new state."""
        # Local: Standard, sub_OLD, period ending at PERIOD1_END
        self.subscription.plan_slug = "standard"
        self.subscription.stripe_subscription_id = "sub_OLD"
        self.subscription.stripe_price_id = PRICE_STANDARD
        self.subscription.current_period_end = datetime.fromtimestamp(
            PERIOD1_END, tz=UTC
        )
        self.subscription.save()

        # Event: invoice.paid for sub_NEW on Pro with later period_end
        self.mock_client.v1.subscriptions.retrieve.return_value = (
            _stripe_subscription_payload(
                sub_id="sub_NEW",
                price=PRICE_PRO,
                period_start=PERIOD2_START,
                period_end=PERIOD2_END,
            )
        )
        resp = _post_webhook(
            "invoice.paid", self._invoice_payload(subscription="sub_NEW")
        )

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        # Legitimate upgrade — local state advanced.
        self.assertEqual(self.subscription.plan_slug, "pro")
        self.assertEqual(self.subscription.stripe_subscription_id, "sub_NEW")
        self.assertEqual(self.subscription.stripe_price_id, PRICE_PRO)


class WebhookPaymentProblemTests(_WebhookTestBase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            email="payment-problem@example.com", password="x"
        )
        self.user.stripe_customer_id = "cus_PROBLEM"
        self.user.save(update_fields=["stripe_customer_id", "updated_at"])
        self.subscription = self.user.subscription
        self.subscription.plan_slug = "pro"
        self.subscription.stripe_subscription_id = "sub_PROBLEM"
        self.subscription.save()

    def _invoice_payload(self):
        return {
            "id": "in_PROBLEM",
            "customer": "cus_PROBLEM",
            "parent": {"subscription_details": {"subscription": "sub_PROBLEM"}},
        }

    def test_payment_failed_marks_warning_without_downgrading(self):
        resp = _post_webhook("invoice.payment_failed", self._invoice_payload())

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan_slug, "pro")
        self.assertEqual(
            self.subscription.payment_problem_reason, "invoice.payment_failed"
        )
        self.assertIsNotNone(self.subscription.payment_problem_at)

    def test_paid_invoice_clears_payment_warning(self):
        self.subscription.payment_problem_reason = "invoice.payment_failed"
        self.subscription.payment_problem_at = timezone.now()
        # Backdate current_period_start so the same-sub stale-period guard
        # (period_end <= current_period_start) does NOT fire and the handler
        # reaches the _clear_payment_problem path.
        self.subscription.current_period_start = datetime.fromtimestamp(
            PERIOD1_START - 86400, tz=UTC
        )
        self.subscription.save()
        self.mock_client.v1.subscriptions.retrieve.return_value = _stripe_subscription_payload(
            sub_id="sub_PROBLEM",
            price=PRICE_PRO,
        )

        resp = _post_webhook("invoice.paid", self._invoice_payload())

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan_slug, "pro")
        self.assertIsNone(self.subscription.payment_problem_reason)
        self.assertIsNone(self.subscription.payment_problem_at)


class WebhookSubscriptionUpdatedTests(_WebhookTestBase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(email="sub-updated@example.com", password="x")
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
        status="active",
        pending_update=None,
    ):
        return _stripe_subscription_payload(
            sub_id=sub_id,
            price=price,
            cancel_at_period_end=cancel_at_period_end,
            cancel_at=cancel_at,
            status=status,
            pending_update=pending_update,
        )

    def test_legacy_cancel_at_period_end_flag(self):
        resp = _post_webhook(
            "customer.subscription.updated",
            self._sub_payload(cancel_at_period_end=True),
        )

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertTrue(self.subscription.cancel_at_period_end)

    def test_modern_cancel_via_cancel_at_timestamp(self):
        resp = _post_webhook(
            "customer.subscription.updated",
            self._sub_payload(cancel_at_period_end=False, cancel_at=PERIOD1_END),
        )

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertTrue(self.subscription.cancel_at_period_end)

    def test_un_cancel_clears_local_flag(self):
        self.subscription.cancel_at_period_end = True
        self.subscription.save(update_fields=["cancel_at_period_end"])

        resp = _post_webhook(
            "customer.subscription.updated",
            self._sub_payload(cancel_at_period_end=False, cancel_at=None),
        )

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertFalse(self.subscription.cancel_at_period_end)

    def test_upgrade_does_not_grant_access_from_subscription_update(self):
        resp = _post_webhook(
            "customer.subscription.updated", self._sub_payload(price=PRICE_PRO)
        )

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan_slug, "standard")
        self.assertEqual(self.subscription.stripe_price_id, PRICE_STANDARD)

    def test_immediate_downgrade_can_apply_from_subscription_update(self):
        self.subscription.plan_slug = "pro"
        self.subscription.stripe_price_id = PRICE_PRO
        self.subscription.save()

        resp = _post_webhook(
            "customer.subscription.updated", self._sub_payload(price=PRICE_STANDARD)
        )

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan_slug, "standard")
        self.assertEqual(self.subscription.stripe_price_id, PRICE_STANDARD)

    def test_pending_downgrade_does_not_apply_until_effective(self):
        self.subscription.plan_slug = "pro"
        self.subscription.stripe_price_id = PRICE_PRO
        self.subscription.save()

        resp = _post_webhook(
            "customer.subscription.updated",
            self._sub_payload(price=PRICE_STANDARD, pending_update={"id": "pu_TEST"}),
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

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.stripe_subscription_id, "sub_UPD")

    def test_unknown_price_mirrors_stripe_price_id_without_changing_plan(self):
        """Diagnostic mirror: an unrecognized price_id should be saved to
        stripe_price_id so admins can see the drift, but plan_slug must stay
        unchanged. Matches _sync_paid_subscription's policy for unknown prices."""
        resp = _post_webhook(
            "customer.subscription.updated",
            self._sub_payload(price="price_NEW_CURRENCY_NOT_IN_ENV"),
        )

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan_slug, "standard")
        self.assertEqual(
            self.subscription.stripe_price_id, "price_NEW_CURRENCY_NOT_IN_ENV"
        )


class WebhookSubscriptionDeletedTests(_WebhookTestBase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(email="sub-deleted@example.com", password="x")
        self.user.stripe_customer_id = "cus_DEL"
        self.user.save(update_fields=["stripe_customer_id", "updated_at"])
        self.subscription = self.user.subscription
        self.subscription.plan_slug = "pro"
        self.subscription.stripe_subscription_id = "sub_DEL"
        self.subscription.stripe_price_id = PRICE_PRO
        self.subscription.cancel_at_period_end = True
        self.subscription.payment_problem_reason = "invoice.payment_failed"
        self.subscription.payment_problem_at = timezone.now()
        self.subscription.save()

    def test_terminal_cancellation_downgrades_to_free(self):
        resp = _post_webhook("customer.subscription.deleted", {"id": "sub_DEL"})

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan_slug, "free")
        self.assertIsNone(self.subscription.stripe_subscription_id)
        self.assertIsNone(self.subscription.stripe_price_id)
        self.assertFalse(self.subscription.cancel_at_period_end)
        self.assertIsNone(self.subscription.payment_problem_reason)
        self.assertEqual(self.subscription.actions_used, 0)

    def test_preserves_user_stripe_customer_id(self):
        _post_webhook("customer.subscription.deleted", {"id": "sub_DEL"})
        self.user.refresh_from_db()
        self.assertEqual(self.user.stripe_customer_id, "cus_DEL")

    def test_unknown_subscription_id_returns_200(self):
        resp = _post_webhook(
            "customer.subscription.deleted", {"id": "sub_NEVER_EXISTED"}
        )

        self.assertEqual(resp.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan_slug, "pro")


class WebhookSignatureTests(TestCase):
    def test_bad_signature_returns_400(self):
        request = RequestFactory().post(
            "/api/billing/webhook",
            data=b'{"id":"evt_bad","type":"invoice.paid","data":{"object":{}}}',
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="bad",
        )

        with patch.object(stripe_client, "webhook_secret", "whsec_TEST"), patch.object(
            stripe_client.client,
            "construct_event",
            side_effect=stripe.error.SignatureVerificationError(
                "bad signature",
                "bad",
            ),
        ):
            resp = billing.webhook_view(request)

        self.assertEqual(resp.status_code, 400)


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
@patch("api.billing.stripe_client.client")
class SessionActionTests(TestCase):
    def setUp(self):
        self.url = reverse("billing-checkout-session")
        self.user = User.objects.create_user(
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
        fake_session = AttrDict(
            id="cs_FAKE",
            url=url,
            expires_at=int((timezone.now() + timedelta(hours=24)).timestamp()),
        )
        fake_customer = AttrDict(id="cus_CREATED", deleted=False)
        mock_client.v1.checkout.sessions.create.return_value = fake_session
        mock_client.v1.billing_portal.sessions.create.return_value = fake_session
        mock_client.v1.customers.create.return_value = fake_customer
        mock_client.v1.customers.retrieve.return_value = fake_customer

    def test_unauthenticated_returns_401(self, mock_client):
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
        self._fake_session_response(mock_client)

        resp = self._authed_post({"plan_slug": "standard", "currency": "JPY"})

        self.assertEqual(resp.status_code, 200)
        mock_client.v1.checkout.sessions.create.assert_called_once()

    def test_routes_to_checkout_for_new_subscriber(self, mock_client):
        self._fake_session_response(mock_client, url="https://stripe.test/CHECKOUT")

        resp = self._authed_post({"plan_slug": "standard", "currency": "USD"})

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["url"], "https://stripe.test/CHECKOUT")
        self.user.refresh_from_db()
        self.assertEqual(self.user.stripe_customer_id, "cus_CREATED")
        mock_client.v1.customers.create.assert_called_once()
        mock_client.v1.checkout.sessions.create.assert_called_once()
        checkout_kwargs = mock_client.v1.checkout.sessions.create.call_args.kwargs
        self.assertEqual(checkout_kwargs["params"]["customer"], "cus_CREATED")
        self.assertIn("subscription_data", checkout_kwargs["params"])
        mock_client.v1.billing_portal.sessions.create.assert_not_called()

    def test_reuses_pending_checkout_session(self, mock_client):
        self._fake_session_response(mock_client, url="https://stripe.test/NEW")
        PendingCheckoutSession.objects.create(
            user=self.user,
            plan_slug="standard",
            currency="USD",
            stripe_session_id="cs_PENDING",
            url="https://stripe.test/PENDING",
            expires_at=timezone.now() + timedelta(hours=1),
        )

        resp = self._authed_post({"plan_slug": "standard", "currency": "USD"})

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["url"], "https://stripe.test/PENDING")
        mock_client.v1.customers.create.assert_not_called()
        mock_client.v1.checkout.sessions.create.assert_not_called()

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
        sub = self.user.subscription
        sub.plan_slug = "standard"
        sub.stripe_subscription_id = "sub_ORPHAN"
        sub.save()
        self._fake_session_response(mock_client)

        resp = self._authed_post({"plan_slug": "standard", "currency": "USD"})

        self.assertEqual(resp.status_code, 500)
        self.assertEqual(resp.json().get("error"), "customer_not_linked")
        mock_client.v1.billing_portal.sessions.create.assert_not_called()

    def test_stale_customer_heals_to_new_checkout(self, mock_client):
        self.user.stripe_customer_id = "cus_STALE"
        self.user.save(update_fields=["stripe_customer_id", "updated_at"])
        self._fake_session_response(mock_client, url="https://stripe.test/CHECKOUT")
        mock_client.v1.customers.retrieve.side_effect = _stripe_missing_error()

        resp = self._authed_post({"plan_slug": "standard", "currency": "USD"})

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["url"], "https://stripe.test/CHECKOUT")
        self.user.refresh_from_db()
        self.assertEqual(self.user.stripe_customer_id, "cus_CREATED")
        mock_client.v1.customers.create.assert_called_once()

    def test_stale_portal_customer_heals_to_checkout(self, mock_client):
        sub = self.user.subscription
        sub.plan_slug = "pro"
        sub.stripe_subscription_id = "sub_STALE"
        sub.save()
        self.user.stripe_customer_id = "cus_STALE"
        self.user.save(update_fields=["stripe_customer_id", "updated_at"])
        self._fake_session_response(mock_client, url="https://stripe.test/CHECKOUT")
        mock_client.v1.billing_portal.sessions.create.side_effect = _stripe_missing_error()

        resp = self._authed_post({"plan_slug": "standard", "currency": "USD"})

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["url"], "https://stripe.test/CHECKOUT")
        sub.refresh_from_db()
        self.assertEqual(sub.plan_slug, "free")
        self.assertIsNone(sub.stripe_subscription_id)
        mock_client.v1.checkout.sessions.create.assert_called_once()

    def test_customer_creation_uses_stable_idempotency_key(self, mock_client):
        """Repeated customer creation for the same user must send the same
        idempotency_key so Stripe dedupes retries to a single customer."""
        self._fake_session_response(mock_client, url="https://stripe.test/CHECKOUT")

        self._authed_post({"plan_slug": "standard", "currency": "USD"})
        # Force a second customer.create by clearing the link + the pending row.
        self.user.refresh_from_db()
        self.user.stripe_customer_id = None
        self.user.save(update_fields=["stripe_customer_id", "updated_at"])
        PendingCheckoutSession.objects.filter(user=self.user).delete()
        self._authed_post({"plan_slug": "standard", "currency": "USD"})

        calls = mock_client.v1.customers.create.call_args_list
        self.assertEqual(len(calls), 2)
        self.assertEqual(
            calls[0].kwargs["options"]["idempotency_key"],
            calls[1].kwargs["options"]["idempotency_key"],
        )
        self.assertEqual(
            calls[0].kwargs["options"]["idempotency_key"],
            f"sumai-customer-{self.user.pk}",
        )

    def test_checkout_session_uses_stable_idempotency_key(self, mock_client):
        """Repeated checkout creation for the same (user, plan, currency) must
        send the same idempotency_key."""
        self._fake_session_response(mock_client, url="https://stripe.test/CHECKOUT")

        self._authed_post({"plan_slug": "standard", "currency": "USD"})
        # Bypass _reuse_pending_checkout so we actually invoke Stripe again.
        PendingCheckoutSession.objects.filter(user=self.user).delete()
        self._authed_post({"plan_slug": "standard", "currency": "USD"})

        calls = mock_client.v1.checkout.sessions.create.call_args_list
        self.assertEqual(len(calls), 2)
        self.assertEqual(
            calls[0].kwargs["options"]["idempotency_key"],
            calls[1].kwargs["options"]["idempotency_key"],
        )
        self.assertEqual(
            calls[0].kwargs["options"]["idempotency_key"],
            f"sumai-checkout-{self.user.pk}-standard-USD",
        )
