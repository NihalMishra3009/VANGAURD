import asyncio
from sqlalchemy import text
from backend.app.database.session import async_engine
from backend.app.database.init_db import init_database


async def apply_phase2_migrations():
    print("Creating newly added tables (such as upload_batches)...")
    await init_database()
    
    print("Applying schema alterations for Phase 2...")
    alter_statements = [
        # Borrower alterations
        "ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS upload_batch_id INTEGER REFERENCES upload_batches(id) ON DELETE SET NULL;",
        "ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);",
        "ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS stop_contact BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS dispute_status VARCHAR(50) DEFAULT 'NONE';",
        "CREATE INDEX IF NOT EXISTS ix_borrowers_upload_batch_id ON borrowers(upload_batch_id);",
        "CREATE INDEX IF NOT EXISTS ix_borrowers_account_number ON borrowers(account_number);",
        "CREATE INDEX IF NOT EXISTS ix_borrowers_outstanding_amount ON borrowers(outstanding_amount);",
        "CREATE INDEX IF NOT EXISTS ix_borrowers_due_date ON borrowers(due_date);",
        "CREATE INDEX IF NOT EXISTS ix_borrowers_name ON borrowers(name);",
        
        # Campaign alterations
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS retry_limit INTEGER DEFAULT 3;",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cooling_off_hours INTEGER DEFAULT 24;",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS priority_weight INTEGER DEFAULT 1;",
        
        # CampaignBorrower alterations
        "ALTER TABLE campaign_borrowers ADD COLUMN IF NOT EXISTS is_active_call BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE campaign_borrowers DROP CONSTRAINT IF EXISTS uq_campaign_borrower;",
        "ALTER TABLE campaign_borrowers ADD CONSTRAINT uq_campaign_borrower UNIQUE (campaign_id, borrower_id);"
    ]

    async with async_engine.begin() as conn:
        for stmt in alter_statements:
            try:
                await conn.execute(text(stmt))
            except Exception as e:
                print(f"Notice on statement: {stmt}\n  Error: {e}")

    print("Phase 2 migrations successfully applied.")


if __name__ == "__main__":
    asyncio.run(apply_phase2_migrations())
