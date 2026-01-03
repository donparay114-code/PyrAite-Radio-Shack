"""Webhook handlers for n8n and external integrations."""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import (
    RadioHistory,
    RadioQueue,
    QueueStatus,
    Song,
    SunoStatus,
    get_async_session,
)
from src.services.suno_client import get_suno_client
from src.services.liquidsoap_client import get_liquidsoap_client
from src.services.telegram_bot import get_telegram_bot
from src.services.telegram_handlers import register_handlers
from src.utils.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class SunoWebhookPayload(BaseModel):
    """Payload from Suno status update webhook."""

    job_id: str
    status: str
    audio_url: Optional[str] = None
    title: Optional[str] = None
    duration: Optional[float] = None
    error: Optional[str] = None


class TelegramWebhookPayload(BaseModel):
    """Payload from Telegram bot webhook (simplified)."""

    update_id: int
    message: Optional[dict] = None
    callback_query: Optional[dict] = None


class N8NTriggerPayload(BaseModel):
    """Generic payload for n8n workflow triggers."""

    workflow: str
    action: str
    data: Optional[dict] = None


class BroadcastWebhookPayload(BaseModel):
    """Payload from Liquidsoap broadcast status update."""

    event: str  # "track_change"
    title: str
    artist: str
    filename: Optional[str] = None  # Optional, if available
    channel_id: Optional[str] = None  # Optional, for multi-channel support


def verify_webhook_secret(secret: Optional[str]) -> bool:
    """Verify webhook secret matches configured value."""
    if not settings.secret_key:
        return True  # No secret configured, allow all
    return secret == settings.secret_key


