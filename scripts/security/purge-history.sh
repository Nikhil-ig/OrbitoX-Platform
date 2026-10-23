#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# ⚠️  CRITICAL OWNER-ONLY HISTORY REWRITE SCRIPT
# ==============================================================================
#
# CAUTION:
# This script rewrites git history to permanently purge historical secrets,
# machine signing keys, database dumps, backup files, and oversized zip archives.
#
# DO NOT RUN THIS AS AN AUTOMATED AGENT OR CI JOB.
# ONLY THE REPOSITORY OWNER SHOULD RUN THIS MANUALLY AFTER CREATING A BACKUP.
#
# Prerequisites:
#   1. Install git-filter-repo:
#      brew install git-filter-repo (macOS) or pip install git-filter-repo
#   2. Ensure a full offline backup of the entire git repository is saved.
#   3. Communicate with all team members: they will need to re-clone the repository
#      after history rewrite.
#
# ==============================================================================

echo "======================================================================"
echo "⚠️  ORBITOX HISTORICAL SECRET & BLOB PURGE"
echo "======================================================================"
echo "This will permanently rewrite git commit hashes."
read -p "Are you sure you want to proceed? (Type 'YES' to confirm): " CONFIRM
if [ "$CONFIRM" != "YES" ]; then
  echo "Aborted."
  exit 1
fi

echo "Running git filter-repo..."
git filter-repo \
  --path data/.staff_signing_secret \
  --path projects/external-os/restaurant-os/data/.staff_signing_secret \
  --path projects/external-os/restaurant-os/data/.revoked_staff_tokens.json \
  --path-glob '*.bak*' \
  --path-glob '*.zip' \
  --path-glob '**/data/*.json' \
  --path-glob '**/test-*store*.json' \
  --invert-paths \
  --force

echo ""
echo "======================================================================"
echo "✅ History purge complete locally."
echo "======================================================================"
echo ""
echo "MANUAL STEP REQUIRED BY REPO OWNER:"
echo "1. Verify git log and working tree integrity."
echo "2. Re-add your remote if git-filter-repo removed it:"
echo "   git remote add origin <remote-url>"
echo "3. Push the sanitized history to GitHub with force-with-lease:"
echo "   git push origin --force-with-lease --all"
echo "   git push origin --force-with-lease --tags"
echo "4. Inform collaborators to re-clone fresh copies."
echo "======================================================================"
