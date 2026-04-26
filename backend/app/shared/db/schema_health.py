from __future__ import annotations

from collections.abc import Iterable

from sqlalchemy import inspect
from sqlalchemy.engine import Engine

REQUIRED_PUBLIC_TABLES = frozenset(
    {
        "users",
        "courses",
        "course_lessons",
        "lesson_tasks",
        "course_releases",
        "course_release_screens",
        "groups",
        "group_memberships",
        "group_course_assignments",
        "group_course_assignment_target_users",
        "lesson_progress",
        "rbac_policy_rules",
    }
)


class SchemaHealthError(RuntimeError):
    pass


def get_missing_required_tables(engine: Engine) -> list[str]:
    tables = set(inspect(engine).get_table_names(schema="public"))
    return sorted(REQUIRED_PUBLIC_TABLES - tables)


def format_schema_health_error(missing_tables: Iterable[str]) -> str:
    missing = ", ".join(sorted(missing_tables))
    return (
        "Schema not healthy for local demo/mock flows. "
        f"Missing required public tables: {missing}. "
        "Run `make db-schema-health` to confirm and "
        "`ALLOW_LOCAL_SCHEMA_REPAIR=1 make db-schema-repair-local` only for loopback/local development databases."
    )


def ensure_db_schema_healthy(engine: Engine) -> None:
    missing_tables = get_missing_required_tables(engine)
    if missing_tables:
        raise SchemaHealthError(format_schema_health_error(missing_tables))
