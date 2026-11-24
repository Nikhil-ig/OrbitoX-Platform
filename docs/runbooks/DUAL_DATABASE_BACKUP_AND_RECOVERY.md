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

The Platform backup utility performs a full cluster dump with schema, data, and partition metadata, compressed using gzip level 9, and produces an authoritative SHA-256 checksum file. It connects directly to the container via `docker exec`, requiring zero host-port exposure:

```bash
# Execute from apps/platform directory
cd /opt/orbitox/apps/platform

./scripts/ops/backup-platform-postgres.sh \
  --full \
  --container "orbitox_staging_platform_db" \
  --output-dir /var/backups/orbitox/platform \
  --retention-days 7
```

**Artifacts Generated:**
- Compressed Dump: `/var/backups/orbitox/platform/platform_db_full_YYYYMMDD_HHMMSSZ.sql.gz` (mode 0600)
- Checksum File: `/var/backups/orbitox/platform/platform_db_full_YYYYMMDD_HHMMSSZ.sql.gz.sha256` (mode 0600)

### 2.2 RestaurantOS Database Backup

The RestaurantOS backup utility supports both full database dumps and single-tenant JSON exports without requiring exposed host ports:

```bash
# Execute from services/restaurant-api directory
cd /opt/orbitox/services/restaurant-api

# Full Database Dump (via docker exec against container)
./scripts/backup-postgres.sh \
  --full \
  --container "orbitox_staging_ros_db" \
  --output-dir /var/backups/orbitox/restaurant-os \
  --retention-days 7

# Isolated Single-Tenant Export (e.g. for GDPR or tenant offboarding)
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

### Maintained Production Runner (`/opt/orbitox/scripts/ops/backup-all-staging-databases.sh`)
The cron job delegates entirely to the canonical maintained script `/opt/orbitox/scripts/ops/backup-all-staging-databases.sh`. This runner:
- Sets a restrictive `umask 077` and enforces `0700` directory permissions on `/var/backups/orbitox`.
- Automatically loads credentials and settings from `/opt/orbitox/infra/docker/.env` in minimal cron environments.
- Executes `backup-platform-postgres.sh` against `orbitox_staging_platform_db` (zero exposed host ports).
- Executes `backup-postgres.sh` against `orbitox_staging_ros_db` (zero exposed host ports).
- Triggers `/opt/orbitox/scripts/ops/sync-backups-offsite.sh` with `REMOTE_BACKUP_TARGET`.
- **Fail-Closed Contract**: Never suppresses backup or off-site synchronization failures. If replication fails, the runner exits immediately with non-zero exit code (`1`) to trigger cron alerting.

To execute or test the full backup process manually:
```bash
/opt/orbitox/scripts/ops/backup-all-staging-databases.sh
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

```bash
set -euo pipefail

# 1. Bootstrap Cluster Roles & Ownership (via docker exec, zero host ports)
export PLATFORM_MIGRATOR_PASSWORD="${PLATFORM_MIGRATOR_PASSWORD}"

docker exec -i \
  -e PLATFORM_MIGRATOR_PASSWORD \
  orbitox_staging_platform_db psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -f /scripts/db/vps-bootstrap-roles.sql

# 2. Enable Operational Service Roles (Passwords ingested securely via psql \getenv)
export ORBITOX_RUNTIME_PASSWORD="${ORBITOX_RUNTIME_PASSWORD}"
export ORBITOX_MAINTENANCE_PASSWORD="${ORBITOX_MAINTENANCE_PASSWORD}"
export ORBITOX_PLATFORM_ADMIN_AUDIT_PASSWORD="${ORBITOX_PLATFORM_ADMIN_AUDIT_PASSWORD}"
export HMS_AUDIT_READER_PASSWORD="${HMS_AUDIT_READER_PASSWORD}"
export ORBITOX_OUTBOX_RELAY_PASSWORD="${ORBITOX_OUTBOX_RELAY_PASSWORD}"

docker exec -i \
  -e ORBITOX_RUNTIME_PASSWORD \
  -e ORBITOX_MAINTENANCE_PASSWORD \
  -e ORBITOX_PLATFORM_ADMIN_AUDIT_PASSWORD \
  -e HMS_AUDIT_READER_PASSWORD \
  -e ORBITOX_OUTBOX_RELAY_PASSWORD \
  orbitox_staging_platform_db psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -f /scripts/db/vps-enable-roles.sql

# 3. Ensure Database Exists and is Owned by orbitox_migrator
docker exec -i orbitox_staging_platform_db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "CREATE DATABASE orbitox_staging OWNER orbitox_migrator;" || true
```

### Step 4.4: Restore Platform Database (Schema, Data, Owners & ACLs)
Stream the compressed archive into `psql` inside the container with pipeline error detection and `ON_ERROR_STOP=1`:

