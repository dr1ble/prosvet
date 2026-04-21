#!/usr/bin/env python3
"""Debug script to test PostgreSQL connection."""

import sys

sys.path.insert(0, ".")

from sqlalchemy import create_engine, text

from app.core.config import settings

print(f"Settings DB URL: {settings.database_url}")
print(
    f"Test DB URL: {settings.database_url.replace('localhost', '127.0.0.1').rsplit('/', 1)[0] + '/app_test'}"
)

# Test with psycopg directly
try:
    import psycopg

    print("\nTesting psycopg connection...")
    conn = psycopg.connect("host=127.0.0.1 port=5432 dbname=app_test user=app password=app")
    print("SUCCESS: Direct psycopg connection worked!")
    conn.close()
except Exception as e:
    print(f"FAILED: Direct psycopg connection failed: {e}")

# Test with SQLAlchemy
try:
    print("\nTesting SQLAlchemy connection to app_test...")
    engine = create_engine("postgresql+psycopg://app:app@127.0.0.1:5432/app_test", echo=True)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"SUCCESS: SQLAlchemy connection worked! Result: {result.fetchone()}")
except Exception as e:
    print(f"FAILED: SQLAlchemy connection failed: {e}")

# Test with SQLAlchemy to main database
try:
    print("\nTesting SQLAlchemy connection to app...")
    engine = create_engine("postgresql+psycopg://app:app@127.0.0.1:5432/app", echo=True)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"SUCCESS: SQLAlchemy connection to app worked! Result: {result.fetchone()}")
except Exception as e:
    print(f"FAILED: SQLAlchemy connection to app failed: {e}")
