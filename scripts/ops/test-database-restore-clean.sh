#!/usr/bin/env bash
# ==============================================================================
# 🪐 OrbitoX — Isolated Clean-Cluster Database Restoration Verification (GC-07)
# ==============================================================================
# Executes an end-to-end, strictly isolated disaster recovery verification:
#   1. Provisions dedicated, disposable PostgreSQL 16 environments (Source & Target).
#      - Uses unique ports, volumes, and temporary cluster data directories.
#      - Strictly NEVER connects to or modifies the shared localhost:5432 cluster.
#   2. Migrates the source environment with full Prisma schema migrations.
#   3. Generates authentic pg_dump archives and SHA-256 sidecars.
#   4. Restores archives into the separate clean target environment:
#      - Tests safety guards against system database 'postgres'.
#      - Tests role pre-provisioning with NOLOGIN via vps-bootstrap-roles.sql.
#      - Tests top-level \gexec database ownership assignment outside transaction block.
#      - Restores database objects with pipeline error detection and ON_ERROR_STOP=1.
#      - Activates operational service roles post-restore via vps-enable-roles.sql.
#      - Recovers RestaurantOS credentials securely via psql \getenv.
#   5. Verifies table ownership (orbitox_migrator), ACLs, and security-definer routines.
#   6. Executes Stage B Catalog Inventory (Q-01 through Q-11) as orbitox_runtime (11/11 PASS).
#   7. Verifies authenticated application connections using intended runtime identities.
#   8. Cleans up all disposable resources on exit (fail-safe trap).
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Unique Run Identifier for complete isolation
RUN_ID="test_$(date +%s)_$RANDOM"

# Parse execution mode options
FORCE_DOCKER=false
FORCE_NATIVE=false
for arg in "$@"; do
  case "$arg" in
    --docker) FORCE_DOCKER=true ;;
    --native) FORCE_NATIVE=true ;;
  esac
done

USE_DOCKER=false
if [[ "$FORCE_DOCKER" == "true" ]]; then
  if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
    echo "================================================================"
    echo "ℹ️  Docker daemon is not running or unavailable on this host."
    echo "    Docker isolated recovery test: NOT RUN"
    echo "================================================================"
    exit 0
  fi
  USE_DOCKER=true
elif [[ "$FORCE_NATIVE" == "true" ]]; then
  USE_DOCKER=false
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  USE_DOCKER=true
else
  USE_DOCKER=false
fi

# Locate PostgreSQL utilities
PG16_INITDB=""
PG16_PG_CTL=""
PG16_PSQL=""

if [[ -x "/Applications/Postgres.app/Contents/Versions/16/bin/psql" ]]; then
  PG16_PSQL="/Applications/Postgres.app/Contents/Versions/16/bin/psql"
  export PATH="/Applications/Postgres.app/Contents/Versions/16/bin:${PATH}"
elif command -v psql >/dev/null 2>&1; then
  PG16_PSQL="$(command -v psql)"
fi

if [[ -x "/Applications/Postgres.app/Contents/Versions/16/bin/initdb" ]]; then
  PG16_INITDB="/Applications/Postgres.app/Contents/Versions/16/bin/initdb"
  PG16_PG_CTL="/Applications/Postgres.app/Contents/Versions/16/bin/pg_ctl"
elif command -v initdb >/dev/null 2>&1 && command -v pg_ctl >/dev/null 2>&1; then
  PG16_INITDB="$(command -v initdb)"
  PG16_PG_CTL="$(command -v pg_ctl)"
fi

if [[ "$USE_DOCKER" == "true" ]]; then
  if [[ -z "$PG16_PSQL" ]]; then
    echo "❌ FATAL: psql utility not found in PATH for Docker container verification mode." >&2
    exit 1
  fi
