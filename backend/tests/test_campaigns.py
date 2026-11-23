import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_campaign_lifecycle_and_assignment(client: AsyncClient):
    uid = uuid.uuid4().hex[:6].upper()
    camp_name = f"High Priority Campaign {uid}"

    # 1. Login as Admin
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@voxguard.bank", "password": "VoxGuard@2026"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create campaign
    create_resp = await client.post(
        "/api/v1/campaigns",
        headers=headers,
        json={
            "name": camp_name,
            "description": "Targeting 30+ days overdue accounts",
            "target_language": "English",
            "status": "DRAFT",
            "retry_limit": 3,
            "cooling_off_hours": 24
        }
    )
    assert create_resp.status_code == 201
    campaign = create_resp.json()
    campaign_id = campaign["id"]
    assert campaign["name"] == camp_name
    assert campaign["stats"]["total_assigned"] == 0

    # 3. Duplicate name rejection
    dup_resp = await client.post(
        "/api/v1/campaigns",
        headers=headers,
        json={"name": camp_name}
    )
    assert dup_resp.status_code == 400

    # 4. Ingest sample borrowers for assignment with unique IDs
    b1_id_str = f"CAMP-BW-1-{uid}"
    b2_id_str = f"CAMP-BW-2-{uid}"
    sample_csv = (
        f"borrower_id,name,phone,preferred_language,emi_amount,outstanding_amount,due_date\n"
        f"{b1_id_str},Eligible Borrower,9811223344,English,3000,9000,2026-11-01\n"
        f"{b2_id_str},Stop Contact Borrower,9822334455,English,4000,12000,2026-11-01\n"
    )
    files = {"file": ("camp_test.csv", sample_csv.encode("utf-8"), "text/csv")}
    prev_resp = await client.post("/api/v1/borrowers/upload-preview", headers=headers, files=files)
    batch_id = prev_resp.json()["batch_id"]
    await client.post("/api/v1/borrowers/upload-commit", headers=headers, json={"batch_id": batch_id})

    # Fetch borrowers
    b1_res = await client.get(f"/api/v1/borrowers?search={b1_id_str}", headers=headers)
    b2_res = await client.get(f"/api/v1/borrowers?search={b2_id_str}", headers=headers)
    b1_id = b1_res.json()["items"][0]["id"]
    b2_id = b2_res.json()["items"][0]["id"]

    # Mark b2 with stop_contact
    await client.patch(f"/api/v1/borrowers/{b2_id}", headers=headers, json={"stop_contact": True})

    # 5. Assign both to campaign -> b1 should succeed, b2 should be skipped due to stop_contact
    assign_resp = await client.post(
        f"/api/v1/campaigns/{campaign_id}/assign",
        headers=headers,
        json={"borrower_ids": [b1_id, b2_id], "priority": 1}
    )
    assert assign_resp.status_code == 200
    assign_data = assign_resp.json()
    assert assign_data["assigned_count"] == 1
    assert assign_data["skipped_count"] == 1
    assert "Stop-Contact" in assign_data["skipped_details"][0]["reason"]

    # 6. Check campaign stats
    camp_detail_resp = await client.get(f"/api/v1/campaigns/{campaign_id}", headers=headers)
    assert camp_detail_resp.status_code == 200
    stats = camp_detail_resp.json()["stats"]
    assert stats["total_assigned"] == 1
    assert stats["queued"] == 1
    assert stats["total_outstanding_amount"] == 9000.0

    # 7. Check campaign borrowers roster
    roster_resp = await client.get(f"/api/v1/campaigns/{campaign_id}/borrowers", headers=headers)
    assert roster_resp.status_code == 200
    roster = roster_resp.json()
    assert roster["total"] == 1
    assert roster["items"][0]["borrower"]["borrower_id"] == b1_id_str
    assert roster["items"][0]["calling_status"] == "QUEUED"

    # 8. Update campaign to ACTIVE
    update_resp = await client.patch(
        f"/api/v1/campaigns/{campaign_id}",
        headers=headers,
        json={"status": "ACTIVE"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "ACTIVE"
