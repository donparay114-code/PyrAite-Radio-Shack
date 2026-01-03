"""Music generation API routes for testing providers."""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.services.music_provider import (
    GenerationRequest,
    GenerationStatus,
    ProviderType,
    generate_music,
    get_provider,
)

router = APIRouter()


class GenerateRequest(BaseModel):
    """Request to generate music."""

    prompt: str = Field(..., min_length=3, max_length=500, description="Music prompt")
    provider: str = Field(
        default="udio",
        description="Provider: 'udio', 'suno', or 'mock'",
    )
    is_instrumental: bool = Field(default=True, description="Generate instrumental")
    style: Optional[str] = Field(None, max_length=100, description="Style hint")


class GenerateResponse(BaseModel):
    """Response from music generation."""

    success: bool
    provider: str
    job_id: Optional[str] = None
    status: str
    audio_url: Optional[str] = None
    title: Optional[str] = None
    error: Optional[str] = None


@router.post("/test", response_model=GenerateResponse)
async def test_generate(request: GenerateRequest):
    """
    Test music generation with a specific provider.

    This endpoint is for testing purposes to verify provider integrations.
    """
    # Map string to ProviderType
    provider_map = {
        "udio": ProviderType.UDIO,
        "suno": ProviderType.SUNO,
        "mock": ProviderType.MOCK,
    }

    provider_type = provider_map.get(request.provider.lower())
    if not provider_type:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider: {request.provider}. Use 'udio', 'suno', or 'mock'",
        )

    try:
        result = await generate_music(
            prompt=request.prompt,
            style=request.style,
            is_instrumental=request.is_instrumental,
            provider_type=provider_type,
        )

        return GenerateResponse(
            success=result.status == GenerationStatus.COMPLETE,
            provider=result.provider.value,
            job_id=result.job_id,
            status=result.status.value,
            audio_url=result.audio_url,
            title=result.title,
            error=result.error_message,
        )
    except Exception as e:
        return GenerateResponse(
            success=False,
            provider=request.provider,
            status="error",
            error=str(e),
        )


@router.get("/providers")
async def list_providers():
    """List available music generation providers."""
    return {
        "providers": [
            {"id": "udio", "name": "Udio", "description": "Free AI music via udio-wrapper"},
            {"id": "suno", "name": "Suno", "description": "Suno AI music generation"},
            {"id": "mock", "name": "Mock", "description": "Test provider (no actual generation)"},
        ],
        "default": "udio",
    }
