"""APScheduler configuration for background tasks.

Replaces n8n workflows with native Python background tasks.
"""

import logging
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler: Optional[AsyncIOScheduler] = None


def get_scheduler() -> AsyncIOScheduler:
    """Get or create the scheduler instance."""
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler()
    return _scheduler


def setup_scheduler() -> AsyncIOScheduler:
    """Set up and start the scheduler with all jobs.

    Jobs:
    - queue_processor: Polls pending queue items every 30 seconds
    - broadcast_director: Manages broadcast flow every 60 seconds
    """
    scheduler = get_scheduler()

    # Import task functions
    from src.services.tasks.broadcast_director import broadcast_director_job
    from src.services.tasks.queue_processor import process_queue_job

    # Add queue processor job - runs every 30 seconds
    scheduler.add_job(
        process_queue_job,
        IntervalTrigger(seconds=30),
        id="queue_processor",
        name="Queue Processor - Suno Music Generation",
        replace_existing=True,
        max_instances=1,  # Prevent overlapping runs
    )

    # Add broadcast director job - runs every 60 seconds
    scheduler.add_job(
        broadcast_director_job,
        IntervalTrigger(seconds=60),
        id="broadcast_director",
        name="Broadcast Director - DJ Intros & Broadcasting",
        replace_existing=True,
        max_instances=1,
    )

    logger.info("APScheduler jobs configured")
    return scheduler


def start_scheduler():
    """Start the scheduler."""
    scheduler = get_scheduler()
    if not scheduler.running:
        scheduler.start()
        logger.info("APScheduler started")


def stop_scheduler():
    """Stop the scheduler gracefully."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=True)
        logger.info("APScheduler stopped")
        _scheduler = None
