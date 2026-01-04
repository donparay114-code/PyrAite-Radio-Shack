"""Create database tables from SQLAlchemy models."""

import asyncio

from src.models.base import Base, get_async_engine


async def create_tables():
    """Create all tables defined in SQLAlchemy models."""
    engine = get_async_engine()

    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created successfully!")


if __name__ == "__main__":
    asyncio.run(create_tables())
