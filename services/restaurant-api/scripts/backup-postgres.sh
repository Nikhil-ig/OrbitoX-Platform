#!/usr/bin/env bash
# ==============================================================================
# 🐘 RestaurantOS Multi-Tenant Database Backup & Export Utility
# ==============================================================================
# Usage:
#   ./scripts/backup-postgres.sh --full [--output-dir <dir>]
#   ./scripts/backup-postgres.sh --full --container orbitox_staging_ros_db
#   ./scripts/backup-postgres.sh --tenant <tenant_id> [--output-dir <dir>]
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUTPUT_DIR="${PROJECT_ROOT}/data/backups"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%SZ")"
DATABASE_URL="${DATABASE_URL:-}"
RUNTIME_URL="${RESTAURANTOS_RUNTIME_URL:-http://127.0.0.1:4010}"
PLATFORM_TOKEN="${RESTAURANTOS_PLATFORM_TOKEN:-}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
PRESERVE_OWNERSHIP=true
CONTAINER_NAME="${DOCKER_CONTAINER:-}"
DB_USER="${PGUSER:-postgres}"
DB_NAME="${PGDATABASE:-restaurant_os_staging}"

MODE=""
TENANT_ID=""

print_usage() {
  local exit_code="${1:-1}"
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --full                 Perform a complete cluster-level PostgreSQL database dump
  --tenant <tenant_id>   Export authoritative configuration and data for a single tenant
  --portable             Omit owner and privilege statements (default preserves owners and ACLs)
  --container <name>     Dump from a running Docker container via docker exec (no host ports needed)
  --output-dir <dir>     Directory to store backups (default: ./data/backups)
  --retention-days <N>   Days to keep old backups before rotating (default: 7)
  --db-name <name>       Database name for container backup (default: restaurant_os_staging)
  --db-user <user>       Database user for container backup (default: postgres)
  --help                 Show this help message

Environment Variables:
  DATABASE_URL                PostgreSQL connection string
  DOCKER_CONTAINER            Container name for docker exec backup (e.g. orbitox_staging_ros_db)
  RESTAURANTOS_RUNTIME_URL    Runtime base URL (default: http://127.0.0.1:4010)
  RESTAURANTOS_PLATFORM_TOKEN Platform admin token (required for tenant export)
EOF
  exit "$exit_code"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --full)
      MODE="full"
      shift
      ;;
    --tenant)
      MODE="tenant"
      TENANT_ID="$2"
      shift 2
      ;;
    --portable)
      PRESERVE_OWNERSHIP=false
      shift
      ;;
    --container)
      CONTAINER_NAME="$2"
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
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --retention-days)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --help)
      print_usage 0
      ;;
    *)
      echo "Unknown option: $1"
      print_usage
      ;;
  esac
done

if [[ -z "$MODE" ]]; then
  echo "Error: Must specify either --full or --tenant <tenant_id>"
  print_usage
fi

# Auto-detect running container if no DATABASE_URL and no CONTAINER_NAME
if [[ "$MODE" == "full" && -z "$DATABASE_URL" && -z "$CONTAINER_NAME" ]]; then
  if command -v docker >/dev/null 2>&1; then
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^orbitox_staging_ros_db$"; then
      CONTAINER_NAME="orbitox_staging_ros_db"
    fi
  fi
fi

mkdir -p "$OUTPUT_DIR"

compute_checksum() {
  local target_file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$target_file" > "${target_file}.sha256"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$target_file" > "${target_file}.sha256"
  else
    echo "Warning: sha256sum/shasum not found, skipping checksum generation."
  fi
}

