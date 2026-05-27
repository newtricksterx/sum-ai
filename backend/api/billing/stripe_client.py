import environ
import stripe

env = environ.Env()

client = stripe.StripeClient(str(env("STRIPE_SEC_KEY")))
webhook_secret = str(env("STRIPE_WEBHOOK_SECRET", default=""))

PAID_PLAN_RANK = {"standard": 1, "pro": 2}
PAYMENT_WARNING_EVENTS = {
    "invoice.payment_failed",
    "invoice.payment_action_required",
    "invoice.finalization_failed",
}


def get_plan_type(price_id):
    if price_id in {
        str(env("STRIPE_PRICE_STANDARD_USD")),
        str(env("STRIPE_PRICE_STANDARD_CAD")),
        str(env("STRIPE_PRICE_STANDARD_EUR")),
    }:
        return "standard"
    if price_id in {
        str(env("STRIPE_PRICE_PRO_USD")),
        str(env("STRIPE_PRICE_PRO_CAD")),
        str(env("STRIPE_PRICE_PRO_EUR")),
    }:
        return "pro"
    return "free"


def is_missing_stripe_resource_error(exc) -> bool:
    return (
        isinstance(exc, stripe.error.InvalidRequestError)
        and (
            getattr(exc, "code", None) == "resource_missing"
            or "No such" in str(exc)
        )
    )


def stripe_request_id(exc) -> str | None:
    return getattr(exc, "request_id", None) or getattr(exc, "requestId", None)
