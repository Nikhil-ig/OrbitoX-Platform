#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "🔒 VERIFYING MIGRATION IMMUTABILITY (Phase 4 Invariant)"
echo "========================================================"

# Historical baseline commit for Phase 3 acceptance
PHASE3_COMMIT="5df75f1b39d116a54a6ab94913febd7dd233305d"
FAILED=0

# ─────────────────────────────────────────────────────────────────────────────
# EXACT OWNER-APPROVED ONE-OFF EXCEPTION ALLOWLIST (Phase 6F Review 2 R3)
# ─────────────────────────────────────────────────────────────────────────────
# Pre-staging one-off exception approved by Owner on 2026-11-08 per Phase 6F Review 2 R2/R3.
# Context: AWS RDS PostgreSQL 16 non-superuser permission model (dropping ungrantable BYPASSRLS
# and adding schema public CREATE grant prior to resolve_platform_audit_intent function ownership transfer).
# All other migrations remain strictly immutable.
# ─────────────────────────────────────────────────────────────────────────────

get_approved_exception_old() {
  case "$1" in
    "prisma/migrations/20261027000600_orbitox_phase2_step2_audit_intents/migration.sql"|"apps/platform/prisma/migrations/20261027000600_orbitox_phase2_step2_audit_intents/migration.sql"|"orbitox/prisma/migrations/20261027000600_orbitox_phase2_step2_audit_intents/migration.sql")
      echo "67447bf30d01a5d9de58146d762d4796c7bfd3aaed3db8c6cef0dbb5d5322848"
      ;;
    "prisma/migrations/20261027000700_orbitox_phase2_step3_audit_previous_value/migration.sql"|"apps/platform/prisma/migrations/20261027000700_orbitox_phase2_step3_audit_previous_value/migration.sql"|"orbitox/prisma/migrations/20261027000700_orbitox_phase2_step3_audit_previous_value/migration.sql")
      echo "5e4baa6838518b803f21aeb11614c73ffb8ba9a90a799fd8d8086912e1a0c66b"
      ;;
    *)
      echo ""
      ;;
  esac
}

get_approved_exception_new() {
  case "$1" in
    "prisma/migrations/20261027000600_orbitox_phase2_step2_audit_intents/migration.sql"|"apps/platform/prisma/migrations/20261027000600_orbitox_phase2_step2_audit_intents/migration.sql"|"orbitox/prisma/migrations/20261027000600_orbitox_phase2_step2_audit_intents/migration.sql")
      echo "9493ebd3537d946b9159a64d0f6505e9f81d5778ee501a1b4065ab06d6379820"
      ;;
    "prisma/migrations/20261027000700_orbitox_phase2_step3_audit_previous_value/migration.sql"|"apps/platform/prisma/migrations/20261027000700_orbitox_phase2_step3_audit_previous_value/migration.sql"|"orbitox/prisma/migrations/20261027000700_orbitox_phase2_step3_audit_previous_value/migration.sql")
      echo "500d115baa4287da0a3ffecc2db1724042e0db253af4fe1606f773086d7db50a"
      ;;
    *)
      echo ""
      ;;
  esac
}

compute_file_sha256() {
  local target_file="$1"
  sha256sum "$target_file" | awk '{print $1}'
}

compute_blob_sha256() {
  local target_rev="$1"
  git cat-file -p "$target_rev" | sha256sum | awk '{print $1}'
}

for file in $(git ls-files '**/migrations/**/migration.sql'); do
  EXPECTED_OLD="$(get_approved_exception_old "$file")"
  EXPECTED_NEW="$(get_approved_exception_new "$file")"

  # Check if file has an approved exception
  if [ -n "$EXPECTED_OLD" ] && [ -n "$EXPECTED_NEW" ]; then
    CURRENT_HASH=$(compute_file_sha256 "$file")

    # Verify baseline has the expected old hash
    if git cat-file -e "${PHASE3_COMMIT}:$file" 2>/dev/null; then
      HISTORICAL_HASH=$(compute_blob_sha256 "${PHASE3_COMMIT}:$file")
    elif git cat-file -e "origin/main:$file" 2>/dev/null; then
      HISTORICAL_HASH=$(compute_blob_sha256 "origin/main:$file")
    else
      HISTORICAL_HASH="$EXPECTED_OLD"
    fi

    if [ "$HISTORICAL_HASH" != "$EXPECTED_OLD" ]; then
      echo "❌ ERROR: Historical baseline checksum mismatch for allowlisted $file!"
      echo "   Expected old: $EXPECTED_OLD, Found: $HISTORICAL_HASH"
      FAILED=1
      continue
    fi

    if [ "$CURRENT_HASH" != "$EXPECTED_NEW" ]; then
      echo "❌ ERROR: Allowlisted migration $file does not match approved new checksum!"
      echo "   Expected new: $EXPECTED_NEW, Found: $CURRENT_HASH"
      FAILED=1
      continue
    fi

    echo "  ✓ Approved Exception (Owner 2026-11-08, Phase 6F Review 2): $file"
    continue
  fi

  # 1. If present on origin/main, verify no diff against origin/main
  if git cat-file -e "origin/main:$file" 2>/dev/null; then
    if ! git diff --quiet "origin/main" -- "$file"; then
      echo "❌ ERROR: Migration $file was modified compared to origin/main!"
      FAILED=1
      continue
    fi
    echo "  ✓ Immutable (matches origin/main): $file"
    continue
  fi

  # 2. If present at Phase 3 acceptance commit, verify no diff against Phase 3 baseline
  if git cat-file -e "${PHASE3_COMMIT}:$file" 2>/dev/null; then
    if ! git diff --quiet "$PHASE3_COMMIT" -- "$file"; then
      echo "❌ ERROR: Migration $file was modified compared to Phase 3 baseline ($PHASE3_COMMIT)!"
      FAILED=1
      continue
    fi
    echo "  ✓ Immutable (matches Phase 3 baseline): $file"
    continue
  fi

  # 3. For migrations introduced in Phase 4 or later, verify no diff against its first committed version
  FIRST_COMMIT=$(git log --oneline --reverse --diff-filter=A -- "$file" | awk 'NR==1{print $1}')
  if [ -n "$FIRST_COMMIT" ]; then
    if ! git diff --quiet "$FIRST_COMMIT" -- "$file"; then
      echo "❌ ERROR: Migration $file was modified after first commit $FIRST_COMMIT!"
      FAILED=1
      continue
    fi
    echo "  ✓ Immutable (matches first commit $FIRST_COMMIT): $file"
  else
    # New untracked or newly staged migration
    echo "  ✓ New migration: $file"
  fi
done

if [ "$FAILED" -ne 0 ]; then
  echo ""
  echo "❌ Migration immutability check failed! Migrations must never be modified once committed."
  echo "   Create a new sequential migration instead."
  exit 1
fi

echo "========================================================"
echo "✅ All migrations are immutable and intact."
echo "========================================================"