if [[ "$MODE" == "full" ]]; then
  if [[ -z "$DATABASE_URL" && -z "$CONTAINER_NAME" ]]; then
    echo "❌ Error: Target is required via --container, DATABASE_URL, or running compose container."
    exit 1
  fi

  BACKUP_FILE="${OUTPUT_DIR}/restaurantos_db_full_${TIMESTAMP}.sql.gz"
  echo "🚀 [$(date '+%Y-%m-%d %H:%M:%S')] Starting FULL database backup..."
  echo "   Destination: ${BACKUP_FILE}"
  if [[ -n "$CONTAINER_NAME" ]]; then
    echo "   Method     : Docker Exec (Container: ${CONTAINER_NAME}, DB: ${DB_NAME})"
  else
    echo "   Method     : Host pg_dump"
  fi

  DUMP_ARGS=("--clean" "--if-exists")
  if [[ "$PRESERVE_OWNERSHIP" != "true" ]]; then
    DUMP_ARGS+=("--no-owner" "--no-privileges")
  fi

  if [[ -n "$CONTAINER_NAME" ]]; then
    docker exec -i "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" "${DUMP_ARGS[@]}" | gzip -9 > "$BACKUP_FILE"
  else
    if ! command -v pg_dump >/dev/null 2>&1; then
      echo "❌ Error: pg_dump utility not found in PATH."
      exit 1
    fi
    pg_dump "$DATABASE_URL" "${DUMP_ARGS[@]}" | gzip -9 > "$BACKUP_FILE"
  fi

  if [[ ! -s "$BACKUP_FILE" ]]; then
    echo "❌ Error: Backup failed, created file is empty."
    rm -f "$BACKUP_FILE"
    exit 1
  fi

  compute_checksum "$BACKUP_FILE"
  FILE_SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
  echo "✅ FULL database backup completed successfully (${FILE_SIZE})."
  echo "   Checksum written to: ${BACKUP_FILE}.sha256"

  # Retention cleanup — preserve at least 1 backup
  echo "🧹 Rotating backups older than ${RETENTION_DAYS} days in ${OUTPUT_DIR}..."
  EXISTING_BACKUPS=()
  while IFS= read -r f; do
    [[ -n "$f" ]] && EXISTING_BACKUPS+=("$f")
  done < <(find "$OUTPUT_DIR" -maxdepth 1 -type f -name "restaurantos_*.sql.gz" | sort)

  TOTAL_BACKUPS=${#EXISTING_BACKUPS[@]}
  ROTATED_COUNT=0

  if [[ "$TOTAL_BACKUPS" -gt 1 ]]; then
    while IFS= read -r old_file; do
      if [[ -n "$old_file" ]]; then
        if [[ $((TOTAL_BACKUPS - ROTATED_COUNT)) -gt 1 ]]; then
          rm -f "$old_file" "${old_file}.sha256"
          ROTATED_COUNT=$((ROTATED_COUNT + 1))
        fi
      fi
    done < <(find "$OUTPUT_DIR" -maxdepth 1 -type f -name "restaurantos_*.sql.gz" -mtime "+${RETENTION_DAYS}" 2>/dev/null || true)
  fi

  echo "✅ Rotation complete. Cleaned up ${ROTATED_COUNT} expired backup file(s)."
  exit 0
fi

if [[ "$MODE" == "tenant" ]]; then
  if [[ -z "$TENANT_ID" ]]; then
    echo "❌ Error: Missing tenant ID. Use --tenant <tenant_id>"
    exit 1
  fi

  if [[ -z "$PLATFORM_TOKEN" && -z "$DATABASE_URL" ]]; then
    echo "❌ Error: Either RESTAURANTOS_PLATFORM_TOKEN or DATABASE_URL must be provided."
    exit 1
  fi

  BACKUP_FILE="${OUTPUT_DIR}/tenant_${TENANT_ID}_${TIMESTAMP}.json.gz"
  RAW_TMP="${OUTPUT_DIR}/tenant_${TENANT_ID}_${TIMESTAMP}.json.tmp"
  echo "🚀 [$(date '+%Y-%m-%d %H:%M:%S')] Starting TENANT export for '${TENANT_ID}'..."
  echo "   Destination: ${BACKUP_FILE}"

  # Attempt export via runtime HTTP API
  HTTP_CODE=$(curl -s -w "%{http_code}" -o "$RAW_TMP" \
    -H "Authorization: Bearer ${PLATFORM_TOKEN}" \
    -H "Accept: application/json" \
    "${RUNTIME_URL}/internal/tenants/${TENANT_ID}/export" || echo "000")

  if [[ "$HTTP_CODE" -ne 200 ]]; then
    echo "⚠️  Runtime API export returned HTTP ${HTTP_CODE} or server unreachable."
    echo "   Attempting direct database export via Node.js CLI..."
    rm -f "$RAW_TMP"
    
    DATABASE_URL="${DATABASE_URL}" npx tsx -e "
      import { PrismaClient } from '@prisma/client';
      import { TenantProvisioningService } from './src/shared';
      const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
      const service = new TenantProvisioningService(prisma);
      service.exportTenantData('${TENANT_ID}').then(data => {
        process.stdout.write(JSON.stringify(data, null, 2));
        return prisma.\$disconnect();
      }).catch(err => {
        console.error(err.message);
        process.exit(1);
      });
    " > "$RAW_TMP"
  fi

  if [[ ! -s "$RAW_TMP" ]]; then
    echo "❌ Error: Tenant export produced no data."
    rm -f "$RAW_TMP"
    exit 1
  fi

  gzip -9 -c "$RAW_TMP" > "$BACKUP_FILE"
  rm -f "$RAW_TMP"

  compute_checksum "$BACKUP_FILE"
  FILE_SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
  echo "✅ Tenant export for '${TENANT_ID}' completed successfully (${FILE_SIZE})."
  echo "   Checksum written to: ${BACKUP_FILE}.sha256"
  exit 0
fi
