"""seed role permission templates into rbac policy rules

Revision ID: 0017_role_perms
Revises: 0016_add_remaining_rbac_policies
Create Date: 2026-04-02 20:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0017_role_perms"
down_revision: Union[str, None] = "0016_add_remaining_rbac_policies"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO rbac_policy_rules (id, policy_key, role, enabled)
        VALUES
            ('33333333-3333-3333-3333-333333333001', 'dashboard.view', 'administrator', true),
            ('33333333-3333-3333-3333-333333333002', 'catalog.view', 'administrator', true),
            ('33333333-3333-3333-3333-333333333003', 'catalog.course.create', 'administrator', true),
            ('33333333-3333-3333-3333-333333333004', 'catalog.course.update', 'administrator', true),
            ('33333333-3333-3333-3333-333333333005', 'catalog.release.create', 'administrator', true),
            ('33333333-3333-3333-3333-333333333006', 'catalog.release.submit_review', 'administrator', true),
            ('33333333-3333-3333-3333-333333333007', 'catalog.release.approve', 'administrator', true),
            ('33333333-3333-3333-3333-333333333008', 'catalog.release.publish', 'administrator', true),
            ('33333333-3333-3333-3333-333333333009', 'catalog.release.update_published', 'administrator', true),
            ('33333333-3333-3333-3333-333333333010', 'moderation.review', 'administrator', true),
            ('33333333-3333-3333-3333-333333333011', 'users.view', 'administrator', true),
            ('33333333-3333-3333-3333-333333333012', 'users.manage', 'administrator', true),
            ('33333333-3333-3333-3333-333333333013', 'rbac.manage', 'administrator', true),
            ('33333333-3333-3333-3333-333333333014', 'search.view', 'administrator', true),

            ('33333333-3333-3333-3333-333333333101', 'dashboard.view', 'methodologist', true),
            ('33333333-3333-3333-3333-333333333102', 'catalog.view', 'methodologist', true),
            ('33333333-3333-3333-3333-333333333103', 'catalog.course.create', 'methodologist', true),
            ('33333333-3333-3333-3333-333333333104', 'catalog.course.update', 'methodologist', true),
            ('33333333-3333-3333-3333-333333333105', 'catalog.release.create', 'methodologist', true),
            ('33333333-3333-3333-3333-333333333106', 'catalog.release.submit_review', 'methodologist', true),
            ('33333333-3333-3333-3333-333333333107', 'search.view', 'methodologist', true),

            ('33333333-3333-3333-3333-333333333201', 'dashboard.view', 'moderator', true),
            ('33333333-3333-3333-3333-333333333202', 'catalog.view', 'moderator', true),
            ('33333333-3333-3333-3333-333333333203', 'moderation.review', 'moderator', true),
            ('33333333-3333-3333-3333-333333333204', 'catalog.release.approve', 'moderator', true),
            ('33333333-3333-3333-3333-333333333205', 'catalog.release.publish', 'moderator', true),
            ('33333333-3333-3333-3333-333333333206', 'search.view', 'moderator', true),

            ('33333333-3333-3333-3333-333333333301', 'dashboard.view', 'user', true),
            ('33333333-3333-3333-3333-333333333302', 'progress.view.self', 'user', true)
        ON CONFLICT (policy_key, role) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM rbac_policy_rules
        WHERE id LIKE '33333333-3333-3333-3333-333333333%'
        """
    )
