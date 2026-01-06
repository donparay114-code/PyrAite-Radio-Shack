"""Broadcast director background task.

Manages the broadcast flow: selects next song, announces in Telegram,
and queues in Liquidsoap.
Replaces the n8n broadcast_director workflow.
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from src.api.socket_manager import emit_now_playing
from src.models import QueueStatus, RadioHistory, RadioQueue, Song, User
from src.models.base import get_async_engine
from src.services.liquidsoap_client import get_liquidsoap_client
from src.services.telegram_bot import get_telegram_bot

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


async def broadcast_director_job():
    """Direct the broadcast flow.

    This job runs every 60 seconds and:
    1. Completes any songs that have finished playing
    2. Checks if Liquidsoap queue needs more songs
    3. Gets the next generated song by priority
    4. Announces the song in Telegram
    5. Pushes the song to Liquidsoap
    6. Creates a broadcast history entry
    7. Updates queue item status to BROADCASTING
    """
    logger.debug("Broadcast director job starting")

    session_maker = get_session_maker()
    liquidsoap = get_liquidsoap_client()

    async with session_maker() as session:
        try:
            # First, complete any songs that have finished playing
            await _complete_finished_broadcasts(session)

            # Check Liquidsoap queue length
            queue_length = await liquidsoap.get_queue_length()

            # If queue is low or None (couldn't connect), try to add songs
            if queue_length is None or queue_length < 2:
                await _queue_next_song(session, liquidsoap)

            await session.commit()
            logger.debug("Broadcast director cycle complete")
        except Exception as e:
            logger.error(f"Broadcast director error: {e}")
            await session.rollback()


async def _complete_finished_broadcasts(session: AsyncSession):
    """Mark broadcasting songs as completed if their duration has elapsed."""
    query = (
        select(RadioQueue)
        .options(selectinload(RadioQueue.song))
        .where(RadioQueue.status == QueueStatus.BROADCASTING.value)
    )
    result = await session.execute(query)
    broadcasting_items = result.scalars().all()

    now = datetime.utcnow()
    for item in broadcasting_items:
        if not item.broadcast_started_at:
            continue

        elapsed = (now - item.broadcast_started_at).total_seconds()

        # Get song duration, default to 180 seconds (3 min) if not available
        duration = 180.0
        if item.song and item.song.duration_seconds:
            duration = item.song.duration_seconds
        elif not item.song:
            # Song missing - complete after default duration
            logger.warning(f"Queue item {item.id} has no associated song")

        if elapsed >= duration:
            item.status = QueueStatus.COMPLETED.value
            item.completed_at = now
            title = item.song.title if item.song else f"Queue Item #{item.id}"
            logger.info(f"Completed broadcast: {title} (played {elapsed:.0f}s)")


async def _queue_next_song(session: AsyncSession, liquidsoap):
    """Queue the next generated song for broadcast."""
    # Check if something is already broadcasting - only one song at a time
    broadcasting_query = (
        select(RadioQueue)
        .where(RadioQueue.status == QueueStatus.BROADCASTING.value)
        .limit(1)
    )
    broadcasting_result = await session.execute(broadcasting_query)
    if broadcasting_result.scalar_one_or_none():
        logger.debug("Song already broadcasting, skipping")
        return

    # Get next generated song ordered by priority
    query = (
        select(RadioQueue)
        .where(RadioQueue.status == QueueStatus.GENERATED.value)
        .where(RadioQueue.song_id.isnot(None))
        .order_by(RadioQueue.priority_score.desc(), RadioQueue.created_at.asc())
        .limit(1)
    )

    result = await session.execute(query)
    queue_item = result.scalar_one_or_none()

    if not queue_item:
        logger.debug("No generated songs ready for broadcast")
        return

    # Get the associated song
    song_query = select(Song).where(Song.id == queue_item.song_id)
    song_result = await session.execute(song_query)
    song = song_result.scalar_one_or_none()

    if not song:
        logger.warning(f"Song {queue_item.song_id} not found")
        return

    # Allow either local file or remote audio URL for playback
    if not song.local_file_path and not song.audio_url:
        logger.warning(
            f"Song {song.id} has no audio source (no local file or audio URL)"
        )
        return

    # Get requester info
    requester_name = "Anonymous"
    if queue_item.user_id:
        user_query = select(User).where(User.id == queue_item.user_id)
        user_result = await session.execute(user_query)
        user = user_result.scalar_one_or_none()
        if user:
            requester_name = user.display_name

    # Announce in Telegram
    await _announce_song(song, requester_name, queue_item)

    # Try to push to Liquidsoap
    success = await liquidsoap.push_song(song.local_file_path)
    if not success:
        # Liquidsoap not available - enable direct playback mode
        # Update status to BROADCASTING so frontend can play directly via audio_url
        logger.warning(
            f"Liquidsoap unavailable - enabling direct playback for song {song.id}"
        )

    # Create broadcast history entry
    history = RadioHistory(
        song_id=song.id,
        queue_id=queue_item.id,
        song_title=song.title,
        song_artist=song.artist or "AI Radio",
        requester_telegram_id=queue_item.telegram_user_id,
        played_at=datetime.utcnow(),
    )
    session.add(history)

    # Update queue item status to BROADCASTING (frontend will play via audio_url)
    queue_item.status = QueueStatus.BROADCASTING.value
    queue_item.broadcast_started_at = datetime.utcnow()

    # Increment song play count
    song.play_count = (song.play_count or 0) + 1
    song.last_played_at = datetime.utcnow()

    logger.info(
        f"Now playing: {song.title} requested by {requester_name} (direct playback: {not success})"
    )

    # Emit WebSocket event so frontend updates immediately
    await emit_now_playing(
        {
            "song_id": song.id,
            "title": song.title,
            "artist": song.artist or "AI Radio",
            "audio_url": song.audio_url,
            "duration_seconds": song.duration_seconds,
            "queue_item_id": queue_item.id,
            "music_provider": song.music_provider,
        }
    )


async def _announce_song(song: Song, requester_name: str, queue_item: RadioQueue):
    """Announce the song in Telegram channel."""
    bot = get_telegram_bot()

    # Build announcement message
    title = song.title or "Untitled"
    genre = song.genre or "AI Generated"

    message = (
        f"🎵 <b>Now Playing</b>\n\n"
        f"<b>{title}</b>\n"
        f"Genre: {genre}\n"
        f"Requested by: {requester_name}\n"
    )

    if song.duration_seconds:
        minutes = int(song.duration_seconds // 60)
        seconds = int(song.duration_seconds % 60)
        message += f"Duration: {minutes}:{seconds:02d}\n"

    # Add vote buttons for the queue item
    keyboard = bot.vote_keyboard(
        queue_item.id, queue_item.upvotes, queue_item.downvotes
    )

    try:
        await bot.broadcast_message(message, reply_markup=keyboard)
    except Exception as e:
        logger.warning(f"Failed to announce song: {e}")
