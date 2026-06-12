from unittest.mock import patch

from django.test import SimpleTestCase

from scripts.sources.webpage import (
    _A4_WIDTH_PX,
    _is_blocked_page,
    _shrink_to_fit_scale,
    _validate_public_url,
)


class _StubPage:
    """Stands in for a Playwright page: only .url and .title() are read."""

    def __init__(self, url="https://example.com/article", title=""):
        self.url = url
        self._title = title

    def title(self):
        return self._title


class IsBlockedPageTest(SimpleTestCase):
    """The URL-fallback export must never print a bot-check interstitial to PDF
    as if it were the page — that is the captcha-in-the-exported-PDF bug."""

    def test_google_sorry_redirect_is_blocked(self):
        page = _StubPage(url="https://www.google.com/sorry/index?continue=https://www.google.com/search")
        self.assertTrue(_is_blocked_page(page))

    def test_google_consent_redirect_is_blocked(self):
        page = _StubPage(url="https://consent.google.com/m?continue=https://www.google.com/")
        self.assertTrue(_is_blocked_page(page))

    def test_unusual_traffic_title_is_blocked(self):
        page = _StubPage(title="Unusual traffic from your computer network")
        self.assertTrue(_is_blocked_page(page))

    def test_cloudflare_challenge_title_is_blocked(self):
        page = _StubPage(title="Just a moment...")
        self.assertTrue(_is_blocked_page(page))

    def test_ordinary_page_is_not_blocked(self):
        page = _StubPage(url="https://example.com/article", title="How LLMs work")
        self.assertFalse(_is_blocked_page(page))


class _StubMeasurablePage:
    """Stands in for a Playwright page during PDF scale measurement."""

    def __init__(self, scroll_width):
        self._scroll_width = scroll_width
        self.emulated_media = None

    def emulate_media(self, media):
        self.emulated_media = media

    def evaluate(self, _expression):
        return self._scroll_width


class ShrinkToFitScaleTest(SimpleTestCase):
    """Fixed-width pages wider than A4 used to overflow the sheet — left gap
    from the centered container's margin, right side clipped. The pdf scale
    must shrink such pages to the paper width so nothing is cut off."""

    def test_page_narrower_than_a4_is_not_scaled(self):
        self.assertEqual(_shrink_to_fit_scale(_StubMeasurablePage(600)), 1.0)

    def test_page_exactly_a4_wide_is_not_scaled(self):
        self.assertEqual(_shrink_to_fit_scale(_StubMeasurablePage(_A4_WIDTH_PX)), 1.0)

    def test_wide_page_is_shrunk_to_paper_width(self):
        self.assertAlmostEqual(
            _shrink_to_fit_scale(_StubMeasurablePage(_A4_WIDTH_PX * 2)), 0.5
        )

    def test_scale_is_clamped_to_chromium_minimum(self):
        self.assertEqual(_shrink_to_fit_scale(_StubMeasurablePage(1_000_000)), 0.1)

    def test_unmeasurable_width_falls_back_to_no_scaling(self):
        self.assertEqual(_shrink_to_fit_scale(_StubMeasurablePage(0)), 1.0)

    def test_measurement_uses_print_stylesheet(self):
        # page.pdf renders with print CSS, so measuring under screen CSS would
        # mis-size pages whose print stylesheet changes the layout.
        page = _StubMeasurablePage(600)
        _shrink_to_fit_scale(page)
        self.assertEqual(page.emulated_media, "print")


class ValidatePublicUrlTest(SimpleTestCase):
    """The URL-fallback export fetches an attacker-controllable URL on the
    server. Without these checks it is an SSRF: the caller could read the cloud
    metadata endpoint, internal services, or local files into the exported PDF.
    Each test encodes a class of target that must stay unreachable."""

    def _resolve_to(self, address):
        # Patch DNS so host-based tests don't depend on real resolution.
        return patch(
            "scripts.sources.webpage._resolved_addresses",
            return_value=[address],
        )

    def test_public_https_url_is_allowed(self):
        with self._resolve_to("93.184.216.34"):  # example.com
            self.assertIsNone(_validate_public_url("https://example.com/article"))

    def test_non_http_scheme_is_rejected(self):
        # file:// would let the export read local files off the server.
        self.assertIsNotNone(_validate_public_url("file:///etc/passwd"))

    def test_gopher_scheme_is_rejected(self):
        self.assertIsNotNone(_validate_public_url("gopher://example.com/"))

    def test_cloud_metadata_ip_is_rejected(self):
        # 169.254.169.254 is the cloud metadata endpoint — the highest-value
        # SSRF target (IAM credentials). It is link-local.
        self.assertIsNotNone(_validate_public_url("http://169.254.169.254/latest/meta-data/"))

    def test_loopback_is_rejected(self):
        self.assertIsNotNone(_validate_public_url("http://127.0.0.1:8000/"))

    def test_private_rfc1918_ip_is_rejected(self):
        self.assertIsNotNone(_validate_public_url("http://10.0.0.5/"))

    def test_hostname_resolving_to_private_ip_is_rejected(self):
        # DNS-based SSRF: a public-looking hostname pointing at an internal IP.
        with self._resolve_to("192.168.1.10"):
            self.assertIsNotNone(_validate_public_url("http://internal.example.com/"))

    def test_mixed_public_and_private_records_are_rejected(self):
        # If any record is internal, the host is rejected — a split record set
        # must not be usable to slip past the check.
        with patch(
            "scripts.sources.webpage._resolved_addresses",
            return_value=["93.184.216.34", "10.0.0.5"],
        ):
            self.assertIsNotNone(_validate_public_url("http://mixed.example.com/"))

    def test_empty_url_is_rejected(self):
        self.assertIsNotNone(_validate_public_url(""))