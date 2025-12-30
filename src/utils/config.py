"""Configuration management for PYrte Radio Shack."""

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = "radio_user"
    mysql_password: str = ""
    mysql_database: str = "radio_station"

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""

    # API Keys
    suno_api_url: str = ""
    suno_api_key: str = ""
    openai_api_key: str = ""

    # Telegram
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # Icecast
    icecast_host: str = "localhost"
    icecast_port: int = 8000
    icecast_password: str = ""
    icecast_mount: str = "/radio.mp3"

    # n8n
    n8n_host: str = "http://localhost:5678"
    n8n_api_key: str = ""

    # Application
    debug: bool = False
    log_level: str = "INFO"
    secret_key: str = ""

    # File Storage
    songs_dir: Path = Field(default=Path("./data/songs"))
    temp_dir: Path = Field(default=Path("./data/temp"))
    broadcast_dir: Path = Field(default=Path("./data/broadcast"))

    @field_validator("songs_dir", "temp_dir", "broadcast_dir", mode="before")
    @classmethod
    def parse_path(cls, v: str | Path) -> Path:
        """Convert string paths to Path objects."""
        return Path(v) if isinstance(v, str) else v

    @property
    def database_url(self) -> str:
        """Get the MySQL database URL for SQLAlchemy."""
        return (
            f"mysql+mysqlconnector://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
        )

    @property
    def async_database_url(self) -> str:
        """Get the async MySQL database URL for SQLAlchemy."""
        return (
            f"mysql+aiomysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
        )

    @property
    def redis_url(self) -> str:
        """Get the Redis connection URL."""
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}"
        return f"redis://{self.redis_host}:{self.redis_port}"

    def ensure_directories(self) -> None:
        """Create storage directories if they don't exist."""
        for directory in [self.songs_dir, self.temp_dir, self.broadcast_dir]:
            directory.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience function for direct import
settings = get_settings()
