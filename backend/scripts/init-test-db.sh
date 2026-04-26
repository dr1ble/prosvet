#!/bin/bash

# Initialize the isolated backend test database on the same PostgreSQL server
# used by APP_DATABASE_URL/TEST_DATABASE_URL.

set -euo pipefail

python3 - <<'PY'
import os
import getpass

import psycopg
from psycopg import sql
from psycopg.errors import InsufficientPrivilege
from sqlalchemy.engine import make_url


def test_database_url() -> object:
    explicit_test_url = os.environ.get("TEST_DATABASE_URL")
    app_url = make_url(
        os.environ.get(
            "APP_DATABASE_URL",
            "postgresql+psycopg://app:app@127.0.0.1:5432/app",
        ).replace("localhost", "127.0.0.1")
    )
    return make_url(explicit_test_url) if explicit_test_url else app_url.set(database="app_test")


url = test_database_url()
database = url.database
if not database:
    raise SystemExit("TEST_DATABASE_URL/APP_DATABASE_URL must include a database name")

maintenance_database = "postgres" if database != "postgres" else "template1"
conninfo = {
    "host": url.host or "127.0.0.1",
    "port": url.port or 5432,
    "dbname": maintenance_database,
    "user": url.username,
    "password": url.password,
}

def ensure_database(connect_kwargs: dict[str, object]) -> None:
    with psycopg.connect(**connect_kwargs, autocommit=True) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (database,))
            if cursor.fetchone() is None:
                owner = url.username
                statement = sql.SQL("CREATE DATABASE {} OWNER {}").format(
                    sql.Identifier(database),
                    sql.Identifier(owner),
                ) if owner else sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database))
                cursor.execute(statement)


print(f"Creating test database if missing: {database} on {conninfo['host']}:{conninfo['port']}")
try:
    ensure_database(conninfo)
except InsufficientPrivilege:
    owner = url.username or "the application user"
    admin_conninfo = {
        "host": conninfo["host"],
        "port": conninfo["port"],
        "dbname": maintenance_database,
        "user": getpass.getuser(),
    }
    print(f"Application user cannot create databases; retrying as local PostgreSQL user for owner {owner}")
    ensure_database(admin_conninfo)

with psycopg.connect(**conninfo, autocommit=True) as connection:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")

print(f"Test database '{database}' is available")
PY
