import io
import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_borrower_template_download(client: AsyncClient):
    # CSV template
    resp_csv = await client.get("/api/v1/borrowers/template?format=csv")
    assert resp_csv.status_code == 200
    assert "borrower_id" in resp_csv.text

    # Excel template
    resp_xlsx = await client.get("/api/v1/borrowers/template?format=xlsx")
    assert resp_xlsx.status_code == 200
    assert len(resp_xlsx.content) > 1000


@pytest.mark.asyncio
async def test_upload_preview_and_commit(client: AsyncClient):
    uid = uuid.uuid4().hex[:6].upper()
    b1_id = f"BW-{uid}-01"
    b2_id = f"BW-{uid}-02"
    b3_id = f"BW-{uid}-03"

    # 1. Login as Campaign Manager
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "campaign@voxguard.bank", "password": "VoxGuard@2026"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create sample CSV data in memory
    sample_csv = (
        f"borrower_id,name,phone,preferred_language,emi_amount,outstanding_amount,due_date,account_number\n"
        f"{b1_id},Test Borrower One,9876543210,English,5000,15000,2026-11-01,LOAN-001\n"
        f"{b2_id},Test Borrower Two,+91 9822334455,Hindi,7500,22500,2026-11-10,LOAN-002\n"
        f"{b3_id},Test Invalid Phone,12345,Marathi,4000,12000,2026-11-05,LOAN-003\n"
        f"{b1_id},Duplicate In File,9876543210,English,5000,15000,2026-11-01,LOAN-004\n"
    )

    files = {"file": ("test_upload.csv", sample_csv.encode("utf-8"), "text/csv")}

    # 3. Request Preview
    preview_resp = await client.post(
        "/api/v1/borrowers/upload-preview",
        headers=headers,
        files=files
    )
    assert preview_resp.status_code == 200
    data = preview_resp.json()
    assert data["total_rows"] == 4
    assert data["valid_count"] == 2
    assert data["invalid_count"] == 2 # 1 invalid phone + 1 duplicate ID
    assert len(data["valid_rows"]) == 2
    batch_id = data["batch_id"]

    # Check phone normalization on valid row 1
    assert data["valid_rows"][0]["phone"] == "+919876543210"

    # 4. Commit Upload
    commit_resp = await client.post(
        "/api/v1/borrowers/upload-commit",
        headers=headers,
        json={"batch_id": batch_id}
    )
    assert commit_resp.status_code == 200
    commit_data = commit_resp.json()
    assert commit_data["imported_count"] == 2
    assert commit_data["status"] == "COMPLETED"

    # 5. Verify borrowers exist in directory
    list_resp = await client.get(f"/api/v1/borrowers?search={b1_id}", headers=headers)
    assert list_resp.status_code == 200
    items = list_resp.json()["items"]
    assert len(items) == 1
    assert items[0]["borrower_id"] == b1_id
    assert items[0]["name"] == "Test Borrower One"
    assert "XXXX" in items[0]["masked_phone"] # Privacy masking verified
    borrower_pk = items[0]["id"]

    # 6. Verify single borrower detail
    detail_resp = await client.get(f"/api/v1/borrowers/{borrower_pk}", headers=headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["borrower_id"] == b1_id
    assert "campaign_history" in detail

    # 7. Update borrower stop-contact flag
    update_resp = await client.patch(
        f"/api/v1/borrowers/{borrower_pk}",
        headers=headers,
        json={"stop_contact": True, "dispute_status": "DISPUTED"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["stop_contact"] is True
    assert update_resp.json()["dispute_status"] == "DISPUTED"
