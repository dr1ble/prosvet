#!/usr/bin/env python3

from __future__ import annotations

import json
import urllib.error
import urllib.request


def check_backend_health() -> None:
    with urllib.request.urlopen("http://127.0.0.1:8000/api/v1/health", timeout=10) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    if payload.get("status") != "ok":
        raise SystemExit(f"backend health unexpected payload: {payload}")
    print("backend health OK")


def check_web_health() -> None:
    req = urllib.request.Request("http://127.0.0.1:3000", method="GET")
    with urllib.request.urlopen(req, timeout=10) as resp:
        code = resp.getcode()
    if code != 200:
        raise SystemExit(f"web health failed: HTTP {code}")
    print("web HTTP 200")


def check_auth_smoke() -> None:
    payload = json.dumps({"login": "admin", "password": "admin12345"}).encode("utf-8")
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise SystemExit(f"auth smoke failed: HTTP {exc.code} {detail}") from exc

    if not body.get("access_token"):
        raise SystemExit("auth smoke failed: no access_token")
    print("auth smoke OK")


def check_db_tables() -> None:
    from sqlalchemy import inspect

    from app.shared.db.session import engine

    required = {"users", "courses", "course_lessons", "lesson_tasks"}
    tables = set(inspect(engine).get_table_names(schema="public"))
    missing = sorted(required - tables)
    if missing:
        raise SystemExit(f"missing tables: {', '.join(missing)}")
    print("db schema OK")


def main() -> None:
    print("[doctor] checking backend health")
    check_backend_health()
    print("[doctor] checking web health")
    check_web_health()
    print("[doctor] checking auth smoke")
    check_auth_smoke()
    print("[doctor] checking db schema")
    check_db_tables()
    print("[doctor] OK")


if __name__ == "__main__":
    main()
