"""add support policy rules

Revision ID: 0027_add_support_policy_rules
Revises: 0026_add_course_help_requests
Create Date: 2026-04-29 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0027_add_support_policy_rules"
down_revision: str | None = "0026_add_course_help_requests"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO rbac_policy_rules (id, policy_key, role, enabled)
        VALUES
            ('77777777-7777-7777-7777-777777777001', 'support.request.create', 'user', true),
            ('77777777-7777-7777-7777-777777777002', 'support.request.create', 'administrator', true),
            ('77777777-7777-7777-7777-777777777003', 'support.request.create', 'moderator', true),
            ('77777777-7777-7777-7777-777777777004', 'support.request.create', 'assistant', true),
            ('77777777-7777-7777-7777-777777777005', 'support.request.view', 'administrator', true),
            ('77777777-7777-7777-7777-777777777006', 'support.request.view', 'moderator', true),
            ('77777777-7777-7777-7777-777777777007', 'support.request.view', 'assistant', true),
            ('77777777-7777-7777-7777-777777777008', 'support.request.manage', 'administrator', true),
            ('77777777-7777-7777-7777-777777777009', 'support.request.manage', 'moderator', true),
            ('77777777-7777-7777-7777-777777777010', 'support.request.manage', 'assistant', true)
        ON CONFLICT (policy_key, role) DO UPDATE
            SET enabled = EXCLUDED.enabled,
                updated_at = now()
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM rbac_policy_rules
        WHERE policy_key IN (
            'support.request.create',
            'support.request.view',
            'support.request.manage'
        )
        """
    )
