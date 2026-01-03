"""Liquidsoap client for interacting with the radio stream."""

import logging
from typing import Optional

import httpx

from src.utils.config import settings

logger = logging.getLogger(__name__)

class LiquidsoapClient:
    """Client for Liquidsoap HTTP API."""

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or settings.liquidsoap_url).rstrip("/")

    async def get_queue_length(self) -> Optional[int]:
        """Get current request queue length."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/status")
                if response.status_code == 200:
                    data = response.json()
                    return int(data.get("queue_length", 0))
        except Exception as e:
            logger.error(f"Failed to get queue length: {e}")
        return None

    async def push_song(self, song_path: str) -> bool:
        """Push a song file path to the Liquidsoap request queue."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(f"{self.base_url}/next", content=song_path)
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to push song {song_path}: {e}")
            return False

    async def skip_current(self) -> bool:
        """Skip the currently playing song."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(f"{self.base_url}/skip")
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to skip song: {e}")
            return False

_liquidsoap_client: Optional[LiquidsoapClient] = None

def get_liquidsoap_client() -> LiquidsoapClient:
    """Get Liquidsoap client singleton."""
    global _liquidsoap_client
    if _liquidsoap_client is None:
        _liquidsoap_client = LiquidsoapClient()
    return _liquidsoap_client
