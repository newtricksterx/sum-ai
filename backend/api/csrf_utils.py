import logging

from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import exceptions

logger = logging.getLogger(__name__)


class _CSRFCheck(CsrfViewMiddleware):
    def _reject(self, request, reason):  # type: ignore[override]
        return reason


def _run_csrf_check(request):
    check = _CSRFCheck(lambda req: None)  # type: ignore
    check.process_request(request)
    original_csrf_bypass = getattr(request, "_dont_enforce_csrf_checks", False)
    request._dont_enforce_csrf_checks = False
    try:
        return check.process_view(request, None, (), {})
    finally:
        request._dont_enforce_csrf_checks = original_csrf_bypass


def enforce_csrf(request) -> None:
    reason = _run_csrf_check(request)
    if reason:
        logger.warning("CSRF check failed for %s: %s", request.path, reason)
        raise exceptions.PermissionDenied(f"CSRF Failed: {reason}")


def has_valid_csrf_token(request) -> bool:
    reason = _run_csrf_check(request)
    if reason is None:
        return True
    logger.warning("CSRF validation failed for %s: %s", request.path, reason)
    return False
