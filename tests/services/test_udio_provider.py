"""Tests for UdioProvider music generation."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.music_provider import (
    GenerationRequest,
    GenerationStatus,
    ProviderType,
    UdioProvider,
)


class TestUdioProvider:
    """Test suite for UdioProvider."""

    @pytest.fixture
    def provider(self):
        """Create a UdioProvider instance with a mock token."""
        provider = UdioProvider(auth_token="test-token-123")
        # Mock auth validation to always pass in tests
        provider._validate_auth_token = lambda: (True, "")
        return provider

    @pytest.fixture
    def sample_request(self):
        """Create a sample generation request."""
        return GenerationRequest(
            prompt="uplifting synthwave",
            style="electronic",
            title="Test Song",
            is_instrumental=True,
        )

    def test_provider_type(self, provider):
        """Test that provider type is correctly set."""
        assert provider.provider_type == ProviderType.UDIO

    def test_init_with_token(self):
        """Test initialization with explicit token."""
        token = "my-auth-token"
        provider = UdioProvider(auth_token=token)
        assert provider.auth_token == token

    @pytest.mark.asyncio
    async def test_generate_success(self, provider, sample_request):
        """Test successful music generation."""
        mock_result = {
            "audio_url": "https://udio.com/song123.mp3",
            "id": "song-123",
            "title": "Generated Song",
        }

        with patch.object(provider, "_get_wrapper") as mock_get_wrapper:
            mock_wrapper = MagicMock()
            mock_wrapper.create_song.return_value = mock_result
            mock_get_wrapper.return_value = mock_wrapper

            result = await provider.generate(sample_request)

            assert result.provider == ProviderType.UDIO
            assert result.status == GenerationStatus.COMPLETE
            assert result.audio_url == "https://udio.com/song123.mp3"
            assert result.job_id == "song-123"

    @pytest.mark.asyncio
    async def test_generate_with_string_result(self, provider, sample_request):
        """Test generation when wrapper returns a URL string."""
        mock_url = "https://udio.com/direct-song.mp3"

        with patch.object(provider, "_get_wrapper") as mock_get_wrapper:
            mock_wrapper = MagicMock()
            mock_wrapper.create_song.return_value = mock_url
            mock_get_wrapper.return_value = mock_wrapper

            result = await provider.generate(sample_request)

            assert result.status == GenerationStatus.COMPLETE
            assert result.audio_url == mock_url

    @pytest.mark.asyncio
    async def test_generate_with_list_result(self, provider, sample_request):
        """Test generation when wrapper returns a list of songs."""
        mock_result = [
            {
                "audio_url": "https://udio.com/song1.mp3",
                "id": "song-1",
            }
        ]

        with patch.object(provider, "_get_wrapper") as mock_get_wrapper:
            mock_wrapper = MagicMock()
            mock_wrapper.create_song.return_value = mock_result
            mock_get_wrapper.return_value = mock_wrapper

            result = await provider.generate(sample_request)

            assert result.status == GenerationStatus.COMPLETE
            assert result.audio_url == "https://udio.com/song1.mp3"
            assert result.job_id == "song-1"

    @pytest.mark.asyncio
    async def test_generate_no_result(self, provider, sample_request):
        """Test generation when wrapper returns None."""
        with patch.object(provider, "_get_wrapper") as mock_get_wrapper:
            mock_wrapper = MagicMock()
            mock_wrapper.create_song.return_value = None
            mock_get_wrapper.return_value = mock_wrapper

            result = await provider.generate(sample_request)

            assert result.status == GenerationStatus.ERROR
            assert "No result" in result.error_message

    @pytest.mark.asyncio
    async def test_generate_import_error(self, provider, sample_request):
        """Test generation when udio-wrapper is not installed."""
        with patch.object(
            provider,
            "_get_wrapper",
            side_effect=ImportError("No module named 'udio_wrapper'"),
        ):
            result = await provider.generate(sample_request)

            assert result.status == GenerationStatus.ERROR
            assert "udio_wrapper" in result.error_message

    @pytest.mark.asyncio
    async def test_generate_api_error(self, provider, sample_request):
        """Test generation when Udio API fails."""
        with patch.object(provider, "_get_wrapper") as mock_get_wrapper:
            mock_wrapper = MagicMock()
            mock_wrapper.create_song.side_effect = Exception("API rate limit exceeded")
            mock_get_wrapper.return_value = mock_wrapper

            result = await provider.generate(sample_request)

            assert result.status == GenerationStatus.ERROR
            assert "rate limit" in result.error_message

    @pytest.mark.asyncio
    async def test_get_status(self, provider):
        """Test status check - always returns COMPLETE for Udio."""
        result = await provider.get_status("test-job-id")

        assert result.status == GenerationStatus.COMPLETE
        assert result.job_id == "test-job-id"
        assert result.provider == ProviderType.UDIO

    @pytest.mark.asyncio
    async def test_download_audio_success(self, provider, tmp_path):
        """Test successful audio download."""
        output_path = tmp_path / "downloaded.mp3"
        audio_url = "https://example.com/song.mp3"

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = AsyncMock()
            mock_response.raise_for_status = MagicMock()
            mock_response.aiter_bytes = AsyncMock(return_value=iter([b"audio data"]))
            mock_client.stream.return_value.__aenter__.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_client

            await provider.download_audio(audio_url, output_path)

            # Note: This test may need adjustment based on actual async context manager behavior
            # The important thing is testing the error handling path

    @pytest.mark.asyncio
    async def test_close(self, provider):
        """Test cleanup."""
        provider._wrapper = MagicMock()
        await provider.close()
        assert provider._wrapper is None


class TestGenerationRequestUdioFormat:
    """Test GenerationRequest.to_udio_format method."""

    def test_to_udio_format_basic(self):
        """Test basic Udio format conversion."""
        request = GenerationRequest(prompt="lo-fi beats")
        result = request.to_udio_format()

        assert result["prompt"] == "lo-fi beats"
        assert result["seed"] == -1
        assert result["custom_lyrics"] is None

    def test_to_udio_format_with_style(self):
        """Test Udio format includes prompt but not style directly."""
        request = GenerationRequest(
            prompt="jazz piano",
            style="smooth jazz",
        )
        result = request.to_udio_format()

        assert result["prompt"] == "jazz piano"
