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
TEST_POSTGRES_PASS="iso_super_pass_${RUN_ID}"
TEST_MIGRATOR_PASS="iso_migrator_pass_${RUN_ID}"
TEST_RUNTIME_PASS="iso_runtime_pass_${RUN_ID}"
TEST_MAINT_PASS="iso_maint_pass_${RUN_ID}"
TEST_ADMIN_AUDIT_PASS="iso_admin_audit_pass_${RUN_ID}"
TEST_HMS_READER_PASS="iso_hms_reader_pass_${RUN_ID}"
TEST_OUTBOX_PASS="iso_outbox_pass_${RUN_ID}"
TEST_ROS_PASS="iso_ros_pass_${RUN_ID}"

# Restrictive password file for initdb superuser initialization (0600)
SUPER_PWFILE="${TMP_WORK_DIR}/super_password.txt"
echo "$TEST_POSTGRES_PASS" > "$SUPER_PWFILE"
chmod 0600 "$SUPER_PWFILE"

# Helper: Execute psql as cluster superuser with password authentication and no interactive prompting (-w)
run_psql_super() {
  local port="$1"
  local dbname="$2"
  shift 2
  PGPASSWORD="${TEST_POSTGRES_PASS}" "$PG16_PSQL" -w -h 127.0.0.1 -p "$port" -U postgres -d "$dbname" "$@"
}

# Helper: Verify real password authentication (success with valid password, rejection with invalid password)
verify_password_authentication() {
  local label="$1"
  local port="$2"
  local dbname="$3"
  local role="$4"
  local valid_password="$5"
  local test_query="$6"

  echo "  ▶ [Password Auth] Verifying ${role} on ${dbname} (${label} - Port ${port})..."

  # 1. Correct password authentication and role identity check
  local auth_user=""
  if ! auth_user="$(PGPASSWORD="${valid_password}" "$PG16_PSQL" -w -h 127.0.0.1 -p "$port" -U "$role" -d "$dbname" -tAc "SELECT current_user;" 2>&1)"; then
    echo "❌ FAIL: Authentication failed for valid credentials (${label} - ${role}): ${auth_user}" >&2
    exit 1
  fi
  auth_user="$(echo "$auth_user" | tr -d '[:space:]')"
  if [[ "$auth_user" != "$role" ]]; then
    echo "❌ FAIL: Authenticated identity mismatch for ${label}! Expected ${role}, got: ${auth_user}" >&2
    exit 1
  fi

  # 2. Permitted database query execution
  local query_res=""
  if ! query_res="$(PGPASSWORD="${valid_password}" "$PG16_PSQL" -w -h 127.0.0.1 -p "$port" -U "$role" -d "$dbname" -tAc "${test_query}" 2>&1)"; then
    echo "❌ FAIL: Permitted query '${test_query}' failed for ${role} on ${dbname}: ${query_res}" >&2
    exit 1
  fi
  echo "    ✅ Valid password authenticated as '${role}'; permitted query succeeded (${query_res})."

  # 3. Wrong password rejection test
  local wrong_pass="deliberately_invalid_password_${RANDOM}_$RANDOM"
  local wrong_err=""
  if wrong_err="$(PGPASSWORD="${wrong_pass}" "$PG16_PSQL" -w -h 127.0.0.1 -p "$port" -U "$role" -d "$dbname" -tAc "SELECT 1;" 2>&1)"; then
    echo "❌ FAIL: Security violation: PostgreSQL accepted incorrect password for ${role} on ${dbname} (${label})!" >&2
    exit 1
  fi
  if ! echo "$wrong_err" | grep -qiE "password authentication failed|fe_sendauth"; then
    echo "❌ FAIL: Authentication rejection did not match password failure (${label}): ${wrong_err}" >&2
    exit 1
  fi
  echo "    ✅ Wrong password strictly rejected by PostgreSQL (exit non-zero with password authentication failure)."
}

