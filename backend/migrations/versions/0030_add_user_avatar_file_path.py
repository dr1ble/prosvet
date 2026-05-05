"""add user avatar file path

Revision ID: 0030_add_user_avatar_file_path
Revises: 0029_add_user_avatar_key
Create Date: 2026-05-05 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0030_add_user_avatar_file_path"
down_revision: str | None = "0029_add_user_avatar_key"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_file_path", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_file_path")
