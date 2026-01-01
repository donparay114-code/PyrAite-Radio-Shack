import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# Add src to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.utils.config import settings


def verify_connection():
    print(
        f"Checking connection to: {settings.postgres_host}:{settings.postgres_port} (User: {settings.postgres_user})"
    )
    print(f"Database: {settings.postgres_database}")

    try:
        # Create engine
        engine = create_engine(settings.database_url)

        # Try to connect
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("\n✅ SUCCESS: Successfully connected to the database!")
            print(
                f"   Database version: {connection.execute(text('SELECT version()')).scalar()}"
            )

            # List tables
            print("\nExisting Tables:")
            result = connection.execute(
                text(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
                )
            )
            tables = [row[0] for row in result]
            if not tables:
                print("   (No tables found in public schema)")
            else:
                for table in tables:
                    print(f"   - {table}")
            return True

    except OperationalError as e:
        print("\n❌ ERROR: Could not connect to the database.")
        print(f"   Details: {e}")
        print("\n   Troubleshooting for Supabase:")
        print(
            "   1. Check if POSTGRES_HOST matches your Supabase project (e.g., aws-0-us-east-1.pooler.supabase.com)"
        )
        print(
            "   2. Check if POSTGRES_PASSWORD is correct (use the transaction pooler port 6543 or session port 5432)"
        )
        print("   3. Ensure your IP is allowed if Restrictions are enabled")
        return False
    except Exception as e:
        print(f"\n❌ ERROR: An unexpected error occurred: {e}")
        return False


if __name__ == "__main__":
    success = verify_connection()
    sys.exit(0 if success else 1)
