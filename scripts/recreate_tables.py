"""Drop and recreate database tables from SQLAlchemy models."""

import asyncio

from sqlalchemy import text

from src.models.base import Base, get_async_engine


async def recreate_tables():
    """Drop and recreate all tables defined in SQLAlchemy models."""
    engine = get_async_engine()

    async with engine.begin() as conn:
        # Drop all tables in public schema with CASCADE
        print("Dropping all tables in public schema...")
        await conn.execute(
            text(
                """
            DO $$ DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
            END $$;
        """
            )
        )

        # Create all tables
        print("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("Tables recreated successfully!")


if __name__ == "__main__":
    asyncio.run(recreate_tables())
