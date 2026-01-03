"""Profile management API routes."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import User, get_async_session
from src.utils.security import get_current_user

router = APIRouter()


# Request/Response models
class ProfileUpdateRequest(BaseModel):
    """Update profile fields."""
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileResponse(BaseModel):
    """Profile response model."""
    id: int
    display_name: str
    email: Optional[str] = None
    google_id: Optional[str] = None
    telegram_id: Optional[int] = None
    telegram_username: Optional[str] = None
    avatar_url: Optional[str] = None
    tier: str
    reputation_score: float
    is_premium: bool
    is_new_user: bool = False

    class Config:
        from_attributes = True


@router.get("/settings", response_model=ProfileResponse)
async def get_profile_settings(
    user: User = Depends(get_current_user),
):
    """Get current user's profile settings."""
    return ProfileResponse(
        id=user.id,
        display_name=user.display_name,
        email=user.email,
        google_id=user.google_id,
        telegram_id=user.telegram_id,
        telegram_username=user.telegram_username,
        avatar_url=getattr(user, 'avatar_url', None),
        tier=user.tier.value if user.tier else "new",
        reputation_score=user.reputation_score,
        is_premium=user.is_premium,
    )


@router.patch("/settings", response_model=ProfileResponse)
async def update_profile_settings(
    updates: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Update current user's profile settings."""
    # Apply updates
    if updates.display_name is not None:
        # Store display name in telegram_first_name field for now
        # (since that's what display_name property uses)
        user.telegram_first_name = updates.display_name
    
    if updates.avatar_url is not None:
        # Check if User model has avatar_url field
        if hasattr(user, 'avatar_url'):
            user.avatar_url = updates.avatar_url
    
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    return ProfileResponse(
        id=user.id,
        display_name=user.display_name,
        email=user.email,
        google_id=user.google_id,
        telegram_id=user.telegram_id,
        telegram_username=user.telegram_username,
        avatar_url=getattr(user, 'avatar_url', None),
        tier=user.tier.value if user.tier else "new",
        reputation_score=user.reputation_score,
        is_premium=user.is_premium,
    )


@router.delete("/unlink-telegram")
async def unlink_telegram(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Unlink Telegram from the current user's account."""
    if not user.telegram_id and not user.telegram_username:
        raise HTTPException(status_code=400, detail="No Telegram account linked")
    
    user.telegram_id = None
    user.telegram_username = None
    user.telegram_first_name = None
    user.telegram_last_name = None
    
    session.add(user)
    await session.commit()
    
    return {"message": "Telegram account unlinked successfully"}
