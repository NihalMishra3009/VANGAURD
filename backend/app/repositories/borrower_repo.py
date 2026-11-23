from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.borrower import Borrower
from backend.app.models.campaign import CampaignBorrower
from backend.app.models.call import CallSession, CallAttempt, Commitment
from backend.app.schemas.borrower import BorrowerFilterParams, BorrowerUpdate, BorrowerCreate


class BorrowerRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, pk: int) -> Optional[Borrower]:
        result = await self.db.execute(select(Borrower).where(Borrower.id == pk))
        return result.scalar_one_or_none()

    async def get_by_borrower_id(self, borrower_id: str) -> Optional[Borrower]:
        result = await self.db.execute(select(Borrower).where(Borrower.borrower_id == borrower_id))
        return result.scalar_one_or_none()

    async def list_borrowers(self, params: BorrowerFilterParams) -> Tuple[List[Borrower], int]:
        stmt = select(Borrower)
        count_stmt = select(func.count(Borrower.id))
        filters = []

        if params.search:
            search_term = f"%{params.search.strip()}%"
            filters.append(
                or_(
                    Borrower.borrower_id.ilike(search_term),
                    Borrower.name.ilike(search_term),
                    Borrower.phone.ilike(search_term),
                    Borrower.account_number.ilike(search_term)
                )
            )

        if params.preferred_language and params.preferred_language.lower() != "all":
            filters.append(Borrower.preferred_language.ilike(params.preferred_language))

        if params.eligibility_status:
            filters.append(Borrower.eligibility_status == params.eligibility_status)

        if params.stop_contact is not None:
            filters.append(Borrower.stop_contact == params.stop_contact)

        if params.min_outstanding is not None:
            filters.append(Borrower.outstanding_amount >= params.min_outstanding)

        if params.max_outstanding is not None:
            filters.append(Borrower.outstanding_amount <= params.max_outstanding)

        if params.due_date_from:
            filters.append(Borrower.due_date >= params.due_date_from)

        if params.due_date_to:
            filters.append(Borrower.due_date <= params.due_date_to)

        if filters:
            stmt = stmt.where(and_(*filters))
            count_stmt = count_stmt.where(and_(*filters))

        total_count = (await self.db.execute(count_stmt)).scalar_one()

        stmt = stmt.order_by(Borrower.due_date.asc(), desc(Borrower.outstanding_amount))
        stmt = stmt.offset(params.skip).limit(params.limit)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total_count

    async def get_borrower_details(self, pk: int) -> Optional[Dict[str, Any]]:
        stmt = (
            select(Borrower)
            .where(Borrower.id == pk)
            .options(
                selectinload(Borrower.campaign_associations).selectinload(CampaignBorrower.campaign),
                selectinload(Borrower.call_sessions).selectinload(CallSession.attempts),
                selectinload(Borrower.commitments)
            )
        )
        result = await self.db.execute(stmt)
        borrower = result.scalar_one_or_none()
        if not borrower:
            return None

        # Build campaign history
        campaigns = []
        for assoc in borrower.campaign_associations:
            campaigns.append({
                "campaign_id": assoc.campaign_id,
                "campaign_name": assoc.campaign.name if assoc.campaign else "Unknown",
                "calling_status": assoc.calling_status,
                "retry_count": assoc.retry_count,
                "priority": assoc.priority,
                "assigned_at": assoc.created_at.isoformat() if assoc.created_at else None,
                "last_attempt_at": assoc.last_attempt_at.isoformat() if assoc.last_attempt_at else None
            })

        # Build call history
        recent_calls = []
        total_attempts = 0
        for session in borrower.call_sessions:
            total_attempts += len(session.attempts)
            recent_calls.append({
                "session_uuid": session.session_uuid,
                "status": session.status,
                "language": session.language,
                "start_time": session.start_time.isoformat() if session.start_time else None,
                "duration_seconds": session.duration_seconds,
                "final_outcome": session.final_outcome,
                "is_escalated": session.is_escalated,
                "escalation_reason": session.escalation_reason
            })

        # Build commitments history
        commitments = []
        for comm in borrower.commitments:
            commitments.append({
                "id": comm.id,
                "promised_amount": float(comm.promised_amount),
                "promised_date": comm.promised_date.isoformat(),
                "payment_method": comm.payment_method,
                "explicitly_confirmed": comm.explicitly_confirmed,
                "created_at": comm.created_at.isoformat() if comm.created_at else None
            })

        return {
            "borrower": borrower,
            "campaign_history": campaigns,
            "call_attempts_count": total_attempts,
            "recent_calls": recent_calls,
            "commitments_history": commitments
        }

    async def update(self, borrower: Borrower, update_in: BorrowerUpdate) -> Borrower:
        update_data = update_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(borrower, field, value)
        await self.db.flush()
        await self.db.refresh(borrower)
        return borrower
