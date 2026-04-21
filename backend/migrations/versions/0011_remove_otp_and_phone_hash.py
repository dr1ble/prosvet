"""remove otp auth storage and phone hash

Revision ID: 0011_remove_otp_and_phone_hash
Revises: 0010_add_rbac_policy_rules
Create Date: 2026-02-26 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0011_remove_otp_and_phone_hash"
down_revision: Union[str, None] = "0010_add_rbac_policy_rules"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("otp_challenges"):
        otp_indexes = {idx["name"] for idx in inspector.get_indexes("otp_challenges")}
        if "ix_otp_challenges_phone_hash" in otp_indexes:
            op.drop_index("ix_otp_challenges_phone_hash", table_name="otp_challenges")
        op.drop_table("otp_challenges")

    if inspector.has_table("users"):
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "phone_hash" in user_columns:
            user_indexes = {idx["name"] for idx in inspector.get_indexes("users")}
            if "ix_users_phone_hash" in user_indexes:
                op.drop_index("ix_users_phone_hash", table_name="users")

            unique_constraints = {
                constraint["name"]
                for constraint in inspector.get_unique_constraints("users")
                if constraint.get("name")
            }
            if "users_phone_hash_key" in unique_constraints:
                op.drop_constraint("users_phone_hash_key", "users", type_="unique")

            op.drop_column("users", "phone_hash")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("users"):
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "phone_hash" not in user_columns:
            op.add_column("users", sa.Column("phone_hash", sa.String(length=64), nullable=True))
            op.create_index("ix_users_phone_hash", "users", ["phone_hash"], unique=True)

    if not inspector.has_table("otp_challenges"):
        op.create_table(
            "otp_challenges",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("phone_hash", sa.String(length=64), nullable=False),
            sa.Column("code_hash", sa.String(length=64), nullable=False),
            sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("blocked_until", sa.DateTime(timezone=True), nullable=True),
            sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_otp_challenges_phone_hash", "otp_challenges", ["phone_hash"], unique=False
        )
