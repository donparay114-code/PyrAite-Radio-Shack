"""Songs management API routes."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Song, SunoStatus, get_async_session

router = APIRouter()


# Response models
class SongResponse(BaseModel):
    """Song response model."""

    id: int
    title: Optional[str]
    artist: str
    genre: Optional[str]
    duration_formatted: str
    is_instrumental: bool
    play_count: int
    vote_score: int
    suno_status: str
    is_approved: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SongDetailResponse(BaseModel):
    """Detailed song response."""

    id: int
    suno_job_id: Optional[str]
    title: Optional[str]
    artist: str
    original_prompt: Optional[str]
    enhanced_prompt: Optional[str]
    lyrics: Optional[str]
    genre: Optional[str]
    subgenre: Optional[str]
    mood: Optional[str]
    energy: Optional[str]
    duration_seconds: Optional[float]
    duration_formatted: str
    bpm: Optional[int]
    key: Optional[str]
    is_instrumental: bool
    audio_url: Optional[str]
    local_file_path: Optional[str]
    play_count: int
    total_upvotes: int
    total_downvotes: int
    vote_score: int
    suno_status: str
    is_approved: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SongStatsResponse(BaseModel):
    """Song statistics."""

    total_songs: int
    total_plays: int
    approved_songs: int
    pending_songs: int
    avg_duration_seconds: float
    top_genre: Optional[str]


@router.get("/", response_model=list[SongResponse])
async def list_songs(
    genre: Optional[str] = Query(None, description="Filter by genre"),
    status: Optional[str] = Query(None, description="Filter by Suno status"),
    approved_only: bool = Query(True, description="Only show approved songs"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_async_session),
):
    """List songs with optional filtering."""
    query = select(Song).order_by(Song.created_at.desc())

    if genre:
        query = query.where(Song.genre == genre)
    if status:
        query = query.where(Song.suno_status == status)
    if approved_only:
        query = query.where(Song.is_approved == True)  # noqa: E712

    query = query.offset(offset).limit(limit)
    result = await session.execute(query)
    songs = result.scalars().all()

    return [
        SongResponse(
            id=s.id,
            title=s.title,
            artist=s.artist,
            genre=s.genre,
            duration_formatted=s.duration_formatted,
            is_instrumental=s.is_instrumental,
            play_count=s.play_count,
            vote_score=s.vote_score,
            suno_status=s.suno_status,
            is_approved=s.is_approved,
            created_at=s.created_at,
        )
        for s in songs
    ]


@router.get("/stats", response_model=SongStatsResponse)
async def get_song_stats(
    session: AsyncSession = Depends(get_async_session),
):
    """Get song statistics."""
    # Total songs
    total = await session.execute(select(func.count(Song.id)))
    total_songs = total.scalar() or 0

    # Total plays
    plays = await session.execute(select(func.sum(Song.play_count)))
    total_plays = plays.scalar() or 0

    # Approved songs
    approved = await session.execute(
        select(func.count(Song.id)).where(Song.is_approved == True)  # noqa: E712
    )
    approved_songs = approved.scalar() or 0

    # Pending songs
    pending = await session.execute(
        select(func.count(Song.id)).where(Song.suno_status == SunoStatus.PENDING.value)
    )
    pending_songs = pending.scalar() or 0

    # Average duration
    avg_dur = await session.execute(
        select(func.avg(Song.duration_seconds)).where(Song.duration_seconds.isnot(None))
    )
    avg_duration = avg_dur.scalar() or 0.0

    # Top genre (most common)
    genre_query = (
        select(Song.genre, func.count(Song.id).label("count"))
        .where(Song.genre.isnot(None))
        .group_by(Song.genre)
        .order_by(func.count(Song.id).desc())
        .limit(1)
    )
    genre_result = await session.execute(genre_query)
    top_genre_row = genre_result.first()
    top_genre = top_genre_row[0] if top_genre_row else None

    return SongStatsResponse(
        total_songs=total_songs,
        total_plays=total_plays,
        approved_songs=approved_songs,
        pending_songs=pending_songs,
        avg_duration_seconds=float(avg_duration),
        top_genre=top_genre,
    )


@router.get("/genres")
async def list_genres(
    session: AsyncSession = Depends(get_async_session),
):
    """Get list of all genres with counts."""
    query = (
        select(Song.genre, func.count(Song.id).label("count"))
        .where(Song.genre.isnot(None))
        .group_by(Song.genre)
        .order_by(func.count(Song.id).desc())
    )

    result = await session.execute(query)
    genres = result.fetchall()

    return [{"genre": g[0], "count": g[1]} for g in genres]


@router.get("/top", response_model=list[SongResponse])
async def get_top_songs(
    by: str = Query("plays", description="Sort by: plays, votes, recent"),
    limit: int = Query(10, le=50),
    session: AsyncSession = Depends(get_async_session),
):
    """Get top songs by various metrics."""
    query = select(Song).where(Song.is_approved == True)  # noqa: E712

    if by == "plays":
        query = query.order_by(Song.play_count.desc())
    elif by == "votes":
        query = query.order_by((Song.total_upvotes - Song.total_downvotes).desc())
    else:  # recent
        query = query.order_by(Song.created_at.desc())

    query = query.limit(limit)
    result = await session.execute(query)
    songs = result.scalars().all()

    return [
        SongResponse(
            id=s.id,
            title=s.title,
            artist=s.artist,
            genre=s.genre,
            duration_formatted=s.duration_formatted,
            is_instrumental=s.is_instrumental,
            play_count=s.play_count,
            vote_score=s.vote_score,
            suno_status=s.suno_status,
            is_approved=s.is_approved,
            created_at=s.created_at,
        )
        for s in songs
    ]


@router.get("/{song_id}", response_model=SongDetailResponse)
async def get_song(
    song_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    """Get detailed song information."""
    result = await session.execute(select(Song).where(Song.id == song_id))
    song = result.scalar_one_or_none()

    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    return SongDetailResponse(
        id=song.id,
        suno_job_id=song.suno_job_id,
        title=song.title,
        artist=song.artist,
        original_prompt=song.original_prompt,
        enhanced_prompt=song.enhanced_prompt,
        lyrics=song.lyrics,
        genre=song.genre,
        subgenre=song.subgenre,
        mood=song.mood,
        energy=song.energy,
        duration_seconds=song.duration_seconds,
        duration_formatted=song.duration_formatted,
        bpm=song.bpm,
        key=song.key,
        is_instrumental=song.is_instrumental,
        audio_url=song.audio_url,
        local_file_path=song.local_file_path,
        play_count=song.play_count,
        total_upvotes=song.total_upvotes,
        total_downvotes=song.total_downvotes,
        vote_score=song.vote_score,
        suno_status=song.suno_status,
        is_approved=song.is_approved,
        created_at=song.created_at,
    )


@router.post("/{song_id}/approve")
async def approve_song(
    song_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    """Approve a song for broadcast."""
    result = await session.execute(select(Song).where(Song.id == song_id))
    song = result.scalar_one_or_none()

    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    song.is_approved = True
    song.moderation_notes = None
    song.flagged_at = None

    return {"message": f"Song {song_id} approved"}


@router.post("/{song_id}/reject")
async def reject_song(
    song_id: int,
    reason: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_async_session),
):
    """Reject a song from broadcast."""
    result = await session.execute(select(Song).where(Song.id == song_id))
    song = result.scalar_one_or_none()

    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    song.is_approved = False
    song.moderation_notes = reason
    song.flagged_at = datetime.utcnow()

    return {"message": f"Song {song_id} rejected", "reason": reason}
