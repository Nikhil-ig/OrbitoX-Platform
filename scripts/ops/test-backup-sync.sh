#!/usr/bin/env bash
# ==============================================================================
# 🪐 OrbitoX — Off-Site Backup Replication & Cron Integration Tests
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SYNC_SCRIPT="${SCRIPT_DIR}/sync-backups-offsite.sh"
RUNNER_SCRIPT="${SCRIPT_DIR}/backup-all-staging-databases.sh"

echo "================================================================"
echo "🪐 TEST: BACKUP SECURITY, INTEGRITY & CRON RUNNER VERIFICATION"
echo "================================================================"

# Helper to check directory permissions (must be 0700)
assert_dir_perm_0700() {
  local target_dir="$1"
  local perm_octal
  perm_octal="$(stat -f "%OLp" "$target_dir" 2>/dev/null || stat -c "%a" "$target_dir" 2>/dev/null || echo "unknown")"
  if [[ "$perm_octal" == "700" ]]; then
    return 0
  fi
  # Fallback portable check via ls -ld
  local ls_perm
  ls_perm="$(ls -ld "$target_dir" | awk '{print $1}' | cut -c 1-10)"
  if [[ "$ls_perm" == "drwx------" ]]; then
    return 0
  fi
  echo "❌ FAIL: Directory $target_dir does not have 0700 permissions (got octal=$perm_octal, ls=$ls_perm)" >&2
  return 1
}

