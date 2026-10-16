from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite:///./data/video_hub.db"
    TMDB_API_KEY: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()

# Ensure local data directory exists for SQLite
Path("./data").mkdir(parents=True, exist_ok=True)