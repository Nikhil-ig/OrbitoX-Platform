#!/usr/bin/env bash
# ==============================================================================
# 🪐 OrbitoX Platform & RestaurantOS — Staging Dual-Database Backup Runner
# ==============================================================================
# Scheduled via crontab (e.g. 0 2 * * * /opt/orbitox/scripts/ops/backup-all-staging-databases.sh)
# Uses docker exec against running database containers (no exposed host ports needed).
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Ensure PATH includes standard system and local bin directories for cron execution
export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

# Auto-load protected staging environment configuration if not already provided
ENV_FILE=""
if [[ -f "${REPO_ROOT}/infra/docker/.env" ]]; then
  ENV_FILE="${REPO_ROOT}/infra/docker/.env"
elif [[ -f "/opt/orbitox/infra/docker/.env" ]]; then
  ENV_FILE="/opt/orbitox/infra/docker/.env"
fi

if [[ -n "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

BACKUP_ROOT="${BACKUP_ROOT_DIR:-/var/backups/orbitox}"
PLATFORM_BACKUP_DIR="${BACKUP_ROOT}/platform"
ROS_BACKUP_DIR="${BACKUP_ROOT}/restaurant-os"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
export REMOTE_BACKUP_TARGET="${REMOTE_BACKUP_TARGET:-}"

echo "🚀 [$(date -u '+%Y-%m-%d %H:%M:%SZ')] Starting scheduled dual-database backup..."

# 1. Platform Database Backup
echo "📦 Backing up Platform Database..."
"${REPO_ROOT}/apps/platform/scripts/ops/backup-platform-postgres.sh" \
  --full \
  --container "orbitox_staging_platform_db" \
  --output-dir "$PLATFORM_BACKUP_DIR" \
  --retention-days "$RETENTION_DAYS"

# 2. RestaurantOS Database Backup
echo "📦 Backing up RestaurantOS Database..."
"${REPO_ROOT}/services/restaurant-api/scripts/backup-postgres.sh" \
  --full \
  --container "orbitox_staging_ros_db" \
  --output-dir "$ROS_BACKUP_DIR" \
  --retention-days "$RETENTION_DAYS"

# 3. Trigger off-site replication if configured
if [[ -f "${SCRIPT_DIR}/sync-backups-offsite.sh" ]]; then
  echo "🚀 Triggering off-site backup replication..."
  if ! "${SCRIPT_DIR}/sync-backups-offsite.sh"; then
    echo "❌ FATAL: Off-site backup replication failed. Local backups succeeded, but remote replication encountered errors." >&2
    exit 1
  fi
fi

echo "✅ [$(date -u '+%Y-%m-%d %H:%M:%SZ')] Dual-database scheduled backup completed successfully."