else
  if [[ -z "$PG16_INITDB" || -z "$PG16_PG_CTL" || -z "$PG16_PSQL" ]]; then
    echo "❌ FATAL: Required PostgreSQL utilities (initdb, pg_ctl, psql) not found for native isolated cluster mode." >&2
    echo "         Please install PostgreSQL 16 or start Docker daemon to run in Docker container mode." >&2
    exit 1
  fi
fi

PG_VERSION="$("$PG16_PSQL" --version | head -n 1)"

# Helper: Find a free TCP port starting from a baseline
find_free_port() {
  local port="${1}"
  while lsof -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; do
    port=$((port + 1))
  done
  echo "$port"
}

SRC_PORT="$(find_free_port 54431)"
TGT_PORT="$(find_free_port $((SRC_PORT + 1)))"

TMP_WORK_DIR="$(mktemp -d)"
SRC_DATA_DIR="${TMP_WORK_DIR}/src_data_${RUN_ID}"
TGT_DATA_DIR="${TMP_WORK_DIR}/tgt_data_${RUN_ID}"
BACKUP_DIR="${TMP_WORK_DIR}/backups_${RUN_ID}"

mkdir -m 0700 -p "$TMP_WORK_DIR" "$BACKUP_DIR"

SRC_CONTAINER="orbitox_pg16_src_${RUN_ID}"
TGT_CONTAINER="orbitox_pg16_tgt_${RUN_ID}"
DOCKER_NET="orbitox_net_${RUN_ID}"
SRC_VOL="orbitox_vol_src_${RUN_ID}"
TGT_VOL="orbitox_vol_tgt_${RUN_ID}"

echo "================================================================"
echo "🪐 TEST: ISOLATED CLEAN-CLUSTER DATABASE RESTORATION & LIFECYCLE"
echo "================================================================"
echo " Run Identifier     : ${RUN_ID}"
echo " Engine Mode        : $([[ "$USE_DOCKER" == "true" ]] && echo "Docker Container (postgres:16-alpine)" || echo "Native Isolated Cluster (initdb/pg_ctl)")"
echo " PostgreSQL Utility : ${PG16_PSQL} (${PG_VERSION})"
echo " Source Port (Iso)  : ${SRC_PORT}"
echo " Target Port (Iso)  : ${TGT_PORT}"
echo " Temporary Sandbox  : ${TMP_WORK_DIR}"
echo " Isolation Contract : Shared localhost:5432 strictly bypassed"
echo "────────────────────────────────────────────────────────────────"

