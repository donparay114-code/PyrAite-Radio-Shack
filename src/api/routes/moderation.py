from fastapi import APIRouter, Body
from pydantic import BaseModel
from src.api.socket_manager import emit_moderation_settings_changed

router = APIRouter()

class ModerationSettings(BaseModel):
    enabled: bool
    channel_id: str

@router.post("/settings")
async def update_moderation_settings(settings: ModerationSettings):
    """
    Update moderation settings and notify clients.
    """
    # Logic to update database would go here (currently in-memory/mock as per requirements)

    # Broadcast event
    await emit_moderation_settings_changed(
        settings.channel_id,
        {"enabled": settings.enabled, "timestamp": "now"}
    )

    return {"status": "updated"}
