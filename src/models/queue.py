"""Radio queue model for pending song requests."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
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
    from src.models.user import User
    from src.models.vote import Vote


class QueueStatus(str, Enum):
    """Status of queue item."""

    PENDING = "pending"  # Waiting to be processed
    QUEUED = "queued"  # Ready for Suno generation
    GENERATING = "generating"  # Suno is generating
    GENERATED = "generated"  # Audio ready, waiting to broadcast
    BROADCASTING = "broadcasting"  # Currently being broadcast
    COMPLETED = "completed"  # Successfully played
    FAILED = "failed"  # Generation failed
    CANCELLED = "cancelled"  # Cancelled by user or admin
    MODERATED = "moderated"  # Rejected by moderation


class RadioQueue(Base, TimestampMixin):
    """Radio queue model for pending and processing song requests."""

    __tablename__ = "radio_queue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # User who made the request
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True, index=True
    )
    telegram_user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True, index=True
    )
    telegram_message_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    # Song reference (created after generation)
    song_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("songs.id"), nullable=True, index=True
    )

    # Request info
    original_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    enhanced_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    genre_hint: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_instrumental: Mapped[bool] = mapped_column(Boolean, default=False)

    # Status tracking
    status: Mapped[str] = mapped_column(
        String(50), default=QueueStatus.PENDING.value, index=True
    )
    suno_job_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)

    # Priority system
    base_priority: Mapped[float] = mapped_column(Float, default=100.0)
    priority_score: Mapped[float] = mapped_column(Float, default=100.0, index=True)
    is_priority_boost: Mapped[bool] = mapped_column(Boolean, default=False)
    priority_boost_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Voting
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    downvotes: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    requested_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    queued_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    generation_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    generation_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    broadcast_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Moderation
    is_moderated: Mapped[bool] = mapped_column(Boolean, default=False)
    moderation_passed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    moderation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # DJ intro
    has_dj_intro: Mapped[bool] = mapped_column(Boolean, default=False)
    dj_intro_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="requests")
    song: Mapped[Optional["Song"]] = relationship("Song", back_populates="queue_entries")
    votes: Mapped[list["Vote"]] = relationship(
        "Vote", back_populates="queue_item", lazy="dynamic"
    )

    @property
    def vote_score(self) -> int:
        """Get net vote score."""
        return self.upvotes - self.downvotes

    @property
    def wait_time_seconds(self) -> Optional[float]:
        """Get how long this request has been waiting."""
        if self.completed_at:
            delta = self.completed_at - self.requested_at
        else:
            delta = datetime.utcnow() - self.requested_at
        return delta.total_seconds()

    @property
    def generation_time_seconds(self) -> Optional[float]:
        """Get how long generation took."""
        if self.generation_started_at and self.generation_completed_at:
            delta = self.generation_completed_at - self.generation_started_at
            return delta.total_seconds()
        return None

    @property
    def can_retry(self) -> bool:
        """Check if this request can be retried."""
        return (
            self.status == QueueStatus.FAILED.value
            and self.retry_count < self.max_retries
        )

    @property
    def is_active(self) -> bool:
        """Check if this request is still active (not terminal state)."""
        terminal_states = {
            QueueStatus.COMPLETED.value,
            QueueStatus.FAILED.value,
            QueueStatus.CANCELLED.value,
            QueueStatus.MODERATED.value,
        }
        return self.status not in terminal_states

    def calculate_priority(self, user_reputation: float = 0.0) -> float:
        """
        Calculate priority score.

        Formula:
        priority_score = 100
          + (reputation_score * 0.5)
          + (upvotes * 10)
          - (downvotes * 5)
          + (is_premium ? 50 : 0)
          + (is_priority_boost ? 100 : 0)
          - (wait_time_hours * 2)  # Decay for old requests
        """
        score = self.base_priority

        # Reputation contribution
        score += user_reputation * 0.5

        # Vote contribution
        score += self.upvotes * 10
        score -= self.downvotes * 5

        # Priority boost
        if self.is_priority_boost:
            score += 100

        # Time decay (after 1 hour, start losing priority)
        if self.wait_time_seconds:
            hours_waiting = self.wait_time_seconds / 3600
            if hours_waiting > 1:
                score -= (hours_waiting - 1) * 2

        return max(0.0, score)

    def update_priority(self, user_reputation: float = 0.0) -> None:
        """Recalculate and update priority score."""
        self.priority_score = self.calculate_priority(user_reputation)

    def __repr__(self) -> str:
        return f"<RadioQueue {self.id}: {self.status} (priority={self.priority_score:.1f})>"
