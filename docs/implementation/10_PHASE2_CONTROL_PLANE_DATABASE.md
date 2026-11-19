# OrbitoX Phase 2: Transactional Control-Plane Persistence

**Status:** Step 1 released after the owner confirmed no environment has applied this Prisma schema or the RestaurantOS migration. Implementation proceeds one independently verified step at a time.
**Scope:** Phase 2a replaces control-plane JSON persistence with PostgreSQL transactions. Phase 2b moves tenant-owned RestaurantOS and HospitalOS data from memory/sample/proxy stores into PostgreSQL with database-enforced tenant isolation.
**Prerequisites:** Inspect every target database's migration history before choosing a baseline. Use PostgreSQL 16 in CI and local development, with credentials supplied only through environment variables. Never put database credentials in this document or source control.

**Owner decision (2026-10-27):** No environment (staging, production, shared development, or hosted PostgreSQL) has ever had the OrbitoX Prisma schema or RestaurantOS migration applied. Any local databases are disposable. Generate a reviewed, complete fresh baseline from the entire Prisma schema; do not layer the RestaurantOS-only migration on top.

## 1. Goals and invariants

1. PostgreSQL is the sole authoritative persistent store after cutover. Production must not silently fall back to JSON or seed an empty repository when PostgreSQL is unavailable.
2. A successful security-sensitive API response follows a committed transaction. This includes key create/revoke/suspend/rotate, project status and entitlement changes, plan and quota changes, and project provisioning/deprovisioning.
3. A key rotation writes the replacement key and retires the old key in one database transaction.
4. Tenant authorization is derived from authenticated server-side context and applied to every read and write. Client-provided tenant identifiers are never sufficient scope.
5. Usage quota reservations and rate-limit counters are shared across application instances and use atomic database operations.
6. Existing JSON state is migrated explicitly, verified, and retained read-only until an operator confirms cutover. It is not a runtime fallback.
7. Migration failure, database outage, or invalid state fails startup/readiness. No empty seed state is written over unavailable data.
8. Production tenant-owned business data is PostgreSQL-backed in Phase 2b. No in-memory or sample-data fallback may accept production reads or writes.
9. Application tenant filters are always used and PostgreSQL row-level security is a second enforcement layer, not a substitute for scoped queries.

## 2. Current baseline and known gaps

- `orbitox/prisma/schema.prisma` already contains normalized project, environment, key, credential, package, domain, quota, and rate-limit policy models.
- `PlatformProject.planTier` already exists. The project model is missing `enabledServices`, `apiCallQuota`, and project-level `rateLimitPerMin`, which are present in the runtime `PlatformProject` DTO.
- The schema has no platform audit event model or shared rate-limit counter model.
- `PlatformRepository` currently exposes synchronous static methods backed by process-local arrays and a JSON file. An asynchronous Prisma transaction cannot be hidden behind those synchronous methods.
- The migration directory currently contains only `20261007_restaurant_os_subsystem/migration.sql`; it is not a complete initial migration for the full Prisma schema, which contains 60+ models. Do not treat it as a baseline for an arbitrary existing database.
- The RestaurantOS migration enables RLS on some restaurant tables, and CI already provisions PostgreSQL and creates a restricted RestaurantOS app role. That setup is partial: it does not baseline the full Prisma schema or establish RLS for the control plane, HospitalOS, or every tenant-owned plugin table.
- Prisma 6.19 CLI/client dependencies are present. Existing RestaurantOS CI uses `prisma db push`; a production control-plane Prisma repository and verified migrate-deploy path are still to be implemented.
- The root declares `test:integration`, but package-level integration tasks and a Phase 2 PostgreSQL job are still to be added. The current CI PostgreSQL service is scoped to RestaurantOS and must not be mistaken for control-plane database coverage.
- No database URL is configured in the reviewed worktree. This does not prove that no deployed environment has database history; inspect each target before selecting a baseline.

## 3. Phase 2 scope

### 3.1 Phase 2a: control plane

Move organizations, projects, environments, API keys, credentials, packages, installations, domains, quotas, rate-limit policies/counters, audit events, and security-relevant lifecycle state into PostgreSQL. Keep the control-plane database authoritative after cutover.

### 3.2 Phase 2b: tenant business data

