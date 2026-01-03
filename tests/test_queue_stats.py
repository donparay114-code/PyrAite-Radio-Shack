
from datetime import datetime, timedelta

import pytest

from src.models import QueueStatus, RadioQueue


@pytest.mark.asyncio
async def test_get_queue_stats_average_wait(async_client, async_session):
    # Setup: Create some queue items with different wait times
    # Item 1: Completed, waited 10 minutes
    now = datetime.utcnow()
    item1 = RadioQueue(
        original_prompt="Prompt 1",
        status=QueueStatus.COMPLETED.value,
        requested_at=now - timedelta(minutes=20),
        completed_at=now - timedelta(minutes=10),
    )
    # Item 2: Completed, waited 30 minutes
    item2 = RadioQueue(
        original_prompt="Prompt 2",
        status=QueueStatus.COMPLETED.value,
        requested_at=now - timedelta(minutes=40),
        completed_at=now - timedelta(minutes=10),
    )
    # Item 3: Pending, shouldn't count
    item3 = RadioQueue(
        original_prompt="Prompt 3",
        status=QueueStatus.PENDING.value,
        requested_at=now - timedelta(minutes=50),
    )

    async_session.add(item1)
    async_session.add(item2)
    async_session.add(item3)
    await async_session.commit()

    # Act
    response = await async_client.get("/api/queue/stats")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["total_items"] >= 3
    # Average wait: (10 + 30) / 2 = 20 minutes
    print(f"Average wait minutes: {data['average_wait_minutes']}")
    assert abs(data["average_wait_minutes"] - 20.0) < 0.1
