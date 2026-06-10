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


# Bot-check / consent interstitials served instead of the real page when the
# export browser fetches a URL directly (no user session, datacenter IP).
_BLOCKED_URL_MARKERS = ("google.com/sorry", "consent.google.com")
_BLOCKED_TITLE_MARKERS = (
    "unusual traffic",
    "before you continue",
    "are you a robot",
    "just a moment",
    "attention required",
)


def _is_blocked_page(page) -> bool:
    url = (page.url or "").lower()
    if any(marker in url for marker in _BLOCKED_URL_MARKERS):
        return True
    title = (page.title() or "").lower()
    return any(marker in title for marker in _BLOCKED_TITLE_MARKERS)


# Chromium prints A4 at the paper's CSS width (210mm ≈ 794px at 96dpi). Pages
# with a fixed layout wider than that overflow the sheet: a centered container
# keeps its computed left margin (gap on the left) while everything past the
# paper's right edge is clipped. Shrink-to-fit like the browser print dialog.
_A4_WIDTH_PX = 794
_A4_HEIGHT_PX = 1123
_VIEWPORT = {"width": _A4_WIDTH_PX, "height": _A4_HEIGHT_PX}
_MIN_PDF_SCALE = 0.1  # Chromium rejects pdf scale outside [0.1, 2]


def _shrink_to_fit_scale(page) -> float:
    # Measure under print CSS, since that's the stylesheet page.pdf renders with.
    page.emulate_media(media="print")
    content_width = page.evaluate("document.documentElement.scrollWidth")
    if not content_width or content_width <= _A4_WIDTH_PX:
        return 1.0
    return max(_MIN_PDF_SCALE, _A4_WIDTH_PX / content_width)


def export_webpage_as_pdf(source_url: str, source_html: str | None = None) -> dict:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.error("playwright is not installed — cannot generate PDF exports")
        return {"is_success": False, "error": "PDF export is not available on this server."}

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            if source_html:
                # Client-captured HTML is already rendered; JavaScript stays off so
                # untrusted page scripts never execute on this server.
                context = browser.new_context(java_script_enabled=False, viewport=_VIEWPORT)
                page = context.new_page()
                page.set_content(source_html, wait_until="networkidle", timeout=30000)
            else:
                # Fallback for older extension versions that only send the URL.
                page = browser.new_page(viewport=_VIEWPORT)
                page.goto(source_url, wait_until="networkidle", timeout=30000)
                if _is_blocked_page(page):
                    browser.close()
                    return {
                        "is_success": False,
                        "error": "This site blocked the export with a bot check. Update the extension and try again.",
                    }
            pdf_bytes = page.pdf(
                format="A4", print_background=True, scale=_shrink_to_fit_scale(page)
            )
            browser.close()
        pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")
        return {"is_success": True, "pdf_base64": pdf_base64}
    except Exception:
        logger.exception("Playwright PDF generation failed for %s", source_url)
        return {"is_success": False, "error": "Could not generate PDF from this webpage."}
