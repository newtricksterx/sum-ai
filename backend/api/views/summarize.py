from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from api.models.subscription import Subscription
from api.plans import get_character_limit
from backend.scripts.SumAI import SumAI
from scripts.YouTubeTools import isYouTubeURL, getTranscript

class SummarizeText(APIView):
    # Limit only anonymous requests; authenticated users continue using subscription-based limits.
    throttle_classes = [AnonRateThrottle]

    def _reserve_summary_slot(self, user) -> tuple[int | None, int | None, Response | None]:
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

        return subscription.pk, subscription.character_limit, None

    def _release_summary_slot(self, subscription_id: int) -> None:
        Subscription.objects.filter(
            pk=subscription_id,
            summaries_used__gt=0,
        ).update(summaries_used=F("summaries_used") - 1)

    def post(self, request):
        source_url = request.data.get("source_url")
        if not source_url:
            return Response(
                {"error": "Missing required field: 'source_url'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content = request.data.get("content")
        content_for_summary = content

        if isYouTubeURL(source_url):
            try:
                content_for_summary = getTranscript(source_url)
            except Exception:
                return Response(
                    {
                        "error": "youtube_transcript_unavailable",
                        "message": "Could not fetch a transcript for this YouTube video.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if not content_for_summary:
            return Response(
                {"error": "Missing required field: 'content'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        character_limit = get_character_limit("free")
        reserved_subscription_id = None
        if request.user.is_authenticated:
            reserved_subscription_id, character_limit, limit_error = self._reserve_summary_slot(
                request.user
            )
            if limit_error is not None:
                return limit_error

        try:
            summary = SumAI.SummarizeContent(
                content_for_summary,
                request.data.get("length"),
                request.data.get("regenerate"),
                request.data.get("format"),
                request.data.get("language"),
                max_input_chars=character_limit, # type: ignore
                source_url=source_url,
            )
        except Exception:
            if reserved_subscription_id is not None:
                self._release_summary_slot(reserved_subscription_id)
            raise

        return Response({"data": summary})
