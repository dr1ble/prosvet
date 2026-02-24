"""add rbac policy rules table

Revision ID: 0010_add_rbac_policy_rules
Revises: 9845f9f517a3
Create Date: 2026-02-25 01:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0010_add_rbac_policy_rules"
down_revision: Union[str, None] = "9845f9f517a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "rbac_policy_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("policy_key", sa.String(length=128), nullable=False),
        sa.Column("role", sa.String(length=64), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("policy_key", "role", name="uq_rbac_policy_rule_policy_role"),
    )
    op.create_index(
        op.f("ix_rbac_policy_rules_policy_key"),
        "rbac_policy_rules",
        ["policy_key"],
        unique=False,
    )

    op.execute(
        """
        INSERT INTO rbac_policy_rules (id, policy_key, role, enabled)
        VALUES
            ('11111111-1111-1111-1111-111111111111', 'catalog.write', 'administrator', true),
            ('11111111-1111-1111-1111-111111111112', 'catalog.write', 'methodologist', true),
            ('11111111-1111-1111-1111-111111111113', 'catalog.write', 'moderator', true),
            ('11111111-1111-1111-1111-111111111114', 'catalog.releases.read', 'administrator', true),
            ('11111111-1111-1111-1111-111111111115', 'catalog.releases.read', 'methodologist', true),
            ('11111111-1111-1111-1111-111111111116', 'catalog.releases.read', 'moderator', true),
            ('11111111-1111-1111-1111-111111111117', 'simulation.builder', 'administrator', true),
            ('11111111-1111-1111-1111-111111111118', 'simulation.builder', 'methodologist', true)
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_rbac_policy_rules_policy_key"), table_name="rbac_policy_rules")
    op.drop_table("rbac_policy_rules")
