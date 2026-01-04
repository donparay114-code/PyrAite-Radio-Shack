"""Add Google OAuth fields to users table

Revision ID: 004
Revises: 003
Create Date: 2026-01-03

Adds email and google_id columns to support Google OAuth authentication.
Makes telegram_id nullable to allow Google-only users.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch_alter_table for SQLite compatibility
    with op.batch_alter_table("users", schema=None) as batch_op:
        # Add email column for Google OAuth
        batch_op.add_column(sa.Column("email", sa.String(255), nullable=True))
        batch_op.create_index("ix_users_email", ["email"], unique=True)

        # Add google_id column for Google OAuth
        batch_op.add_column(sa.Column("google_id", sa.String(255), nullable=True))
        batch_op.create_index("ix_users_google_id", ["google_id"], unique=True)

        # Make telegram_id nullable for Google-only users
        batch_op.alter_column(
            "telegram_id",
            existing_type=sa.BigInteger(),
            nullable=True,
        )


def downgrade() -> None:
    # Revert changes using batch_op
    with op.batch_alter_table("users", schema=None) as batch_op:
        # Restore telegram_id as NOT NULL
        batch_op.alter_column(
            "telegram_id",
            existing_type=sa.BigInteger(),
            nullable=False,
        )

        # Drop google_id column and index
        batch_op.drop_index("ix_users_google_id")
        batch_op.drop_column("google_id")

        # Drop email column and index
        batch_op.drop_index("ix_users_email")
        batch_op.drop_column("email")
