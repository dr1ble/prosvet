#!/usr/bin/env bash

set -euo pipefail

# Stable quick start wrapper.
# Delegates to ./run, which ensures:
# - PostgreSQL container is running
# - migrations are applied
# - broken schema is auto-repaired when needed
# - backend + web are started together

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

exec "$ROOT_DIR/run"
