"""Queue manager service for processing song requests."""

import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import RadioQueue, QueueStatus, Song, SunoStatus, User
from src.services.suno_client import SunoClient, SunoJobStatus, get_suno_client
from src.utils.config import settings

logger = logging.getLogger(__name__)


class QueueManager:
    """Manages the radio song request queue."""

    def __init__(
        self,
        suno_client: Optional[SunoClient] = None,
        max_concurrent: int = 3,
        poll_interval: float = 10.0,
    ):
        self.suno_client = suno_client or get_suno_client()
        self.max_concurrent = max_concurrent
        self.poll_interval = poll_interval
        self._running = False
        self._active_jobs: dict[int, str] = {}  # queue_id -> suno_job_id

    async def start(self, session: AsyncSession) -> None:
        """Start the queue processing loop."""
        self._running = True
        logger.info("Queue manager started")

        while self._running:
            try:
                await self._process_cycle(session)
            except Exception as e:
                logger.error(f"Queue processing error: {e}")

            await asyncio.sleep(self.poll_interval)

    def stop(self) -> None:
        """Stop the queue processing loop."""
        self._running = False
        logger.info("Queue manager stopping")

    async def _process_cycle(self, session: AsyncSession) -> None:
        """Run one processing cycle."""
        # Check status of active jobs
        await self._check_active_jobs(session)

        # Start new jobs if we have capacity
        available_slots = self.max_concurrent - len(self._active_jobs)
        if available_slots > 0:
            await self._start_new_jobs(session, available_slots)

    async def _check_active_jobs(self, session: AsyncSession) -> None:
        """Check status of currently generating jobs."""
        for queue_id, suno_job_id in list(self._active_jobs.items()):
            try:
                result = await self.suno_client.get_status(suno_job_id)

                if result.status == SunoJobStatus.COMPLETE:
                    await self._handle_completion(session, queue_id, result)
                    del self._active_jobs[queue_id]

                elif result.status in (SunoJobStatus.FAILED, SunoJobStatus.ERROR):
                    await self._handle_failure(session, queue_id, result)
                    del self._active_jobs[queue_id]

                # Still processing - continue waiting

            except Exception as e:
                logger.error(f"Error checking job {suno_job_id}: {e}")

    async def _start_new_jobs(self, session: AsyncSession, count: int) -> None:
        """Start new generation jobs from the queue."""
        # Get pending items ordered by priority
        query = (
            select(RadioQueue)
            .where(RadioQueue.status == QueueStatus.PENDING.value)
            .where(RadioQueue.is_moderated == True)  # noqa: E712
            .where(RadioQueue.moderation_passed == True)  # noqa: E712
            .order_by(RadioQueue.priority_score.desc())
            .limit(count)
        )

        result = await session.execute(query)
        pending_items = result.scalars().all()

        for item in pending_items:
            await self._start_generation(session, item)

    async def _start_generation(self, session: AsyncSession, item: RadioQueue) -> None:
        """Start generation for a queue item."""
        try:
            # Update status to generating
            item.status = QueueStatus.GENERATING.value
            item.generation_started_at = datetime.utcnow()
            await session.flush()

            # Submit to Suno
            from src.services.suno_client import SunoGenerationRequest

            request = SunoGenerationRequest(
                prompt=item.enhanced_prompt or item.original_prompt,
                style=item.genre_hint,
                is_instrumental=item.is_instrumental,
            )

            result = await self.suno_client.generate(request)

            if result.status == SunoJobStatus.ERROR:
                item.status = QueueStatus.FAILED.value
                item.error_message = result.error_message
                logger.error(f"Generation failed for queue {item.id}: {result.error_message}")
            else:
                item.suno_job_id = result.job_id
                self._active_jobs[item.id] = result.job_id
                logger.info(f"Started generation for queue {item.id}, job {result.job_id}")

            await session.flush()

        except Exception as e:
            logger.error(f"Failed to start generation for queue {item.id}: {e}")
            item.status = QueueStatus.FAILED.value
            item.error_message = str(e)
            await session.flush()

    async def _handle_completion(
        self,
        session: AsyncSession,
        queue_id: int,
        result,
    ) -> None:
        """Handle successful generation completion."""
        # Get queue item
        query = select(RadioQueue).where(RadioQueue.id == queue_id)
        item_result = await session.execute(query)
        item = item_result.scalar_one_or_none()

        if not item:
            logger.error(f"Queue item {queue_id} not found")
            return

        # Create song record
        song = Song(
            suno_job_id=result.job_id,
            suno_status=SunoStatus.COMPLETE.value,
            title=result.title or f"Song #{queue_id}",
            original_prompt=item.original_prompt,
            enhanced_prompt=item.enhanced_prompt,
            genre=item.genre_hint,
            is_instrumental=item.is_instrumental,
            audio_url=result.audio_url,
            duration_seconds=result.duration_seconds,
            lyrics=result.lyrics,
            generation_started_at=item.generation_started_at,
            generation_completed_at=datetime.utcnow(),
        )
        session.add(song)
        await session.flush()

        # Download audio file
        if result.audio_url:
            download_path = settings.songs_dir / f"{song.id}_{result.job_id}.mp3"
            success = await self.suno_client.download_audio(result.audio_url, download_path)
            if success:
                song.local_file_path = str(download_path)
                song.downloaded_at = datetime.utcnow()

        # Update queue item
        item.song_id = song.id
        item.status = QueueStatus.GENERATED.value
        item.generation_completed_at = datetime.utcnow()

        # Update user stats
        if item.user_id:
            await self._update_user_stats(session, item.user_id, success=True)

        await session.flush()
        logger.info(f"Completed generation for queue {queue_id}, song {song.id}")

    async def _handle_failure(
        self,
        session: AsyncSession,
        queue_id: int,
        result,
    ) -> None:
        """Handle generation failure."""
        query = select(RadioQueue).where(RadioQueue.id == queue_id)
        item_result = await session.execute(query)
        item = item_result.scalar_one_or_none()

        if not item:
            return

        item.retry_count += 1
        item.error_message = result.error_message

        if item.can_retry:
            # Reset to pending for retry
            item.status = QueueStatus.PENDING.value
            logger.warning(f"Queue {queue_id} failed, will retry ({item.retry_count}/{item.max_retries})")
        else:
            # Max retries reached
            item.status = QueueStatus.FAILED.value
            logger.error(f"Queue {queue_id} failed permanently: {result.error_message}")

            # Update user stats
            if item.user_id:
                await self._update_user_stats(session, item.user_id, success=False)

        await session.flush()

    async def _update_user_stats(
        self,
        session: AsyncSession,
        user_id: int,
        success: bool,
    ) -> None:
        """Update user statistics after generation."""
        query = select(User).where(User.id == user_id)
        result = await session.execute(query)
        user = result.scalar_one_or_none()

        if user:
            user.total_requests += 1
            if success:
                user.successful_requests += 1
            else:
                user.failed_requests += 1
            user.update_reputation()
            await session.flush()

    async def get_queue_position(self, session: AsyncSession, queue_id: int) -> Optional[int]:
        """Get the position of an item in the queue."""
        # Get items ordered by priority
        query = (
            select(RadioQueue.id)
            .where(RadioQueue.status.in_([QueueStatus.PENDING.value, QueueStatus.QUEUED.value]))
            .order_by(RadioQueue.priority_score.desc())
        )

        result = await session.execute(query)
        queue_ids = [row[0] for row in result.fetchall()]

        try:
            return queue_ids.index(queue_id) + 1
        except ValueError:
            return None

    async def get_estimated_wait(self, session: AsyncSession, queue_id: int) -> Optional[float]:
        """
        Get estimated wait time in minutes for a queue item.

        Based on average generation time and position.
        """
        position = await self.get_queue_position(session, queue_id)
        if position is None:
            return None

        # Estimate ~2 minutes per song, processing in batches
        items_ahead = position - 1
        batches = (items_ahead // self.max_concurrent) + 1
        return batches * 2.0

    async def recalculate_priorities(self, session: AsyncSession) -> int:
        """
        Recalculate priority scores for all pending items.

        Returns count of updated items.
        """
        query = select(RadioQueue).where(
            RadioQueue.status.in_([QueueStatus.PENDING.value, QueueStatus.QUEUED.value])
        )

        result = await session.execute(query)
        items = result.scalars().all()

        for item in items:
            # Get user reputation if available
            user_rep = 0.0
            if item.user_id:
                user_query = select(User.reputation_score).where(User.id == item.user_id)
                user_result = await session.execute(user_query)
                user_rep = user_result.scalar() or 0.0

            item.update_priority(user_rep)

        await session.flush()
        logger.info(f"Recalculated priorities for {len(items)} items")
        return len(items)


# Singleton instance
_queue_manager: Optional[QueueManager] = None


def get_queue_manager() -> QueueManager:
    """Get the queue manager singleton."""
    global _queue_manager
    if _queue_manager is None:
        _queue_manager = QueueManager()
    return _queue_manager
