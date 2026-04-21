# pyright: reportMissingImports=false

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

import psycopg
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url

from app.core.config import settings
from scripts.db_schema_health import SchemaHealthError, ensure_db_schema_healthy

ALLOWED_LOCAL_HOSTS = {"127.0.0.1", "localhost"}


class RepairGuardError(RuntimeError):
    pass


def validate_local_repair_target(*, db_url: str, allow_repair: bool) -> None:
    hostname = make_url(db_url).host
    if hostname not in ALLOWED_LOCAL_HOSTS:
        raise RepairGuardError(
            "Local schema repair is restricted to loopback databases on 127.0.0.1 or localhost."
        )
    if not allow_repair:
        raise RepairGuardError(
            "Local schema repair is destructive. Re-run with ALLOW_LOCAL_SCHEMA_REPAIR=1."
        )


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _run_checked(command: list[str], *, env: dict[str, str], cwd: Path) -> None:
    result = subprocess.run(command, cwd=cwd, env=env, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "command failed")
    if result.stdout.strip():
        print(result.stdout.strip())


def _psycopg_conninfo(db_url: str) -> str:
    return db_url.replace("postgresql+psycopg://", "postgresql://", 1)


def reset_public_schema(db_url: str) -> None:
    with psycopg.connect(_psycopg_conninfo(db_url)) as connection:
        connection.autocommit = True
        with connection.cursor() as cursor:
            cursor.execute("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")


def repair_local_db_schema(*, db_url: str, allow_repair: bool) -> None:
    validate_local_repair_target(db_url=db_url, allow_repair=allow_repair)

    env = os.environ.copy()
    env["APP_DATABASE_URL"] = db_url
    env["PYTHONPATH"] = "."

    print(f"[repair] backing up local database at {db_url}")
    _run_checked(
        [
            "bash",
            str(_repo_root() / "scripts" / "db-backup.sh"),
            "--reason",
            "local-schema-repair",
            "--db-url",
            db_url,
        ],
        env=env,
        cwd=_repo_root(),
    )

    print("[repair] dropping and recreating public schema")
    reset_public_schema(db_url)

    print("[repair] running alembic upgrade head")
    _run_checked([sys.executable, "-m", "alembic", "upgrade", "head"], env=env, cwd=_backend_root())

    print("[repair] verifying schema health")
    verification_engine = create_engine(db_url)
    try:
        ensure_db_schema_healthy(verification_engine)
    finally:
        verification_engine.dispose()
    print("[repair] local schema repair complete")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Repair a broken local loopback database schema after explicit confirmation."
    )
    parser.add_argument("--db-url", default=settings.database_url)
    parser.add_argument("--allow-repair", action="store_true")
    args = parser.parse_args()

    allow_repair = args.allow_repair or os.environ.get("ALLOW_LOCAL_SCHEMA_REPAIR") == "1"

    try:
        repair_local_db_schema(db_url=args.db_url, allow_repair=allow_repair)
    except (RepairGuardError, SchemaHealthError, RuntimeError) as exc:
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    main()