Move tenant-owned business data out of process memory, mock/sample stores, and proxy-or-memory fallbacks. Start with RestaurantOS and HospitalOS because they hold or are intended to hold customer data. Follow with every other plugin as it gains persistent tenant-owned state.

Every persistent tenant query must carry authenticated tenant scope, including reads by id, list filters, updates, deletes, relationship lookups, quota accounting, and error paths. Production mode must fail closed if its database is unavailable; it must never serve sample or process-local data as a fallback. Add cross-tenant tests for each plugin's actual persistence adapter.

The canonical database tenant identifier is one composite value in the form `org/<encoded-organizationId>/project/<encoded-projectId>/environment/<encoded-environmentId>`, produced by `buildPlatformTenantScope`. IDs are URI-component encoded, and the complete value is stored in tenant-table `tenantId`/`contextId` columns and set as transaction-local `app.current_tenant_id`. Bind all three values from authenticated server-side state, never from client tenant headers. Development and staging scopes therefore cannot access production data within the same organization and project. Isolation tests must include environment-to-environment attempts as well as cross-organization and cross-project attempts.

## 4. Target architecture

```text
Next.js route / withApiGuard
  -> async PlatformRepository contract
    -> PlatformService / domain validation
      -> Prisma server adapter (control plane)
      -> plugin persistence adapters (Phase 2b)
        -> PostgreSQL transactions, tenant filters, and RLS
```

Introduce an async repository contract at the plugin-engine platform boundary. Keep pure key generation, risk calculations, DTO mapping, and validation independent of Prisma. Put Prisma-specific persistence in server-only adapters so browser-safe plugin entry points cannot import it. Tenant-owned data adapters must implement the same tenant-scoped contract and set the database tenant context within the transaction that performs the query.

Routes and their helpers that read or mutate platform state become `async` and `await` repository operations. The authentication and route-authorization order remains unchanged. API behavior must not return success until the transaction resolves. Errors map to existing response contracts; database failures return a non-success response and are logged without exposing SQL or credentials.

Do not keep synchronous cached state as an alternate authority. Every authorization decision reads the committed key status, project status, and entitlements from PostgreSQL; a request that begins its authorization read before a revoke commits may finish in flight, but checks beginning after that commit must deny it. Do not add an authorization cache in this phase. Any future cache requires a cross-server revocation propagation protocol and measured stale-read bound; invalidation from a local committed write is insufficient.

## 5. Schema, RLS, and migration plan

### 5.1 Schema changes

Extend the existing models to preserve the current repository DTOs, including `enabledServices`, `apiCallQuota`, and `rateLimitPerMin` on projects, plus any currently persisted fields missing from the Prisma model. Preserve the existing `planTier` field. Add:

- `PlatformAuditEvent`: immutable event id, actor, action, entity type/id, tenant/project scope, timestamp, and JSON metadata. Never store raw API secrets.
- `PlatformRateLimitBucket`: unique scope key and window start, atomic request count, and expiry. Key the scope by authenticated key/project or normalized anonymous client scope, not an untrusted tenant header.
- Any missing foreign keys/indexes needed to enforce organization, project, environment, and tenant ownership in queries.
- Tenant-owned RestaurantOS and HospitalOS persistence models and migrations as part of Phase 2b, rather than treating the control-plane schema as the complete product data store.

Keep quota and rate-limit policy separate from mutable usage. Use period-keyed quota usage and rate-limit buckets; do not reset live counters by zeroing rows. Represent large counters as `BigInt` in PostgreSQL and convert at the repository boundary with safe-integer validation.

### 5.2 Row-level security

Use RLS as a second isolation barrier for tenant-owned tables. Every tenant policy must be enabled and forced (`ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`) where supported. The runtime application role must be a non-superuser, must not own the protected tables, and must not have `BYPASSRLS`; use a separate migration/owner role for DDL. Do not run isolation tests as the owner or a superuser.

All tenant table access must go through one wrapper that opens a transaction, sets the canonical composite scope using transaction-local `app.current_tenant_id`, then executes the tenant queries inside that same transaction. Direct Prisma client queries against tenant models outside this wrapper are forbidden; enforce this with an architecture test or lint rule. Policies must deny access when the setting is unset or empty. Never use a client-supplied tenant header as the RLS identity. Define an explicit, separately audited policy for platform-admin access rather than bypassing RLS with an elevated runtime connection.

