# 🪐 OrbitoX Platform & RestaurantOS — Dual-Database Backup & Disaster Recovery Runbook (GC-03)

> **Infrastructure Environment:** Self-managed Ubuntu 24.04 LTS VPS  
> **Databases:**  
>   1. `orbitox_staging` (OrbitoX Platform Control Plane)  
>   2. `restaurant_os_staging` (RestaurantOS Hospitality Runtime)  
> **Backup Tooling:**  
>   - `apps/platform/scripts/ops/backup-platform-postgres.sh`  
>   - `services/restaurant-api/scripts/backup-postgres.sh`  
> **Default Retention:** 7 Days Rolling Window  

---

## 1. Architectural Overview

OrbitoX utilizes two physically isolated PostgreSQL databases to enforce strict tenant boundary isolation and prevent cross-contamination between Platform control-plane data (licenses, credentials, audit records, hospital admissions) and RestaurantOS runtime operational state (orders, menu items, kitchen display systems):

1. **Platform Database (`orbitox_staging`)**:  
   - Hosted on `platform-db` container.  
   - Contains 42 RLS-enforced tables, append-only `PlatformAuditEvent`, rate-limit partitions, and encryption keyrings.
   - Primary Backup Tool: `apps/platform/scripts/ops/backup-platform-postgres.sh`.

2. **RestaurantOS Database (`restaurant_os_staging`)**:  
   - Hosted on `ros-db` container.  
   - Contains restaurant tenants, menus, POS sync data, and shift registers.
   - Primary Backup Tool: `services/restaurant-api/scripts/backup-postgres.sh`.

---

## 2. Backup Execution Procedures

### 2.1 OrbitoX Platform Database Backup

The Platform backup utility performs a full cluster dump with schema, data, and partition metadata, compressed using gzip level 9, and produces an authoritative SHA-256 checksum file.

```bash
# Execute from apps/platform directory
cd /opt/orbitox/apps/platform

APP_DATABASE_URL="postgresql://orbitox_migrator:${MIGRATOR_PASS}@127.0.0.1:5432/orbitox_staging" \
  ./scripts/ops/backup-platform-postgres.sh \
    --full \
    --output-dir /var/backups/orbitox/platform \
    --retention-days 7
```

**Artifacts Generated:**
- Compressed Dump: `/var/backups/orbitox/platform/platform_db_full_YYYYMMDD_HHMMSSZ.sql.gz`
- Checksum File: `/var/backups/orbitox/platform/platform_db_full_YYYYMMDD_HHMMSSZ.sql.gz.sha256`

### 2.2 RestaurantOS Database Backup

The RestaurantOS backup utility supports both full database dumps and single-tenant JSON exports:

```bash
# Execute from services/restaurant-api directory
cd /opt/orbitox/services/restaurant-api

# Full Database Dump
DATABASE_URL="postgresql://postgres:${ROS_SUPERUSER_PASS}@127.0.0.1:5433/restaurant_os_staging" \
  ./scripts/backup-postgres.sh \
    --full \
    --output-dir /var/backups/orbitox/restaurant-os \
    --retention-days 7

# Isolated Single-Tenant Export (e.g. for GDPR or tenant offboarding)
DATABASE_URL="postgresql://postgres:${ROS_SUPERUSER_PASS}@127.0.0.1:5433/restaurant_os_staging" \
RESTAURANTOS_PLATFORM_TOKEN="${RESTAURANTOS_PLATFORM_TOKEN}" \
  ./scripts/backup-postgres.sh \
    --tenant "tenant-dining-101" \
    --output-dir /var/backups/orbitox/tenants
```

---

## 3. Automated Backup Cron Configuration

On Ubuntu 24.04 LTS, configure automated daily backups with rotation using `/etc/cron.d/orbitox-backups`:

