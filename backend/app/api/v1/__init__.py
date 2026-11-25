from fastapi import APIRouter
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.users import router as users_router
from backend.app.api.v1.audit import router as audit_router
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.borrowers import router as borrowers_router
from backend.app.api.v1.campaigns import router as campaigns_router
from backend.app.api.v1.calling import router as calling_router

v1_router = APIRouter()
v1_router.include_router(health_router)
v1_router.include_router(auth_router)
v1_router.include_router(users_router)
v1_router.include_router(audit_router)
v1_router.include_router(borrowers_router)
v1_router.include_router(campaigns_router)
v1_router.include_router(calling_router)
