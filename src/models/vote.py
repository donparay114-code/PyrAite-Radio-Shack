"""Vote model for upvotes/downvotes on queue items."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.queue import RadioQueue
    from src.models.user import User


class VoteType(str, Enum):
    """Type of vote."""

    UPVOTE = "upvote"
    DOWNVOTE = "downvote"


class Vote(Base, TimestampMixin):
    """Vote model for tracking user votes on queue items."""

    __tablename__ = "votes"

    __table_args__ = (
        # Each user can only vote once per queue item
        UniqueConstraint("user_id", "queue_item_id", name="uq_votes_user_queue"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # User who voted
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    telegram_user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True, index=True
    )

    # Queue item being voted on
    queue_item_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("radio_queue.id"), nullable=False, index=True
    )

    # Vote details
    vote_type: Mapped[str] = mapped_column(String(20), nullable=False)
    voted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Track vote changes
    previous_vote_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Source info
    source: Mapped[str] = mapped_column(String(50), default="telegram")
    telegram_callback_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="votes")
    queue_item: Mapped["RadioQueue"] = relationship(
        "RadioQueue", back_populates="votes"
    )

    @property
    def is_upvote(self) -> bool:
        """Check if this is an upvote."""
        return self.vote_type == VoteType.UPVOTE.value

    @property
    def is_downvote(self) -> bool:
        """Check if this is a downvote."""
        return self.vote_type == VoteType.DOWNVOTE.value

    @property
    def vote_value(self) -> int:
        """Get numeric value of vote (+1 or -1)."""
        if self.is_upvote:
            return 1
        elif self.is_downvote:
            return -1
        return 0

    @property
    def was_changed(self) -> bool:
        """Check if this vote was changed from a previous vote."""
        return self.previous_vote_type is not None

    def flip_vote(self) -> None:
        """Flip the vote to the opposite type."""
        self.previous_vote_type = self.vote_type
        self.changed_at = datetime.utcnow()

        if self.is_upvote:
            self.vote_type = VoteType.DOWNVOTE.value
        else:
            self.vote_type = VoteType.UPVOTE.value

    def __repr__(self) -> str:
        return f"<Vote {self.id}: user={self.user_id} {self.vote_type} on queue={self.queue_item_id}>"
