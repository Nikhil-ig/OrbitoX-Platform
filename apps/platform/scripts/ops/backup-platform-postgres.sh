#!/usr/bin/env bash
# ==============================================================================
# 🪐 OrbitoX Platform — Production Database Backup & Retention Utility (GC-03)
# ==============================================================================
# Usage:
#   ./scripts/ops/backup-platform-postgres.sh --full [--output-dir <dir>] [--retention-days <N>]
#   ./scripts/ops/backup-platform-postgres.sh --schema-only [--output-dir <dir>]
#
# Environment Variables:
#   APP_DATABASE_URL    Primary Platform PostgreSQL connection URL (or DATABASE_URL)
#   BACKUP_OUTPUT_DIR   Default output directory for backups
#   BACKUP_RETENTION    Retention in days (default: 7)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
OUTPUT_DIR="${BACKUP_OUTPUT_DIR:-${PLATFORM_ROOT}/data/backups}"
RETENTION_DAYS="${BACKUP_RETENTION:-7}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%SZ")"

# Database URL resolution: APP_DATABASE_URL takes precedence over DATABASE_URL
DB_URL="${APP_DATABASE_URL:-${DATABASE_URL:-}}"

MODE="full"

print_usage() {
  local exit_code="${1:-0}"
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --full                 Perform complete Platform database dump (default)
  --schema-only          Dump schema, constraints, and migrations metadata only
  --output-dir <dir>     Directory to store backups (default: ./data/backups)
  --retention-days <N>   Days of backups to keep before rotation (default: 7)
  --db-url <url>         Override target PostgreSQL connection URL
  --help                 Show this help message

Environment Variables:
  APP_DATABASE_URL       Platform PostgreSQL connection URL (e.g. postgresql://user:pass@host:5432/db)
  DATABASE_URL           Fallback connection URL
  BACKUP_OUTPUT_DIR      Fallback backup destination directory
  BACKUP_RETENTION       Fallback retention window in days
EOF
  exit "$exit_code"
}

# Parse command-line flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --full)
      MODE="full"
      shift
      ;;
    --schema-only)
      MODE="schema-only"
      shift
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --retention-days)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --db-url)
      DB_URL="$2"
      shift 2
      ;;
    --help)
      print_usage 0
      ;;
    *)
      echo "❌ Unknown option: $1" >&2
      print_usage 1
      ;;
  esac
done

if [[ -z "$DB_URL" ]]; then
  echo "❌ Error: Platform database URL is required via APP_DATABASE_URL or --db-url." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "❌ Error: pg_dump client utility was not found in PATH." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Compute checksum helper
compute_checksum() {
  local target_file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$target_file" > "${target_file}.sha256"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$target_file" > "${target_file}.sha256"
  else
    echo "⚠️  Warning: Neither sha256sum nor shasum available; checksum skipped." >&2
  fi
}

# Redact credentials from URL for safe logging
safe_target="$(echo "$DB_URL" | sed -E 's|://([^:]+):([^@]+)@|://\1:***@|g')"

BACKUP_FILE="${OUTPUT_DIR}/platform_db_${MODE}_${TIMESTAMP}.sql.gz"

echo "================================================================"
echo "🪐 ORBITOX PLATFORM POSTGRESQL BACKUP UTILITY"
echo "================================================================"
echo " Mode        : ${MODE}"
echo " Destination : ${BACKUP_FILE}"
echo " Target DB   : ${safe_target}"
echo " Retention   : ${RETENTION_DAYS} days"
echo " Started At  : $(date -u '+%Y-%m-%d %H:%M:%SZ')"
echo "────────────────────────────────────────────────────────────────"

EXTRA_ARGS=()
if [[ "$MODE" == "schema-only" ]]; then
  EXTRA_ARGS+=("--schema-only")
fi

# Execute pg_dump with clean, if-exists, and gzip compression
pg_dump "$DB_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "${EXTRA_ARGS[@]}" \
  | gzip -9 > "$BACKUP_FILE"

# Verify non-empty output
if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "❌ Error: Backup failed — generated file is missing or zero bytes." >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

compute_checksum "$BACKUP_FILE"

BACKUP_SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
echo "✅ Backup successfully created (${BACKUP_SIZE})."
echo "   Artifact : ${BACKUP_FILE}"
echo "   Checksum : ${BACKUP_FILE}.sha256"

# Apply rolling retention rotation
echo "🧹 Checking for Platform backups older than ${RETENTION_DAYS} days in ${OUTPUT_DIR}..."
ROTATED_COUNT=0
while IFS= read -r old_file; do
  if [[ -n "$old_file" ]]; then
    rm -f "$old_file" "${old_file}.sha256"
    ROTATED_COUNT=$((ROTATED_COUNT + 1))
  fi
done < <(find "$OUTPUT_DIR" -type f -name "platform_db_*.sql.gz" -mtime "+${RETENTION_DAYS}" 2>/dev/null || true)

echo "✅ Rotation complete. Cleaned up ${ROTATED_COUNT} expired backup file(s)."
echo "================================================================"
exit 0
