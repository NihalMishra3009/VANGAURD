import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from backend.app.main import app
from backend.app.database.session import get_db
from backend.app.core.config import settings


@pytest_asyncio.fixture(scope="function")
async def client():
    engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
        echo=False
    )
    session_factory = async_sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        class_=AsyncSession
    )

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