```bash
set -euo pipefail
set -o pipefail

gunzip -c /var/backups/orbitox/platform/platform_db_full_YYYYMMDD_HHMMSSZ.sql.gz | \
  docker exec -i orbitox_staging_platform_db psql -U postgres -d orbitox_staging -v ON_ERROR_STOP=1
```

### Step 4.5: Restore RestaurantOS Database
For RestaurantOS:
```bash
set -euo pipefail
set -o pipefail

# Ensure restaurant_os_staging database exists
docker exec -i orbitox_staging_ros_db psql -U postgres -v ON_ERROR_STOP=1 -c \
  "CREATE DATABASE restaurant_os_staging;" || true

# Restore dump with failure propagation
gunzip -c /var/backups/orbitox/restaurant-os/restaurantos_db_full_YYYYMMDD_HHMMSSZ.sql.gz | \
  docker exec -i orbitox_staging_ros_db psql -U postgres -d restaurant_os_staging -v ON_ERROR_STOP=1
```

### Step 4.6: Re-validate System & Restart Applications
1. Run the catalog safety inventory script to prove catalog, role, and RLS integrity:
   ```bash
   export APP_DATABASE_URL="postgresql://orbitox_runtime:${ORBITOX_RUNTIME_PASSWORD}@platform-db:5432/orbitox_staging"
   docker compose -f /opt/orbitox/infra/docker/docker-compose.staging.yml run --rm --no-deps \
     -e APP_DATABASE_URL \
     platform node scripts/ops/run-staging-inventory.js
   unset APP_DATABASE_URL
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

> [!IMPORTANT]
> **Disaster Recovery Status: PENDING**  
> Off-site disaster recovery remains classified as **PENDING** until actual remote replication, checksum verification, and test restorations are executed against an active external destination.  
> When `REMOTE_BACKUP_TARGET` is unset or empty, the replication runner explicitly emits `OFFSITE_NOT_CONFIGURED` and the system operates strictly in **local-backup-only** mode.

### Destination-Side Encryption Requirements
Target backup destinations MUST enforce encryption at rest:
- **AWS S3 / Cloudflare R2 / Object Storage**: Bucket policies must require AWS KMS customer-managed keys (`aws:kms`) or AES-256 server-side encryption (`AES256`).
- **SSH / Remote Rsync Host**: Target filesystems must be encrypted (e.g. dm-crypt/LUKS) with restricted directory permissions (`0700` owned by the dedicated backup user).
- **Network Transport**: All transit occurs over TLS 1.3 (S3 API) or SSH with strict host key verification.

### SSH Remote Host Verification & Pinned Known-Hosts Setup
To protect against Man-In-The-Middle (MITM) attacks and ensure fail-closed security, the replication runner enforces `StrictHostKeyChecking=yes`. Trust-on-first-use (`accept-new`) is strictly prohibited.

Before configuring an SSH/rsync remote destination (`user@dr-backup.internal:/var/backups/orbitox`), the host administrator MUST independently verify and pin the remote host key:

```bash
# 1. Query the remote host public key:
ssh-keyscan -t ed25519,rsa dr-backup.internal > /tmp/backup_host.key

# 2. Independently verify the host key fingerprint out-of-band:
ssh-keygen -lf /tmp/backup_host.key
# Compare output against the verified fingerprint provided by the backup infrastructure team

# 3. Append to ~/.ssh/known_hosts (mode 0644):
cat /tmp/backup_host.key >> ~/.ssh/known_hosts
chmod 644 ~/.ssh/known_hosts
rm -f /tmp/backup_host.key
```
If the remote host key is absent from `known_hosts` or changes, `sync-backups-offsite.sh` fails closed immediately with exit code 255.

### 5.1 Provider-Neutral Remote Sync Script (`/opt/orbitox/scripts/ops/sync-backups-offsite.sh`)
```bash
#!/usr/bin/env bash
# /opt/orbitox/scripts/ops/sync-backups-offsite.sh
# Strictly additive synchronization of verified local backup archives.
set -euo pipefail
umask 077

BACKUP_ROOT="${BACKUP_ROOT_DIR:-/var/backups/orbitox}"
REMOTE_DEST="${REMOTE_BACKUP_TARGET:-}"

if [[ -z "$REMOTE_DEST" ]]; then
  echo "ℹ️ [sync-backups-offsite] OFFSITE_NOT_CONFIGURED: REMOTE_BACKUP_TARGET is unset. Operating in local-backup-only mode."
  exit 0
fi

# Step 1: Pre-flight verify local SHA-256 checksums before copying
# Step 2: Additively sync to remote target (s3://, ssh user@host:/path with StrictHostKeyChecking=yes, or /local/path)
# Invariant: Remote deletion flags (--delete) are strictly prohibited.
```
