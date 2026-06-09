import base64
import logging

from .base import ExtractionResult, SourceExtractor

logger = logging.getLogger(__name__)


class WebpageExtractor(SourceExtractor):
    source_type = "webpage"

    def extract(self, request) -> ExtractionResult:
        source_content = request.data.get("source_content")
        if not source_content:
            return ExtractionResult(is_success=False, error="Error: Invalid request.")
        return ExtractionResult(is_success=True, content=source_content)


def export_webpage_as_pdf(source_url: str) -> dict:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.error("playwright is not installed — cannot generate PDF exports")
        return {"is_success": False, "error": "PDF export is not available on this server."}

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(source_url, wait_until="networkidle", timeout=30000)
            pdf_bytes = page.pdf(format="A4", print_background=True)
            browser.close()
        pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")
        return {"is_success": True, "pdf_base64": pdf_base64}
    except Exception:
        logger.exception("Playwright PDF generation failed for %s", source_url)
        return {"is_success": False, "error": "Could not generate PDF from this webpage."}
