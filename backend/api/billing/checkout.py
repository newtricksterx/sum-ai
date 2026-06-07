import logging
from datetime import timedelta

import stripe
from django.utils import timezone
from rest_framework.response import Response

from api.models import PendingCheckoutSession, Subscription, User

from . import payloads, stripe_client, subscription_sync

logger = logging.getLogger(__name__)


def price_for_plan_currency(plan_slug, currency):
    price_env_key = f"STRIPE_PRICE_{plan_slug.upper()}_{currency}"
    price_id = str(stripe_client.env(price_env_key))
    if not price_id or price_id == "None":
        logger.error("create_checkout_session: missing env %s", price_env_key)
        return None
    return price_id


def ensure_stripe_customer(user):
    if user.stripe_customer_id:
        try:
            customer = stripe_client.client.v1.customers.retrieve(user.stripe_customer_id)
            if not payloads.get(customer, "deleted"):
                return user.stripe_customer_id
        except stripe.error.StripeError as exc:
            if not stripe_client.is_missing_stripe_resource_error(exc):
                raise

        logger.warning(
            "Clearing stale stripe_customer_id=%s for user=%s",
            user.stripe_customer_id,
            user.pk,
        )
        user.stripe_customer_id = None
        user.save(update_fields=["stripe_customer_id", "updated_at"])

    customer = stripe_client.client.v1.customers.create(
        params={
            "email": user.email,
            "metadata": {"user_id": str(user.pk)},
        },
        # Stable key: one Stripe Customer per local user. If a previous call
        # succeeded but our DB write failed, this avoids creating a duplicate.
        options={"idempotency_key": f"sumai-customer-{user.pk}"},
    )
    user.stripe_customer_id = payloads.object_id(customer)
    user.save(update_fields=["stripe_customer_id", "updated_at"])
    return user.stripe_customer_id


def _checkout_params(user, customer_id, plan_slug, currency, price_id, locale="auto"):
    metadata = {
        "plan_slug": plan_slug,
        "user_id": str(user.pk),
        "currency": currency,
    }
    return {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": str(stripe_client.env("STRIPE_CHECKOUT_SUCCESS_URL")),
        "cancel_url": str(stripe_client.env("STRIPE_CHECKOUT_CANCEL_URL")),
        "metadata": metadata,
        "subscription_data": {"metadata": metadata},
        "client_reference_id": str(user.pk),
        "customer": customer_id,
        "locale": locale,
    }


def _checkout_expiry(session):
    expires_at = payloads.get(session, "expires_at")
    if expires_at:
        return payloads.timestamp_to_datetime(expires_at)
    return timezone.now() + timedelta(hours=24)


def _reuse_pending_checkout(user, plan_slug, currency):
    return PendingCheckoutSession.objects.filter(
        user=user,
        plan_slug=plan_slug,
        currency=currency,
        expires_at__gt=timezone.now(),
    ).first()


def clear_paid_subscription_state(user, subscription):
    user.stripe_customer_id = None
    user.save(update_fields=["stripe_customer_id", "updated_at"])
    subscription_sync.downgrade_to_free(subscription)
    subscription.save()


def create_checkout_response(user, subscription, plan_slug, currency, price_id, locale="auto"):
    pending = _reuse_pending_checkout(user, plan_slug, currency)
    if pending is not None:
        return Response({"url": pending.url})

    PendingCheckoutSession.objects.filter(
        user=user,
        plan_slug=plan_slug,
        currency=currency,
    ).delete()

    customer_id = ensure_stripe_customer(user)
    params = _checkout_params(user, customer_id, plan_slug, currency, price_id, locale)
    # Stable key per (user, plan, currency). _reuse_pending_checkout above
    # already short-circuits within a session's lifetime; this key prevents
    # network-retry duplicates within Stripe's 24h dedup window.
    idempotency_key = f"sumai-checkout-{user.pk}-{plan_slug}-{currency}"

    try:
        session = stripe_client.client.v1.checkout.sessions.create(
            params=params,
            options={"idempotency_key": idempotency_key},
        )
    except stripe.error.StripeError as exc:
        if not stripe_client.is_missing_stripe_resource_error(exc):
            raise

        logger.warning(
            "Checkout creation saw stale Stripe customer=%s for user=%s; recreating customer",
            customer_id,
            user.pk,
        )
        user.stripe_customer_id = None
        user.save(update_fields=["stripe_customer_id", "updated_at"])
        customer_id = ensure_stripe_customer(user)
        params = _checkout_params(user, customer_id, plan_slug, currency, price_id, locale)
        session = stripe_client.client.v1.checkout.sessions.create(
            params=params,
            options={"idempotency_key": f"{idempotency_key}-retry"},
        )

    PendingCheckoutSession.objects.update_or_create(
        user=user,
        plan_slug=plan_slug,
        currency=currency,
        defaults={
            "stripe_session_id": payloads.object_id(session),
            "url": session.url,
            "expires_at": _checkout_expiry(session),
        },
    )
    return Response({"url": session.url})


def handle_checkout_session_completed(session):
    customer_id = payloads.get(session, "customer")
    subscription_id = payloads.get(session, "subscription")
    session_id = payloads.object_id(session)

    if not customer_id:
        logger.warning(
            "checkout.session.completed missing customer (session=%s)",
            session_id,
        )
        return

    user = payloads.find_user_for_session(session)
    if user is None:
        logger.warning(
            "checkout.session.completed: no user for session=%s customer=%s",
            session_id,
            customer_id,
        )
        return

    # Defensive: another user shouldn't already own this stripe_customer_id,
    # but if data drift (admin paste, deleted-and-recreated user) has caused it,
    # surface a loud error and return 200. Raising would crash the webhook into
    # a 3-day Stripe retry loop without ops visibility.
    if user.stripe_customer_id != customer_id:
        collision = (
            User.objects.filter(stripe_customer_id=customer_id)
            .exclude(pk=user.pk)
            .first()
        )
        if collision is not None:
            logger.error(
                "checkout.session.completed: stripe_customer_id=%s already owned by user=%s; "
                "refusing to assign to user=%s (session=%s)",
                customer_id,
                collision.pk,
                user.pk,
                session_id,
            )
            return

    user.stripe_customer_id = customer_id
    user.save(update_fields=["stripe_customer_id", "updated_at"])

    subscription = Subscription.ensure_for_user(user, select_for_update_=True)
    if subscription_id:
        subscription.stripe_subscription_id = subscription_id
        subscription.save(update_fields=["stripe_subscription_id", "updated_at"])

    if session_id:
        PendingCheckoutSession.objects.filter(stripe_session_id=session_id).delete()
