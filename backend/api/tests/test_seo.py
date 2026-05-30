import json
import re

from django.test import SimpleTestCase


PUBLIC_ORIGIN = "https://readtorecall.com"


def _json_ld_items(html: str) -> list[dict]:
    scripts = re.findall(
        r'<script type="application/ld\+json">\s*(.*?)\s*</script>',
        html,
        flags=re.S,
    )
    return [json.loads(script) for script in scripts]


class SeoSurfaceTests(SimpleTestCase):
    def test_robots_uses_public_sitemap_and_keeps_noindex_pages_crawlable(self):
        response = self.client.get("/robots.txt")

        self.assertEqual(response.status_code, 200)
        body = response.content.decode("utf-8")
        self.assertIn(f"Sitemap: {PUBLIC_ORIGIN}/sitemap.xml", body)
        self.assertIn("Disallow: /api/", body)
        self.assertIn("Allow: /api/auth/social/complete", body)
        self.assertNotIn("Disallow: /accounts/", body)
        self.assertNotIn("Disallow: /billing/", body)

    def test_sitemap_uses_public_origin_only(self):
        response = self.client.get("/sitemap.xml")

        self.assertEqual(response.status_code, 200)
        body = response.content.decode("utf-8")
        for path in ("/", "/study-tools/", "/payments/", "/privacy/", "/terms/"):
            self.assertIn(f"<loc>{PUBLIC_ORIGIN}{path}</loc>", body)
        self.assertNotIn("http://testserver", body)
        self.assertNotIn("https://testserver", body)

    def test_public_pages_render_fixed_canonicals(self):
        cases = {
            "/": f'{PUBLIC_ORIGIN}/',
            "/study-tools/": f'{PUBLIC_ORIGIN}/study-tools/',
            "/payments/": f'{PUBLIC_ORIGIN}/payments/',
            "/privacy/": f'{PUBLIC_ORIGIN}/privacy/',
            "/terms/": f'{PUBLIC_ORIGIN}/terms/',
        }

        for path, canonical_url in cases.items():
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                body = response.content.decode("utf-8")
                self.assertIn(f'<link rel="canonical" href="{canonical_url}">', body)
                self.assertIn(f'<meta property="og:url" content="{canonical_url}">', body)
                self.assertNotIn("://testserver", body)

    def test_legal_pages_render_breadcrumb_structured_data(self):
        cases = {
            "/privacy/": ("Privacy Policy", f"{PUBLIC_ORIGIN}/privacy/"),
            "/terms/": ("Terms & Conditions", f"{PUBLIC_ORIGIN}/terms/"),
        }

        for path, (name, item_url) in cases.items():
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                items = _json_ld_items(response.content.decode("utf-8"))
                breadcrumbs = [
                    item for item in items if item.get("@type") == "BreadcrumbList"
                ]
                self.assertEqual(len(breadcrumbs), 1)
                self.assertEqual(
                    breadcrumbs[0]["itemListElement"],
                    [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Home",
                            "item": f"{PUBLIC_ORIGIN}/",
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": name,
                            "item": item_url,
                        },
                    ],
                )

    def test_private_status_pages_send_noindex_header(self):
        for path in ("/accounts/not-found/", "/billing/", "/api/auth/social/complete"):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response["X-Robots-Tag"], "noindex, nofollow")

    def test_social_auth_templates_include_meta_noindex(self):
        response = self.client.get("/api/auth/social/complete")

        self.assertEqual(response.status_code, 200)
        self.assertIn(
            '<meta name="robots" content="noindex, nofollow" />',
            response.content.decode("utf-8"),
        )

    def test_llms_txt_reflects_coming_soon_status(self):
        response = self.client.get("/llms.txt")

        self.assertEqual(response.status_code, 200)
        body = response.content.decode("utf-8")
        self.assertIn("- Status: Coming soon", body)
        self.assertNotIn("- Launched:", body)
