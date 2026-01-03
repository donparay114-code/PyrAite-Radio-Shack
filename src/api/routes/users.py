"""User management API routes."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import User, get_async_session
from src.models.history import RadioHistory

router = APIRouter()


# Request/Response models
class UserCreate(BaseModel):
    """Create a new user."""

    telegram_id: int
    telegram_username: Optional[str] = None
    telegram_first_name: Optional[str] = None
    telegram_last_name: Optional[str] = None


class UserUpdate(BaseModel):
    """Update user fields."""

    telegram_username: Optional[str] = None
    telegram_first_name: Optional[str] = None
    telegram_last_name: Optional[str] = None
    is_premium: Optional[bool] = None


class UserResponse(BaseModel):
    """User response model."""

    id: int
    telegram_id: int
    telegram_username: Optional[str]
    display_name: str
    reputation_score: float
    tier: str
    total_requests: int
    successful_requests: int
    total_upvotes_received: int
    total_downvotes_received: int
    is_banned: bool
    is_premium: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserStatsResponse(BaseModel):
    """User statistics response."""

    total_users: int
    active_today: int
    banned_users: int
    premium_users: int
    avg_reputation: float


class LeaderboardEntry(BaseModel):
    """Leaderboard entry."""

    rank: int
    user_id: int
    display_name: str
    reputation_score: float
    tier: str
    total_requests: int


class RecentAirplayEntry(BaseModel):
    """Entry in recent airplay history."""

    history_id: int
    song_title: Optional[str]
    song_artist: Optional[str]
    song_genre: Optional[str]
    played_at: datetime
    duration_played_seconds: Optional[float]
    upvotes_during_play: int
    downvotes_during_play: int
    listener_count: Optional[int]


class UserProfileStats(BaseModel):
    """User profile statistics."""

    total_requests: int
    successful_requests: int
    failed_requests: int
    success_rate: float
    total_upvotes_received: int
    total_downvotes_received: int
    total_upvotes_given: int
    total_downvotes_given: int
    vote_ratio: float


class UserProfileResponse(BaseModel):
    """Comprehensive user profile response."""

    # Basic user info
    id: int
    telegram_id: Optional[int]
    telegram_username: Optional[str]
    email: Optional[str]
    display_name: str
    reputation_score: float
    tier: str
    is_banned: bool
    is_premium: bool
    created_at: datetime
    last_active_at: Optional[datetime]

    # Stats
    stats: UserProfileStats

    # Rank position (1-based)
    rank: int

    # Recent airplay history
    recent_airplay: list[RecentAirplayEntry]

    class Config:
        from_attributes = True


@router.get("/", response_model=list[UserResponse])
async def list_users(
    tier: Optional[str] = Query(None, description="Filter by tier"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_async_session),
):
    """List users, ordered by reputation."""
    query = select(User).order_by(User.reputation_score.desc())

    if tier:
        # Filter by tier based on reputation ranges
        tier_ranges = {
            "new": (0, 99),
            "regular": (100, 499),
            "trusted": (500, 999),
            "vip": (1000, 4999),
            "elite": (5000, float("inf")),
        }
        if tier.lower() in tier_ranges:
            min_rep, max_rep = tier_ranges[tier.lower()]
            query = query.where(User.reputation_score >= min_rep)
            if max_rep != float("inf"):
                query = query.where(User.reputation_score <= max_rep)

    query = query.offset(offset).limit(limit)
    result = await session.execute(query)
    users = result.scalars().all()

    # Convert to response with computed fields
    return [
        UserResponse(
            id=u.id,
            telegram_id=u.telegram_id,
            telegram_username=u.telegram_username,
            display_name=u.display_name,
            reputation_score=u.reputation_score,
            tier=u.tier.value,
            total_requests=u.total_requests,
            successful_requests=u.successful_requests,
            total_upvotes_received=u.total_upvotes_received,
            total_downvotes_received=u.total_downvotes_received,
            is_banned=u.is_banned,
            is_premium=u.is_premium,
            created_at=u.created_at,
        )
        for u in users
    ]


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    user_data: UserCreate,
    session: AsyncSession = Depends(get_async_session),
):
    """Create a new user or return existing."""
    # Check if user exists
    existing = await session.execute(
        select(User).where(User.telegram_id == user_data.telegram_id)
    )
    user = existing.scalar_one_or_none()

    if user:
        # Update existing user info
        if user_data.telegram_username:
            user.telegram_username = user_data.telegram_username
        if user_data.telegram_first_name:
            user.telegram_first_name = user_data.telegram_first_name
        if user_data.telegram_last_name:
            user.telegram_last_name = user_data.telegram_last_name
        user.last_active_at = datetime.utcnow()
    else:
        # Create new user
        user = User(
            telegram_id=user_data.telegram_id,
            telegram_username=user_data.telegram_username,
            telegram_first_name=user_data.telegram_first_name,
            telegram_last_name=user_data.telegram_last_name,
        )
        session.add(user)

    await session.flush()
    await session.refresh(user)

    return UserResponse(
        id=user.id,
        telegram_id=user.telegram_id,
        telegram_username=user.telegram_username,
        display_name=user.display_name,
        reputation_score=user.reputation_score,
        tier=user.tier.value,
        total_requests=user.total_requests,
        successful_requests=user.successful_requests,
        total_upvotes_received=user.total_upvotes_received,
        total_downvotes_received=user.total_downvotes_received,
        is_banned=user.is_banned,
        is_premium=user.is_premium,
        created_at=user.created_at,
    )


@router.get("/stats", response_model=UserStatsResponse)
async def get_user_stats(
    session: AsyncSession = Depends(get_async_session),
):
    """Get user statistics."""
    # Total users
    total = await session.execute(select(func.count(User.id)))
    total_users = total.scalar() or 0

    # Active today
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    active = await session.execute(
        select(func.count(User.id)).where(User.last_active_at >= today)
    )
    active_today = active.scalar() or 0

    # Banned users
    banned = await session.execute(
        select(func.count(User.id)).where(User.is_banned == True)  # noqa: E712
    )
    banned_users = banned.scalar() or 0

    # Premium users
    premium = await session.execute(
        select(func.count(User.id)).where(User.is_premium == True)  # noqa: E712
    )
    premium_users = premium.scalar() or 0

    # Average reputation
    avg = await session.execute(select(func.avg(User.reputation_score)))
    avg_reputation = avg.scalar() or 0.0

    return UserStatsResponse(
        total_users=total_users,
        active_today=active_today,
        banned_users=banned_users,
        premium_users=premium_users,
        avg_reputation=float(avg_reputation),
    )


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    limit: int = Query(10, le=100),
    session: AsyncSession = Depends(get_async_session),
):
    """Get top users by reputation."""
    query = (
        select(User)
        .where(User.is_banned == False)  # noqa: E712
        .order_by(User.reputation_score.desc())
        .limit(limit)
    )

    result = await session.execute(query)
    users = result.scalars().all()

    return [
        LeaderboardEntry(
            rank=i + 1,
            user_id=u.id,
            display_name=u.display_name,
            reputation_score=u.reputation_score,
            tier=u.tier.value,
            total_requests=u.total_requests,
        )
        for i, u in enumerate(users)
    ]


@router.get("/telegram/{telegram_id}", response_model=UserResponse)
async def get_user_by_telegram(
    telegram_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    """Get user by Telegram ID."""
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=user.id,
        telegram_id=user.telegram_id,
        telegram_username=user.telegram_username,
        display_name=user.display_name,
        reputation_score=user.reputation_score,
        tier=user.tier.value,
        total_requests=user.total_requests,
        successful_requests=user.successful_requests,
        total_upvotes_received=user.total_upvotes_received,
        total_downvotes_received=user.total_downvotes_received,
        is_banned=user.is_banned,
        is_premium=user.is_premium,
        created_at=user.created_at,
    )


@router.get("/{user_id}/profile", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get comprehensive user profile with stats, rank, and recent airplay history.

    Returns:
        - Basic user info
        - Stats: total_requests, successful_requests, votes received/given, etc.
        - Rank position based on reputation score
        - Recent airplay history (last 10 plays)
    """
    # Get user
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Calculate rank position (count users with higher reputation)
    rank_query = await session.execute(
        select(func.count(User.id)).where(
            User.reputation_score > user.reputation_score,
            User.is_banned == False,  # noqa: E712
        )
    )
    users_ahead = rank_query.scalar() or 0
    rank = users_ahead + 1  # 1-based rank

    # Get recent airplay history (last 10 plays for this user)
    airplay_query = (
        select(RadioHistory)
        .where(RadioHistory.requester_telegram_id == user.telegram_id)
        .order_by(RadioHistory.played_at.desc())
        .limit(10)
    )
    airplay_result = await session.execute(airplay_query)
    airplay_entries = airplay_result.scalars().all()

    # Build recent airplay list
    recent_airplay = [
        RecentAirplayEntry(
            history_id=entry.id,
            song_title=entry.song_title,
            song_artist=entry.song_artist,
            song_genre=entry.song_genre,
            played_at=entry.played_at,
            duration_played_seconds=entry.duration_played_seconds,
            upvotes_during_play=entry.upvotes_during_play,
            downvotes_during_play=entry.downvotes_during_play,
            listener_count=entry.listener_count,
        )
        for entry in airplay_entries
    ]

    # Build stats
    stats = UserProfileStats(
        total_requests=user.total_requests,
        successful_requests=user.successful_requests,
        failed_requests=user.failed_requests,
        success_rate=user.success_rate,
        total_upvotes_received=user.total_upvotes_received,
        total_downvotes_received=user.total_downvotes_received,
        total_upvotes_given=user.total_upvotes_given,
        total_downvotes_given=user.total_downvotes_given,
        vote_ratio=user.vote_ratio,
    )

    return UserProfileResponse(
        id=user.id,
        telegram_id=user.telegram_id,
        telegram_username=user.telegram_username,
        email=user.email,
        display_name=user.display_name,
        reputation_score=user.reputation_score,
        tier=user.tier.value,
        is_banned=user.is_banned,
        is_premium=user.is_premium,
        created_at=user.created_at,
        last_active_at=user.last_active_at,
        stats=stats,
        rank=rank,
        recent_airplay=recent_airplay,
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    """Get user by ID."""
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=user.id,
        telegram_id=user.telegram_id,
        telegram_username=user.telegram_username,
        display_name=user.display_name,
        reputation_score=user.reputation_score,
        tier=user.tier.value,
        total_requests=user.total_requests,
        successful_requests=user.successful_requests,
        total_upvotes_received=user.total_upvotes_received,
        total_downvotes_received=user.total_downvotes_received,
        is_banned=user.is_banned,
        is_premium=user.is_premium,
        created_at=user.created_at,
    )


@router.post("/{user_id}/ban")
async def ban_user(
    user_id: int,
    reason: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_async_session),
):
    """Ban a user."""
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_banned = True
    user.ban_reason = reason
    user.banned_at = datetime.utcnow()

    return {"message": f"User {user_id} banned", "reason": reason}


@router.post("/{user_id}/unban")
async def unban_user(
    user_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    """Unban a user."""
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_banned = False
    user.ban_reason = None
    user.banned_at = None
    user.banned_until = None

    return {"message": f"User {user_id} unbanned"}
