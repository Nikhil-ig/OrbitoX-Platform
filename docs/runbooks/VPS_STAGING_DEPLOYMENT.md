# 🪐 OrbitoX Platform — VPS Staging Deployment & Execution Runbook (GC-02, GC-05, GC-07)

> **Target Infrastructure:** Ubuntu 24.04 LTS (4 vCPU, 8 GB RAM, 100 GB NVMe)  
> **Deployment Architecture:** Docker Compose v2 with Ingress Network Isolation  
> **Primary Staging Domain:** `staging.orbitox.io` (Platform)  
> **Hospitality Staging Domain:** `ros.staging.orbitox.io` (RestaurantOS)  
> **Release Baseline SHA:** `278b4c289763a87e4527688958dfae7421048b82`  

---

## 1. Architecture & Deployment Blueprint

```
[ Internet Clients ]
        │ (Ports 80, 443 only)
        ▼
┌───────────────────────────────────────────────────────────┐
│               Caddy v2 Edge Proxy Container               │
│               (orbitox_staging_caddy: 256M, 0.25 vCPU)    │
└──────────────┬─────────────────────────────┬──────────────┘
               │ (orbitox_ingress_net)       │ (orbitox_ingress_net)
               ▼                             ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│  OrbitoX Platform Next.js   │ │   RestaurantOS Runtime      │
│  (orbitox_staging_platform) │ │(orbitox_staging_restaurant_os)
│  Port: 3005 (Internal)      │ │ Port: 4010 (Internal)       │
│  Memory: 2048M | CPU: 1.25  │ │ Memory: 1024M | CPU: 0.75   │
└──────┬───────────────┬──────┘ └──────────────┬──────────────┘
       │               │                       │
       │(platform_net) │(platform_net)         │(ros_net)
       ▼               ▼                       ▼
┌──────────────┐ ┌──────────────┐       ┌──────────────┐
│ Platform DB  │ │   Redis 7    │       │    ROS DB    │
│ (PostgreSQL) │ │ (Auth Cache) │       │ (PostgreSQL) │
│ 1536M / 0.75 │ │ 512M / 0.25  │       │ 1024M / 0.50 │
└──────────────┘ └──────────────┘       └──────────────┘
```

### Network Topology & Isolation Boundaries
- **`orbitox_ingress_net` (Shared Bridge)**:
  - Connects `caddy`, `platform`, and `restaurant-os`.
  - Exposes edge HTTP/HTTPS ports 80 and 443 on host. Backends communicate only through internal service aliases (`caddy`, `platform:3005`, `restaurant-os:4010`).
- **`orbitox_platform_net` (Internal Bridge - No Host Gateway)**:
  - Connects `platform`, `platform-db`, and `redis`.
  - Zero access from `restaurant-os` or external networks. Zero host ports published.
- **`orbitox_ros_net` (Internal Bridge - No Host Gateway)**:
  - Connects `restaurant-os` and `ros-db`.
  - Zero access from `platform`, `redis`, or external networks. Zero host ports published.

### Resource Budget & Safety Allocations
- **Platform Web**: 2048 MB RAM, 1.25 vCPU
- **Platform DB**: 1536 MB RAM, 0.75 vCPU
- **RestaurantOS Web**: 1024 MB RAM, 0.75 vCPU
- **RestaurantOS DB**: 1024 MB RAM, 0.50 vCPU
- **Redis Mesh**: 512 MB RAM, 0.25 vCPU
- **Caddy Ingress**: 256 MB RAM, 0.25 vCPU
- **Total Containers Limit**: 6400 MB RAM (~6.25 GB), 3.75 vCPU
- **Host Reserve (OS, SSH, Docker Engine)**: 1792 MB RAM (~1.75 GB), 0.25 vCPU

---

## 2. Pre-Deployment Configuration on VPS

### Step 2.1: Clone and Check Out Baseline
```bash
git clone https://github.com/Nikhil-ig/OrbitoX-Platform.git /opt/orbitox
cd /opt/orbitox

# Explicitly pin and check out the verified release baseline commit
git checkout 278b4c289763a87e4527688958dfae7421048b82

# Assert exact commit integrity before proceeding
CURRENT_COMMIT="$(git rev-parse HEAD)"
if [[ "$CURRENT_COMMIT" != "278b4c289763a87e4527688958dfae7421048b82" ]]; then
  echo "❌ Fatal: Commit mismatch! Expected 278b4c289763a87e4527688958dfae7421048b82, got ${CURRENT_COMMIT}" >&2
  exit 1
fi
echo "✅ Verified baseline commit: ${CURRENT_COMMIT}"
```

### Step 2.2: Prepare Environment File (`.env`)
Create the staging environment file `/opt/orbitox/infra/docker/.env` using the template below:

