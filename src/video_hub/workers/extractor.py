import yt_dlp
import requests
from video_hub.config import settings

def extract_video_metadata(url: str):
    """
    Extracts direct media stream URLs, native YouTube thumbnails, 
    and metadata using yt-dlp without downloading the file to disk.
    """
    ydl_opts = {
        'extract_flat': False,
        'skip_download': True,
        'js_runtimes': 'node',
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            title = info.get('title', 'Unknown Title')
            duration = info.get('duration', 0)
            
            # 1. Primary Poster: YouTube's native high-res thumbnail
            poster_url = info.get('thumbnail')

            # 2. Extract direct media stream URL for the client to pull
            stream_url = info.get('url')
            if not stream_url and 'formats' in info:
                best_format = info['formats'][-1]
                stream_url = best_format.get('url')

            return {
                "title": title,
                "duration": duration,
                "stream_url": stream_url,
                "poster_url": poster_url,
                "status": "ready"
            }
    except Exception as e:
        print(f"Extraction failed for {url}: {str(e)}")
        return {"status": "failed"}