from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.models.enums import UserRole
from backend.app.api.deps import get_current_user, require_roles
from backend.app.repositories.campaign_repo import CampaignRepository
from backend.app.repositories.audit_repo import AuditRepository
from backend.app.schemas.campaign import (
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
    CampaignDetailResponse,
    CampaignBorrowerAssignRequest,
    CampaignBorrowerResponse
)

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign_in: CampaignCreate,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER)),
    db: AsyncSession = Depends(get_db)
):
    """Create a new debt collection campaign with targeting rules."""
    repo = CampaignRepository(db)
    existing = await repo.get_by_name(campaign_in.name)
    if existing:
        raise HTTPException(status_code=400, detail=f"Campaign with name '{campaign_in.name}' already exists.")

    new_campaign = await repo.create(campaign_in, user_id=current_user.id)
    stats = await repo.get_campaign_stats(new_campaign.id)

    # Audit Log
    audit_repo = AuditRepository(db)
    await audit_repo.log(
        action="CAMPAIGN_CREATED",
        resource_type="CAMPAIGN",
        resource_id=str(new_campaign.id),
        user_id=current_user.id,
        details={"name": new_campaign.name, "target_language": new_campaign.target_language},
        ip_address=request.client.host if request.client else None
    )

    resp = CampaignResponse.model_validate(new_campaign)
    resp.stats = stats
    return resp


@router.get("", response_model=Dict[str, Any])
async def list_campaigns(
    status: Optional[str] = None,
    language: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER, UserRole.SUPERVISOR)),
    db: AsyncSession = Depends(get_db)
):
    """List campaigns with live aggregated stats."""
    repo = CampaignRepository(db)
    items, total_count = await repo.list_campaigns(status=status, language=language, skip=skip, limit=limit)

    campaign_responses = []
    for c in items:
        stats = await repo.get_campaign_stats(c.id)
        c_resp = CampaignResponse.model_validate(c)
        c_resp.stats = stats
        campaign_responses.append(c_resp)

    return {
        "items": campaign_responses,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: int,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER, UserRole.SUPERVISOR)),
    db: AsyncSession = Depends(get_db)
):
    """Get single campaign details and aggregated calling metrics."""
    repo = CampaignRepository(db)
    campaign = await repo.get_by_id(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    stats = await repo.get_campaign_stats(campaign.id)
    resp = CampaignResponse.model_validate(campaign)
    resp.stats = stats
    return resp


@router.patch("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: int,
    update_in: CampaignUpdate,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER)),
    db: AsyncSession = Depends(get_db)
):
    """Update campaign parameters, status, or retry configuration."""
    repo = CampaignRepository(db)
    campaign = await repo.get_by_id(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    updated = await repo.update(campaign, update_in)
    stats = await repo.get_campaign_stats(updated.id)

    # Audit Log
    audit_repo = AuditRepository(db)
    await audit_repo.log(
        action="CAMPAIGN_UPDATED",
        resource_type="CAMPAIGN",
        resource_id=str(updated.id),
        user_id=current_user.id,
        details=update_in.model_dump(exclude_unset=True),
        ip_address=request.client.host if request.client else None
    )

    resp = CampaignResponse.model_validate(updated)
    resp.stats = stats
    return resp


@router.post("/{campaign_id}/assign", response_model=Dict[str, Any])
async def assign_borrowers_to_campaign(
    campaign_id: int,
    assign_req: CampaignBorrowerAssignRequest,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER)),
    db: AsyncSession = Depends(get_db)
):
    """
    Assign a batch of borrowers to a campaign.
    Enforces borrower eligibility, stop-contact status, in-campaign uniqueness,
    and simultaneous active call prevention.
    """
    repo = CampaignRepository(db)
    try:
        result = await repo.assign_borrowers(
            campaign_id=campaign_id,
            borrower_ids=assign_req.borrower_ids,
            priority=assign_req.priority
        )

        # Audit Log
        audit_repo = AuditRepository(db)
        await audit_repo.log(
            action="CAMPAIGN_BORROWERS_ASSIGNED",
            resource_type="CAMPAIGN",
            resource_id=str(campaign_id),
            user_id=current_user.id,
            details={
                "assigned_count": result["assigned_count"],
                "skipped_count": result["skipped_count"]
            },
            ip_address=request.client.host if request.client else None
        )

        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assign borrowers: {str(e)}")


@router.get("/{campaign_id}/borrowers", response_model=Dict[str, Any])
async def list_campaign_borrowers(
    campaign_id: int,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CAMPAIGN_MANAGER, UserRole.SUPERVISOR, UserRole.HUMAN_COLLECTOR)),
    db: AsyncSession = Depends(get_db)
):
    """List borrowers assigned to this campaign along with their individual calling states."""
    repo = CampaignRepository(db)
    items, total_count = await repo.list_campaign_borrowers(
        campaign_id=campaign_id,
        status=status,
        skip=skip,
        limit=limit
    )

    return {
        "items": [CampaignBorrowerResponse.model_validate(cb) for cb in items],
        "total": total_count,
        "skip": skip,
        "limit": limit
    }
