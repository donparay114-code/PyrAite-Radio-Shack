
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from google.oauth2 import id_token
from google.auth.transport import requests
import os

from src.models import User, get_async_session
from src.utils.config import settings

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

router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

class GoogleLoginRequest(BaseModel):
    id_token: str

@router.post("/login", response_model=AuthResponse)
async def google_login(
    request: GoogleLoginRequest,
    session: AsyncSession = Depends(get_async_session)
):
    try:
        # Verify token
        id_info = id_token.verify_oauth2_token(request.id_token, requests.Request(), GOOGLE_CLIENT_ID)
        
        email = id_info.get("email")
        google_id = id_info.get("sub")
        name = id_info.get("name", "")
        picture = id_info.get("picture")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not found in token")

        # Find or create user
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        is_new = False
        if not user:
            # Check by google_id
            result = await session.execute(select(User).where(User.google_id == google_id))
            user = result.scalar_one_or_none()
            
        if not user:
            is_new = True
            user = User(
                email=email,
                google_id=google_id,
                telegram_first_name=name, # store display name here for now
                is_premium=False
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
            reputation_score=user.reputation_score
        )

    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google Token")

class LinkTelegramRequest(BaseModel):
    telegram_username: str

@router.post("/link-telegram")
async def link_telegram(
    request: LinkTelegramRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Link a Telegram username to the current authenticated user.
    """
    # Simply update the current user
    # Note: As mentioned, real verification would require extra steps.
    
    user.telegram_username = request.telegram_username.replace("@", "")
    session.add(user) # Ensure it's in session
    await session.commit()
    
@router.get("/me", response_model=AuthResponse)
async def get_me(
    user: User = Depends(get_current_user)
):
    """
    Get current user profile using JWT.
    """
    return AuthResponse(
        user_id=user.id,
        display_name=user.display_name,
        is_new_user=False,
        token="", # Don't need to return token here if it's already in the header
        telegram_username=user.telegram_username,
        tier=user.tier.value if user.tier else "new",
        reputation_score=user.reputation_score
    )
