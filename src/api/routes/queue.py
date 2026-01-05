"""Queue management API routes."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.socket_manager import emit_queue_updated
from src.models import QueueStatus, RadioQueue, get_async_session
from src.services.icecast import get_current_listeners
from src.services.live_status import LiveStatusService
from src.utils.config import settings

router = APIRouter()

# Rate limiter for queue endpoints
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.redis_url if settings.redis_url else None,
)


# Request/Response models
class QueueItemCreate(BaseModel):
    """Create a new queue item."""

    prompt: str = Field(..., min_length=3, max_length=1000)
    genre_hint: Optional[str] = Field(None, max_length=100)
    is_instrumental: bool = False
    telegram_user_id: Optional[int] = None
    telegram_message_id: Optional[int] = None
    user_id: Optional[int] = None


class QueueItemResponse(BaseModel):
    """Queue item response."""

    id: int
    original_prompt: str
    status: str
    priority_score: float
    upvotes: int
    downvotes: int
    requested_at: datetime
    genre_hint: Optional[str] = None

    class Config:
        from_attributes = True


class QueueUserResponse(BaseModel):
    """User response for queue items."""

    id: int
    display_name: str
    telegram_username: Optional[str] = None
    reputation_score: float
    tier: str

    class Config:
        from_attributes = True


class QueueStatsResponse(BaseModel):
    """Queue statistics response."""

    total_items: int
    pending: int
    generating: int
    completed_today: int
    average_wait_minutes: float


class SongResponse(BaseModel):
    """Song response for now playing."""

    id: int
    suno_song_id: Optional[str] = None
    suno_job_id: Optional[str] = None
    title: Optional[str] = None
    artist: str = "AI Radio"
    genre: Optional[str] = None
    style_tags: list[str] = []
    mood: Optional[str] = None
    duration_seconds: Optional[float] = None
    audio_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    original_prompt: Optional[str] = None
    enhanced_prompt: Optional[str] = None
    lyrics: Optional[str] = None
    is_instrumental: bool = False
    play_count: int = 0
    total_upvotes: int = 0
    total_downvotes: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NowPlayingQueueItem(BaseModel):
    """Queue item for now playing response."""

    id: int
    user_id: Optional[int] = None
    song_id: Optional[int] = None
    telegram_user_id: Optional[int] = None
    original_prompt: str
    enhanced_prompt: Optional[str] = None
    genre_hint: Optional[str] = None
    style_tags: list[str] = []
    is_instrumental: bool = False
    status: str
    priority_score: float
    base_priority: float = 100.0
    upvotes: int = 0
    downvotes: int = 0
    suno_job_id: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    requested_at: datetime
    queued_at: Optional[datetime] = None
    generation_started_at: Optional[datetime] = None
    generation_completed_at: Optional[datetime] = None
    broadcast_started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    user: Optional[QueueUserResponse] = None

    class Config:
        from_attributes = True


class NowPlayingResponse(BaseModel):
    """Now playing response."""

    queue_item: Optional[NowPlayingQueueItem] = None
    song: Optional[SongResponse] = None
    started_at: Optional[datetime] = None
    progress_seconds: float = 0.0
    listeners: int = 0


@router.get("/", response_model=list[QueueItemResponse])
async def list_queue(
    status: Optional[str] = Query(None, description="Filter by status"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_async_session),
):
    """List queue items, ordered by priority."""
    query = select(RadioQueue).order_by(RadioQueue.priority_score.desc())

    if status:
        query = query.where(RadioQueue.status == status)

    if user_id:
        query = query.where(RadioQueue.user_id == user_id)

    query = query.offset(offset).limit(limit)
    result = await session.execute(query)
    return result.scalars().all()


@router.post("/", response_model=QueueItemResponse, status_code=201)
@limiter.limit("10/minute")  # 10 requests per minute per IP
async def create_queue_item(
    request: Request,
    item: QueueItemCreate,
    session: AsyncSession = Depends(get_async_session),
):
    """Add a new item to the queue."""
    # Content moderation check
    from src.services.moderation import moderate_content

    moderation_result = await moderate_content(item.prompt, use_openai=True)
    if not moderation_result.passed:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "content_moderation_failed",
                "category": moderation_result.category.value,
                "reason": moderation_result.reason,
            },
        )

    # Daily limit for anonymous users (2/day by IP)
    if not item.user_id:
        from datetime import datetime as dt

        import redis.asyncio as redis

        try:
            if settings.redis_url:
                redis_client = redis.from_url(settings.redis_url)
                client_ip = request.client.host if request.client else "unknown"
                today_date = dt.utcnow().strftime("%Y-%m-%d")
                key = f"anon_requests:{client_ip}:{today_date}"

                count = await redis_client.incr(key)
                if count == 1:
                    await redis_client.expire(key, 86400)  # 24 hours
                if count > 2:
                    await redis_client.close()
                    raise HTTPException(
                        status_code=429,
                        detail="Anonymous users are limited to 2 requests per day. Sign up for more!",
                    )
                await redis_client.close()
        except redis.ConnectionError:
            pass  # Skip limit check if Redis unavailable

    queue_item = RadioQueue(
        original_prompt=item.prompt,
        genre_hint=item.genre_hint,
        is_instrumental=item.is_instrumental,
        telegram_user_id=item.telegram_user_id,
        telegram_message_id=item.telegram_message_id,
        user_id=item.user_id,
        status=QueueStatus.PENDING.value,
        requested_at=datetime.utcnow(),
    )
    session.add(queue_item)
    await session.commit()
    await session.refresh(queue_item)

    # Broadcast queue update to all connected clients
    await emit_queue_updated(
        {
            "action": "created",
            "item_id": queue_item.id,
            "items": [
                {
                    "id": queue_item.id,
                    "prompt": queue_item.original_prompt,
                    "status": queue_item.status,
                    "priority_score": queue_item.priority_score,
                }
            ],
        }
    )

    return queue_item


@router.get("/stats", response_model=QueueStatsResponse)
async def get_queue_stats(
    session: AsyncSession = Depends(get_async_session),
):
    """Get queue statistics."""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Combine counts into a single query
    from sqlalchemy import and_, case

    query = select(
        func.count(RadioQueue.id),
        func.sum(case((RadioQueue.status == QueueStatus.PENDING.value, 1), else_=0)),
        func.sum(case((RadioQueue.status == QueueStatus.GENERATING.value, 1), else_=0)),
        func.sum(
            case(
                (
                    and_(
                        RadioQueue.status == QueueStatus.COMPLETED.value,
                        RadioQueue.completed_at >= today_start,
                    ),
                    1,
                ),
                else_=0,
            )
        ),
    )

    result = await session.execute(query)
    total_items, pending, generating, completed_today = result.one()

    # Handle None returns from sum
    total_items = total_items or 0
    pending = pending or 0
    generating = generating or 0
    completed_today = completed_today or 0

    # Calculate average wait time (for items completed today)
    # We fetch timestamps and calculate in Python to support both SQLite (tests) and Postgres
    wait_times_result = await session.execute(
        select(RadioQueue.requested_at, RadioQueue.completed_at).where(
            RadioQueue.status == QueueStatus.COMPLETED.value,
            RadioQueue.completed_at >= today_start,
        )
    )
    wait_times = wait_times_result.all()

    total_wait_seconds = 0.0
    count = 0
    for req_at, comp_at in wait_times:
        if req_at and comp_at:
            total_wait_seconds += (comp_at - req_at).total_seconds()
            count += 1

    average_wait_minutes = round(
        (total_wait_seconds / count / 60) if count > 0 else 0.0, 1
    )

    return QueueStatsResponse(
        total_items=total_items,
        pending=pending,
        generating=generating,
        completed_today=completed_today,
        average_wait_minutes=average_wait_minutes,
    )


@router.get("/now-playing", response_model=NowPlayingResponse)
async def get_now_playing(
    session: AsyncSession = Depends(get_async_session),
):
    """Get the currently playing or most recent broadcast item."""
    # First, try to find a currently broadcasting item
    query = (
        select(RadioQueue)
        .options(selectinload(RadioQueue.song), selectinload(RadioQueue.user))
        .where(RadioQueue.status == QueueStatus.BROADCASTING.value)
        .order_by(RadioQueue.broadcast_started_at.desc())
        .limit(1)
    )
    result = await session.execute(query)
    queue_item = result.scalar_one_or_none()

    # If nothing is broadcasting, get the most recently completed item
    if not queue_item:
        query = (
            select(RadioQueue)
            .options(selectinload(RadioQueue.song), selectinload(RadioQueue.user))
            .where(RadioQueue.status == QueueStatus.COMPLETED.value)
            .order_by(RadioQueue.completed_at.desc())
            .limit(1)
        )
        result = await session.execute(query)
        queue_item = result.scalar_one_or_none()

    # If still nothing, return empty response
    if not queue_item:
        return NowPlayingResponse(listeners=await get_current_listeners())

    # Calculate progress if broadcasting
    progress_seconds = 0.0
    if (
        queue_item.broadcast_started_at
        and queue_item.status == QueueStatus.BROADCASTING.value
    ):
        delta = datetime.utcnow() - queue_item.broadcast_started_at
        progress_seconds = delta.total_seconds()

    # Build song response if available
    song_response = None
    if queue_item.song:
        song = queue_item.song
        song_response = SongResponse(
            id=song.id,
            suno_song_id=None,
            suno_job_id=song.suno_job_id,
            title=song.title,
            artist=song.artist,
            genre=song.genre,
            style_tags=[],
            mood=song.mood,
            duration_seconds=song.duration_seconds,
            audio_url=song.audio_url,
            cover_image_url=None,
            original_prompt=song.original_prompt,
            enhanced_prompt=song.enhanced_prompt,
            lyrics=song.lyrics,
            is_instrumental=song.is_instrumental,
            play_count=song.play_count,
            total_upvotes=song.total_upvotes,
            total_downvotes=song.total_downvotes,
            created_at=song.created_at,
        )

    # Serialize user if available
    user_data = None
    if queue_item.user:
        user_data = QueueUserResponse(
            id=queue_item.user.id,
            display_name=queue_item.user.display_name,
            telegram_username=queue_item.user.telegram_username,
            reputation_score=queue_item.user.reputation_score,
            tier=(
                queue_item.user.tier.value
                if hasattr(queue_item.user.tier, "value")
                else queue_item.user.tier
            ),
        )

    # Build queue item response
    queue_item_response = NowPlayingQueueItem(
        id=queue_item.id,
        user_id=queue_item.user_id,
        song_id=queue_item.song_id,
        telegram_user_id=queue_item.telegram_user_id,
        original_prompt=queue_item.original_prompt,
        enhanced_prompt=queue_item.enhanced_prompt,
        genre_hint=queue_item.genre_hint,
        style_tags=[],
        is_instrumental=queue_item.is_instrumental,
        status=queue_item.status,
        priority_score=queue_item.priority_score,
        base_priority=queue_item.base_priority,
        upvotes=queue_item.upvotes,
        downvotes=queue_item.downvotes,
        suno_job_id=queue_item.suno_job_id,
        error_message=queue_item.error_message,
        retry_count=queue_item.retry_count,
        requested_at=queue_item.requested_at,
        queued_at=queue_item.queued_at,
        generation_started_at=queue_item.generation_started_at,
        generation_completed_at=queue_item.generation_completed_at,
        broadcast_started_at=queue_item.broadcast_started_at,
        completed_at=queue_item.completed_at,
        user=user_data,
    )

    return NowPlayingResponse(
        queue_item=queue_item_response,
        song=song_response,
        started_at=queue_item.broadcast_started_at,
        progress_seconds=progress_seconds,
        listeners=await get_current_listeners(),
    )


@router.get("/{queue_id}", response_model=QueueItemResponse)
async def get_queue_item(
    queue_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    """Get a specific queue item by ID."""
    result = await session.execute(select(RadioQueue).where(RadioQueue.id == queue_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    return item


@router.delete("/{queue_id}")
async def cancel_queue_item(
    queue_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    """Cancel a queue item (if not yet generating)."""
    result = await session.execute(select(RadioQueue).where(RadioQueue.id == queue_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")

    if item.status not in [QueueStatus.PENDING.value, QueueStatus.QUEUED.value]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel item in '{item.status}' status",
        )

    item.status = QueueStatus.CANCELLED.value
    await session.commit()

    # Broadcast queue update to all connected clients
    await emit_queue_updated(
        {
            "action": "cancelled",
            "item_id": queue_id,
            "items": [],
        }
    )

    return {"message": "Queue item cancelled", "id": queue_id}


@router.get("/live-status")
async def get_live_status(
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get comprehensive live station status.

    Returns current song, queue summary, generating items, and more.
    Used by the dashboard and GenerationFeed component.
    """
    service = LiveStatusService(session)
    return await service.get_station_status()


@router.get("/generating")
async def get_generating_items(
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get list of items currently being generated.

    Returns items with status: pending, queued, or generating.
    """
    service = LiveStatusService(session)
    return await service.get_generating_items()
