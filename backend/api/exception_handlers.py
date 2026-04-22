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
        response.data = {
            "error": "rate_limited",
            "code": "throttled",
            "message": "Too many requests. Please try again later.",
            "summaries_limit": settings.THROTTLE_SUMMARIES_COUNT,
            "limit_period": settings.THROTTLE_SUMMARIES_PERIOD,
            "rate": f"{settings.THROTTLE_SUMMARIES_COUNT}/{settings.THROTTLE_SUMMARIES_PERIOD}",
            "retry_after_seconds": retry_after_seconds,
            "detail": str(exc.detail),
        }

    return response