cleanup() {
  local exit_code=$?
  echo "🧹 [Cleanup] Tearing down isolated PostgreSQL 16 environments..."
  if [[ "$USE_DOCKER" == "true" ]]; then
    docker stop "$SRC_CONTAINER" "$TGT_CONTAINER" >/dev/null 2>&1 || true
    docker rm -f "$SRC_CONTAINER" "$TGT_CONTAINER" >/dev/null 2>&1 || true
    docker network rm "$DOCKER_NET" >/dev/null 2>&1 || true
    docker volume rm "$SRC_VOL" "$TGT_VOL" >/dev/null 2>&1 || true
  else
    if [[ -d "$SRC_DATA_DIR" ]]; then
      "$PG16_PG_CTL" -D "$SRC_DATA_DIR" stop -m immediate >/dev/null 2>&1 || true
    fi
    if [[ -d "$TGT_DATA_DIR" ]]; then
      "$PG16_PG_CTL" -D "$TGT_DATA_DIR" stop -m immediate >/dev/null 2>&1 || true
    fi
  fi
  rm -rf "$TMP_WORK_DIR"
  echo "✅ [Cleanup] All disposable resources removed successfully."
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

# Test Role Credentials (isolated disposable passwords)
TEST_MIGRATOR_PASS="iso_migrator_pass_${RUN_ID}"
TEST_RUNTIME_PASS="iso_runtime_pass_${RUN_ID}"
TEST_MAINT_PASS="iso_maint_pass_${RUN_ID}"
TEST_ADMIN_AUDIT_PASS="iso_admin_audit_pass_${RUN_ID}"
TEST_HMS_READER_PASS="iso_hms_reader_pass_${RUN_ID}"
TEST_OUTBOX_PASS="iso_outbox_pass_${RUN_ID}"
TEST_ROS_PASS="iso_ros_pass_${RUN_ID}"

# ─────────────────────────────────────────────────────────────────────────────
# Phase 1: Initialize & Provision Isolated Source Environment
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Phase 1: Initializing disposable Source PostgreSQL 16 environment on port ${SRC_PORT}..."

if [[ "$USE_DOCKER" == "true" ]]; then
  docker network create "$DOCKER_NET" >/dev/null
  docker volume create "$SRC_VOL" >/dev/null
  docker run -d --name "$SRC_CONTAINER" --network "$DOCKER_NET" -v "${SRC_VOL}:/var/lib/postgresql/data" \
    -p "127.0.0.1:${SRC_PORT}:5432" -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null

  # Verify loopback-only binding via docker inspect
  SRC_HOST_IP="$(docker inspect --format='{{range $p, $conf := .NetworkSettings.Ports}}{{range $conf}}{{.HostIp}}{{end}}{{end}}' "$SRC_CONTAINER")"
  if [[ "$SRC_HOST_IP" != "127.0.0.1" ]]; then
    echo "❌ FAIL: Source container exposed on non-loopback address: ${SRC_HOST_IP:-none} (expected 127.0.0.1)" >&2
    exit 1
  fi
  echo "  ✅ Source container verified bound strictly to loopback: ${SRC_HOST_IP}"
else
  "$PG16_INITDB" -D "$SRC_DATA_DIR" -U postgres -A trust --no-instructions >/dev/null
  "$PG16_PG_CTL" -D "$SRC_DATA_DIR" -o "-p ${SRC_PORT} -k ${TMP_WORK_DIR} -h 127.0.0.1" -l "${TMP_WORK_DIR}/src_server.log" start >/dev/null
fi

for i in {1..30}; do
  if "$PG16_PSQL" -h 127.0.0.1 -p "$SRC_PORT" -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# 1a. Platform Source Setup
"$PG16_PSQL" -h 127.0.0.1 -p "$SRC_PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE orbitox_staging;" >/dev/null

PLATFORM_MIGRATOR_PASSWORD="$TEST_MIGRATOR_PASS" \
"$PG16_PSQL" -h 127.0.0.1 -p "$SRC_PORT" -U postgres -d orbitox_staging -v ON_ERROR_STOP=1 \
  -f "${REPO_ROOT}/scripts/db/vps-bootstrap-roles.sql" >/dev/null

echo "  ▶ Applying Platform schema migrations to source database as orbitox_migrator..."
export DATABASE_URL="postgresql://orbitox_migrator:${TEST_MIGRATOR_PASS}@127.0.0.1:${SRC_PORT}/orbitox_staging"
npx prisma migrate deploy --schema "${REPO_ROOT}/apps/platform/prisma/schema.prisma" >/dev/null
unset DATABASE_URL

# Reassign table and routine ownership to match migration standard
"$PG16_PSQL" -h 127.0.0.1 -p "$SRC_PORT" -U postgres -d orbitox_staging -v ON_ERROR_STOP=1 -c "
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I OWNER TO orbitox_migrator', r.tablename);
    END LOOP;
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE format('ALTER SEQUENCE public.%I OWNER TO orbitox_migrator', r.sequence_name);
    END LOOP;
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname NOT IN ('resolve_platform_audit_intent', 'recover_stale_platform_audit_intents')
    ) LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) OWNER TO orbitox_migrator', r.proname, r.args);
    END LOOP;
END
\$\$;" >/dev/null

