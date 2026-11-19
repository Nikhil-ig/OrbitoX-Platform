# Runbook: Secret and Key Rotation

## 1. Overview
All staging and production secrets are managed in AWS Secrets Manager under `orbitox/<environment>/<SECRET_NAME>`.

The staging generator CLI (`scripts/staging/generate-secrets.sh`) provides automated, cryptographically secure generation and rotation without exposing values on the command line or saving them to local files.

---

## 2. Rotation Matrix & Policies

| Secret Category | Secrets | Rotation Method | Impact & Prerequisites |
|---|---|---|---|
| **Stateless Application Secrets** | `SESSION_SECRET`, `ORBITOX_ADMIN_TOKEN`, `ORBITOX_RUNTIME_TOKEN`, `ORBITOX_CONTROL_SECRET`, `ORBITOX_GUEST_SECRET`, `ORBITOX_EMAIL_WEBHOOK_SECRET` | `--rotate=<NAME>` | Blind replacement allowed. In-flight requests with old token fail once services reload. |
| **Keyed Secrets (Decryption / Signing)** | `ORBITOX_PHI_KEYS`, `ORBITOX_GRANT_SIGNING_KEYS`, `ORBITOX_BRIDGE_KEYS` | `--add-key=<NAME>` | **Additive only**. New key is appended and set as active; historical keys are preserved so previously encrypted data remains readable. Never blind-rotate. |
| **API Key Pepper Ring** | `ORBITOX_SERVER_PEPPERS` | `--add-key=ORBITOX_SERVER_PEPPERS` | **Additive only**. Appends a new pepper into the pepper ring (max 4). Dual-verification ensures existing keys still match. Active pepper remains unchanged until explicitly promoted via `--activate=ORBITOX_SERVER_PEPPERS --kid=<id>`. |
| **Stateful Persistent Encryption Keys** | `ORBITOX_MFA_ENCRYPTION_KEY`, `ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY`, `ORBITOX_PHI_INDEX_KEY`, `STAFF_AUTH_SECRET` | **Re-encryption Migration** | **Blind rotation strictly refused**. Requires batch re-wrap job across all tenant rows before updating key. Rotating `STAFF_AUTH_SECRET` breaks active staff sessions and tenant diner checkout signing secrets. |
| **Database Role Credentials** | `orbitox_migrator`, `orbitox_runtime`, `orbitox_maintenance`, `orbitox_outbox_relay`, `orbitox_platform_admin_audit`, `hms_audit_reader`, `restaurantos_app` | `--database --force-rotate-database` | **Strict Deployment Requirement**: Database password rotation generates new passwords in AWS Secrets Manager and **MUST be immediately deployed alongside the ECS migration enable task (`scripts/run-staging-migration.js`)**. The enable task connects as `orbitox_migrator` and executes `ALTER ROLE <role> WITH LOGIN PASSWORD '<new_password>'` using the newly generated secret values to prevent authentication lockout. |

---

## 3. Operational Procedures

### A. Rotating a Stateless Secret
```bash
# Rotate session secret
./scripts/staging/generate-secrets.sh --rotate=SESSION_SECRET

# Rotate runtime token
./scripts/staging/generate-secrets.sh --rotate=ORBITOX_RUNTIME_TOKEN
```

### B. Additively Rotating Keyed Secrets
```bash
# Add new PHI key while preserving all previous keys
./scripts/staging/generate-secrets.sh --add-key=ORBITOX_PHI_KEYS

# Add new Ed25519 grant signing key (automatically syncs ORBITOX_GRANT_PUBLIC_KEYS)
./scripts/staging/generate-secrets.sh --add-key=ORBITOX_GRANT_SIGNING_KEYS

# Add new HMAC bridge key
./scripts/staging/generate-secrets.sh --add-key=ORBITOX_BRIDGE_KEYS

# Add new pepper to pepper ring (preserves active pepper until promoted)
./scripts/staging/generate-secrets.sh --add-key=ORBITOX_SERVER_PEPPERS

# Promote new pepper to active for new key issuance
./scripts/staging/generate-secrets.sh --activate=ORBITOX_SERVER_PEPPERS --kid=p2
```

### C. Rotating Database Role Credentials
> [!WARNING]
> Database password rotation MUST be executed as part of an active deployment that runs the database migration task immediately after updating Secrets Manager.

1. Generate new structured secrets and connection URLs in AWS Secrets Manager:
   ```bash
   ./scripts/staging/generate-secrets.sh --database --force-rotate-database
   ```
2. Trigger the one-off ECS migration task to synchronize PostgreSQL role passwords:
   ```bash
   aws ecs run-task \
     --cluster orbitox-staging-ecs \
     --task-definition orbitox-staging-db-migrate \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[...],securityGroups=[...]}"
   ```
3. Restart application tasks to load updated database connections:
   ```bash
   aws ecs update-service --cluster orbitox-staging-ecs --service orbitox-staging-web-service --force-new-deployment
   aws ecs update-service --cluster orbitox-staging-ecs --service orbitox-staging-worker-email-service --force-new-deployment
   aws ecs update-service --cluster orbitox-staging-ecs --service orbitox-staging-worker-sweep-service --force-new-deployment
   aws ecs update-service --cluster orbitox-staging-ecs --service orbitox-staging-restaurant-os-service --force-new-deployment
   ```

---

## 4. Emergency Rehearsal Log

| Date | Operator | Secret Rotated | Measured Downtime | Status |
|---|---|---|---|---|
| *Unrehearsed* | *Pending Staging Standup* | — | — | Planned for Track A |
