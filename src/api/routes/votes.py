"""Voting API routes."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Vote, VoteType, RadioQueue, User, get_async_session

router = APIRouter()


# Request/Response models
class VoteCreate(BaseModel):
    """Create a vote."""

    telegram_user_id: int
    queue_item_id: int
    vote_type: str  # "upvote" or "downvote"


class VoteResponse(BaseModel):
    """Vote response."""

    id: int
    user_id: int
    queue_item_id: int
    vote_type: str
    voted_at: datetime

    class Config:
        from_attributes = True


class VoteResult(BaseModel):
    """Result of a vote action."""

    success: bool
    message: str
    queue_item_id: int
    new_upvotes: int
    new_downvotes: int
    vote_score: int


class VoteStatsResponse(BaseModel):
    """Vote statistics."""

    total_votes: int
    total_upvotes: int
    total_downvotes: int
    votes_today: int


@router.get("/", response_model=list[VoteResponse])
async def list_votes(
    vote_type: str | None = Query(None, description="Filter by vote type (upvote/downvote)"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_async_session),
):
    """
    List all votes with pagination and optional filtering.

    Returns votes ordered by most recent first.
    """
    query = select(Vote).order_by(Vote.voted_at.desc())

    if vote_type:
        if vote_type not in [VoteType.UPVOTE.value, VoteType.DOWNVOTE.value]:
            raise HTTPException(status_code=400, detail="Invalid vote type filter")
        query = query.where(Vote.vote_type == vote_type)

    query = query.offset(offset).limit(limit)
    result = await session.execute(query)
    votes = result.scalars().all()

    return [
        VoteResponse(
            id=v.id,
            user_id=v.user_id,
            queue_item_id=v.queue_item_id,
            vote_type=v.vote_type,
            voted_at=v.voted_at,
        )
        for v in votes
    ]


@router.post("/", response_model=VoteResult)
async def cast_vote(
    vote_data: VoteCreate,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Cast a vote on a queue item.

    If user already voted, this will flip their vote.
    """
    # Validate vote type
    if vote_data.vote_type not in [VoteType.UPVOTE.value, VoteType.DOWNVOTE.value]:
        raise HTTPException(status_code=400, detail="Invalid vote type")

    # Get or create user
    user_query = select(User).where(User.telegram_id == vote_data.telegram_user_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        # Create user on the fly
        user = User(telegram_id=vote_data.telegram_user_id)
        session.add(user)
        await session.flush()

    # Check if user is banned
    if user.is_banned:
        raise HTTPException(status_code=403, detail="User is banned")

    # Get queue item
    queue_query = select(RadioQueue).where(RadioQueue.id == vote_data.queue_item_id)
    queue_result = await session.execute(queue_query)
    queue_item = queue_result.scalar_one_or_none()

    if not queue_item:
        raise HTTPException(status_code=404, detail="Queue item not found")

    # Check for existing vote
    existing_query = select(Vote).where(
        Vote.user_id == user.id,
        Vote.queue_item_id == vote_data.queue_item_id,
    )
    existing_result = await session.execute(existing_query)
    existing_vote = existing_result.scalar_one_or_none()

    message = ""

    if existing_vote:
        if existing_vote.vote_type == vote_data.vote_type:
            # Same vote - remove it (toggle off)
            if existing_vote.is_upvote:
                queue_item.upvotes -= 1
                user.total_upvotes_given -= 1
            else:
                queue_item.downvotes -= 1
                user.total_downvotes_given -= 1

            await session.delete(existing_vote)
            message = "Vote removed"
        else:
            # Different vote - flip it
            if existing_vote.is_upvote:
                # Was upvote, now downvote
                queue_item.upvotes -= 1
                queue_item.downvotes += 1
                user.total_upvotes_given -= 1
                user.total_downvotes_given += 1
            else:
                # Was downvote, now upvote
                queue_item.downvotes -= 1
                queue_item.upvotes += 1
                user.total_downvotes_given -= 1
                user.total_upvotes_given += 1

            existing_vote.flip_vote()
            message = f"Vote changed to {vote_data.vote_type}"
    else:
        # New vote
        vote = Vote(
            user_id=user.id,
            telegram_user_id=vote_data.telegram_user_id,
            queue_item_id=vote_data.queue_item_id,
            vote_type=vote_data.vote_type,
        )
        session.add(vote)

        if vote_data.vote_type == VoteType.UPVOTE.value:
            queue_item.upvotes += 1
            user.total_upvotes_given += 1
        else:
            queue_item.downvotes += 1
            user.total_downvotes_given += 1

        message = f"Vote cast: {vote_data.vote_type}"

    # Update user last vote time
    user.last_vote_at = datetime.utcnow()
    user.last_active_at = datetime.utcnow()

    # Update queue item priority
    queue_item.update_priority(user.reputation_score if queue_item.user else 0)

    await session.flush()

    return VoteResult(
        success=True,
        message=message,
        queue_item_id=vote_data.queue_item_id,
        new_upvotes=queue_item.upvotes,
        new_downvotes=queue_item.downvotes,
        vote_score=queue_item.vote_score,
    )


@router.get("/stats", response_model=VoteStatsResponse)
async def get_vote_stats(
    session: AsyncSession = Depends(get_async_session),
):
    """Get vote statistics."""
    # Total votes
    total = await session.execute(select(func.count(Vote.id)))
    total_votes = total.scalar() or 0

    # Upvotes
    upvotes = await session.execute(
        select(func.count(Vote.id)).where(Vote.vote_type == VoteType.UPVOTE.value)
    )
    total_upvotes = upvotes.scalar() or 0

    # Downvotes
    downvotes = await session.execute(
        select(func.count(Vote.id)).where(Vote.vote_type == VoteType.DOWNVOTE.value)
    )
    total_downvotes = downvotes.scalar() or 0

    # Votes today
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_votes = await session.execute(
        select(func.count(Vote.id)).where(Vote.voted_at >= today)
    )
    votes_today = today_votes.scalar() or 0

    return VoteStatsResponse(
        total_votes=total_votes,
        total_upvotes=total_upvotes,
        total_downvotes=total_downvotes,
        votes_today=votes_today,
    )


@router.get("/queue/{queue_item_id}", response_model=list[VoteResponse])
async def get_votes_for_queue_item(
    queue_item_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    """Get all votes for a queue item."""
    query = select(Vote).where(Vote.queue_item_id == queue_item_id)
    result = await session.execute(query)
    votes = result.scalars().all()

    return [
        VoteResponse(
            id=v.id,
            user_id=v.user_id,
            queue_item_id=v.queue_item_id,
            vote_type=v.vote_type,
            voted_at=v.voted_at,
        )
        for v in votes
    ]


@router.get("/user/{telegram_user_id}", response_model=list[VoteResponse])
async def get_user_votes(
    telegram_user_id: int,
    limit: int = Query(50, le=100),
    session: AsyncSession = Depends(get_async_session),
):
    """Get all votes by a user."""
    query = (
        select(Vote)
        .where(Vote.telegram_user_id == telegram_user_id)
        .order_by(Vote.voted_at.desc())
        .limit(limit)
    )
    result = await session.execute(query)
    votes = result.scalars().all()

    return [
        VoteResponse(
            id=v.id,
            user_id=v.user_id,
            queue_item_id=v.queue_item_id,
            vote_type=v.vote_type,
            voted_at=v.voted_at,
        )
        for v in votes
    ]
