"""add admin audit logs table

Revision ID: 0020_add_admin_audit_logs
Revises: 0019_add_catalog_read_for_user
Create Date: 2026-04-08 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0020_add_admin_audit_logs"
down_revision: Union[str, None] = "0019_add_catalog_read_for_user"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    has_users_table = "users" in inspector.get_table_names(schema="public")

    fk_constraints: list[sa.ForeignKeyConstraint] = []
    if has_users_table:
        fk_constraints.append(
            sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="CASCADE")
        )

    op.create_table(
        "admin_audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action_key", sa.String(length=128), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=True),
        sa.Column("entity_id", sa.Text(), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        *fk_constraints,
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_admin_audit_logs_action_key"), "admin_audit_logs", ["action_key"])
    op.create_index(
        op.f("ix_admin_audit_logs_actor_user_id"),
        "admin_audit_logs",
        ["actor_user_id"],
    )
    op.create_index(op.f("ix_admin_audit_logs_created_at"), "admin_audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index(op.f("ix_admin_audit_logs_created_at"), table_name="admin_audit_logs")
    op.drop_index(op.f("ix_admin_audit_logs_actor_user_id"), table_name="admin_audit_logs")
    op.drop_index(op.f("ix_admin_audit_logs_action_key"), table_name="admin_audit_logs")
    op.drop_table("admin_audit_logs")
