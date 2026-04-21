#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

reason=""
db_url="${APP_DATABASE_URL:-postgresql+psycopg://app:app@127.0.0.1:5432/app}"
out_dir="${DB_BACKUP_DIR:-$ROOT_DIR/.backups/db}"
container_name="${DB_BACKUP_CONTAINER:-dep_postgres}"
retain_count="${DB_BACKUP_RETAIN_COUNT:-3}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --reason)
      reason="${2:-}"
      shift 2
      ;;
    --db-url)
      db_url="${2:-}"
      shift 2
      ;;
    --out-dir)
      out_dir="${2:-}"
      shift 2
      ;;
    --container)
      container_name="${2:-}"
      shift 2
      ;;
    --retain-count)
      retain_count="${2:-}"
      shift 2
      ;;
    *)
      echo "[db-backup] Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$reason" ]]; then
  echo "[db-backup] --reason is required"
  exit 1
fi

if ! [[ "$retain_count" =~ ^[0-9]+$ ]]; then
  echo "[db-backup] --retain-count must be a non-negative integer"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[db-backup] docker command not found"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "[db-backup] Docker daemon is not available"
  exit 1
fi

if ! command -v gzip >/dev/null 2>&1; then
  echo "[db-backup] gzip command not found"
  exit 1
fi

db_values="$(python3 - "$db_url" <<'PY'
import sys
from urllib.parse import urlparse, unquote

url = urlparse(sys.argv[1])
if not url.scheme.startswith("postgres"):
    raise SystemExit("[db-backup] only PostgreSQL URLs are supported")

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

if [[ -z "$db_user" || -z "$db_name" ]]; then
  echo "[db-backup] Failed to parse database credentials"
  exit 1
fi

container_running="$(docker ps --filter "name=^${container_name}$" --format '{{.Names}}')"
if [[ "$container_running" != "$container_name" ]]; then
  echo "[db-backup] Container '$container_name' is not running"
  exit 1
fi

mkdir -p "$out_dir"

timestamp="$(date +%Y%m%d-%H%M%S)"
safe_reason="$(printf '%s' "$reason" | tr ' /:' '---')"
sql_file="$out_dir/${timestamp}_${safe_reason}.sql"

echo "[db-backup] Creating backup: $sql_file"
docker exec -e PGPASSWORD="$db_pass" "$container_name" \
  pg_dump -U "$db_user" -d "$db_name" --no-owner --no-privileges > "$sql_file"

gzip -f "$sql_file"
archive_file="${sql_file}.gz"
echo "[db-backup] Backup created: $archive_file"

if [[ "$retain_count" -gt 0 ]]; then
  archives="$(ls -1t "$out_dir"/*.sql.gz 2>/dev/null || true)"
  if [[ -n "$archives" ]]; then
    index=0
    while IFS= read -r archive; do
      index=$((index + 1))
      if [[ "$index" -gt "$retain_count" ]]; then
        rm -f "$archive"
        echo "[db-backup] Removed old backup: $archive"
      fi
    done <<< "$archives"
  fi
fi
