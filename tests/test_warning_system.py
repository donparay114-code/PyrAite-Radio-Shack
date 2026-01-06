import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_warning_system_flow(auth_async_client: AsyncClient):
    """
    Test the warning and ban system:
    1. Create a user (requires auth)
    2. Send bad messages 1-4 times -> Verify warnings
    3. Send 5th bad message -> Verify Ban
    4. Verify 6th message -> Verify 403 Ban persists
    """
    # 1. Create registered user (requires authenticated privileged user)
    user_payload = {
        "telegram_id": 999999999,
        "telegram_username": "naughty_user",
        "telegram_first_name": "Naughty",
        "telegram_last_name": "Boy",
    }
    resp = await auth_async_client.post("/api/users/", json=user_payload)
    assert resp.status_code == 201
    user_id = resp.json()["id"]

    # Trigger phrase known to be in LOCAL_BLOCKLIST (from src/services/moderation.py)
    bad_message = {"content": "free robux", "reply_to_id": None}

    # 2. Send bad messages 1-4
    for i in range(1, 5):
        resp = await auth_async_client.post(
            f"/api/chat/?user_id={user_id}", json=bad_message
        )

        # Should be 400 Bad Request with warning details
        assert (
            resp.status_code == 400
        ), f"Expected 400 on attempt {i}, got {resp.status_code}: {resp.text}"
        data = resp.json()

        # Verify specific error structure for warnings
        detail = data["detail"]
        assert detail["error"] == "content_warning"
        assert detail["warning_count"] == i
        assert detail["warnings_until_ban"] == 5 - i
        assert "free robux" in detail.get(
            "flagged_terms", []
        ) or "blocked terms" in detail.get("reason", "")

    # 3. Send 5th bad message -> Should cause Ban
    resp = await auth_async_client.post(
        f"/api/chat/?user_id={user_id}", json=bad_message
    )
    assert (
        resp.status_code == 403
    ), f"Expected 403 Ban on 5th attempt, got {resp.status_code}: {resp.text}"
    assert "banned" in resp.json()["detail"].lower()

    # 4. Verification: Send safe message -> Should still be 403
    safe_message = {"content": "Hello innocent world", "reply_to_id": None}
    resp = await auth_async_client.post(
        f"/api/chat/?user_id={user_id}", json=safe_message
    )
    assert (
        resp.status_code == 403
    ), "Banned user should not be able to send safe messages"
    assert "banned" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_anon_immediate_rejection(async_client: AsyncClient):
    """Test that anonymous users get rejected immediately without warning counts."""
    bad_message = {"content": "free robux"}

    # Send as anonymous (no user_id)
    resp = await async_client.post(
        "/api/chat/?anon_session_id=test_anon", json=bad_message
    )

    assert resp.status_code == 400
    data = resp.json()
    detail = data["detail"]

    # Should be content_moderation_failed, NOT content_warning
    assert detail["error"] == "content_moderation_failed"
    assert "warning_count" not in detail
