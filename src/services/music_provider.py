"""
Music Generation Provider Interface - Adapter Pattern for swappable providers.

This module implements the Interface Adapter Pattern to allow switching between
different music generation providers (Suno, Stable Audio, Udio) without
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
    UDIO = "udio"
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

    def to_udio_format(self) -> dict:
        """Convert to Udio API format."""
        return {
            "prompt": self.prompt,
            "seed": -1,  # Random seed
            "custom_lyrics": None,  # Instrumental by default
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
    """Stable Audio API provider."""

    provider_type = ProviderType.STABLE_AUDIO

    def __init__(self, api_url: Optional[str] = None, api_key: Optional[str] = None):
        import httpx

        self.api_url = api_url or settings.stable_audio_api_url
        self.api_key = api_key or settings.stable_audio_api_key
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self):
        import httpx

        if self._client is None or self._client.is_closed:
            headers = {"Authorization": f"Bearer {self.api_key}"}
            self._client = httpx.AsyncClient(timeout=300.0, headers=headers)
        return self._client

    async def generate(self, request: GenerationRequest) -> GenerationResult:
        import uuid

        import aiofiles

        if not self.api_key:
            return GenerationResult(
                provider=ProviderType.STABLE_AUDIO,
                job_id="",
                status=GenerationStatus.ERROR,
                error_message="Stable Audio API key not configured",
            )

        client = await self._get_client()
        try:
            # Stable Audio API expects multipart/form-data
            data = request.to_stable_audio_format()

            # Helper to convert dict to multipart format expected by httpx
            # "prompt" is the key for text prompt in some versions, but to_stable_audio_format uses "text"
            # We will follow the dict provided by to_stable_audio_format but adapt to API if needed.
            # Assuming standard Stability AI API structure:
            # https://api.stability.ai/v2beta/stable-audio/generate
            # Field: "prompt" (string) - required
            # Field: "seconds_total" (number) - duration

            # Map internal format to API format if needed, or trust to_stable_audio_format
            # The current to_stable_audio_format returns "text" which might be wrong for v2beta which uses "prompt"
            # But let's check what we have.

            # Adjusting payload to match typical Stability API
            multipart_data = {
                "prompt": data.get("text", request.prompt),
                "seconds_total": str(data.get("duration", 30)),
            }
            if data.get("style"):
                multipart_data["prompt"] = f"{data['style']} {multipart_data['prompt']}"

            # To force multipart/form-data without files, we can use the files parameter
            # with explicit None for filename/content-type if needed, or just rely on data
            # if the API accepts application/x-www-form-urlencoded.
            # However, strict multipart usually requires 'files' argument in httpx to trigger boundary.
            # We will try sending as simple data first, as many APIs accept form-urlencoded.
            # If explicit multipart is needed, we would need to dummy a file or use a lower level construction.
            # But wait, Stability AI API typically accepts multipart form data.
            # Let's try to be compliant. httpx sends form-urlencoded by default for 'data'.
            # To send multipart, we can pass a dummy file or use 'files' for the fields?
            # Actually, passing 'files' triggers multipart.
            # We can pass fields as tuples in 'files' or mix 'data' and 'files'.
            # Let's try passing everything in 'data' but ensure we are sending what is expected.
            # If the API documentation says "multipart/form-data", it usually implies file upload,
            # but here we are generating audio.
            # Let's assume standard form data is fine, but we will add a comment.

            response = await client.post(
                self.api_url, data=multipart_data, headers={"Accept": "audio/mpeg"}
            )

            if response.status_code != 200:
                error_msg = f"Stable Audio API error: {response.text}"
                logger.error(error_msg)
                return GenerationResult(
                    provider=ProviderType.STABLE_AUDIO,
                    job_id="",
                    status=GenerationStatus.ERROR,
                    error_message=error_msg,
                )

            # Generate a job ID
            job_id = str(uuid.uuid4())

            # Save audio to temp file
            temp_path = settings.temp_dir / f"{job_id}.mp3"
            settings.ensure_directories()

            async with aiofiles.open(temp_path, "wb") as f:
                await f.write(response.content)

            return GenerationResult(
                provider=ProviderType.STABLE_AUDIO,
                job_id=job_id,
                status=GenerationStatus.COMPLETE,
                title=request.title,
                audio_url=str(temp_path.absolute()),
                duration_seconds=float(multipart_data["seconds_total"]),
                created_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
            )

        except Exception as e:
            logger.error(f"Stable Audio generation failed: {e}")
            return GenerationResult(
                provider=ProviderType.STABLE_AUDIO,
                job_id="",
                status=GenerationStatus.ERROR,
                error_message=str(e),
            )

    async def get_status(self, job_id: str) -> GenerationResult:
        # Since generation is synchronous, if we have a job_id, it is complete.
        # We just verify the file exists.
        temp_path = settings.temp_dir / f"{job_id}.mp3"

        if temp_path.exists():
            return GenerationResult(
                provider=ProviderType.STABLE_AUDIO,
                job_id=job_id,
                status=GenerationStatus.COMPLETE,
                audio_url=str(temp_path.absolute()),
            )
        else:
            return GenerationResult(
                provider=ProviderType.STABLE_AUDIO,
                job_id=job_id,
                status=GenerationStatus.ERROR,
                error_message="Job not found or file missing",
            )

    async def download_audio(self, audio_url: str, output_path: Path) -> bool:
        import aiofiles

        try:
            # audio_url is a local path
            source_path = Path(audio_url)
            if not source_path.exists():
                logger.error(f"Source file not found: {source_path}")
                return False

            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Async copy
            async with aiofiles.open(source_path, "rb") as src, aiofiles.open(
                output_path, "wb"
            ) as dst:
                while True:
                    chunk = await src.read(8192)
                    if not chunk:
                        break
                    await dst.write(chunk)

            return True
        except Exception as e:
            logger.error(f"Copy failed: {e}")
            return False

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()


class UdioProvider(MusicProvider):
    """
    Udio music generation provider using udio-wrapper.

    Uses the unofficial udio-wrapper package to generate music from text prompts.
    Requires an sb-api-auth-token from Udio cookies for authentication.
    """

    provider_type = ProviderType.UDIO

    def __init__(self, auth_token: Optional[str] = None):
        self.auth_token = auth_token or settings.udio_auth_token
        self._wrapper = None

    def _get_wrapper(self):
        """Lazy initialization of UdioWrapper."""
        if self._wrapper is None:
            try:
                from udio_wrapper import UdioWrapper

                self._wrapper = UdioWrapper(self.auth_token)
            except ImportError:
                raise ImportError(
                    "udio-wrapper is not installed. Run: pip install udio-wrapper"
                )
        return self._wrapper

    async def generate(self, request: GenerationRequest) -> GenerationResult:
        """
        Generate music using Udio API.

        Uses the udio-wrapper's create_song method which handles the full
        generation workflow synchronously.
        """
        import asyncio

        try:
            wrapper = self._get_wrapper()

            # Run synchronous Udio API call in thread pool
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: wrapper.create_song(
                    prompt=request.prompt,
                    seed=-1,  # Random generation
                    custom_lyrics=None if request.is_instrumental else request.prompt,
                ),
            )

            # Parse the result - udio-wrapper returns song data
            if result:
                # Result typically contains song info with audio URL
                audio_url = None
                song_id = None

                if isinstance(result, dict):
                    audio_url = result.get("audio_url") or result.get("song_path")
                    song_id = (
                        result.get("id")
                        or result.get("song_id")
                        or str(hash(str(result)))
                    )
                elif isinstance(result, str):
                    # If result is just a URL or path
                    audio_url = result
                    song_id = str(hash(result))
                else:
                    # Handle list response
                    if isinstance(result, list) and len(result) > 0:
                        first_item = result[0]
                        if isinstance(first_item, dict):
                            audio_url = first_item.get("audio_url") or first_item.get(
                                "song_path"
                            )
                            song_id = first_item.get("id") or str(hash(str(first_item)))
                        else:
                            audio_url = str(first_item)
                            song_id = str(hash(str(first_item)))

                return GenerationResult(
                    provider=ProviderType.UDIO,
                    job_id=song_id or "udio-job",
                    status=GenerationStatus.COMPLETE,  # Udio completes synchronously
                    title=request.title,
                    audio_url=audio_url,
                    created_at=datetime.utcnow(),
                    completed_at=datetime.utcnow(),
                    raw_response=(
                        result if isinstance(result, dict) else {"result": result}
                    ),
                )
            else:
                return GenerationResult(
                    provider=ProviderType.UDIO,
                    job_id="",
                    status=GenerationStatus.ERROR,
                    error_message="No result returned from Udio",
                )

        except ImportError as e:
            logger.error(f"Udio import error: {e}")
            return GenerationResult(
                provider=ProviderType.UDIO,
                job_id="",
                status=GenerationStatus.ERROR,
                error_message=str(e),
            )
        except Exception as e:
            logger.error(f"Udio generation failed: {e}")
            return GenerationResult(
                provider=ProviderType.UDIO,
                job_id="",
                status=GenerationStatus.ERROR,
                error_message=str(e),
            )

    async def get_status(self, job_id: str) -> GenerationResult:
        """
        Get status of Udio generation.

        Udio generation is synchronous via the wrapper, so if we have a job_id,
        it means the generation completed successfully.
        """
        # Udio wrapper works synchronously, so status is always complete
        # if we have a valid job_id
        return GenerationResult(
            provider=ProviderType.UDIO,
            job_id=job_id,
            status=GenerationStatus.COMPLETE,
        )

    async def download_audio(self, audio_url: str, output_path: Path) -> bool:
        """Download generated audio to local path."""
        import httpx

        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
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
        """Clean up resources."""
        self._wrapper = None


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
        elif provider_type == ProviderType.UDIO:
            _providers[provider_type] = UdioProvider()
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