ORBITOX_RUNTIME_PASSWORD="$TEST_RUNTIME_PASS" \
ORBITOX_MAINTENANCE_PASSWORD="$TEST_MAINT_PASS" \
ORBITOX_PLATFORM_ADMIN_AUDIT_PASSWORD="$TEST_ADMIN_AUDIT_PASS" \
HMS_AUDIT_READER_PASSWORD="$TEST_HMS_READER_PASS" \
ORBITOX_OUTBOX_RELAY_PASSWORD="$TEST_OUTBOX_PASS" \
"$PG16_PSQL" -h 127.0.0.1 -p "$SRC_PORT" -U postgres -d orbitox_staging -v ON_ERROR_STOP=1 \
  -f "${REPO_ROOT}/scripts/db/vps-enable-roles.sql" >/dev/null

# 1b. RestaurantOS Source Setup
"$PG16_PSQL" -h 127.0.0.1 -p "$SRC_PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE restaurant_os_staging;" >/dev/null

DATABASE_URL="postgresql://postgres@127.0.0.1:${SRC_PORT}/restaurant_os_staging" \
npx prisma migrate deploy --schema "${REPO_ROOT}/services/restaurant-api/prisma/schema.prisma" >/dev/null

ROS_DATABASE_PASSWORD="$TEST_ROS_PASS" \
"$PG16_PSQL" -h 127.0.0.1 -p "$SRC_PORT" -U postgres -d restaurant_os_staging -v ON_ERROR_STOP=1 <<-EOSQL >/dev/null
  \getenv app_pwd ROS_DATABASE_PASSWORD
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'restaurantos_app') THEN
      CREATE ROLE restaurantos_app WITH NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;
  END
  \$\$;
  ALTER ROLE restaurantos_app WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD :'app_pwd';
  GRANT USAGE ON SCHEMA public TO restaurantos_app;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO restaurantos_app;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO restaurantos_app;
EOSQL

echo "  ✅ Source environment fully migrated and prepared on port ${SRC_PORT}."

# ─────────────────────────────────────────────────────────────────────────────
# Phase 2: Generate Actual Database Dump Archives
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Phase 2: Generating PostgreSQL backup archives and SHA-256 sidecars..."

PLATFORM_BACKUP_DIR="${BACKUP_DIR}/platform"
ROS_BACKUP_DIR="${BACKUP_DIR}/restaurant-os"
mkdir -m 0700 -p "$PLATFORM_BACKUP_DIR" "$ROS_BACKUP_DIR"

APP_DATABASE_URL="postgresql://postgres@127.0.0.1:${SRC_PORT}/orbitox_staging" \
"${REPO_ROOT}/apps/platform/scripts/ops/backup-platform-postgres.sh" \
  --full \
  --output-dir "$PLATFORM_BACKUP_DIR" >/dev/null

DATABASE_URL="postgresql://postgres@127.0.0.1:${SRC_PORT}/restaurant_os_staging" \
"${REPO_ROOT}/services/restaurant-api/scripts/backup-postgres.sh" \
  --full \
  --output-dir "$ROS_BACKUP_DIR" >/dev/null

PLATFORM_ARCHIVE="$(find "$PLATFORM_BACKUP_DIR" -type f -name "platform_db_full_*.sql.gz" | head -n 1)"
ROS_ARCHIVE="$(find "$ROS_BACKUP_DIR" -type f -name "restaurantos_db_full_*.sql.gz" | head -n 1)"

if [[ ! -s "$PLATFORM_ARCHIVE" || ! -s "$ROS_ARCHIVE" ]]; then
  echo "❌ FAIL: Failed to generate non-empty backup archives!" >&2
  exit 1
fi

# Verify SHA-256 sidecars
p_exp="$(awk '{print $1}' "${PLATFORM_ARCHIVE}.sha256")"
p_act="$(shasum -a 256 "$PLATFORM_ARCHIVE" | awk '{print $1}')"
if [[ "$p_exp" != "$p_act" ]]; then
  echo "❌ FAIL: Platform archive checksum mismatch!" >&2
  exit 1
