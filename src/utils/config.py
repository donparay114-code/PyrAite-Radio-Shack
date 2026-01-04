"""Configuration management for PYrte Radio Shack."""

from functools import lru_cache
from pathlib import Path

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

    # Database (PostgreSQL)
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "radio_user"
    postgres_password: str = ""
    postgres_database: str = "radio_station"

    # Redis
    redis_host: str | None = "localhost"
    redis_port: int = 6379
    redis_password: str = ""

    # API Keys
    suno_api_url: str = ""
    suno_api_key: str = ""
    stable_audio_api_url: str = "https://api.stability.ai/v2beta/stable-audio/generate"
    stable_audio_api_key: str = ""
    udio_auth_token: str = ""  # Udio sb-api-auth-token from cookies
    openai_api_key: str = ""

    # OpenAI Moderation Settings
    openai_moderation_enabled: bool = True
    openai_moderation_timeout: float = 5.0
    openai_moderation_fallback_on_error: bool = True

    # Telegram
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # Icecast
    icecast_host: str = "localhost"
    icecast_port: int = 8000
    icecast_password: str = ""
    icecast_mount: str = "/radio.mp3"

    # Liquidsoap
    liquidsoap_url: str = "http://localhost:8080"

    # n8n
    n8n_host: str = "http://localhost:5678"
    n8n_api_key: str = ""

    # Backend Public URL (for n8n callbacks when using Cloudflare Tunnel)
    backend_public_url: str = "http://localhost:8000"

    # Application
    debug: bool = False
    log_level: str = "INFO"
    secret_key: str = ""

    # Resend Email Settings
    resend_api_key: str = ""
    resend_from_email: str = "noreply@pyraite.radio"
    resend_from_name: str = "PYrte Radio"

    # Frontend URL (for password reset links)
    frontend_url: str = "http://localhost:3006"

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
        """Get the PostgreSQL database URL for SQLAlchemy."""
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_database}"
        )

    @property
    def async_database_url(self) -> str:
        """Get the async PostgreSQL database URL for SQLAlchemy."""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_database}"
        )

    @property
    def redis_url(self) -> str | None:
        """Get the Redis connection URL."""
        if not self.redis_host:
            return None
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
