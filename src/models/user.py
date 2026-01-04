"""User model with reputation system."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import BigInteger, Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.queue import RadioQueue
    from src.models.vote import Vote


class UserTier(str, Enum):
    """User tier levels based on reputation."""

    NEW = "new"  # 0-99 reputation
    REGULAR = "regular"  # 100-499 reputation
    TRUSTED = "trusted"  # 500-999 reputation
    VIP = "vip"  # 1000-4999 reputation
    ELITE = "elite"  # 5000+ reputation


class User(Base, TimestampMixin):
    """User model for radio station listeners/requesters."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Authentication
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)

    # Telegram info (nullable for Google-only users)
    telegram_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, unique=True, nullable=True, index=True
    )
    telegram_username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    telegram_first_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    telegram_last_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    # Reputation system
    reputation_score: Mapped[float] = mapped_column(Float, default=0.0)
    total_requests: Mapped[int] = mapped_column(Integer, default=0)
    successful_requests: Mapped[int] = mapped_column(Integer, default=0)
    failed_requests: Mapped[int] = mapped_column(Integer, default=0)
    total_upvotes_received: Mapped[int] = mapped_column(Integer, default=0)
    total_downvotes_received: Mapped[int] = mapped_column(Integer, default=0)
    total_upvotes_given: Mapped[int] = mapped_column(Integer, default=0)
    total_downvotes_given: Mapped[int] = mapped_column(Integer, default=0)

    # Status flags
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    ban_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    banned_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    banned_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Activity tracking
    last_request_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_vote_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_active_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Profile
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    requests: Mapped[list["RadioQueue"]] = relationship(
        "RadioQueue", back_populates="user", lazy="dynamic"
    )
    votes: Mapped[list["Vote"]] = relationship(
        "Vote", back_populates="user", lazy="dynamic"
    )

    @property
    def tier(self) -> UserTier:
        """Get user tier based on reputation score."""
        if self.reputation_score >= 5000:
            return UserTier.ELITE
        elif self.reputation_score >= 1000:
            return UserTier.VIP
        elif self.reputation_score >= 500:
            return UserTier.TRUSTED
        elif self.reputation_score >= 100:
            return UserTier.REGULAR
        return UserTier.NEW

    @property
    def priority_multiplier(self) -> float:
        """Get priority multiplier based on tier."""
        multipliers = {
            UserTier.NEW: 1.0,
            UserTier.REGULAR: 1.1,
            UserTier.TRUSTED: 1.25,
            UserTier.VIP: 1.5,
            UserTier.ELITE: 2.0,
        }
        return multipliers[self.tier]

    @property
    def max_daily_requests(self) -> int:
        """Get maximum daily requests based on tier."""
        limits = {
            UserTier.NEW: 3,
            UserTier.REGULAR: 5,
            UserTier.TRUSTED: 10,
            UserTier.VIP: 20,
            UserTier.ELITE: 50,
        }
        return limits[self.tier]

    @property
    def display_name(self) -> str:
        """Get display name for the user."""
        if self.telegram_username:
            return f"@{self.telegram_username}"
        if self.telegram_first_name:
            name = self.telegram_first_name
            if self.telegram_last_name:
                name += f" {self.telegram_last_name}"
            return name
        if self.email:
            return self.email.split("@")[0]
        if self.telegram_id:
            return f"User {self.telegram_id}"
        return f"User {self.id}"

    @property
    def success_rate(self) -> float:
        """Calculate success rate of requests."""
        if self.total_requests == 0:
            return 0.0
        return self.successful_requests / self.total_requests

    @property
    def vote_ratio(self) -> float:
        """Calculate upvote to downvote ratio received."""
        total = self.total_upvotes_received + self.total_downvotes_received
        if total == 0:
            return 0.5  # Neutral
        return self.total_upvotes_received / total

    def calculate_reputation(self) -> float:
        """
        Calculate reputation score based on activity.

        Formula:
        - Base: successful_requests * 10
        - Upvotes received: +5 each
        - Downvotes received: -3 each
        - Success rate bonus: up to +50
        - Premium bonus: +100
        """
        score = 0.0

        # Base from successful requests
        score += self.successful_requests * 10

        # Vote impact
        score += self.total_upvotes_received * 5
        score -= self.total_downvotes_received * 3

        # Success rate bonus (up to 50 points)
        if self.total_requests >= 5:
            score += self.success_rate * 50

        # Premium bonus
        if self.is_premium:
            score += 100

        # Don't go negative
        return max(0.0, score)

    def update_reputation(self) -> None:
        """Recalculate and update reputation score."""
        self.reputation_score = self.calculate_reputation()

    def __repr__(self) -> str:
        return (
            f"<User {self.id}: {self.display_name} (rep={self.reputation_score:.1f})>"
        )
