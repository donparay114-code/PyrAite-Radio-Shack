"""Live station status service for dashboard and real-time updates."""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import RadioHistory, RadioQueue, QueueStatus, Song, User

logger = logging.getLogger(__name__)


class LiveStatusService:
    """Service to aggregate current station status."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_station_status(self) -> dict:
        """Get comprehensive station status for dashboard."""
        # Get current song (most recent history entry without end time)
        current_song = await self._get_current_song()

        # Get queue counts
        queue_summary = await self.get_queue_summary()

        # Get generating items count
        generating_items = await self.get_generating_items()

        return {
            "current_song": current_song,
            "queue_summary": queue_summary,
            "generating_count": len(generating_items),
            "generating_items": generating_items,
            "active_listeners": 0,  # Placeholder - would need Socket.IO room count
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def _get_current_song(self) -> Optional[dict]:
        """Get the currently playing song."""
        query = (
            select(RadioHistory)
            .where(RadioHistory.ended_at.is_(None))
            .order_by(RadioHistory.played_at.desc())
            .limit(1)
        )
        result = await self.session.execute(query)
        history = result.scalar_one_or_none()

        if not history:
            return None

        # Get associated song details
        song_query = select(Song).where(Song.id == history.song_id)
        song_result = await self.session.execute(song_query)
        song = song_result.scalar_one_or_none()

        if not song:
            return {
                "id": history.id,
                "title": history.song_title or "Unknown",
                "artist": history.song_artist or "Unknown",
                "started_at": history.played_at.isoformat() if history.played_at else None,
            }

        return {
            "id": song.id,
            "title": song.title or "Unknown",
            "artist": song.artist or "AI Radio",
            "genre": song.genre,
            "duration_seconds": song.duration_seconds,
            "started_at": history.played_at.isoformat() if history.played_at else None,
            "requester_telegram_id": history.requester_telegram_id,
        }

    async def get_generating_items(self) -> list[dict]:
        """Get list of items currently being generated."""
        active_statuses = [
            QueueStatus.PENDING.value,
            QueueStatus.QUEUED.value,
            QueueStatus.GENERATING.value,
        ]

        query = (
            select(RadioQueue)
            .where(RadioQueue.status.in_(active_statuses))
            .order_by(RadioQueue.priority_score.desc(), RadioQueue.created_at.asc())
        )
        result = await self.session.execute(query)
        items = result.scalars().all()

        generating_list = []
        for item in items:
            # Get username if user exists
            username = None
            if item.user_id:
                user_query = select(User).where(User.id == item.user_id)
                user_result = await self.session.execute(user_query)
                user = user_result.scalar_one_or_none()
                if user:
                    username = user.display_name

            generating_list.append({
                "queue_id": item.id,
                "status": item.status,
                "genre": item.genre_hint,
                "username": username or f"User #{item.telegram_user_id or 'Unknown'}",
                "prompt": item.original_prompt[:100] + "..." if len(item.original_prompt) > 100 else item.original_prompt,
                "priority_score": item.priority_score,
                "upvotes": item.upvotes,
                "downvotes": item.downvotes,
                "started_at": item.generation_started_at.isoformat() if item.generation_started_at else None,
                "requested_at": item.requested_at.isoformat() if item.requested_at else None,
            })

        return generating_list

    async def get_queue_summary(self) -> dict:
        """Get queue summary with counts by status."""
        # Count by status
        status_counts = {}
        for status in QueueStatus:
            count_query = select(func.count(RadioQueue.id)).where(
                RadioQueue.status == status.value
            )
            result = await self.session.execute(count_query)
            status_counts[status.value] = result.scalar() or 0

        # Total active (non-terminal)
        active_statuses = [
            QueueStatus.PENDING.value,
            QueueStatus.QUEUED.value,
            QueueStatus.GENERATING.value,
            QueueStatus.GENERATED.value,
        ]
        active_count = sum(status_counts.get(s, 0) for s in active_statuses)

        # Estimate wait time based on queue position and avg generation time
        avg_generation_time = 60  # seconds, estimate
        estimated_wait = active_count * avg_generation_time

        return {
            "total_active": active_count,
            "by_status": status_counts,
            "estimated_wait_seconds": estimated_wait,
            "estimated_wait_formatted": self._format_wait_time(estimated_wait),
        }

    @staticmethod
    def _format_wait_time(seconds: int) -> str:
        """Format wait time in human readable format."""
        if seconds < 60:
            return f"{seconds}s"
        elif seconds < 3600:
            minutes = seconds // 60
            return f"~{minutes} min"
        else:
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            return f"~{hours}h {minutes}m"


async def get_live_status_service(session: AsyncSession) -> LiveStatusService:
    """Factory function to create LiveStatusService instance."""
    return LiveStatusService(session)
