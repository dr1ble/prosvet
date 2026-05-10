"""add diagnostics trajectory tables

Revision ID: 0033_diagnostics_trajectory
Revises: 0032_onboarding_qr_policy
Create Date: 2026-05-08 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0033_diagnostics_trajectory"
down_revision: str | None = "0032_onboarding_qr_policy"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "diagnostic_question_banks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("code", name="uq_diagnostic_question_banks_code"),
    )
    op.create_index(
        "ix_diagnostic_question_banks_code", "diagnostic_question_banks", ["code"], unique=False
    )

    op.create_table(
        "diagnostic_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("bank_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("competency_key", sa.String(length=80), nullable=False),
        sa.Column("competency_title", sa.String(length=160), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("options_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("correct_option_key", sa.String(length=80), nullable=False),
        sa.Column("weight", sa.Integer(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["bank_id"], ["diagnostic_question_banks.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("bank_id", "order_index", name="uq_diagnostic_question_bank_order"),
    )
    op.create_index("ix_diagnostic_questions_bank_id", "diagnostic_questions", ["bank_id"])
    op.create_index(
        "ix_diagnostic_questions_competency_key", "diagnostic_questions", ["competency_key"]
    )

    op.create_table(
        "diagnostic_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bank_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["bank_id"], ["diagnostic_question_banks.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_diagnostic_attempts_user_id", "diagnostic_attempts", ["user_id"])
    op.create_index("ix_diagnostic_attempts_bank_id", "diagnostic_attempts", ["bank_id"])

    op.create_table(
        "diagnostic_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("selected_option_key", sa.String(length=80), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["attempt_id"], ["diagnostic_attempts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["diagnostic_questions.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("attempt_id", "question_id", name="uq_diagnostic_answer_attempt_question"),
    )
    op.create_index("ix_diagnostic_answers_attempt_id", "diagnostic_answers", ["attempt_id"])
    op.create_index("ix_diagnostic_answers_question_id", "diagnostic_answers", ["question_id"])

    op.create_table(
        "diagnostic_competency_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("competency_key", sa.String(length=80), nullable=False),
        sa.Column("competency_title", sa.String(length=160), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("threshold", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.ForeignKeyConstraint(["attempt_id"], ["diagnostic_attempts.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("attempt_id", "competency_key", name="uq_diagnostic_score_attempt_competency"),
    )
    op.create_index(
        "ix_diagnostic_competency_scores_attempt_id",
        "diagnostic_competency_scores",
        ["attempt_id"],
    )

    op.create_table(
        "learning_trajectory_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("competency_key", sa.String(length=80), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["attempt_id"], ["diagnostic_attempts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_learning_trajectory_items_user_id", "learning_trajectory_items", ["user_id"])
    op.create_index(
        "ix_learning_trajectory_items_attempt_id", "learning_trajectory_items", ["attempt_id"]
    )
    op.create_index("ix_learning_trajectory_items_course_id", "learning_trajectory_items", ["course_id"])
    op.create_index(
        "ix_learning_trajectory_items_competency_key",
        "learning_trajectory_items",
        ["competency_key"],
    )


def downgrade() -> None:
    op.drop_index("ix_learning_trajectory_items_competency_key", table_name="learning_trajectory_items")
    op.drop_index("ix_learning_trajectory_items_course_id", table_name="learning_trajectory_items")
    op.drop_index("ix_learning_trajectory_items_attempt_id", table_name="learning_trajectory_items")
    op.drop_index("ix_learning_trajectory_items_user_id", table_name="learning_trajectory_items")
    op.drop_table("learning_trajectory_items")

    op.drop_index(
        "ix_diagnostic_competency_scores_attempt_id", table_name="diagnostic_competency_scores"
    )
    op.drop_table("diagnostic_competency_scores")

    op.drop_index("ix_diagnostic_answers_question_id", table_name="diagnostic_answers")
    op.drop_index("ix_diagnostic_answers_attempt_id", table_name="diagnostic_answers")
    op.drop_table("diagnostic_answers")

    op.drop_index("ix_diagnostic_attempts_bank_id", table_name="diagnostic_attempts")
    op.drop_index("ix_diagnostic_attempts_user_id", table_name="diagnostic_attempts")
    op.drop_table("diagnostic_attempts")

    op.drop_index("ix_diagnostic_questions_competency_key", table_name="diagnostic_questions")
    op.drop_index("ix_diagnostic_questions_bank_id", table_name="diagnostic_questions")
    op.drop_table("diagnostic_questions")

    op.drop_index("ix_diagnostic_question_banks_code", table_name="diagnostic_question_banks")
    op.drop_table("diagnostic_question_banks")
