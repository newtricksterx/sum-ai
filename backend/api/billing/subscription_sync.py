import logging

import stripe
from django.utils import timezone

from api.models import Subscription, User

from . import payloads, stripe_client

logger = logging.getLogger(__name__)


def clear_payment_problem(subscription):
    subscription.payment_problem_reason = None
    subscription.payment_problem_at = None


def set_payment_problem(subscription, reason):
    subscription.payment_problem_reason = reason
    subscription.payment_problem_at = timezone.now()


def downgrade_to_free(subscription):
    subscription.plan_slug = "free"
    subscription.stripe_subscription_id = None
    subscription.stripe_price_id = None
    subscription.cancel_at_period_end = False
    subscription.actions_used = 0
    subscription.current_period_start = timezone.now()
    subscription.current_period_end = None
    clear_payment_problem(subscription)


def retrieve_stripe_subscription(subscription_id):
    try:
        return stripe_client.client.v1.subscriptions.retrieve(subscription_id)
    except stripe.error.StripeError as exc:
        if stripe_client.is_missing_stripe_resource_error(exc):
            logger.warning(
                "Stripe subscription %s was missing while syncing invoice",
                subscription_id,
            )
            return None
        raise


def sync_paid_subscription(user, stripe_sub):
    if payloads.get(stripe_sub, "status") != "active":
        logger.info(
            "invoice.paid ignored because subscription=%s status=%s is not active",
            payloads.object_id(stripe_sub),
            payloads.get(stripe_sub, "status"),
        )
        return

    item = payloads.best_subscription_item(stripe_sub)
    price_id = payloads.subscription_item_price_id(item)
    mapped_slug = stripe_client.get_plan_type(price_id) if price_id else "free"

    subscription, _ = Subscription.objects.select_for_update().get_or_create(
        user=user,
        defaults={"plan_slug": "free"},
    )

    if mapped_slug == "free":
        logger.warning(
            "invoice.paid: unrecognized price_id=%s for user=%s; leaving plan_slug=%s unchanged",
            price_id,
            user.pk,
            subscription.plan_slug,
        )
        if price_id:
            subscription.stripe_price_id = price_id
        subscription.save()
        return

    period_start = payloads.timestamp_to_datetime(payloads.item_period_start(item, stripe_sub))
    period_end = payloads.timestamp_to_datetime(payloads.item_period_end(item, stripe_sub))

    event_sub_id = payloads.object_id(stripe_sub)

    # Cross-subscription staleness guard: if local is on a different paid
    # subscription AND the event's period_end is not newer than ours, refuse.
    # Prevents a redelivered invoice.paid for an upgraded-away old subscription
    # from silently downgrading the user. A legitimate upgrade (new sub with a
    # later period_end) passes through because event_period_end > local.
    if (
        subscription.plan_slug != "free"
        and subscription.stripe_subscription_id
        and subscription.stripe_subscription_id != event_sub_id
        and period_end
        and subscription.current_period_end
        and period_end <= subscription.current_period_end
    ):
        logger.warning(
            "invoice.paid for subscription=%s ignored; local subscription=%s has period_end>=%s",
            event_sub_id,
            subscription.stripe_subscription_id,
            period_end,
        )
        return

    same_paid_subscription = (
        subscription.plan_slug != "free"
        and subscription.stripe_subscription_id == event_sub_id
    )
    if (
        same_paid_subscription
        and period_end
        and subscription.current_period_start
        and period_end <= subscription.current_period_start
    ):
        logger.warning(
            "invoice.paid: stale period_end=%s ignored for local subscription=%s current_period_start=%s",
            period_end,
            subscription.pk,
            subscription.current_period_start,
        )
        return

    subscription.plan_slug = mapped_slug
    subscription.stripe_subscription_id = payloads.object_id(stripe_sub)
    subscription.stripe_price_id = price_id
    subscription.cancel_at_period_end = payloads.subscription_cancel_scheduled(stripe_sub)
    clear_payment_problem(subscription)

    if period_start and subscription.current_period_start != period_start:
        subscription.actions_used = 0
        subscription.current_period_start = period_start

    if period_end:
        subscription.current_period_end = period_end

    subscription.save()


