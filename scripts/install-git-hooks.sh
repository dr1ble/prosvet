#!/bin/sh

set -eu

ROOT_DIR="$(git rev-parse --show-toplevel)"
HOOK_PATH="$ROOT_DIR/.git/hooks/pre-commit"

cat >"$HOOK_PATH" <<'EOF'
#!/bin/sh

set -eu

ROOT_DIR="$(git rev-parse --show-toplevel)"
exec "$ROOT_DIR/scripts/pre-commit.sh"
EOF

chmod +x "$HOOK_PATH"
echo "Installed pre-commit hook: $HOOK_PATH"
