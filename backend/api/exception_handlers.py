import math

from django.conf import settings
from rest_framework.exceptions import Throttled
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, Throttled):
        wait = getattr(exc, "wait", None)
        retry_after_seconds = math.ceil(wait) if wait is not None else None
        summaries_limit = getattr(
            settings,
            "THROTTLE_SUMMARIES_COUNT",
            getattr(settings, "ANON_THROTTLE_SUMMARIES_COUNT", None),
        )
        limit_period = getattr(
            settings,
            "THROTTLE_SUMMARIES_PERIOD",
            getattr(settings, "ANON_THROTTLE_SUMMARIES_PERIOD", None),
        )
        response.data = {
            "error": "rate_limited",
            "code": "throttled",
            "message": "Too many requests. Please try again later.",
            "summaries_limit": summaries_limit,
            "limit_period": limit_period,
            "rate": f"{summaries_limit}/{limit_period}" if summaries_limit and limit_period else None,
            "retry_after_seconds": retry_after_seconds,
            "detail": str(exc.detail),
        }

    return response
