from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from backend.app.database.session import get_db
from backend.app.core.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "version": "1.0.0"
    }


@router.get("/readiness")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT 1"))
        db_ok = bool(result.scalar_one())
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

    return {
        "status": "ready",
        "database": "connected" if db_ok else "disconnected",
        "voice_engine": "ready",
        "calling_queue": "ready"
    }
