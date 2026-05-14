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

def _extract_source_text(request):
    """Validate the request and return {isSuccess, content} where content is raw source text."""
    source_url = request.data.get("source_url")
    source_type = request.data.get("source_type")
    source_content = request.data.get("source_content")
    pdf_file = request.FILES.get("pdf")

    if not isValidRequest(
        source_url=source_url,
        source_type=source_type,
        source_content=source_content,
        pdf_file=pdf_file,
    ):
        return {"isSuccess": False, "content": "Error: Invalid request."}

    if source_type == "youtube":
        return _handle_youtube(source_url=source_url)

    if source_type == "pdf":
        return _handle_pdf(pdf_file=pdf_file)

    return {"isSuccess": True, "content": source_content}


def get_summary(request, character_limit=None):
    source = _extract_source_text(request)
    if not source.get("isSuccess"):
        return source

    if character_limit is None:
        character_limit = get_character_limit("free")

    result = SumAI.SummarizeContent(
        source.get("content"),
        request.data.get("length"),
        request.data.get("format"),
        request.data.get("language"),
        max_input_chars=character_limit, # type: ignore
        source_url=request.data.get("source_url"),
    )

    return {
        "isSuccess": result.get("isSuccess"),
        "content": result.get("content"), # is a string
    }


def get_action_item(request, character_limit=None):
    source = _extract_source_text(request)
    if not source.get("isSuccess"):
        return source

    if character_limit is None:
        character_limit = get_character_limit("free")

    text = source.get("content") or ""
    if isinstance(character_limit, int) and character_limit > 0:
        text = text[:character_limit]

    result = SumAI.ActionContent(
        request.data.get("type"),
        request.data.get("language"),
        text,
    )

    return {
        "isSuccess": result.get("isSuccess"),
        "content": result.get("content"),
    }

