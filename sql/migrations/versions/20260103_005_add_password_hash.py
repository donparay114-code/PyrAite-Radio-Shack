"""Add password_hash field to users table

Revision ID: 005
Revises: 004
Create Date: 2026-01-03

Adds password_hash column to support email/password authentication.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch_alter_table for SQLite compatibility
    with op.batch_alter_table("users", schema=None) as batch_op:
        # Add password_hash column for email/password authentication
        batch_op.add_column(sa.Column("password_hash", sa.String(255), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("password_hash")
