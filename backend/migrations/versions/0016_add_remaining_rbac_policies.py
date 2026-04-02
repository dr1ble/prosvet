"""add remaining rbac policy rules

Revision ID: 0016_add_remaining_rbac_policies
Revises: 0015_progress_tracking
Create Date: 2026-04-02 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0016_add_remaining_rbac_policies"
down_revision: Union[str, None] = "0015_progress_tracking"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Insert missing policy rules that were not seeded in 0010
    # These cover: catalog.read, groups.view, groups.manage, progress.view
    op.execute(
        """
        INSERT INTO rbac_policy_rules (id, policy_key, role, enabled)
        VALUES
            ('22222222-2222-2222-2222-222222222001', 'catalog.read', 'administrator', true),
            ('22222222-2222-2222-2222-222222222002', 'catalog.read', 'methodologist', true),
            ('22222222-2222-2222-2222-222222222003', 'catalog.read', 'moderator', true),
            ('22222222-2222-2222-2222-222222222004', 'groups.view', 'administrator', true),
            ('22222222-2222-2222-2222-222222222005', 'groups.view', 'moderator', true),
            ('22222222-2222-2222-2222-222222222006', 'groups.manage', 'administrator', true),
            ('22222222-2222-2222-2222-222222222007', 'groups.manage', 'moderator', true),
            ('22222222-2222-2222-2222-222222222008', 'progress.view', 'administrator', true),
            ('22222222-2222-2222-2222-222222222009', 'progress.view', 'moderator', true)
        ON CONFLICT (policy_key, role) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM rbac_policy_rules
        WHERE id IN (
            '22222222-2222-2222-2222-222222222001',
            '22222222-2222-2222-2222-222222222002',
            '22222222-2222-2222-2222-222222222003',
            '22222222-2222-2222-2222-222222222004',
            '22222222-2222-2222-2222-222222222005',
            '22222222-2222-2222-2222-222222222006',
            '22222222-2222-2222-2222-222222222007',
            '22222222-2222-2222-2222-222222222008',
            '22222222-2222-2222-2222-222222222009'
        )
        """
    )
