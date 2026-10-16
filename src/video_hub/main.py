from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from video_hub.config import settings
from video_hub.database import init_db
from video_hub.routers import tasks

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQLite database tables
    init_db()
    yield
    # Shutdown: Clean up resources if needed (none required for now)

app = FastAPI(
    title="Video Hub Control Plane",
    description="Zero-disk laptop orchestration server for direct-to-iPad video ingestion.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS so your iPad browser or frontend app can talk to the backend easily
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register your task management router
app.include_router(tasks.router)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "video-hub-control-plane",
        "storage_footprint": "0 bytes (zero-disk streaming orchestration active)"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "video_hub.main:app", 
        host=settings.HOST, 
        port=settings.PORT, 
        reload=settings.DEBUG
    )