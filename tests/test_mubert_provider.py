
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.services.music_provider import MubertProvider, GenerationRequest, ProviderType, GenerationStatus
from src.services.mubert_constants import MUBERT_TAGS

@pytest.fixture
def mock_httpx_client():
    with patch("httpx.AsyncClient") as mock_client:
        yield mock_client

@pytest.mark.asyncio
async def test_mubert_provider_initialization():
    provider = MubertProvider(api_key="test_key")
    assert provider.provider_type == ProviderType.MUBERT
    assert provider.api_key == "test_key"

@pytest.mark.asyncio
async def test_mubert_extract_tags():
    provider = MubertProvider(api_key="test_key")

    # Test valid tags
    tags = provider._extract_tags("Play some techno and ambient music")
    assert "techno" in tags
    assert "ambient" in tags

    # Test case insensitivity
    tags = provider._extract_tags("JAZZ music")
    assert "jazz" in tags

    # Test fallback
    tags = provider._extract_tags("Unrelated text")
    assert tags == ["lo-fi"]

@pytest.mark.asyncio
async def test_mubert_generate_success(mock_httpx_client):
    provider = MubertProvider(api_key="test_key")

    # Using MagicMock for Response object because .json() and .raise_for_status() are synchronous methods on the Response object
    mock_post_response = MagicMock()
    mock_post_response.status_code = 200
    mock_post_response.json.return_value = {
        "status": 1,
        "data": {
            "tasks": [
                {
                    "download_link": "https://mubert.com/download/123",
                    "task_id": "123"
                }
            ]
        }
    }

    # The client.post method is async, so it returns an awaitable.
    # When awaited, it should return our response object.
    client_instance = AsyncMock()
    client_instance.post.return_value = mock_post_response

    mock_httpx_client.return_value = client_instance

    request = GenerationRequest(prompt="techno music")
    result = await provider.generate(request)

    assert result.provider == ProviderType.MUBERT
    assert result.job_id == "https://mubert.com/download/123"
    assert result.status == GenerationStatus.PENDING
    assert result.audio_url == "https://mubert.com/download/123"

    # Verify API call
    client_instance.post.assert_called_once()
    args, kwargs = client_instance.post.call_args
    assert kwargs["json"]["params"]["tags"] == ["techno"]

@pytest.mark.asyncio
async def test_mubert_get_status_complete(mock_httpx_client):
    provider = MubertProvider(api_key="test_key")

    mock_head_response = MagicMock()
    mock_head_response.status_code = 200
    mock_head_response.headers = {"content-type": "audio/mpeg"}

    client_instance = AsyncMock()
    client_instance.head.return_value = mock_head_response
    mock_httpx_client.return_value = client_instance

    result = await provider.get_status("https://mubert.com/download/123")

    assert result.status == GenerationStatus.COMPLETE
    assert result.job_id == "https://mubert.com/download/123"

@pytest.mark.asyncio
async def test_mubert_get_status_processing(mock_httpx_client):
    provider = MubertProvider(api_key="test_key")

    mock_head_response = MagicMock()
    mock_head_response.status_code = 404

    client_instance = AsyncMock()
    client_instance.head.return_value = mock_head_response
    mock_httpx_client.return_value = client_instance

    result = await provider.get_status("https://mubert.com/download/123")

    assert result.status == GenerationStatus.PROCESSING
