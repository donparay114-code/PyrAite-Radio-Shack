"""SQLAlchemy base configuration and database session management."""

import os
from datetime import datetime
from typing import AsyncGenerator, Optional

from sqlalchemy import Engine, MetaData, create_engine
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

# Naming convention for constraints (helps with migrations)
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    metadata = MetaData(naming_convention=convention)


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""

    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )


# Lazy initialization for engines (allows tests to run without PostgreSQL)
_engine: Optional[Engine] = None
_async_engine: Optional[AsyncEngine] = None
_SessionLocal: Optional[sessionmaker[Session]] = None
_AsyncSessionLocal: Optional[async_sessionmaker[AsyncSession]] = None


def _is_testing() -> bool:
    """Check if we're running in test mode."""
    import sys

    # Check TESTING env var
    if os.environ.get("TESTING", "").lower() in ("1", "true", "yes"):
        return True
    # Check if pytest is running
    if "pytest" in sys.modules:
        return True
    return False


def _use_postgres_for_testing() -> bool:
    """Check if PostgreSQL should be used for testing (e.g., in CI)."""
    return (
        os.environ.get("USE_POSTGRES", "").lower() in ("1", "true", "yes")
        or "GITHUB_ACTIONS" in os.environ
    )


def _get_database_urls() -> tuple[str, str]:
    """Get database URLs, using SQLite in test mode unless PostgreSQL is configured."""
    if _is_testing() and not _use_postgres_for_testing():
        # Use file-based SQLite for local tests
        return "sqlite:///./test.db", "sqlite+aiosqlite:///./test.db"
    elif _is_testing() and _use_postgres_for_testing():
        # Use PostgreSQL for CI tests
        host = os.environ.get("POSTGRES_HOST", "localhost")
        port = os.environ.get("POSTGRES_PORT", "5432")
        user = os.environ.get("POSTGRES_USER", "test_user")
        password = os.environ.get("POSTGRES_PASSWORD", "test_password")
        database = os.environ.get("POSTGRES_DATABASE", "test_radio")
        return (
            f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}",
            f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{database}",
        )
    else:
        from src.utils.config import settings

        return settings.database_url, settings.async_database_url


def get_engine() -> Engine:
    """Get or create the synchronous database engine."""
    global _engine, _SessionLocal

    if _engine is None:
        from src.utils.config import settings

        sync_url, _ = _get_database_urls()

        # SQLite needs different settings
        if sync_url.startswith("sqlite"):
            from sqlalchemy.pool import StaticPool

            _engine = create_engine(
                sync_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
        else:
            _engine = create_engine(
                sync_url,
                pool_pre_ping=True,
                pool_size=20,
                max_overflow=40,
                pool_recycle=300,  # Recycle connections after 5 minutes
                pool_timeout=30,  # Wait up to 30s for a connection
                echo=settings.debug,
            )
        _SessionLocal = sessionmaker(
            bind=_engine,
            autocommit=False,
            autoflush=False,
        )

    return _engine


def get_async_engine() -> AsyncEngine:
    """Get or create the async database engine."""
    global _async_engine, _AsyncSessionLocal

    if _async_engine is None:
        from src.utils.config import settings

        _, async_url = _get_database_urls()

        # SQLite needs different settings
        if async_url.startswith("sqlite"):
            from sqlalchemy.pool import StaticPool

            _async_engine = create_async_engine(
                async_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
        else:
            _async_engine = create_async_engine(
                async_url,
                pool_pre_ping=True,
                pool_size=20,
                max_overflow=40,
                pool_recycle=300,  # Recycle connections after 5 minutes
                pool_timeout=30,  # Wait up to 30s for a connection
                echo=settings.debug,
            )
        _AsyncSessionLocal = async_sessionmaker(
            bind=_async_engine,
            class_=AsyncSession,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
        )

    return _async_engine


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database sessions."""
    # Ensure engine is initialized
    get_async_engine()
    if _AsyncSessionLocal is None:
        raise RuntimeError("Async session not initialized")

    async with _AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_session():
    """Dependency for getting sync database sessions."""
    # Ensure engine is initialized
    get_engine()
    if _SessionLocal is None:
        raise RuntimeError("Session not initialized")

    session = _SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
