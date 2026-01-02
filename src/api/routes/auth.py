"""Authentication routes for Telegram WebApp validation."""

import hashlib
import hmac
import json
from datetime import datetime
from typing import Optional
from urllib.parse import parse_qs, unquote

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import User, get_async_session
from src.utils.config import settings

router = APIRouter()


class TelegramAuthRequest(BaseModel):
    """Request body for Telegram authentication."""

    init_data: str


class TelegramAuthResponse(BaseModel):
    """Response for successful Telegram authentication."""

    user_id: int
    telegram_id: int
    username: Optional[str]
    first_name: str
    last_name: Optional[str]
    is_premium: bool
    photo_url: Optional[str]
    authenticated: bool = True


def validate_telegram_init_data(init_data: str, bot_token: str) -> dict | None:
    """
    Validate Telegram WebApp init data using HMAC-SHA256.

    The validation follows Telegram's official algorithm:
    1. Parse the init_data query string
    2. Sort parameters alphabetically (except 'hash')
    3. Create data_check_string by joining with newlines
    4. Create secret_key = HMAC-SHA256(bot_token, "WebAppData")
    5. Calculate hash = HMAC-SHA256(data_check_string, secret_key)
    6. Compare with provided hash

    Returns parsed user data if valid, None otherwise.
    """
    try:
        # Parse the query string
        parsed = parse_qs(init_data, keep_blank_values=True)

        # Convert to dict with single values
        data = {k: v[0] for k, v in parsed.items()}

        # Get and remove the hash
        received_hash = data.pop("hash", None)
        if not received_hash:
            return None

        # Sort remaining parameters and create data_check_string
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))

        # Create secret key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256,
        ).digest()

        # Calculate expected hash
        expected_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256,
        ).hexdigest()

        # Constant-time comparison
        if not hmac.compare_digest(expected_hash, received_hash):
            return None

        # Check auth_date is not too old (24 hours)
        auth_date = int(data.get("auth_date", 0))
        if datetime.utcnow().timestamp() - auth_date > 86400:
            return None

        # Parse user data
        user_data = data.get("user")
        if user_data:
            return json.loads(unquote(user_data))

        return None

    except (ValueError, json.JSONDecodeError, KeyError):
        return None


@router.post("/telegram", response_model=TelegramAuthResponse)
async def authenticate_telegram(
    request: TelegramAuthRequest,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Authenticate a user via Telegram WebApp init data.

    This endpoint:
    1. Validates the init_data using HMAC-SHA256
    2. Creates or updates the user in the database
    3. Returns the user's profile data
    """
    # Get bot token from settings
    bot_token = settings.telegram_bot_token

    if not bot_token:
        # In development, allow unauthenticated access with mock data
        raise HTTPException(
            status_code=503,
            detail="Telegram authentication not configured. Set TELEGRAM_BOT_TOKEN.",
        )

    # Validate init data
    user_data = validate_telegram_init_data(request.init_data, bot_token)

    if not user_data:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired Telegram authentication data",
        )

    # Extract user info
    telegram_id = user_data.get("id")
    username = user_data.get("username")
    first_name = user_data.get("first_name", "")
    last_name = user_data.get("last_name")
    is_premium = user_data.get("is_premium", False)
    photo_url = user_data.get("photo_url")

    if not telegram_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid user data in init_data",
        )

    # Find or create user
    from sqlalchemy import select

    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if user:
        # Update existing user
        user.telegram_username = username
        user.telegram_first_name = first_name
        user.telegram_last_name = last_name
        user.is_premium = is_premium
        user.last_seen_at = datetime.utcnow()
    else:
        # Create new user
        user = User(
            telegram_id=telegram_id,
            telegram_username=username,
            telegram_first_name=first_name,
            telegram_last_name=last_name,
            is_premium=is_premium,
        )
        session.add(user)

    await session.commit()
    await session.refresh(user)

    return TelegramAuthResponse(
        user_id=user.id,
        telegram_id=telegram_id,
        username=username,
        first_name=first_name,
        last_name=last_name,
        is_premium=is_premium,
        photo_url=photo_url,
    )


@router.get("/me")
async def get_current_user(
    telegram_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get current user profile by Telegram ID.

    This is a convenience endpoint for fetching user data
    after initial authentication.
    """
    from sqlalchemy import select

    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return {
        "user_id": user.id,
        "telegram_id": user.telegram_id,
        "username": user.telegram_username,
        "first_name": user.telegram_first_name,
        "last_name": user.telegram_last_name,
        "reputation_score": user.reputation_score,
        "tier": user.tier.value if user.tier else "bronze",
        "total_requests": user.total_requests,
        "successful_requests": user.successful_requests,
    }