RLS integration tests must assert that direct queries with unset tenant context return no rows (or fail closed), and that the wrapper scopes rows to exactly one organization, project, and environment. Run these tests using the non-owner, non-superuser runtime role without `BYPASSRLS`.

The Step 1 table-classification test requires every public table to have forced RLS or appear on an explicit global allowlist. The allowlist currently covers the six shared Celebration catalogs, Prisma migration bookkeeping, control-plane organization/project/environment/key/credential/package/domain/quota/rate-policy tables, idempotency/outbox records, and shared rate-limit buckets. These remain intentionally available to the control-plane runtime role in Phase 2a; this role is also used by application runtime code. Before Phase 2b enables tenant business writes in those processes, split control-plane access from tenant-data access or otherwise constrain these global grants, and add role-specific tests. The allowlist classifies exposure; it does not claim tenant isolation for listed tables.

### 5.3 Migration history decision

Before writing the baseline, inspect each target database's `_prisma_migrations` table and compare its actual schema to the Prisma schema. Do not mark the RestaurantOS migration as a full baseline.

- **Fresh database:** only after confirming no target environment has deployed this schema, generate and review a complete initial baseline from the entire Prisma schema (all 60+ models), then apply it with `prisma migrate deploy`. Preserve the RestaurantOS objects and policies in the full baseline; do not layer the existing RestaurantOS-only migration on top of itself.
- **Existing database:** preserve its applied history. Generate an incremental migration from the inspected live schema to the reviewed Prisma schema. Resolve a baseline only after proving all baseline objects already exist and match.
- **JSON import:** provide an explicit, restartable import command. Parse legacy files using the compatibility rules (including missing `auditLogs` defaulting to empty), validate all references and key invariants, then insert in a transaction or bounded, idempotent batches with a migration ledger. Copy each stored `authVerifier`, key id, and key version unchanged; do not rehash or rotate verifiers during import. Verify a key created before import still authenticates with the same server pepper after import. Map existing project `monthlyApiCalls` and environment `monthlyCallsUsed` independently into the current UTC calendar-month period at import time. If the source has no period timestamp, mark the imported usage period as approximate rather than inventing historical boundaries. Fail on unexpected target rows rather than overwrite them. Verify counts and stable identifiers for every collection before cutover. Retain the verified source snapshot read-only for 30 days for application rollback, then remove it under the documented retention procedure.

The first migration test must load the previous JSON format (including the legacy fixture without `auditLogs`) and import it into a disposable database, then verify projects, keys, domains, quotas, audit history, and that a pre-import key authenticates unchanged. The first Prisma migration test must create a clean PostgreSQL database, apply the complete baseline, and verify the migration version/readiness check.

## 6. Transaction contracts

### Security and governance writes

- Key creation: insert the key verifier and metadata, then commit before returning the plaintext secret once.
- Revoke/suspend/status change: update by key id and tenant/project scope in one transaction; commit before success.
- Rotation: insert replacement and retire/expire old key in the same transaction; rollback both on any failure.
- Project suspend, plan/entitlement, project quota, rate policy, and project lifecycle updates: apply all related rows atomically.
- Provisioning/deprovisioning: create or retire project, environments, default policy rows, and initial keys transactionally.

### Shared quota and quota semantics

Project quota is the aggregate billing authority across all project environments; the environment quota is an independent environment-specific cap. A billable request is allowed only if both applicable limits have capacity. Reserve both counters atomically in one transaction and associate them with one unique reservation id; a failure to reserve either rolls back both. Release only the reservation owned by that request after a failed billable operation, idempotently, so duplicate cleanup cannot double-credit.

Use period-keyed usage rows (UTC calendar month initially). A monthly reset advances the active period; it does not zero counters that live requests are updating. Derive the period from the database clock inside the transaction. Retries reuse the same reservation id. A missing row from the conditional atomic update means quota exhausted. Mandatory tests cover concurrent requests at the exact project and environment limits, rollback on partial reservation, duplicate reservation, failed request release, and reset racing live reservations.

### Shared rate limiting

