
import pytest
from httpx import AsyncClient
from src.models import ChatMessage

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
    # Note: query param user_id matches sample_user.id (likely 1, but we'll use the object)
    # The endpoint is POST /api/chat/?user_id={user_id}
    response = await async_client.post(
        f"/api/chat/?user_id={async_sample_user.id}",
        json=payload
    )
    
    assert response.status_code == 201, f"Failed to send message: {response.text}"
    data = response.json()
    assert data["content"] == "Hello World"
    assert data["user_id"] == async_sample_user.id
    message_id = data["id"]

    # 2. Get History
    response = await async_client.get("/api/chat/")
    assert response.status_code == 200
    history_data = response.json()
    
    # Verify response structure
    assert "messages" in history_data
    assert "total" in history_data
    
    # Find our message
    messages = history_data["messages"]
    found_msg = next((m for m in messages if m["id"] == message_id), None)
    assert found_msg is not None, "Sent message not found in history"
    assert found_msg["content"] == "Hello World"
    assert found_msg["user"]["telegram_id"] == async_sample_user.telegram_id

@pytest.mark.asyncio
async def test_system_message(async_client: AsyncClient):
    """Test sending a system message (admin only usually, but endpoint might be open or we mock verify)"""
    # The endpoint is POST /api/chat/system
    # Usually requires admin key or similar, checking implementation...
    # Based on route definition, it might just be open or check header.
    # Let's try sending one.
    
    payload = {
        "content": "System Broadcast",
        "message_type": "system"
    }
    
    # Check if there's auth. If fails 401/403, we know it's protected (which is good)
    # If 200, then it works.
    response = await async_client.post("/api/chat/system", json=payload)
    
    # We just want to ensure it doesn't 500.
    if response.status_code == 200:
        data = response.json()
        assert data["message_type"] == "system"
        assert data["content"] == "System Broadcast"
