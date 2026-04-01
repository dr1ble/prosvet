#!/bin/sh

set -eu

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
allow_missing_tools="${PRECOMMIT_ALLOW_MISSING_TOOLS:-0}"
pytest_mode="${PRECOMMIT_PYTEST_MODE:-smart}"

require_or_skip() {
  message="$1"
  if [ "$allow_missing_tools" = "1" ]; then
    echo "pre-commit: warning: $message" >&2
    return 1
  fi
  echo "pre-commit: $message" >&2
  exit 1
}

staged_files="$(git diff --cached --name-only --diff-filter=ACMR)"
if [ -z "$staged_files" ]; then
  exit 0
fi

echo "pre-commit: staged files:"
printf "%s\n" "$staged_files"

marker_regex='module placeholder\.|\bTODO\b|\bFIXME\b|scaffold directory|future implementation'
while IFS= read -r path; do
  case "$path" in
    *.md|scripts/pre-commit.sh)
      continue
      ;;
  esac
  if git diff --cached -- "$path" | grep -E '^\+[^+]' | grep -Eiq "$marker_regex"; then
    echo "pre-commit: blocked. Remove draft markers (placeholder/TODO/FIXME/scaffold text) from staged changes." >&2
    echo "pre-commit: offending file: $path" >&2
    exit 1
  fi
done <<EOF
$staged_files
EOF

need_web_checks=0
need_backend_checks=0

while IFS= read -r path; do
  case "$path" in
    web/*)
      need_web_checks=1
      ;;
    backend/*)
      need_backend_checks=1
      ;;
  esac
done <<EOF
$staged_files
EOF

if [ "$need_web_checks" -eq 1 ]; then
  if [ ! -d "$ROOT_DIR/web/node_modules" ]; then
    if ! require_or_skip "web/node_modules not found. Run: cd web && npm install"; then
      need_web_checks=0
    fi
  fi

  if [ "$need_web_checks" -eq 1 ]; then
    echo "pre-commit: running lint-staged (prettier) for web..."
    (
      cd "$ROOT_DIR/web"
      npm exec lint-staged
    )
  fi
fi

if [ "$need_backend_checks" -eq 1 ]; then
  backend_python_files="$(printf "%s\n" "$staged_files" | grep -E '^backend/.*\.py$' || true)"
  backend_python_count="$(printf "%s\n" "$backend_python_files" | grep -c . || true)"
  run_pytest=0
  pytest_reason=""

  case "$pytest_mode" in
    always)
      run_pytest=1
      pytest_reason="forced by PRECOMMIT_PYTEST_MODE=always"
      ;;
    never)
      run_pytest=0
      pytest_reason="disabled by PRECOMMIT_PYTEST_MODE=never"
      ;;
    smart)
      critical_backend_change="$(printf "%s\n" "$staged_files" | grep -E '^(backend/migrations/|backend/app/modules/auth/|backend/app/modules/catalog/domain/|backend/app/shared/db/)' || true)"
      if [ -n "$critical_backend_change" ]; then
        run_pytest=1
        pytest_reason="critical backend paths changed"
      elif [ "$backend_python_count" -ge 8 ]; then
        run_pytest=1
        pytest_reason="large backend change set (${backend_python_count} files)"
      else
        run_pytest=0
        pytest_reason="smart mode: non-critical/small backend change"
      fi
      ;;
    *)
      echo "pre-commit: unknown PRECOMMIT_PYTEST_MODE='$pytest_mode' (expected: smart|always|never)" >&2
      exit 1
      ;;
  esac

  if ! python3 -m ruff --version >/dev/null 2>&1; then
    if ! require_or_skip "ruff is not available. Run: python3 -m pip install -r backend/requirements-dev.txt"; then
      need_backend_checks=0
    fi
  fi

  if [ "$need_backend_checks" -eq 1 ] && [ "$run_pytest" -eq 1 ] && ! python3 -m pytest --version >/dev/null 2>&1; then
    if ! require_or_skip "pytest is not available. Run: python3 -m pip install -r backend/requirements-dev.txt"; then
      need_backend_checks=0
    fi
  fi

  if [ "$need_backend_checks" -eq 1 ]; then
    if [ -n "$backend_python_files" ]; then
      backend_python_files_rel="$(printf "%s\n" "$backend_python_files" | sed 's#^backend/##')"
      echo "pre-commit: running ruff on staged backend Python files..."
      (
        cd "$ROOT_DIR/backend"
        # shellcheck disable=SC2086
        python3 -m ruff check $backend_python_files_rel
      )
    else
      echo "pre-commit: no staged backend Python files, skipping ruff."
    fi

    if [ "$run_pytest" -eq 1 ]; then
      echo "pre-commit: running pytest ($pytest_reason)..."
      (
        cd "$ROOT_DIR/backend"
        python3 -m pytest
      )
    else
      echo "pre-commit: skipping pytest ($pytest_reason)."
      echo "pre-commit: tip: use PRECOMMIT_PYTEST_MODE=always git commit ... to force full tests."
    fi
  fi
fi

echo "pre-commit: checks passed."
