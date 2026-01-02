from sqlalchemy import create_engine, text
from src.utils.config import settings


def test_upsert():
    print("Connecting to DB...")
    # Use sync driver
    db_url = settings.database_url.replace("postgresql+asyncpg", "postgresql")
    engine = create_engine(db_url)

    with engine.connect() as conn:
        print("Executing upsert_telegram_user...")
        try:
            # Upsert test user
            result = conn.execute(
                text(
                    "SELECT * FROM upsert_telegram_user(999999999, 'test_user', 'Test', 'User')"
                )
            )
            row = result.fetchone()
            print(f"Success! Returned row: {row}")

            # Verify in table
            verify = conn.execute(
                text("SELECT * FROM users WHERE telegram_id = 999999999")
            ).fetchone()
            print(f"Verification query found: {verify}")

            # Commit (although function should have committed if autocommit is on, but explicit commit is safer for test)
            conn.commit()

            # Cleanup
            print("Cleaning up...")
            conn.execute(text("DELETE FROM users WHERE telegram_id = 999999999"))
            conn.commit()
            print("Cleanup done.")

        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    test_upsert()
