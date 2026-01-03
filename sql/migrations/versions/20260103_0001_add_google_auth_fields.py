"""Add Google OAuth fields to users table

Revision ID: 004
Revises: 003
Create Date: 2026-01-03

Adds email and google_id columns to support Google OAuth authentication.
Makes telegram_id nullable to allow Google-only users.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email column for Google OAuth
    op.add_column(
        "users",
        sa.Column("email", sa.String(255), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # Add google_id column for Google OAuth
    op.add_column(
        "users",
        sa.Column("google_id", sa.String(255), nullable=True),
    )
    op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)

    # Make telegram_id nullable for Google-only users
    op.alter_column(
        "users",
        "telegram_id",
        existing_type=sa.BigInteger(),
        nullable=True,
    )


def downgrade() -> None:
    # Drop indexes first
    op.drop_index("ix_users_google_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")

    # Remove Google OAuth columns
    op.drop_column("users", "google_id")
    op.drop_column("users", "email")

    # Restore telegram_id as NOT NULL (only if all rows have telegram_id)
    op.alter_column(
        "users",
        "telegram_id",
        existing_type=sa.BigInteger(),
        nullable=False,
    )
