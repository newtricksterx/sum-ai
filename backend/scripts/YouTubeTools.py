from youtube_transcript_api import YouTubeTranscriptApi

def getVideoID(url):
    pass

def getTranscript(videoID):
    ytt_api = YouTubeTranscriptApi()
    fetched_transcript = ytt_api.fetch(videoID)

    text_transcript = ""

    for snippet in fetched_transcript:
        text_transcript += (" " + snippet.text)

    #print(text_transcript)

    return text_transcript


#getTranscript("FEVwyQyRJzk")