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

from src.api.socket_manager import emit_chat_delete, emit_chat_message
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


def generate_anon_name(identifier: str) -> str:
    """Generate anonymous username like 'anon123456'.

    Uses a hash-based approach for random-looking but consistent IDs.
    The identifier should be the anon_session_id for consistent names.
    """
    import hashlib

    hash_input = f"anon_salt_{identifier}".encode()
    hash_digest = hashlib.md5(hash_input).hexdigest()
    # Take first 6 digits from hex converted to int
    anon_number = int(hash_digest[:6], 16) % 1000000
    return f"anon{anon_number}"


def message_to_response(message: ChatMessage) -> ChatMessageResponse:
    """Convert a ChatMessage to a response model."""
    # Generate Reddit-style name for anonymous users
    if message.user:
        display_name = message.user.display_name
    elif message.anon_session_id:
        # Use session ID for consistent anon names
        display_name = generate_anon_name(message.anon_session_id)
    else:
        # Fallback to message ID for old messages without session ID
        display_name = generate_anon_name(str(message.id))

    return ChatMessageResponse(
        id=message.id,
        user_id=message.user_id,
        user_display_name=display_name,
        user_tier=message.user.tier.value if message.user else "anon",
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
    user_id: Optional[int] = Query(
        None, description="User ID (optional for anonymous)"
    ),
    anon_session_id: Optional[str] = Query(
        None, description="Anonymous session ID for consistent anon usernames"
    ),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Send a new chat message.

    The message is stored in the database. Supabase Realtime will automatically
    broadcast the new row to all subscribed clients.

    Anonymous users (no user_id) are allowed to chat but are still moderated.
    """
    # Debug: Log what we received
    import logging

    logging.warning(
        f"[DEBUG] send_message received: user_id={user_id}, anon_session_id={anon_session_id}"
    )
    print(
        f"[DEBUG] send_message received: user_id={user_id}, anon_session_id={anon_session_id}"
    )

    user = None

    # If user_id provided, verify user exists and is not banned
    if user_id:
        user_result = await session.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.is_banned:
            raise HTTPException(
                status_code=403,
                detail=user.ban_reason or "You have been banned from chat",
            )

    # Content moderation with OpenAI (always moderate, including anonymous)
    from src.services.moderation import moderate_content

    moderation_result = await moderate_content(message_data.content, use_openai=True)
    if not moderation_result.passed:
        # For authenticated users, use warning system (5 warnings before auto-ban)
        if user:
            user.warning_count += 1
            user.last_warning_at = datetime.utcnow()
            user.last_warning_reason = moderation_result.reason

            # Auto-ban on 5th violation
            if user.warning_count >= 5:
                user.is_banned = True
                user.banned_at = datetime.utcnow()
                user.ban_reason = f"Auto-banned after 5 warnings. Last violation: {moderation_result.reason}"
                await session.flush()
                raise HTTPException(status_code=403, detail=user.ban_reason)

            # Return warning (not ban) for violations 1-4
            await session.flush()
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "content_warning",
                    "category": moderation_result.category.value,
                    "reason": moderation_result.reason,
                    "warning_count": user.warning_count,
                    "warnings_until_ban": 5 - user.warning_count,
                },
            )

        # Anonymous users get immediate rejection (no warning system)
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

    # Create message (user_id can be None for anonymous)
    message = ChatMessage(
        user_id=user.id if user else None,
        anon_session_id=anon_session_id if not user else None,  # Only for anonymous
        content=message_data.content,
        message_type=MessageType.TEXT,
        reply_to_id=message_data.reply_to_id,
    )
    session.add(message)
    await session.flush()
    await session.refresh(message, ["user"])

    # Broadcast to all connected clients via Socket.IO
    response = message_to_response(message)
    await emit_chat_message(response.model_dump(mode="json"))

    return response


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

    # Broadcast system message to all clients
    response = message_to_response(message)
    await emit_chat_message(response.model_dump(mode="json"))

    return response


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

    # Broadcast deletion to all clients
    await emit_chat_delete(message_id)

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