# Helper: Verify SCRAM-SHA-256 verifiers exist in pg_authid without exposing verifier secrets
verify_scram_verifiers() {
  local port="$1"
  local dbname="$2"
  local label="$3"

  echo "  ▶ [SCRAM Verifiers] Verifying SCRAM-SHA-256 verifiers on ${dbname} (${label} - Port ${port})..."

  local verifier_summary=""
  verifier_summary="$(run_psql_super "$port" "$dbname" -tAc "
    SELECT rolname,
           (rolpassword IS NOT NULL AND rolpassword LIKE 'SCRAM-SHA-256$%') AS has_scram,
           rolcanlogin
    FROM pg_authid
    WHERE rolname IN (
      'orbitox_migrator',
      'orbitox_runtime',
      'orbitox_maintenance',
      'orbitox_platform_admin_audit',
      'hms_audit_reader',
      'orbitox_outbox_relay',
      'orbitox_audit_resolver',
      'orbitox_audit_recovery'
    )
    ORDER BY rolname;
  ")"

  for r in orbitox_migrator orbitox_runtime orbitox_maintenance orbitox_platform_admin_audit hms_audit_reader orbitox_outbox_relay; do
    if ! echo "$verifier_summary" | grep -q "${r}|t|t"; then
      echo "❌ FAIL: Role ${r} missing valid SCRAM-SHA-256 verifier or LOGIN privilege in pg_authid (${label})!" >&2
      exit 1
    fi
  done

  for r in orbitox_audit_resolver orbitox_audit_recovery; do
    if ! echo "$verifier_summary" | grep -q "${r}|f|f"; then
      echo "❌ FAIL: Helper role ${r} has unauthorized verifier or LOGIN privilege in pg_authid (${label})!" >&2
      exit 1
    fi
  done

  echo "    ✅ All 6 operational roles confirmed storing valid SCRAM-SHA-256 verifiers in pg_authid without exposing verifier secrets."
  echo "    ✅ Helper audit roles confirmed locked with zero password verifier and NOLOGIN."
}

# ─────────────────────────────────────────────────────────────────────────────
# Phase 1: Initialize & Provision Isolated Source Environment
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Phase 1: Initializing disposable Source PostgreSQL 16 environment on port ${SRC_PORT}..."

if [[ "$USE_DOCKER" == "true" ]]; then
  docker network create "$DOCKER_NET" >/dev/null
  docker volume create "$SRC_VOL" >/dev/null
  POSTGRES_PASSWORD="$TEST_POSTGRES_PASS" \
  docker run -d --name "$SRC_CONTAINER" --network "$DOCKER_NET" -v "${SRC_VOL}:/var/lib/postgresql/data" \
    -p "127.0.0.1:${SRC_PORT}:5432" \
    -e POSTGRES_PASSWORD \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_HOST_AUTH_METHOD=scram-sha-256 \
    -e POSTGRES_INITDB_ARGS="--auth-host=scram-sha-256 --auth-local=scram-sha-256" \
    postgres:16-alpine >/dev/null

  # Verify loopback-only binding via docker inspect
  SRC_HOST_IP="$(docker inspect --format='{{range $p, $conf := .NetworkSettings.Ports}}{{range $conf}}{{.HostIp}}{{end}}{{end}}' "$SRC_CONTAINER")"
  if [[ "$SRC_HOST_IP" != "127.0.0.1" ]]; then
    echo "❌ FAIL: Source container exposed on non-loopback address: ${SRC_HOST_IP:-none} (expected 127.0.0.1)" >&2
    exit 1
  fi
  echo "  ✅ Source container verified bound strictly to loopback: ${SRC_HOST_IP}"
else
  "$PG16_INITDB" -D "$SRC_DATA_DIR" -U postgres -A scram-sha-256 --auth-host=scram-sha-256 --auth-local=scram-sha-256 --pwfile="$SUPER_PWFILE" --no-instructions >/dev/null
  "$PG16_PG_CTL" -D "$SRC_DATA_DIR" -o "-p ${SRC_PORT} -k ${TMP_WORK_DIR} -h 127.0.0.1" -l "${TMP_WORK_DIR}/src_server.log" start >/dev/null
fi

for i in {1..30}; do
  if PGPASSWORD="${TEST_POSTGRES_PASS}" "$PG16_PSQL" -w -h 127.0.0.1 -p "$SRC_PORT" -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# 1a. Platform Source Setup
run_psql_super "$SRC_PORT" postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE orbitox_staging;" >/dev/null

