# 🪐 OrbitoX Platform — Daily Release Procedure (SOP)
## Repeatable 12-Step Staging & Production Deployment Workflow

> **Document ID:** `SOP-OPS-012`  
> **Target Environment:** Ubuntu 24.04 LTS VPS (4 vCPU, 8 GB RAM, 100 GB NVMe)  
> **Deployment Architecture:** Docker Compose v2 with Ingress Network Isolation  
> **Primary Domains:** `staging.orbitox.io` (Platform) | `ros.staging.orbitox.io` (RestaurantOS)  
> **Security Baseline:** Zero-Trust Multi-Tenancy, Scoped RBAC, Read-Only Runtime

---

## 1. Overview & Release Principles

This Standard Operating Procedure (SOP) governs all daily releases, scheduled deployments, and emergency hotfixes to the OrbitoX staging and production infrastructure.

### Guiding Principles:
1. **Never Deploy Unverified Code:** Every release candidate must pass all offline unit, integration, and type-checking suites prior to touching target infrastructure.
2. **Immutable Artifacts:** Every build artifact is uniquely tagged with the exact Git commit SHA. Never deploy mutable `:latest` tags.
3. **Backup Before Mutation:** An authoritative, cryptographic pre-deployment database backup of both Platform and RestaurantOS databases must succeed and be verified before applying any database migrations or replacing application containers.
4. **Least-Privilege Migrations:** Schema migrations must execute strictly under the DDL owner role (`orbitox_migrator`), never under the unprivileged runtime role (`orbitox_runtime`) and never under raw superuser (`postgres`).
5. **Immediate Post-Deploy Catalog Inventory:** Release sign-off requires an automated run of the PostgreSQL catalog safety inventory (`run-staging-inventory.js`) under `orbitox_runtime` reporting 100% `PASS` on queries Q-01 through Q-11.
6. **Strict Rollback Criteria:** If any preflight, health check, or catalog verification query fails, rollback is triggered immediately according to Step 12.

---

## 2. The 12-Step Release Workflow

```mermaid
flowchart TD
    S01["Step 1: Git SHA Capture & Worktree Check"] --> S02["Step 2: Offline Test Suite Pass"]
    S02 --> S03["Step 3: Immutable Image Tagging"]
    S03 --> S04["Step 4: Pre-Deploy Database Backup"]
    S04 --> S05["Step 5: Controlled Schema Migrations"]
    S05 --> S06["Step 6: Container Replacement"]
    S06 --> S07["Step 7: Ingress & Caddy Reload"]
    S07 --> S08["Step 8: Health Check Verification"]
    S08 --> S09["Step 9: Catalog Safety Inventory (GC-07)"]
    S09 --> S10["Step 10: User Journey Smoke Testing"]
    S10 --> S11["Step 11: 15-Minute Telemetry Observation"]
    S11 --> S12{"Deployment Healthy?"}
    S12 -- Yes --> Success["Release Sign-Off Complete"]
    S12 -- No --> Rollback["Step 12: Trigger Rollback SOP"]
```

---

### Step 1: Git SHA Capture & Worktree Verification

Before starting the release, confirm the repository is on the authorized release branch (`feat/console-ui-unification` or `main`), the working directory is clean, and capture the release commit hash:

```bash
cd /opt/orbitox

# Ensure clean worktree
if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Error: Working tree has uncommitted modifications. Aborting."
  git status
  exit 1
fi

# Fetch and verify HEAD
git fetch origin feat/console-ui-unification
git checkout feat/console-ui-unification
git pull origin feat/console-ui-unification

export DEPLOY_GIT_SHA="$(git rev-parse HEAD)"
export DEPLOY_TIMESTAMP="$(date -u +"%Y%m%d_%H%M%SZ")"
echo "📌 Release Target SHA : ${DEPLOY_GIT_SHA}"
echo "⏱️  Release Timestamp  : ${DEPLOY_TIMESTAMP}"
```

---

### Step 2: Local / CI Offline Test Suite Pass

Execute the complete verification pipeline. Every test must pass with exit code `0`:

```bash
# 1. Platform Type Check
cd /opt/orbitox/apps/platform
pnpm run type-check

# 2. Platform Core Security & Unit Suite
pnpm test:unit

# 3. RestaurantOS Full Test Suite (including 90/90 Crash Durability Trials)
cd /opt/orbitox/services/restaurant-api
pnpm run test:all

# 4. Docker Compose Configuration Validation
cd /opt/orbitox/infra/docker
docker compose -f docker-compose.staging.yml config --quiet
echo "✅ Offline test suite and compose configuration validated successfully."
```

