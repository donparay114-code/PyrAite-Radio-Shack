"""Queue management API routes."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import RadioQueue, QueueStatus, get_async_session

router = APIRouter()


# Request/Response models
class QueueItemCreate(BaseModel):
    """Create a new queue item."""

    prompt: str = Field(..., min_length=3, max_length=1000)
    genre_hint: Optional[str] = Field(None, max_length=100)
    is_instrumental: bool = False
    telegram_user_id: Optional[int] = None
    telegram_message_id: Optional[int] = None


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


class QueueStatsResponse(BaseModel):
    """Queue statistics response."""

    total_items: int
    pending: int
    generating: int
    completed_today: int
    average_wait_minutes: float


@router.get("/", response_model=list[QueueItemResponse])
async def list_queue(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_async_session),
):
    """List queue items, ordered by priority."""
    query = select(RadioQueue).order_by(RadioQueue.priority_score.desc())

    if status:
        query = query.where(RadioQueue.status == status)

    query = query.offset(offset).limit(limit)
    result = await session.execute(query)
    return result.scalars().all()


@router.post("/", response_model=QueueItemResponse, status_code=201)
async def create_queue_item(
    item: QueueItemCreate,
    session: AsyncSession = Depends(get_async_session),
):
    """Add a new item to the queue."""
    queue_item = RadioQueue(
        original_prompt=item.prompt,
        genre_hint=item.genre_hint,
        is_instrumental=item.is_instrumental,
        telegram_user_id=item.telegram_user_id,
        telegram_message_id=item.telegram_message_id,
        status=QueueStatus.PENDING.value,
        requested_at=datetime.utcnow(),
    )
    session.add(queue_item)
    await session.flush()
    await session.refresh(queue_item)
    return queue_item


@router.get("/stats", response_model=QueueStatsResponse)
async def get_queue_stats(
    session: AsyncSession = Depends(get_async_session),
):
    """Get queue statistics."""
    # Total items
    total_result = await session.execute(select(func.count(RadioQueue.id)))
    total_items = total_result.scalar() or 0

    # Pending items
    pending_result = await session.execute(
        select(func.count(RadioQueue.id)).where(
            RadioQueue.status == QueueStatus.PENDING.value
        )
    )
    pending = pending_result.scalar() or 0

    # Generating items
    generating_result = await session.execute(
        select(func.count(RadioQueue.id)).where(
            RadioQueue.status == QueueStatus.GENERATING.value
        )
    )
    generating = generating_result.scalar() or 0

    # Completed today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    completed_result = await session.execute(
        select(func.count(RadioQueue.id)).where(
            RadioQueue.status == QueueStatus.COMPLETED.value,
            RadioQueue.completed_at >= today_start,
        )
    )
    completed_today = completed_result.scalar() or 0

    return QueueStatsResponse(
        total_items=total_items,
        pending=pending,
        generating=generating,
        completed_today=completed_today,
        average_wait_minutes=0.0,  # TODO: Calculate actual average
    )


@router.get("/{queue_id}", response_model=QueueItemResponse)
async def get_queue_item(
    queue_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    """Get a specific queue item by ID."""
    result = await session.execute(
        select(RadioQueue).where(RadioQueue.id == queue_id)
    )
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
    result = await session.execute(
        select(RadioQueue).where(RadioQueue.id == queue_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")

    if item.status not in [QueueStatus.PENDING.value, QueueStatus.QUEUED.value]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel item in '{item.status}' status",
        )

    item.status = QueueStatus.CANCELLED.value
    return {"message": "Queue item cancelled", "id": queue_id}
