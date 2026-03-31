#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.run"
RUN_PID_FILE="$STATE_DIR/run.pid"
RUN_LOG_FILE="$STATE_DIR/dev.log"
CGC_LOG_FILE="$STATE_DIR/codegraph-watch.log"
MAX_LOG_BYTES="${MAX_LOG_BYTES:-5242880}" # 5 MB
MAX_LOG_ARCHIVES="${MAX_LOG_ARCHIVES:-5}"
MAX_CGC_LOG_BYTES="${MAX_CGC_LOG_BYTES:-10485760}" # 10 MB
MAX_CGC_LOG_ARCHIVES="${MAX_CGC_LOG_ARCHIVES:-5}"

mkdir -p "$STATE_DIR"

is_pid_alive() {
  local pid="$1"
  kill -0 "$pid" 2>/dev/null
}

rotate_single_log_if_needed() {
  local log_file="$1"
  local archive_prefix="$2"
  local max_bytes="$3"
  local max_archives="$4"

  if [[ ! -f "$log_file" ]]; then
    return
  fi

  local size
  size="$(wc -c <"$log_file" 2>/dev/null || echo 0)"
  if [[ "$size" -lt "$max_bytes" ]]; then
    return
  fi

  local timestamp
  timestamp="$(date +%Y%m%d-%H%M%S)"
  local archive="$STATE_DIR/${archive_prefix}.$timestamp.log"
  mv "$log_file" "$archive"
  : >"$log_file"

  local archives
  archives="$(ls -1t "$STATE_DIR"/${archive_prefix}.*.log 2>/dev/null || true)"
  if [[ -z "$archives" ]]; then
    return
  fi

  local count=0
  while IFS= read -r file; do
    count=$((count + 1))
    if [[ "$count" -gt "$max_archives" ]]; then
      rm -f "$file"
    fi
  done <<< "$archives"
}

rotate_logs_if_needed() {
  rotate_single_log_if_needed "$RUN_LOG_FILE" "dev" "$MAX_LOG_BYTES" "$MAX_LOG_ARCHIVES"
  rotate_single_log_if_needed "$CGC_LOG_FILE" "codegraph-watch" "$MAX_CGC_LOG_BYTES" "$MAX_CGC_LOG_ARCHIVES"
}

services_up() {
  local backend_code
  backend_code="$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/v1/health || true)"
  local web_code
  web_code="$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 || true)"
  [[ "$backend_code" == "200" && "$web_code" == "200" ]]
}

read_run_pid() {
  if [[ ! -f "$RUN_PID_FILE" ]]; then
    return 1
  fi

  local pid
  pid="$(cat "$RUN_PID_FILE" 2>/dev/null || true)"
  if [[ -z "$pid" ]] || ! [[ "$pid" =~ ^[0-9]+$ ]]; then
    return 1
  fi

  printf "%s" "$pid"
}

start_stack() {
  local current_pid
  if current_pid="$(read_run_pid)" && is_pid_alive "$current_pid"; then
    if services_up; then
      echo "[dev-stack] Already running (PID $current_pid)."
      echo "[dev-stack] Log: $RUN_LOG_FILE"
      return 0
    fi
    echo "[dev-stack] Found stale run process (PID $current_pid), restarting..."
    stop_stack
  fi

  rm -f "$RUN_PID_FILE"
  rotate_logs_if_needed

  echo "[dev-stack] Starting stack in background..."
  nohup "$ROOT_DIR/run" >"$RUN_LOG_FILE" 2>&1 &
  local new_pid=$!
  echo "$new_pid" >"$RUN_PID_FILE"

  sleep 1
  if ! is_pid_alive "$new_pid"; then
    echo "[dev-stack] Failed to start. Last logs:"
    tail -n 60 "$RUN_LOG_FILE" || true
    rm -f "$RUN_PID_FILE"
    exit 1
  fi

  local waited=0
  while [[ "$waited" -lt 60 ]]; do
    if services_up; then
      echo "[dev-stack] Started and healthy (PID $new_pid)."
      echo "[dev-stack] Log: $RUN_LOG_FILE"
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done

  echo "[dev-stack] Stack did not become healthy within 60s. Last logs:"
  tail -n 80 "$RUN_LOG_FILE" || true
  exit 1
}

stop_stack() {
  local pid
  if ! pid="$(read_run_pid)"; then
    echo "[dev-stack] Not running (no PID file)."
    return 0
  fi

  if ! is_pid_alive "$pid"; then
    echo "[dev-stack] Stale PID file found. Cleaning up."
    rm -f "$RUN_PID_FILE"
    return 0
  fi

  echo "[dev-stack] Stopping stack (PID $pid)..."
  kill -TERM "$pid" 2>/dev/null || true

  local waited=0
  while is_pid_alive "$pid" && [[ "$waited" -lt 30 ]]; do
    sleep 1
    waited=$((waited + 1))
  done

  if is_pid_alive "$pid"; then
    echo "[dev-stack] Graceful stop timeout. Force killing PID $pid..."
    kill -KILL "$pid" 2>/dev/null || true
  fi

  rm -f "$RUN_PID_FILE"
  echo "[dev-stack] Stopped."
}

status_stack() {
  local pid=""
  if pid="$(read_run_pid)" && is_pid_alive "$pid"; then
    echo "[dev-stack] Status: running (PID $pid)"
  else
    echo "[dev-stack] Status: stopped"
  fi

  local backend_code
  backend_code="$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/v1/health || true)"
  local web_code
  web_code="$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 || true)"

  echo "[dev-stack] Backend health HTTP: ${backend_code:-n/a}"
  echo "[dev-stack] Web HTTP: ${web_code:-n/a}"
  if [[ "$backend_code" != "200" || "$web_code" != "200" ]]; then
    echo "[dev-stack] Warning: stack is not healthy. Use 'make restart'."
  fi
  echo "[dev-stack] Log: $RUN_LOG_FILE"
  echo "[dev-stack] CGC Log: $CGC_LOG_FILE"
}

show_logs() {
  if [[ ! -f "$RUN_LOG_FILE" ]]; then
    echo "[dev-stack] Log file does not exist yet: $RUN_LOG_FILE"
    return 0
  fi
  tail -n 120 -f "$RUN_LOG_FILE"
}

command="${1:-}"
case "$command" in
  start)
    start_stack
    ;;
  stop)
    stop_stack
    ;;
  restart)
    stop_stack
    start_stack
    ;;
  status)
    status_stack
    ;;
  logs)
    show_logs
    ;;
  *)
    echo "Usage: scripts/dev-stack.sh {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
