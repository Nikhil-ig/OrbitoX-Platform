# Track B GO: 6G data rights, 6H operations-as-code, 6I security groundwork

From the technical lead. Base: `feat/compose-saas` at **b1a06ee** (CI #256 green, 12/12).

**Context:** the owner is standing up AWS staging (Track A) in parallel. Everything here must be **built and proven in CI without AWS**, behind interfaces, so it switches on when staging exists. Anything that needs real AWS is reported as **NOT RUN (needs staging)**. Never simulate it.

## Rules (all still apply)
- **Migrations:**
  - new ones only;
  - **every migration must pass the `RDS-Compatible Migration Chain` job.** No superuser-only statements: no `BYPASSRLS`, no `ALTER ROLE … NOSUPERUSER`, no ownership changes to roles without schema `CREATE`.
- **Tables:**
  - new tenant tables get forced RLS, or a reasoned entry in the global allowlist;
  - least-privilege grants, added to `phase6-role-privileges.test.ts`.
- **Never** weaken a check, add fallbacks, keep durable state in memory, or hardcode secrets.
- **Evidence:** real, unedited and re-checkable: commit, CI URL, test names exactly as in the code.
- **Commits:** one per logical change, with descriptive titles.

---

## B0 (do first; it unblocks the owner): a staging secret generator
`scripts/staging/generate-secrets.sh` (or `.ts`):
- generates every **random** secret staging needs, with the right format and length: session secret, PHI keys + active key id + index key, MFA key, account-token key, API-key pepper ring, Ed25519 grant signing keys (JWKS), bridge secret, control, guest and runtime tokens, admin token;
- writes each one **straight into AWS Secrets Manager** with `aws secretsmanager put-secret-value --secret-id orbitox/staging/<NAME>`, using the owner's own AWS session;
- **never prints secret values, never writes them to files**, and reports only `NAME: set` or `NAME: already set (skipped, use --rotate to replace)`;
- **must not** generate external secrets: Razorpay keys, the Razorpay webhook secret and the Resend key are entered by the owner.

Tests:
- a dry-run mode lists the names it would set;
- the name list equals the secret names in `platform-service-contracts.ts` minus the external ones (CI test).

## 6G: data rights (DPDP Act 2023 + DPDP Rules 2025)
### G1 A plugin data contract (the foundation)
Each plugin implements one interface, versioned like the bridge contract:
- `exportTenant(tenantId) → stream of {table, rows}`;
- `eraseTenant(tenantId, mode) → {table, deletedRows}[]`;
- `principalExport(tenantId, principalRef)`, `principalCorrect(...)`, `principalErase(tenantId, principalRef, mode: 'DELETE' | 'RESTRICT')`.

Two implementations:
- **HospitalOS:** platform database, plugin schema, through `withTenantTx` under RLS. PHI is decrypted **only** inside the call, and every PHI read writes a PHI access-log row (`purpose = 'DSR_EXPORT'` etc.).
- **RestaurantOS:** a separate service. New **HMAC-signed bridge endpoints**, same signing as the lifecycle bridge, nonce-protected, with the platform as the only allowed caller. RestaurantOS performs the work in its own database.

The **erasure policy per plugin** is config, not code. HMS defaults to `RESTRICT` (clinical record retention) until the owner's lawyer decides; RestaurantOS defaults to `DELETE`.

### G2 Organisation export
- **Request:** `POST /api/v1/customer/organizations/{org}/data/export`, OWNER + re-authentication + CSRF.
- **A durable job table `DataRightsJob`:**
  - columns `id, organizationId, kind, status, requestedBy, leaseOwner, leaseExpiresAt, attempts, resultObjectKey, error, timestamps`;
  - processed by a **leased worker**, so exactly one runner wins, and it is crash-resumable (the same pattern as the provisioning saga).
- **The archive:** per tenant and per plugin, JSON plus one CSV per table, plus `manifest.json` (schema version, table list, row counts, SHA-256 per file). Written through an **`ObjectStore` interface**:
  - `LocalObjectStore` for CI;
  - `S3ObjectStore` with SSE-KMS for staging, so it's unit-tested with mocks, and the real run is NOT RUN until staging.
- **Download:**
  - a single-use link (store only the SHA-256 of the token; consume with one conditional UPDATE, the account-token pattern);
  - expires in ≤ 24 h, uses `buildLink` (https, token in the URL fragment);
  - the archive itself is deleted after 7 days by the sweep.
- **Email** "export ready" through the outbox, with no data in the email.

### G3 Organisation deletion with a 30-day cancel window
- **Request** (OWNER + re-auth + CSRF) → `OrganizationDeletionRequest`: `requestedAt`, `scheduledFor = +30 days`, `cancelledAt`, `completedAt`, `certificate`. Immediately:
  - non-owner logins are blocked;
  - API keys are suspended (refused, not deleted);
  - the subscription is set to cancel at period end through the billing provider interface (mocked in CI);
  - a "deletion scheduled" email goes out.
- **Cancel** before `scheduledFor` → everything is restored, and the API keys work again.
- **Day 30:** a maintenance-role leased job runs, in this order:
  1. each plugin's `eraseTenant(…, 'DELETE')` for every tenant of the org;
  2. object-store purge;
  3. API-key revocation;
  4. `close_customer_organization`;
  5. a **deletion certificate**.

  It's idempotent: re-running after a crash midway finishes the job without double-counting.
- **Certificate:**
  - canonical JSON with `organizationId`, the request and completion times, and per plugin and per table the rows deleted. Also the **backup expiry date**: PITR retention end, stated as "data persists in encrypted backups until <date>, then is unrecoverable";
  - **signed with a dedicated Ed25519 key** (`purpose: deletion-certificate`, its own key id, never the grant key);
  - stored, and returned through an OWNER-only endpoint;
  - comes with a **verification CLI** (`scripts/verify-deletion-certificate.ts`) that works offline with the public key.

### G4 Data-principal requests (one patient or customer)
- **Who:** the tenant admin, within their plugin: export / correct / erase-or-restrict one principal.
- **Audit:** each action is audited with actor, reason and principal reference (never PHI in the audit row).
- **RESTRICT:** in HMS, `RESTRICT` hides the record from normal reads and blocks processing while keeping it for legal retention, enforced at query level and tested.

### G5 Tests (CI, real PostgreSQL)
- Seed **two organisations**, each with HMS and RestaurantOS data.
- **Export A:**
  - the archive contains A's rows;
  - scanning the whole archive for **every B id** (org, project, environment, tenant and row ids) finds **zero** matches;
  - the manifest hashes verify;
  - the PHI access log has the export entries.
- **Deletion:**
  - schedule, then cancel, then everything works again;
  - schedule again, then the day-30 job on a **test clock**;
  - then a **scripted sweep over every table** that has an org, tenant or project column, generated from `information_schema`, finds **zero rows for org A**, while org B's row counts are unchanged;
  - the certificate verifies with the CLI, and a one-byte change to it fails.
- **Crash halfway** through the day-30 job, then re-run: it completes, with correct counts and one certificate.
- **The download link:** a second use fails, and so does use after expiry.
- **Principal:** RESTRICT in HMS hides the patient from list and search routes and blocks updates, and the audit row has no PHI.
- **The RestaurantOS bridge endpoints:** a bad signature → 401, a replayed nonce → refused.

## 6H: operations as code
1. **Alarms in Terraform** (`infra/modules/observability/`), with SNS topic `orbitox-staging-alerts` (the owner adds the subscription). Each has a documented threshold:
   - per service: 5xx rate, p95 latency;
   - RDS: CPU, connections, free storage;
   - outbox age, failed emails;
   - webhook signature failures (`BillingWebhookAlertMetric`), unknown billing events;
   - the grace sweep and the restore drill **not run in 26 h / 8 days**;
   - ACM certificate expiry < 30 days;
   - WAF blocked-request spike.

   Use CloudWatch metric filters on the existing structured logs where no metric exists.
2. **Restore drill:**
   - `ops/restore-drill/`, ported from the reference pack's `verify-restore.sh`: restore the latest PITR point to a **scratch RDS instance** through the AWS API, then diff row counts, **RLS flags, policies, triggers and migration history** against production-of-staging, then destroy the scratch instance;
   - runs as a weekly ECS scheduled task, and publishes `drill_success` and a measured RTO metric;
   - **CI:** test the diff logic against two local PostgreSQL databases, including the **negative control** (removing FORCE RLS on one table must fail the drill). The real AWS restore is NOT RUN until staging.
3. **Log scrubbing test:**
   - seed **canary values** (a fake PHI name, an API key, a password, a Razorpay secret, a session token) into a full test run;
   - capture all structured logs;
   - fail if any canary appears.
4. **Runbooks** in `docs/runbooks/`, one file each:
   - deploy and rollback;
   - a failed migration (including the plan-catalogue validator and RDS-chain stops);
   - PITR restore;
   - rotating each secret type (pepper ring, JWKS grant keys, PHI/MFA/token keys with re-wrap, deletion-certificate key, Razorpay, Resend, Svix);
   - operator lockout and MFA reset;
   - an outbox or webhook backlog;
   - suspending a tenant manually;
   - a failed export or deletion job;
   - incident response;
   - a **DPDP breach** (report to the Data Protection Board within **72 h**, notify affected principals);
   - a region component failure.

   Each ends with a `Rehearsal:` table (date, who, measured time, outcome) left **empty**. Rehearsals happen on staging.

## 6I: security groundwork
1. **`docs/security/threat-model.md`:** STRIDE per component:
   - tenant isolation, the billing guard, API keys and grants;
   - operator and customer accounts;
   - webhooks (Razorpay, Svix);
   - the plugin bridge, PHI handling, data-rights jobs, the supply chain, and the AWS edge.

   Every threat maps to **its control and the test that proves it** (file + test name). Mark the gaps explicitly.
2. **CI scanning:**
   - `osv-scanner` (or `pnpm audit`), failing on HIGH/CRITICAL with a fix available;
   - **CodeQL** (JavaScript/TypeScript);
   - a **Trivy filesystem** scan;
   - a **CycloneDX SBOM** uploaded as a build artifact.

   Any temporary ignore needs an expiry date and a reason in the file.
3. **Workflow hygiene:**
   - bump `docker/build-push-action` and `docker/setup-buildx-action` to versions that run on Node 24;
   - pin third-party actions by commit SHA.

---

## Order and checkpoints
1. **B0** → report it straight away (the owner needs it for Track A step 5).
2. **6G (G1–G5)** → **stop for review**: commits, new migrations with purpose, CI URL, exact test names and pass counts, and the export archive's manifest from a CI run, as an artifact.
3. **6H + 6I** → review.

The real AWS parts (S3 export, the PITR drill, alarms firing, rehearsals) are listed as **NOT RUN (needs staging)** until Track A is done.
