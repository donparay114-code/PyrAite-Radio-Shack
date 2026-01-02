from sqlalchemy import create_engine, text
from src.utils.config import settings


def check_word(word):
    db_url = settings.database_url.replace("postgresql+asyncpg", "postgresql")
    engine = create_engine(db_url)
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM banned_words WHERE word = :w"), {"w": word}
        ).fetchone()
        print(f"Word '{word}': {result}")


if __name__ == "__main__":
    check_word("chink")
    check_word("allah akbar")
