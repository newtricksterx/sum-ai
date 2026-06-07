from django.test import SimpleTestCase, override_settings
from rest_framework.exceptions import Throttled, NotFound
from rest_framework.test import APIRequestFactory

from api.exception_handlers import custom_exception_handler


def _make_context():
    factory = APIRequestFactory()
    request = factory.get("/fake-path")
    return {"request": request, "view": None}


@override_settings(
    ANON_THROTTLE_SUMMARIES_COUNT=5,
    ANON_THROTTLE_SUMMARIES_PERIOD="day",
)
class ThrottledExceptionHandlerTests(SimpleTestCase):
    def test_throttled_response_includes_correct_settings(self):
        exc = Throttled(wait=30)
        response = custom_exception_handler(exc, _make_context())

        self.assertEqual(response.status_code, 429)
        self.assertFalse(response.data["isSuccess"])
        self.assertEqual(response.data["error"], "rate_limited")
        self.assertEqual(response.data["summaries_limit"], 5)
        self.assertEqual(response.data["limit_period"], "day")
        self.assertEqual(response.data["rate"], "5/day")
        self.assertEqual(response.data["retry_after_seconds"], 30)

    def test_throttled_response_with_no_wait(self):
        exc = Throttled()
        response = custom_exception_handler(exc, _make_context())

        self.assertIsNone(response.data["retry_after_seconds"])
        self.assertEqual(response.data["summaries_limit"], 5)

    def test_rate_is_none_when_settings_missing(self):
        with self.settings(ANON_THROTTLE_SUMMARIES_COUNT=None):
            exc = Throttled(wait=10)
            response = custom_exception_handler(exc, _make_context())

            self.assertIsNone(response.data["rate"])


class NonThrottledExceptionHandlerTests(SimpleTestCase):
    def test_adds_isSuccess_false_to_non_throttled_errors(self):
        exc = NotFound("Not found")
        response = custom_exception_handler(exc, _make_context())

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["isSuccess"])

    def test_does_not_overwrite_existing_isSuccess(self):
        exc = Throttled(wait=5)
        response = custom_exception_handler(exc, _make_context())

        self.assertFalse(response.data["isSuccess"])

    def test_returns_none_for_unhandled_exception(self):
        exc = RuntimeError("unexpected")
        result = custom_exception_handler(exc, _make_context())
        self.assertIsNone(result)
