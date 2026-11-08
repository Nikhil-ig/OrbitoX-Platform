#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# OrbitoX Staging Secret Generator Shell Wrapper (Phase 6F B0)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Run using node and tsx
cd "$REPO_ROOT/orbitox"
exec pnpm exec tsx "$REPO_ROOT/scripts/staging/generate-secrets.ts" "$@"
