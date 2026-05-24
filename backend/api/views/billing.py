import json
import logging
from datetime import datetime, UTC
import stripe
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
import environ
from pathlib import Path
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import redirect

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from api.models import User, Subscription
from api.plans import normalize_currency

BASE_DIR = Path(__file__).resolve().parent.parent
logger = logging.getLogger(__name__)

# Initialize environment variables
env = environ.Env()

client = stripe.StripeClient(str(env('STRIPE_SEC_KEY')))
webhook_secret = str(env('STRIPE_WEBHOOK_SECRET'))
#stripe.api_key = env('STRIPE_SEC_KEY')

def get_plan_type(price_id):
   if price_id in {str(env('STRIPE_PRICE_STANDARD_USD')), str(env('STRIPE_PRICE_STANDARD_CAD')), str(env('STRIPE_PRICE_STANDARD_EUR'))}:
      return "standard"
   elif price_id in {str(env('STRIPE_PRICE_PRO_USD')), str(env('STRIPE_PRICE_PRO_CAD')), str(env('STRIPE_PRICE_PRO_EUR'))}:
      return "pro"
   return "free"


@csrf_exempt 
def webhook_view(request):
    payload = request.body
    event = None

    stripe.api_key = str(env('STRIPE_SEC_KEY'))

    # print(payload)


    try:
        event = stripe.Event.construct_from(
        json.loads(payload),
        stripe.api_key
        )  
    except ValueError as e:
        # Invalid payload
        return HttpResponse(status=400)

    if webhook_secret:
            # Only verify the event if you've defined an endpoint secret
            # Otherwise, use the basic event deserialized with JSON
            #print( request.headers.get('stripe-signature'))

            sig_header = request.headers.get('stripe-signature')
            try:
                event = client.construct_event(
                    payload, sig_header, webhook_secret
                )
            except stripe.error.SignatureVerificationError as e: # type: ignore
                print('⚠️  Webhook signature verification failed.' + str(e))
                return JsonResponse({"success": False})

  # Handle the event

    print(event.type)
   # print(event)
    
    
    if event.type == "checkout.session.completed":
        # Checkout finished. Link the Stripe customer + subscription to the local
        # user so future webhooks can find them via stripe_customer_id. Do NOT
        # grant paid access here — payment may not have cleared yet (SEPA/ACH).
        session = event.data.object
        customer_id = session["customer"]
        subscription_id = session["subscription"]
        customer_details = session["customer_details"] or {}
        email = customer_details["email"]

        if not customer_id or not email:
            logger.warning(
                "checkout.session.completed missing customer or email (session=%s)",
                session["id"],
            )
            return HttpResponse(status=200)

        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            logger.warning(
                "checkout.session.completed: no user for email=%s (customer=%s)",
                email, customer_id,
            )
            return HttpResponse(status=200)
        
        #print(user.stripe_customer_id)

        user.stripe_customer_id = customer_id

        #print(user.stripe_customer_id)
        user.save(update_fields=["stripe_customer_id", "updated_at"])

        if subscription_id:
            subscription, _ = Subscription.objects.get_or_create(
                user=user,
                defaults={"plan_slug": "free"},
            )
            subscription.stripe_subscription_id = subscription_id
            subscription.save(update_fields=["stripe_subscription_id", "updated_at"])

    elif event.type in {"invoice.paid", "invoice.payment_succeeded"}:
        # Payment confirmed. Grant the plan, sync period dates, reset usage.
        # Fires on the initial charge and every renewal.
        invoice = event.data.object
        customer_id = invoice["customer"]
        subscription_id = invoice["parent"]["subscription_details"]["subscription"]

        if not customer_id:
            logger.warning("invoice.paid missing customer (invoice=%s)", invoice["id"])
            return HttpResponse(status=200)

        user = User.objects.filter(stripe_customer_id=customer_id).first()
        if user is None:
            # Fall back to email lookup so this handler does not depend on
            # checkout.session.completed having run first (Stripe does not
            # guarantee webhook order).
            email = invoice["customer_email"]
            if email:
                user = User.objects.filter(email__iexact=email).first()
            if user is None:
                logger.warning(
                    "invoice.paid: no user for stripe_customer_id=%s or email=%s (invoice=%s)",
                    customer_id, email, invoice["id"],
                )
                return HttpResponse(status=200)
            # Back-fill the customer ID so future webhooks hit the fast path.
            user.stripe_customer_id = customer_id
            user.save(update_fields=["stripe_customer_id", "updated_at"])

        lines = invoice["lines"]["data"] or []
        price_id = None
        period_start_ts = None
        period_end_ts = None
        if lines:
            price_id = lines[0]["pricing"]["price_details"]["price"]
            period_start_ts = lines[0]["period"]["start"]
            period_end_ts = lines[0]["period"]["end"]

        mapped_slug = get_plan_type(price_id) if price_id else "free"

        subscription, _ = Subscription.objects.get_or_create(
            user=user,
            defaults={"plan_slug": "free"},
        )

        # get_plan_type returns "free" for unrecognized prices — treat that as
        # "unknown price, don't downgrade". A real free user wouldn't hit invoice.paid.
        if mapped_slug == "free":
            logger.warning(
                "invoice.paid: unrecognized price_id=%s for customer=%s; leaving plan_slug=%s unchanged",
                price_id, customer_id, subscription.plan_slug,
            )
        else:
            subscription.plan_slug = mapped_slug

        if price_id:
            subscription.stripe_price_id = price_id

        # Successful renewal/initial payment implies the subscription is not actively
        # canceling. customer.subscription.updated is the primary source of truth for
        # this flag; this is a defensive resync in case we missed an event.
        subscription.cancel_at_period_end = False

        if subscription_id:
            subscription.stripe_subscription_id = subscription_id

        new_period_start = (
            datetime.fromtimestamp(period_start_ts, tz=UTC)
            if period_start_ts else None
        )

        # Reset actions_used only when the period actually advances. Keeps the
        # handler idempotent under Stripe webhook retries within the same cycle.
        if new_period_start and subscription.current_period_start != new_period_start:
            subscription.actions_used = 0
            subscription.current_period_start = new_period_start

        if period_end_ts:
            subscription.current_period_end = datetime.fromtimestamp(
                period_end_ts, tz=UTC,
            )

        subscription.save()

    elif event.type == "invoice.payment_failed":
        # Payment failed. Usually log/mark as payment issue.
        # Do not immediately downgrade unless that is your product policy.
        print("invoice.payment_failed")
        pass

    elif event.type == "customer.subscription.updated":
        # Mirror cancel_at_period_end, the current price (handles plan swaps),
        # and period dates. invoice.paid remains the source of truth for
        # actions_used resets.
        stripe_sub = event.data.object
        subscription_id = stripe_sub["id"]

        subscription = Subscription.objects.filter(
            stripe_subscription_id=subscription_id
        ).first()
        if subscription is None:
            logger.warning(
                "customer.subscription.updated: no local subscription for stripe_subscription_id=%s",
                subscription_id,
            )
            return HttpResponse(status=200)

        # Stripe API 2026-04-22 signals "scheduled to cancel" via either the
        # legacy boolean OR cancel_at (timestamp). Read both and OR them.
        legacy_flag = bool(stripe_sub["cancel_at_period_end"])
        cancel_at_ts = stripe_sub["cancel_at"]  # None or Unix timestamp
        is_scheduled_to_cancel = legacy_flag or cancel_at_ts is not None

        logger.info(
            "customer.subscription.updated: sub=%s cancel_at_period_end=%s cancel_at=%s -> mirroring as %s",
            subscription_id, legacy_flag, cancel_at_ts, is_scheduled_to_cancel,
        )

        subscription.cancel_at_period_end = is_scheduled_to_cancel

        items_data = stripe_sub["items"]["data"] or []
        if items_data:
            item = items_data[0]
            new_price_id = item["price"]["id"]
            if new_price_id:
                subscription.stripe_price_id = new_price_id
                mapped_slug = get_plan_type(new_price_id)
                if mapped_slug != "free":
                    subscription.plan_slug = mapped_slug
                else:
                    logger.warning(
                        "customer.subscription.updated: unrecognized price_id=%s for subscription=%s; leaving plan_slug=%s",
                        new_price_id, subscription_id, subscription.plan_slug,
                    )

            # In API 2026-04-22 the period dates moved onto the subscription item.
            period_start_ts = item["current_period_start"]
            period_end_ts = item["current_period_end"]
            if period_start_ts:
                subscription.current_period_start = datetime.fromtimestamp(period_start_ts, tz=UTC)
            if period_end_ts:
                subscription.current_period_end = datetime.fromtimestamp(period_end_ts, tz=UTC)

        subscription.save()

    elif event.type == "customer.subscription.deleted":
        # Subscription terminally ended (dunning exhausted, cancellation period
        # reached, or manual deletion). Downgrade to free and clear subscription-
        # specific Stripe state. Keep user.stripe_customer_id so re-subscription
        # reuses the same Stripe customer.
        stripe_sub = event.data.object
        subscription_id = stripe_sub["id"]

        subscription = Subscription.objects.filter(
            stripe_subscription_id=subscription_id
        ).first()
        if subscription is None:
            logger.warning(
                "customer.subscription.deleted: no local subscription for stripe_subscription_id=%s",
                subscription_id,
            )
            return HttpResponse(status=200)

        subscription.plan_slug = "free"
        subscription.stripe_subscription_id = None
        subscription.stripe_price_id = None
        subscription.cancel_at_period_end = False
        subscription.save()

    else:
        # Ignore noisy Stripe events: charge.succeeded, payment_method.attached, etc.
        print("unknown webhook event fired: %s", event.type)

    return HttpResponse(status=200)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def session_action(request):
    # If the user already has a Stripe subscription, send them to the Billing
    # Portal so they can manage / cancel / swap. Otherwise create a Checkout
    # Session for the requested plan.
    user = request.user

    subscription, _ = Subscription.objects.get_or_create(
        user=user,
        defaults={"plan_slug": "free"},
    )

    subscription_id = subscription.stripe_subscription_id
    customer_id = user.stripe_customer_id

    if subscription_id:
        if not customer_id:
            logger.error(
                "session_action: subscription_id=%s present but stripe_customer_id missing for user=%s",
                subscription_id, user.pk,
            )
            return Response({"error": "customer_not_linked"}, status=500)

        # No `configuration` arg — Stripe uses the account's default portal
        # configuration (set once in Dashboard → Settings → Billing → Customer Portal).
        portal_session = client.v1.billing_portal.sessions.create(params={
            "customer": customer_id,
            "return_url": str(env("STRIPE_PORTAL_RETURN_URL")),
        })
        return Response({"url": portal_session.url})

    plan_slug = request.data.get("plan_slug")

    if plan_slug not in {"standard", "pro"}:
        return Response({"error": "invalid_plan_slug"}, status=400)

    currency = normalize_currency(request.data.get("currency"))

    price_env_key = f"STRIPE_PRICE_{plan_slug.upper()}_{currency}"
    price_id = str(env(price_env_key))
    if not price_id or price_id == "None":
        logger.error("create_checkout_session: missing env %s", price_env_key)
        return Response({"error": "price_not_configured"}, status=500)

    params = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": str(env("STRIPE_CHECKOUT_SUCCESS_URL")),
        "cancel_url": str(env("STRIPE_CHECKOUT_CANCEL_URL")),
        "metadata": {"plan_slug": plan_slug, "user_id": str(user.pk)},
        "client_reference_id": str(user.pk),
    }

    # Reuse the existing Stripe customer if we have one; otherwise pass the
    # email so the webhook can match the user on first checkout.
    if user.stripe_customer_id:
        params["customer"] = user.stripe_customer_id
    else:
        params["customer_email"] = user.email

    session = client.v1.checkout.sessions.create(params=params) # type: ignore
    return Response({"url": session.url})    

