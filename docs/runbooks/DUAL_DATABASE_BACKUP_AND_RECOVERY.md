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

0 2 * * * root /opt/orbitox/scripts/ops/cron-daily-backup.sh >> /var/log/orbitox/backups.log 2>&1
EOF'

sudo chmod 644 /etc/cron.d/orbitox-backups
```

### Combined Cron Runner Script (`/opt/orbitox/scripts/ops/cron-daily-backup.sh`):
```bash
#!/usr/bin/env bash
set -euo pipefail

source /opt/orbitox/infra/docker/.env

echo "🚀 [$(date -u)] Starting dual-database scheduled backup..."

# 1. Platform Backup
APP_DATABASE_URL="postgresql://orbitox_migrator:${PLATFORM_POSTGRES_SUPERUSER_PASSWORD}@127.0.0.1:5432/orbitox_staging" \
  /opt/orbitox/apps/platform/scripts/ops/backup-platform-postgres.sh \
    --full \
    --output-dir /var/backups/orbitox/platform \
    --retention-days 7

# 2. RestaurantOS Backup
DATABASE_URL="postgresql://postgres:${ROS_POSTGRES_SUPERUSER_PASSWORD}@127.0.0.1:5433/restaurant_os_staging" \
  /opt/orbitox/services/restaurant-api/scripts/backup-postgres.sh \
    --full \
    --output-dir /var/backups/orbitox/restaurant-os \
    --retention-days 7

echo "✅ [$(date -u)] Dual-database scheduled backup finished successfully."
```

---

## 4. Disaster Recovery & Restoration Procedures

In the event of hardware failure, database corruption, or ransomware compromise:

### Step 4.1: Verify Checksum Integrity
Before initiating restoration, verify the SHA-256 hash of the chosen backup file:

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

### Step 4.3: Restore Platform Database
```bash
# Decompress and stream to psql
gunzip -c /var/backups/orbitox/platform/platform_db_full_YYYYMMDD_HHMMSSZ.sql.gz | \
  docker exec -i orbitox_staging_platform_db psql -U postgres -d orbitox_staging
```

### Step 4.4: Restore RestaurantOS Database
```bash
gunzip -c /var/backups/orbitox/restaurant-os/restaurantos_db_full_YYYYMMDD_HHMMSSZ.sql.gz | \
  docker exec -i orbitox_staging_ros_db psql -U postgres -d restaurant_os_staging
```

### Step 4.5: Re-validate System & Restart Applications
1. Run the catalog safety inventory script to prove catalog and RLS integrity:
   ```bash
   cd /opt/orbitox/apps/platform
   APP_DATABASE_URL="postgresql://orbitox_runtime:${ORBITOX_RUNTIME_PASSWORD}@127.0.0.1:5432/orbitox_staging" \
     node scripts/ops/run-staging-inventory.js
   ```
2. Restart application containers:
   ```bash
   docker compose -f /opt/orbitox/infra/docker/docker-compose.staging.yml start platform restaurant-os
   ```
3. Check health:
   ```bash
   curl -I https://staging.orbitox.io/api/health
   ```