@router.post("/suno/status")
async def suno_status_webhook(
    payload: SunoWebhookPayload,
    x_webhook_secret: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Receive Suno job status updates.

    Called by n8n when Suno generation completes or fails.
    """
    if not verify_webhook_secret(x_webhook_secret):
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    # Find the queue item by suno_job_id
    query = select(RadioQueue).where(RadioQueue.suno_job_id == payload.job_id)
    result = await session.execute(query)
    queue_item = result.scalar_one_or_none()

    if not queue_item:
        logger.warning(f"Received webhook for unknown job ID: {payload.job_id}")
        # Return success to stop webhook retries, as we can't do anything
        return {"received": True, "status": "unknown_job"}

    logger.info(
        f"Processing webhook for job {payload.job_id}, status: {payload.status}"
    )

    # Normalize status
    status_lower = payload.status.lower()

    if status_lower in ["complete", "completed", "success"]:
        # Update queue item
        queue_item.status = QueueStatus.GENERATED.value
        queue_item.generation_completed_at = datetime.utcnow()

        # Check if song already exists
        song_query = select(Song).where(Song.suno_job_id == payload.job_id)
        song_result = await session.execute(song_query)
        song = song_result.scalar_one_or_none()

        if not song:
            # Create new song
            song = Song(
                suno_job_id=payload.job_id,
                suno_status=SunoStatus.COMPLETE.value,
                title=payload.title or "Untitled",
                duration_seconds=payload.duration,
                # Copy prompt info from queue item
                original_prompt=queue_item.original_prompt,
                enhanced_prompt=queue_item.enhanced_prompt,
                is_instrumental=queue_item.is_instrumental,
                # Genre/mood info might come from payload or queue item
                genre=queue_item.genre_hint,
                audio_url=payload.audio_url,
                generation_completed_at=datetime.utcnow(),
            )
            session.add(song)
            await session.flush()  # Get ID

        # Link song to queue item
        queue_item.song_id = song.id

        # Download audio if URL is present and not yet downloaded
        if payload.audio_url and not song.local_file_path:
            filename = f"{payload.job_id}.mp3"
            file_path = settings.songs_dir / filename

            # Use SunoClient to download
            client = get_suno_client()
            success = await client.download_audio(payload.audio_url, file_path)

            if success:
                song.local_file_path = str(file_path)
                song.downloaded_at = datetime.utcnow()
                logger.info(f"Downloaded audio to {file_path}")
            else:
                logger.error(f"Failed to download audio for job {payload.job_id}")
                queue_item.error_message = "Failed to download audio"

    elif status_lower in ["failed", "error"]:
        queue_item.status = QueueStatus.FAILED.value
        queue_item.error_message = payload.error or "Generation failed"
        queue_item.completed_at = datetime.utcnow()

    # Commit changes
    await session.commit()

    return {
        "received": True,
        "job_id": payload.job_id,
        "status": payload.status,
        "processed_at": datetime.utcnow().isoformat(),
    }


@router.post("/telegram/update")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: Optional[str] = Header(None),
):
    """
    Receive Telegram bot updates.

    This is an alternative to polling - Telegram sends updates here.
    """
    # Verify the request is from Telegram
    # In production, compare x_telegram_bot_api_secret_token with configured secret

    payload = await request.json()

    bot = get_telegram_bot()

    # Ensure handlers are registered
    if "request" not in bot._handlers["command"]:
        register_handlers(bot)

    # Process update
    await bot._process_update(payload)

    return {
        "ok": True,
        "update_id": payload.get("update_id"),
    }


@router.post("/n8n/trigger")
async def n8n_trigger_webhook(
    payload: N8NTriggerPayload,
    x_webhook_secret: Optional[str] = Header(None),
):
    """
    Generic trigger endpoint for n8n workflows.

    Allows n8n to trigger API actions.
    """
    if not verify_webhook_secret(x_webhook_secret):
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    # Route to appropriate handler based on workflow/action
    handlers = {
        "queue_processor": {
            "start": lambda d: {"message": "Queue processing triggered"},
            "stop": lambda d: {"message": "Queue processing stopped"},
        },
        "broadcaster": {
            "next_song": lambda d: {"message": "Skipping to next song"},
            "pause": lambda d: {"message": "Broadcast paused"},
            "resume": lambda d: {"message": "Broadcast resumed"},
        },
        "reputation": {
            "recalculate": lambda d: {"message": "Reputation recalculation triggered"},
        },
    }

    workflow_handlers = handlers.get(payload.workflow, {})
    handler = workflow_handlers.get(payload.action)

    if not handler:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown workflow/action: {payload.workflow}/{payload.action}",
        )

    result = handler(payload.data)
    return {
        "success": True,
        "workflow": payload.workflow,
        "action": payload.action,
        **result,
    }


@router.post("/broadcast/status")
async def broadcast_status_webhook(
    payload: BroadcastWebhookPayload,
    x_webhook_secret: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Receive broadcast status updates from Liquidsoap.

    Called when songs start/end playing.
    """
    if not verify_webhook_secret(x_webhook_secret):
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    # 1. Handle currently playing song (it just finished)
    # Find any RadioHistory entry that is currently open (ended_at is None)
    # Filter by channel if provided (stream_mount)
    query = select(RadioHistory).where(RadioHistory.ended_at.is_(None))

    if payload.channel_id:
        query = query.where(RadioHistory.stream_mount == payload.channel_id)

    result = await session.execute(query)
    current_histories = result.scalars().all()

    for history in current_histories:
        history.ended_at = datetime.utcnow()
        if history.played_at:
            delta = history.ended_at - history.played_at
            history.duration_played_seconds = delta.total_seconds()

        # Update associated queue item if any
        if history.queue_id:
            queue_query = select(RadioQueue).where(RadioQueue.id == history.queue_id)
            queue_result = await session.execute(queue_query)
            queue_item = queue_result.scalar_one_or_none()
            if queue_item:
                queue_item.status = QueueStatus.COMPLETED.value
                queue_item.completed_at = datetime.utcnow()

        # Update song play count
        song_query = select(Song).where(Song.id == history.song_id)
        song_result = await session.execute(song_query)
        song = song_result.scalar_one_or_none()
        if song:
            song.play_count += 1
            # Note: Song model doesn't have last_played_at field yet, rely on RadioHistory for that

    # 2. Handle new song start
    if payload.event == "track_change":
        # Find the song that corresponds to this track
        # Try finding in Queue first (most likely source)
        # We look for items in GENERATED or QUEUED status with matching title/artist

        # Note: Title matching can be tricky. Liquidsoap might send cleaner metadata than what we have in DB.
        # Ideally, we would pass song_id in metadata.

        # Strategy 1: Find matching GENERATED/BROADCASTING item in Queue
        queue_query = (
            select(RadioQueue)
            .join(Song, RadioQueue.song_id == Song.id)
            .where(
                RadioQueue.status.in_([QueueStatus.GENERATED.value, QueueStatus.BROADCASTING.value]),
                Song.title == payload.title,
                Song.artist == payload.artist
            )
            .order_by(
                RadioQueue.broadcast_started_at.desc().nulls_last(),
                RadioQueue.queued_at.asc(),  # FIFO: Oldest request first
            )
        )
        queue_result = await session.execute(queue_query)
        queue_item = queue_result.scalars().first()

        song = None

        if queue_item:
            # Found in queue
            song_query = select(Song).where(Song.id == queue_item.song_id)
            song = (await session.execute(song_query)).scalar_one_or_none()

            # Update status
            queue_item.status = QueueStatus.BROADCASTING.value
            if not queue_item.broadcast_started_at:
                queue_item.broadcast_started_at = datetime.utcnow()

        else:
            # Not found in active queue, check Song table directly (maybe fallback or replay)
            song_query = (
                select(Song)
                .where(Song.title == payload.title, Song.artist == payload.artist)
                .order_by(Song.id.desc())
            )
            song_result = await session.execute(song_query)
            song = song_result.scalars().first()

        if song:
            # Create new history entry
            new_history = RadioHistory(
                song_id=song.id,
                queue_id=queue_item.id if queue_item else None,
                played_at=datetime.utcnow(),
                song_title=song.title,
                song_artist=song.artist,
                song_genre=song.genre,
                stream_mount=payload.channel_id,
            )

            # Copy requester info if available
            if queue_item:
                new_history.requester_telegram_id = queue_item.telegram_user_id
                # user info lookup omitted for brevity, could join User

            session.add(new_history)
            logger.info(f"Started playing: {song.title} (ID: {song.id})")
        else:
            logger.warning(f"Could not find song for broadcast: {payload.artist} - {payload.title}")
            # We can't log to history without a song_id (non-nullable foreign key)
            # Future improvement: Create a "Unknown" placeholder song?

    await session.commit()

    # 3. Trigger next song logic (Check if queue needs filling)
    try:
        liquidsoap = get_liquidsoap_client()
        queue_len = await liquidsoap.get_queue_length()

        if queue_len is not None and queue_len < 2:
            # Queue is low, push next generated song
            next_query = (
                select(RadioQueue)
                .join(Song, RadioQueue.song_id == Song.id)
                .where(RadioQueue.status == QueueStatus.GENERATED.value)
                .order_by(
                    RadioQueue.priority_score.desc(),  # Priority first
                    RadioQueue.queued_at.asc()         # Then oldest
                )
                .limit(1)
            )
            next_result = await session.execute(next_query)
            next_item = next_result.scalar_one_or_none()

            if next_item:
                # Get song path
                song_query = select(Song).where(Song.id == next_item.song_id)
                song_result = await session.execute(song_query)
                next_song = song_result.scalar_one_or_none()

                if next_song and next_song.local_file_path:
                    # Push to Liquidsoap
                    # Note: We send the full local path. Liquidsoap needs to be able to access this path.
                    # Since they share volumes (presumably), this should work.
                    success = await liquidsoap.push_song(next_song.local_file_path)

                    if success:
                        logger.info(f"Pushed next song to Liquidsoap: {next_song.title}")
                        # We don't change status to BROADCASTING yet, that happens when it starts playing
                    else:
                        logger.error(f"Failed to push song to Liquidsoap: {next_song.title}")
    except Exception as e:
        logger.error(f"Error in trigger next song logic: {e}")

    return {
        "received": True,
        "processed_at": datetime.utcnow().isoformat(),
    }