PLATFORM_MIGRATOR_PASSWORD="$TEST_MIGRATOR_PASS" \
run_psql_super "$SRC_PORT" orbitox_staging -v ON_ERROR_STOP=1 \
  -f "${REPO_ROOT}/scripts/db/vps-bootstrap-roles.sql" >/dev/null

echo "  ▶ Applying Platform schema migrations to source database as orbitox_migrator..."
export DATABASE_URL="postgresql://orbitox_migrator:${TEST_MIGRATOR_PASS}@127.0.0.1:${SRC_PORT}/orbitox_staging"
npx prisma migrate deploy --schema "${REPO_ROOT}/apps/platform/prisma/schema.prisma" >/dev/null
unset DATABASE_URL

echo "  ▶ Verifying genuine migration ownership under orbitox_migrator (zero superuser normalization)..."

# 1. Assert migration connection identity is orbitox_migrator
export PGPASSWORD="${TEST_MIGRATOR_PASS}"
MIG_IDENTITY="$("$PG16_PSQL" -w -h 127.0.0.1 -p "$SRC_PORT" -U orbitox_migrator -d orbitox_staging -tAc "SELECT current_user;")"
unset PGPASSWORD
if [[ "$MIG_IDENTITY" != "orbitox_migrator" ]]; then
  echo "❌ FAIL: Expected migration identity orbitox_migrator, found: ${MIG_IDENTITY}" >&2
  exit 1
fi
echo "  ✅ Migration connection identity verified as orbitox_migrator."

# 2. Assert 100% of public tables created by migrations are naturally owned by orbitox_migrator
NON_MIGRATOR_SRC_TABLES="$(run_psql_super "$SRC_PORT" orbitox_staging -tAc "
  SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public' AND tableowner != 'orbitox_migrator';
")"
if [[ -n "$NON_MIGRATOR_SRC_TABLES" ]]; then
  echo "❌ FAIL: Migrations produced tables not owned by orbitox_migrator: ${NON_MIGRATOR_SRC_TABLES}" >&2
  exit 1
fi
echo "  ✅ All source public tables confirmed naturally owned by orbitox_migrator."

# 3. Assert 100% of public sequences created by migrations are naturally owned by orbitox_migrator
NON_MIGRATOR_SRC_SEQS="$(run_psql_super "$SRC_PORT" orbitox_staging -tAc "
  SELECT s.relname, pg_catalog.pg_get_userbyid(s.relowner)
  FROM pg_class s
  JOIN pg_namespace n ON n.oid = s.relnamespace
  WHERE s.relkind = 'S' AND n.nspname = 'public' AND pg_catalog.pg_get_userbyid(s.relowner) != 'orbitox_migrator';
")"
if [[ -n "$NON_MIGRATOR_SRC_SEQS" ]]; then
  echo "❌ FAIL: Migrations produced sequences not owned by orbitox_migrator: ${NON_MIGRATOR_SRC_SEQS}" >&2
  exit 1
fi
echo "  ✅ All source public sequences confirmed naturally owned by orbitox_migrator."

# 4. Assert security-definer routines have dedicated owners and others belong to orbitox_migrator
SRC_ROUTINE_OWNERS="$(run_psql_super "$SRC_PORT" orbitox_staging -tAc "
  SELECT p.proname, pg_catalog.pg_get_userbyid(p.proowner), p.prosecdef
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN (
    'resolve_platform_audit_intent',
    'recover_stale_platform_audit_intents',
    'ensure_platform_rate_limit_partitions',
    'maintain_platform_rate_limit_partitions',
    'close_customer_organization',
    'keep_customer_organization_owner'
  )
  ORDER BY p.proname;
")"

if ! echo "$SRC_ROUTINE_OWNERS" | grep -q "resolve_platform_audit_intent|orbitox_audit_resolver|t"; then
  echo "❌ FAIL: Source resolve_platform_audit_intent must be owned by orbitox_audit_resolver with secdef=t!" >&2
  exit 1
fi
if ! echo "$SRC_ROUTINE_OWNERS" | grep -q "recover_stale_platform_audit_intents|orbitox_audit_recovery|t"; then
  echo "❌ FAIL: Source recover_stale_platform_audit_intents must be owned by orbitox_audit_recovery with secdef=t!" >&2
  exit 1