```bash
sudo bash -c 'cat << "EOF" > /etc/cron.d/orbitox-backups
# /etc/cron.d/orbitox-backups — Automated Daily Dual-Database Backups at 02:00 UTC
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

0 2 * * * root /opt/orbitox/scripts/ops/backup-all-staging-databases.sh >> /var/log/orbitox/backups.log 2>&1
EOF'

sudo chmod 644 /etc/cron.d/orbitox-backups
```

### Combined Cron Runner Script (`/opt/orbitox/scripts/ops/backup-all-staging-databases.sh`):
```bash
#!/usr/bin/env bash
set -euo pipefail

# Uses docker exec against running database containers (zero exposed host ports needed).
BACKUP_ROOT="${BACKUP_ROOT_DIR:-/var/backups/orbitox}"
PLATFORM_BACKUP_DIR="${BACKUP_ROOT}/platform"
ROS_BACKUP_DIR="${BACKUP_ROOT}/restaurant-os"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

echo "🚀 [$(date -u)] Starting dual-database scheduled backup..."

# 1. Platform Backup (via docker exec)
/opt/orbitox/apps/platform/scripts/ops/backup-platform-postgres.sh \
  --full \
  --container "orbitox_staging_platform_db" \
  --output-dir "$PLATFORM_BACKUP_DIR" \
  --retention-days "$RETENTION_DAYS"

# 2. RestaurantOS Backup (via docker exec)
/opt/orbitox/services/restaurant-api/scripts/backup-postgres.sh \
  --full \
  --container "orbitox_staging_ros_db" \
  --output-dir "$ROS_BACKUP_DIR" \
  --retention-days "$RETENTION_DAYS"

# 3. Off-Site Backup Sync (if configured)
if [[ -f "/opt/orbitox/scripts/ops/sync-backups-offsite.sh" ]]; then
  /opt/orbitox/scripts/ops/sync-backups-offsite.sh || echo "⚠️ Off-site replication warning."
fi

echo "✅ [$(date -u)] Dual-database scheduled backup finished successfully."
```

---

## 4. Disaster Recovery & Restoration Procedures

In the event of hardware failure, database corruption, or complete host rebuild, follow this authoritative restoration sequence.

> [!IMPORTANT]
> **PostgreSQL Role & Scope Lifecycle:**  
> `pg_dump` operates at the database level. It captures tables, views, rows, constraints, triggers, indexes, and ACL grants on database objects. It **does NOT** create or manage cluster-level roles in `pg_roles`.  
> Therefore, when restoring into a blank, fresh, or rebuilt PostgreSQL instance, **the 8 system roles must be provisioned before restoring the database dump archive**, so that `OWNER TO orbitox_migrator` and `GRANT ... TO orbitox_runtime` execute cleanly without missing role errors.

### Step 4.1: Verify Backup File Checksum
Before initiating restoration, verify the cryptographic SHA-256 hash of the chosen backup file:

```bash
cd /var/backups/orbitox/platform
sha256sum -c platform_db_full_YYYYMMDD_HHMMSSZ.sql.gz.sha256
# Expected output: platform_db_full_YYYYMMDD_HHMMSSZ.sql.gz: OK
```

### Step 4.2: Stop Dependent Application Services
Stop application containers to ensure zero incoming writes during restoration:

```bash
docker compose -f /opt/orbitox/infra/docker/docker-compose.staging.yml stop platform restaurant-os
```

### Step 4.3: Ensure Cluster Roles & Target Database Exist
If restoring into a new, blank, or reconstructed PostgreSQL instance:

1. **Bootstrap Cluster Roles & Ownership:**
   ```bash
   psql -h 127.0.0.1 -p 5432 -U postgres -d postgres \
     -v migrator_password="'${PLATFORM_POSTGRES_SUPERUSER_PASSWORD}'" \
     -f /opt/orbitox/scripts/db/vps-bootstrap-roles.sql
   ```