fi

r_exp="$(awk '{print $1}' "${ROS_ARCHIVE}.sha256")"
r_act="$(shasum -a 256 "$ROS_ARCHIVE" | awk '{print $1}')"
if [[ "$r_exp" != "$r_act" ]]; then
  echo "❌ FAIL: RestaurantOS archive checksum mismatch!" >&2
  exit 1
fi

echo "  ✅ Both Platform and RestaurantOS backup archives created with valid SHA-256 sidecars."

# ─────────────────────────────────────────────────────────────────────────────
# Phase 3: Provision Clean Target Environment & Execute Recovery Lifecycle
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Phase 3: Initializing separate clean Target PostgreSQL 16 cluster on port ${TGT_PORT}..."

if [[ "$USE_DOCKER" == "true" ]]; then
  docker volume create "$TGT_VOL" >/dev/null
  docker run -d --name "$TGT_CONTAINER" --network "$DOCKER_NET" -v "${TGT_VOL}:/var/lib/postgresql/data" \
    -p "127.0.0.1:${TGT_PORT}:5432" -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null

  # Verify loopback-only binding via docker inspect
  TGT_HOST_IP="$(docker inspect --format='{{range $p, $conf := .NetworkSettings.Ports}}{{range $conf}}{{.HostIp}}{{end}}{{end}}' "$TGT_CONTAINER")"
  if [[ "$TGT_HOST_IP" != "127.0.0.1" ]]; then
    echo "❌ FAIL: Target container exposed on non-loopback address: ${TGT_HOST_IP:-none} (expected 127.0.0.1)" >&2
    exit 1
  fi
  echo "  ✅ Target container verified bound strictly to loopback: ${TGT_HOST_IP}"
else
  "$PG16_INITDB" -D "$TGT_DATA_DIR" -U postgres -A trust --no-instructions >/dev/null
  "$PG16_PG_CTL" -D "$TGT_DATA_DIR" -o "-p ${TGT_PORT} -k ${TMP_WORK_DIR} -h 127.0.0.1" -l "${TMP_WORK_DIR}/tgt_server.log" start >/dev/null
fi

for i in {1..30}; do
  if "$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# 3a. Verify Safety Guards against system database 'postgres'
echo "  ▶ Asserting safety guards fail closed against system database 'postgres'..."

GUARD_FAILED=0
PLATFORM_MIGRATOR_PASSWORD="$TEST_MIGRATOR_PASS" \
"$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d postgres \
  -v ON_ERROR_STOP=1 \
  -f "${REPO_ROOT}/scripts/db/vps-bootstrap-roles.sql" >/dev/null 2>&1 || GUARD_FAILED=1

if [[ "$GUARD_FAILED" -ne 1 ]]; then
  echo "❌ FAIL: vps-bootstrap-roles.sql succeeded against 'postgres'! Safety guard did not abort." >&2
  exit 1
fi

GUARD_FAILED=0
ORBITOX_RUNTIME_PASSWORD="$TEST_RUNTIME_PASS" \
ORBITOX_MAINTENANCE_PASSWORD="$TEST_MAINT_PASS" \
ORBITOX_PLATFORM_ADMIN_AUDIT_PASSWORD="$TEST_ADMIN_AUDIT_PASS" \
HMS_AUDIT_READER_PASSWORD="$TEST_HMS_READER_PASS" \
ORBITOX_OUTBOX_RELAY_PASSWORD="$TEST_OUTBOX_PASS" \
"$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d postgres \
  -v ON_ERROR_STOP=1 \
  -f "${REPO_ROOT}/scripts/db/vps-enable-roles.sql" >/dev/null 2>&1 || GUARD_FAILED=1

if [[ "$GUARD_FAILED" -ne 1 ]]; then
  echo "❌ FAIL: vps-enable-roles.sql succeeded against 'postgres'! Safety guard did not abort." >&2
  exit 1
