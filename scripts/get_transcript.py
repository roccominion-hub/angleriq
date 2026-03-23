import sys
import re
import os
import requests
from youtube_transcript_api import YouTubeTranscriptApi

video_id = sys.argv[1]

# Load cookies for authenticated requests (avoids YouTube IP rate limiting)
COOKIE_FILE = os.path.join(os.path.dirname(__file__), 'youtube_cookies.txt')

def load_cookies_from_netscape(filepath):
    session = requests.Session()
    with open(filepath) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            parts = line.split('\t')
            if len(parts) < 7:
                continue
            domain, _, path, secure, expires, name, value = parts[:7]
            session.cookies.set(name, value, domain=domain.lstrip('.'), path=path)
    return session

try:
    if os.path.exists(COOKIE_FILE):
        http_client = load_cookies_from_netscape(COOKIE_FILE)
        api = YouTubeTranscriptApi(http_client=http_client)
    else:
        api = YouTubeTranscriptApi()

    t = api.fetch(video_id, languages=['en'])
    text = ' '.join([s.text for s in t])
    text = re.sub(r'\[.*?\]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    print(text)
except Exception as e:
    sys.stderr.write(str(e) + '\n')
    sys.exit(1)
