# 🛡️ RestaurantOS Operations, High Availability, Disaster Recovery & Backups

This document serves as the authoritative operational runbook for platform administrators and SREs running the **RestaurantOS Multi-Tenant Fleet** on the **OrbitoX Platform**.

---

## 1. High Availability & Service Level Objectives (SLOs)

| Metric | Target | Description |
| :--- | :--- | :--- |
| **Availability (Fleet)** | 99.95% | Across all tenant endpoints and custom domains |
| **Recovery Point Objective (RPO)** | < 1 minute | Maximum potential data loss via continuous WAL archiving |
| **Recovery Time Objective (RTO)** | < 15 minutes | Time to restore full cluster or failover to standby |
| **API Latency (p95)** | < 120 ms | Guest ordering, KDS ticket updates, and admin dashboards |
| **Cross-Tenant Isolation** | 100% Zero Leak | Enforced by PostgreSQL RLS (`restaurantos_app` role) |

---

## 2. Health Probes & Observability Architecture

### 2.1 Health Check Endpoints

| Endpoint | Method | Purpose | Bypasses Tenancy |
| :--- | :--- | :--- | :--- |
| `/health` or `/healthz` | `GET` | **Liveness Probe**: Confirms Node.js HTTP server is up and accepting TCP traffic. Returns `200 OK`. | Yes |
| `/healthz/ready` or `/ready` | `GET` | **Readiness Probe**: Queries PostgreSQL (`SELECT 1`) and verifies internal runtime event buses. Returns `200 OK` or `503 Service Unavailable`. | Yes |

#### Kubernetes Probe Configuration Example
```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 4010
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 2
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /healthz/ready
    port: 4010
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

---

### 2.2 Telemetry & Prometheus Scraping

The fleet exposes Prometheus metrics at:
- `GET /metrics` — Publicly scrapable or cluster-internal Prometheus endpoint.
- `GET /internal/metrics` — Requires Bearer authentication (`RESTAURANTOS_PLATFORM_TOKEN`).
- `GET /metrics?format=json` or `Accept: application/json` — Returns JSON formatted snapshot for ad-hoc monitoring scripts and platform dashboards.

#### Metrics Exposed

| Metric Name | Type | Description |
| :--- | :--- | :--- |
| `restaurantos_process_uptime_seconds` | Gauge | Node.js process uptime in seconds |
| `restaurantos_memory_heap_used_bytes` | Gauge | Active V8 heap used in bytes |
| `restaurantos_memory_heap_total_bytes` | Gauge | Total V8 heap allocated in bytes |
| `restaurantos_memory_rss_bytes` | Gauge | Resident Set Size (RSS) memory consumption |
| `restaurantos_active_tenants_total` | Gauge | Number of active registered restaurants in fleet |
| `restaurantos_http_requests_total` | Counter | Total incoming HTTP requests served |
| `restaurantos_domain_events_total` | Counter | Total domain events dispatched through event bus |
| `restaurantos_http_requests_by_status{status="XXX"}` | Counter | Request count partitioned by HTTP response code |

#### Prometheus Scrape Job Configuration
```yaml
scrape_configs:
  - job_name: 'restaurantos-fleet'
    scrape_interval: 15s
    scrape_timeout: 5s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['restaurantos.internal:4010']
```

---

## 3. Database Backup & Disaster Recovery

### 3.1 Cluster-Level Full Backups

Production clusters maintain automated hourly snapshots and continuous write-ahead log (WAL) archiving to S3/GCS using tools such as `pgBackRest` or `wal-g`.

#### On-Demand Cluster Backup via Shell Script
RestaurantOS provides `scripts/backup-postgres.sh` to perform automated, timestamped, gzip-compressed backups:

```bash
# Full database backup
./scripts/backup-postgres.sh --full

# Custom output directory
./scripts/backup-postgres.sh --full --output-dir /var/backups/restaurantos
```

The script:
1. Validates PostgreSQL connectivity.
2. Executes `pg_dump --clean --if-exists --no-owner --no-privileges`.
3. Compresses with `gzip -9`.
4. Writes SHA-256 checksum file alongside the archive (`.tar.gz.sha256`).
5. Exits 0 on verified success or non-zero on failure.

---

### 3.2 Tenant-Level Compliance & Portability Backups

For regulatory compliance (GDPR, SOC2, Indian DPDP Act) and single-restaurant exports, tenant data can be extracted as structured JSON:

```bash
# Export single tenant data via CLI backup script
./scripts/backup-postgres.sh --tenant ten_bistro_001

# Or via Platform Control Plane API:
curl -H "Authorization: Bearer $PLATFORM_TOKEN" \
  http://localhost:3000/api/v1/platform/restaurants/ten_bistro_001/export \
  -o ten_bistro_001_backup.json

# Or directly from the RestaurantOS runtime:
curl -H "Authorization: Bearer $PLATFORM_TOKEN" \
  http://localhost:4010/internal/tenants/ten_bistro_001/export \
  -o ten_bistro_001_backup.json
