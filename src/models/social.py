"""Social models for community features (Comments, Follows)."""

from typing import TYPE_CHECKING, Optional

from sqlalchemy import Float, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.song import Song
    from src.models.user import User


class Comment(Base, TimestampMixin):
    """User comments on songs, with optional timestamps and threading."""

    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Relationships
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    song_id: Mapped[int] = mapped_column(Integer, ForeignKey("songs.id"), index=True)

    # Threading (NULL means top-level comment)
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("comments.id"), nullable=True
    )

    # Content
    text: Mapped[str] = mapped_column(Text)

    # Waveform timestamp (NULL means general comment)
    timestamp_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Navigation Properties
    user: Mapped["User"] = relationship("User", back_populates="comments")
    song: Mapped["Song"] = relationship("Song", back_populates="comments")

    # Self-referential for threading
    parent: Mapped[Optional["Comment"]] = relationship(
        "Comment", remote_side="Comment.id", back_populates="replies"
    )
    replies: Mapped[list["Comment"]] = relationship("Comment", back_populates="parent")

    def __repr__(self) -> str:
        return f"<Comment {self.id} by User {self.user_id} on Song {self.song_id}>"


class Follow(Base, TimestampMixin):
    """Social graph for following users."""

    __tablename__ = "follows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    follower_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), index=True
    )
    following_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), index=True
    )

    # Navigation Properties
    follower: Mapped["User"] = relationship(
        "User", foreign_keys=[follower_id], back_populates="following"
    )
    following: Mapped["User"] = relationship(
        "User", foreign_keys=[following_id], back_populates="followers"
    )

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follower_following"),
    )

    def __repr__(self) -> str:
        return f"<Follow {self.follower_id} -> {self.following_id}>"
