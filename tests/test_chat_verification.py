import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_chat_flow(async_client: AsyncClient):
    """
    Test the full chat flow:
    1. Create a user via API
    2. Send a message
    3. Retrieve history and verify message is there
    4. Verify structure of response
    """
    # 1. Create user via API (ensures user is in same session as other requests)
    user_payload = {
        "telegram_id": 123456789,
        "telegram_username": "testuser",
        "telegram_first_name": "Test",
        "telegram_last_name": "User",
    }
    user_response = await async_client.post("/api/users/", json=user_payload)
    assert (
        user_response.status_code == 201
    ), f"Failed to create user: {user_response.text}"
    user_data = user_response.json()
    user_id = user_data["id"]

    # 2. Send a message
    payload = {"content": "Hello World", "reply_to_id": None}
    response = await async_client.post(f"/api/chat/?user_id={user_id}", json=payload)

    assert response.status_code == 201, f"Failed to send message: {response.text}"
    data = response.json()
    assert data["content"] == "Hello World"
    assert data["user_id"] == user_id
    assert data["user_display_name"] == "@testuser"
    assert "id" in data
    assert "created_at" in data

    # 3. Get chat history and verify our message is there
    response = await async_client.get("/api/chat/")
    assert response.status_code == 200

    history_data = response.json()
    assert history_data["total"] >= 1, "Expected at least 1 message in history"
    assert len(history_data["messages"]) >= 1, "Expected at least 1 message"

    # Verify the message content
    found_hello = any(m["content"] == "Hello World" for m in history_data["messages"])
    assert (
        found_hello
    ), f"Message 'Hello World' not found. Got: {history_data['messages']}"

    # 4. Verify message has correct structure
    msg = history_data["messages"][0]
    assert "id" in msg
    assert "content" in msg
    assert "user_id" in msg
    assert "created_at" in msg


@pytest.mark.asyncio
async def test_system_message(async_client: AsyncClient):
    """Test sending a system message."""
    payload = {"content": "System Broadcast", "message_type": "system"}

    response = await async_client.post("/api/chat/system", json=payload)

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["message_type"] == "system"
    assert data["content"] == "System Broadcast"
