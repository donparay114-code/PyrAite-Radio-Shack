"""Health check API routes."""

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import get_async_session
from src.utils.config import settings

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    timestamp: str
    version: str
    database: str
    redis: str


class DetailedHealthResponse(BaseModel):
    """Detailed health check response."""

    status: str
    timestamp: str
    version: str
    components: dict


@router.get("/", response_model=HealthResponse)
async def health_check():
    """Basic health check."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        version="1.0.0",
        database="unknown",
        redis="unknown",
    )


@router.get("/detailed", response_model=DetailedHealthResponse)
async def detailed_health_check(
    session: AsyncSession = Depends(get_async_session),
):
    """Detailed health check with component status."""
    components = {}
    overall_status = "healthy"

    # Check database
    try:
        await session.execute(text("SELECT 1"))
        components["database"] = {
            "status": "healthy",
            "host": settings.mysql_host,
            "database": settings.mysql_database,
        }
    except Exception as e:
        components["database"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        overall_status = "degraded"

    # Check Redis (basic check)
    try:
        import redis

        r = redis.from_url(settings.redis_url)
        r.ping()
        components["redis"] = {
            "status": "healthy",
            "host": settings.redis_host,
        }
    except Exception as e:
        components["redis"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        # Redis is optional, don't degrade status

    # Check file storage directories
    storage_healthy = True
    for name, path in [
        ("songs_dir", settings.songs_dir),
        ("temp_dir", settings.temp_dir),
        ("broadcast_dir", settings.broadcast_dir),
    ]:
        if path.exists() and path.is_dir():
            components[name] = {"status": "healthy", "path": str(path)}
        else:
            components[name] = {"status": "missing", "path": str(path)}
            storage_healthy = False

    if not storage_healthy:
        components["storage"] = {"status": "degraded", "message": "Some directories missing"}

    return DetailedHealthResponse(
        status=overall_status,
        timestamp=datetime.utcnow().isoformat(),
        version="1.0.0",
        components=components,
    )


@router.get("/ready")
async def readiness_check(
    session: AsyncSession = Depends(get_async_session),
):
    """Kubernetes-style readiness probe."""
    try:
        await session.execute(text("SELECT 1"))
        return {"ready": True}
    except Exception:
        return {"ready": False}


@router.get("/live")
async def liveness_check():
    """Kubernetes-style liveness probe."""
    return {"alive": True}
