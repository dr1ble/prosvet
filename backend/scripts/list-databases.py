#!/usr/bin/env python3
"""Debug script to list all databases."""

import sys

sys.path.insert(0, '.')

from sqlalchemy import create_engine, text

# Try to connect and list databases
try:
    engine = create_engine("postgresql+psycopg://app:app@127.0.0.1:5432/app", echo=False)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT datname FROM pg_database WHERE datistemplate = false"))
        databases = [row[0] for row in result]
        print("Available databases:")
        for db in sorted(databases):
            print(f"  - {db}")
except Exception as e:
    print(f"FAILED: {e}")
