"""add user account settings

Revision ID: 0028_add_user_account_settings
Revises: 0027_add_support_policy_rules
Create Date: 2026-04-29 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0028_add_user_account_settings"
down_revision: str | None = "0027_add_support_policy_rules"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("learning_reminders_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "users",
        sa.Column("security_alerts_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "users",
        sa.Column("profile_visible", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("users", "learning_reminders_enabled", server_default=None)
    op.alter_column("users", "security_alerts_enabled", server_default=None)
    op.alter_column("users", "profile_visible", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "profile_visible")
    op.drop_column("users", "security_alerts_enabled")
    op.drop_column("users", "learning_reminders_enabled")
