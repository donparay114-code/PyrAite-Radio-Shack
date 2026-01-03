# API Routes Package
"""Route modules for PYrte Radio Shack API."""

# Export all route modules for easy importing
from . import (
    auth,
    auth_google,
    chat,
    generate,
    health,
    moderation,
    profile,
    queue,
    songs,
    users,
    votes,
    webhooks,
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
    "profile",
]
