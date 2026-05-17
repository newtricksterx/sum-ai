import logging
import re
from urllib.parse import parse_qs, urlparse

from youtube_transcript_api import YouTubeTranscriptApi

from .base import ExtractionResult, SourceExtractor

logger = logging.getLogger(__name__)

_VIDEO_ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{11}")
_SHORT_HOSTS = frozenset({"youtu.be", "www.youtu.be"})
_LONG_HOSTS = frozenset({
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
})
_PATH_PREFIXES_WITH_ID = frozenset({"shorts", "embed", "v", "live"})


def _extract_video_id(value) -> str:
    if not isinstance(value, str):
        raise ValueError("YouTube URL or video id must be a string.")

    candidate = value.strip()
    if not candidate:
        raise ValueError("Missing YouTube URL or video id.")

    if _VIDEO_ID_PATTERN.fullmatch(candidate):
        return candidate

    parsed = urlparse(candidate)
    host = parsed.netloc.lower().split(":")[0]
    path_segments = [seg for seg in parsed.path.split("/") if seg]
    video_id = None

    if host in _SHORT_HOSTS:
        video_id = path_segments[0] if path_segments else None
    elif host in _LONG_HOSTS:
        if parsed.path == "/watch":
            video_id = parse_qs(parsed.query).get("v", [None])[0]
        elif path_segments and path_segments[0] in _PATH_PREFIXES_WITH_ID:
            video_id = path_segments[1] if len(path_segments) > 1 else None

    if not video_id or not _VIDEO_ID_PATTERN.fullmatch(video_id):
        raise ValueError("Could not extract a valid YouTube video id from input.")

    return video_id


def _fetch_transcript(value) -> str:
    video_id = _extract_video_id(value)
    fetched_transcript = YouTubeTranscriptApi().fetch(video_id)
    return " ".join(snippet.text for snippet in fetched_transcript).strip()


class YouTubeExtractor(SourceExtractor):
    source_type = "youtube"

    def extract(self, request) -> ExtractionResult:
        source_url = request.data.get("source_url")
        try:
            transcript = _fetch_transcript(source_url)
        except Exception:
            logger.exception("YouTube transcript fetch failed for %s", source_url)
            return ExtractionResult(
                is_success=False,
                error="Could not fetch a transcript for this YouTube video.",
            )
        return ExtractionResult(is_success=True, content=transcript)
