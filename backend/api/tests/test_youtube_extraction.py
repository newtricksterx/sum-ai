from django.test import SimpleTestCase

from scripts.sources.youtube import _extract_video_id


class ExtractVideoIdTests(SimpleTestCase):
    # --- Direct video IDs ---

    def test_bare_11_char_id(self):
        self.assertEqual(_extract_video_id("dQw4w9WgXcQ"), "dQw4w9WgXcQ")

    def test_id_with_hyphens_and_underscores(self):
        self.assertEqual(_extract_video_id("a-B_c1d2e3f"), "a-B_c1d2e3f")

    # --- Standard watch URLs ---

    def test_standard_watch_url(self):
        self.assertEqual(
            _extract_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
            "dQw4w9WgXcQ",
        )

    def test_watch_url_with_extra_params(self):
        self.assertEqual(
            _extract_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42"),
            "dQw4w9WgXcQ",
        )

    def test_watch_url_without_www(self):
        self.assertEqual(
            _extract_video_id("https://youtube.com/watch?v=dQw4w9WgXcQ"),
            "dQw4w9WgXcQ",
        )

    def test_mobile_watch_url(self):
        self.assertEqual(
            _extract_video_id("https://m.youtube.com/watch?v=dQw4w9WgXcQ"),
            "dQw4w9WgXcQ",
        )

    # --- Short URLs ---

    def test_youtu_be_short_url(self):
        self.assertEqual(
            _extract_video_id("https://youtu.be/dQw4w9WgXcQ"),
            "dQw4w9WgXcQ",
        )

    def test_youtu_be_with_params(self):
        self.assertEqual(
            _extract_video_id("https://youtu.be/dQw4w9WgXcQ?t=30"),
            "dQw4w9WgXcQ",
        )

    # --- Embed and shorts URLs ---

    def test_embed_url(self):
        self.assertEqual(
            _extract_video_id("https://www.youtube.com/embed/dQw4w9WgXcQ"),
            "dQw4w9WgXcQ",
        )

    def test_shorts_url(self):
        self.assertEqual(
            _extract_video_id("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
            "dQw4w9WgXcQ",
        )

    def test_live_url(self):
        self.assertEqual(
            _extract_video_id("https://www.youtube.com/live/dQw4w9WgXcQ"),
            "dQw4w9WgXcQ",
        )

    def test_v_path_url(self):
        self.assertEqual(
            _extract_video_id("https://www.youtube.com/v/dQw4w9WgXcQ"),
            "dQw4w9WgXcQ",
        )

    # --- Nocookie domain ---

    def test_nocookie_embed_url(self):
        self.assertEqual(
            _extract_video_id("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"),
            "dQw4w9WgXcQ",
        )

    # --- Music domain ---

    def test_music_youtube_url(self):
        self.assertEqual(
            _extract_video_id("https://music.youtube.com/watch?v=dQw4w9WgXcQ"),
            "dQw4w9WgXcQ",
        )

    # --- Edge cases ---

    def test_strips_whitespace(self):
        self.assertEqual(
            _extract_video_id("  https://youtu.be/dQw4w9WgXcQ  "),
            "dQw4w9WgXcQ",
        )

    def test_url_with_port(self):
        self.assertEqual(
            _extract_video_id("https://www.youtube.com:443/watch?v=dQw4w9WgXcQ"),
            "dQw4w9WgXcQ",
        )

    # --- Error cases ---

    def test_raises_for_non_string(self):
        with self.assertRaises(ValueError):
            _extract_video_id(123)

    def test_raises_for_empty_string(self):
        with self.assertRaises(ValueError):
            _extract_video_id("")

    def test_raises_for_whitespace_only(self):
        with self.assertRaises(ValueError):
            _extract_video_id("   ")

    def test_raises_for_unknown_host(self):
        with self.assertRaises(ValueError):
            _extract_video_id("https://notyoutube.com/watch?v=dQw4w9WgXcQ")

    def test_raises_for_invalid_id_length(self):
        with self.assertRaises(ValueError):
            _extract_video_id("https://youtu.be/short")

    def test_raises_for_watch_url_missing_v_param(self):
        with self.assertRaises(ValueError):
            _extract_video_id("https://www.youtube.com/watch?list=PLtest")

    def test_raises_for_none(self):
        with self.assertRaises(ValueError):
            _extract_video_id(None)
