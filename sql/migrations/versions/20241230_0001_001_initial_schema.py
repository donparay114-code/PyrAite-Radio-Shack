"""Initial database schema for PYrte Radio Shack.

Revision ID: 001
Revises: None
Create Date: 2024-12-30

Creates all core tables:
- users: User accounts with reputation system
- songs: Generated song metadata
- radio_queue: Pending song requests
- radio_history: Broadcast history
- votes: User votes on queue items
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial database schema."""

    # Users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("telegram_username", sa.String(255), nullable=True),
        sa.Column("telegram_first_name", sa.String(255), nullable=True),
        sa.Column("telegram_last_name", sa.String(255), nullable=True),
        sa.Column("reputation_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("total_requests", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("successful_requests", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_requests", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_upvotes_received", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_downvotes_received", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_upvotes_given", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_downvotes_given", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_banned", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("is_premium", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("ban_reason", sa.Text(), nullable=True),
        sa.Column("banned_at", sa.DateTime(), nullable=True),
        sa.Column("banned_until", sa.DateTime(), nullable=True),
        sa.Column("last_request_at", sa.DateTime(), nullable=True),
        sa.Column("last_vote_at", sa.DateTime(), nullable=True),
        sa.Column("last_active_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("telegram_id", name=op.f("uq_users_telegram_id")),
    )
    op.create_index(op.f("ix_users_telegram_id"), "users", ["telegram_id"], unique=True)

    # Songs table
    op.create_table(
        "songs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("suno_job_id", sa.String(255), nullable=True),
        sa.Column("suno_status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("artist", sa.String(255), nullable=False, server_default="AI Radio"),
        sa.Column("original_prompt", sa.Text(), nullable=True),
        sa.Column("enhanced_prompt", sa.Text(), nullable=True),
        sa.Column("style_prompt", sa.Text(), nullable=True),
        sa.Column("lyrics", sa.Text(), nullable=True),
        sa.Column("genre", sa.String(100), nullable=True),
        sa.Column("subgenre", sa.String(100), nullable=True),
        sa.Column("mood", sa.String(100), nullable=True),
        sa.Column("energy", sa.String(50), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("bpm", sa.Integer(), nullable=True),
        sa.Column("key", sa.String(10), nullable=True),
        sa.Column("is_instrumental", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("audio_url", sa.String(1000), nullable=True),
        sa.Column("local_file_path", sa.String(500), nullable=True),
        sa.Column("file_size_bytes", sa.Integer(), nullable=True),
        sa.Column("audio_format", sa.String(10), nullable=False, server_default="mp3"),
        sa.Column("lufs_level", sa.Float(), nullable=True),
        sa.Column("peak_db", sa.Float(), nullable=True),
        sa.Column("is_normalized", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("generation_started_at", sa.DateTime(), nullable=True),
        sa.Column("generation_completed_at", sa.DateTime(), nullable=True),
        sa.Column("downloaded_at", sa.DateTime(), nullable=True),
        sa.Column("play_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_upvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_downvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_approved", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("moderation_notes", sa.Text(), nullable=True),
        sa.Column("flagged_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_songs")),
        sa.UniqueConstraint("suno_job_id", name=op.f("uq_songs_suno_job_id")),
    )
    op.create_index(op.f("ix_songs_suno_job_id"), "songs", ["suno_job_id"], unique=True)

    # Radio Queue table
    op.create_table(
        "radio_queue",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("telegram_user_id", sa.BigInteger(), nullable=True),
        sa.Column("telegram_message_id", sa.BigInteger(), nullable=True),
        sa.Column("song_id", sa.Integer(), nullable=True),
        sa.Column("original_prompt", sa.Text(), nullable=False),
        sa.Column("enhanced_prompt", sa.Text(), nullable=True),
        sa.Column("genre_hint", sa.String(100), nullable=True),
        sa.Column("is_instrumental", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("suno_job_id", sa.String(255), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_retries", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("base_priority", sa.Float(), nullable=False, server_default="100.0"),
        sa.Column("priority_score", sa.Float(), nullable=False, server_default="100.0"),
        sa.Column("is_priority_boost", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("priority_boost_reason", sa.String(255), nullable=True),
        sa.Column("upvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("downvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("requested_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("queued_at", sa.DateTime(), nullable=True),
        sa.Column("generation_started_at", sa.DateTime(), nullable=True),
        sa.Column("generation_completed_at", sa.DateTime(), nullable=True),
        sa.Column("broadcast_started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("is_moderated", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("moderation_passed", sa.Boolean(), nullable=True),
        sa.Column("moderation_reason", sa.Text(), nullable=True),
        sa.Column("has_dj_intro", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("dj_intro_path", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_radio_queue")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_radio_queue_user_id_users")),
        sa.ForeignKeyConstraint(["song_id"], ["songs.id"], name=op.f("fk_radio_queue_song_id_songs")),
    )
    op.create_index(op.f("ix_radio_queue_user_id"), "radio_queue", ["user_id"])
    op.create_index(op.f("ix_radio_queue_telegram_user_id"), "radio_queue", ["telegram_user_id"])
    op.create_index(op.f("ix_radio_queue_song_id"), "radio_queue", ["song_id"])
    op.create_index(op.f("ix_radio_queue_status"), "radio_queue", ["status"])
    op.create_index(op.f("ix_radio_queue_priority_score"), "radio_queue", ["priority_score"])

    # Radio History table
    op.create_table(
        "radio_history",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("song_id", sa.Integer(), nullable=False),
        sa.Column("queue_id", sa.Integer(), nullable=True),
        sa.Column("played_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("duration_played_seconds", sa.Float(), nullable=True),
        sa.Column("broadcast_file_path", sa.String(500), nullable=True),
        sa.Column("stream_mount", sa.String(100), nullable=True),
        sa.Column("requester_telegram_id", sa.BigInteger(), nullable=True),
        sa.Column("requester_username", sa.String(255), nullable=True),
        sa.Column("song_title", sa.String(500), nullable=True),
        sa.Column("song_artist", sa.String(255), nullable=True),
        sa.Column("song_genre", sa.String(100), nullable=True),
        sa.Column("had_dj_intro", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("dj_intro_text", sa.Text(), nullable=True),
        sa.Column("listener_count", sa.Integer(), nullable=True),
        sa.Column("upvotes_during_play", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("downvotes_during_play", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skips_requested", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_radio_history")),
        sa.ForeignKeyConstraint(["song_id"], ["songs.id"], name=op.f("fk_radio_history_song_id_songs")),
    )
    op.create_index(op.f("ix_radio_history_song_id"), "radio_history", ["song_id"])
    op.create_index(op.f("ix_radio_history_queue_id"), "radio_history", ["queue_id"])
    op.create_index(op.f("ix_radio_history_played_at"), "radio_history", ["played_at"])

    # Votes table
    op.create_table(
        "votes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("telegram_user_id", sa.BigInteger(), nullable=True),
        sa.Column("queue_item_id", sa.Integer(), nullable=False),
        sa.Column("vote_type", sa.String(20), nullable=False),
        sa.Column("voted_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("previous_vote_type", sa.String(20), nullable=True),
        sa.Column("changed_at", sa.DateTime(), nullable=True),
        sa.Column("source", sa.String(50), nullable=False, server_default="telegram"),
        sa.Column("telegram_callback_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_votes")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_votes_user_id_users")),
        sa.ForeignKeyConstraint(["queue_item_id"], ["radio_queue.id"], name=op.f("fk_votes_queue_item_id_radio_queue")),
        sa.UniqueConstraint("user_id", "queue_item_id", name="uq_votes_user_queue"),
    )
    op.create_index(op.f("ix_votes_user_id"), "votes", ["user_id"])
    op.create_index(op.f("ix_votes_telegram_user_id"), "votes", ["telegram_user_id"])
    op.create_index(op.f("ix_votes_queue_item_id"), "votes", ["queue_item_id"])


def downgrade() -> None:
    """Drop all tables in reverse order."""
    op.drop_table("votes")
    op.drop_table("radio_history")
    op.drop_table("radio_queue")
    op.drop_table("songs")
    op.drop_table("users")
