from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.subscription import Subscription
from scripts import SumAI


class SummarizeText(APIView):
    def _reserve_summary_slot(self, user) -> tuple[int | None, Response | None]:
        now = timezone.now()

        with transaction.atomic():
            subscription, _ = Subscription.objects.select_for_update().get_or_create(
                user=user,
                defaults={
                    "plan_slug": "free",
                    "current_period_start": now,
                },
            )

            if subscription.should_reset_usage_period(reference_time=now):
                subscription.reset_usage_period(reference_time=now)
                subscription.save(
                    update_fields=[
                        "summaries_used",
                        "current_period_start",
                        "current_period_end",
                        "updated_at",
                    ]
                )

            summary_limit = subscription.summary_limit
            if summary_limit is not None and subscription.summaries_used >= summary_limit:
                return (
                    None,
                    Response(
                        {
                            "error": "summary_limit_reached",
                            "code": "summary_limit_reached",
                            "message": "Summary limit reached for current billing period.",
                            "summary_limit": summary_limit,
                            "summaries_used": subscription.summaries_used,
                            "billing_interval": subscription.billing_interval,
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    ),
                )

            Subscription.objects.filter(pk=subscription.pk).update(
                summaries_used=F("summaries_used") + 1
            )

        return subscription.pk, None

    def _release_summary_slot(self, subscription_id: int) -> None:
        Subscription.objects.filter(
            pk=subscription_id,
            summaries_used__gt=0,
        ).update(summaries_used=F("summaries_used") - 1)

    def post(self, request):
        content = request.data.get("content")

        if not content:
            return Response(
                {"error": "Missing required field: 'content'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reserved_subscription_id = None
        if request.user.is_authenticated:
            reserved_subscription_id, limit_error = self._reserve_summary_slot(request.user)
            if limit_error is not None:
                return limit_error

        try:
            summary = SumAI.SummarizeContent(
                request.data.get("content"),
                request.data.get("length"),
                request.data.get("regenerate"),
                request.data.get("format"),
                request.data.get("language"),
            )
        except Exception:
            if reserved_subscription_id is not None:
                self._release_summary_slot(reserved_subscription_id)
            raise

        return Response({"data": summary})
