"""Queue processor background task.

Polls pending queue items and triggers Suno music generation.
Replaces the n8n queue_processor workflow.
"""

import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.models.base import get_async_engine
from src.services.queue_manager import get_queue_manager

logger = logging.getLogger(__name__)

# Session maker for background tasks
_session_maker: Optional[async_sessionmaker[AsyncSession]] = None


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    """Get or create session maker for background tasks."""
    global _session_maker
    if _session_maker is None:
        engine = get_async_engine()
        _session_maker = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
        )
    return _session_maker


async def process_queue_job():
    """Process pending queue items.

    This job runs every 30 seconds and:
    1. Checks status of active Suno generation jobs
    2. Starts new generation jobs for pending items (up to max_concurrent)
    3. Updates queue item statuses

    Uses the QueueManager singleton which handles:
    - Priority-based queue ordering
    - Concurrent job limiting
    - Retry logic on failures
    - Audio download and mastering
    """
    logger.debug("Queue processor job starting")

    session_maker = get_session_maker()
    queue_manager = get_queue_manager()

    async with session_maker() as session:
        try:
            # Run one processing cycle
            await queue_manager._process_cycle(session)
            await session.commit()
            logger.debug("Queue processor cycle complete")
        except Exception as e:
            logger.error(f"Queue processor error: {e}")
            await session.rollback()
