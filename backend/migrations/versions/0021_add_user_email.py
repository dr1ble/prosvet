"""add user email

Revision ID: 0021_add_user_email
Revises: 0020_add_admin_audit_logs
Create Date: 2026-04-24 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0021_add_user_email"
down_revision: Union[str, None] = "0020_add_admin_audit_logs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email", sa.String(length=255), nullable=True))
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_column("users", "email")
