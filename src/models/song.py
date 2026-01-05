"""Song model for storing generated track metadata."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.history import RadioHistory
    from src.models.queue import RadioQueue
    from src.models.social import Comment


class SunoStatus(str, Enum):
    """Status of Suno generation."""

    PENDING = "pending"
    GENERATING = "generating"
    COMPLETE = "complete"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Song(Base, TimestampMixin):
    """Song/track model with metadata from Suno generation."""

    __tablename__ = "songs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Suno job info
    suno_job_id: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, nullable=True, index=True
    )
    suno_status: Mapped[str] = mapped_column(
        String(50), default=SunoStatus.PENDING.value
    )

    # Generated content
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    artist: Mapped[str] = mapped_column(String(255), default="AI Radio")

    # Original prompt info
    original_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    enhanced_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    style_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lyrics: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Genre and style
    genre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    subgenre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    mood: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    energy: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Audio metadata
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bpm: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    key: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    is_instrumental: Mapped[bool] = mapped_column(Boolean, default=False)

    # File info
    audio_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    local_file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    audio_format: Mapped[str] = mapped_column(String(10), default="mp3")

    # Quality metrics
    lufs_level: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    peak_db: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_normalized: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    generation_started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    generation_completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    downloaded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Play stats
    play_count: Mapped[int] = mapped_column(Integer, default=0)
    total_upvotes: Mapped[int] = mapped_column(Integer, default=0)
    total_downvotes: Mapped[int] = mapped_column(Integer, default=0)

    # Moderation
    is_approved: Mapped[bool] = mapped_column(Boolean, default=True)
    moderation_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    flagged_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Community & Metadata
    prompt_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    queue_entries: Mapped[list["RadioQueue"]] = relationship(
        "RadioQueue", back_populates="song", lazy="dynamic"
    )
    history_entries: Mapped[list["RadioHistory"]] = relationship(
        "RadioHistory", back_populates="song", lazy="dynamic"
    )
    comments: Mapped[list["Comment"]] = relationship(
        "Comment", back_populates="song", lazy="dynamic"
    )

    @property
    def duration_formatted(self) -> str:
        """Get duration in MM:SS format."""
        if not self.duration_seconds:
            return "0:00"
        minutes = int(self.duration_seconds // 60)
        seconds = int(self.duration_seconds % 60)
        return f"{minutes}:{seconds:02d}"

    @property
    def vote_score(self) -> int:
        """Get net vote score (upvotes - downvotes)."""
        return self.total_upvotes - self.total_downvotes

    @property
    def vote_ratio(self) -> float:
        """Get upvote ratio (0.0 to 1.0)."""
        total = self.total_upvotes + self.total_downvotes
        if total == 0:
            return 0.5
        return self.total_upvotes / total

    @property
    def is_ready_for_broadcast(self) -> bool:
        """Check if song is ready to be broadcast."""
        return (
            self.suno_status == SunoStatus.COMPLETE.value
            and self.local_file_path is not None
            and self.is_approved
        )

    @property
    def generation_duration_seconds(self) -> Optional[float]:
        """Get how long generation took."""
        if self.generation_started_at and self.generation_completed_at:
            delta = self.generation_completed_at - self.generation_started_at
            return delta.total_seconds()
        return None

    def __repr__(self) -> str:
        return f"<Song {self.id}: {self.title or 'Untitled'} ({self.suno_status})>"
