import os
import yt_dlp
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from video_hub.database import get_db, VideoTask
from video_hub.workers.extractor import extract_video_metadata

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

class TaskCreate(BaseModel):
    url: str

@router.post("/", status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    # Check if URL already exists in database
    existing = db.query(VideoTask).filter(VideoTask.url == payload.url).first()
    if existing:
        return {
            "message": "Task already exists in queue", 
            "id": existing.id, 
            "title": existing.title,
            "status": existing.status
        }

    # Create initial record with 'processing' state
    new_task = VideoTask(url=payload.url, status="processing")
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    # Call extractor.py to get lightning-fast metadata (Title, Thumbnail, Duration)
    meta = extract_video_metadata(new_task.url)
    
    new_task.title = meta.get("title")
    new_task.duration = meta.get("duration")
    new_task.poster_url = meta.get("poster_url")
    new_task.status = meta.get("status", "ready")
    
    db.commit()
    db.refresh(new_task)

    return {
        "id": new_task.id,
        "title": new_task.title,
        "duration": new_task.duration,
        "status": new_task.status,
        "poster_url": new_task.poster_url
    }

@router.get("/")
def list_tasks(db: Session = Depends(get_db)):
    return db.query(VideoTask).order_by(VideoTask.created_at.desc()).all()

@router.get("/{task_id}/download")
def download_and_stream_video(task_id: int, db: Session = Depends(get_db)):
    task = db.query(VideoTask).filter(VideoTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Clean URL for on-demand extraction
    clean_url = task.url.split('&')[0] if '&' in task.url else task.url
    clean_url = clean_url.replace("m.youtube.com", "www.youtube.com")

    download_dir = os.path.abspath("temp_staging")
    os.makedirs(download_dir, exist_ok=True)
    
    ydl_opts = {
        'format': 'bestvideo+bestaudio/best',
        'merge_output_format': 'mp4',
        'outtmpl': os.path.join(download_dir, f'%(id)s_{task_id}.%(ext)s'),
        'js_runtimes': {'node': {}},
        'remote_components': {'ejs': 'github'},
        'noplaylist': True,
    }

    file_path = None
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(clean_url, download=True)
            video_id = info.get('id')
            file_path = os.path.join(download_dir, f"{video_id}_{task_id}.mp4")

        # Stream chunk-by-chunk to iPad, then auto-delete immediately
        def iterfile():
            try:
                with open(file_path, "rb") as f:
                    while chunk := f.read(16384):
                        yield chunk
            finally:
                if file_path and os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"Purged temporary file: {file_path}")

        safe_title = "".join(c for c in task.title if ord(c) < 128 and (c.isalnum() or c in (' ', '-', '_'))).rstrip()
        if not safe_title:
            safe_title = f"video_{task_id}"

        return StreamingResponse(
            iterfile(),
            media_type="video/mp4",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}.mp4"'}
        )

    except Exception as e:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")