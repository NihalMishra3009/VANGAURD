from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database.session import get_db
from backend.app.schemas.auth import LoginRequest, TokenResponse
from backend.app.schemas.user import UserResponse
from backend.app.repositories.user_repo import UserRepository
from backend.app.repositories.audit_repo import AuditRepository
from backend.app.core.security import verify_password, create_access_token
from backend.app.api.deps import get_current_user
from backend.app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    user = await repo.get_by_email(login_data.email)
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        audit_repo = AuditRepository(db)
        await audit_repo.log(
            action="LOGIN_FAILED",
            resource_type="AUTH",
            resource_id=login_data.email,
            details={"reason": "Invalid credentials"},
            ip_address=request.client.host if request.client else None
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    token = create_access_token(subject=user.id, role=user.role.value)
    
    # Audit successful login
    audit_repo = AuditRepository(db)
    await audit_repo.log(
        action="LOGIN_SUCCESS",
        resource_type="USER",
        resource_id=str(user.id),
        user_id=user.id,
        details={"email": user.email, "role": user.role.value},
        ip_address=request.client.host if request.client else None
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_authenticated_user(
    current_user: User = Depends(get_current_user)
):
    return UserResponse.model_validate(current_user)


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    audit_repo = AuditRepository(db)
    await audit_repo.log(
        action="LOGOUT",
        resource_type="USER",
        resource_id=str(current_user.id),
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return {"message": "Successfully logged out"}
