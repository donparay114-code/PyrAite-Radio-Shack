"""FastAPI application entry point for PYrte Radio Shack."""

from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.routes import queue, health, webhooks, users, songs, votes, auth, chat, auth_google, moderation, generate, profile
from src.utils.config import settings
from src.utils.logging import setup_logging
from src.api.socket_manager import sio_app

# API version
API_VERSION = "1.0.0"

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
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Startup
    setup_logging()
    settings.ensure_directories()
    yield
    # Shutdown (cleanup if needed)


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

# Mount Socket.IO app
app.mount("/socket.io", sio_app)


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
