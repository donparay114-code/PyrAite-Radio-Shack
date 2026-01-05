"""Add warning system fields to users table

Revision ID: 006
Revises: 0f698de22810
Create Date: 2026-01-05

Adds warning_count, last_warning_at, and last_warning_reason columns
to support the warning system before auto-banning users.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "006"
down_revision: Union[str, None] = "0f698de22810"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch_alter_table for SQLite compatibility
    with op.batch_alter_table("users", schema=None) as batch_op:
        # Add warning_count column (default 0)
        batch_op.add_column(
            sa.Column("warning_count", sa.Integer(), nullable=False, server_default="0")
        )
        # Add last_warning_at column
        batch_op.add_column(
            sa.Column("last_warning_at", sa.DateTime(), nullable=True)
        )
        # Add last_warning_reason column
        batch_op.add_column(
            sa.Column("last_warning_reason", sa.Text(), nullable=True)
        )


def downgrade() -> None:
    # Revert changes using batch_op
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("last_warning_reason")
        batch_op.drop_column("last_warning_at")
        batch_op.drop_column("warning_count")
