from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from sqlalchemy import select

from src.models import QueueStatus, RadioHistory, RadioQueue, Song, SunoStatus

# Payload structure as seen in liquidsoap/radio.liq
# {"event": "track_change", "title": "#{title}", "artist": "#{artist}"}


@pytest.mark.asyncio
async def test_broadcast_status_start_song(async_client, async_session):
    """Test handling track_change event when a song starts."""

    # Create a song and a generated queue item
    song = Song(
        title="My Cool Song",
        artist="AI Radio",
        suno_status=SunoStatus.COMPLETE.value,
        duration_seconds=180.0,
    )
    async_session.add(song)
    await async_session.flush()

    queue_item = RadioQueue(
        song_id=song.id,
        status=QueueStatus.GENERATED.value,
        original_prompt="test prompt",
    )
    async_session.add(queue_item)
    await async_session.commit()

    # Verify initial state
    assert queue_item.status == QueueStatus.GENERATED.value

    payload = {"event": "track_change", "title": "My Cool Song", "artist": "AI Radio"}
    
    # Send webhook with mock secret verification
    with patch("src.api.routes.webhooks.verify_webhook_secret", return_value=True):
        response = await async_client.post("/api/webhooks/broadcast/status", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["received"] is True

    # Verify side effects
    # 1. New RadioHistory created
    history = (
        await async_session.execute(
            select(RadioHistory).where(RadioHistory.song_id == song.id)
        )
    ).scalar_one_or_none()

    assert history is not None
    assert history.ended_at is None

    # 2. Queue item updated
    await async_session.refresh(queue_item)
    assert queue_item.status == QueueStatus.BROADCASTING.value
    assert queue_item.broadcast_started_at is not None


@pytest.mark.asyncio
async def test_broadcast_status_end_song(async_client, async_session):
    """Test that starting a NEW song ends the PREVIOUS song."""

    # 1. Create Song A and Queue Item A (Currently Broadcasting)
    song_a = Song(title="Song A", artist="AI Radio", duration_seconds=100.0)
    async_session.add(song_a)
    await async_session.flush()

    queue_a = RadioQueue(
        song_id=song_a.id,
        status=QueueStatus.BROADCASTING.value,
        broadcast_started_at=datetime.utcnow() - timedelta(minutes=2),
        original_prompt="prompt A",
    )
    async_session.add(queue_a)
    await async_session.flush()

    # Create open history for Song A AND LINK IT TO QUEUE_A
    history_a = RadioHistory(
        song_id=song_a.id,
        queue_id=queue_a.id,  # Linked to queue item
        played_at=datetime.utcnow() - timedelta(minutes=2),
    )
    async_session.add(history_a)

    # 2. Create Song B and Queue Item B (Next up)
    song_b = Song(title="Song B", artist="AI Radio")
    async_session.add(song_b)
    await async_session.flush()

    queue_b = RadioQueue(
        song_id=song_b.id,
        status=QueueStatus.GENERATED.value,
        original_prompt="prompt B",
    )
    async_session.add(queue_b)

    await async_session.commit()

    # Send webhook for Song B start
    payload = {"event": "track_change", "title": "Song B", "artist": "AI Radio"}

    with patch("src.api.routes.webhooks.verify_webhook_secret", return_value=True):
        response = await async_client.post("/api/webhooks/broadcast/status", json=payload)
    assert response.status_code == 200

    # Verify Song A (Previous)
    await async_session.refresh(history_a)
    assert history_a.ended_at is not None
    assert history_a.duration_played_seconds is not None

    await async_session.refresh(queue_a)
    assert queue_a.status == QueueStatus.COMPLETED.value
    assert queue_a.completed_at is not None

    await async_session.refresh(song_a)
    assert song_a.play_count == 1

    # Verify Song B (Current)
    history_b = (
        await async_session.execute(
            select(RadioHistory).where(RadioHistory.song_id == song_b.id)
        )
    ).scalar_one_or_none()
    assert history_b is not None
    assert history_b.ended_at is None

    await async_session.refresh(queue_b)
    assert queue_b.status == QueueStatus.BROADCASTING.value


@pytest.mark.asyncio
async def test_broadcast_unknown_song(async_client, async_session):
    """Test handling a song that is not in the database."""

    payload = {
        "event": "track_change",
        "title": "Unknown Song",
        "artist": "Unknown Artist",
    }

    with patch("src.api.routes.webhooks.verify_webhook_secret", return_value=True):
        response = await async_client.post("/api/webhooks/broadcast/status", json=payload)
    assert response.status_code == 200

    # Verify no new history created (since we can't link it)
    # OR verify it handles it gracefully
    count = (await async_session.execute(select(RadioHistory))).all()
    assert len(count) == 0


@pytest.mark.asyncio
async def test_broadcast_invalid_secret(async_client):
    """Test webhook security."""

    # Provide valid payload structure to pass validation, fail on secret
    payload = {"event": "track_change", "title": "My Cool Song", "artist": "AI Radio"}

    # We need to ensure verify_webhook_secret returns False
    with patch("src.api.routes.webhooks.verify_webhook_secret", return_value=False):
        response = await async_client.post(
            "/api/webhooks/broadcast/status", json=payload
        )
        assert response.status_code == 401