fi
echo "  ✅ Both bootstrap and enable role scripts strictly reject execution against 'postgres'."

# 3b. Platform Recovery Lifecycle on Clean Target
echo "  ▶ Executing Platform Recovery Lifecycle against ${TGT_PORT}/orbitox_staging..."
"$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE orbitox_staging;" >/dev/null

# Step 1: Pre-provision roles and ownership via vps-bootstrap-roles.sql in recovery mode
PLATFORM_MIGRATOR_PASSWORD="$TEST_MIGRATOR_PASS" \
PRE_CREATE_RESTORE_ROLES=1 \
"$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d orbitox_staging -v ON_ERROR_STOP=1 -v PRE_CREATE_RESTORE_ROLES=1 \
  -f "${REPO_ROOT}/scripts/db/vps-bootstrap-roles.sql" >/dev/null

# Assert database and schema ownership assigned to orbitox_migrator
DB_OWNER="$("$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d orbitox_staging -tAc \
  "SELECT pg_catalog.pg_get_userbyid(datdba) FROM pg_database WHERE datname = 'orbitox_staging';")"
if [[ "$DB_OWNER" != "orbitox_migrator" ]]; then
  echo "❌ FAIL: Target database owner is not orbitox_migrator, found: ${DB_OWNER}" >&2
  exit 1
fi
echo "  ✅ Top-level \gexec ALTER DATABASE correctly assigned database ownership to orbitox_migrator."

# Assert roles pre-created with NOLOGIN
ROLES_CHECK="$("$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d orbitox_staging -tAc "
  SELECT rolname, rolcanlogin, rolsuper, rolbypassrls FROM pg_roles WHERE rolname IN (
    'orbitox_runtime', 'orbitox_maintenance', 'orbitox_platform_admin_audit',
    'hms_audit_reader', 'orbitox_outbox_relay', 'orbitox_audit_resolver', 'orbitox_audit_recovery'
  ) ORDER BY rolname;
")"
for r in orbitox_runtime orbitox_maintenance orbitox_platform_admin_audit hms_audit_reader orbitox_outbox_relay orbitox_audit_resolver orbitox_audit_recovery; do
  if ! echo "$ROLES_CHECK" | grep -q "${r}|f|f|f"; then
    echo "❌ FAIL: Role $r must exist with rolcanlogin=f, rolsuper=f, rolbypassrls=f!" >&2
    exit 1
  fi
done
echo "  ✅ All 7 system roles confirmed pre-provisioned with NOLOGIN."

# Step 2: Stream restore dump with failure propagation and ON_ERROR_STOP=1
echo "  ▶ Restoring Platform dump archive with ON_ERROR_STOP=1..."
set -o pipefail
gunzip -c "$PLATFORM_ARCHIVE" | "$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d orbitox_staging -v ON_ERROR_STOP=1 >/dev/null
echo "  ✅ Platform archive restored cleanly with zero role or ACL errors."

# Step 3: Post-restore role enablement via vps-enable-roles.sql
ORBITOX_RUNTIME_PASSWORD="$TEST_RUNTIME_PASS" \
ORBITOX_MAINTENANCE_PASSWORD="$TEST_MAINT_PASS" \
ORBITOX_PLATFORM_ADMIN_AUDIT_PASSWORD="$TEST_ADMIN_AUDIT_PASS" \
HMS_AUDIT_READER_PASSWORD="$TEST_HMS_READER_PASS" \
ORBITOX_OUTBOX_RELAY_PASSWORD="$TEST_OUTBOX_PASS" \
"$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d orbitox_staging -v ON_ERROR_STOP=1 \
  -f "${REPO_ROOT}/scripts/db/vps-enable-roles.sql" >/dev/null

