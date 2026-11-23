import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@voxguard.bank", "password": "VoxGuard@2026"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@voxguard.bank"
    assert data["user"]["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@voxguard.bank", "password": "WrongPassword123!"}
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_current_user_me(client: AsyncClient):
    # 1. Login to get token
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@voxguard.bank", "password": "VoxGuard@2026"}
    )
    token = login_resp.json()["access_token"]

    # 2. Call /me with bearer token
    me_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_resp.status_code == 200
    user = me_resp.json()
    assert user["email"] == "admin@voxguard.bank"
    assert user["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_rbac_access_control(client: AsyncClient):
    # Collector login
    collector_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "collector@voxguard.bank", "password": "VoxGuard@2026"}
    )
    collector_token = collector_resp.json()["access_token"]

    # Collector trying to list audit logs (Allowed: ADMIN, SUPERVISOR) -> Should be 403 Forbidden
    audit_resp = await client.get(
        "/api/v1/audit-logs",
        headers={"Authorization": f"Bearer {collector_token}"}
    )
    assert audit_resp.status_code == 403

    # Admin login
    admin_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@voxguard.bank", "password": "VoxGuard@2026"}
    )
    admin_token = admin_resp.json()["access_token"]

    # Admin accessing audit logs -> Should be 200 OK
    admin_audit_resp = await client.get(
        "/api/v1/audit-logs",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_audit_resp.status_code == 200
    assert isinstance(admin_audit_resp.json(), list)