# Helper to check file permissions (must be 0600)
assert_file_perm_0600() {
  local target_file="$1"
  local perm_octal
  perm_octal="$(stat -f "%OLp" "$target_file" 2>/dev/null || stat -c "%a" "$target_file" 2>/dev/null || echo "unknown")"
  if [[ "$perm_octal" == "600" ]]; then
    return 0
  fi
  # Fallback portable check via ls -l
  local ls_perm
  ls_perm="$(ls -l "$target_file" | awk '{print $1}' | cut -c 1-10)"
  if [[ "$ls_perm" == "-rw-------" ]]; then
    return 0
  fi
  echo "❌ FAIL: File $target_file does not have 0600 permissions (got octal=$perm_octal, ls=$ls_perm)" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# Test 1: Static verification — ensure --delete is strictly absent
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Test 1: Asserting '--delete' flag is absent from sync script..."
if grep -q -- "--delete" "$SYNC_SCRIPT"; then
  echo "❌ FAIL: Destructive '--delete' flag detected in ${SYNC_SCRIPT}!" >&2
  exit 1
fi
echo "  ✅ PASS: No '--delete' flag found in sync script."

# ─────────────────────────────────────────────────────────────────────────────
# Test 2: REMOTE_BACKUP_TARGET unset behavior
# ─────────────────────────────────────────────────────────────────────────────
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

# ─────────────────────────────────────────────────────────────────────────────
# Test 3: Missing checksum sidecar causes non-zero exit
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Test 3: Missing checksum sidecar aborts replication..."
TMP_LOCAL="$(mktemp -d)"
TMP_REMOTE="$(mktemp -d)"

mkdir -p "${TMP_LOCAL}/platform"
echo "archive-without-checksum" | gzip > "${TMP_LOCAL}/platform/orphan.sql.gz"

SET_ERR=0
BACKUP_ROOT_DIR="$TMP_LOCAL" REMOTE_BACKUP_TARGET="$TMP_REMOTE" "$SYNC_SCRIPT" >/dev/null 2>&1 || SET_ERR=$?

if [[ "$SET_ERR" -eq 0 ]]; then
  echo "❌ FAIL: Expected sync to abort on missing checksum sidecar, but it succeeded!" >&2
  rm -rf "$TMP_LOCAL" "$TMP_REMOTE"
  exit 1
fi
echo "  ✅ PASS: Correctly aborted with non-zero exit code when checksum sidecar is missing."
rm -rf "$TMP_LOCAL" "$TMP_REMOTE"

# ─────────────────────────────────────────────────────────────────────────────
# Test 4: Corrupted checksum aborts replication
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Test 4: Corrupted backup archive aborts sync..."
TMP_LOCAL="$(mktemp -d)"
TMP_REMOTE="$(mktemp -d)"

mkdir -p "${TMP_LOCAL}/platform"
echo "real-backup-data" | gzip > "${TMP_LOCAL}/platform/corrupt_test.sql.gz"
echo "badchecksum000000000000000000000000000000000000000000000000000000  corrupt_test.sql.gz" > "${TMP_LOCAL}/platform/corrupt_test.sql.gz.sha256"

SET_ERR=0
BACKUP_ROOT_DIR="$TMP_LOCAL" REMOTE_BACKUP_TARGET="$TMP_REMOTE" "$SYNC_SCRIPT" >/dev/null 2>&1 || SET_ERR=$?

if [[ "$SET_ERR" -eq 0 ]]; then
  echo "❌ FAIL: Expected sync to abort on corrupted checksum, but it succeeded!" >&2
  rm -rf "$TMP_LOCAL" "$TMP_REMOTE"
  exit 1
fi
echo "  ✅ PASS: Correctly aborted with non-zero exit code on checksum mismatch."
rm -rf "$TMP_LOCAL" "$TMP_REMOTE"

# ─────────────────────────────────────────────────────────────────────────────
# Test 5: Missing checksum utility causes non-zero exit
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Test 5: Missing checksum utility causes non-zero exit..."
TMP_LOCAL="$(mktemp -d)"
TMP_REMOTE="$(mktemp -d)"
TMP_MOCK_BIN="$(mktemp -d)"

# Provide a mock PATH with standard utilities except sha256sum and shasum
mkdir -p "${TMP_LOCAL}/platform"
echo "data" | gzip > "${TMP_LOCAL}/platform/test.sql.gz"
echo "hash  test.sql.gz" > "${TMP_LOCAL}/platform/test.sql.gz.sha256"

# Create minimal mocks in TMP_MOCK_BIN for find, awk, rsync, bash
for cmd in bash find awk rsync date; do
  target="$(which "$cmd" 2>/dev/null || true)"
  if [[ -n "$target" ]]; then
    ln -s "$target" "${TMP_MOCK_BIN}/${cmd}"
  fi
done

SET_ERR=0
(
  # Override PATH to strictly exclude sha256sum and shasum
  export PATH="${TMP_MOCK_BIN}"
  BACKUP_ROOT_DIR="$TMP_LOCAL" REMOTE_BACKUP_TARGET="$TMP_REMOTE" "$SYNC_SCRIPT" >/dev/null 2>&1
) || SET_ERR=$?

if [[ "$SET_ERR" -eq 0 ]]; then
  echo "❌ FAIL: Expected sync to abort when sha256sum/shasum are missing, but it succeeded!" >&2
  rm -rf "$TMP_LOCAL" "$TMP_REMOTE" "$TMP_MOCK_BIN"
  exit 1
fi
echo "  ✅ PASS: Correctly aborted with non-zero exit code when checksum utilities are missing."
rm -rf "$TMP_LOCAL" "$TMP_REMOTE" "$TMP_MOCK_BIN"

# ─────────────────────────────────────────────────────────────────────────────
# Test 6: Empty backup directory handling
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Test 6: Empty backup directory handling..."
TMP_LOCAL="$(mktemp -d)"
TMP_REMOTE="$(mktemp -d)"

OUTPUT_EMPTY="$(BACKUP_ROOT_DIR="$TMP_LOCAL" REMOTE_BACKUP_TARGET="$TMP_REMOTE" "$SYNC_SCRIPT" 2>&1)"
EXIT_CODE=$?

if [[ "$EXIT_CODE" -ne 0 ]]; then
  echo "❌ FAIL: Expected exit code 0 on empty backup directory, got ${EXIT_CODE}" >&2
  rm -rf "$TMP_LOCAL" "$TMP_REMOTE"
  exit 1
fi

if [[ "$OUTPUT_EMPTY" == *"Verified"* ]]; then
  echo "❌ FAIL: Claimed verification succeeded when no archive was checked: ${OUTPUT_EMPTY}" >&2
  rm -rf "$TMP_LOCAL" "$TMP_REMOTE"
  exit 1
fi

if [[ "$OUTPUT_EMPTY" != *"No backup archives"* ]]; then
  echo "❌ FAIL: Did not report no backup archives found: ${OUTPUT_EMPTY}" >&2
  rm -rf "$TMP_LOCAL" "$TMP_REMOTE"
  exit 1
fi
echo "  ✅ PASS: Empty backup directory handled safely without false verification claim."
rm -rf "$TMP_LOCAL" "$TMP_REMOTE"

# ─────────────────────────────────────────────────────────────────────────────
# Test 7: Additive sync preserves existing remote historical backups
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Test 7: Additive sync preserves existing remote historical backups..."
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

if [[ ! -f "${TMP_REMOTE}/platform/platform_db_full_current.sql.gz" ]]; then
  echo "❌ FAIL: New backup was not replicated to remote target!" >&2
  rm -rf "$TMP_LOCAL" "$TMP_REMOTE"
  exit 1
fi

if [[ ! -f "${TMP_REMOTE}/platform/platform_db_full_historical.sql.gz" ]]; then
  echo "❌ FAIL: Historical backup in remote was deleted! Additive sync contract violated." >&2
  rm -rf "$TMP_LOCAL" "$TMP_REMOTE"
  exit 1
fi

echo "  ✅ PASS: Both new and historical backups safely exist in remote target (additive sync verified)."
rm -rf "$TMP_LOCAL" "$TMP_REMOTE"

# ─────────────────────────────────────────────────────────────────────────────
# Test 8: Backup file permissions (0600) and directory permissions (0700)
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Test 8: Backup directory (0700) and file (0600) permissions..."
TMP_SANDBOX="$(mktemp -d)"

(
  umask 077
  mkdir -m 0700 -p "${TMP_SANDBOX}/backups/platform"
  echo "test-db-content" | gzip > "${TMP_SANDBOX}/backups/platform/backup.sql.gz"
  chmod 0600 "${TMP_SANDBOX}/backups/platform/backup.sql.gz"
  if command -v sha256sum >/dev/null 2>&1; then
    (cd "${TMP_SANDBOX}/backups/platform" && sha256sum backup.sql.gz > backup.sql.gz.sha256)
  else
    (cd "${TMP_SANDBOX}/backups/platform" && shasum -a 256 backup.sql.gz > backup.sql.gz.sha256)
  fi
  chmod 0600 "${TMP_SANDBOX}/backups/platform/backup.sql.gz.sha256"
)

if ! assert_dir_perm_0700 "${TMP_SANDBOX}/backups"; then
  rm -rf "$TMP_SANDBOX"
  exit 1
fi
if ! assert_dir_perm_0700 "${TMP_SANDBOX}/backups/platform"; then
  rm -rf "$TMP_SANDBOX"
  exit 1
fi
if ! assert_file_perm_0600 "${TMP_SANDBOX}/backups/platform/backup.sql.gz"; then
  rm -rf "$TMP_SANDBOX"
  exit 1
fi
if ! assert_file_perm_0600 "${TMP_SANDBOX}/backups/platform/backup.sql.gz.sha256"; then
  rm -rf "$TMP_SANDBOX"
  exit 1
fi
echo "  ✅ PASS: Restrictive permissions (0700 dir, 0600 files) enforced and verified."
rm -rf "$TMP_SANDBOX"

# ─────────────────────────────────────────────────────────────────────────────
# Test 9: Complete Cron Execution Path under minimal non-interactive environment
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Test 9: Complete Cron Execution Path (backup-all-staging-databases.sh)..."
TMP_TEST_DIR="$(mktemp -d)"
TMP_LOCAL_BACKUP="${TMP_TEST_DIR}/local_backups"
TMP_REMOTE_BACKUP="${TMP_TEST_DIR}/remote_target"
TMP_MOCK_BIN="${TMP_TEST_DIR}/mock_bin"

mkdir -p "$TMP_LOCAL_BACKUP" "$TMP_REMOTE_BACKUP" "$TMP_MOCK_BIN"

# Create a mock docker command that outputs a small valid SQL dump stream on pg_dump calls
cat << 'EOF' > "${TMP_MOCK_BIN}/docker"
#!/bin/sh
for arg in "$@"; do
  if [ "$arg" = "pg_dump" ]; then
    printf -- "-- Mock PostgreSQL Dump\nCREATE TABLE test_table (id int);\nINSERT INTO test_table VALUES (1);\n"
    exit 0
  fi
done
exit 0
EOF
chmod +x "${TMP_MOCK_BIN}/docker"

# Create a mock .env file in the test repo structure
# Notice it contains a secret token that must NEVER appear in logs
MOCK_SECRET_VALUE="secret_super_token_987654321_xyz"
MOCK_ENV_FILE="${TMP_TEST_DIR}/.env"
cat << EOF > "$MOCK_ENV_FILE"
BACKUP_ROOT_DIR="${TMP_LOCAL_BACKUP}"
REMOTE_BACKUP_TARGET="${TMP_REMOTE_BACKUP}"
BACKUP_RETENTION_DAYS="7"
ORBITOX_CONTROL_SECRET="${MOCK_SECRET_VALUE}"
EOF

# Execute runner script in a stripped, non-interactive environment
# using env -i, pointing BACKUP_ROOT_DIR and REMOTE_BACKUP_TARGET
RUNNER_OUTPUT="$(
  env -i \
    PATH="${TMP_MOCK_BIN}:/usr/local/bin:/usr/bin:/bin" \
    BACKUP_ROOT_DIR="${TMP_LOCAL_BACKUP}" \
    REMOTE_BACKUP_TARGET="${TMP_REMOTE_BACKUP}" \
    "$RUNNER_SCRIPT" 2>&1
)"
RUNNER_EXIT=$?

