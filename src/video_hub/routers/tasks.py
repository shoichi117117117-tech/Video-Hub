from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from video_hub.database import get_db, VideoTask
from video_hub.workers.extractor import extract_video_metadata

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

class TaskCreate(BaseModel):
    url: str

@router.post("/", status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    # Check if URL already exists in the database queue
    existing = db.query(VideoTask).filter(VideoTask.url == payload.url).first()
    if existing:
        return {
            "message": "Task already exists in queue", 
            "id": existing.id, 
            "title": existing.title,
            "status": existing.status,
            "stream_url": existing.stream_url
        }

    # Create initial queued record with 'processing' state
    new_task = VideoTask(url=payload.url, status="processing")
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    # Extract native YouTube title, duration, thumbnail, and stream URL instantly (zero disk usage)
    meta = extract_video_metadata(new_task.url)
    
    new_task.title = meta.get("title")
    new_task.duration = meta.get("duration")
    new_task.stream_url = meta.get("stream_url")
    new_task.poster_url = meta.get("poster_url")
    new_task.status = meta.get("status", "ready")
    
    db.commit()
    db.refresh(new_task)

    return {
        "id": new_task.id,
        "title": new_task.title,
        "duration": new_task.duration,
        "status": new_task.status,
        "poster_url": new_task.poster_url,
        "stream_url": new_task.stream_url
    }

@router.get("/")
def list_tasks(db: Session = Depends(get_db)):
    tasks = db.query(VideoTask).order_by(VideoTask.created_at.desc()).all()
    return tasks

@router.get("/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(VideoTask).filter(VideoTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task