Use a PostgreSQL atomic upsert on a unique `(scope_type, scope_id, window_start)` bucket and increment/return the count in one statement. For authenticated calls, check both the API-key bucket against its `rateLimitPerMin` and the project bucket against its project-level `rateLimitPerMin`; reject when either is exhausted. Perform both increments in one transaction so rejection rolls back the other increment. Use a fixed 60-second UTC window keyed by authenticated key id and project id; anonymous requests use the client IP resolved only through configured trusted proxies, never a tenant header or arbitrary forwarding header. Fixed windows can permit a boundary burst; accept and document that tradeoff for this phase.

Database failure while reading or incrementing either rate-limit bucket is fail-closed: deny the request with a non-success `503` response and do not use a process-local allow-through fallback. Keep the counter behind a rate-limit store contract so Redis can replace PostgreSQL later without changing route semantics.

Use logged daily range partitions by `window_start` for rate-limit buckets. Create partitions 14 days ahead and maintain that horizon daily; readiness requires only a 3-day UTC runway so one missed daily maintenance run does not take every server out of service. Alert when the contiguous future runway falls below 7 days; without a matching partition, writes must fail and requests return 503 (fail closed). Drop expired daily partitions after the retention buffer. Pin the runtime and maintenance roles to UTC and have partition functions explicitly use UTC. Set a lower fillfactor (initially 70) on every partition to reduce page splits from hot counter updates. Do not use an unlogged table in this phase: losing active counters on crash could reset limits and admit a boundary burst.

Schedule maintenance daily at 02:10 UTC using the dedicated `orbitox_maintenance` connection, and run the runway monitor at 02:20 UTC using a read-only/runtime connection. For a host cron deployment, install these entries in the OrbitoX service account's crontab; inject the URLs through the service manager environment and never place credentials in the crontab:

```cron
10 2 * * * cd /srv/orbitox && pnpm run maintain:rate-limit-partitions
20 2 * * * cd /srv/orbitox && pnpm run check:rate-limit-runway
```

The monitor exits nonzero and prints an `ALERT` below 7 future UTC days. Configure the scheduler/monitoring system to alert on that exit status and on missed job completion. The maintenance command verifies that at least 14 future days were restored.

Initial performance acceptance target: 1,000 aggregate authorization/rate-limit decisions per second across two application servers, with added database-path latency of p95 <= 25 ms and p99 <= 75 ms on the documented CI benchmark profile. Measure throughput, latency, lock waits, pool saturation, database CPU, and SQL query count per authorization request. The verifier lookup must have a unique index; combine key, project, environment, and entitlement reads into one joined query or a small fixed number of queries. Record actual results and revisit the target using pilot traffic before production commitments.

Also run a single-hot-project benchmark with all traffic across both servers targeting one project, including contention on both the project quota row and project rate-limit bucket row. Record maximum sustainable decisions per second, p95/p99 latency, lock waits, and 503 rate. The measured ceiling must be compared with the project product need before cutover. If contention on either project row falls below that need, implement bounded database-backed reservations allocated in blocks per server (or an equally safe batching strategy) before release. The allocation must prevent oversubscription; unused reserved capacity may temporarily be unavailable but must not be returned while in-flight requests could still consume it.

### Transaction concurrency, timeouts, and pooling

- Use PostgreSQL `READ COMMITTED` by default. Atomic conditional updates and unique constraints protect quota and rate-limit operations. Use `SELECT ... FOR UPDATE` on the API-key row for revoke/rotate/status changes; rotation locks the old key and inserts the replacement in the same transaction. Lock multiple rows in stable id order.
- Project policy/entitlement changes lock the project row. Quota reservations lock or conditionally update project and environment period rows in stable project-then-environment order. Keep transactions short and do not hold database locks while calling external services.
- Retry deadlock (`40P01`) and serialization (`40001`) failures at most twice after the initial attempt, with bounded jitter, only for idempotent operations carrying a stable request/reservation id. Do not retry constraint violations or non-idempotent operations without an idempotency key.
- Set bounded `statement_timeout` (2 seconds), `lock_timeout` (500 ms), and `idle_in_transaction_session_timeout` (5 seconds) for the application role. Map timeout/connection errors to fail-closed non-success responses.
- Bound Prisma pool size per process against the deployment's maximum instance count and PostgreSQL connection budget. Test standalone Next.js startup and shutdown pool behavior. If PgBouncer transaction pooling is used, configure Prisma's documented PgBouncer mode (including prepared-statement behavior) and test it in CI; do not rely on session state across transactions.