```bash
# Ingress and Domain Configuration
STAGING_DOMAIN=staging.orbitox.io
RESTAURANT_DOMAIN=ros.staging.orbitox.io

# PostgreSQL Superuser Passwords (never committed)
PLATFORM_POSTGRES_SUPERUSER_PASSWORD=GENERATED_SUPERUSER_PASS_1
ROS_POSTGRES_SUPERUSER_PASSWORD=GENERATED_SUPERUSER_PASS_2

# Platform Application Role Passwords (matching vps-enable-roles.sql)
PLATFORM_MIGRATOR_PASSWORD=GENERATED_MIGRATOR_PASS
ORBITOX_RUNTIME_PASSWORD=GENERATED_RUNTIME_PASS
ORBITOX_MAINTENANCE_PASSWORD=GENERATED_MAINTENANCE_PASS
ORBITOX_PLATFORM_ADMIN_AUDIT_PASSWORD=GENERATED_ADMIN_AUDIT_PASS
HMS_AUDIT_READER_PASSWORD=GENERATED_AUDIT_READER_PASS
ORBITOX_OUTBOX_RELAY_PASSWORD=GENERATED_OUTBOX_RELAY_PASS

# RestaurantOS Database Password (for restaurantos_app)
ROS_DATABASE_PASSWORD=GENERATED_ROS_DB_PASS

# Shared Cache & Pub/Sub Password
REDIS_PASSWORD=GENERATED_REDIS_STRONG_PASS

# Platform Cryptographic Master Secrets (openssl rand -hex 32)
ORBITOX_ADMIN_TOKEN=GENERATED_ADMIN_TOKEN
ORBITOX_RUNTIME_TOKEN=GENERATED_RUNTIME_TOKEN
ORBITOX_CONTROL_SECRET=GENERATED_CONTROL_SECRET
ORBITOX_GUEST_SECRET=GENERATED_GUEST_SECRET
ORBITOX_SERVER_PEPPER=GENERATED_PEPPER_KEY
ORBITOX_PHI_KEYRING=GENERATED_PHI_KEYRING_BASE64
RESTAURANTOS_PLATFORM_TOKEN=GENERATED_ROS_BRIDGE_TOKEN
```

Secure the permissions:
```bash
chmod 600 /opt/orbitox/infra/docker/.env
```

---

## 3. Deployment Execution (Controlled Sequence)

Never launch applications before database provisioning and schema migrations are verified. Execute this exact sequence:

### Step 3.1: Start Databases & Redis Mesh
From the `infra/docker` directory:

```bash
cd /opt/orbitox/infra/docker
docker compose -f docker-compose.staging.yml up -d platform-db ros-db redis

# Wait until all 3 storage backends are healthy
docker compose -f docker-compose.staging.yml ps
```

### Step 3.2: Run Platform Database Migrations (as orbitox_migrator)
Execute pending Prisma migrations under `orbitox_migrator`:

```bash
set -a
source /opt/orbitox/infra/docker/.env
set +a

# Export DATABASE_URL into shell environment to avoid exposing credentials on host process CLI
export DATABASE_URL="postgresql://orbitox_migrator:${PLATFORM_MIGRATOR_PASSWORD}@platform-db:5432/orbitox_staging"

# Pass only the variable name (-e DATABASE_URL) to Docker Compose
docker compose -f docker-compose.staging.yml run --rm --no-deps \
  -e DATABASE_URL \
  platform pnpm prisma migrate deploy

unset DATABASE_URL
```

### Step 3.3: Enable Platform Service Roles
Run `vps-enable-roles.sql` to activate the 5 service roles with secure passwords (read directly via psql `\getenv` from the environment). Export credentials to the shell and pass only variable names to `docker exec`:

```bash
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
```

### Step 3.4: Run RestaurantOS Database Migrations
Execute RestaurantOS migrations:

```bash
export DATABASE_URL="postgresql://postgres:${ROS_POSTGRES_SUPERUSER_PASSWORD}@ros-db:5432/restaurant_os_staging"

# Pass only the variable name (-e DATABASE_URL) to Docker Compose
docker compose -f docker-compose.staging.yml run --rm --no-deps \
  -e DATABASE_URL \
  restaurant-os pnpm prisma migrate deploy

unset DATABASE_URL
```

### Step 3.5: Launch Applications & Ingress Proxy
Start the Platform web console, RestaurantOS runtime, and Caddy edge proxy:

```bash
docker compose -f docker-compose.staging.yml up -d platform restaurant-os caddy

# Verify all 6 services are healthy
docker compose -f docker-compose.staging.yml ps
```

### Step 3.6: Verify Ingress & Edge Proxy
1. Platform health check via Caddy:
   ```bash
   curl -I https://staging.orbitox.io/api/health
   # Expected: HTTP/2 200 OK
   ```

2. Real-time SSE streaming verification:
   Verify that headers contain `Content-Type: text/event-stream` and response is delivered unbuffered:
   ```bash
   curl -N -H "Accept: text/event-stream" https://staging.orbitox.io/api/fleet/stream
   ```

3. Security header verification:
   ```bash
   curl -sI https://staging.orbitox.io | grep -iE "(strict-transport|x-content-type|x-frame)"
   # Expected:
   # strict-transport-security: max-age=31536000; includeSubDomains; preload
   # x-content-type-options: nosniff
   # x-frame-options: DENY
   ```

---

## 4. Post-Deployment Catalog Safety Inventory (GC-07)

Once the Platform database has been migrated and services are healthy, execute the strictly read-only catalog inventory to verify PostgreSQL role safety, RLS policies, audit logs, and partition runway.

### Execution Procedure:
```bash
cd /opt/orbitox/infra/docker

# Execute within the platform container (which reaches platform-db over orbitox_platform_net)
docker compose -f docker-compose.staging.yml exec -T platform \
  node scripts/ops/run-staging-inventory.js
```

Alternatively, from the host via a one-off run container:
```bash
export APP_DATABASE_URL="postgresql://orbitox_runtime:${ORBITOX_RUNTIME_PASSWORD}@platform-db:5432/orbitox_staging"

docker compose -f docker-compose.staging.yml run --rm --no-deps \
  -e APP_DATABASE_URL \
  platform node scripts/ops/run-staging-inventory.js

unset APP_DATABASE_URL
```

### Expected Output Criteria:
- All 11 verification queries (Q-01 through Q-11) must report `PASS`.
- Zero queries report `FAIL` or `INCOMPLETE`.
- Exit code must be `0` (`SUCCESS`).

> [!CAUTION]
> The staging inventory script is strictly read-only and runs under the unprivileged `orbitox_runtime` role. Never run the inventory script under `postgres` or `orbitox_migrator` as superuser/DDL authority masks privilege boundary violations.
