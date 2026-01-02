import pytest
from unittest.mock import patch, AsyncMock
from src.services.liquidsoap_client import LiquidsoapClient

@pytest.mark.asyncio
async def test_get_queue_length():
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.return_value = AsyncMock(status_code=200, json=lambda: {"queue_length": 5})

        client = LiquidsoapClient(base_url="http://test:8080")
        length = await client.get_queue_length()

        assert length == 5
        mock_get.assert_called_once()

@pytest.mark.asyncio
async def test_push_song():
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = AsyncMock(status_code=200)

        client = LiquidsoapClient(base_url="http://test:8080")
        success = await client.push_song("/path/to/song.mp3")

        assert success is True
        mock_post.assert_called_once()

@pytest.mark.asyncio
async def test_skip_current():
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = AsyncMock(status_code=200)

        client = LiquidsoapClient(base_url="http://test:8080")
        success = await client.skip_current()

        assert success is True
        mock_post.assert_called_once()
