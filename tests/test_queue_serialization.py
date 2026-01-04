
import pytest
from datetime import datetime
from src.models import RadioQueue, User, QueueStatus, UserTier

@pytest.mark.asyncio
async def test_queue_user_serialization(client, async_session):
    # Create a user
    user = User(
        telegram_id=123456789,
        telegram_username="testuser",
        telegram_first_name="Test",
        reputation_score=150.0,
        total_requests=10,
        successful_requests=8
    )
    async_session.add(user)
    await async_session.flush()

    # Create a queue item associated with the user
    queue_item = RadioQueue(
        user_id=user.id,
        telegram_user_id=user.telegram_id,
        status=QueueStatus.BROADCASTING.value,
        original_prompt="Test Prompt",
        broadcast_started_at=datetime.utcnow(),
        requested_at=datetime.utcnow()
    )
    async_session.add(queue_item)
    await async_session.commit()

    # Call the now-playing endpoint
    response = client.get("/api/queue/now-playing")
    assert response.status_code == 200
    data = response.json()

    # Verify user data is serialized correctly
    assert data["queue_item"]["user"] is not None
    user_data = data["queue_item"]["user"]
    assert user_data["id"] == user.id
    assert user_data["display_name"] == "@testuser"
    assert user_data["telegram_username"] == "testuser"
    assert user_data["reputation_score"] == 150.0
    assert user_data["tier"] == "regular"

@pytest.mark.asyncio
async def test_queue_user_serialization_no_user(client, async_session):
    # Create a queue item without a user
    queue_item = RadioQueue(
        status=QueueStatus.BROADCASTING.value,
        original_prompt="Anonymous Prompt",
        broadcast_started_at=datetime.utcnow(),
        requested_at=datetime.utcnow()
    )
    async_session.add(queue_item)
    await async_session.commit()

    # Call the now-playing endpoint
    response = client.get("/api/queue/now-playing")
    assert response.status_code == 200
    data = response.json()

    # Verify user data is None
    assert data["queue_item"]["user"] is None
