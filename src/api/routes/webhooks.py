"""Webhook handlers for n8n and external integrations."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel

from src.utils.config import settings
from src.services.telegram_bot import get_telegram_bot
from src.services.telegram_handlers import register_handlers

router = APIRouter()


class SunoWebhookPayload(BaseModel):
    """Payload from Suno status update webhook."""

    job_id: str
    status: str
    audio_url: Optional[str] = None
    title: Optional[str] = None
    duration: Optional[float] = None
    error: Optional[str] = None


class TelegramWebhookPayload(BaseModel):
    """Payload from Telegram bot webhook (simplified)."""

    update_id: int
    message: Optional[dict] = None
    callback_query: Optional[dict] = None


class N8NTriggerPayload(BaseModel):
    """Generic payload for n8n workflow triggers."""

    workflow: str
    action: str
    data: Optional[dict] = None


def verify_webhook_secret(secret: Optional[str]) -> bool:
    """Verify webhook secret matches configured value."""
    if not settings.secret_key:
        return True  # No secret configured, allow all
    return secret == settings.secret_key


@router.post("/suno/status")
async def suno_status_webhook(
    payload: SunoWebhookPayload,
    x_webhook_secret: Optional[str] = Header(None),
):
    """
    Receive Suno job status updates.

    Called by n8n when Suno generation completes or fails.
    """
    if not verify_webhook_secret(x_webhook_secret):
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    # TODO: Update queue item status based on Suno job status
    # This would typically:
    # 1. Find the queue item by suno_job_id
    # 2. Update status to GENERATED or FAILED
    # 3. Download and store the audio if successful

    return {
        "received": True,
        "job_id": payload.job_id,
        "status": payload.status,
        "processed_at": datetime.utcnow().isoformat(),
    }


@router.post("/telegram/update")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: Optional[str] = Header(None),
):
    """
    Receive Telegram bot updates.

    This is an alternative to polling - Telegram sends updates here.
    """
    # Verify the request is from Telegram
    # In production, compare x_telegram_bot_api_secret_token with configured secret

    payload = await request.json()

    bot = get_telegram_bot()

    # Ensure handlers are registered
    if "request" not in bot._handlers["command"]:
        register_handlers(bot)

    # Process update
    await bot._process_update(payload)

    return {
        "ok": True,
        "update_id": payload.get("update_id"),
    }


@router.post("/n8n/trigger")
async def n8n_trigger_webhook(
    payload: N8NTriggerPayload,
    x_webhook_secret: Optional[str] = Header(None),
):
    """
    Generic trigger endpoint for n8n workflows.

    Allows n8n to trigger API actions.
    """
    if not verify_webhook_secret(x_webhook_secret):
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    # Route to appropriate handler based on workflow/action
    handlers = {
        "queue_processor": {
            "start": lambda d: {"message": "Queue processing triggered"},
            "stop": lambda d: {"message": "Queue processing stopped"},
        },
        "broadcaster": {
            "next_song": lambda d: {"message": "Skipping to next song"},
            "pause": lambda d: {"message": "Broadcast paused"},
            "resume": lambda d: {"message": "Broadcast resumed"},
        },
        "reputation": {
            "recalculate": lambda d: {"message": "Reputation recalculation triggered"},
        },
    }

    workflow_handlers = handlers.get(payload.workflow, {})
    handler = workflow_handlers.get(payload.action)

    if not handler:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown workflow/action: {payload.workflow}/{payload.action}",
        )

    result = handler(payload.data)
    return {
        "success": True,
        "workflow": payload.workflow,
        "action": payload.action,
        **result,
    }


@router.post("/broadcast/status")
async def broadcast_status_webhook(
    request: Request,
    x_webhook_secret: Optional[str] = Header(None),
):
    """
    Receive broadcast status updates from Liquidsoap.

    Called when songs start/end playing.
    """
    if not verify_webhook_secret(x_webhook_secret):
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    payload = await request.json()

    # TODO: Update radio history and trigger next song logic
    _ = payload  # Acknowledge payload for future use
    # This would typically:
    # 1. Log the song that just finished
    # 2. Update play counts
    # 3. Trigger the next song to play

    return {
        "received": True,
        "processed_at": datetime.utcnow().isoformat(),
    }
