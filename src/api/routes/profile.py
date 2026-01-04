"""Profile management API routes."""

import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.routes.auth_email import (
    get_password_hash,
    validate_password,
    verify_password,
)
from src.models import User, get_async_session
from src.utils.security import get_current_user

router = APIRouter()

# Avatar upload settings
UPLOAD_DIR = Path("src/static/uploads/avatars")
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


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
    username_last_changed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmailUpdateRequest(BaseModel):
    """Request to update email."""

    new_email: EmailStr
    password: str


class PasswordUpdateRequest(BaseModel):
    """Request to update password."""

    current_password: str
    new_password: str


class UsernameUpdateRequest(BaseModel):
    """Request to update username/display name."""

    new_username: str


class SetPasswordRequest(BaseModel):
    """Request to set initial password for Google-only accounts."""

    new_password: str


class UsernameUpdateResponse(BaseModel):
    """Response for username update."""

    success: bool
    message: str
    display_name: str
    username_last_changed_at: Optional[datetime] = None
    days_until_next_change: int = 0


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
        avatar_url=getattr(user, "avatar_url", None),
        tier=user.tier.value if user.tier else "new",
        reputation_score=user.reputation_score,
        is_premium=user.is_premium,
        username_last_changed_at=getattr(user, "username_last_changed_at", None),
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
        if hasattr(user, "avatar_url"):
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
        avatar_url=getattr(user, "avatar_url", None),
        tier=user.tier.value if user.tier else "new",
        reputation_score=user.reputation_score,
        is_premium=user.is_premium,
        username_last_changed_at=getattr(user, "username_last_changed_at", None),
    )


@router.patch("/email")
async def update_email(
    request: EmailUpdateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update user's email address.
    Requires current password for verification.
    """
    # Verify current password
    if not user.password_hash:
        raise HTTPException(
            status_code=400, detail="Cannot change email for Google-only accounts"
        )

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")

    # Check if new email is already in use
    result = await session.execute(
        select(User).where(User.email == request.new_email, User.id != user.id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already in use")

    # Update email
    user.email = request.new_email
    session.add(user)
    await session.commit()

    return {
        "success": True,
        "message": "Email updated successfully",
        "email": user.email,
    }


@router.patch("/password")
async def update_password(
    request: PasswordUpdateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update user's password.
    Requires current password for verification.
    """
    # Check if user has a password (not Google-only)
    if not user.password_hash:
        raise HTTPException(
            status_code=400,
            detail="Cannot change password for Google-only accounts. Please set a password first.",
        )

    # Verify current password
    if not verify_password(request.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    # Validate new password
    is_valid, error_msg = validate_password(request.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Update password
    user.password_hash = get_password_hash(request.new_password)
    session.add(user)
    await session.commit()

    return {"success": True, "message": "Password updated successfully"}


@router.post("/set-password")
async def set_password(
    request: SetPasswordRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Set initial password for Google-only accounts.
    Only works for users who don't have a password yet.
    """
    # Only allow if user doesn't have a password
    if user.password_hash:
        raise HTTPException(
            status_code=400,
            detail="Password already set. Use change password instead.",
        )

    # Validate password strength
    is_valid, error_msg = validate_password(request.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Set password
    user.password_hash = get_password_hash(request.new_password)
    session.add(user)
    await session.commit()

    return {"success": True, "message": "Password set successfully"}


@router.patch("/username", response_model=UsernameUpdateResponse)
async def update_username(
    request: UsernameUpdateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update user's display name/username.
    Can only be changed once every 30 days.
    """
    # Check 30-day restriction
    if user.username_last_changed_at:
        days_since = (datetime.utcnow() - user.username_last_changed_at).days
        if days_since < 30:
            days_remaining = 30 - days_since
            raise HTTPException(
                status_code=400,
                detail={
                    "message": f"Username can only be changed once every 30 days. Please wait {days_remaining} more days.",
                    "days_remaining": days_remaining,
                },
            )

    # Validate username
    new_username = request.new_username.strip()
    if len(new_username) < 3:
        raise HTTPException(
            status_code=400, detail="Username must be at least 3 characters"
        )
    if len(new_username) > 30:
        raise HTTPException(
            status_code=400, detail="Username must be 30 characters or less"
        )
    if not re.match(r"^[a-zA-Z0-9_]+$", new_username):
        raise HTTPException(
            status_code=400,
            detail="Username can only contain letters, numbers, and underscores",
        )

    # Update username (stored in telegram_first_name for display_name property)
    user.telegram_first_name = new_username
    user.username_last_changed_at = datetime.utcnow()
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return UsernameUpdateResponse(
        success=True,
        message="Username updated successfully",
        display_name=user.display_name,
        username_last_changed_at=user.username_last_changed_at,
        days_until_next_change=30,
    )


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Upload a new avatar image.
    Accepts PNG, JPG, WEBP. Max 5MB.
    """
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower() if file.filename else ""
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Read file and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB",
        )

    # Create upload directory if it doesn't exist
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Delete old avatar if exists
    if user.avatar_url:
        old_path = Path(user.avatar_url.lstrip("/"))
        if old_path.exists():
            old_path.unlink()

    # Generate unique filename
    filename = f"{user.id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = UPLOAD_DIR / filename

    # Save file
    with open(file_path, "wb") as f:
        f.write(content)

    # Update user avatar_url
    avatar_url = f"/static/uploads/avatars/{filename}"
    user.avatar_url = avatar_url
    session.add(user)
    await session.commit()

    return {"success": True, "avatar_url": avatar_url}


@router.delete("/avatar")
async def delete_avatar(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Delete user's avatar image."""
    if not user.avatar_url:
        raise HTTPException(status_code=400, detail="No avatar to delete")

    # Delete file
    file_path = Path(user.avatar_url.lstrip("/"))
    if file_path.exists():
        file_path.unlink()

    # Clear avatar_url
    user.avatar_url = None
    session.add(user)
    await session.commit()

    return {"success": True, "message": "Avatar deleted"}


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
