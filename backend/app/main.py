from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.database.init_db import init_database, seed_initial_users
from backend.app.api.v1 import v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables and default users exist
    await init_database()
    await seed_initial_users()
    yield
    # Shutdown logic if any


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Voice Intelligence and Responsible Debt Collection Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API V1 router
app.include_router(v1_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "message": "Welcome to VOXGUARD Voice Intelligence Platform API",
        "docs": "/docs",
        "version": "1.0.0",
        "status": "operational"
    }
