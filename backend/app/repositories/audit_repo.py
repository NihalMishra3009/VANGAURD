from typing import Optional, List, Dict, Any
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.audit import AuditLog


class AuditRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        user_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address
        )
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        return entry

    async def get_logs(self, skip: int = 0, limit: int = 100) -> List[AuditLog]:
        stmt = select(AuditLog).order_by(desc(AuditLog.id)).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
