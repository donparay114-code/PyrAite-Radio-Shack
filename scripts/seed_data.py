#!/usr/bin/env python3
"""Seed the database with initial data for PYrte Radio Shack.

This script populates:
- banned_words: Content blocklist for moderation
- Initial admin user (optional)

Usage:
    python scripts/seed_data.py
    python scripts/seed_data.py --admin-telegram-id 123456789
"""

import argparse
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from src.utils.config import settings


def seed_banned_words(engine) -> int:
    """Seed the banned_words table with common prohibited terms.

    Returns the number of words inserted.
    """
    # Categories of banned content
    banned_entries = [
        # Violence
        {"word": "kill", "severity": "warning", "category": "violence"},
        {"word": "murder", "severity": "critical", "category": "violence"},
        {"word": "shoot", "severity": "warning", "category": "violence"},
        {"word": "bomb", "severity": "critical", "category": "violence"},
        {"word": "terrorist", "severity": "critical", "category": "violence"},
        {"word": "attack", "severity": "warning", "category": "violence"},
        # Hate speech
        {"word": "nazi", "severity": "critical", "category": "hate"},
        {"word": "hitler", "severity": "critical", "category": "hate"},
        {"word": "racist", "severity": "warning", "category": "hate"},
        {"word": "supremacist", "severity": "critical", "category": "hate"},
        # Drug references
        {"word": "cocaine", "severity": "warning", "category": "drugs"},
        {"word": "heroin", "severity": "warning", "category": "drugs"},
        {"word": "meth", "severity": "warning", "category": "drugs"},
        {"word": "crack", "severity": "warning", "category": "drugs"},
        # Explicit content markers
        {"word": "explicit", "severity": "warning", "category": "adult"},
        {"word": "nsfw", "severity": "warning", "category": "adult"},
        {"word": "xxx", "severity": "critical", "category": "adult"},
        {"word": "porn", "severity": "critical", "category": "adult"},
        # Spam patterns (regex)
        {
            "word": r"(https?://|www\.)\S+",
            "severity": "warning",
            "category": "spam",
            "is_regex": True,
        },
        {"word": r"@\w+", "severity": "warning", "category": "spam", "is_regex": True},
        {
            "word": r"(discord\.gg|t\.me)/\S+",
            "severity": "warning",
            "category": "spam",
            "is_regex": True,
        },
        # Profanity (basic - can be extended)
        {"word": "fuck", "severity": "warning", "category": "profanity"},
        {"word": "shit", "severity": "warning", "category": "profanity"},
        {"word": "bitch", "severity": "warning", "category": "profanity"},
        {"word": "ass", "severity": "warning", "category": "profanity"},
        # Self-harm
        {"word": "suicide", "severity": "critical", "category": "self-harm"},
        {"word": "self-harm", "severity": "critical", "category": "self-harm"},
        {"word": "cut myself", "severity": "critical", "category": "self-harm"},
    ]

    inserted = 0
    with engine.connect() as conn:
        for entry in banned_entries:
            is_regex = entry.get("is_regex", False)
            try:
                conn.execute(
                    text(
                        """
                    INSERT INTO banned_words (word, severity, category, is_regex, is_active)
                    VALUES (:word, :severity, :category, :is_regex, TRUE)
                    ON CONFLICT (word) DO UPDATE SET
                        severity = EXCLUDED.severity,
                        category = EXCLUDED.category,
                        is_regex = EXCLUDED.is_regex,
                        is_active = TRUE
                """
                    ),
                    {
                        "word": entry["word"],
                        "severity": entry["severity"],
                        "category": entry["category"],
                        "is_regex": is_regex,
                    },
                )
                inserted += 1
            except Exception as e:
                print(f"  Warning: Could not insert '{entry['word']}': {e}")
        conn.commit()

    return inserted


def seed_admin_user(engine, telegram_id: int, username: str = "admin") -> bool:
    """Create or update an admin user.

    Returns True if successful.
    """
    with engine.connect() as conn:
        try:
            conn.execute(
                text(
                    """
                INSERT INTO users (telegram_id, telegram_username, is_admin, daily_request_limit, reputation_score)
                VALUES (:telegram_id, :username, TRUE, 0, 100.0)
                ON CONFLICT (telegram_id) DO UPDATE SET
                    is_admin = TRUE,
                    daily_request_limit = 0
            """
                ),
                {"telegram_id": telegram_id, "username": username},
            )
            conn.commit()
            return True
        except Exception as e:
            print(f"  Error creating admin user: {e}")
            return False


def check_tables_exist(engine) -> bool:
    """Check if required tables exist."""
    required_tables = [
        "users",
        "banned_words",
        "moderation_logs",
        "user_violations",
        "reputation_logs",
    ]
    with engine.connect() as conn:
        for table in required_tables:
            result = conn.execute(
                text(
                    """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = :table
                )
            """
                ),
                {"table": table},
            )
            if not result.scalar():
                return False
    return True


def main():
    parser = argparse.ArgumentParser(description="Seed database with initial data")
    parser.add_argument(
        "--admin-telegram-id", type=int, help="Telegram user ID to make admin"
    )
    parser.add_argument(
        "--admin-username", type=str, default="admin", help="Username for admin user"
    )
    parser.add_argument(
        "--skip-banned-words", action="store_true", help="Skip seeding banned words"
    )
    args = parser.parse_args()

    print("PYrte Radio Shack - Database Seeder")
    print("=" * 40)

    # Create engine
    print(
        f"\nConnecting to: {settings.postgres_host}:{settings.postgres_port}/{settings.postgres_database}"
    )
    try:
        engine = create_engine(settings.database_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("  Database connection successful")
    except Exception as e:
        print(f"  ERROR: Could not connect to database: {e}")
        print("\n  Make sure PostgreSQL is running and credentials are correct.")
        print("  Check your .env file or environment variables.")
        sys.exit(1)

    # Check tables exist
    print("\nChecking tables...")
    if not check_tables_exist(engine):
        print("  ERROR: Required tables do not exist.")
        print("  Run migrations first: alembic upgrade head")
        sys.exit(1)
    print("  All required tables exist")

    # Seed banned words
    if not args.skip_banned_words:
        print("\nSeeding banned words...")
        count = seed_banned_words(engine)
        print(f"  Inserted/updated {count} banned words")

    # Create admin user
    if args.admin_telegram_id:
        print(f"\nCreating admin user (Telegram ID: {args.admin_telegram_id})...")
        if seed_admin_user(engine, args.admin_telegram_id, args.admin_username):
            print(f"  Admin user created/updated: @{args.admin_username}")
        else:
            print("  Failed to create admin user")
            sys.exit(1)

    print("\n" + "=" * 40)
    print("Seeding complete!")
    print("\nNext steps:")
    print("  1. Configure n8n credentials (Telegram, PostgreSQL, OpenAI)")
    print("  2. Import workflows from n8n_workflows/")
    print("  3. Start the radio station!")


if __name__ == "__main__":
    main()
