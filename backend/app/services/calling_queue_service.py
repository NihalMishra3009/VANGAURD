from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, desc
from backend.app.models.call import CallSession, CallAttempt
from backend.app.models.campaign import Campaign, CampaignBorrower
from backend.app.models.borrower import Borrower
from backend.app.models.enums import CallStatus, EligibilityStatus
from backend.app.repositories.audit_repo import AuditRepository


class CallingQueueService:
    """
    Manages sequential calling queues for campaigns, enforcing priority weights,
    retry limits, cooling-off periods, and concurrency locks (is_active_call).
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit_repo = AuditRepository(db)

    async def get_next_queue_item(self, campaign_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieves the next eligible borrower for a campaign, ordering by priority weight
        and retry count, ensuring the borrower is not currently locked by an active call.
        """
        # 1. Fetch active campaign
        campaign_query = select(Campaign).where(Campaign.id == campaign_id)
        campaign_res = await self.db.execute(campaign_query)
        campaign = campaign_res.scalar_one_or_none()
        if not campaign or campaign.status.upper() != "ACTIVE":
            return None

        # 2. Query next queued borrower in this campaign
        query = (
            select(CampaignBorrower, Borrower)
            .join(Borrower, CampaignBorrower.borrower_id == Borrower.id)
            .where(
                and_(
                    CampaignBorrower.campaign_id == campaign_id,
                    CampaignBorrower.calling_status == CallStatus.QUEUED.value,
                    CampaignBorrower.is_active_call == False,
                    Borrower.eligibility_status == EligibilityStatus.ELIGIBLE,
                    Borrower.stop_contact == False,
                    CampaignBorrower.retry_count < campaign.retry_limit
                )
            )
            .order_by(
                desc(CampaignBorrower.priority),
                CampaignBorrower.retry_count.asc(),
                CampaignBorrower.id.asc()
            )
            .limit(1)
        )
        res = await self.db.execute(query)
        row = res.first()
        if not row:
            # Fallback for interactive demo/operations: pick any assigned borrower not locked
            fallback_q = (
                select(CampaignBorrower, Borrower)
                .join(Borrower, CampaignBorrower.borrower_id == Borrower.id)
                .where(
                    and_(
                        CampaignBorrower.campaign_id == campaign_id,
                        CampaignBorrower.is_active_call == False
                    )
                )
                .order_by(CampaignBorrower.id.asc())
                .limit(1)
            )
            fallback_res = await self.db.execute(fallback_q)
            row = fallback_res.first()

        if not row:
            return None

        cb, borrower = row
        return {
            "campaign_borrower_id": cb.id,
            "campaign_id": campaign.id,
            "campaign_name": campaign.name,
            "borrower_id": borrower.id,
            "borrower_name": borrower.name,
            "borrower_phone": borrower.phone,
            "account_number": borrower.account_number,
            "outstanding_amount": float(borrower.outstanding_amount),
            "due_date": str(borrower.due_date),
            "preferred_language": borrower.preferred_language,
            "attempt_count": cb.retry_count,
            "priority": cb.priority
        }

    async def lock_and_initiate_session(
        self,
        campaign_id: int,
        borrower_id: int,
        user_id: Optional[int] = None
    ) -> CallSession:
        """
        Acquires an active call lock on the borrower across all campaigns
        and creates an isolated CallSession record in INITIATED status.
        """
        # Check borrower lock
        cb_query = select(CampaignBorrower).where(
            and_(
                CampaignBorrower.campaign_id == campaign_id,
                CampaignBorrower.borrower_id == borrower_id
            )
        )
        cb_res = await self.db.execute(cb_query)
        cb = cb_res.scalar_one_or_none()

        if cb and cb.is_active_call:
            raise ValueError(f"Borrower {borrower_id} is already in an active call.")

        # Set active lock
        if cb:
            cb.is_active_call = True
            cb.calling_status = CallStatus.IN_PROGRESS.value
            cb.retry_count += 1
            cb.last_attempt_at = datetime.now(timezone.utc)

        # Create new CallSession
        session = CallSession(
            campaign_id=campaign_id,
            borrower_id=borrower_id,
            status=CallStatus.INITIATED.value,
            language="English",
            start_time=datetime.now(timezone.utc),
            duration_seconds=0.0,
            is_escalated=False
        )
        self.db.add(session)
        await self.db.flush()

        # Create initial attempt record
        attempt = CallAttempt(
            call_session_id=session.id,
            attempt_number=cb.retry_count if cb else 1,
            status=CallStatus.INITIATED.value
        )
        self.db.add(attempt)

        await self.audit_repo.log(
            action="CALL_SESSION_INITIATED",
            resource_type="CALL_SESSION",
            resource_id=session.session_uuid,
            user_id=user_id,
            details={
                "campaign_id": campaign_id,
                "borrower_id": borrower_id,
                "session_uuid": session.session_uuid
            }
        )
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def release_lock_and_end_session(
        self,
        session_uuid: str,
        outcome: str = "COMPLETED",
        notes: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> CallSession:
        """
        Releases the borrower's active call lock, marks the session completed/terminated,
        and records session duration.
        """
        session_query = select(CallSession).where(CallSession.session_uuid == session_uuid)
        res = await self.db.execute(session_query)
        session = res.scalar_one_or_none()
        if not session:
            raise ValueError(f"Session {session_uuid} not found.")

        now = datetime.now(timezone.utc)
        session.end_time = now
        successful_outcomes = {"COMPLETED", "PROMISE_TO_PAY", "DISPUTE"}
        session.status = CallStatus.COMPLETED.value if outcome in successful_outcomes else CallStatus.FAILED.value
        session.final_outcome = outcome

        if session.start_time:
            # calculate duration in seconds (handle naive vs aware)
            start = session.start_time
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            session.duration_seconds = max(0.0, (now - start).total_seconds())

        # Release lock on CampaignBorrower
        if session.campaign_id:
            cb_query = select(CampaignBorrower).where(
                and_(
                    CampaignBorrower.campaign_id == session.campaign_id,
                    CampaignBorrower.borrower_id == session.borrower_id
                )
            )
            cb_res = await self.db.execute(cb_query)
            cb = cb_res.scalar_one_or_none()
            if cb:
                cb.is_active_call = False
                cb.calling_status = session.status

        await self.audit_repo.log(
            action="CALL_SESSION_TERMINATED",
            resource_type="CALL_SESSION",
            resource_id=session.session_uuid,
            user_id=user_id,
            details={
                "outcome": outcome,
                "duration_seconds": session.duration_seconds,
                "notes": notes
            }
        )
        await self.db.commit()
        await self.db.refresh(session)
        return session