---

### Step 3: Immutable Image Tagging & Build

Build container images tagged with the exact Git SHA:

```bash
cd /opt/orbitox/infra/docker

# Build images with immutable Git SHA tags
docker compose -f docker-compose.staging.yml build \
  --build-arg GIT_SHA="${DEPLOY_GIT_SHA}"

# Tag immutable releases
docker tag orbitox-platform:staging "orbitox-platform:${DEPLOY_GIT_SHA}"
docker tag orbitox-restaurant-os:staging "orbitox-restaurant-os:${DEPLOY_GIT_SHA}"

echo "✅ Immutable container images tagged for SHA: ${DEPLOY_GIT_SHA}"
```

---

### Step 4: Pre-Deployment Database Backup & Checksum Verification

Run full backups of both PostgreSQL databases. Tables, owners, and ACLs must be preserved. Verify checksums before proceeding:

```bash
echo "📦 Creating pre-deployment backups..."

# 1. Platform Database Backup (via docker exec - zero host ports needed)
/opt/orbitox/apps/platform/scripts/ops/backup-platform-postgres.sh \
  --full \
  --container "orbitox_staging_platform_db" \
  --output-dir /var/backups/orbitox/platform

# 2. RestaurantOS Database Backup (via docker exec - zero host ports needed)
/opt/orbitox/services/restaurant-api/scripts/backup-postgres.sh \
  --full \
  --container "orbitox_staging_ros_db" \
  --output-dir /var/backups/orbitox/restaurant-os

# 3. Verify latest backup checksums exist and are non-empty
LATEST_PLATFORM_BACKUP="$(ls -t /var/backups/orbitox/platform/platform_db_full_*.sql.gz | head -1)"
LATEST_ROS_BACKUP="$(ls -t /var/backups/orbitox/restaurant-os/restaurantos_db_full_*.sql.gz | head -1)"

sha256sum -c "${LATEST_PLATFORM_BACKUP}.sha256"
sha256sum -c "${LATEST_ROS_BACKUP}.sha256"

echo "✅ Pre-deployment backups verified:"
echo "   Platform : ${LATEST_PLATFORM_BACKUP}"
echo "   ROS      : ${LATEST_ROS_BACKUP}"
```

---

### Step 5: Controlled Schema Migrations

Apply pending Prisma migrations under `orbitox_migrator`. The runtime role (`orbitox_runtime`) does not possess DDL privileges and must never be used for migrations.

```bash
# Source environment credentials
set -a
source /opt/orbitox/infra/docker/.env
set +a

# 1. Platform Database Migrations (Run under orbitox_migrator)
# Export DATABASE_URL into shell environment to avoid exposing credentials on host process CLI
export DATABASE_URL="postgresql://orbitox_migrator:${PLATFORM_MIGRATOR_PASSWORD}@platform-db:5432/orbitox_staging"
docker compose -f /opt/orbitox/infra/docker/docker-compose.staging.yml run --rm --no-deps \
  -e DATABASE_URL \
  platform pnpm prisma migrate deploy
unset DATABASE_URL

# 2. Enable Platform Service Roles (Passwords ingested securely via psql \getenv)
# Pass only variable names to docker exec (Docker forwards values from shell environment)
export ORBITOX_RUNTIME_PASSWORD
export ORBITOX_MAINTENANCE_PASSWORD
export ORBITOX_PLATFORM_ADMIN_AUDIT_PASSWORD
export HMS_AUDIT_READER_PASSWORD
export ORBITOX_OUTBOX_RELAY_PASSWORD

docker exec -i \
  -e ORBITOX_RUNTIME_PASSWORD \
  -e ORBITOX_MAINTENANCE_PASSWORD \
  -e ORBITOX_PLATFORM_ADMIN_AUDIT_PASSWORD \
  -e HMS_AUDIT_READER_PASSWORD \
  -e ORBITOX_OUTBOX_RELAY_PASSWORD \
  orbitox_staging_platform_db psql -U postgres -d orbitox_staging \
  -f /scripts/db/vps-enable-roles.sql

# 3. RestaurantOS Database Migrations (Run under postgres superuser/migrator)
export DATABASE_URL="postgresql://postgres:${ROS_POSTGRES_SUPERUSER_PASSWORD}@ros-db:5432/restaurant_os_staging"
docker compose -f /opt/orbitox/infra/docker/docker-compose.staging.yml run --rm --no-deps \
  -e DATABASE_URL \
  restaurant-os pnpm prisma migrate deploy
unset DATABASE_URL

echo "✅ Database schema migrations applied and service roles enabled successfully."
```

