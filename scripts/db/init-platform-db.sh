#!/usr/bin/env bash
# ==============================================================================
# 🪐 OrbitoX Platform — PostgreSQL First-Boot Role Bootstrap Hook
# ==============================================================================
# Executed automatically by postgres docker-entrypoint during initdb.
# Runs under temporary postgres server as superuser ($POSTGRES_USER).
# ==============================================================================
set -euo pipefail

# Read migrator password from environment or secret file (no fallback to superuser password)
MIGRATOR_PASSWORD="${PLATFORM_MIGRATOR_PASSWORD:-}"
if [[ -z "$MIGRATOR_PASSWORD" && -f "/run/secrets/platform_migrator_password" ]]; then
  MIGRATOR_PASSWORD="$(cat /run/secrets/platform_migrator_password)"
fi

if [[ -z "$MIGRATOR_PASSWORD" ]]; then
  echo "❌ FATAL: Cannot bootstrap orbitox_migrator — PLATFORM_MIGRATOR_PASSWORD environment variable (or /run/secrets/platform_migrator_password) is required. Fallback to superuser password is strictly prohibited." >&2
  exit 1
fi

export PLATFORM_MIGRATOR_PASSWORD="$MIGRATOR_PASSWORD"

BOOTSTRAP_SQL="/scripts/db/vps-bootstrap-roles.sql"
if [[ ! -f "$BOOTSTRAP_SQL" ]]; then
  # Check relative path fallback
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [[ -f "${SCRIPT_DIR}/vps-bootstrap-roles.sql" ]]; then
    BOOTSTRAP_SQL="${SCRIPT_DIR}/vps-bootstrap-roles.sql"
  fi
fi

if [[ ! -f "$BOOTSTRAP_SQL" ]]; then
  echo "❌ FATAL: Bootstrap SQL file not found at ${BOOTSTRAP_SQL}." >&2
  exit 1
fi

echo "🚀 [init-platform-db.sh] Provisioning orbitox_migrator and database ownership..."

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -f "$BOOTSTRAP_SQL"

echo "✅ [init-platform-db.sh] Bootstrap roles and schema ownership successfully provisioned."