### Audit immutability

Audit records are append-only. The runtime role receives `INSERT` and RLS-scoped `SELECT` only on `PlatformAuditEvent`, restricted to the same organization, project, and environment in the canonical scope; it receives no `UPDATE`, `DELETE`, or `TRUNCATE` privilege. Database ownership/migration roles are separate from the runtime role. Test matching and cross-environment audit reads, and denied mutations, as the runtime role.

### Expand-then-contract compatibility

Every schema change follows expand-then-contract. First add schema compatible with the currently deployed application; deploy code that supports both representations when needed; backfill and verify; deploy code that uses only the new representation; and remove obsolete schema only in a later migration after the rollback window. Each migration group must test that the previous application version still runs against the expanded schema. Never combine destructive contraction with the first rollout that requires it.

## 7. API and readiness behavior

1. Convert all `PlatformRepository` consumers to await reads/writes, including `withApiGuard`, project provisioning, admin routes, platform routes, audit writers, control-plane projections, and scheduled reset work.
2. Retain the route-auth structure test in the web build and the no-secret build behavior.
3. `/api/health` readiness may return healthy only after a bounded database ping, required schema/migration-version check, and at least 3 future UTC partition days. Database errors return 503. Keep liveness separate: liveness indicates process responsiveness; readiness indicates database availability, role permissions, and migration compatibility.
4. Production startup must require `DATABASE_URL`; production must not create a new JSON store or seed defaults on database failure. Development may use explicit test adapters, but they must be opt-in and clearly non-production.

## 8. Verification and CI gates

The existing CI job already provisions PostgreSQL 16 for RestaurantOS and exercises RLS using an app role. Extend the workflow with a separate control-plane database or isolated database/schema and a restricted control-plane runtime role. Do not run tenant-isolation tests as the PostgreSQL superuser or schema owner. Create a unique disposable database/schema per test worker and drop it after the job.

### Transaction/crash suite

Run against disposable PostgreSQL from CI, never a developer or production database. A child process commits each operation and is immediately killed with `SIGKILL`; a new process reconnects and asserts state. Run at least 20 iterations per operation:

- create/revoke key, then restart and verify old key is denied;
- zero-grace rotate, then restart and verify old denied/new accepted;
- suspend project and update entitlements/quota, then restart and verify persisted enforcement;
- verify failed/rolled-back transactions leave no partial replacement or policy state;
- verify migration-version mismatch and database loss make readiness return 503.

Record database row state and API-visible authorization results. SIGTERM tests remain useful but do not replace SIGKILL tests.

### Multi-server shared state

Start two application processes against one test database and restricted application role. Split requests across both processes and verify quota and rate limits are enforced against one shared counter with no oversubscription. Include concurrent requests at and across the exact limit, retries, and reset boundaries. Measure the stated throughput and latency targets.

### Tenant isolation

For each registered plugin with persistent state, create tenant A and tenant B fixtures; test reads, writes, lookups by id, list filters, quotas, and error paths from both contexts. Include cross-tenant foreign-key attempts and direct repository calls outside an authenticated tenant scope. Run these tests as the restricted runtime role with RLS enabled and forced. Phase 2b begins with RestaurantOS and HospitalOS, then adds each plugin as it gains persistent tenant data. Keep the anonymous-route sweep in CI and retain route-auth structure tests in the build.

If a JSON adapter remains during migration, run one shared repository contract suite against both JSON and Prisma adapters. Remove the JSON adapter after cutover rather than letting the implementations drift.

`pnpm run test:integration` is a required command to add to the root/package task graph; it does not yet represent a complete control-plane PostgreSQL integration suite. The CI job must run the Prisma baseline/readiness tests, transaction suite, RLS tests, two-server races, importer tests, anonymous-route sweep, and route-auth structure test.

### Backup and restore drill

Before cutover, restore a PostgreSQL backup into an isolated scratch database and run the migration/readiness-version check plus control-plane integrity assertions against the restored database. Record the exact backup/restore commands, PostgreSQL version, readiness role, and results. Never target a production database with the restore drill.

