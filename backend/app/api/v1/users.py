from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database.session import get_db
from backend.app.schemas.user import UserCreate, UserUpdate, UserResponse
from backend.app.repositories.user_repo import UserRepository
from backend.app.repositories.audit_repo import AuditRepository
from backend.app.models.user import User
from backend.app.models.enums import UserRole
from backend.app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR)),
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    users = await repo.get_all(skip=skip, limit=limit)
    return [UserResponse.model_validate(u) for u in users]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    existing = await repo.get_by_email(user_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    
    new_user = await repo.create(user_in)
    
    audit_repo = AuditRepository(db)
    await audit_repo.log(
        action="USER_CREATED",
        resource_type="USER",
        resource_id=str(new_user.id),
        user_id=current_user.id,
        details={"created_email": new_user.email, "role": new_user.role.value},
        ip_address=request.client.host if request.client else None
    )
    return UserResponse.model_validate(new_user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: int,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR)),
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    updated = await repo.update(user, user_in)
    
    audit_repo = AuditRepository(db)
    await audit_repo.log(
        action="USER_UPDATED",
        resource_type="USER",
        resource_id=str(updated.id),
        user_id=current_user.id,
        details={"updated_fields": list(user_in.model_dump(exclude_unset=True).keys())},
        ip_address=request.client.host if request.client else None
    )
    return UserResponse.model_validate(updated)
