import os
from typing import List, Union, Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    APP_NAME: str = "VOXGUARD"
    APP_ENV: str = "development"
    DEBUG: bool = True

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v: Any) -> bool:
        if isinstance(v, str):
            return v.lower() in ("true", "1", "t", "yes", "debug")
        return bool(v)
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = "voxguard-dev-secret-key-replace-in-production-2026-xyz"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # PostgreSQL Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "voxguard"
    
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/voxguard"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/voxguard"
    
    # Storage
    STORAGE_DIR: str = "storage"
    RECORDINGS_DIR: str = "storage/recordings"
    REPORTS_DIR: str = "storage/reports"
    UPLOADS_DIR: str = "storage/uploads"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]


settings = Settings()

# Ensure directories exist
os.makedirs(settings.RECORDINGS_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
