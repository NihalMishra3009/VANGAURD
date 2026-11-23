from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.campaign import Campaign, CampaignBorrower
from backend.app.models.borrower import Borrower
from backend.app.models.enums import CallStatus, EligibilityStatus, CampaignStatus
from backend.app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignStats


class CampaignRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, campaign_in: CampaignCreate, user_id: Optional[int] = None) -> Campaign:
        campaign = Campaign(
            name=campaign_in.name,
            description=campaign_in.description,
            target_language=campaign_in.target_language,
            status=campaign_in.status.value,
            start_date=campaign_in.start_date,
            end_date=campaign_in.end_date,
            retry_limit=campaign_in.retry_limit,
            cooling_off_hours=campaign_in.cooling_off_hours,
            priority_weight=campaign_in.priority_weight,
            created_by_id=user_id
        )
        self.db.add(campaign)
        await self.db.flush()
        await self.db.refresh(campaign)
        return campaign

    async def get_by_id(self, campaign_id: int) -> Optional[Campaign]:
        result = await self.db.execute(select(Campaign).where(Campaign.id == campaign_id))
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Campaign]:
        result = await self.db.execute(select(Campaign).where(Campaign.name == name))
        return result.scalar_one_or_none()

    async def list_campaigns(
        self,
        status: Optional[str] = None,
        language: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Campaign], int]:
        stmt = select(Campaign)
        count_stmt = select(func.count(Campaign.id))
        filters = []

        if status and status.upper() != "ALL":
            filters.append(Campaign.status == status.upper())

        if language and language.lower() != "all":
            filters.append(Campaign.target_language.ilike(language))

        if filters:
            stmt = stmt.where(and_(*filters))
            count_stmt = count_stmt.where(and_(*filters))

        total_count = (await self.db.execute(count_stmt)).scalar_one()

        stmt = stmt.order_by(desc(Campaign.id)).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total_count

    async def get_campaign_stats(self, campaign_id: int) -> CampaignStats:
        """Calculate aggregated progress metrics for a campaign."""
        # Status distribution in campaign_borrowers
        status_stmt = (
            select(CampaignBorrower.calling_status, func.count(CampaignBorrower.id))
            .where(CampaignBorrower.campaign_id == campaign_id)
            .group_by(CampaignBorrower.calling_status)
        )
        rows = (await self.db.execute(status_stmt)).all()
        status_results: Dict[str, int] = {str(r[0]): int(r[1]) for r in rows}

        # Outstanding balance sum for borrowers assigned to this campaign
        sum_stmt = (
            select(func.coalesce(func.sum(Borrower.outstanding_amount), 0.0))
            .join(CampaignBorrower, CampaignBorrower.borrower_id == Borrower.id)
            .where(CampaignBorrower.campaign_id == campaign_id)
        )
        total_balance = float((await self.db.execute(sum_stmt)).scalar_one())

        total_assigned = sum(status_results.values())

        return CampaignStats(
            total_assigned=total_assigned,
            queued=status_results.get(CallStatus.QUEUED.value, 0),
            in_progress=status_results.get(CallStatus.IN_PROGRESS.value, 0),
            completed=status_results.get(CallStatus.COMPLETED.value, 0),
            failed=status_results.get(CallStatus.FAILED.value, 0),
            escalated=status_results.get(CallStatus.ESCALATED.value, 0),
            safe_terminated=status_results.get(CallStatus.SAFE_TERMINATED.value, 0),
            total_outstanding_amount=total_balance
        )

    async def assign_borrowers(
        self,
        campaign_id: int,
        borrower_ids: List[int],
        priority: int = 1
    ) -> Dict[str, Any]:
        """
        Assign eligible borrowers to a campaign batch with:
        - Restriction check (DO_NOT_CALL, INELIGIBLE, stop_contact)
        - In-campaign duplicate check (UNIQUE constraint)
        - Simultaneous active call prevention across all campaigns
        """
        campaign = await self.get_by_id(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign #{campaign_id} not found.")

        # 1. Fetch requested borrowers
        borrowers_stmt = select(Borrower).where(Borrower.id.in_(borrower_ids))
        borrowers = list((await self.db.execute(borrowers_stmt)).scalars().all())
        borrower_map = {b.id: b for b in borrowers}

        # 2. Check already assigned to this campaign
        existing_assigned_stmt = select(CampaignBorrower.borrower_id).where(
            and_(
                CampaignBorrower.campaign_id == campaign_id,
                CampaignBorrower.borrower_id.in_(borrower_ids)
            )
        )
        already_assigned = set((await self.db.execute(existing_assigned_stmt)).scalars().all())

        # 3. Check currently in active call across ANY campaign (simultaneous duplicate call protection)
        active_calls_stmt = select(CampaignBorrower.borrower_id).where(
            and_(
                CampaignBorrower.borrower_id.in_(borrower_ids),
                CampaignBorrower.is_active_call == True
            )
        )
        active_in_call = set((await self.db.execute(active_calls_stmt)).scalars().all())

        assigned_count = 0
        skipped_records: List[Dict[str, Any]] = []

        for b_id in borrower_ids:
            borrower = borrower_map.get(b_id)
            if not borrower:
                skipped_records.append({"borrower_id": b_id, "reason": "Borrower record not found."})
                continue

            # Check restriction rules
            if borrower.stop_contact:
                skipped_records.append({"borrower_id": b_id, "borrower_name": borrower.name, "reason": "Stop-Contact requested by borrower."})
                continue

            if borrower.eligibility_status == EligibilityStatus.DO_NOT_CALL:
                skipped_records.append({"borrower_id": b_id, "borrower_name": borrower.name, "reason": "Borrower marked DO_NOT_CALL."})
                continue

            if borrower.eligibility_status == EligibilityStatus.INELIGIBLE:
                skipped_records.append({"borrower_id": b_id, "borrower_name": borrower.name, "reason": "Borrower account is marked INELIGIBLE (Zero balance)."})
                continue

            if b_id in already_assigned:
                skipped_records.append({"borrower_id": b_id, "borrower_name": borrower.name, "reason": "Already assigned to this campaign."})
                continue

            # Create assignment
            cb = CampaignBorrower(
                campaign_id=campaign_id,
                borrower_id=b_id,
                priority=priority,
                calling_status=CallStatus.QUEUED.value,
                retry_count=0,
                is_active_call=(b_id in active_in_call)
            )
            self.db.add(cb)
            assigned_count += 1

        await self.db.flush()
        return {
            "campaign_id": campaign_id,
            "assigned_count": assigned_count,
            "skipped_count": len(skipped_records),
            "skipped_details": skipped_records
        }

    async def list_campaign_borrowers(
        self,
        campaign_id: int,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[CampaignBorrower], int]:
        stmt = (
            select(CampaignBorrower)
            .where(CampaignBorrower.campaign_id == campaign_id)
            .options(selectinload(CampaignBorrower.borrower))
        )
        count_stmt = select(func.count(CampaignBorrower.id)).where(CampaignBorrower.campaign_id == campaign_id)

        if status and status.upper() != "ALL":
            stmt = stmt.where(CampaignBorrower.calling_status == status.upper())
            count_stmt = count_stmt.where(CampaignBorrower.calling_status == status.upper())

        total_count = (await self.db.execute(count_stmt)).scalar_one()

        stmt = stmt.order_by(CampaignBorrower.priority.asc(), CampaignBorrower.id.asc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total_count

    async def update(self, campaign: Campaign, update_in: CampaignUpdate) -> Campaign:
        update_data = update_in.model_dump(exclude_unset=True)
        if "status" in update_data and update_data["status"]:
            update_data["status"] = update_data["status"].value
        for field, value in update_data.items():
            setattr(campaign, field, value)
        await self.db.flush()
        await self.db.refresh(campaign)
        return campaign
