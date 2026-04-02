#!/usr/bin/env python3
"""Check database permissions."""

import sys

sys.path.insert(0, ".")

from sqlalchemy import create_engine, text

# Connect as superuser
engine = create_engine("postgresql+psycopg://postgres:postgres@127.0.0.1:5432/postgres", echo=True)

try:
    with engine.connect() as conn:
        # List databases
        result = conn.execute(
            text("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname")
        )
        print("Available databases:")
        for row in result:
            print(f"  - {row[0]}")

        # List users and their rights
        print("\nUser roles:")
        result = conn.execute(
            text("""
            SELECT r.rolname, r.rolcreaterole, r.rolcreatedb
            FROM pg_roles r
            WHERE r.rolname IN ('app', 'postgres')
        """)
        )
        for row in result:
            rolname, createrole, createdb = row
            print(f"  {rolname}: can_create_db={createdb}, can_create_role={createrole}")
except Exception as e:
    print(f"FAILED: {e}")
    sys.exit(1)
