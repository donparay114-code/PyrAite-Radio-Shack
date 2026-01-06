"""FastAPI application entry point for PYrte Radio Shack."""

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from src.api.routes import (
    admin,
    auth,
    auth_email,
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
from src.api.socket_manager import sio_app
from src.utils.config import settings
from src.utils.logging import setup_logging

# API version
API_VERSION = "1.0.0"

# Rate limiter using memory storage (Redis disabled for local dev)
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=None,  # Use in-memory storage
    default_limits=["100/minute"],  # Global default
)

# API description for OpenAPI docs
API_DESCRIPTION = """
# PYrte Radio Shack API

AI-powered community radio station with Suno music generation.

## Features

- **Queue Management**: Submit song requests, track status, vote on songs
- **User System**: Reputation-based tiers, voting power, request limits
- **Music Generation**: Suno AI integration for creating songs from prompts
- **Broadcasting**: Liquidsoap integration for live streaming
- **Moderation**: Content filtering and safety checks

## Authentication

Currently uses Telegram user IDs for authentication. API keys will be added in future versions.

## Rate Limits

- API endpoints: 10 requests/second
- Webhooks: 30 requests/second
- Song requests: Based on user tier (3-50 per day)

## Getting Started

1. Create a user via `/api/users/` with your Telegram ID
2. Submit song requests via `/api/queue/`
3. Vote on songs via `/api/votes/`
4. Check status via `/api/queue/stats`
"""

TAGS_METADATA = [
    {
        "name": "Health",
        "description": "Health check endpoints for monitoring and orchestration",
    },
    {
        "name": "Queue",
        "description": "Song request queue management - submit, track, and manage requests",
    },
    {
        "name": "Users",
        "description": "User management - registration, stats, reputation, and moderation",
    },
    {
        "name": "Songs",
        "description": "Song catalog - browse, search, and manage generated songs",
    },
    {
        "name": "Votes",
        "description": "Voting system - upvote/downvote songs and queue items",
    },
    {
        "name": "Webhooks",
        "description": "Webhook endpoints for external integrations (Suno, Telegram, n8n)",
    },
    {
        "name": "Chat",
        "description": "Real-time community chat with WebSocket support",
    },
    {
        "name": "Admin",
        "description": "Admin dashboard statistics and management endpoints",
    },
]


# Global task reference for cleanup
_telegram_polling_task: Optional[asyncio.Task] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    global _telegram_polling_task

    # Startup
    setup_logging()
    settings.ensure_directories()

    # Initialize database engine early to ensure correct settings are used
    import logging
    logger = logging.getLogger(__name__)
    logger.info("Initializing database engine at startup...")
    from src.models import get_async_engine
    engine = get_async_engine()
    logger.info(f"Database engine initialized: {engine.url.host}:{engine.url.port}")

    # Start APScheduler for background tasks
    from src.services.scheduler import setup_scheduler, start_scheduler, stop_scheduler

    setup_scheduler()
    start_scheduler()

    # Start Telegram bot polling
    from src.services.telegram_bot import get_telegram_bot
    from src.services.telegram_handlers import register_handlers

    bot = get_telegram_bot()
    register_handlers(bot)
    _telegram_polling_task = asyncio.create_task(bot.start_polling())

    yield

    # Shutdown
    # Stop Telegram polling
    if _telegram_polling_task:
        bot.stop_polling()
        _telegram_polling_task.cancel()
        try:
            await _telegram_polling_task
        except asyncio.CancelledError:
            pass

    # Stop scheduler
    stop_scheduler()


app = FastAPI(
    title="PYrte Radio Shack API",
    description=API_DESCRIPTION,
    version=API_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_tags=TAGS_METADATA,
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    contact={
        "name": "PYrte Radio Shack",
        "url": "https://github.com/pyrte-radio-shack",
    },
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.debug else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Mount Socket.IO app
app.mount("/socket.io", sio_app)

# Mount static files for avatar uploads
STATIC_DIR = Path("src/static")
STATIC_DIR.mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "uploads" / "avatars").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred",
        },
    )


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "version": API_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "PYrte Radio Shack API",
        "version": API_VERSION,
        "docs": "/docs" if settings.debug else "Disabled in production",
        "health": "/health",
    }


app.include_router(health.router, prefix="/api/health", tags=["Health"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(auth_email.router, prefix="/api/auth/email", tags=["Auth"])
app.include_router(auth_google.router, prefix="/api/auth/google", tags=["Auth"])
app.include_router(queue.router, prefix="/api/queue", tags=["Queue"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(songs.router, prefix="/api/songs", tags=["Songs"])
app.include_router(votes.router, prefix="/api/votes", tags=["Votes"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["Webhooks"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(moderation.router, prefix="/api/moderation", tags=["Moderation"])
app.include_router(generate.router, prefix="/api/generate", tags=["Generate"])
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

# Debug: Print all registered routes
print("\n--- REGISTERED ROUTES ---")
for route in app.routes:
    print(f"Path: {route.path} | Name: {route.name}")
print("--- END REGISTERED ROUTES ---\n")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.api.main:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.debug,
    )
