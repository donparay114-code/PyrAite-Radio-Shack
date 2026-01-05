"""Music generation API routes for testing providers."""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.services.music_provider import GenerationStatus, ProviderType, generate_music

router = APIRouter()


class GenerateRequest(BaseModel):
    """Request to generate music."""

    prompt: str = Field(..., min_length=3, max_length=500, description="Music prompt")
    provider: str = Field(
        default="sunoapi",
        description="Provider: 'sunoapi', 'goapi_udio', 'suno', 'udio', or 'mock'",
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
        "sunoapi": ProviderType.SUNOAPI,  # sunoapi.org - recommended
        "goapi_suno": ProviderType.GOAPI_SUNO,  # deprecated
        "goapi_udio": ProviderType.GOAPI_UDIO,  # GoAPI Udio - recommended
        "mock": ProviderType.MOCK,
    }

    provider_type = provider_map.get(request.provider.lower())
    if not provider_type:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider: {request.provider}. Use 'sunoapi', 'goapi_udio', 'udio', 'suno', or 'mock'",
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
            {
                "id": "sunoapi",
                "name": "SunoAPI.org",
                "description": "Suno via sunoapi.org ($0.032/song, API key auth) - RECOMMENDED",
                "recommended": True,
            },
            {
                "id": "goapi_udio",
                "name": "GoAPI Udio",
                "description": "Udio via GoAPI (API key auth) - RECOMMENDED",
                "recommended": True,
            },
            {
                "id": "udio",
                "name": "Udio (Cookie)",
                "description": "Udio via udio-wrapper (cookie auth, less reliable)",
                "recommended": False,
            },
            {
                "id": "suno",
                "name": "Suno (Cookie)",
                "description": "Suno via browser cookies (unreliable)",
                "recommended": False,
            },
            {
                "id": "goapi_suno",
                "name": "GoAPI Suno",
                "description": "DEPRECATED - GoAPI doesn't have Suno",
                "recommended": False,
                "deprecated": True,
            },
            {
                "id": "mock",
                "name": "Mock",
                "description": "Test provider (no actual generation)",
                "recommended": False,
            },
        ],
        "default": "sunoapi",
    }
