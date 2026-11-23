#!/usr/bin/env bash
# ==============================================================================
# 🪐 OrbitoX — Off-Site Backup Replication (Disaster-Recovery Readiness)
# ==============================================================================
# Syncs verified local backup archives to encrypted remote storage or secondary server.
# Supported protocols:
#   - S3 / Cloudflare R2 / MinIO (s3://bucket/path)
#   - SSH / Rsync (user@host:/path)
# ==============================================================================
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT_DIR:-/var/backups/orbitox}"
REMOTE_DEST="${REMOTE_BACKUP_TARGET:-}"

if [[ -z "$REMOTE_DEST" ]]; then
  echo "ℹ️ [sync-backups-offsite] REMOTE_BACKUP_TARGET not set. Skipping off-site replication."
  exit 0
fi

echo "🚀 [$(date -u '+%Y-%m-%d %H:%M:%SZ')] Syncing backup archives to remote target: ${REMOTE_DEST}..."

if [[ "$REMOTE_DEST" == s3://* ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "❌ Error: aws CLI required for S3 remote backup target." >&2
    exit 1
  fi
  aws s3 sync "$BACKUP_ROOT" "$REMOTE_DEST" --delete
elif [[ "$REMOTE_DEST" == *:* ]]; then
  if ! command -v rsync >/dev/null 2>&1; then
    echo "❌ Error: rsync utility required for SSH remote backup target." >&2
    exit 1
  fi
  rsync -avz --delete -e "ssh -o StrictHostKeyChecking=accept-new" "$BACKUP_ROOT/" "$REMOTE_DEST/"
else
  echo "❌ Error: Unrecognized remote target format: ${REMOTE_DEST}. Expected s3://... or host:/path" >&2
  exit 1
fi

echo "✅ [$(date -u '+%Y-%m-%d %H:%M:%SZ')] Off-site backup replication completed successfully."
