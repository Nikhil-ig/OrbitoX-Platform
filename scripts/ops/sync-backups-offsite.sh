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
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Ensure standard system and local bin directories are in PATH for cron execution if unset
export PATH="${PATH:-/usr/local/bin:/usr/bin:/bin}"

# Load protected environment if REMOTE_BACKUP_TARGET is not already defined in shell
if [[ -z "${REMOTE_BACKUP_TARGET:-}" ]]; then
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
fi

BACKUP_ROOT="${BACKUP_ROOT_DIR:-/var/backups/orbitox}"
REMOTE_DEST="${REMOTE_BACKUP_TARGET:-}"

if [[ -z "$REMOTE_DEST" ]]; then
  echo "ℹ️ [sync-backups-offsite] OFFSITE_NOT_CONFIGURED: REMOTE_BACKUP_TARGET is unset. Operating in local-backup-only mode."
  exit 0
fi

if [[ ! -d "$BACKUP_ROOT" ]]; then
  echo "❌ Error: Local backup root directory does not exist: ${BACKUP_ROOT}" >&2
  exit 1
fi

echo "🔍 [$(date -u '+%Y-%m-%d %H:%M:%SZ')] Verifying local backup checksums before off-site replication..."

# Fail closed if no checksum utility is available in PATH
if ! command -v sha256sum >/dev/null 2>&1 && ! command -v shasum >/dev/null 2>&1; then
  echo "❌ FATAL: Neither sha256sum nor shasum utility found in PATH. Checksum verification cannot proceed." >&2
  exit 1
fi

# Discover all backup archives (.sql.gz and .json.gz)
ARCHIVES=()
while IFS= read -r f; do
  [[ -n "$f" ]] && ARCHIVES+=("$f")
done < <(find "$BACKUP_ROOT" -type f \( -name "*.sql.gz" -o -name "*.json.gz" \) 2>/dev/null | sort || true)

TOTAL_ARCHIVES=${#ARCHIVES[@]}

if [[ "$TOTAL_ARCHIVES" -eq 0 ]]; then
  echo "ℹ️ [sync-backups-offsite] No backup archives (.sql.gz, .json.gz) found in ${BACKUP_ROOT}. Nothing to replicate."
  exit 0
fi

CHECKSUM_COUNT=0
CHECKSUM_FAILURES=0

for archive_file in "${ARCHIVES[@]}"; do
  sha_file="${archive_file}.sha256"
  if [[ ! -f "$sha_file" ]]; then
    echo "❌ FATAL: Missing checksum sidecar for ${archive_file}" >&2
    CHECKSUM_FAILURES=$((CHECKSUM_FAILURES + 1))
    continue
  fi

  expected_hash="$(awk '{print $1}' "$sha_file")"
  actual_hash=""

  if command -v sha256sum >/dev/null 2>&1; then
    actual_hash="$(sha256sum "$archive_file" | awk '{print $1}')"
  elif command -v shasum >/dev/null 2>&1; then
    actual_hash="$(shasum -a 256 "$archive_file" | awk '{print $1}')"
  fi

  if [[ -z "$actual_hash" || "$expected_hash" != "$actual_hash" ]]; then
    echo "❌ FATAL: Checksum verification failed for ${archive_file} (expected: ${expected_hash}, actual: ${actual_hash})" >&2
    CHECKSUM_FAILURES=$((CHECKSUM_FAILURES + 1))
  else
    CHECKSUM_COUNT=$((CHECKSUM_COUNT + 1))
  fi
done

if [[ "$CHECKSUM_FAILURES" -gt 0 ]]; then
  echo "❌ FATAL: Checksum verification failed on ${CHECKSUM_FAILURES} archive(s). Aborting off-site replication to prevent corrupting remote target." >&2
  exit 1
fi

if [[ "$CHECKSUM_COUNT" -ne "$TOTAL_ARCHIVES" || "$CHECKSUM_COUNT" -eq 0 ]]; then
  echo "❌ FATAL: Checksum verification mismatch: verified ${CHECKSUM_COUNT} of ${TOTAL_ARCHIVES} archives. Aborting." >&2
  exit 1
fi

echo "✅ Verified ${CHECKSUM_COUNT} local backup archive checksum(s) successfully."

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
  # Pinned host-key verification: StrictHostKeyChecking=yes (fails closed if host key unverified)
  rsync -avz -e "ssh -o StrictHostKeyChecking=yes" "$BACKUP_ROOT/" "$REMOTE_DEST/"
elif [[ "$REMOTE_DEST" == /* || "$REMOTE_DEST" == file://* ]]; then
  # Local directory / NFS mount target (useful for tests and mounted network shares)
  LOCAL_TARGET="${REMOTE_DEST#file://}"
  mkdir -m 0700 -p "$LOCAL_TARGET"
  chmod 0700 "$LOCAL_TARGET" || { echo "❌ FATAL: Failed to enforce 0700 permissions on ${LOCAL_TARGET}" >&2; exit 1; }
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