fi
for fn in ensure_platform_rate_limit_partitions maintain_platform_rate_limit_partitions close_customer_organization keep_customer_organization_owner; do
  if ! echo "$SRC_ROUTINE_OWNERS" | grep -q "${fn}|orbitox_migrator|"; then
    echo "❌ FAIL: Source routine $fn must be owned by orbitox_migrator!" >&2
    exit 1
  fi
done
echo "  ✅ Security-definer and application routines verified with correct migration ownership."

ORBITOX_RUNTIME_PASSWORD="$TEST_RUNTIME_PASS" \
ORBITOX_MAINTENANCE_PASSWORD="$TEST_MAINT_PASS" \
ORBITOX_PLATFORM_ADMIN_AUDIT_PASSWORD="$TEST_ADMIN_AUDIT_PASS" \
HMS_AUDIT_READER_PASSWORD="$TEST_HMS_READER_PASS" \
ORBITOX_OUTBOX_RELAY_PASSWORD="$TEST_OUTBOX_PASS" \
run_psql_super "$SRC_PORT" orbitox_staging -v ON_ERROR_STOP=1 \
  -f "${REPO_ROOT}/scripts/db/vps-enable-roles.sql" >/dev/null

# Verify real password authentication for Platform Source (orbitox_migrator)
verify_password_authentication "Platform Source" "$SRC_PORT" "orbitox_staging" "orbitox_migrator" "$TEST_MIGRATOR_PASS" "SELECT count(*) FROM \"_prisma_migrations\";"

# 1b. RestaurantOS Source Setup
run_psql_super "$SRC_PORT" postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE restaurant_os_staging;" >/dev/null

DATABASE_URL="postgresql://postgres:${TEST_POSTGRES_PASS}@127.0.0.1:${SRC_PORT}/restaurant_os_staging" \
npx prisma migrate deploy --schema "${REPO_ROOT}/services/restaurant-api/prisma/schema.prisma" >/dev/null

ROS_DATABASE_PASSWORD="$TEST_ROS_PASS" \
run_psql_super "$SRC_PORT" restaurant_os_staging -v ON_ERROR_STOP=1 <<-EOSQL >/dev/null
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

# Verify real password authentication for RestaurantOS Source (restaurantos_app)
verify_password_authentication "RestaurantOS Source" "$SRC_PORT" "restaurant_os_staging" "restaurantos_app" "$TEST_ROS_PASS" "SELECT count(*) FROM \"Tenant\";"

echo "  ✅ Source environment fully migrated and prepared on port ${SRC_PORT}."

# ─────────────────────────────────────────────────────────────────────────────
# Phase 2: Generate Actual Database Dump Archives
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Phase 2: Generating PostgreSQL backup archives and SHA-256 sidecars..."

PLATFORM_BACKUP_DIR="${BACKUP_DIR}/platform"
ROS_BACKUP_DIR="${BACKUP_DIR}/restaurant-os"
mkdir -m 0700 -p "$PLATFORM_BACKUP_DIR" "$ROS_BACKUP_DIR"

APP_DATABASE_URL="postgresql://postgres:${TEST_POSTGRES_PASS}@127.0.0.1:${SRC_PORT}/orbitox_staging" \
"${REPO_ROOT}/apps/platform/scripts/ops/backup-platform-postgres.sh" \
  --full \
  --output-dir "$PLATFORM_BACKUP_DIR" >/dev/null

DATABASE_URL="postgresql://postgres:${TEST_POSTGRES_PASS}@127.0.0.1:${SRC_PORT}/restaurant_os_staging" \
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
  POSTGRES_PASSWORD="$TEST_POSTGRES_PASS" \
  docker run -d --name "$TGT_CONTAINER" --network "$DOCKER_NET" -v "${TGT_VOL}:/var/lib/postgresql/data" \
    -p "127.0.0.1:${TGT_PORT}:5432" \
    -e POSTGRES_PASSWORD \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_HOST_AUTH_METHOD=scram-sha-256 \
    -e POSTGRES_INITDB_ARGS="--auth-host=scram-sha-256 --auth-local=scram-sha-256" \
    postgres:16-alpine >/dev/null

  # Verify loopback-only binding via docker inspect
  TGT_HOST_IP="$(docker inspect --format='{{range $p, $conf := .NetworkSettings.Ports}}{{range $conf}}{{.HostIp}}{{end}}{{end}}' "$TGT_CONTAINER")"
  if [[ "$TGT_HOST_IP" != "127.0.0.1" ]]; then
    echo "❌ FAIL: Target container exposed on non-loopback address: ${TGT_HOST_IP:-none} (expected 127.0.0.1)" >&2
    exit 1
  fi
  echo "  ✅ Target container verified bound strictly to loopback: ${TGT_HOST_IP}"
