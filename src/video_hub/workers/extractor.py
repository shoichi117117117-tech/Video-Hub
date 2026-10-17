import yt_dlp

def extract_video_metadata(url: str):
    """
    Extracts only static metadata (title, duration, thumbnail) 
    without attempting to resolve brittle stream URLs.
    """
    clean_url = url.split('&')[0] if '&' in url else url
    clean_url = clean_url.replace("m.youtube.com", "www.youtube.com")

    ydl_opts = {
        'extract_flat': True,
        'skip_download': True,
        'js_runtimes': {'node': {}},
        'remote_components': {'ejs': 'github'},
        'noplaylist': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web']
            }
        }
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(clean_url, download=False)
            
            return {
                "title": info.get('title', 'Unknown Title'),
                "duration": info.get('duration', 0),
                "poster_url": info.get('thumbnail'),
                "status": "ready"
            }
    except Exception as e:
        print(f"Metadata extraction failed for {clean_url}: {str(e)}")
        return {"status": "failed"}