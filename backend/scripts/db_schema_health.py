from __future__ import annotations

import os

from app.shared.db.schema_health import (
    REQUIRED_PUBLIC_TABLES,
    SchemaHealthError,
    get_missing_required_tables,
)
from app.shared.db.schema_health import ensure_db_schema_healthy as _ensure_db_schema_healthy
from app.shared.db.session import engine as default_engine

__all__ = [
    "REQUIRED_PUBLIC_TABLES",
    "SchemaHealthError",
    "ensure_db_schema_healthy",
    "get_missing_required_tables",
    "main",
]


def ensure_db_schema_healthy(engine=default_engine) -> None:
    _ensure_db_schema_healthy(engine)


def main() -> None:
    try:
        ensure_db_schema_healthy(default_engine)
    except SchemaHealthError as exc:
        raise SystemExit(str(exc)) from exc

    db_url = os.environ.get("APP_DATABASE_URL", "<default APP_DATABASE_URL>")
    print(f"db schema OK ({db_url})")


if __name__ == "__main__":
    main()
