import asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

async def run_scenarios():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post("/api/v1/auth/login", json={"email": "campaign@voxguard.bank", "password": "VoxGuard@2026"})
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        tests = [
            ("Medical Problem", "Ghar me medical emergency aa gayi thi isliye payment nahi kar paya", 0.03, 140.0),
            ("Angry Outburst", "Tum log baar baar call karke dimaag mat kharab karo samjhe, badtameez kahi ke!", 0.18, 260.0),
            ("Manager Request", "Mujhe kisi senior manager se baat karni hai abhi", 0.10, 195.0),
            ("Willing to Pay", "Theek hai main kal shaam tak online UPI se pay kar dunga", 0.05, 160.0)
        ]

        for label, text, energy, pitch in tests:
            r = await client.post("/api/v1/calling/sessions/dialogue", json={
                "session_uuid": "live-test-uuid",
                "borrower_statement": text,
                "borrower_name": "Aarav Sharma",
                "measured_energy": energy,
                "measured_pitch": pitch
            }, headers=headers)
            d = r.json()
            print(f"=== {label} ===")
            print(f"Borrower: {text}")
            print(f"Emotion: {d['predicted_emotion']} ({int(d['confidence']*100)}%) | Action: {d['safety_action']} | Handoff: {d['is_handoff_triggered']}")
            print(f"Officer: {d['ai_response']}\n")

if __name__ == "__main__":
    asyncio.run(run_scenarios())
