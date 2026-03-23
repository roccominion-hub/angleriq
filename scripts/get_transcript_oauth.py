"""
YouTube transcript fetcher using OAuth 2.0 + YouTube Data API v3.

First run: opens a browser for one-time Google login, saves token.json.
Subsequent runs: uses saved token automatically (auto-refreshes).

Usage:
  python3 get_transcript_oauth.py <video_id>

Requires:
  pip3 install google-auth google-auth-oauthlib google-api-python-client
  google_oauth_client.json in this directory (downloaded from Google Cloud Console)
"""

import sys
import os
import re
import json
import base64
import requests

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CLIENT_FILE = os.path.join(SCRIPT_DIR, 'google_oauth_client.json')
TOKEN_FILE  = os.path.join(SCRIPT_DIR, 'google_token.json')

SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']

def get_credentials():
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'w') as f:
            f.write(creds.to_json())

    return creds

def get_caption_track_url(video_id: str, access_token: str) -> str | None:
    """Get the URL for the English caption track via YouTube Data API."""
    url = f'https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId={video_id}'
    r = requests.get(url, headers={'Authorization': f'Bearer {access_token}'})
    data = r.json()

    if 'error' in data:
        raise Exception(data['error']['message'])

    items = data.get('items', [])
    # Prefer manual English captions, fall back to auto-generated
    for item in items:
        s = item['snippet']
        if s.get('language') == 'en' and s.get('trackKind') != 'asr':
            return item['id']
    for item in items:
        s = item['snippet']
        if s.get('language') == 'en':
            return item['id']

    return None

def download_caption(caption_id: str, access_token: str) -> str:
    """Download caption content in SRT format."""
    url = f'https://www.googleapis.com/youtube/v3/captions/{caption_id}?tfmt=srt'
    r = requests.get(url, headers={'Authorization': f'Bearer {access_token}'})
    if r.status_code != 200:
        raise Exception(f'Caption download failed: {r.status_code}')
    return r.text

def parse_srt(srt: str) -> str:
    """Strip SRT timestamps and return clean text."""
    text = re.sub(r'\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n', ' ', srt)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\[.*?\]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def fallback_cookie_transcript(video_id: str) -> str | None:
    """Fall back to cookie-based method if OAuth captions aren't available."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi

        COOKIE_FILE = os.path.join(SCRIPT_DIR, 'youtube_cookies.txt')
        if os.path.exists(COOKIE_FILE):
            session = requests.Session()
            with open(COOKIE_FILE) as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'): continue
                    parts = line.split('\t')
                    if len(parts) < 7: continue
                    domain, _, path, secure, expires, name, value = parts[:7]
                    session.cookies.set(name, value, domain=domain.lstrip('.'), path=path)
            api = YouTubeTranscriptApi(http_client=session)
        else:
            api = YouTubeTranscriptApi()

        t = api.fetch(video_id, languages=['en'])
        text = ' '.join([s.text for s in t])
        text = re.sub(r'\[.*?\]', '', text)
        return re.sub(r'\s+', ' ', text).strip()
    except Exception:
        return None

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: get_transcript_oauth.py <video_id>', file=sys.stderr)
        sys.exit(1)

    video_id = sys.argv[1]

    if not os.path.exists(CLIENT_FILE):
        # OAuth not set up yet — fall back to cookie method
        result = fallback_cookie_transcript(video_id)
        if result:
            print(result)
        else:
            sys.stderr.write('No transcript available (OAuth not configured, cookie method failed)\n')
            sys.exit(1)
        sys.exit(0)

    try:
        creds = get_credentials()
        caption_id = get_caption_track_url(video_id, creds.token)

        if caption_id:
            srt = download_caption(caption_id, creds.token)
            text = parse_srt(srt)
            if len(text) > 100:
                print(text)
                sys.exit(0)

        # No official captions — try cookie fallback
        result = fallback_cookie_transcript(video_id)
        if result:
            print(result)
        else:
            sys.stderr.write(f'No transcript available for {video_id}\n')
            sys.exit(1)

    except Exception as e:
        # OAuth failed — try cookie fallback
        result = fallback_cookie_transcript(video_id)
        if result:
            print(result)
        else:
            sys.stderr.write(str(e) + '\n')
            sys.exit(1)
