#!/usr/bin/env bash
# ==============================================================================
# 🪐 OrbitoX — Off-Site Backup Replication & Additive Sync Tests
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC_SCRIPT="${SCRIPT_DIR}/sync-backups-offsite.sh"

echo "================================================================"
echo "🪐 TEST: OFF-SITE BACKUP SYNCHRONIZATION & ADDITIVE INTEGRITY"
echo "================================================================"

# Test 1: Static verification — ensure --delete is strictly absent
echo "▶ Test 1: Asserting '--delete' flag is absent from sync script..."
if grep -q -- "--delete" "$SYNC_SCRIPT"; then
  echo "❌ FAIL: Destructive '--delete' flag detected in ${SYNC_SCRIPT}!" >&2
  exit 1
fi
echo "  ✅ PASS: No '--delete' flag found in sync script."

# Test 2: Unset REMOTE_BACKUP_TARGET outputs OFFSITE_NOT_CONFIGURED and exits 0
echo "▶ Test 2: REMOTE_BACKUP_TARGET unset behavior..."
TMP_EMPTY="$(mktemp -d)"
OUTPUT_UNSET="$(BACKUP_ROOT_DIR="$TMP_EMPTY" REMOTE_BACKUP_TARGET="" "$SYNC_SCRIPT" 2>&1)"
EXIT_CODE=$?
if [[ "$EXIT_CODE" -ne 0 ]]; then
  echo "❌ FAIL: Expected exit code 0 when REMOTE_BACKUP_TARGET is unset, got ${EXIT_CODE}" >&2
  rm -rf "$TMP_EMPTY"
  exit 1
fi
if [[ "$OUTPUT_UNSET" != *"OFFSITE_NOT_CONFIGURED"* ]]; then
  echo "❌ FAIL: Output did not contain OFFSITE_NOT_CONFIGURED: ${OUTPUT_UNSET}" >&2
  rm -rf "$TMP_EMPTY"
  exit 1
fi
echo "  ✅ PASS: Correctly emitted OFFSITE_NOT_CONFIGURED with exit code 0."
rm -rf "$TMP_EMPTY"

# Test 3: Checksum verification failure prevents upload
echo "▶ Test 3: Corrupted backup archive aborts sync..."
TMP_LOCAL="$(mktemp -d)"
TMP_REMOTE="$(mktemp -d)"

mkdir -p "${TMP_LOCAL}/platform"
echo "real-backup-data" | gzip > "${TMP_LOCAL}/platform/test.sql.gz"
# Write bad checksum
echo "badchecksum000000000000000000000000000000000000000000000000000000  test.sql.gz" > "${TMP_LOCAL}/platform/test.sql.gz.sha256"

SET_ERR=0
BACKUP_ROOT_DIR="$TMP_LOCAL" REMOTE_BACKUP_TARGET="$TMP_REMOTE" "$SYNC_SCRIPT" >/dev/null 2>&1 || SET_ERR=$?

if [[ "$SET_ERR" -eq 0 ]]; then
  echo "❌ FAIL: Expected sync to abort on corrupted checksum, but it succeeded!" >&2
  rm -rf "$TMP_LOCAL" "$TMP_REMOTE"
  exit 1
fi
echo "  ✅ PASS: Correctly aborted with non-zero exit code on checksum mismatch."
rm -rf "$TMP_LOCAL" "$TMP_REMOTE"

# Test 4: Additive sync preserves existing remote historical backups
echo "▶ Test 4: Additive sync preserves existing remote historical backups..."
TMP_LOCAL="$(mktemp -d)"
TMP_REMOTE="$(mktemp -d)"

# In remote, create an old historical backup that rotated off the local server
mkdir -p "${TMP_REMOTE}/platform"
echo "historical-backup-week-1" | gzip > "${TMP_REMOTE}/platform/platform_db_full_historical.sql.gz"

# In local, create a new backup
mkdir -p "${TMP_LOCAL}/platform"
echo "current-backup-data" | gzip > "${TMP_LOCAL}/platform/platform_db_full_current.sql.gz"
if command -v sha256sum >/dev/null 2>&1; then
  (cd "${TMP_LOCAL}/platform" && sha256sum platform_db_full_current.sql.gz > platform_db_full_current.sql.gz.sha256)
else
  (cd "${TMP_LOCAL}/platform" && shasum -a 256 platform_db_full_current.sql.gz > platform_db_full_current.sql.gz.sha256)
fi

BACKUP_ROOT_DIR="$TMP_LOCAL" REMOTE_BACKUP_TARGET="$TMP_REMOTE" "$SYNC_SCRIPT" >/dev/null

# Assert current backup was copied to remote
if [[ ! -f "${TMP_REMOTE}/platform/platform_db_full_current.sql.gz" ]]; then
  echo "❌ FAIL: New backup was not replicated to remote target!" >&2
  rm -rf "$TMP_LOCAL" "$TMP_REMOTE"
  exit 1
fi

# Assert historical backup was NOT deleted from remote
if [[ ! -f "${TMP_REMOTE}/platform/platform_db_full_historical.sql.gz" ]]; then
  echo "❌ FAIL: Historical backup in remote was deleted! Additive sync contract violated." >&2
  rm -rf "$TMP_LOCAL" "$TMP_REMOTE"
  exit 1
fi

echo "  ✅ PASS: Both new and historical backups safely exist in remote target (additive sync verified)."
rm -rf "$TMP_LOCAL" "$TMP_REMOTE"

echo "================================================================"
echo "🎉 ALL OFF-SITE BACKUP SYNC VERIFICATION TESTS PASSED CLEANLY!"
echo "================================================================"
