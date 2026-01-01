import sys
import os
import logging

# Disable all logging
logging.disable(logging.CRITICAL)

from sqlalchemy import create_engine, text

# Add src to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.utils.config import settings


def list_tables():
    print(f"Checking tables in: {settings.postgres_host}", flush=True)

    try:
        engine = create_engine(settings.database_url)
        with engine.connect() as connection:
            print("\nExisting Tables:", flush=True)
            result = connection.execute(
                text(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
                )
            )
            tables = [row[0] for row in result]

            if not tables:
                print("   (No tables found in public schema)", flush=True)
            else:
                for table in sorted(tables):
                    print(f"   - {table}", flush=True)

            # Also check alembic_version
            try:
                result = connection.execute(
                    text("SELECT version_num FROM alembic_version")
                )
                version = result.scalar()
                print(f"\nAlembic Version: {version}", flush=True)
            except Exception:
                print("\nAlembic Version: (Table not found)", flush=True)

    except Exception as e:
        print(f"\n❌ ERROR: {e}", flush=True)


if __name__ == "__main__":
    list_tables()
