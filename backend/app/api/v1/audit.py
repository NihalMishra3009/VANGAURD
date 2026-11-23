from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database.session import get_db
from backend.app.schemas.audit import AuditLogResponse
from backend.app.repositories.audit_repo import AuditRepository
from backend.app.models.user import User
from backend.app.models.enums import UserRole
from backend.app.api.deps import require_roles

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR)),
    db: AsyncSession = Depends(get_db)
):
    repo = AuditRepository(db)
    logs = await repo.get_logs(skip=skip, limit=limit)
    return [AuditLogResponse.model_validate(log) for log in logs]