# Assert operational roles have LOGIN and helper roles remain NOLOGIN
ACTIVE_ROLES="$("$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d orbitox_staging -tAc "
  SELECT rolname, rolcanlogin FROM pg_roles WHERE rolname IN (
    'orbitox_runtime', 'orbitox_maintenance', 'orbitox_platform_admin_audit',
    'hms_audit_reader', 'orbitox_outbox_relay', 'orbitox_audit_resolver', 'orbitox_audit_recovery'
  );
")"
for r in orbitox_runtime orbitox_maintenance orbitox_platform_admin_audit hms_audit_reader orbitox_outbox_relay; do
  if ! echo "$ACTIVE_ROLES" | grep -q "${r}|t"; then
    echo "❌ FAIL: Role $r must have rolcanlogin=t!" >&2
    exit 1
  fi
done
for r in orbitox_audit_resolver orbitox_audit_recovery; do
  if ! echo "$ACTIVE_ROLES" | grep -q "${r}|f"; then
    echo "❌ FAIL: Helper role $r must have rolcanlogin=f!" >&2
    exit 1
  fi
done
echo "  ✅ Operational roles enabled WITH LOGIN; helper roles strictly locked with NOLOGIN."

# 3c. RestaurantOS Recovery Lifecycle on Clean Target
echo "  ▶ Executing RestaurantOS Recovery Lifecycle against ${TGT_PORT}/restaurant_os_staging..."
"$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE restaurant_os_staging;" >/dev/null

# Step 1: Pre-provision restaurantos_app with NOLOGIN and strict least-privilege attributes
"$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d restaurant_os_staging -v ON_ERROR_STOP=1 -c "
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'restaurantos_app') THEN
      CREATE ROLE restaurantos_app WITH NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;
  END
  \$\$;
" >/dev/null

# Step 2: Stream restore RestaurantOS dump archive
set -o pipefail
gunzip -c "$ROS_ARCHIVE" | "$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d restaurant_os_staging -v ON_ERROR_STOP=1 >/dev/null

# Step 3: Enable LOGIN and assign runtime password securely via psql \getenv from environment
ROS_DATABASE_PASSWORD="$TEST_ROS_PASS" \
"$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d restaurant_os_staging -v ON_ERROR_STOP=1 <<-EOSQL >/dev/null
  \getenv app_pwd ROS_DATABASE_PASSWORD
  \if :{?app_pwd}
  \else
    \echo '❌ ERROR: ROS_DATABASE_PASSWORD must be provided via environment variable.'
    \q 1
  \endif

  ALTER ROLE restaurantos_app WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD :'app_pwd';
  GRANT USAGE ON SCHEMA public TO restaurantos_app;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO restaurantos_app;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO restaurantos_app;
EOSQL

echo "  ✅ RestaurantOS restored and restaurantos_app credentials recovered securely via \getenv."

# ─────────────────────────────────────────────────────────────────────────────
# Phase 4: Verify Table Ownership, ACLs & Security-Definer Routines
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Phase 4: Verifying table ownership, ACLs, and security-definer routines..."

# 4a. Table Ownership
NON_MIGRATOR_TABLES="$("$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d orbitox_staging -tAc "
  SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public' AND tableowner != 'orbitox_migrator';
")"
if [[ -n "$NON_MIGRATOR_TABLES" ]]; then
  echo "❌ FAIL: Discovered tables not owned by orbitox_migrator: ${NON_MIGRATOR_TABLES}" >&2
  exit 1
fi
echo "  ✅ All restored public tables verified owned by orbitox_migrator."

# 4b. Rate Limit Bucket Privileges (Q-09)
RATE_LIMIT_PRIVS="$("$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d orbitox_staging -tAc "
  SELECT privilege_type
  FROM information_schema.role_table_grants
  WHERE grantee = 'orbitox_runtime'
    AND table_schema = 'public'
    AND table_name = 'PlatformRateLimitBucket'
    AND privilege_type IN ('DELETE', 'TRUNCATE');
