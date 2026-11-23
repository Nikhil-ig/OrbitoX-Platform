# 🪐 OrbitoX Platform — VPS PostgreSQL 16 Role Provisioning & Security Runbook (GC-01)

> **Target Environment:** Self-managed Ubuntu 24.04 LTS VPS  
> **Database Version:** PostgreSQL 16 (SCRAM-SHA-256)  
> **Database Name:** `orbitox_staging`  
> **Governance Classification:** Platform Infrastructure Tier 1 — Critical Security  

---

## 1. Overview & Architectural Principles

OrbitoX Platform enforces a zero-trust, role-separated database model with strict Row-Level Security (RLS) enforcement. Under PostgreSQL 16 on self-managed infrastructure, role bootstrap and role enablement are executed in two distinct, deterministic phases:

1. **Phase 1: Role Bootstrap (`scripts/db/vps-bootstrap-roles.sql`)**  
   - Executed once by the native `postgres` superuser during initial database creation.
   - Creates the 8 standardized system roles with `NOLOGIN` (except `orbitox_migrator`).
   - Assigns schema `public` ownership directly to `orbitox_migrator`.
   - Revokes `CREATE` privilege on `public` schema from `PUBLIC`.
   - Configures `password_encryption = 'scram-sha-256'` and `createrole_self_grant = 'set'`.
   - Enforces `NOSUPERUSER` and `NOBYPASSRLS` across all roles.

2. **Phase 2: Role Enablement & Secret Injection (`scripts/db/vps-enable-roles.sql`)**  
   - Executed by `orbitox_migrator` (or `postgres` superuser) to activate operational roles with strong, randomly generated SCRAM passwords.
   - Enforces that passwords are provided as external psql variables via `-v` flags (never written into tracked SQL scripts).
   - Validates that the 5 operational service roles receive `LOGIN` authority while the 2 helper roles (`orbitox_audit_resolver`, `orbitox_audit_recovery`) remain strictly `NOLOGIN`.

---

## 2. The 8 System Roles & Privilege Matrix

| Role Name | Authority Mode | Attributes | Purpose |
| :--- | :--- | :--- | :--- |
| `orbitox_migrator` | Deployment | `NOSUPERUSER NOBYPASSRLS CREATEDB CREATEROLE NOINHERIT LOGIN` | Schema migrations, DDL execution, table ownership |
| `orbitox_runtime` | Operational | `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT LOGIN` | Next.js API runtime queries, RLS tenant-isolated DML |
| `orbitox_maintenance` | Operational | `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT LOGIN` | Rate-limit partition rollout, index maintenance |
| `orbitox_platform_admin_audit` | Operational | `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT LOGIN` | Platform audit log append and tenant-scoped inspection |
| `hms_audit_reader` | Operational | `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT LOGIN` | Strict read-only audit log verification |
| `orbitox_outbox_relay` | Operational | `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT LOGIN` | Outbox event delivery, lease acquisition and completion |
| `orbitox_audit_resolver` | Helper (No Login) | `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT NOLOGIN` | Elevated resolution of tamper-evident audit chains |
| `orbitox_audit_recovery` | Helper (No Login) | `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT NOLOGIN` | Emergency audit recovery under dual-custody authorization |

---

## 3. Provisioning Step-by-Step Execution

### Step 3.1: Generate Cryptographically Secure Passwords
Generate 256-bit random passwords for each operational role on the host VPS:

```bash
# Generate secure passwords on the VPS
export MIGRATOR_PASS="$(openssl rand -hex 24)"
export RUNTIME_PASS="$(openssl rand -hex 24)"
export MAINTENANCE_PASS="$(openssl rand -hex 24)"
export ADMIN_AUDIT_PASS="$(openssl rand -hex 24)"
export AUDIT_READER_PASS="$(openssl rand -hex 24)"
export OUTBOX_RELAY_PASS="$(openssl rand -hex 24)"
```

### Step 3.2: Execute Bootstrap Script
Execute `vps-bootstrap-roles.sql` as the `postgres` superuser against the `orbitox_staging` database:

```bash
psql -h 127.0.0.1 -p 5432 -U postgres -d orbitox_staging \
  -v migrator_password="'${MIGRATOR_PASS}'" \
  -f scripts/db/vps-bootstrap-roles.sql
```

> [!IMPORTANT]
> The bootstrap script transfers ownership of the `public` schema to `orbitox_migrator`. In PostgreSQL 16 on standard Ubuntu, this command must be executed by `postgres`, which is handled automatically by the script without switching roles.

### Step 3.3: Execute Enablement Script
Activate the operational service roles by injecting their generated passwords:

```bash
psql -h 127.0.0.1 -p 5432 -U orbitox_migrator -d orbitox_staging \
  -v runtime_password="'${RUNTIME_PASS}'" \
  -v maintenance_password="'${MAINTENANCE_PASS}'" \
  -v admin_audit_password="'${ADMIN_AUDIT_PASS}'" \
  -v audit_reader_password="'${AUDIT_READER_PASS}'" \
  -v outbox_relay_password="'${OUTBOX_RELAY_PASS}'" \
  -f scripts/db/vps-enable-roles.sql
```

### Step 3.4: Verify Role Attributes and Login Security
Verify that all 8 roles exist with their exact expected attributes:

```bash
psql -h 127.0.0.1 -p 5432 -U orbitox_migrator -d orbitox_staging -c "
SELECT 
  rolname, 
  rolsuper, 
  rolinherit, 
  rolcreaterole, 
  rolcreatedb, 
  rolcanlogin, 
  rolbypassrls 
FROM pg_roles 
WHERE rolname LIKE 'orbitox_%' OR rolname = 'hms_audit_reader'
ORDER BY rolname;
"
```

Expected output:
```text
            rolname            | rolsuper | rolinherit | rolcreaterole | rolcreatedb | rolcanlogin | rolbypassrls 
-------------------------------+----------+------------+---------------+-------------+-------------+--------------
 hms_audit_reader              | f        | f          | f             | f           | t           | f
 orbitox_audit_recovery        | f        | f          | f             | f           | f           | f
 orbitox_audit_resolver        | f        | f          | f             | f           | f           | f
 orbitox_maintenance           | f        | f          | f             | f           | t           | f
 orbitox_migrator              | f        | f          | t             | t           | t           | f
 orbitox_outbox_relay          | f        | f          | f             | f           | t           | f
 orbitox_platform_admin_audit  | f        | f          | f             | f           | t           | f
 orbitox_runtime               | f        | f          | f             | f           | t           | f
(8 rows)
```

---

## 4. Troubleshooting & Remediation

### Error: `permission denied for schema public` during migration
- **Root Cause:** Schema `public` was created by `postgres` without transferring ownership to `orbitox_migrator`.
- **Fix:** Connect as `postgres` superuser and run:
  ```sql
  ALTER SCHEMA public OWNER TO orbitox_migrator;
  ```

### Error: `password authentication failed for user "orbitox_runtime"`
- **Root Cause:** Password mismatch or SCRAM authentication was not used during role alter.
- **Fix:** Re-run `vps-enable-roles.sql` with the designated environment password.

### Error: `unauthorized role membership detected`
- **Root Cause:** Role inheritance was enabled, or an operational role was granted membership in `orbitox_migrator`.
- **Fix:** Ensure `NOINHERIT` is set on all roles and revoke any group grants:
  ```sql
  REVOKE orbitox_migrator FROM orbitox_runtime;
  ALTER ROLE orbitox_runtime NOINHERIT;
  ```