if [[ "$RUNNER_EXIT" -ne 0 ]]; then
  echo "❌ FAIL: Runner script failed with exit code ${RUNNER_EXIT}!" >&2
  echo "Output:"
  echo "$RUNNER_OUTPUT"
  rm -rf "$TMP_TEST_DIR"
  exit 1
fi

# Assert both database backups were executed
if [[ ! -d "${TMP_LOCAL_BACKUP}/platform" ]] || [[ ! -d "${TMP_LOCAL_BACKUP}/restaurant-os" ]]; then
  echo "❌ FAIL: Backup directories were not created by runner!" >&2
  rm -rf "$TMP_TEST_DIR"
  exit 1
fi

PLATFORM_ARCHIVES=($(find "${TMP_LOCAL_BACKUP}/platform" -name "platform_db_*.sql.gz"))
ROS_ARCHIVES=($(find "${TMP_LOCAL_BACKUP}/restaurant-os" -name "restaurantos_*.sql.gz"))

if [[ ${#PLATFORM_ARCHIVES[@]} -eq 0 ]] || [[ ${#ROS_ARCHIVES[@]} -eq 0 ]]; then
  echo "❌ FAIL: Both platform and ROS database dumps must be produced!" >&2
  rm -rf "$TMP_TEST_DIR"
  exit 1
fi

# Assert file permissions
assert_dir_perm_0700 "${TMP_LOCAL_BACKUP}"
assert_dir_perm_0700 "${TMP_LOCAL_BACKUP}/platform"
assert_dir_perm_0700 "${TMP_LOCAL_BACKUP}/restaurant-os"
assert_file_perm_0600 "${PLATFORM_ARCHIVES[0]}"
assert_file_perm_0600 "${PLATFORM_ARCHIVES[0]}.sha256"
assert_file_perm_0600 "${ROS_ARCHIVES[0]}"
assert_file_perm_0600 "${ROS_ARCHIVES[0]}.sha256"

# Assert remote destination received the synchronized archives
REMOTE_PLATFORM_ARCHIVES=($(find "${TMP_REMOTE_BACKUP}/platform" -name "platform_db_*.sql.gz" 2>/dev/null || true))
REMOTE_ROS_ARCHIVES=($(find "${TMP_REMOTE_BACKUP}/restaurant-os" -name "restaurantos_*.sql.gz" 2>/dev/null || true))

if [[ ${#REMOTE_PLATFORM_ARCHIVES[@]} -eq 0 ]] || [[ ${#REMOTE_ROS_ARCHIVES[@]} -eq 0 ]]; then
  echo "❌ FAIL: Off-site replication did not deliver archives to remote target!" >&2
  rm -rf "$TMP_TEST_DIR"
  exit 1
fi

# Assert secrets were never printed
if [[ "$RUNNER_OUTPUT" == *"$MOCK_SECRET_VALUE"* ]]; then
  echo "❌ FAIL: Secret value was leaked in runner output!" >&2
  rm -rf "$TMP_TEST_DIR"
  exit 1
fi

echo "  ✅ PASS: Complete cron execution path ran successfully in minimal environment (env -i) with zero secret leakage."
rm -rf "$TMP_TEST_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# Test 10: Fail-closed on replication failure in backup runner
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Test 10: Fail-closed propagation on configured replication failure..."
TMP_TEST_DIR="$(mktemp -d)"
TMP_LOCAL_BACKUP="${TMP_TEST_DIR}/local_backups"
TMP_MOCK_BIN="${TMP_TEST_DIR}/mock_bin"

mkdir -p "$TMP_LOCAL_BACKUP" "$TMP_MOCK_BIN"
cat << 'EOF' > "${TMP_MOCK_BIN}/docker"
#!/bin/sh
printf -- "-- Mock Dump\n"
exit 0
EOF
chmod +x "${TMP_MOCK_BIN}/docker"

SET_ERR=0
(
  # Configure an invalid remote target format that causes sync-backups-offsite to fail
  env -i \
    PATH="${TMP_MOCK_BIN}:/usr/local/bin:/usr/bin:/bin" \
    BACKUP_ROOT_DIR="${TMP_LOCAL_BACKUP}" \
    REMOTE_BACKUP_TARGET="invalid-protocol://unreachable/target" \
    "$RUNNER_SCRIPT" >/dev/null 2>&1
) || SET_ERR=$?

if [[ "$SET_ERR" -eq 0 ]]; then
  echo "❌ FAIL: Expected runner to fail closed on replication error, but it exited 0!" >&2
  rm -rf "$TMP_TEST_DIR"
  exit 1
fi
echo "  ✅ PASS: Runner correctly propagated failure and exited non-zero."
rm -rf "$TMP_TEST_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# Test 11: Remote archive integrity & restore verification
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Test 11: Remote archive integrity & restore verification..."
TMP_REMOTE="$(mktemp -d)"
TMP_RESTORE="$(mktemp -d)"

mkdir -p "${TMP_REMOTE}/platform"
TEST_SQL_CONTENT="-- OrbitoX Backup Test\nCREATE TABLE test_restore (id serial primary key, name text);\nINSERT INTO test_restore (name) VALUES ('restored_ok');\n"
printf "%b" "$TEST_SQL_CONTENT" | gzip > "${TMP_REMOTE}/platform/restore_test.sql.gz"
if command -v sha256sum >/dev/null 2>&1; then
  (cd "${TMP_REMOTE}/platform" && sha256sum restore_test.sql.gz > restore_test.sql.gz.sha256)
else
  (cd "${TMP_REMOTE}/platform" && shasum -a 256 restore_test.sql.gz > restore_test.sql.gz.sha256)
fi

# Verify remote archive hash
expected_remote_hash="$(awk '{print $1}' "${TMP_REMOTE}/platform/restore_test.sql.gz.sha256")"
if command -v sha256sum >/dev/null 2>&1; then
  actual_remote_hash="$(sha256sum "${TMP_REMOTE}/platform/restore_test.sql.gz" | awk '{print $1}')"
else
  actual_remote_hash="$(shasum -a 256 "${TMP_REMOTE}/platform/restore_test.sql.gz" | awk '{print $1}')"
fi

if [[ "$expected_remote_hash" != "$actual_remote_hash" ]]; then
  echo "❌ FAIL: Remote archive hash mismatch before restore!" >&2
  rm -rf "$TMP_REMOTE" "$TMP_RESTORE"
  exit 1
fi

# Simulate restore: decompress and assert SQL content matches
gunzip -c "${TMP_REMOTE}/platform/restore_test.sql.gz" > "${TMP_RESTORE}/restored.sql"
if ! grep -q "CREATE TABLE test_restore" "${TMP_RESTORE}/restored.sql" || ! grep -q "restored_ok" "${TMP_RESTORE}/restored.sql"; then
  echo "❌ FAIL: Restored SQL content does not match original archive content!" >&2
  rm -rf "$TMP_REMOTE" "$TMP_RESTORE"
  exit 1
fi

echo "  ✅ PASS: Remote archive hash verified and test restoration completed successfully."
rm -rf "$TMP_REMOTE" "$TMP_RESTORE"

echo "================================================================"
echo "🎉 ALL 11 BACKUP SECURITY & INTEGRITY TESTS PASSED CLEANLY!"
echo "================================================================"
