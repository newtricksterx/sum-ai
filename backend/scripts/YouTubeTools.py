import re
from urllib.parse import parse_qs, urlparse

from youtube_transcript_api import YouTubeTranscriptApi

YOUTUBE_SHORT_HOSTS = {"youtu.be", "www.youtu.be"}
YOUTUBE_LONG_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
}


def isYouTubeURL(url):
    """
    Return True only for supported YouTube video URL shapes.
    """
    if not isinstance(url, str):
        return False

    candidate = url.strip()
    if not candidate:
        return False

    try:
        parsed = urlparse(candidate)
    except Exception:
        return False

    if parsed.scheme not in {"http", "https"}:
        return False

    host = parsed.netloc.lower().split(":")[0]
    path_segments = [segment for segment in parsed.path.split("/") if segment]
    video_id = None

    # Short URL: https://youtu.be/<id>
    if host in YOUTUBE_SHORT_HOSTS:
        video_id = path_segments[0] if path_segments else None

    # Long URL forms from youtube.com
    elif host in YOUTUBE_LONG_HOSTS:
        if parsed.path == "/watch":
            video_id = parse_qs(parsed.query).get("v", [None])[0]
        elif path_segments and path_segments[0] in {"shorts", "embed", "v", "live"}:
            video_id = path_segments[1] if len(path_segments) > 1 else None

    if not video_id:
        return False

    # Standard YouTube video IDs are 11 chars.
    return bool(re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id))


def getVideoID(value):
    if not isinstance(value, str):
        raise ValueError("YouTube URL or video id must be a string.")

    candidate = value.strip()
    if not candidate:
        raise ValueError("Missing YouTube URL or video id.")

    # Allow direct video IDs.
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", candidate):
        return candidate

    parsed = urlparse(candidate)
    host = parsed.netloc.lower().split(":")[0]
    path_segments = [segment for segment in parsed.path.split("/") if segment]
    video_id = None

    if host in YOUTUBE_SHORT_HOSTS:
        video_id = path_segments[0] if path_segments else None
    elif host in YOUTUBE_LONG_HOSTS:
        if parsed.path == "/watch":
            video_id = parse_qs(parsed.query).get("v", [None])[0]
        elif path_segments and path_segments[0] in {"shorts", "embed", "v", "live"}:
            video_id = path_segments[1] if len(path_segments) > 1 else None

    if not video_id or not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        raise ValueError("Could not extract a valid YouTube video id from input.")

    return video_id


def getTranscript(value):
    videoID = getVideoID(value)

    ytt_api = YouTubeTranscriptApi()
    fetched_transcript = ytt_api.fetch(videoID)

    return " ".join(snippet.text for snippet in fetched_transcript).strip()


#getTranscript("MDTT8szI7ko")
#getTranscript("https://www.youtube.com/watch?v=MDTT8szI7ko")
