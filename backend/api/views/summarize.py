import logging

import fitz  # PyMuPDF
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
import re

from api.models.subscription import Subscription
from api.plans import get_character_limit
from scripts.SumAI import SumAI
from scripts.YouTubeTools import getTranscript
import json

logger = logging.getLogger(__name__)

PDF_MAX_PAGES = 200

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
                            "isSuccess": False,
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

    def _validate_request(self, source_url, source_type, source_content, pdf_file):
        if not source_url:
            return Response(
                {
                    "isSuccess": False,
                    "error": "Missing required field: 'source_url'",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if source_type not in ("webpage", "youtube", "pdf"):
            return Response(
                {
                    "isSuccess": False,
                    "error": f"Invalid source type: {source_type}",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if source_type == "pdf":
            if pdf_file is None:
                return Response(
                    {
                        "isSuccess": False,
                        "error": "Missing required file: 'pdf'",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif not source_content:
            return Response(
                {
                    "isSuccess": False,
                    "error": "Missing required field: 'content'",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return None


    def _handle_youtube(self, source_url):
        try:
            return getTranscript(source_url)
        except Exception:
            return Response(
                {
                    "isSuccess": False,
                    "error": "youtube_transcript_unavailable",
                    "message": "Could not fetch a transcript for this YouTube video.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    def _handle_pdf(self, pdf_file):
        try:
            data = pdf_file.read()
            with fitz.open(stream=data, filetype="pdf") as document:
                pages = [page.get_text() for page in document.pages(stop=PDF_MAX_PAGES)]
        except Exception:
            logger.exception("Could not parse uploaded PDF.")
            return Response(
                {
                    "isSuccess": False,
                    "error": "pdf_unreadable",
                    "message": "Could not read this PDF. It may be corrupted or password-protected.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return "\n\n".join(pages).strip()

    def post(self, request):
        source_url = request.data.get("source_url")
        source_type = request.data.get("source_type")
        source_content = request.data.get("source_content")
        pdf_file = request.FILES.get("pdf")

        validation_error = self._validate_request(
            source_url=source_url,
            source_type=source_type,
            source_content=source_content,
            pdf_file=pdf_file,
        )
        if validation_error is not None:
            return validation_error

        content_to_summarize = source_content

        if source_type == "youtube":
            content_to_summarize = self._handle_youtube(source_url=source_url)
            if isinstance(content_to_summarize, Response):
                return content_to_summarize

        if source_type == "pdf":
            content_to_summarize = self._handle_pdf(pdf_file=pdf_file)
            if isinstance(content_to_summarize, Response):
                return content_to_summarize


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
                content_to_summarize,
                request.data.get("length"),
                request.data.get("format"),
                request.data.get("language"),
                max_input_chars=character_limit, # type: ignore
                source_url=source_url,
            )
        except Exception:
            if reserved_subscription_id is not None:
                self._release_summary_slot(reserved_subscription_id)
            raise
 
        #print(isinstance(summary["content"], str))

        #print(summary["content"])

        return Response(
            {
                "isSuccess": summary["success"],
                "data": summary["content"], # is a string
            }
        )
