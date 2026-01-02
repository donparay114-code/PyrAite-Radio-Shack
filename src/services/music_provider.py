"""
Music Generation Provider Interface - Adapter Pattern for swappable providers.

This module implements the Interface Adapter Pattern to allow switching between
different music generation providers (Suno, Stable Audio, Mubert) without
changing the rest of the codebase.

Critical: Build provider-switching logic BEFORE writing any other feature.
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional

from src.utils.config import settings

logger = logging.getLogger(__name__)


class ProviderType(str, Enum):
    """Supported music generation providers."""

    SUNO = "suno"
    STABLE_AUDIO = "stable_audio"
    MUBERT = "mubert"
    MOCK = "mock"  # For testing


class GenerationStatus(str, Enum):
    """Normalized status across all providers."""

    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETE = "complete"
    FAILED = "failed"
    ERROR = "error"


@dataclass
class GenerationRequest:
    """Normalized generation request for any provider."""

    prompt: str
    style: Optional[str] = None
    title: Optional[str] = None
    is_instrumental: bool = False
    duration_seconds: Optional[int] = None
    bpm: Optional[int] = None
    key: Optional[str] = None

    def to_suno_format(self) -> dict:
        """Convert to Suno API format."""
        return {
            "prompt": self.prompt,
            "style": self.style,
            "title": self.title,
            "make_instrumental": self.is_instrumental,
        }

    def to_stable_audio_format(self) -> dict:
        """Convert to Stable Audio API format."""
        return {
            "text": self.prompt,
            "duration": self.duration_seconds or 30,
            "style": self.style,
        }

    def to_mubert_format(self) -> dict:
        """Convert to Mubert API format."""
        return {
            "prompt": self.prompt,
            "duration": self.duration_seconds or 30,
            "bpm": self.bpm,
            "key": self.key,
            "mode": "track",
        }


@dataclass
class GenerationResult:
    """Normalized generation result from any provider."""

    provider: ProviderType
    job_id: str
    status: GenerationStatus
    title: Optional[str] = None
    audio_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    lyrics: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    raw_response: Optional[dict] = None  # Original provider response


class MusicProvider(ABC):
    """Abstract base class for music generation providers."""

    provider_type: ProviderType

    @abstractmethod
    async def generate(self, request: GenerationRequest) -> GenerationResult:
        """Submit a generation request."""
        pass

    @abstractmethod
    async def get_status(self, job_id: str) -> GenerationResult:
        """Get status of a generation job."""
        pass

    @abstractmethod
    async def download_audio(self, audio_url: str, output_path: Path) -> bool:
        """Download generated audio to local path."""
        pass

    @abstractmethod
    async def close(self) -> None:
        """Clean up resources."""
        pass

    async def generate_and_wait(
        self,
        request: GenerationRequest,
        poll_interval: float = 5.0,
        max_wait: float = 300.0,
        download_path: Optional[Path] = None,
    ) -> GenerationResult:
        """Generate and wait for completion (with optional download)."""
        import asyncio

        result = await self.generate(request)
        if result.status in (GenerationStatus.ERROR, GenerationStatus.FAILED):
            return result

        start_time = datetime.utcnow()
        while True:
            result = await self.get_status(result.job_id)

            if result.status in (
                GenerationStatus.COMPLETE,
                GenerationStatus.FAILED,
                GenerationStatus.ERROR,
            ):
                result.completed_at = datetime.utcnow()

                # Download if successful
                if (
                    result.status == GenerationStatus.COMPLETE
                    and download_path
                    and result.audio_url
                ):
                    await self.download_audio(result.audio_url, download_path)

                return result

            elapsed = (datetime.utcnow() - start_time).total_seconds()
            if elapsed >= max_wait:
                return GenerationResult(
                    provider=self.provider_type,
                    job_id=result.job_id,
                    status=GenerationStatus.ERROR,
                    error_message=f"Timeout after {elapsed:.0f}s",
                )

            await asyncio.sleep(poll_interval)


class SunoProvider(MusicProvider):
    """Suno API provider implementation."""

    provider_type = ProviderType.SUNO

    def __init__(self, api_url: Optional[str] = None, api_key: Optional[str] = None):
        import httpx

        self.api_url = (api_url or settings.suno_api_url).rstrip("/")
        self.api_key = api_key or settings.suno_api_key
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self):
        import httpx

        if self._client is None or self._client.is_closed:
            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            self._client = httpx.AsyncClient(
                base_url=self.api_url, timeout=300.0, headers=headers
            )
        return self._client

    async def generate(self, request: GenerationRequest) -> GenerationResult:
        client = await self._get_client()
        try:
            payload = request.to_suno_format()
            payload["wait_audio"] = True

            response = await client.post("/api/generate", json=payload)
            response.raise_for_status()
            data = response.json()

            # Handle list or dict response
            job_data = data[0] if isinstance(data, list) else data
            job_id = job_data.get("id") or job_data.get("job_id") or ""

            return GenerationResult(
                provider=ProviderType.SUNO,
                job_id=job_id,
                status=GenerationStatus.PENDING,
                title=job_data.get("title"),
                audio_url=job_data.get("audio_url"),
                created_at=datetime.utcnow(),
                raw_response=job_data,
            )
        except Exception as e:
            logger.error(f"Suno generation failed: {e}")
            return GenerationResult(
                provider=ProviderType.SUNO,
                job_id="",
                status=GenerationStatus.ERROR,
                error_message=str(e),
            )

    async def get_status(self, job_id: str) -> GenerationResult:
        client = await self._get_client()
        try:
            response = await client.get("/api/get", params={"ids": job_id})
            response.raise_for_status()
            data = response.json()

            job_data = data[0] if isinstance(data, list) else data

            status_map = {
                "pending": GenerationStatus.PENDING,
                "queued": GenerationStatus.QUEUED,
                "processing": GenerationStatus.PROCESSING,
                "complete": GenerationStatus.COMPLETE,
                "completed": GenerationStatus.COMPLETE,
                "success": GenerationStatus.COMPLETE,
                "failed": GenerationStatus.FAILED,
                "error": GenerationStatus.ERROR,
            }
            raw_status = job_data.get("status", "").lower()
            status = status_map.get(raw_status, GenerationStatus.PENDING)

            return GenerationResult(
                provider=ProviderType.SUNO,
                job_id=job_id,
                status=status,
                title=job_data.get("title"),
                audio_url=job_data.get("audio_url"),
                duration_seconds=job_data.get("duration"),
                lyrics=job_data.get("lyric") or job_data.get("lyrics"),
                error_message=job_data.get("error"),
                raw_response=job_data,
            )
        except Exception as e:
            return GenerationResult(
                provider=ProviderType.SUNO,
                job_id=job_id,
                status=GenerationStatus.ERROR,
                error_message=str(e),
            )

    async def download_audio(self, audio_url: str, output_path: Path) -> bool:
        import httpx

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("GET", audio_url) as response:
                    response.raise_for_status()
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(output_path, "wb") as f:
                        async for chunk in response.aiter_bytes(8192):
                            f.write(chunk)
            return True
        except Exception as e:
            logger.error(f"Download failed: {e}")
            return False

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()


class StableAudioProvider(MusicProvider):
    """Stable Audio API provider (placeholder for future implementation)."""

    provider_type = ProviderType.STABLE_AUDIO

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        logger.warning("StableAudioProvider is not yet fully implemented")

    async def generate(self, request: GenerationRequest) -> GenerationResult:
        # TODO: Implement Stable Audio API integration
        return GenerationResult(
            provider=ProviderType.STABLE_AUDIO,
            job_id="",
            status=GenerationStatus.ERROR,
            error_message="Stable Audio provider not yet implemented",
        )

    async def get_status(self, job_id: str) -> GenerationResult:
        return GenerationResult(
            provider=ProviderType.STABLE_AUDIO,
            job_id=job_id,
            status=GenerationStatus.ERROR,
            error_message="Stable Audio provider not yet implemented",
        )

    async def download_audio(self, audio_url: str, output_path: Path) -> bool:
        return False

    async def close(self) -> None:
        pass


class MubertProvider(MusicProvider):
    """Mubert API provider (placeholder for future implementation)."""

    provider_type = ProviderType.MUBERT

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        logger.warning("MubertProvider is not yet fully implemented")

    async def generate(self, request: GenerationRequest) -> GenerationResult:
        # TODO: Implement Mubert API integration
        return GenerationResult(
            provider=ProviderType.MUBERT,
            job_id="",
            status=GenerationStatus.ERROR,
            error_message="Mubert provider not yet implemented",
        )

    async def get_status(self, job_id: str) -> GenerationResult:
        return GenerationResult(
            provider=ProviderType.MUBERT,
            job_id=job_id,
            status=GenerationStatus.ERROR,
            error_message="Mubert provider not yet implemented",
        )

    async def download_audio(self, audio_url: str, output_path: Path) -> bool:
        return False

    async def close(self) -> None:
        pass


class MockProvider(MusicProvider):
    """Mock provider for testing."""

    provider_type = ProviderType.MOCK

    async def generate(self, request: GenerationRequest) -> GenerationResult:
        return GenerationResult(
            provider=ProviderType.MOCK,
            job_id="mock-job-123",
            status=GenerationStatus.COMPLETE,
            title=request.title or "Mock Song",
            audio_url="https://example.com/mock.mp3",
            duration_seconds=180.0,
            created_at=datetime.utcnow(),
        )

    async def get_status(self, job_id: str) -> GenerationResult:
        return GenerationResult(
            provider=ProviderType.MOCK,
            job_id=job_id,
            status=GenerationStatus.COMPLETE,
        )

    async def download_audio(self, audio_url: str, output_path: Path) -> bool:
        return True

    async def close(self) -> None:
        pass


# Provider Registry - allows runtime switching
_providers: dict[ProviderType, MusicProvider] = {}
_default_provider: ProviderType = ProviderType.SUNO


def get_provider(provider_type: Optional[ProviderType] = None) -> MusicProvider:
    """
    Get a music provider instance.

    Args:
        provider_type: Which provider to use. If None, uses default.

    Returns:
        MusicProvider instance
    """
    provider_type = provider_type or _default_provider

    if provider_type not in _providers:
        if provider_type == ProviderType.SUNO:
            _providers[provider_type] = SunoProvider()
        elif provider_type == ProviderType.STABLE_AUDIO:
            _providers[provider_type] = StableAudioProvider()
        elif provider_type == ProviderType.MUBERT:
            _providers[provider_type] = MubertProvider()
        elif provider_type == ProviderType.MOCK:
            _providers[provider_type] = MockProvider()
        else:
            raise ValueError(f"Unknown provider type: {provider_type}")

    return _providers[provider_type]


def set_default_provider(provider_type: ProviderType) -> None:
    """Set the default music generation provider."""
    global _default_provider
    _default_provider = provider_type
    logger.info(f"Default music provider set to: {provider_type.value}")


async def generate_music(
    prompt: str,
    style: Optional[str] = None,
    is_instrumental: bool = False,
    provider_type: Optional[ProviderType] = None,
    download_path: Optional[Path] = None,
) -> GenerationResult:
    """
    Convenience function to generate music using the configured provider.

    This is the main entry point - swap providers by changing provider_type
    or calling set_default_provider().
    """
    provider = get_provider(provider_type)
    request = GenerationRequest(
        prompt=prompt,
        style=style,
        is_instrumental=is_instrumental,
    )
    return await provider.generate_and_wait(request, download_path=download_path)
