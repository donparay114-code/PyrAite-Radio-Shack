"""Email/password authentication endpoints."""

import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import User, get_async_session
from src.services.email_service import send_password_reset_email
from src.utils.security import create_access_token

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter()


class AuthResponse(BaseModel):
    """Response model for authentication endpoints."""

    user_id: int
    display_name: str
    is_new_user: bool
    token: str
    email: str | None = None
    telegram_username: str | None = None
    tier: str | None = None
    reputation_score: float | None = None
    is_premium: bool = False


class SignupRequest(BaseModel):
    """Request model for email signup."""

    email: EmailStr
    password: str
    display_name: str


class LoginRequest(BaseModel):
    """Request model for email login."""

    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    """Request model for forgot password."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Request model for password reset."""

    token: str
    new_password: str


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def validate_password(password: str) -> tuple[bool, str]:
    """Validate password strength. Returns (is_valid, error_message)."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Za-z]", password):
        return False, "Password must contain at least one letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    return True, ""


@router.post("/signup", response_model=AuthResponse)
async def signup(
    request: SignupRequest,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Register a new user with email and password.

    Returns JWT token and user info. New users should be redirected to /profile/settings.
    """
    # Validate password
    is_valid, error_msg = validate_password(request.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Check if email already exists
    result = await session.execute(select(User).where(User.email == request.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=400, detail="An account with this email already exists"
        )

    # Create new user
    user = User(
        email=request.email,
        password_hash=get_password_hash(request.password),
        telegram_first_name=request.display_name,  # Store display name here
        is_premium=False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    # Generate JWT token
    access_token = create_access_token(data={"sub": str(user.id)})

    return AuthResponse(
        user_id=user.id,
        display_name=user.display_name,
        is_new_user=True,
        token=access_token,
        email=user.email,
        telegram_username=user.telegram_username,
        tier=user.tier.value if user.tier else "new",
        reputation_score=user.reputation_score,
        is_premium=user.is_premium,
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Login with email and password.

    Returns JWT token and user info.
    """
    # Find user by email
    result = await session.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check if user has a password (might be Google-only account)
    if not user.password_hash:
        raise HTTPException(
            status_code=401,
            detail="This account uses Google sign-in. Please use 'Continue with Google'.",
        )

    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Generate JWT token
    access_token = create_access_token(data={"sub": str(user.id)})

    return AuthResponse(
        user_id=user.id,
        display_name=user.display_name,
        is_new_user=False,
        token=access_token,
        email=user.email,
        telegram_username=user.telegram_username,
        tier=user.tier.value if user.tier else "new",
        reputation_score=user.reputation_score,
        is_premium=user.is_premium,
    )


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Request a password reset link.

    Generates a secure token and sends a reset link to the user's email.
    Always returns success to prevent email enumeration attacks.
    """
    # Find user by email
    result = await session.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    # Always return success to prevent email enumeration
    success_response = {
        "success": True,
        "message": "If an account exists with this email, you will receive a password reset link.",
    }

    if not user:
        return success_response

    # Check if user has password (not Google-only)
    if not user.password_hash and user.google_id:
        # Google-only account - don't send reset email
        return success_response

    # Generate secure token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

    # Save token to user
    user.password_reset_token = reset_token
    user.password_reset_expires_at = expires_at
    await session.commit()

    # Send email (non-blocking - we return success even if email fails)
    await send_password_reset_email(
        to_email=user.email,
        reset_token=reset_token,
        user_name=user.display_name,
    )

    return success_response


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Reset password using a valid token.

    Validates the token, checks expiry, and updates the password.
    """
    # Validate password strength
    is_valid, error_msg = validate_password(request.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Find user by token
    result = await session.execute(
        select(User).where(User.password_reset_token == request.token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset link. Please request a new one.",
        )

    # Check if token is expired
    if user.password_reset_expires_at is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset link. Please request a new one.",
        )

    # Handle timezone-aware comparison
    now = datetime.now(timezone.utc)
    expires_at = user.password_reset_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now > expires_at:
        # Clear expired token
        user.password_reset_token = None
        user.password_reset_expires_at = None
        await session.commit()
        raise HTTPException(
            status_code=400, detail="Reset link has expired. Please request a new one."
        )

    # Update password
    user.password_hash = get_password_hash(request.new_password)

    # Clear reset token (one-time use)
    user.password_reset_token = None
    user.password_reset_expires_at = None

    await session.commit()

    return {
        "success": True,
        "message": "Your password has been reset successfully. You can now log in with your new password.",
    }
