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

def isValidRequest(source_url, source_type, source_content, pdf_file):
    if not source_url:
        return False

    if source_type not in ("webpage", "youtube", "pdf"):
        return False
    if source_type == "pdf":
        return False
    elif not source_content:
        return False

    return True


def _handle_youtube(source_url):
    try:
        return (
            {
                "isSuccess": True,
                "content": getTranscript(source_url)
            }
        )
    except Exception:
        return (
            {
                "isSuccess": False,
                "content": "Could not fetch a transcript for this YouTube video.",
            }
        )

def _handle_pdf(pdf_file):
    try:
        data = pdf_file.read()
        with fitz.open(stream=data, filetype="pdf") as document:
            pages = [page.get_text() for page in document.pages(stop=PDF_MAX_PAGES)]

        return (
            {
                "isSuccess": True,
                "content": "\n\n".join(pages).strip()
            }
        )
    except Exception:
        return (
            {
                "isSuccess": False,
                "content": "Could not read this PDF. It may be corrupted or password-protected.",
            }
        )

def getSummary(request, character_limit=None):
    source_url = request.data.get("source_url")
    source_type = request.data.get("source_type")
    source_content = request.data.get("source_content")
    pdf_file = request.FILES.get("pdf")

    isValid = isValidRequest(
        source_url=source_url,
        source_type=source_type,
        source_content=source_content,
        pdf_file=pdf_file,
    )
    if not isValid:
        return {
            "isSuccess": False,
            "content": "Error: Invalid request."
        }

    content_to_summarize = (
        {
            "isSuccess": True,
            "content": source_content
        }
    )

    if source_type == "youtube":
        content_to_summarize = _handle_youtube(source_url=source_url)

    if source_type == "pdf":
        content_to_summarize = _handle_pdf(pdf_file=pdf_file)

    if not content_to_summarize.get("isSuccess"):
        return (
            {
                "isSuccess": content_to_summarize.get("isSuccess"),
                "content": content_to_summarize.get("content")
            }
        )

    if character_limit is None:
        character_limit = get_character_limit("free")

    summary = SumAI.SummarizeContent(
        content_to_summarize.get("content"),
        request.data.get("length"),
        request.data.get("format"),
        request.data.get("language"),
        max_input_chars=character_limit, # type: ignore
        source_url=source_url,
    )

    return (
        {
            "isSuccess": summary.get("isSuccess"),
            "content": summary.get("content"), # is a string
        }
    )
