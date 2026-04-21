#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

db_url="${APP_DATABASE_URL:-postgresql+psycopg://app:app@127.0.0.1:5432/app}"
backup_dir="${DB_BACKUP_DIR:-$ROOT_DIR/.backups/db}"
container_name="${DB_BACKUP_CONTAINER:-dep_postgres}"
backup_file=""
use_latest=0
confirm=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-url)
      db_url="${2:-}"
      shift 2
      ;;
    --backup-dir)
      backup_dir="${2:-}"
      shift 2
      ;;
    --container)
      container_name="${2:-}"
      shift 2
      ;;
    --file)
      backup_file="${2:-}"
      shift 2
      ;;
    --latest)
      use_latest=1
      shift
      ;;
    --confirm)
      confirm="${2:-}"
      shift 2
      ;;
    *)
      echo "[db-restore] Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ "$confirm" != "YES_I_UNDERSTAND_DATA_LOSS" ]]; then
  echo "[db-restore] Restore is destructive."
  echo "[db-restore] Pass: --confirm YES_I_UNDERSTAND_DATA_LOSS"
  exit 1
fi

if [[ -n "$backup_file" && "$use_latest" -eq 1 ]]; then
  echo "[db-restore] Use either --file or --latest, not both"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[db-restore] docker command not found"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "[db-restore] Docker daemon is not available"
  exit 1
fi

db_values="$(python3 - "$db_url" <<'PY'
import sys
from urllib.parse import urlparse, unquote

url = urlparse(sys.argv[1])
if not url.scheme.startswith("postgres"):
    raise SystemExit("[db-restore] only PostgreSQL URLs are supported")

db_user = unquote(url.username or "app")
db_pass = unquote(url.password or "app")
db_name = (url.path or "/app").lstrip("/") or "app"

print(db_user)
print(db_pass)
print(db_name)
PY
)"

db_user="$(printf '%s\n' "$db_values" | sed -n '1p')"
db_pass="$(printf '%s\n' "$db_values" | sed -n '2p')"
db_name="$(printf '%s\n' "$db_values" | sed -n '3p')"

container_running="$(docker ps --filter "name=^${container_name}$" --format '{{.Names}}')"
if [[ "$container_running" != "$container_name" ]]; then
  echo "[db-restore] Container '$container_name' is not running"
  exit 1
fi

if [[ "$use_latest" -eq 1 ]]; then
  backup_file="$(ls -1t "$backup_dir"/*.sql.gz 2>/dev/null | head -n 1 || true)"
fi

if [[ -z "$backup_file" ]]; then
  echo "[db-restore] No backup selected. Use --file or --latest"
  exit 1
fi

if [[ "$backup_file" != /* ]]; then
  backup_file="$ROOT_DIR/$backup_file"
fi

if [[ ! -f "$backup_file" ]]; then
  echo "[db-restore] Backup file not found: $backup_file"
  exit 1
fi

if [[ "$backup_file" != *.sql.gz ]]; then
  echo "[db-restore] Expected .sql.gz backup file: $backup_file"
  exit 1
fi

echo "[db-restore] Restoring from: $backup_file"

echo "[db-restore] Taking safety backup before restore..."
DB_BACKUP_DIR="$backup_dir" APP_DATABASE_URL="$db_url" \
  bash "$ROOT_DIR/scripts/db-backup.sh" --reason "pre-restore-safety"

echo "[db-restore] Resetting schema public..."
docker exec -e PGPASSWORD="$db_pass" "$container_name" \
  psql -U "$db_user" -d "$db_name" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

echo "[db-restore] Applying SQL backup..."
gzip -dc "$backup_file" | docker exec -i -e PGPASSWORD="$db_pass" "$container_name" \
  psql -U "$db_user" -d "$db_name" -v ON_ERROR_STOP=1

echo "[db-restore] Restore completed successfully"
