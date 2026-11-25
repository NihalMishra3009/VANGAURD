import pytest
import pytest_asyncio
import os
from contextlib import asynccontextmanager
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool, StaticPool
from backend.app.main import app
from backend.app.database.session import get_db
from backend.app.database.base import Base
from backend.app.core.config import settings
import backend.app.models


TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")

# Disable main lifespan which attempts to connect to postgresql during test runs
@asynccontextmanager
async def _test_lifespan(app_inst):
    yield

app.router.lifespan_context = _test_lifespan


@pytest_asyncio.fixture(scope="function")
async def client():
    # If postgres is running or TEST_DATABASE_URL is explicitly set, use it; otherwise in-memory sqlite
    use_sqlite = "sqlite" in TEST_DB_URL
    if use_sqlite:
        engine = create_async_engine(
            TEST_DB_URL,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=False
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    else:
        engine = create_async_engine(
            TEST_DB_URL,
            poolclass=NullPool,
            echo=False
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        class_=AsyncSession
    )

    # Seed initial test users into test db
    async with session_factory() as session:
        from backend.app.repositories.user_repo import UserRepository
        from backend.app.schemas.user import UserCreate
        from backend.app.models.enums import UserRole
        repo = UserRepository(session)
        for user_data in [
            UserCreate(email="admin@voxguard.bank", full_name="Admin", password="VoxGuard@2026", role=UserRole.ADMIN, is_active=True),
            UserCreate(email="campaign@voxguard.bank", full_name="Campaign", password="VoxGuard@2026", role=UserRole.CAMPAIGN_MANAGER, is_active=True),
            UserCreate(email="collector@voxguard.bank", full_name="Collector", password="VoxGuard@2026", role=UserRole.HUMAN_COLLECTOR, is_active=True),
            UserCreate(email="supervisor@voxguard.bank", full_name="Supervisor", password="VoxGuard@2026", role=UserRole.SUPERVISOR, is_active=True),
        ]:
            if not await repo.get_by_email(user_data.email):
                await repo.create(user_data)
        await session.commit()

    async def _get_test_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db] = _get_test_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()
    await engine.dispose()
