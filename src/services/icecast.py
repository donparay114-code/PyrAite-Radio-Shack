"""Icecast service for fetching server statistics."""

import logging
import time
from typing import Optional

import httpx

from src.utils.config import settings

logger = logging.getLogger(__name__)

# Simple in-memory cache
_last_listeners: int = 0
_last_fetch_time: float = 0
_cache_ttl: float = 10.0  # seconds


async def get_current_listeners() -> int:
    """
    Fetch the current number of listeners from Icecast.

    Uses a short in-memory cache to prevent overloading the Icecast server.

    Returns:
        int: Number of active listeners, or 0 if fetch fails.
    """
    global _last_listeners, _last_fetch_time

    current_time = time.time()
    if current_time - _last_fetch_time < _cache_ttl:
        return _last_listeners

    try:
        # Construct URL inside try block to handle potential config errors gracefully
        base_url = f"http://{settings.icecast_host}:{settings.icecast_port}"
        status_url = f"{base_url}/status-json.xsl"

        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(status_url)
            response.raise_for_status()
            data = response.json()

            if "icestats" not in data:
                return 0

            icestats = data["icestats"]
            sources = icestats.get("source")

            if not sources:
                return 0

            # Handle single source (dict) vs multiple sources (list)
            if isinstance(sources, dict):
                sources = [sources]

            target_mount = settings.icecast_mount
            # Ensure target_mount starts with / for comparison
            if not target_mount.startswith("/"):
                target_mount = f"/{target_mount}"

            listeners = 0
            found = False

            for source in sources:
                # Check 1: 'mount' field
                if source.get("mount") == target_mount:
                    listeners = int(source.get("listeners", 0))
                    found = True
                    break

                # Check 2: 'listenurl' ends with mount
                listen_url = source.get("listenurl", "")
                if listen_url.endswith(target_mount):
                    listeners = int(source.get("listeners", 0))
                    found = True
                    break

            # Fallback: if not found but only one source exists, assume it's the one
            if not found and len(sources) == 1:
                 listeners = int(sources[0].get("listeners", 0))

            _last_listeners = listeners
            _last_fetch_time = current_time
            return listeners

    except httpx.RequestError as e:
        logger.warning(f"Could not connect to Icecast: {e}")
        # Return cached value on error if it's not too old (e.g., < 1 minute)?
        # For now, just return 0 or keep old value?
        # Better to return 0 if we can't confirm, or keep stale data?
        # Let's return 0 to be safe, or maybe the stale value is better?
        # Let's stick to 0 or last known good?
        # If Icecast is down, listeners are effectively 0 (disconnected).
        return 0
    except Exception as e:
        logger.error(f"Error parsing Icecast stats: {e}")
        return 0
