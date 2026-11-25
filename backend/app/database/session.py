import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession
)
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker, Session
from backend.app.core.config import settings

# Check if SQLite dev fallback is requested or if PostgreSQL is unreachable in dev
USE_SQLITE = "sqlite" in settings.DATABASE_URL or os.environ.get("VOXGUARD_DB_FALLBACK", "").lower() in ("true", "1")

if USE_SQLITE:
    sqlite_path = os.path.join(os.getcwd(), "data", "voxguard_dev.db")
    os.makedirs(os.path.dirname(sqlite_path), exist_ok=True)
    db_url = f"sqlite+aiosqlite:///{sqlite_path}"
    sync_db_url = f"sqlite:///{sqlite_path}"
    async_engine = create_async_engine(
        db_url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )
    sync_engine = create_engine(
        sync_db_url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )
else:
    # Async Engine for FastAPI handlers
    async_engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )
    sync_engine = create_engine(
        settings.DATABASE_URL_SYNC,
        echo=False,
        pool_pre_ping=True
    )

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
