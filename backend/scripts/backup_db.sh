#!/bin/bash

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
DATABASE_URL="${APP_DATABASE_URL:-postgresql+psycopg://app:app@127.0.0.1:5432/app}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"

python3 - "$DATABASE_URL" "$BACKUP_DIR" "$TIMESTAMP" <<'PY'
import subprocess
import sys
from pathlib import Path
from sqlalchemy.engine import make_url

raw_url = sys.argv[1].replace("postgresql+psycopg://", "postgresql://")
backup_dir = Path(sys.argv[2])
timestamp = sys.argv[3]
url = make_url(raw_url)
if not url.database:
    raise SystemExit("APP_DATABASE_URL must include database name")

backup_path = backup_dir / f"{url.database}_{timestamp}.dump"
command = [
    "pg_dump",
    "--format=custom",
    "--file",
    str(backup_path),
    raw_url,
]
subprocess.run(command, check=True)
print(backup_path)
PY