")"
if [[ -n "$RATE_LIMIT_PRIVS" ]]; then
  echo "❌ FAIL: orbitox_runtime holds unauthorized DELETE/TRUNCATE on PlatformRateLimitBucket: ${RATE_LIMIT_PRIVS}" >&2
  exit 1
fi
echo "  ✅ Confirmed DELETE and TRUNCATE revoked from orbitox_runtime on PlatformRateLimitBucket."

# 4c. Security-Definer Routine Owners (Q-08)
ROUTINE_OWNERS="$("$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d orbitox_staging -tAc "
  SELECT p.proname, pg_catalog.pg_get_userbyid(p.proowner), p.prosecdef
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN (
    'resolve_platform_audit_intent',
    'recover_stale_platform_audit_intents',
    'ensure_platform_rate_limit_partitions',
    'maintain_platform_rate_limit_partitions'
  )
  ORDER BY p.proname;
")"

if ! echo "$ROUTINE_OWNERS" | grep -q "resolve_platform_audit_intent|orbitox_audit_resolver|t"; then
  echo "❌ FAIL: resolve_platform_audit_intent must be owned by orbitox_audit_resolver with secdef=t!" >&2
  exit 1
fi
if ! echo "$ROUTINE_OWNERS" | grep -q "recover_stale_platform_audit_intents|orbitox_audit_recovery|t"; then
  echo "❌ FAIL: recover_stale_platform_audit_intents must be owned by orbitox_audit_recovery with secdef=t!" >&2
  exit 1
fi
echo "  ✅ Security-definer routines verified with expected role ownership."

# ─────────────────────────────────────────────────────────────────────────────
# Phase 5: Execute Stage B Catalog Inventory (Q-01 through Q-11)
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Phase 5: Executing Stage B Catalog Inventory (Q-01 through Q-11) on restored database..."

INVENTORY_SCRIPT="${REPO_ROOT}/apps/platform/scripts/ops/run-staging-inventory.js"
export APP_DATABASE_URL="postgresql://orbitox_runtime:${TEST_RUNTIME_PASS}@127.0.0.1:${TGT_PORT}/orbitox_staging"
INVENTORY_OUTPUT="$(node "$INVENTORY_SCRIPT" 2>&1)"
INVENTORY_EXIT=$?
unset APP_DATABASE_URL

if [[ "$INVENTORY_EXIT" -ne 0 ]]; then
  echo "❌ FAIL: Catalog inventory failed with exit code ${INVENTORY_EXIT}!" >&2
  echo "$INVENTORY_OUTPUT"
  exit 1
fi

echo "  ✅ Stage B Catalog Inventory (Q-01 through Q-11) PASSED with 11/11 checks clean (exit code 0)."

# ─────────────────────────────────────────────────────────────────────────────
# Phase 6: Application Runtime Authentication & Query Verification
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Phase 6: Verifying runtime application authentication..."

# Platform: Connect as orbitox_runtime with password passed securely via environment
export PGPASSWORD="${TEST_RUNTIME_PASS}"
P_RESULT="$("$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U orbitox_runtime -d orbitox_staging -tAc \
  "SELECT current_user, count(*) FROM \"PlatformRateLimitBucket\";")"
unset PGPASSWORD
echo "  ✅ Platform: orbitox_runtime authenticated successfully (${P_RESULT})."

# RestaurantOS: Connect as restaurantos_app with password passed securely via environment
export PGPASSWORD="${TEST_ROS_PASS}"
R_RESULT="$("$PG16_PSQL" -h 127.0.0.1 -p "$TGT_PORT" -U restaurantos_app -d restaurant_os_staging -tAc \
  "SELECT current_user, count(*) FROM \"Tenant\";")"
unset PGPASSWORD
echo "  ✅ RestaurantOS: restaurantos_app authenticated successfully (${R_RESULT})."

echo "================================================================"
echo "🎉 ALL ISOLATED CLEAN-CLUSTER RESTORATION CHECKS PASSED CLEANLY!"
echo "================================================================"
exit 0
