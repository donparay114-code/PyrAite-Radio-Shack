"""Pytest configuration and fixtures for PYrte Radio Shack tests."""

import asyncio
from datetime import datetime
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from src.api.main import app
from src.models.base import Base
from src.models import User, Song, RadioQueue, RadioHistory, Vote, QueueStatus, SunoStatus


# Use SQLite for testing (in-memory)
SQLITE_URL = "sqlite:///./test.db"
ASYNC_SQLITE_URL = "sqlite+aiosqlite:///./test.db"


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
def sync_engine():
    """Create synchronous test database engine."""
    engine = create_engine(
        SQLITE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def sync_session(sync_engine) -> Generator[Session, None, None]:
    """Create synchronous database session for tests."""
    SessionLocal = sessionmaker(bind=sync_engine, autoflush=False, autocommit=False)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest_asyncio.fixture(scope="function")
async def async_engine():
    """Create async test database engine."""
    engine = create_async_engine(
        ASYNC_SQLITE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def async_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create async database session for tests."""
    async_session_maker = async_sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.rollback()
            await session.close()


@pytest.fixture(scope="function")
def client(sync_engine) -> Generator[TestClient, None, None]:
    """Create FastAPI test client."""
    # Override the database dependency
    from src.models.base import get_session

    SessionLocal = sessionmaker(bind=sync_engine, autoflush=False, autocommit=False)

    def override_get_session():
        session = SessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def async_client(async_engine) -> AsyncGenerator[AsyncClient, None]:
    """Create async FastAPI test client."""
    from src.models.base import get_async_session

    async_session_maker = async_sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )

    async def override_get_async_session():
        async with async_session_maker() as session:
            yield session

    app.dependency_overrides[get_async_session] = override_get_async_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


# Sample data fixtures
@pytest.fixture
def sample_user_data() -> dict:
    """Sample user data for tests."""
    return {
        "telegram_id": 123456789,
        "telegram_username": "testuser",
        "telegram_first_name": "Test",
        "telegram_last_name": "User",
    }


@pytest.fixture
def sample_user(sync_session, sample_user_data) -> User:
    """Create a sample user in the database."""
    user = User(**sample_user_data)
    sync_session.add(user)
    sync_session.commit()
    sync_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def async_sample_user(async_session, sample_user_data) -> User:
    """Create a sample user in async session."""
    user = User(**sample_user_data)
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


@pytest.fixture
def sample_song_data() -> dict:
    """Sample song data for tests."""
    return {
        "suno_job_id": "test-job-123",
        "suno_status": SunoStatus.COMPLETE.value,
        "title": "Test Song",
        "artist": "AI Radio",
        "original_prompt": "A happy upbeat song",
        "genre": "Pop",
        "duration_seconds": 180.0,
        "is_instrumental": False,
        "audio_url": "https://example.com/audio.mp3",
        "is_approved": True,
    }


@pytest.fixture
def sample_song(sync_session, sample_song_data) -> Song:
    """Create a sample song in the database."""
    song = Song(**sample_song_data)
    sync_session.add(song)
    sync_session.commit()
    sync_session.refresh(song)
    return song


@pytest.fixture
def sample_queue_data(sample_user) -> dict:
    """Sample queue item data for tests."""
    return {
        "user_id": sample_user.id,
        "telegram_user_id": sample_user.telegram_id,
        "original_prompt": "Create a rock song about coding",
        "genre_hint": "Rock",
        "status": QueueStatus.PENDING.value,
    }


@pytest.fixture
def sample_queue_item(sync_session, sample_queue_data) -> RadioQueue:
    """Create a sample queue item in the database."""
    item = RadioQueue(**sample_queue_data)
    sync_session.add(item)
    sync_session.commit()
    sync_session.refresh(item)
    return item


@pytest.fixture
def multiple_users(sync_session) -> list[User]:
    """Create multiple users with varying reputations."""
    users = []
    for i in range(5):
        user = User(
            telegram_id=100000 + i,
            telegram_username=f"user{i}",
            reputation_score=i * 100,
            total_requests=i * 5,
            successful_requests=i * 4,
        )
        sync_session.add(user)
        users.append(user)
    sync_session.commit()
    for user in users:
        sync_session.refresh(user)
    return users


@pytest.fixture
def multiple_songs(sync_session) -> list[Song]:
    """Create multiple songs for testing."""
    songs = []
    genres = ["Pop", "Rock", "Jazz", "Electronic", "Hip-Hop"]
    for i in range(5):
        song = Song(
            suno_job_id=f"job-{i}",
            suno_status=SunoStatus.COMPLETE.value,
            title=f"Song {i}",
            genre=genres[i],
            duration_seconds=120 + i * 30,
            play_count=i * 10,
            total_upvotes=i * 5,
            total_downvotes=i,
            is_approved=True,
        )
        sync_session.add(song)
        songs.append(song)
    sync_session.commit()
    for song in songs:
        sync_session.refresh(song)
    return songs
