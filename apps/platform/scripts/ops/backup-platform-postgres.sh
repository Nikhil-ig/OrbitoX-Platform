#!/usr/bin/env bash
# ==============================================================================
# 🪐 OrbitoX Platform — Production Database Backup & Retention Utility (GC-03)
# ==============================================================================
# Usage:
#   ./scripts/ops/backup-platform-postgres.sh --full [--output-dir <dir>] [--retention-days <N>]
#   ./scripts/ops/backup-platform-postgres.sh --container orbitox_staging_platform_db
#   ./scripts/ops/backup-platform-postgres.sh --schema-only [--output-dir <dir>]
#
# Environment Variables:
#   APP_DATABASE_URL    Primary Platform PostgreSQL connection URL (or DATABASE_URL)
#   DOCKER_CONTAINER    Target Docker container name (e.g. orbitox_staging_platform_db)
#   BACKUP_OUTPUT_DIR   Default output directory for backups
#   BACKUP_RETENTION    Retention in days (default: 7)
# ==============================================================================

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
OUTPUT_DIR="${BACKUP_OUTPUT_DIR:-${PLATFORM_ROOT}/data/backups}"
RETENTION_DAYS="${BACKUP_RETENTION:-7}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%SZ")"

# Database URL resolution: APP_DATABASE_URL takes precedence over DATABASE_URL
DB_URL="${APP_DATABASE_URL:-${DATABASE_URL:-}}"
CONTAINER_NAME="${DOCKER_CONTAINER:-}"
DB_USER="${PGUSER:-postgres}"
DB_NAME="${PGDATABASE:-orbitox_staging}"

MODE="full"
PRESERVE_OWNERSHIP=true

print_usage() {
  local exit_code="${1:-0}"
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --full                 Perform complete Platform database dump (default)
  --schema-only          Dump schema, constraints, and migrations metadata only
  --portable             Omit owner and privilege statements (default preserves owners and ACLs)
  --container <name>     Dump from a running Docker container via docker exec (no host ports needed)
  --output-dir <dir>     Directory to store backups (default: ./data/backups)
  --retention-days <N>   Days of backups to keep before rotation (default: 7)
  --db-url <url>         Override target PostgreSQL connection URL
  --db-name <name>       Database name for container backup (default: orbitox_staging)
  --db-user <user>       Database user for container backup (default: postgres)
  --help                 Show this help message

Environment Variables:
  APP_DATABASE_URL       Platform PostgreSQL connection URL (e.g. postgresql://user:pass@host:5432/db)
  DOCKER_CONTAINER       Container name for docker exec backup (e.g. orbitox_staging_platform_db)
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
    --portable)
      PRESERVE_OWNERSHIP=false
      shift
      ;;
    --container)
      CONTAINER_NAME="$2"
      shift 2
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
    --db-name)
      DB_NAME="$2"
      shift 2
      ;;
    --db-user)
      DB_USER="$2"
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

# If no DB_URL and no CONTAINER_NAME provided, auto-detect running compose container
if [[ -z "$DB_URL" && -z "$CONTAINER_NAME" ]]; then
  if command -v docker >/dev/null 2>&1; then
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^orbitox_staging_platform_db$"; then
      CONTAINER_NAME="orbitox_staging_platform_db"
    fi
  fi
fi

if [[ -z "$DB_URL" && -z "$CONTAINER_NAME" ]]; then
  echo "❌ Error: Platform database connection target is required via --container, APP_DATABASE_URL, or --db-url." >&2
  exit 1
fi

mkdir -m 0700 -p "$OUTPUT_DIR"
chmod 0700 "$OUTPUT_DIR" 2>/dev/null || true

# Compute checksum helper
compute_checksum() {
  local target_file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$target_file" > "${target_file}.sha256"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$target_file" > "${target_file}.sha256"
  else
    echo "⚠️  Warning: Neither sha256sum nor shasum available; checksum skipped." >&2
    return 1
  fi
  chmod 0600 "${target_file}.sha256" 2>/dev/null || true
}

