#!/usr/bin/env bash

set -euo pipefail

TIMEOUT_SECONDS="${DOCKER_STARTUP_TIMEOUT:-90}"
PREFIX="${DOCKER_ENSURE_PREFIX:-[docker]}"

docker_context="$(docker context show 2>/dev/null || true)"

run_start_command() {
  local label="$1"
  shift

  local output
  if output="$("$@" 2>&1)"; then
    return 0
  fi

  echo "$PREFIX Failed to start $label automatically."
  if [[ -n "$output" ]]; then
    echo "$output"
  fi
  return 1
}

start_colima_with_recovery() {
  if run_start_command "Colima" colima start; then
    return 0
  fi

  echo "$PREFIX Retrying Colima startup after forced stop..."
  colima stop --force >/dev/null 2>&1 || true
  run_start_command "Colima" colima start
}

if docker info >/dev/null 2>&1; then
  echo "$PREFIX Docker daemon is ready."
  exit 0
fi

manual_hint="Start your Docker runtime manually and retry."

if [[ "$docker_context" == colima* ]] && command -v colima >/dev/null 2>&1; then
  echo "$PREFIX Docker daemon is not running. Attempting to start Colima for context '$docker_context'..."
  if ! start_colima_with_recovery; then
    echo "$PREFIX Run 'colima start' manually and retry."
    exit 1
  fi
  manual_hint="Run 'colima start' manually and retry."
elif [[ "$docker_context" == orbstack* ]] && command -v open >/dev/null 2>&1 && open -Ra OrbStack >/dev/null 2>&1; then
  echo "$PREFIX Docker daemon is not running. Attempting to start OrbStack for context '$docker_context'..."
  if ! run_start_command "OrbStack" open -a OrbStack; then
    echo "$PREFIX Start OrbStack manually and retry."
    exit 1
  fi
  manual_hint="Start OrbStack manually and retry."
elif command -v open >/dev/null 2>&1 && open -Ra Docker >/dev/null 2>&1; then
  echo "$PREFIX Docker daemon is not running. Attempting to start Docker Desktop..."
  if ! run_start_command "Docker Desktop" open -a Docker; then
    echo "$PREFIX Start Docker Desktop manually and retry."
    exit 1
  fi
  manual_hint="Start Docker Desktop manually and retry."
else
  echo "$PREFIX Docker daemon is not running and no supported auto-start runtime was detected."
  if [[ -n "$docker_context" ]]; then
    echo "$PREFIX Current Docker context: $docker_context"
  fi
  echo "$PREFIX $manual_hint"
  exit 1
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
echo "$PREFIX $manual_hint"
exit 1
