"""Tests for API endpoints."""

import pytest
from fastapi import status


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_root_endpoint(self, client):
        """Test root endpoint returns API info."""
        response = client.get("/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "PYrte Radio Shack API"
        assert "version" in data

    def test_health_endpoint(self, client):
        """Test basic health check."""
        response = client.get("/health")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "timestamp" in data

    def test_health_api_endpoint(self, client):
        """Test API health check."""
        response = client.get("/api/health/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "healthy"

    def test_health_live_endpoint(self, client):
        """Test liveness probe."""
        response = client.get("/api/health/live")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["alive"] is True


class TestQueueEndpoints:
    """Tests for queue management endpoints."""

    def test_list_queue_empty(self, client):
        """Test listing empty queue."""
        response = client.get("/api/queue/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_create_queue_item(self, client):
        """Test creating a queue item."""
        payload = {
            "prompt": "Create a happy pop song",
            "genre_hint": "Pop",
            "is_instrumental": False,
        }
        response = client.post("/api/queue/", json=payload)
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["original_prompt"] == payload["prompt"]
        assert data["status"] == "pending"

    def test_create_queue_item_minimal(self, client):
        """Test creating queue item with minimal data."""
        payload = {"prompt": "Any song"}
        response = client.post("/api/queue/", json=payload)
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_queue_item_invalid(self, client):
        """Test creating queue item with invalid data."""
        payload = {"prompt": "ab"}  # Too short
        response = client.post("/api/queue/", json=payload)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_get_queue_stats(self, client):
        """Test getting queue statistics."""
        response = client.get("/api/queue/stats")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_items" in data
        assert "pending" in data
        assert "generating" in data

    def test_get_queue_item_not_found(self, client):
        """Test getting non-existent queue item."""
        response = client.get("/api/queue/99999")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUserEndpoints:
    """Tests for user management endpoints."""

    def test_list_users_empty(self, client):
        """Test listing users when empty."""
        response = client.get("/api/users/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_create_user(self, client):
        """Test creating a user."""
        payload = {
            "telegram_id": 123456789,
            "telegram_username": "testuser",
            "telegram_first_name": "Test",
        }
        response = client.post("/api/users/", json=payload)
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["telegram_id"] == payload["telegram_id"]
        assert data["reputation_score"] == 0.0
        assert data["tier"] == "new"

    def test_create_user_existing(self, client):
        """Test creating user that already exists (should update)."""
        payload = {
            "telegram_id": 123456789,
            "telegram_username": "testuser",
        }
        # Create first time
        client.post("/api/users/", json=payload)

        # Create again - should update
        payload["telegram_username"] = "updateduser"
        response = client.post("/api/users/", json=payload)
        assert response.status_code == status.HTTP_201_CREATED

    def test_get_user_stats(self, client):
        """Test getting user statistics."""
        response = client.get("/api/users/stats")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_users" in data
        assert "active_today" in data
        assert "banned_users" in data

    def test_get_leaderboard(self, client):
        """Test getting leaderboard."""
        response = client.get("/api/users/leaderboard")
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    def test_get_user_by_telegram_not_found(self, client):
        """Test getting user by non-existent Telegram ID."""
        response = client.get("/api/users/telegram/99999")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestSongEndpoints:
    """Tests for song management endpoints."""

    def test_list_songs_empty(self, client):
        """Test listing songs when empty."""
        response = client.get("/api/songs/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_get_song_stats(self, client):
        """Test getting song statistics."""
        response = client.get("/api/songs/stats")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_songs" in data
        assert "total_plays" in data
        assert "approved_songs" in data

    def test_get_genres(self, client):
        """Test getting genre list."""
        response = client.get("/api/songs/genres")
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    def test_get_top_songs(self, client):
        """Test getting top songs."""
        response = client.get("/api/songs/top")
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    def test_get_song_not_found(self, client):
        """Test getting non-existent song."""
        response = client.get("/api/songs/99999")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestVoteEndpoints:
    """Tests for voting endpoints."""

    def test_list_votes_empty(self, client):
        """Test listing votes when empty."""
        response = client.get("/api/votes/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_list_votes_invalid_filter(self, client):
        """Test listing votes with invalid vote_type filter."""
        response = client.get("/api/votes/?vote_type=invalid")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_get_vote_stats(self, client):
        """Test getting vote statistics."""
        response = client.get("/api/votes/stats")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_votes" in data
        assert "total_upvotes" in data
        assert "total_downvotes" in data

    def test_cast_vote_invalid_type(self, client):
        """Test casting vote with invalid type."""
        payload = {
            "telegram_user_id": 123,
            "queue_item_id": 1,
            "vote_type": "invalid",
        }
        response = client.post("/api/votes/", json=payload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cast_vote_queue_not_found(self, client):
        """Test casting vote on non-existent queue item."""
        payload = {
            "telegram_user_id": 123,
            "queue_item_id": 99999,
            "vote_type": "upvote",
        }
        response = client.post("/api/votes/", json=payload)
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestWebhookEndpoints:
    """Tests for webhook endpoints."""

    @pytest.fixture
    def webhook_headers(self):
        """Get webhook authentication headers."""
        from src.utils.config import settings

        return {"X-Webhook-Secret": settings.secret_key} if settings.secret_key else {}

    def test_suno_webhook(self, client, webhook_headers):
        """Test Suno status webhook."""
        payload = {
            "job_id": "test-job-123",
            "status": "complete",
            "audio_url": "https://example.com/audio.mp3",
        }
        response = client.post(
            "/api/webhooks/suno/status", json=payload, headers=webhook_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["received"] is True
        assert data["status"] == "unknown_job"

    def test_n8n_trigger_webhook(self, client, webhook_headers):
        """Test n8n trigger webhook."""
        payload = {
            "workflow": "queue_processor",
            "action": "start",
        }
        response = client.post(
            "/api/webhooks/n8n/trigger", json=payload, headers=webhook_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True

    def test_n8n_trigger_invalid_workflow(self, client, webhook_headers):
        """Test n8n trigger with invalid workflow."""
        payload = {
            "workflow": "invalid_workflow",
            "action": "start",
        }
        response = client.post(
            "/api/webhooks/n8n/trigger", json=payload, headers=webhook_headers
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