---

### Step 6: Compose Deployment Update / Container Replacement

Replace running application containers with the newly built images using Docker Compose:

```bash
cd /opt/orbitox/infra/docker

# Recreate application containers with new build
docker compose -f docker-compose.staging.yml up -d --no-deps platform restaurant-os

# Verify container status
docker compose -f docker-compose.staging.yml ps
```

---

### Step 7: Ingress & Caddy Reload

Validate and gracefully reload Caddy configuration without dropping active connections:

```bash
# Validate Caddyfile syntax inside container
docker exec orbitox_staging_caddy caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy configuration dynamically
docker exec orbitox_staging_caddy caddy reload --config /etc/caddy/Caddyfile

echo "✅ Ingress proxy reloaded."
```

---

### Step 8: Health Check Verification

Probe both platform endpoints through Caddy ingress:

```bash
echo "🔍 Probing health endpoints..."

# 1. Platform Control Center Health (port 3005 via ingress)
PLATFORM_HEALTH="$(curl -fsS https://staging.orbitox.io/api/health || curl -fsS http://127.0.0.1:3005/api/health)"
echo "Platform Health: ${PLATFORM_HEALTH}"

# 2. RestaurantOS Runtime Health (port 4010 via ingress)
ROS_HEALTH="$(curl -fsS https://ros.staging.orbitox.io/healthz || curl -fsS http://127.0.0.1:4010/healthz)"
echo "RestaurantOS Health: ${ROS_HEALTH}"

# 3. Direct Caddy Internal Health
curl -fsS http://127.0.0.1/healthz
echo "✅ All service health endpoints responded HTTP 200 OK."
```

---

### Step 9: Staging Inventory Catalog Safety Run (GC-07)

Run the strictly read-only catalog safety inventory under `orbitox_runtime`. This proves that role security, RLS enforcement, table ownership, audit log write-only ACLs, and partition boundaries are intact:

```bash
cd /opt/orbitox/infra/docker

# Run inventory engine inside the platform container:
docker compose -f docker-compose.staging.yml exec -T platform \
  node scripts/ops/run-staging-inventory.js
```

> [!CRITICAL]
> All 11 verification queries (`Q-01` through `Q-11`) must report `PASS`. Exit code must be `0`.  
> If any query fails, pause the release and prepare for immediate rollback.

---

### Step 10: User Journey Smoke Testing

Execute smoke tests against core critical user journeys:

#### Platform Control Center User Journeys:
1. **Admin Authentication & Session:**
   - Authenticate via `/api/auth/session` with `ORBITOX_ADMIN_TOKEN`.
   - Verify JWT issuance, cookie `SameSite=Strict`, `HttpOnly`, `Secure`.
2. **Tenant Lifecycle & Provisioning:**
   - Query `/api/tenants` to ensure existing tenant records load correctly.
   - Provision a test staging tenant (`tenant_smoke_test`) and verify tenant-scoped schema isolation.
3. **Fleet Stream Real-time SSE:**
   - Connect to `/api/fleet/stream` with `Accept: text/event-stream`.
   - Verify immediate delivery of heartbeat frame and unbuffered chunking (`flush_interval -1`).
4. **Audit Log Ingestion & Immutability:**
   - Dispatch a test administrative event.
   - Verify event appears in `PlatformAuditEvent` partition without runtime update/delete capability.

#### RestaurantOS User Journeys:
1. **Bridge Authentication & Platform Handshake:**
   - Request tenant status using `RESTAURANTOS_PLATFORM_TOKEN`.
   - Verify tenant context resolution without cross-tenant bleed.
2. **Order Lifecycle Transaction:**
   - Submit a test dining order via RestaurantOS API.
   - Verify atomic journal write, receipt sequence increment, and kitchen display ticket generation.
3. **Menu Catalog Query:**
   - Query `/api/menu` for the tenant. Verify category, price, and modifier isolation.

---

### Step 11: 15-Minute Telemetry & Log Observation

Observe live runtime metrics and logs for 15 minutes post-deployment:

