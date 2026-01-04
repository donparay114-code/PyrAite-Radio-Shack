import os

from fastapi import APIRouter, Depends, HTTPException
from google.auth.transport import requests
from google.oauth2 import id_token
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import User, get_async_session
from src.utils.security import create_access_token, get_current_user


# Helper for response
class AuthResponse(BaseModel):
    user_id: int
    display_name: str
    is_new_user: bool
    token: str
    telegram_username: str | None = None
    tier: str | None = None
    reputation_score: float | None = None
    is_premium: bool = False


router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")


class GoogleLoginRequest(BaseModel):
    id_token: str


@router.post("/login", response_model=AuthResponse)
async def google_login(
    request: GoogleLoginRequest, session: AsyncSession = Depends(get_async_session)
):
    try:
        # Debug: Check if client ID is loaded
        print(f"[Google Auth] GOOGLE_CLIENT_ID loaded: {bool(GOOGLE_CLIENT_ID)}")
        print(f"[Google Auth] GOOGLE_CLIENT_ID value: {GOOGLE_CLIENT_ID[:20]}..." if GOOGLE_CLIENT_ID else "[Google Auth] GOOGLE_CLIENT_ID is empty!")

        # Verify token with extended clock skew tolerance (handles timing issues)
        id_info = id_token.verify_oauth2_token(
            request.id_token,
            requests.Request(),
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=300  # Allow 5 minutes of clock skew
        )

        email = id_info.get("email")
        google_id = id_info.get("sub")
        name = id_info.get("name", "")
        # picture = id_info.get("picture")  # Available for future use

        if not email:
            raise HTTPException(status_code=400, detail="Email not found in token")

        # Find or create user
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        is_new = False
        if not user:
            # Check by google_id
            result = await session.execute(
                select(User).where(User.google_id == google_id)
            )
            user = result.scalar_one_or_none()

        if not user:
            is_new = True
            user = User(
                email=email,
                google_id=google_id,
                telegram_first_name=name,  # store display name here for now
                is_premium=False,
            )
            session.add(user)
        else:
            # unexpected: found by email but not google_id? Update google_id
            if not user.google_id:
                user.google_id = google_id

        await session.commit()
        await session.refresh(user)

        # Generate JWT token
        access_token = create_access_token(data={"sub": str(user.id)})

        return AuthResponse(
            user_id=user.id,
            display_name=user.display_name,
            is_new_user=is_new,
            token=access_token,
            telegram_username=user.telegram_username,
            tier=user.tier.value if user.tier else "new",
            reputation_score=user.reputation_score,
            is_premium=user.is_premium,
        )

    except ValueError as e:
        print(f"[Google Auth] Token verification failed: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid Google Token: {str(e)}")


class LinkTelegramRequest(BaseModel):
    telegram_username: str


@router.post("/link-telegram")
async def link_telegram(
    request: LinkTelegramRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Link a Telegram username to the current authenticated user.
    """
    # Simply update the current user
    # Note: As mentioned, real verification would require extra steps.

    user.telegram_username = request.telegram_username.replace("@", "")
    session.add(user)  # Ensure it's in session
    await session.commit()


@router.get("/me", response_model=AuthResponse)
async def get_me(user: User = Depends(get_current_user)):
    """
    Get current user profile using JWT.
    """
    return AuthResponse(
        user_id=user.id,
        display_name=user.display_name,
        is_new_user=False,
        token="",  # Don't need to return token here if it's already in the header
        telegram_username=user.telegram_username,
        tier=user.tier.value if user.tier else "new",
        reputation_score=user.reputation_score,
        is_premium=user.is_premium,
    )
