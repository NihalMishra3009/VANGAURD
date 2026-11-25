import asyncio
import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))

from backend.app.api.v1.calling import process_dialogue_turn, DialogueTurnRequest

async def main():
    print("Script started!", flush=True)
    cases = [
        ("i will pay u tomorrow", 0.04, 160.0),
        ("main paise nahi dunga phone kato", 0.12, 190.0),
        ("senior manager se baat karao", 0.05, 150.0),
        ("hospital me hu paise nahi hai", 0.03, 115.0),
        ("kaun bol raha hai", 0.04, 150.0),
    ]
    for statement, energy, pitch in cases:
        print(f"Testing statement: {statement}...", flush=True)
        req = DialogueTurnRequest(
            session_uuid="test-direct-session",
            borrower_statement=statement,
            borrower_name="Aarav Sharma",
            account_number="LON-MUM-88210",
            outstanding_amount=45000.0,
            measured_energy=energy,
            measured_pitch=pitch
        )
        res = await process_dialogue_turn(req)
        print(f"INPUT:  '{statement}'", flush=True)
        print(f"EMOTION: {res.predicted_emotion} | CONF: {res.confidence}", flush=True)
        print(f"SAFETY:  {res.safety_action} | HANDOFF: {res.is_handoff_triggered}", flush=True)
        print(f"AI RESP: {res.ai_response}\n", flush=True)
    print("All tests completed successfully!", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
