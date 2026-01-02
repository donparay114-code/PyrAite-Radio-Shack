
import pytest
import pytest_asyncio
from src.services.music_provider import MubertProvider, GenerationRequest, GenerationStatus
from unittest.mock import MagicMock, patch

@pytest_asyncio.fixture
async def mubert_provider():
    provider = MubertProvider(api_key="test-key")
    yield provider
    await provider.close()

@pytest.mark.asyncio
async def test_extract_tags(mubert_provider):
    # Test multi-word tag
    assert "psychedelic trance / psytrance" in mubert_provider._extract_tags("I want some psychedelic trance / psytrance music")

    # Test single word tag
    assert "ambient" in mubert_provider._extract_tags("ambient sounds")

    # Test multiple tags
    tags = mubert_provider._extract_tags("ambient and techno")
    assert "ambient" in tags
    assert "techno" in tags

    # Test no tags
    assert mubert_provider._extract_tags("nothing here") == []

    # Test fallback via word matching if multi-word failed
    assert "techno" in mubert_provider._extract_tags("play some techno")

@pytest.mark.asyncio
async def test_generate_success(mubert_provider):
    request = GenerationRequest(
        prompt="ambient techno",
        duration_seconds=30
    )

    mock_response_data = {
        "status": 1,
        "data": {
            "tasks": [
                {
                    "download_link": "https://mubert.com/download/123.mp3"
                }
            ]
        }
    }

    with patch("httpx.AsyncClient.post", new_callable=MagicMock) as mock_post:
        # Mock the awaitable response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status = MagicMock()

        # Make the post call return an awaitable that resolves to mock_response
        async def async_return(*args, **kwargs):
            return mock_response

        mock_post.side_effect = async_return

        result = await mubert_provider.generate(request)

        assert result.provider == "mubert"
        assert result.job_id == "https://mubert.com/download/123.mp3"
        assert result.status == GenerationStatus.PROCESSING
        assert result.audio_url == "https://mubert.com/download/123.mp3"

        # Verify call args
        # args, kwargs = mock_post.call_args
        # assert kwargs["json"]["method"] == "RecordTrackTTM"
        # assert kwargs["json"]["params"]["pat"] == "test-key"
        # assert "ambient" in kwargs["json"]["params"]["tags"]
        # assert "techno" in kwargs["json"]["params"]["tags"]

@pytest.mark.asyncio
async def test_generate_error(mubert_provider):
    request = GenerationRequest(prompt="test")

    mock_response_data = {
        "status": 2,
        "error": {
            "text": "Invalid PAT"
        }
    }

    with patch("httpx.AsyncClient.post", new_callable=MagicMock) as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status = MagicMock()

        async def async_return(*args, **kwargs):
            return mock_response

        mock_post.side_effect = async_return

        result = await mubert_provider.generate(request)

        assert result.status == GenerationStatus.ERROR
        assert "Invalid PAT" in result.error_message

@pytest.mark.asyncio
async def test_get_status_complete(mubert_provider):
    job_id = "https://mubert.com/download/123.mp3"

    with patch("httpx.AsyncClient.head", new_callable=MagicMock) as mock_head:
        mock_response = MagicMock()
        mock_response.status_code = 200

        async def async_return(*args, **kwargs):
            return mock_response

        mock_head.side_effect = async_return

        result = await mubert_provider.get_status(job_id)

        assert result.status == GenerationStatus.COMPLETE
        assert result.audio_url == job_id

@pytest.mark.asyncio
async def test_get_status_processing(mubert_provider):
    job_id = "https://mubert.com/download/123.mp3"

    with patch("httpx.AsyncClient.head", new_callable=MagicMock) as mock_head:
        mock_response = MagicMock()
        mock_response.status_code = 404

        async def async_return(*args, **kwargs):
            return mock_response

        mock_head.side_effect = async_return

        result = await mubert_provider.get_status(job_id)

        assert result.status == GenerationStatus.PROCESSING
        assert result.audio_url == job_id