```

---

### 3.3 Single-Tenant Restoration via CLI

When an owner requests a restore, or during cross-region migration, use `scripts/restore-tenant.ts`:

```bash
# Dry-run validation (checks schema, parseability, and references without writing)
npx tsx scripts/restore-tenant.ts --file ten_bistro_001_backup.json --dry-run

# Authoritative restore into PostgreSQL with strict RLS isolation
npx tsx scripts/restore-tenant.ts --file ten_bistro_001_backup.json

# Force overwrite existing tenant
npx tsx scripts/restore-tenant.ts --file ten_bistro_001_backup.json --force
```

#### Restoration Security & Safety Guarantees
- **Atomic Transaction**: The entire restore is executed within a single `prisma.$transaction`.
- **Tenant Scope Enforcement**: `SET LOCAL app.tenant_id = '<tenantId>'` is set on the transaction connection.
- **Dependency Hierarchy**: Restores models in exact dependency order:
  1. `Tenant` & `TenantBrandConfig`
  2. `Branch`
  3. `Floor` & `TableFloor`
  4. `MenuCategory` & `MenuItem`
  5. `StaffMember` (active accounts preserved)
  6. `RestaurantOrder` & `OrderItem`
  7. `CustomDomain` entries

---

## 4. Custom Domains & TLS Operations Runbook

RestaurantOS provisions automatic, zero-touch SSL/TLS certificates for tenant custom domains (e.g. `order.thegrandbistro.com`) using Caddy's On-Demand TLS with fail-closed security.

### 4.1 On-Demand TLS Verification Flow

```
+----------------+      1. TLS Handshake       +---------------------+
|   Guest Web    | --------------------------> |   Caddy Edge Proxy  |
+----------------+                             +---------------------+
                                                          |
                                                 2. GET /internal/tls/ask?domain=...
                                                          v
                                               +---------------------+
                                               |  RestaurantOS Core  |
                                               +---------------------+
                                                          |
                         3. Verified & Active?   <--------+
                            - 200 OK: Issue Cert
                            - 403 Forbidden: Deny Handshake
```

### 4.2 Verifying a Custom Domain

1. Tenant enters domain: `order.thegrandbistro.com` in their Settings.
2. RestaurantOS issues challenge:
   - Host: `_restaurantos-verify.order.thegrandbistro.com`
   - Type: `TXT`
   - Value: `orb_verify_<token>`
3. Tenant adds TXT record at their DNS registrar.
4. Tenant clicks **Verify Domain** or platform runs verification:
   ```bash
   # CLI verification test
   npx tsx scripts/test-custom-domains.ts
   ```
5. Once verified (`status = 'verified'`), Caddy automatically issues the Let's Encrypt / ZeroSSL TLS certificate during the first incoming HTTPS request.

### 4.3 Troubleshooting TLS & Domain Issues

- **Symptom: Handshake timeout or SSL error:**
  Check Caddy query to RestaurantOS:
  ```bash
  curl -i "http://127.0.0.1:4010/internal/tls/ask?domain=order.thegrandbistro.com"
  ```
  - If `403 Forbidden`: Domain is either not in the database, in `pending` status, or tenant is `suspended`.
  - If `200 OK`: RestaurantOS approves certificate issuance. Check Caddy logs (`caddy/caddy.log`) for Let's Encrypt rate limits or DNS propagation delays.

---

## 5. Security Auditing & Emergency Procedures

### 5.1 Suspending an Abusive Tenant

To immediately halt all traffic, API calls, and public storefront access for a compromised or delinquent restaurant:

```bash
# Via Platform Control Plane API
curl -X POST -H "Authorization: Bearer $PLATFORM_TOKEN" \
  http://localhost:3000/api/v1/platform/restaurants/ten_bad_actor/suspend

# Result:
# - HTTP status for all tenant requests immediately transitions to 403 SUSPENDED
# - Caddy /internal/tls/ask immediately returns 403 Forbidden
# - WebSocket connections for the tenant are terminated
```

### 5.2 Resuming a Suspended Tenant

```bash
curl -X POST -H "Authorization: Bearer $PLATFORM_TOKEN" \
  http://localhost:3000/api/v1/platform/restaurants/ten_bad_actor/resume
```

---

## 6. Incident Response & Disaster Recovery Checklist

In the event of total availability loss:

1. **Assess Blast Radius**:
   Check `/healthz/ready`. If returning 503, inspect PostgreSQL connection pool and database CPU/disk metrics.
2. **Review Structured Logs**:
   Inspect stdout for error traces containing `requestId` and `tenantId`.
3. **Database Failover / Restore**:
   - If PostgreSQL node is unrecoverable, promote read-replica to primary or restore latest snapshot:
     ```bash
     gunzip -c /var/backups/restaurantos/backup_full_YYYY-MM-DD.sql.gz | psql "$DATABASE_URL"
     ```
   - Run migrations if needed: `npx prisma migrate deploy`.
   - Run RLS verification: `npx tsx scripts/setup-postgres-rls.ts`.
4. **Fleet Verification**:
   Execute safe tenancy validation suite to guarantee zero cross-tenant leakage:
   ```bash
   npx tsx scripts/test-safe-tenancy-and-rls.ts
   ```
5. **Declare Normal Operations**:
   Verify `/healthz/ready` returns 200 OK with `database: UP`.
