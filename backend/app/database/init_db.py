import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database.session import async_engine, AsyncSessionLocal
from backend.app.database.base import Base
import backend.app.models # Ensure all models are registered with Base
from backend.app.repositories.user_repo import UserRepository
from backend.app.schemas.user import UserCreate
from backend.app.models.enums import UserRole


async def init_database():
    """Create all tables in the database if they do not exist."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed_initial_users():
    """Seed standard role accounts for the simulation."""
    users_to_seed = [
        UserCreate(
            email="admin@voxguard.bank",
            full_name="System Administrator",
            password="VoxGuard@2026",
            role=UserRole.ADMIN,
            is_active=True
        ),
        UserCreate(
            email="campaign@voxguard.bank",
            full_name="Campaign Manager",
            password="VoxGuard@2026",
            role=UserRole.CAMPAIGN_MANAGER,
            is_active=True
        ),
        UserCreate(
            email="collector@voxguard.bank",
            full_name="Senior Debt Collector",
            password="VoxGuard@2026",
            role=UserRole.HUMAN_COLLECTOR,
            is_active=True
        ),
        UserCreate(
            email="supervisor@voxguard.bank",
            full_name="Operations Supervisor",
            password="VoxGuard@2026",
            role=UserRole.SUPERVISOR,
            is_active=True
        ),
    ]

    async with AsyncSessionLocal() as session:
        repo = UserRepository(session)
        for user_data in users_to_seed:
            existing = await repo.get_by_email(user_data.email)
            if not existing:
                await repo.create(user_data)
        await session.commit()


async def main():
    print("Initializing VOXGUARD PostgreSQL database...")
    await init_database()
    print("Database tables created.")
    print("Seeding initial role accounts...")
    await seed_initial_users()
    print("Seeding complete.")


if __name__ == "__main__":
    asyncio.run(main())
