import base64
import ipaddress
import logging
import socket
from urllib.parse import urlsplit

from .base import ExtractionResult, SourceExtractor

logger = logging.getLogger(__name__)

_ALLOWED_URL_SCHEMES = frozenset({"http", "https"})


def _resolved_addresses(host: str) -> list[str]:
    # Every A/AAAA record the host resolves to. We reject if *any* points at a
    # non-public range so a record set that mixes one public and one internal
    # IP can't be used to slip past the check.
    infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    return [info[4][0] for info in infos]


def _is_public_ip(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False
    # Block loopback, RFC1918/ULA private, link-local (incl. cloud metadata at
    # 169.254.169.254), multicast, reserved, and unspecified ranges.
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def _validate_public_url(source_url: str) -> str | None:
    """Return an error message if `source_url` is unsafe to fetch server-side,
    or None if it resolves to a public host over http(s).

    Guards the URL-fallback export path against SSRF: only http(s) is allowed
    (no file://, gopher://, etc.), and the host must resolve exclusively to
    public IPs so it cannot reach loopback, the cloud metadata endpoint, or
    internal services. A determined attacker could still rebind DNS in the
    window between this check and the browser's fetch; the residual exposure is
    a single GET to an internal host with no readable response leaking back,
    which is acceptable for this export feature.
    """
    if not isinstance(source_url, str) or not source_url.strip():
        return "Missing source URL."

    parts = urlsplit(source_url.strip())
    if parts.scheme.lower() not in _ALLOWED_URL_SCHEMES:
        return "Only http and https URLs can be exported."

    host = parts.hostname
    if not host:
        return "Could not determine the host for this URL."

    try:
        addresses = _resolved_addresses(host)
    except socket.gaierror:
        return "Could not resolve the host for this URL."

    if not addresses or not all(_is_public_ip(addr) for addr in addresses):
        return "This URL points to a non-public address and cannot be exported."

    return None


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
                # This branch fetches an attacker-controllable URL server-side,
                # so it must be validated against SSRF before navigation.
                url_error = _validate_public_url(source_url)
                if url_error:
                    logger.warning("Rejected export URL %s: %s", source_url, url_error)
                    browser.close()
                    return {"is_success": False, "error": url_error}
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
