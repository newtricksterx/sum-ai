import logging
from datetime import UTC, datetime

from api.models import User

from . import stripe_client

logger = logging.getLogger(__name__)


def get(obj, key, default=None):
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    try:
        return obj[key]
    except (KeyError, TypeError, AttributeError):
        return getattr(obj, key, default)


def path(obj, *keys, default=None):
    current = obj
    for key in keys:
        current = get(current, key, default=None)
        if current is None:
            return default
    return current


def timestamp_to_datetime(timestamp):
    if not timestamp:
        return None
    return datetime.fromtimestamp(timestamp, tz=UTC)


def event_type(event) -> str:
    return get(event, "type", "")


def event_id(event) -> str | None:
    return get(event, "id")


def object_id(obj) -> str | None:
    return get(obj, "id")


def metadata_user_id(obj) -> str | None:
    metadata = get(obj, "metadata") or {}
    user_id = get(metadata, "user_id")
    if user_id:
        return str(user_id)
    return None


def invoice_subscription_id(invoice):
    return (
        path(invoice, "parent", "subscription_details", "subscription")
        or get(invoice, "subscription")
    )


def subscription_cancel_scheduled(stripe_sub) -> bool:
    return bool(get(stripe_sub, "cancel_at_period_end")) or bool(
        get(stripe_sub, "cancel_at")
    )


def subscription_items(stripe_sub):
    return path(stripe_sub, "items", "data", default=[]) or []


def subscription_item_price_id(item):
    return path(item, "price", "id")


def best_subscription_item(stripe_sub):
    items = subscription_items(stripe_sub)
    for item in items:
        price_id = subscription_item_price_id(item)
        if price_id and stripe_client.get_plan_type(price_id) != "free":
            return item
    return items[0] if items else None


def item_period_start(item, stripe_sub):
    return get(item, "current_period_start") or get(stripe_sub, "current_period_start")


def item_period_end(item, stripe_sub):
    return get(item, "current_period_end") or get(stripe_sub, "current_period_end")


def find_user_by_id(user_id):
    if not user_id:
        return None
    try:
        return User.objects.filter(pk=int(user_id)).first()
    except (TypeError, ValueError):
        logger.warning("Stripe payload had invalid user_id metadata=%s", user_id)
        return None


def find_user_for_session(session):
    user = find_user_by_id(get(session, "client_reference_id"))
    if user is not None:
        return user

    user = find_user_by_id(metadata_user_id(session))
    if user is not None:
        return user

    email = path(session, "customer_details", "email") or get(session, "customer_email")
    if email:
        return User.objects.filter(email__iexact=email).first()
    return None


def find_user_for_invoice(invoice):
    user = find_user_by_id(metadata_user_id(invoice))
    if user is not None:
        return user

    user = find_user_by_id(
        path(invoice, "parent", "subscription_details", "metadata", "user_id")
    )
    if user is not None:
        return user

    customer_id = get(invoice, "customer")
    if customer_id:
        user = User.objects.filter(stripe_customer_id=customer_id).first()
        if user is not None:
            return user

    email = get(invoice, "customer_email")
    if email:
        return User.objects.filter(email__iexact=email).first()
    return None
