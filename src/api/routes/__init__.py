# API Routes Package
"""Route modules for PYrte Radio Shack API."""

# Export all route modules for easy importing
from . import (
    health,
    queue,
    users,
    songs,
    votes,
    webhooks,
    auth,
    chat,
    auth_google,
    moderation,
    generate,
    profile
)

__all__ = [
    "health",
    "queue",
    "users",
    "songs",
    "votes",
    "webhooks",
    "auth",
    "chat",
    "auth_google",
    "moderation",
    "generate",
    "profile"
]