else
  "$PG16_INITDB" -D "$TGT_DATA_DIR" -U postgres -A scram-sha-256 --auth-host=scram-sha-256 --auth-local=scram-sha-256 --pwfile="$SUPER_PWFILE" --no-instructions >/dev/null
  "$PG16_PG_CTL" -D "$TGT_DATA_DIR" -o "-p ${TGT_PORT} -k ${TMP_WORK_DIR} -h 127.0.0.1" -l "${TMP_WORK_DIR}/tgt_server.log" start >/dev/null
fi

for i in {1..30}; do
  if PGPASSWORD="${TEST_POSTGRES_PASS}" "$PG16_PSQL" -w -h 127.0.0.1 -p "$TGT_PORT" -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# 3a. Verify Safety Guards against system database 'postgres'
echo "  ▶ Asserting safety guards fail closed against system database 'postgres'..."

GUARD_FAILED=0
PLATFORM_MIGRATOR_PASSWORD="$TEST_MIGRATOR_PASS" \
run_psql_super "$TGT_PORT" postgres -v ON_ERROR_STOP=1 \
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
run_psql_super "$TGT_PORT" postgres -v ON_ERROR_STOP=1 \
  -f "${REPO_ROOT}/scripts/db/vps-enable-roles.sql" >/dev/null 2>&1 || GUARD_FAILED=1

if [[ "$GUARD_FAILED" -ne 1 ]]; then
  echo "❌ FAIL: vps-enable-roles.sql succeeded against 'postgres'! Safety guard did not abort." >&2
  exit 1
fi
echo "  ✅ Both bootstrap and enable role scripts strictly reject execution against 'postgres'."

# 3b. Platform Recovery Lifecycle on Clean Target
echo "  ▶ Executing Platform Recovery Lifecycle against ${TGT_PORT}/orbitox_staging..."
run_psql_super "$TGT_PORT" postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE orbitox_staging;" >/dev/null

# Step 1: Pre-provision roles and ownership via vps-bootstrap-roles.sql in recovery mode
PLATFORM_MIGRATOR_PASSWORD="$TEST_MIGRATOR_PASS" \
PRE_CREATE_RESTORE_ROLES=1 \
run_psql_super "$TGT_PORT" orbitox_staging -v ON_ERROR_STOP=1 -v PRE_CREATE_RESTORE_ROLES=1 \
  -f "${REPO_ROOT}/scripts/db/vps-bootstrap-roles.sql" >/dev/null

# Assert database and schema ownership assigned to orbitox_migrator
DB_OWNER="$(run_psql_super "$TGT_PORT" orbitox_staging -tAc \
  "SELECT pg_catalog.pg_get_userbyid(datdba) FROM pg_database WHERE datname = 'orbitox_staging';")"
if [[ "$DB_OWNER" != "orbitox_migrator" ]]; then
  echo "❌ FAIL: Target database owner is not orbitox_migrator, found: ${DB_OWNER}" >&2
  exit 1
fi
echo "  ✅ Top-level \gexec ALTER DATABASE correctly assigned database ownership to orbitox_migrator."

# Assert roles pre-created with NOLOGIN
ROLES_CHECK="$(run_psql_super "$TGT_PORT" orbitox_staging -tAc "
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
gunzip -c "$PLATFORM_ARCHIVE" | run_psql_super "$TGT_PORT" orbitox_staging -v ON_ERROR_STOP=1 >/dev/null
echo "  ✅ Platform archive restored cleanly with zero role or ACL errors."

