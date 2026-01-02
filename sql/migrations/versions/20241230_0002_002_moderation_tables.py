"""Add moderation tables and user moderation fields.

Revision ID: 002
Revises: 001
Create Date: 2024-12-30

Creates moderation infrastructure:
- banned_words: Local content blocklist
- moderation_logs: Audit trail for moderation actions
- user_violations: Track user violations and timeouts
- Adds moderation fields to users table
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create moderation tables and add user moderation fields."""

    # Add moderation columns to users table
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("users", sa.Column("daily_request_limit", sa.Integer(), nullable=False, server_default="10"))
    op.add_column("users", sa.Column("timeout_until", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("moderation_flags", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("warnings_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("requests_today", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("requests_reset_at", sa.DateTime(), nullable=True))

    # Banned words table for local content blocklist
    op.create_table(
        "banned_words",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("word", sa.String(255), nullable=False),
        sa.Column("severity", sa.String(50), nullable=False, server_default="warning"),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("is_regex", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("added_by_user_id", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_banned_words")),
        sa.UniqueConstraint("word", name=op.f("uq_banned_words_word")),
    )
    op.create_index(op.f("ix_banned_words_word"), "banned_words", ["word"], unique=True)
    op.create_index(op.f("ix_banned_words_severity"), "banned_words", ["severity"])
    op.create_index(op.f("ix_banned_words_is_active"), "banned_words", ["is_active"])

    # Moderation logs table for audit trail
    op.create_table(
        "moderation_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("telegram_user_id", sa.BigInteger(), nullable=True),
        sa.Column("action_type", sa.String(50), nullable=False),
        sa.Column("content_type", sa.String(50), nullable=True),
        sa.Column("original_content", sa.Text(), nullable=True),
        sa.Column("flagged_word", sa.String(255), nullable=True),
        sa.Column("moderation_source", sa.String(50), nullable=False, server_default="system"),
        sa.Column("moderation_score", sa.Float(), nullable=True),
        sa.Column("moderation_categories", sa.JSON(), nullable=True),
        sa.Column("action_taken", sa.String(100), nullable=True),
        sa.Column("penalty_applied", sa.Integer(), nullable=True),
        sa.Column("timeout_duration_hours", sa.Integer(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("is_false_positive", sa.Boolean(), nullable=True),
        sa.Column("queue_item_id", sa.Integer(), nullable=True),
        sa.Column("telegram_message_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_moderation_logs")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_moderation_logs_user_id_users")),
        sa.ForeignKeyConstraint(["queue_item_id"], ["radio_queue.id"], name=op.f("fk_moderation_logs_queue_item_id_radio_queue")),
    )
    op.create_index(op.f("ix_moderation_logs_user_id"), "moderation_logs", ["user_id"])
    op.create_index(op.f("ix_moderation_logs_telegram_user_id"), "moderation_logs", ["telegram_user_id"])
    op.create_index(op.f("ix_moderation_logs_action_type"), "moderation_logs", ["action_type"])
    op.create_index(op.f("ix_moderation_logs_created_at"), "moderation_logs", ["created_at"])

    # User violations table for tracking strikes
    op.create_table(
        "user_violations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("telegram_user_id", sa.BigInteger(), nullable=True),
        sa.Column("violation_type", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(50), nullable=False, server_default="warning"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("triggered_word", sa.String(255), nullable=True),
        sa.Column("original_content", sa.Text(), nullable=True),
        sa.Column("action_taken", sa.String(100), nullable=False),
        sa.Column("warning_number", sa.Integer(), nullable=False),
        sa.Column("resulted_in_timeout", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("timeout_until", sa.DateTime(), nullable=True),
        sa.Column("reputation_penalty", sa.Integer(), nullable=True),
        sa.Column("is_appealed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("appeal_status", sa.String(50), nullable=True),
        sa.Column("appeal_notes", sa.Text(), nullable=True),
        sa.Column("appealed_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_violations")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_user_violations_user_id_users")),
    )
    op.create_index(op.f("ix_user_violations_user_id"), "user_violations", ["user_id"])
    op.create_index(op.f("ix_user_violations_telegram_user_id"), "user_violations", ["telegram_user_id"])
    op.create_index(op.f("ix_user_violations_violation_type"), "user_violations", ["violation_type"])
    op.create_index(op.f("ix_user_violations_created_at"), "user_violations", ["created_at"])

    # Reputation log table for tracking reputation changes
    op.create_table(
        "reputation_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("telegram_user_id", sa.BigInteger(), nullable=True),
        sa.Column("change_amount", sa.Float(), nullable=False),
        sa.Column("previous_score", sa.Float(), nullable=False),
        sa.Column("new_score", sa.Float(), nullable=False),
        sa.Column("reason", sa.String(255), nullable=False),
        sa.Column("reason_type", sa.String(50), nullable=False),
        sa.Column("related_queue_id", sa.Integer(), nullable=True),
        sa.Column("related_song_id", sa.Integer(), nullable=True),
        sa.Column("related_vote_id", sa.Integer(), nullable=True),
        sa.Column("related_violation_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reputation_logs")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_reputation_logs_user_id_users")),
        sa.ForeignKeyConstraint(["related_queue_id"], ["radio_queue.id"], name=op.f("fk_reputation_logs_related_queue_id_radio_queue")),
        sa.ForeignKeyConstraint(["related_song_id"], ["songs.id"], name=op.f("fk_reputation_logs_related_song_id_songs")),
    )
    op.create_index(op.f("ix_reputation_logs_user_id"), "reputation_logs", ["user_id"])
    op.create_index(op.f("ix_reputation_logs_telegram_user_id"), "reputation_logs", ["telegram_user_id"])
    op.create_index(op.f("ix_reputation_logs_reason_type"), "reputation_logs", ["reason_type"])
    op.create_index(op.f("ix_reputation_logs_created_at"), "reputation_logs", ["created_at"])


def downgrade() -> None:
    """Drop moderation tables and remove user moderation fields."""
    op.drop_table("reputation_logs")
    op.drop_table("user_violations")
    op.drop_table("moderation_logs")
    op.drop_table("banned_words")

    op.drop_column("users", "requests_reset_at")
    op.drop_column("users", "requests_today")
    op.drop_column("users", "warnings_count")
    op.drop_column("users", "moderation_flags")
    op.drop_column("users", "timeout_until")
    op.drop_column("users", "daily_request_limit")
    op.drop_column("users", "is_admin")
