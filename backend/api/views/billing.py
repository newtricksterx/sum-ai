import json
import logging

import stripe
from django.db import IntegrityError, transaction
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt

from api.billing import checkout, payloads, stripe_client, subscription_sync
from api.models import ProcessedStripeEvent, Subscription, User
from api.plans import normalize_currency

logger = logging.getLogger(__name__)

STRIPE_LOCALE_MAP = {
    "english": "en",
    "french": "fr",
    "spanish": "es",
    "mandarin": "zh",
}


def _normalize_stripe_locale(language):
    if not language or not isinstance(language, str):
        return "auto"
    return STRIPE_LOCALE_MAP.get(language.strip().lower(), "auto")


def _handle_webhook_event(event):
    event_type = payloads.event_type(event)
    obj = payloads.path(event, "data", "object")

    if event_type == "checkout.session.completed":
        checkout.handle_checkout_session_completed(obj)
    elif event_type in {"invoice.paid", "invoice.payment_succeeded"}:
        subscription_sync.handle_paid_invoice(obj)
    elif event_type in stripe_client.PAYMENT_WARNING_EVENTS:
        subscription_sync.mark_payment_problem(obj, event_type)
    elif event_type == "customer.subscription.updated":
        subscription_sync.sync_subscription_update(obj)
    elif event_type == "customer.subscription.deleted":
        subscription_sync.sync_subscription_deleted(obj)
    else:
        logger.debug("Ignoring Stripe webhook event type=%s", event_type)


def _construct_event(payload, sig_header):
    # Reads stripe_client.webhook_secret at call time so test patches work.
    if not stripe_client.webhook_secret:
        logger.error("STRIPE_WEBHOOK_SECRET must be set for webhook signature verification")
        raise ValueError("missing webhook secret")

    return stripe_client.client.construct_event(
        payload, sig_header, stripe_client.webhook_secret
    )


@csrf_exempt
def webhook_view(request):
    payload = request.body
    sig_header = request.headers.get("stripe-signature")

    try:
        event = _construct_event(payload, sig_header)
    except (ValueError, json.JSONDecodeError) as exc:
        logger.warning("Invalid Stripe webhook payload: %s", exc)
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as exc:  # type: ignore[attr-defined]
        logger.warning("Stripe webhook signature verification failed: %s", exc)
        return HttpResponse(status=400)

    event_id = payloads.event_id(event)
    event_type = payloads.event_type(event)
    if not event_id:
        logger.warning("Stripe webhook missing event id type=%s", event_type)
        return HttpResponse(status=400)

    try:
        with transaction.atomic():
            processed_event, created = ProcessedStripeEvent.objects.get_or_create(
                stripe_event_id=event_id,
                defaults={"event_type": event_type},
            )
            if not created:
                logger.info("Ignoring duplicate Stripe event id=%s type=%s", event_id, event_type)
                return HttpResponse(status=200)

            _handle_webhook_event(event)
    except IntegrityError:
        if ProcessedStripeEvent.objects.filter(stripe_event_id=event_id).exists():
            logger.info("Ignoring concurrently processed Stripe event id=%s", event_id)
            return HttpResponse(status=200)
        raise
    except stripe.error.StripeError as exc:
        logger.exception(
            "Stripe API error while processing webhook event id=%s type=%s request_id=%s",
            event_id,
            event_type,
            stripe_client.stripe_request_id(exc),
        )
        return HttpResponse(status=500)

    return HttpResponse(status=200)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def session_action(request):
    user = request.user
    plan_slug = request.data.get("plan_slug")

    if plan_slug not in stripe_client.PAID_PLAN_RANK:
        return Response({"error": "invalid_plan_slug"}, status=400)

    currency = normalize_currency(request.data.get("currency"))
    locale = _normalize_stripe_locale(request.data.get("language"))
    price_id = checkout.price_for_plan_currency(plan_slug, currency)
    if price_id is None:
        return Response({"error": "price_not_configured"}, status=500)

    try:
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=user.pk)
            subscription, _ = Subscription.objects.select_for_update().get_or_create(
                user=user,
                defaults={"plan_slug": "free"},
            )

            if subscription.stripe_subscription_id:
                if not user.stripe_customer_id:
                    logger.error(
                        "session_action: subscription_id=%s present but stripe_customer_id missing for user=%s",
                        subscription.stripe_subscription_id,
                        user.pk,
                    )
                    return Response({"error": "customer_not_linked"}, status=500)

                try:
                    portal_session = stripe_client.client.v1.billing_portal.sessions.create(
                        params={
                            "customer": user.stripe_customer_id,
                            "return_url": str(stripe_client.env("STRIPE_PORTAL_RETURN_URL")),
                            "locale": locale,
                        }
                    )
                    return Response({"url": portal_session.url})
                except stripe.error.StripeError as exc:
                    if not stripe_client.is_missing_stripe_resource_error(exc):
                        raise

                    logger.warning(
                        "Portal creation saw stale Stripe state for user=%s customer=%s subscription=%s",
                        user.pk,
                        user.stripe_customer_id,
                        subscription.stripe_subscription_id,
                    )
                    checkout.clear_paid_subscription_state(user, subscription)

            return checkout.create_checkout_response(user, subscription, plan_slug, currency, price_id, locale)
    except stripe.error.StripeError as exc:
        logger.exception(
            "Stripe API error in session_action user=%s request_id=%s",
            request.user.pk,
            stripe_client.stripe_request_id(exc),
        )
        return Response(
            {"error": "stripe_unavailable"},
            status=status.HTTP_502_BAD_GATEWAY,
        )
