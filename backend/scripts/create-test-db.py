#!/usr/bin/env python3
"""Create test database from Python."""

import sys

sys.path.insert(0, ".")

from sqlalchemy import create_engine, text

# Connect to default database with autocommit for CREATE DATABASE
engine = create_engine(
    "postgresql+psycopg://app:app@127.0.0.1:5432/app", echo=True, isolation_level="AUTOCOMMIT"
)

try:
    with engine.connect() as conn:
        # Check if app_test exists
        result = conn.execute(text("SELECT 1 FROM pg_database WHERE datname='app_test'"))
        exists = result.fetchone()

        if exists:
            print("Database app_test already exists")
        else:
            print("Creating database app_test...")
            conn.execute(text("CREATE DATABASE app_test"))
            print("Database app_test created successfully")
except Exception as e:
    print(f"FAILED: {e}")
    sys.exit(1)
