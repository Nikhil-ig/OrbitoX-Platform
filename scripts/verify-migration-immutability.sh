#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo "🔒 VERIFYING MIGRATION IMMUTABILITY (Phase 4 Invariant)"
echo "========================================================"

# Historical baseline commit for Phase 3 acceptance
PHASE3_COMMIT="5df75f1b39d116a54a6ab94913febd7dd233305d"
FAILED=0

for file in $(git ls-files '**/migrations/**/migration.sql'); do
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

  # 3. For migrations introduced in Phase 4, verify no diff against its first committed version
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
