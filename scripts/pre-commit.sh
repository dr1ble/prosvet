#!/bin/sh

set -eu

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
allow_missing_tools="${PRECOMMIT_ALLOW_MISSING_TOOLS:-0}"

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

marker_regex='module placeholder\.|\bplaceholder\b|\bTODO\b|\bFIXME\b|scaffold directory|future implementation'
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
    web-admin/*)
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
  if [ ! -d "$ROOT_DIR/web-admin/node_modules" ]; then
    if ! require_or_skip "web-admin/node_modules not found. Run: cd web-admin && npm install"; then
      need_web_checks=0
    fi
  fi

  if [ "$need_web_checks" -eq 1 ]; then
    echo "pre-commit: running lint-staged (prettier) for web-admin..."
    (
      cd "$ROOT_DIR/web-admin"
      npm exec lint-staged
    )
  fi
fi

if [ "$need_backend_checks" -eq 1 ]; then
  if ! python3 -m ruff --version >/dev/null 2>&1; then
    if ! require_or_skip "ruff is not available. Run: python3 -m pip install -r backend/requirements-dev.txt"; then
      need_backend_checks=0
    fi
  fi

  if [ "$need_backend_checks" -eq 1 ] && ! python3 -m pytest --version >/dev/null 2>&1; then
    if ! require_or_skip "pytest is not available. Run: python3 -m pip install -r backend/requirements-dev.txt"; then
      need_backend_checks=0
    fi
  fi

  if [ "$need_backend_checks" -eq 1 ]; then
    echo "pre-commit: running ruff..."
    (
      cd "$ROOT_DIR/backend"
      python3 -m ruff check app tests migrations
    )

    echo "pre-commit: running pytest..."
    (
      cd "$ROOT_DIR/backend"
      python3 -m pytest
    )
  fi
fi

echo "pre-commit: checks passed."
