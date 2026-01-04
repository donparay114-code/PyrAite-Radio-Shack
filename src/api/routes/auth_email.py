"""Email/password authentication endpoints."""

import re

from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import User, get_async_session
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
    result = await session.execute(
        select(User).where(User.email == request.email)
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists"
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
    result = await session.execute(
        select(User).where(User.email == request.email)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Check if user has a password (might be Google-only account)
    if not user.password_hash:
        raise HTTPException(
            status_code=401,
            detail="This account uses Google sign-in. Please use 'Continue with Google'."
        )

    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

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
