"""Chat API routes for community messaging.

Realtime subscriptions are handled by Supabase Realtime on the frontend.
This module provides REST endpoints for message CRUD operations.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models import ChatMessage, MessageType, User, get_async_session

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================


class ChatMessageCreate(BaseModel):
    """Create a new chat message."""

    content: str = Field(..., min_length=1, max_length=500)
    reply_to_id: Optional[int] = None


class ChatMessageResponse(BaseModel):
    """Chat message response model."""

    id: int
    user_id: Optional[int]
    user_display_name: Optional[str]
    user_tier: Optional[str]
    content: str
    message_type: str
    reply_to_id: Optional[int]
    is_deleted: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    """Response for chat history."""

    messages: List[ChatMessageResponse]
    total: int
    has_more: bool


class SystemMessageCreate(BaseModel):
    """Create a system message (admin only)."""

    content: str = Field(..., min_length=1, max_length=500)
    message_type: MessageType = MessageType.SYSTEM


# ============================================================================
# Helper Functions
# ============================================================================


def message_to_response(message: ChatMessage) -> ChatMessageResponse:
    """Convert a ChatMessage to a response model."""
    return ChatMessageResponse(
        id=message.id,
        user_id=message.user_id,
        user_display_name=message.user.display_name if message.user else None,
        user_tier=message.user.tier.value if message.user else None,
        content=message.content if not message.is_deleted else "[Message deleted]",
        message_type=(
            message.message_type.value
            if isinstance(message.message_type, MessageType)
            else message.message_type
        ),
        reply_to_id=message.reply_to_id,
        is_deleted=message.is_deleted,
        created_at=message.created_at,
    )


# ============================================================================
# REST Endpoints
# ============================================================================


@router.get("/", response_model=ChatHistoryResponse)
async def get_chat_history(
    limit: int = Query(50, le=100, ge=1),
    before_id: Optional[int] = Query(None, description="Get messages before this ID"),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get chat message history.

    For realtime updates, use Supabase Realtime subscriptions on the frontend.
    """
    query = (
        select(ChatMessage)
        .options(selectinload(ChatMessage.user))
        .where(ChatMessage.is_deleted == False)  # noqa: E712
        .order_by(ChatMessage.id.desc())
    )

    if before_id:
        query = query.where(ChatMessage.id < before_id)

    query = query.limit(limit + 1)  # Fetch one extra to check has_more

    result = await session.execute(query)
    messages = list(result.scalars().all())

    has_more = len(messages) > limit
    if has_more:
        messages = messages[:limit]

    # Get total count
    count_query = select(func.count(ChatMessage.id)).where(
        ChatMessage.is_deleted == False  # noqa: E712
    )
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0

    return ChatHistoryResponse(
        messages=[message_to_response(m) for m in reversed(messages)],
        total=total,
        has_more=has_more,
    )


@router.post("/", response_model=ChatMessageResponse, status_code=201)
async def send_message(
    message_data: ChatMessageCreate,
    user_id: int = Query(..., description="User ID sending the message"),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Send a new chat message.

    The message is stored in the database. Supabase Realtime will automatically
    broadcast the new row to all subscribed clients.
    """
    # Verify user exists and is not banned
    user_result = await session.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_banned:
        raise HTTPException(status_code=403, detail="User is banned from chat")

    # Content moderation with OpenAI
    from src.services.moderation import moderate_content

    moderation_result = await moderate_content(message_data.content, use_openai=True)
    if not moderation_result.passed:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "content_moderation_failed",
                "category": moderation_result.category.value,
                "reason": moderation_result.reason,
            },
        )

    # Verify reply_to message exists if provided
    if message_data.reply_to_id:
        reply_result = await session.execute(
            select(ChatMessage).where(ChatMessage.id == message_data.reply_to_id)
        )
        if not reply_result.scalar_one_or_none():
            raise HTTPException(
                status_code=404, detail="Reply target message not found"
            )

    # Create message
    message = ChatMessage(
        user_id=user_id,
        content=message_data.content,
        message_type=MessageType.TEXT,
        reply_to_id=message_data.reply_to_id,
    )
    session.add(message)
    await session.flush()
    await session.refresh(message, ["user"])

    return message_to_response(message)


@router.post("/system", response_model=ChatMessageResponse, status_code=201)
async def send_system_message(
    message_data: SystemMessageCreate,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Send a system message (for automated announcements).

    Use this for:
    - Now playing announcements
    - User milestone celebrations
    - System status updates
    """
    message = ChatMessage(
        user_id=None,
        content=message_data.content,
        message_type=message_data.message_type,
    )
    session.add(message)
    await session.flush()
    await session.refresh(message)

    return message_to_response(message)


@router.delete("/{message_id}")
async def delete_message(
    message_id: int,
    moderator_id: int = Query(..., description="Moderator performing the deletion"),
    reason: str = Query("Moderation", description="Reason for deletion"),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Delete a chat message (soft delete).

    The message is marked as deleted but not removed from the database.
    Supabase Realtime will broadcast the update to all subscribed clients.
    """
    result = await session.execute(
        select(ChatMessage).where(ChatMessage.id == message_id)
    )
    message = result.scalar_one_or_none()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.is_deleted:
        raise HTTPException(status_code=400, detail="Message already deleted")

    message.soft_delete(moderator_id, reason)

    return {"message": "Message deleted", "id": message_id}


@router.get("/stats")
async def get_chat_stats(
    session: AsyncSession = Depends(get_async_session),
):
    """Get chat statistics."""
    # Total messages today
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_result = await session.execute(
        select(func.count(ChatMessage.id)).where(
            and_(
                ChatMessage.created_at >= today,
                ChatMessage.is_deleted == False,  # noqa: E712
            )
        )
    )
    messages_today = today_result.scalar() or 0

    # Total messages all time
    total_result = await session.execute(
        select(func.count(ChatMessage.id)).where(
            ChatMessage.is_deleted == False  # noqa: E712
        )
    )
    total_messages = total_result.scalar() or 0

    return {
        "messages_today": messages_today,
        "total_messages": total_messages,
    }


@router.get("/{message_id}", response_model=ChatMessageResponse)
async def get_message(
    message_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    """Get a specific message by ID."""
    result = await session.execute(
        select(ChatMessage)
        .options(selectinload(ChatMessage.user))
        .where(ChatMessage.id == message_id)
    )
    message = result.scalar_one_or_none()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    return message_to_response(message)
