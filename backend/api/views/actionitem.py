from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle

from api.quota import QuotaExceeded, release_request_slot, reserve_request_slot
from scripts.summary import get_action_item, get_summary

ACTION_ITEM_TYPES = {"flashcards", "quiz"}
SUPPORTED_ACTION_TYPES = ACTION_ITEM_TYPES | {"summary"}


def _error_response(message, status_code, **extra):
    return Response(
        {"isSuccess": False, "error": message, **extra},
        status=status_code,
    )


def _success_response(content, *, is_success=True, status_code=status.HTTP_200_OK):
    return Response(
        {"isSuccess": is_success, "content": content},
        status=status_code,
    )


def _quota_response(exc: QuotaExceeded) -> Response:
    sub = exc.subscription
    return Response(
        {
            "isSuccess": False,
            "error": "action_limit_reached",
            "message": "Summary limit reached for current billing period.",
            "action_limit": sub.action_limit,
            "actions_used": sub.actions_used,
            "billing_interval": sub.billing_interval,
        },
        status=status.HTTP_403_FORBIDDEN,
    )


def _reserve_for(user):
    """Reserve a slot for an authenticated user; returns (subscription_pk, character_limit)
    or (None, None) for anonymous users. Raises QuotaExceeded when the user is at limit."""
    if not user.is_authenticated:
        return None, None
    subscription, character_limit = reserve_request_slot(user)
    return subscription.pk, character_limit

def _handle_summary(request):
    try:
        reservation_pk, character_limit = _reserve_for(request.user)
    except QuotaExceeded as exc:
        return _quota_response(exc)

    result = get_summary(request, character_limit=character_limit) or {}
    content = result.get("content")
    is_success = bool(result.get("isSuccess"))

    if content is None:
        if reservation_pk is not None:
            release_request_slot(reservation_pk)
        return _error_response(
            "Could not generate summary content.",
            status.HTTP_502_BAD_GATEWAY,
        )

    # Soft failures (invalid request / transcript miss / PDF parse fail) flow through at 200
    # so the frontend's existing error-doc renderer handles them via isSuccess + content.
    # Refund the slot since no real LLM-generated summary was produced.
    if not is_success and reservation_pk is not None:
        release_request_slot(reservation_pk)

    return _success_response(content, is_success=is_success)


def _handle_action_item(request):
    try:
        reservation_pk, character_limit = _reserve_for(request.user)
    except QuotaExceeded as exc:
        return _quota_response(exc)

    result = get_action_item(request, character_limit=character_limit) or {}
    content = result.get("content")
    is_success = bool(result.get("isSuccess"))

    if content is None:
        if reservation_pk is not None:
            release_request_slot(reservation_pk)
        return _error_response(
            "Could not generate action content.",
            status.HTTP_502_BAD_GATEWAY,
        )

    # Soft failures (invalid request / extraction fail) flow through at 200 with isSuccess=False.
    # Refund the slot since no real LLM-generated content was produced.
    if not is_success and reservation_pk is not None:
        release_request_slot(reservation_pk)

    return _success_response(content, is_success=is_success)


class ActionItem(APIView):
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        action_type = request.data.get("type")
        if not isinstance(action_type, str) or not action_type.strip():
            return _error_response(
                "Missing required field: 'type'",
                status.HTTP_400_BAD_REQUEST,
            )

        normalized_action_type = action_type.strip().lower()
        if normalized_action_type not in SUPPORTED_ACTION_TYPES:
            return _error_response(
                "Unsupported action type.",
                status.HTTP_400_BAD_REQUEST,
                supported_types=sorted(SUPPORTED_ACTION_TYPES),
            )

        if normalized_action_type == "summary":
            return _handle_summary(request)
        return _handle_action_item(request)
