import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_chat_flow(async_client: AsyncClient, async_sample_user):
    """
    Test the full chat flow:
    1. Send a message
    2. Retrieve history and verify message is there
    3. Verify structure of response
    """
    # 1. Send a message
    payload = {
        "content": "Hello World",
        "reply_to_id": None
    }
    response = await async_client.post(
        f"/api/chat/?user_id={async_sample_user.id}",
        json=payload
    )

    assert response.status_code == 201, f"Failed to send message: {response.text}"
    data = response.json()
    assert data["content"] == "Hello World"
    assert data["user_id"] == async_sample_user.id
    assert data["user_display_name"] == "@testuser"
    assert "id" in data
    assert "created_at" in data

    # 2. Get chat history and verify our message is there
    response = await async_client.get("/api/chat/")
    assert response.status_code == 200

    history_data = response.json()
    assert history_data["total"] >= 1, "Expected at least 1 message in history"
    assert len(history_data["messages"]) >= 1, "Expected at least 1 message"

    # Verify the message content (the first/only message should be ours)
    # Since we just created it and the history is ordered by id desc then reversed
    found_hello = any(m["content"] == "Hello World" for m in history_data["messages"])
    assert found_hello, f"Message 'Hello World' not found. Got: {history_data['messages']}"

    # Verify message has correct structure
    msg = history_data["messages"][0]
    assert "id" in msg
    assert "content" in msg
    assert "user_id" in msg
    assert "created_at" in msg

@pytest.mark.asyncio
async def test_system_message(async_client: AsyncClient):
    """Test sending a system message."""
    payload = {
        "content": "System Broadcast",
        "message_type": "system"
    }
    
    response = await async_client.post("/api/chat/system", json=payload)
    
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["message_type"] == "system"
    assert data["content"] == "System Broadcast"
