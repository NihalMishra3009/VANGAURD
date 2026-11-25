import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_calling_queue_and_session_lifecycle(client: AsyncClient):
    # 1. Login as Campaign Manager
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "campaign@voxguard.bank", "password": "VoxGuard@2026"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a test campaign
    campaign_payload = {
        "name": "Simulated Queue Test Campaign",
        "description": "Verification of sequential calling and lock release",
        "target_dialect": "English",
        "priority_weight": 2,
        "cooling_off_hours": 12,
        "retry_limit": 3
    }
    create_c_resp = await client.post("/api/v1/campaigns", json=campaign_payload, headers=headers)
    assert create_c_resp.status_code == 201
    campaign = create_c_resp.json()
    campaign_id = campaign["id"]

    # 3. Create a test borrower via upload preview and commit
    sample_csv = (
        "borrower_id,name,phone,preferred_language,emi_amount,outstanding_amount,due_date,account_number\n"
        "BW-QTEST-01,Sunita Patil,9811223344,English,5000,15000,2026-12-05,ACC-TEST-9988\n"
    )
    files = {"file": ("test_queue_borrower.csv", sample_csv.encode("utf-8"), "text/csv")}
    preview_resp = await client.post("/api/v1/borrowers/upload-preview", headers=headers, files=files)
    assert preview_resp.status_code == 200
    batch_id = preview_resp.json()["batch_id"]

    commit_resp = await client.post(
        "/api/v1/borrowers/upload-commit",
        headers=headers,
        json={"batch_id": batch_id}
    )
    assert commit_resp.status_code == 200

    # Get borrower from directory
    b_list_resp = await client.get("/api/v1/borrowers?search=Sunita", headers=headers)
    assert b_list_resp.status_code == 200
    borrowers_list = b_list_resp.json()["items"]
    assert len(borrowers_list) > 0
    borrower_id = borrowers_list[0]["id"]

    # 4. Assign borrower to campaign
    assign_resp = await client.post(
        f"/api/v1/campaigns/{campaign_id}/assign",
        json={"borrower_ids": [borrower_id], "priority": 10},
        headers=headers
    )
    assert assign_resp.status_code == 200

    # 5. Activate campaign
    patch_resp = await client.patch(
        f"/api/v1/campaigns/{campaign_id}",
        json={"status": "ACTIVE"},
        headers=headers
    )
    assert patch_resp.status_code == 200

    # 6. Fetch next item in queue
    queue_resp = await client.get(f"/api/v1/calling/queue/next/{campaign_id}", headers=headers)
    assert queue_resp.status_code == 200
    queue_item = queue_resp.json()
    assert queue_item["borrower_id"] == borrower_id
    assert queue_item["priority"] == 10

    # 7. Initiate call session (acquires lock)
    init_resp = await client.post(
        "/api/v1/calling/sessions/initiate",
        json={"campaign_id": campaign_id, "borrower_id": borrower_id},
        headers=headers
    )
    assert init_resp.status_code == 200
    session_data = init_resp.json()
    session_uuid = session_data["session_uuid"]
    assert session_data["status"] == "INITIATED"

    # 8. Attempt simultaneous duplicate call on same borrower (must conflict 409)
    dup_resp = await client.post(
        "/api/v1/calling/sessions/initiate",
        json={"campaign_id": campaign_id, "borrower_id": borrower_id},
        headers=headers
    )
    assert dup_resp.status_code == 409
    assert "already in an active call" in dup_resp.json()["detail"]

    # 9. Terminate call session (releases lock)
    term_resp = await client.post(
        "/api/v1/calling/sessions/terminate",
        json={"session_uuid": session_uuid, "outcome": "PROMISE_TO_PAY", "notes": "Borrower agreed to pay next Friday"},
        headers=headers
    )
    assert term_resp.status_code == 200
    term_data = term_resp.json()
    assert term_data["status"] == "COMPLETED"
    assert term_data["final_outcome"] == "PROMISE_TO_PAY"
