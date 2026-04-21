#!/usr/bin/env bash

set -euo pipefail

TIMEOUT_SECONDS="${DOCKER_STARTUP_TIMEOUT:-90}"
PREFIX="${DOCKER_ENSURE_PREFIX:-[docker]}"

if docker info >/dev/null 2>&1; then
  echo "$PREFIX Docker daemon is ready."
  exit 0
fi

echo "$PREFIX Docker daemon is not running. Attempting to start Docker Desktop..."
if command -v open >/dev/null 2>&1; then
  open -a Docker >/dev/null 2>&1 || true
fi

elapsed=0
printf "%s Waiting for Docker daemon" "$PREFIX"
while [[ "$elapsed" -lt "$TIMEOUT_SECONDS" ]]; do
  if docker info >/dev/null 2>&1; then
    echo " ready"
    exit 0
  fi
  printf "."
  sleep 1
  elapsed=$((elapsed + 1))
done

echo ""
echo "$PREFIX Docker daemon did not become ready within ${TIMEOUT_SECONDS}s."
echo "$PREFIX Start Docker Desktop manually and retry."
exit 1