```bash
# Stream live logs from all containers
docker compose -f /opt/orbitox/infra/docker/docker-compose.staging.yml logs -f --tail=100
```

#### Acceptance Criteria during Observation Window:
- **Error Rate:** HTTP 5xx responses must be < 0.1% of total requests.
- **Connection Pools:** PostgreSQL active connections must remain well within pool limits (`max_connections = 100`).
- **Memory Consumption:** No container exceeds its assigned memory budget:
  - Caddy < 256 MB
  - Platform < 2048 MB
  - RestaurantOS < 1024 MB
  - Platform DB < 1536 MB
  - ROS DB < 1024 MB
  - Redis < 384 MB
- **Redis Health:** Zero out-of-memory errors (`evicted_keys` within policy).

---

### Step 12: Rollback Reference & Procedure

#### Rollback Trigger Criteria:
Trigger rollback immediately if any of the following occur:
1. Container crash-loop or exit code != 0.
2. Health check endpoint fails or returns non-200 for > 60 seconds.
3. Step 9 catalog safety inventory reports `FAIL` or `INCOMPLETE` on any query.
4. Error rate exceeds 1% during Step 11 observation window.
5. Critical smoke test failure in Step 10.

#### Step-by-Step Rollback Execution:

```bash
echo "🚨 INITIATING EMERGENCY ROLLBACK..."

# 1. Stop application containers immediately
cd /opt/orbitox/infra/docker
docker compose -f docker-compose.staging.yml stop platform restaurant-os

# 2. If schema migration occurred, restore pre-deploy databases
echo "Restoring Platform Database from pre-deployment backup: ${LATEST_PLATFORM_BACKUP}..."
gunzip -c "$LATEST_PLATFORM_BACKUP" | \
  docker exec -i orbitox_staging_platform_db psql -U postgres -d orbitox_staging

echo "Restoring RestaurantOS Database from pre-deployment backup: ${LATEST_ROS_BACKUP}..."
gunzip -c "$LATEST_ROS_BACKUP" | \
  docker exec -i orbitox_staging_ros_db psql -U postgres -d restaurant_os_staging

# 3. Checkout previous known-good Git commit
cd /opt/orbitox
PREVIOUS_GOOD_SHA="$(git rev-parse HEAD~1)" # or exact rollback SHA
git checkout "$PREVIOUS_GOOD_SHA"

# 4. Rebuild and restart application containers with previous code
cd /opt/orbitox/infra/docker
docker compose -f docker-compose.staging.yml up -d --build platform restaurant-os

# 5. Reload Caddy
docker exec orbitox_staging_caddy caddy reload --config /etc/caddy/Caddyfile

# 6. Re-run health checks and inventory
curl -fsS https://staging.orbitox.io/api/health
curl -fsS https://ros.staging.orbitox.io/healthz

docker compose -f /opt/orbitox/infra/docker/docker-compose.staging.yml exec -T platform \
  node scripts/ops/run-staging-inventory.js

echo "✅ Emergency rollback completed successfully. Incident report required."
```

---

## 3. Release Sign-Off Checklist

| # | Step | Owner | Status | Notes |
|---|---|---|---|---|
| 1 | Git SHA captured & clean worktree verified | Operator | [ ] | SHA: `________________` |
| 2 | Offline unit, integration & type-check passed | CI / Operator | [ ] | Zero failures |
| 3 | Immutable images built and tagged | Operator | [ ] | Tag: `${DEPLOY_GIT_SHA}` |
| 4 | Pre-deploy database backups verified | Operator | [ ] | SHA-256 confirmed |
| 5 | Migrations applied under `orbitox_migrator` | Operator | [ ] | Schema updated |
| 6 | Application containers replaced | Docker Compose | [ ] | Rolling restart |
| 7 | Caddy ingress validated and reloaded | Caddy | [ ] | Zero-downtime |
| 8 | Health checks verified HTTP 200 | Operator | [ ] | `/api/health`, `/healthz` |
| 9 | Staging inventory catalog (Q-01..Q-11) passed | Script | [ ] | Exit code 0 |
| 10 | Core user journey smoke tests passed | QA / Operator | [ ] | Auth, Tenants, Orders |
| 11 | 15-minute telemetry observation clean | Operator | [ ] | Error rate < 0.1% |
| 12 | Release sign-off & audit log record created | Release Lead | [ ] | Tagged in Git |