2. **Enable Operational Service Roles:**
   ```bash
   psql -h 127.0.0.1 -p 5432 -U postgres -d postgres \
     -v runtime_password="'${ORBITOX_RUNTIME_PASSWORD}'" \
     -v maintenance_password="'${MAINTENANCE_PASSWORD}'" \
     -v platform_admin_audit_password="'${ORBITOX_PLATFORM_ADMIN_AUDIT_PASSWORD}'" \
     -v hms_audit_reader_password="'${HMS_AUDIT_READER_PASSWORD}'" \
     -v outbox_relay_password="'${OUTBOX_RELAY_PASSWORD}'" \
     -f /opt/orbitox/scripts/db/vps-enable-roles.sql
   ```

3. **Ensure Database Exists and is Owned by `orbitox_migrator`:**
   ```bash
   psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c \
     "CREATE DATABASE orbitox_staging OWNER orbitox_migrator;" || true
   ```

### Step 4.4: Restore Platform Database (Schema, Data, Owners & ACLs)
Stream the compressed archive into `psql` as `postgres` or `orbitox_migrator`:

```bash
gunzip -c /var/backups/orbitox/platform/platform_db_full_YYYYMMDD_HHMMSSZ.sql.gz | \
  docker exec -i orbitox_staging_platform_db psql -U postgres -d orbitox_staging
```

### Step 4.5: Restore RestaurantOS Database
For RestaurantOS:
```bash
# Ensure restaurant_os_staging database exists
docker exec -i orbitox_staging_ros_db psql -U postgres -c \
  "CREATE DATABASE restaurant_os_staging;" || true

# Restore dump
gunzip -c /var/backups/orbitox/restaurant-os/restaurantos_db_full_YYYYMMDD_HHMMSSZ.sql.gz | \
  docker exec -i orbitox_staging_ros_db psql -U postgres -d restaurant_os_staging
```

### Step 4.6: Re-validate System & Restart Applications
1. Run the catalog safety inventory script to prove catalog, role, and RLS integrity:
   ```bash
   cd /opt/orbitox/apps/platform
   APP_DATABASE_URL="postgresql://orbitox_runtime:${ORBITOX_RUNTIME_PASSWORD}@127.0.0.1:5432/orbitox_staging" \
     node scripts/ops/run-staging-inventory.js
   ```
2. Restart application containers:
   ```bash
   docker compose -f /opt/orbitox/infra/docker/docker-compose.staging.yml start platform restaurant-os
   ```
3. Check health endpoints:
   ```bash
   curl -fsS https://staging.orbitox.io/api/health
   curl -fsS https://ros.staging.orbitox.io/healthz
   ```

---

## 5. Off-Server Backup Replication (Disaster-Recovery Readiness)

Local backups protect against transactional software errors; off-server copies protect against VPS disk failure, provider outages, and host compromise.

### 5.1 Provider-Neutral Remote Sync Script (`/opt/orbitox/scripts/ops/sync-backups-offsite.sh`)
```bash
#!/usr/bin/env bash
# /opt/orbitox/scripts/ops/sync-backups-offsite.sh
# Syncs local verified backup archives to encrypted remote object storage or secondary server.
set -euo pipefail

BACKUP_ROOT="/var/backups/orbitox"
REMOTE_DEST="${REMOTE_BACKUP_TARGET:-}" # e.g. s3://my-orbitox-backups-bucket or user@remote-backup.internal:/backups

if [[ -z "$REMOTE_DEST" ]]; then
  echo "⚠️  REMOTE_BACKUP_TARGET not set. Skipping off-site replication."
  exit 0
fi

echo "🚀 [$(date -u)] Syncing backups to off-site target: ${REMOTE_DEST}..."

if [[ "$REMOTE_DEST" == s3://* ]]; then
  # AWS S3 / Cloudflare R2 / MinIO via aws cli
  aws s3 sync "$BACKUP_ROOT" "$REMOTE_DEST" --delete
elif [[ "$REMOTE_DEST" == *:* ]]; then
  # SSH / rsync remote target
  rsync -avz --delete -e "ssh -o StrictHostKeyChecking=accept-new" "$BACKUP_ROOT/" "$REMOTE_DEST/"
fi

echo "✅ [$(date -u)] Off-site backup sync complete."
```
