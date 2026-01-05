"""Add anon_session_id to chat_messages table

Revision ID: 007
Revises: 006
Create Date: 2026-01-05

Adds anon_session_id column to chat_messages table for persistent
anonymous user identity across messages.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch_alter_table for SQLite compatibility
    with op.batch_alter_table("chat_messages", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("anon_session_id", sa.String(100), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("chat_messages", schema=None) as batch_op:
        batch_op.drop_column("anon_session_id")