def sync_subscription_update(stripe_sub):
    subscription_id = payloads.object_id(stripe_sub)
    subscription = Subscription.objects.select_for_update().filter(
        stripe_subscription_id=subscription_id
    ).first()
    if subscription is None:
        logger.warning(
            "customer.subscription.updated: no local subscription for stripe_subscription_id=%s",
            subscription_id,
        )
        return

    subscription.cancel_at_period_end = payloads.subscription_cancel_scheduled(stripe_sub)

    item = payloads.best_subscription_item(stripe_sub)
    if item:
        period_start = payloads.timestamp_to_datetime(payloads.item_period_start(item, stripe_sub))
        period_end = payloads.timestamp_to_datetime(payloads.item_period_end(item, stripe_sub))

        if not subscription.current_period_start:
            if period_start:
                subscription.current_period_start = period_start
            if period_end:
                subscription.current_period_end = period_end
        elif period_start and period_start == subscription.current_period_start and period_end:
            subscription.current_period_end = period_end

        new_price_id = payloads.subscription_item_price_id(item)
        mapped_slug = stripe_client.get_plan_type(new_price_id) if new_price_id else "free"
        current_rank = stripe_client.PAID_PLAN_RANK.get(subscription.plan_slug, 0)
        new_rank = stripe_client.PAID_PLAN_RANK.get(mapped_slug, 0)
        pending_update = payloads.get(stripe_sub, "pending_update")

        # Unknown price → mirror it locally for diagnostic visibility and warn.
        # We don't change plan_slug; matches sync_paid_subscription's policy.
        if new_price_id and mapped_slug == "free":
            subscription.stripe_price_id = new_price_id
            logger.warning(
                "customer.subscription.updated: unrecognized price_id=%s for subscription=%s; "
                "leaving plan_slug=%s unchanged",
                new_price_id,
                subscription_id,
                subscription.plan_slug,
            )

        # Plan-change policy:
        # - Downgrades (Pro -> Standard) flow through here. Stripe fires
        #   customer.subscription.updated synchronously on the swap; no
        #   payment event is required, so we apply immediately.
        # - Upgrades (Standard -> Pro) are intentionally NOT applied here.
        #   invoice.paid is the source of truth for granting upgraded access
        #   because upgrades generate a prorated invoice. Granting Pro from
        #   this handler would race with invoice.paid and could lock in
        #   pre-payment state.
        # - Same-plan price changes (e.g., currency swap) update the price
        #   field only.
        if (
            payloads.get(stripe_sub, "status") == "active"
            and pending_update is None
            and mapped_slug != "free"
            and new_rank < current_rank
        ):
            subscription.plan_slug = mapped_slug
            subscription.stripe_price_id = new_price_id
        elif mapped_slug == subscription.plan_slug and new_price_id:
            subscription.stripe_price_id = new_price_id

    subscription.save()


def mark_payment_problem(invoice, reason):
    subscription_id = payloads.invoice_subscription_id(invoice)
    subscription = None
    if subscription_id:
        subscription = Subscription.objects.select_for_update().filter(
            stripe_subscription_id=subscription_id
        ).first()

    if subscription is None:
        customer_id = payloads.get(invoice, "customer")
        if customer_id:
            user = User.objects.filter(stripe_customer_id=customer_id).first()
            if user is not None:
                subscription, _ = Subscription.objects.select_for_update().get_or_create(
                    user=user,
                    defaults={"plan_slug": "free"},
                )

    if subscription is None:
        logger.warning(
            "%s: no local subscription for invoice=%s subscription=%s customer=%s",
            reason,
            payloads.object_id(invoice),
            subscription_id,
            payloads.get(invoice, "customer"),
        )
        return

    set_payment_problem(subscription, reason)
    subscription.save(update_fields=["payment_problem_reason", "payment_problem_at", "updated_at"])


def sync_subscription_deleted(stripe_sub):
    subscription_id = payloads.object_id(stripe_sub)
    subscription = Subscription.objects.select_for_update().filter(
        stripe_subscription_id=subscription_id
    ).first()
    if subscription is None:
        logger.warning(
            "customer.subscription.deleted: no local subscription for stripe_subscription_id=%s",
            subscription_id,
        )
        return

    downgrade_to_free(subscription)
    subscription.save()


def handle_paid_invoice(invoice):
    subscription_id = payloads.invoice_subscription_id(invoice)
    if not subscription_id:
        logger.info(
            "invoice.paid ignored because invoice=%s has no subscription",
            payloads.object_id(invoice),
        )
        return

    user = payloads.find_user_for_invoice(invoice)
    if user is None:
        logger.warning(
            "invoice.paid: no user for subscription=%s customer=%s email=%s invoice=%s",
            subscription_id,
            payloads.get(invoice, "customer"),
            payloads.get(invoice, "customer_email"),
            payloads.object_id(invoice),
        )
        return

    customer_id = payloads.get(invoice, "customer")
    if customer_id and user.stripe_customer_id != customer_id:
        user.stripe_customer_id = customer_id
        user.save(update_fields=["stripe_customer_id", "updated_at"])

    stripe_sub = retrieve_stripe_subscription(subscription_id)
    if stripe_sub is None:
        return

    sync_paid_subscription(user, stripe_sub)
