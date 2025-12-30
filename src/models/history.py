"""Radio history model for tracking played songs."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    BigInteger,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.song import Song


class RadioHistory(Base, TimestampMixin):
    """History of songs played on the radio station."""

    __tablename__ = "radio_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Song reference
    song_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("songs.id"), nullable=False, index=True
    )
    queue_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)

    # Play info
    played_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_played_seconds: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )

    # Broadcast info
    broadcast_file_path: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    stream_mount: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Requester info (denormalized for history queries)
    requester_telegram_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True
    )
    requester_username: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    # Song info (denormalized for history queries)
    song_title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    song_artist: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    song_genre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # DJ intro info
    had_dj_intro: Mapped[bool] = mapped_column(default=False)
    dj_intro_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Listener stats at play time
    listener_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Engagement during play
    upvotes_during_play: Mapped[int] = mapped_column(Integer, default=0)
    downvotes_during_play: Mapped[int] = mapped_column(Integer, default=0)
    skips_requested: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    song: Mapped["Song"] = relationship("Song", back_populates="history_entries")

    @property
    def was_completed(self) -> bool:
        """Check if the song played to completion."""
        if not self.ended_at or not self.duration_played_seconds:
            return False
        # Consider complete if played at least 90% of duration
        if self.song and self.song.duration_seconds:
            return self.duration_played_seconds >= (self.song.duration_seconds * 0.9)
        return True

    @property
    def engagement_score(self) -> int:
        """Get engagement score for this play."""
        return self.upvotes_during_play - self.downvotes_during_play

    @property
    def play_duration_formatted(self) -> str:
        """Get play duration in MM:SS format."""
        if not self.duration_played_seconds:
            return "0:00"
        minutes = int(self.duration_played_seconds // 60)
        seconds = int(self.duration_played_seconds % 60)
        return f"{minutes}:{seconds:02d}"

    def __repr__(self) -> str:
        return f"<RadioHistory {self.id}: {self.song_title} played at {self.played_at}>"
