#!/bin/sh

set -eu

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

if [ "$#" -eq 0 ]; then
  exit 0
fi

forbidden_pattern='Color\(0x[0-9A-Fa-f]{8}\)|fontSize\s*=|lineHeight\s*=|RoundedCornerShape\(|\bCircleShape\b|alpha\s*=\s*0\.[0-9]+'

is_allowed_file() {
  case "$1" in
    *UiTokens.kt)
      return 0
      ;;
    mobile/core/designsystem/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_target_file() {
  case "$1" in
    mobile/feature/*|mobile/core/ui/*)
      ;;
    *)
      return 1
      ;;
  esac

  case "$1" in
    *.kt)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

failed=0

for path in "$@"; do
  if ! is_target_file "$path"; then
    continue
  fi

  if is_allowed_file "$path"; then
    continue
  fi

  if [ ! -f "$path" ]; then
    continue
  fi

  if grep -En "$forbidden_pattern" "$path" >/tmp/mobile-theme-guard.out 2>/dev/null; then
    echo "mobile-theme-guard: blocked policy violation in $path" >&2
    cat /tmp/mobile-theme-guard.out >&2
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "mobile-theme-guard: use theme tokens (MaterialTheme / *UiTokens), avoid hardcoded style values." >&2
  exit 1
fi

exit 0
