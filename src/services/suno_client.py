"""Suno API client for music generation."""

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional

import httpx

from src.utils.config import settings

logger = logging.getLogger(__name__)


class SunoJobStatus(str, Enum):
    """Status of a Suno generation job."""

    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    STREAMING = "streaming"
    COMPLETE = "complete"
    FAILED = "failed"
    ERROR = "error"


@dataclass
class SunoJobResult:
    """Result of a Suno generation job."""

    job_id: str
    status: SunoJobStatus
    title: Optional[str] = None
    audio_url: Optional[str] = None
    video_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    lyrics: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


@dataclass
class SunoGenerationRequest:
    """Request for Suno music generation."""

    prompt: str
    style: Optional[str] = None
    title: Optional[str] = None
    is_instrumental: bool = False
    duration_seconds: Optional[int] = None  # 30, 60, 120, etc.
    make_instrumental: bool = False
    wait_audio: bool = True  # Wait for audio URL to be ready


class SunoClient:
    """Client for interacting with Suno API (via proxy/wrapper)."""

    def __init__(
        self,
        api_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: float = 300.0,  # 5 minutes for generation
    ):
        self.api_url = (api_url or settings.suno_api_url).rstrip("/")
        self.api_key = api_key or settings.suno_api_key
        self.timeout = timeout

        if not self.api_url:
            raise ValueError("Suno API URL not configured")

        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.api_url,
                timeout=self.timeout,
                headers=self._get_headers(),
            )
        return self._client

    def _get_headers(self) -> dict:
        """Get request headers."""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def generate(self, request: SunoGenerationRequest) -> SunoJobResult:
        """
        Submit a music generation request to Suno.

        Args:
            request: Generation request with prompt and options

        Returns:
            SunoJobResult with job_id and initial status
        """
        client = await self._get_client()

        payload = {
            "prompt": request.prompt,
            "make_instrumental": request.is_instrumental or request.make_instrumental,
            "wait_audio": request.wait_audio,
        }

        if request.style:
            payload["style"] = request.style
        if request.title:
            payload["title"] = request.title

        try:
            logger.info(f"Submitting generation request: {request.prompt[:50]}...")
            response = await client.post("/api/generate", json=payload)
            response.raise_for_status()
            data = response.json()

            # Handle different response formats from various Suno API wrappers
            if isinstance(data, list) and len(data) > 0:
                # Some APIs return a list of jobs
                job_data = data[0]
            elif isinstance(data, dict):
                job_data = data
            else:
                raise ValueError(f"Unexpected response format: {type(data)}")

            job_id = job_data.get("id") or job_data.get("job_id") or job_data.get("task_id")
            if not job_id:
                raise ValueError("No job ID in response")

            return SunoJobResult(
                job_id=job_id,
                status=SunoJobStatus.PENDING,
                title=job_data.get("title"),
                audio_url=job_data.get("audio_url"),
                created_at=datetime.utcnow(),
            )

        except httpx.HTTPStatusError as e:
            logger.error(f"Suno API error: {e.response.status_code} - {e.response.text}")
            return SunoJobResult(
                job_id="",
                status=SunoJobStatus.ERROR,
                error_message=f"HTTP {e.response.status_code}: {e.response.text[:200]}",
            )
        except Exception as e:
            logger.error(f"Suno generation failed: {e}")
            return SunoJobResult(
                job_id="",
                status=SunoJobStatus.ERROR,
                error_message=str(e),
            )

    async def get_status(self, job_id: str) -> SunoJobResult:
        """
        Get the status of a generation job.

        Args:
            job_id: The job ID to check

        Returns:
            SunoJobResult with current status
        """
        client = await self._get_client()

        try:
            response = await client.get(f"/api/get", params={"ids": job_id})
            response.raise_for_status()
            data = response.json()

            if isinstance(data, list) and len(data) > 0:
                job_data = data[0]
            elif isinstance(data, dict):
                job_data = data
            else:
                raise ValueError(f"Unexpected response format: {type(data)}")

            # Map various status strings to our enum
            raw_status = job_data.get("status", "").lower()
            status_map = {
                "pending": SunoJobStatus.PENDING,
                "queued": SunoJobStatus.QUEUED,
                "processing": SunoJobStatus.PROCESSING,
                "streaming": SunoJobStatus.STREAMING,
                "complete": SunoJobStatus.COMPLETE,
                "completed": SunoJobStatus.COMPLETE,
                "success": SunoJobStatus.COMPLETE,
                "failed": SunoJobStatus.FAILED,
                "error": SunoJobStatus.ERROR,
            }
            status = status_map.get(raw_status, SunoJobStatus.PENDING)

            return SunoJobResult(
                job_id=job_id,
                status=status,
                title=job_data.get("title"),
                audio_url=job_data.get("audio_url"),
                video_url=job_data.get("video_url"),
                duration_seconds=job_data.get("duration"),
                lyrics=job_data.get("lyric") or job_data.get("lyrics"),
                error_message=job_data.get("error") or job_data.get("error_message"),
            )

        except httpx.HTTPStatusError as e:
            logger.error(f"Status check failed: {e.response.status_code}")
            return SunoJobResult(
                job_id=job_id,
                status=SunoJobStatus.ERROR,
                error_message=f"HTTP {e.response.status_code}",
            )
        except Exception as e:
            logger.error(f"Status check failed: {e}")
            return SunoJobResult(
                job_id=job_id,
                status=SunoJobStatus.ERROR,
                error_message=str(e),
            )

    async def wait_for_completion(
        self,
        job_id: str,
        poll_interval: float = 5.0,
        max_wait: float = 300.0,
    ) -> SunoJobResult:
        """
        Wait for a job to complete, polling periodically.

        Args:
            job_id: The job ID to wait for
            poll_interval: Seconds between status checks
            max_wait: Maximum seconds to wait

        Returns:
            Final SunoJobResult
        """
        start_time = datetime.utcnow()

        while True:
            result = await self.get_status(job_id)

            if result.status in (SunoJobStatus.COMPLETE, SunoJobStatus.FAILED, SunoJobStatus.ERROR):
                result.completed_at = datetime.utcnow()
                return result

            elapsed = (datetime.utcnow() - start_time).total_seconds()
            if elapsed >= max_wait:
                return SunoJobResult(
                    job_id=job_id,
                    status=SunoJobStatus.ERROR,
                    error_message=f"Timeout waiting for completion after {elapsed:.0f}s",
                )

            logger.debug(f"Job {job_id} status: {result.status}, waiting...")
            await asyncio.sleep(poll_interval)

    async def download_audio(
        self,
        audio_url: str,
        output_path: Path,
        chunk_size: int = 8192,
    ) -> bool:
        """
        Download audio file from URL.

        Args:
            audio_url: URL of the audio file
            output_path: Local path to save the file
            chunk_size: Download chunk size

        Returns:
            True if download succeeded
        """
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("GET", audio_url) as response:
                    response.raise_for_status()

                    output_path.parent.mkdir(parents=True, exist_ok=True)

                    with open(output_path, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size):
                            f.write(chunk)

            logger.info(f"Downloaded audio to {output_path}")
            return True

        except Exception as e:
            logger.error(f"Download failed: {e}")
            return False

    async def generate_and_wait(
        self,
        prompt: str,
        style: Optional[str] = None,
        is_instrumental: bool = False,
        download_path: Optional[Path] = None,
    ) -> SunoJobResult:
        """
        Convenience method to generate and wait for completion.

        Args:
            prompt: Music generation prompt
            style: Optional style/genre
            is_instrumental: Whether to generate instrumental
            download_path: Optional path to download the audio

        Returns:
            Final SunoJobResult
        """
        request = SunoGenerationRequest(
            prompt=prompt,
            style=style,
            is_instrumental=is_instrumental,
        )

        # Submit generation
        result = await self.generate(request)
        if result.status == SunoJobStatus.ERROR:
            return result

        # Wait for completion
        result = await self.wait_for_completion(result.job_id)

        # Download if requested and successful
        if result.status == SunoJobStatus.COMPLETE and download_path and result.audio_url:
            await self.download_audio(result.audio_url, download_path)

        return result


# Convenience function to get a configured client
def get_suno_client() -> SunoClient:
    """Get a configured Suno client instance."""
    return SunoClient()
