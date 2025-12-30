"""FastAPI application entry point for PYrte Radio Shack."""

from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.utils.config import settings

# API version
API_VERSION = "1.0.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Startup
    settings.ensure_directories()
    yield
    # Shutdown (cleanup if needed)


app = FastAPI(
    title="PYrte Radio Shack API",
    description="AI-powered community radio station with Suno music generation",
    version=API_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.debug else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


# Import and include routers
from src.api.routes import queue, health, webhooks, users, songs, votes

app.include_router(health.router, prefix="/api/health", tags=["Health"])
app.include_router(queue.router, prefix="/api/queue", tags=["Queue"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(songs.router, prefix="/api/songs", tags=["Songs"])
app.include_router(votes.router, prefix="/api/votes", tags=["Votes"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["Webhooks"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
