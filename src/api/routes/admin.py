"""Admin API routes for dashboard statistics."""

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import RadioQueue, Song, User, get_async_session
from src.models.queue import QueueStatus

router = APIRouter()


class AdminStatsResponse(BaseModel):
    """Admin dashboard statistics response."""

    total_users: int
    total_songs: int
    total_requests: int
    active_queue_size: int
    daily_requests: int
    estimated_api_cost: float


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get admin dashboard statistics.

    Returns aggregate statistics for the admin dashboard including:
    - Total registered users
    - Total generated songs
    - Total song requests
    - Active queue size (pending/generating)
    - Daily requests count
    - Estimated API costs based on generated songs
    """
    # Total users
    total_users_result = await session.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0

    # Total songs
    total_songs_result = await session.execute(select(func.count(Song.id)))
    total_songs = total_songs_result.scalar() or 0

    # Total requests
    total_requests_result = await session.execute(select(func.count(RadioQueue.id)))
    total_requests = total_requests_result.scalar() or 0

    # Active queue size (pending, queued, or generating)
    active_statuses = [
        QueueStatus.PENDING.value,
        QueueStatus.QUEUED.value,
        QueueStatus.GENERATING.value,
    ]
    active_queue_result = await session.execute(
        select(func.count(RadioQueue.id)).where(RadioQueue.status.in_(active_statuses))
    )
    active_queue_size = active_queue_result.scalar() or 0

    # Daily requests (requests created today)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    daily_requests_result = await session.execute(
        select(func.count(RadioQueue.id)).where(RadioQueue.created_at >= today)
    )
    daily_requests = daily_requests_result.scalar() or 0

    # Estimated API cost
    # Suno API costs approximately $0.05 per generation (estimate)
    cost_per_song = 0.05
    estimated_api_cost = round(total_songs * cost_per_song, 2)

    return AdminStatsResponse(
        total_users=total_users,
        total_songs=total_songs,
        total_requests=total_requests,
        active_queue_size=active_queue_size,
        daily_requests=daily_requests,
        estimated_api_cost=estimated_api_cost,
    )
