"""add login/password fields for users

Revision ID: 0003_add_login_password_auth
Revises: 0002_add_catalog_release_storage
Create Date: 2026-02-08 19:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003_add_login_password_auth"
down_revision: Union[str, None] = "0002_add_catalog_release_storage"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("login", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))
    op.create_index(op.f("ix_users_login"), "users", ["login"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_login"), table_name="users")
    op.drop_column("users", "password_hash")
    op.drop_column("users", "login")