### Required local/CI commands

```bash
pnpm exec prisma validate --schema prisma/schema.prisma
pnpm exec prisma migrate deploy
pnpm run test
pnpm run test:integration
pnpm run build
```

Integration jobs must provision PostgreSQL, set `TEST_DATABASE_URL`, apply migrations, and use a unique disposable database/schema per worker. No test may read or write `apps/web/orbitox/data` or another default application data directory.

## 9. Rollout and rollback

1. Confirm whether any environment has deployed this Prisma schema. Inspect migration history and the live schema in every existing environment; only choose a fresh full baseline after confirming none has been deployed. Confirm backup/restore procedure for each environment.
2. Apply additive schema migrations; do not remove JSON data or switch reads yet.
3. Run import in validation mode, review collection counts and key checks, then perform the idempotent import.
4. Run transaction, SIGKILL, multi-server, tenant-isolation, route-auth, anonymous-sweep, expand-then-contract rollback, backup/restore, and full build/test gates.
5. Deploy with PostgreSQL authoritative and JSON import path disabled for normal requests. Monitor readiness, transaction errors, quota contention, and migration version.
6. Keep the source JSON snapshot read-only for 30 days. Rollback is an application rollback to a compatible DB schema, not a silent switch back to JSON writes.
7. Remove JSON runtime persistence only after successful cutover and explicit acceptance. Preserve the legacy-format import fixture indefinitely.

## 10. Decisions and pre-implementation gate

- **Owner decision recorded (2026-10-27):** No staging, production, shared development, or hosted PostgreSQL environment has ever had the current Prisma schema or RestaurantOS migration applied. Local databases are disposable. Step 1 is released to generate a reviewed complete fresh baseline from the entire Prisma schema; the superseded RestaurantOS-only migration is preserved outside Prisma's active migration path.

- Rate limits use a fixed 60-second window keyed by authenticated key id or trusted-proxy-resolved client IP for anonymous traffic; database failure denies with 503.
- Phase 2b starts with RestaurantOS and HospitalOS. The existing RestaurantOS RLS job is extended; tests use a non-owner, non-superuser role without `BYPASSRLS`.
- The initial benchmark target is 1,000 aggregate authorization/rate-limit decisions per second across two application servers, p95 added latency <= 25 ms and p99 <= 75 ms; measure and report before revising the target.
- Quotas use both project aggregate and environment-specific limits, reserved and released atomically using a stable reservation id and period-keyed counters.
- Any remaining JSON adapter must pass the same repository contract tests as Prisma and is removed after cutover. The verified JSON snapshot is read-only for 30 days.
- CI already has a PostgreSQL service for RestaurantOS; Step 1 adds a separate disposable control-plane database/schema, restricted role, migration-version readiness check, and Prisma migrate-based test wiring. Root/package `test:integration` tasks must be added for the Phase 2 database suite.

## 11. Gated implementation sequence

Implement one commit group at a time and stop after each gate for independent verification. Do not start the next step until the current step's exact commands and results have been reviewed.

1. **Schema, baseline, readiness, and test database:** add missing project/audit/rate models; generate the reviewed full baseline using the recorded fresh-database decision; add the migration-version readiness check; configure a local PostgreSQL 16 container and CI control-plane database/role. Gate: clean database migrates, Prisma validates, readiness returns 503 on version mismatch and database loss, RLS tests run as the restricted role including an unset-context query, and runtime-role audit update/delete attempts are denied.
2. **Async repository contract and adapter:** implement keys, projects, entitlements, quotas and convert every consumer to `await`. Gate: existing tests, route-auth structure test, and official root build pass.
3. **Transactions and crash tests:** run 20+ `SIGKILL` iterations per security operation against PostgreSQL, plus rollback/partial-write tests.
4. **Two-server consistency:** test shared quotas and both key/project rate limits with exact-limit races and no oversubscription; benchmark one hot project and validate the selected contention mitigation.
5. **JSON importer:** include the legacy fixture, unchanged verifier/pepper authentication test, verification report, and fail-on-unexpected-target-row test.
6. **Phase 2b tenant data:** migrate RestaurantOS and HospitalOS persistence with RLS and cross-tenant tests as the restricted application role; add further plugins when persistent tenant data is introduced.
