#!/usr/bin/env bash
# ==============================================================================
# 🪐 OrbitoX — Off-Site Backup Replication (Disaster-Recovery Readiness)
# ==============================================================================
# Syncs verified local backup archives to encrypted remote storage or secondary server.
# Supported protocols:
#   - S3 / Cloudflare R2 / MinIO (s3://bucket/path)
#   - SSH / Rsync (user@host:/path)
#   - Local directory target (/path or file://path, useful for mock / offline testing)
#
# Invariant: Strictly additive synchronization. Deletion flags are
# prohibited to preserve immutable off-site disaster recovery history.
# ==============================================================================
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT_DIR:-/var/backups/orbitox}"
REMOTE_DEST="${REMOTE_BACKUP_TARGET:-}"

if [[ -z "$REMOTE_DEST" ]]; then
  echo "ℹ️ [sync-backups-offsite] OFFSITE_NOT_CONFIGURED: REMOTE_BACKUP_TARGET is unset. Skipping remote synchronization."
  exit 0
fi

if [[ ! -d "$BACKUP_ROOT" ]]; then
  echo "❌ Error: Local backup root directory does not exist: ${BACKUP_ROOT}" >&2
  exit 1
fi

echo "🔍 [$(date -u '+%Y-%m-%d %H:%M:%SZ')] Verifying local backup checksums before off-site replication..."
CHECKSUM_COUNT=0
CHECKSUM_FAILURES=0

while IFS= read -r archive_file; do
  if [[ -f "$archive_file" ]]; then
    sha_file="${archive_file}.sha256"
    if [[ -f "$sha_file" ]]; then
      CHECKSUM_COUNT=$((CHECKSUM_COUNT + 1))
      expected_hash="$(awk '{print $1}' "$sha_file")"
      actual_hash=""

      if command -v sha256sum >/dev/null 2>&1; then
        actual_hash="$(sha256sum "$archive_file" | awk '{print $1}')"
      elif command -v shasum >/dev/null 2>&1; then
        actual_hash="$(shasum -a 256 "$archive_file" | awk '{print $1}')"
      else
        echo "⚠️ Warning: Neither sha256sum nor shasum found; skipping verification." >&2
        break
      fi

      if [[ -z "$actual_hash" || "$expected_hash" != "$actual_hash" ]]; then
        echo "❌ Error: Checksum verification failed for ${archive_file} (expected: ${expected_hash}, actual: ${actual_hash})" >&2
        CHECKSUM_FAILURES=$((CHECKSUM_FAILURES + 1))
      fi
    else
      echo "⚠️ Warning: Checksum file missing for ${archive_file}" >&2
    fi
  fi
done < <(find "$BACKUP_ROOT" -type f \( -name "*.sql.gz" -o -name "*.json.gz" \) 2>/dev/null | sort || true)

if [[ "$CHECKSUM_FAILURES" -gt 0 ]]; then
  echo "❌ FATAL: Checksum verification failed on ${CHECKSUM_FAILURES} archive(s). Aborting off-site replication to prevent corrupting remote target." >&2
  exit 1
fi

if [[ "$CHECKSUM_COUNT" -gt 0 ]]; then
  echo "✅ Verified ${CHECKSUM_COUNT} local backup archive checksum(s) successfully."
else
  echo "ℹ️ No archive checksums found in ${BACKUP_ROOT}; proceeding with directory synchronization."
fi

echo "🚀 [$(date -u '+%Y-%m-%d %H:%M:%SZ')] Additively syncing backup archives to remote target: ${REMOTE_DEST}..."

if [[ "$REMOTE_DEST" == s3://* ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "❌ Error: aws CLI required for S3 remote backup target." >&2
    exit 1
  fi
  # Additive synchronization: remote deletion flags are strictly omitted
  aws s3 sync "$BACKUP_ROOT" "$REMOTE_DEST"
elif [[ "$REMOTE_DEST" == *:* ]]; then
  if ! command -v rsync >/dev/null 2>&1; then
    echo "❌ Error: rsync utility required for SSH remote backup target." >&2
    exit 1
  fi
  # Additive synchronization: remote deletion flags are strictly omitted
  rsync -avz -e "ssh -o StrictHostKeyChecking=accept-new" "$BACKUP_ROOT/" "$REMOTE_DEST/"
elif [[ "$REMOTE_DEST" == /* || "$REMOTE_DEST" == file://* ]]; then
  # Local directory / NFS mount target (useful for tests and mounted network shares)
  LOCAL_TARGET="${REMOTE_DEST#file://}"
  mkdir -p "$LOCAL_TARGET"
  if command -v rsync >/dev/null 2>&1; then
    rsync -av "$BACKUP_ROOT/" "$LOCAL_TARGET/"
  else
    cp -R "$BACKUP_ROOT"/* "$LOCAL_TARGET/"
  fi
else
  echo "❌ Error: Unrecognized remote target format: ${REMOTE_DEST}. Expected s3://..., host:/path, or /local/path" >&2
  exit 1
fi

echo "✅ [$(date -u '+%Y-%m-%d %H:%M:%SZ')] Off-site backup replication completed successfully."