DUMP_ARGS=("--clean" "--if-exists")
if [[ "$PRESERVE_OWNERSHIP" != "true" ]]; then
  DUMP_ARGS+=("--no-owner" "--no-privileges")
fi
if [[ "$MODE" == "schema-only" ]]; then
  DUMP_ARGS+=("--schema-only")
fi

BACKUP_FILE="${OUTPUT_DIR}/platform_db_${MODE}_${TIMESTAMP}.sql.gz"

echo "================================================================"
echo "🪐 ORBITOX PLATFORM POSTGRESQL BACKUP UTILITY"
echo "================================================================"
echo " Mode        : ${MODE}"
echo " Destination : ${BACKUP_FILE}"
if [[ -n "$CONTAINER_NAME" ]]; then
  echo " Method      : Docker Exec (Container: ${CONTAINER_NAME}, DB: ${DB_NAME})"
else
  safe_target="$(echo "$DB_URL" | sed -E 's|://([^:]+):([^@]+)@|://\1:***@|g')"
  echo " Method      : Host pg_dump (Target DB: ${safe_target})"
fi
echo " Retention   : ${RETENTION_DAYS} days"
echo " Started At  : $(date -u '+%Y-%m-%d %H:%M:%SZ')"
echo " Preservation: $([ "$PRESERVE_OWNERSHIP" = "true" ] && echo "Table owners & ACLs preserved" || echo "Portable (no owners/privileges)")"
echo "────────────────────────────────────────────────────────────────"

# Execute pg_dump with clean, if-exists, and gzip compression
if [[ -n "$CONTAINER_NAME" ]]; then
  docker exec -i "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" "${DUMP_ARGS[@]}" | gzip -9 > "$BACKUP_FILE"
else
  if ! command -v pg_dump >/dev/null 2>&1; then
    echo "❌ Error: pg_dump client utility was not found in PATH." >&2
    exit 1
  fi
  pg_dump "$DB_URL" "${DUMP_ARGS[@]}" | gzip -9 > "$BACKUP_FILE"
fi

# Verify non-empty output
if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "❌ Error: Backup failed — generated file is missing or zero bytes." >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

chmod 0600 "$BACKUP_FILE" 2>/dev/null || true
compute_checksum "$BACKUP_FILE"

BACKUP_SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
echo "✅ Backup successfully created (${BACKUP_SIZE})."
echo "   Artifact : ${BACKUP_FILE}"
echo "   Checksum : ${BACKUP_FILE}.sha256"

# Apply rolling retention rotation — ensure we NEVER delete all backups
echo "🧹 Checking for Platform backups older than ${RETENTION_DAYS} days in ${OUTPUT_DIR}..."
EXISTING_BACKUPS=()
while IFS= read -r f; do
  [[ -n "$f" ]] && EXISTING_BACKUPS+=("$f")
done < <(find "$OUTPUT_DIR" -maxdepth 1 -type f -name "platform_db_*.sql.gz" | sort)

TOTAL_BACKUPS=${#EXISTING_BACKUPS[@]}
ROTATED_COUNT=0

if [[ "$TOTAL_BACKUPS" -gt 1 ]]; then
  while IFS= read -r old_file; do
    if [[ -n "$old_file" ]]; then
      # Double check we keep at least 1 backup
      if [[ $((TOTAL_BACKUPS - ROTATED_COUNT)) -gt 1 ]]; then
        rm -f "$old_file" "${old_file}.sha256"
        ROTATED_COUNT=$((ROTATED_COUNT + 1))
      fi
    fi
  done < <(find "$OUTPUT_DIR" -maxdepth 1 -type f -name "platform_db_*.sql.gz" -mtime "+${RETENTION_DAYS}" 2>/dev/null || true)
fi

echo "✅ Rotation complete. Cleaned up ${ROTATED_COUNT} expired backup file(s) (preserved ${TOTAL_BACKUPS} -> $((TOTAL_BACKUPS - ROTATED_COUNT)) backups)."
echo "================================================================"
exit 0