# Step 3: Post-restore role enablement via vps-enable-roles.sql
ORBITOX_RUNTIME_PASSWORD="$TEST_RUNTIME_PASS" \
ORBITOX_MAINTENANCE_PASSWORD="$TEST_MAINT_PASS" \
ORBITOX_PLATFORM_ADMIN_AUDIT_PASSWORD="$TEST_ADMIN_AUDIT_PASS" \
HMS_AUDIT_READER_PASSWORD="$TEST_HMS_READER_PASS" \
ORBITOX_OUTBOX_RELAY_PASSWORD="$TEST_OUTBOX_PASS" \
run_psql_super "$TGT_PORT" orbitox_staging -v ON_ERROR_STOP=1 \
  -f "${REPO_ROOT}/scripts/db/vps-enable-roles.sql" >/dev/null

# Assert operational roles have LOGIN and helper roles remain NOLOGIN
ACTIVE_ROLES="$(run_psql_super "$TGT_PORT" orbitox_staging -tAc "
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
run_psql_super "$TGT_PORT" postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE restaurant_os_staging;" >/dev/null

# Step 1: Pre-provision restaurantos_app with NOLOGIN and strict least-privilege attributes
run_psql_super "$TGT_PORT" restaurant_os_staging -v ON_ERROR_STOP=1 -c "
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
gunzip -c "$ROS_ARCHIVE" | run_psql_super "$TGT_PORT" restaurant_os_staging -v ON_ERROR_STOP=1 >/dev/null

# Step 3: Enable LOGIN and assign runtime password securely via psql \getenv from environment
ROS_DATABASE_PASSWORD="$TEST_ROS_PASS" \
run_psql_super "$TGT_PORT" restaurant_os_staging -v ON_ERROR_STOP=1 <<-EOSQL >/dev/null
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
NON_MIGRATOR_TABLES="$(run_psql_super "$TGT_PORT" orbitox_staging -tAc "
  SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public' AND tableowner != 'orbitox_migrator';
")"
if [[ -n "$NON_MIGRATOR_TABLES" ]]; then
  echo "❌ FAIL: Discovered tables not owned by orbitox_migrator: ${NON_MIGRATOR_TABLES}" >&2
  exit 1
fi
echo "  ✅ All restored public tables verified owned by orbitox_migrator."

# 4b. Rate Limit Bucket Privileges (Q-09)
RATE_LIMIT_PRIVS="$(run_psql_super "$TGT_PORT" orbitox_staging -tAc "
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
ROUTINE_OWNERS="$(run_psql_super "$TGT_PORT" orbitox_staging -tAc "
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
# Phase 6: Application Runtime Authentication & Real Password Verification
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Phase 6: Verifying real password authentication & wrong-password rejection across all identities..."

# 1. Platform Source: orbitox_migrator
verify_password_authentication "Platform Source" "$SRC_PORT" "orbitox_staging" "orbitox_migrator" "$TEST_MIGRATOR_PASS" "SELECT count(*) FROM \"_prisma_migrations\";"

# 2. Platform Restored Target: orbitox_runtime
verify_password_authentication "Platform Restored Target" "$TGT_PORT" "orbitox_staging" "orbitox_runtime" "$TEST_RUNTIME_PASS" "SELECT current_user, count(*) FROM \"PlatformRateLimitBucket\";"

# 3. RestaurantOS Source: restaurantos_app
verify_password_authentication "RestaurantOS Source" "$SRC_PORT" "restaurant_os_staging" "restaurantos_app" "$TEST_ROS_PASS" "SELECT current_user, count(*) FROM \"Tenant\";"

# 4. RestaurantOS Restored Target: restaurantos_app
verify_password_authentication "RestaurantOS Restored Target" "$TGT_PORT" "restaurant_os_staging" "restaurantos_app" "$TEST_ROS_PASS" "SELECT current_user, count(*) FROM \"Tenant\";"

# 5. Verify SCRAM-SHA-256 verifiers exist in pg_authid without exposing verifier secrets
verify_scram_verifiers "$SRC_PORT" "orbitox_staging" "Source Environment"
verify_scram_verifiers "$TGT_PORT" "orbitox_staging" "Restored Target"

echo "  ✅ Real password authentication verified for all 4 required database/role combinations."
echo "  ✅ Wrong-password authentication strictly rejected by PostgreSQL with exit non-zero."
echo "  ✅ SCRAM-SHA-256 password verifiers confirmed stored in pg_authid with zero secret leakage."

echo "================================================================"
echo "🎉 ALL ISOLATED CLEAN-CLUSTER RESTORATION CHECKS PASSED CLEANLY!"
echo "================================================================"
exit 0
