"""add user avatar key

Revision ID: 0029_add_user_avatar_key
Revises: 0028_add_user_account_settings
Create Date: 2026-04-29 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0029_add_user_avatar_key"
down_revision: str | None = "0028_add_user_account_settings"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_key", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_key")
