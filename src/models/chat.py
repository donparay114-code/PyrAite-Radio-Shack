"""Chat message model for real-time community chat."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.user import User


class MessageType(str, Enum):
    """Type of chat message."""

    TEXT = "text"
    SYSTEM = "system"  # System announcements
    NOW_PLAYING = "now_playing"  # Auto-generated when song starts
    REQUEST_APPROVED = "request_approved"  # When a request is approved
    MILESTONE = "milestone"  # User achievements


class ChatMessage(Base, TimestampMixin):
    """Chat message model for community chat."""

    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Author info
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Message content
    content: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[MessageType] = mapped_column(
        String(20), default=MessageType.TEXT
    )

    # Moderation
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_by_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    delete_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Reply functionality
    reply_to_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("chat_messages.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id])
    reply_to: Mapped[Optional["ChatMessage"]] = relationship(
        "ChatMessage", remote_side=[id], foreign_keys=[reply_to_id]
    )

    @property
    def is_system_message(self) -> bool:
        """Check if this is a system-generated message."""
        return self.message_type != MessageType.TEXT

    def soft_delete(self, moderator_id: int, reason: str = "Moderation") -> None:
        """Soft delete a message (hide but preserve)."""
        self.is_deleted = True
        self.deleted_by_id = moderator_id
        self.deleted_at = datetime.utcnow()
        self.delete_reason = reason

    def __repr__(self) -> str:
        preview = self.content[:30] + "..." if len(self.content) > 30 else self.content
        return f"<ChatMessage {self.id}: {preview}>"
