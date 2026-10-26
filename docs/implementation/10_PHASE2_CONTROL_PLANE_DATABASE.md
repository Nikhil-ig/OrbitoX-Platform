# OrbitoX Phase 2: Transactional Control-Plane Persistence

**Status:** Design proposal; runtime cutover not implemented  
**Scope:** Replace `PlatformRepository` JSON persistence for the web control plane with PostgreSQL transactions.  
**Prerequisites:** Confirm the target database migration history and provide a disposable `TEST_DATABASE_URL` through the test environment. Never put database credentials in this document or source control.

## 1. Goals and invariants

1. PostgreSQL is the sole authoritative persistent store after cutover. Production must not silently fall back to JSON or seed an empty repository when PostgreSQL is unavailable.
2. A successful security-sensitive API response follows a committed transaction. This includes key create/revoke/suspend/rotate, project status and entitlement changes, plan and quota changes, and project provisioning/deprovisioning.
3. A key rotation writes the replacement key and retires the old key in one database transaction.
4. Tenant authorization is derived from authenticated server-side context and applied to every read and write. Client-provided tenant identifiers are never sufficient scope.
5. Usage quota reservations and rate-limit counters are shared across application instances and use atomic database operations.
6. Existing JSON state is migrated explicitly, verified, and retained read-only until an operator confirms cutover. It is not a runtime fallback.
7. Migration failure, database outage, or invalid state fails startup/readiness. No empty seed state is written over unavailable data.

## 2. Current baseline and known gaps

- `orbitox/prisma/schema.prisma` already contains normalized project, environment, key, credential, package, domain, quota, and rate-limit policy models.
- The Prisma schema has no project plan string, enabled-service list, API-call quota, or project rate limit fields required by `PlatformProject`.
- The schema has no platform audit event model or shared rate-limit counter model.
- `PlatformRepository` currently exposes synchronous static methods backed by process-local arrays and a JSON file. An asynchronous Prisma transaction cannot be hidden behind those synchronous methods.
- The migration directory currently contains `20261007_restaurant_os_subsystem/migration.sql`; it is not a complete initial migration for the full Prisma schema. It must not be treated as a baseline for an arbitrary existing database.
- Prisma 6.19 CLI/client dependencies have been added and the existing schema validates/generates. No production or test database URL is configured in this worktree, and no runtime code uses Prisma yet.

## 3. Target architecture

```text
Next.js route / withApiGuard
  -> async PlatformRepository contract
    -> PlatformService / domain validation
      -> Prisma client (server-only singleton)
        -> PostgreSQL, explicit transactions and tenant filters
```

Introduce an async repository contract at the plugin-engine platform boundary. Keep pure key generation, risk calculations, DTO mapping, and validation independent of Prisma. Put Prisma-specific persistence in a server-only adapter so browser-safe plugin entry points cannot import it.

Routes and their helpers that read or mutate platform state become `async` and `await` repository operations. The authentication and route-authorization order remains unchanged. API behavior must not return success until the transaction resolves. Errors map to existing response contracts; database failures return a non-success response and are logged without exposing SQL or credentials.

Do not keep synchronous cached state as an alternate authority. If read caching is later added, it is disposable and invalidated from committed writes; it cannot authorize a request using stale revoked-key or suspended-project state.

## 4. Schema and migration plan

### 4.1 Schema changes

Extend the existing models to preserve the current repository DTOs, including `plan`, `enabledServices`, `apiCallQuota`, and `rateLimitPerMin` on projects, plus any currently persisted fields missing from the Prisma model. Add:

- `PlatformAuditEvent`: immutable event id, actor, action, entity type/id, tenant/project scope, timestamp, and JSON metadata. Never store raw API secrets.
- `PlatformRateLimitBucket`: unique scope key and window start, atomic request count, and expiry. Key the scope by authenticated key/project or normalized anonymous client scope, not an untrusted tenant header.
- Any missing foreign keys/indexes needed to enforce organization, project, environment, and tenant ownership in queries.

Keep quota and rate-limit policy separate from mutable usage. Represent large counters as `BigInt` in PostgreSQL and convert at the repository boundary with safe-integer validation.

### 4.2 Migration history decision

Before writing the baseline, inspect each target database's `_prisma_migrations` table and compare its actual schema to the Prisma schema. Do not mark the RestaurantOS migration as a full baseline.

- **Fresh database:** generate and review a complete initial migration from the entire Prisma schema, then apply it with `prisma migrate deploy`.
- **Existing database:** preserve its applied history. Generate an incremental migration from the inspected live schema to the reviewed Prisma schema. Resolve a baseline only after proving all baseline objects already exist and match.
- **JSON import:** provide an explicit, restartable import command. Parse legacy files using the compatibility rules (including missing `auditLogs` defaulting to empty), validate all references and key invariants, then insert in a transaction or bounded, idempotent batches with a migration ledger. Fail on unexpected target rows rather than overwrite them. Verify counts and stable identifiers for every collection before cutover. Keep the verified source snapshot read-only until acceptance is signed off.

The first migration test must load the old JSON format and import it into a disposable database, then verify projects, keys, domains, quotas, audit history, and key authentication behavior.

## 5. Transaction contracts

### Security and governance writes

- Key creation: insert the key verifier and metadata, then commit before returning the plaintext secret once.
- Revoke/suspend/status change: update by key id and tenant/project scope in one transaction; commit before success.
- Rotation: insert replacement and retire/expire old key in the same transaction; rollback both on any failure.
- Project suspend, plan/entitlement, project quota, rate policy, and project lifecycle updates: apply all related rows atomically.
- Provisioning/deprovisioning: create or retire project, environments, default policy rows, and initial keys transactionally.

### Shared quota

Reserve quota with a conditional atomic update, such as `UPDATE ... SET used = used + 1 WHERE used < limit RETURNING used`. A missing returned row means quota exhausted. Use a durable request/reservation id where retries could otherwise double-charge. Release only the reservation owned by that request after a failed billable operation. Test the limit under simultaneous workers and multiple server processes.

### Shared rate limiting

Use a PostgreSQL atomic upsert on the unique `(scope_key, window_start)` bucket. Increment and return the count in one statement/transaction; reject requests above the configured threshold. Define a single window algorithm and clock source, expiry/cleanup policy, and behavior under database errors. No process-local Map may be used as an allow-through fallback in distributed/production mode.

## 6. API and readiness behavior

1. Convert all `PlatformRepository` consumers to await reads/writes, including `withApiGuard`, project provisioning, admin routes, platform routes, audit writers, control-plane projections, and scheduled reset work.
2. Retain the route-auth structure test in the web build and the no-secret build behavior.
3. `/api/health` may return healthy only after a bounded database ping and required schema/version check. Database errors return 503. Liveness and readiness should be separate: liveness indicates process responsiveness; readiness indicates database availability and migration compatibility.
4. Production startup must require `DATABASE_URL`; production must not create a new JSON store or seed defaults on database failure. Development may use explicit test adapters, but they must be opt-in and clearly non-production.

## 7. Verification and CI gates

### Transaction/crash suite

Run against disposable PostgreSQL from CI, never a developer or production database. A child process commits each operation and is immediately killed with `SIGKILL`; a new process reconnects and asserts state. Run at least 20 iterations per operation:

- create/revoke key, then restart and verify old key is denied;
- zero-grace rotate, then restart and verify old denied/new accepted;
- suspend project and update entitlements/quota, then restart and verify persisted enforcement;
- verify failed/rolled-back transactions leave no partial replacement or policy state.

Record database row state and API-visible authorization results. SIGTERM tests remain useful but do not replace SIGKILL tests.

### Multi-server shared state

Start two application processes against one test database. Split requests across both processes and verify quota and rate limits are enforced against one shared counter with no oversubscription. Include concurrency tests around the exact limit.

### Tenant isolation

For each registered plugin with persistent state, create tenant A and tenant B fixtures; test reads, writes, lookups by id, list filters, quotas, and error paths from both contexts. Include cross-tenant foreign-key attempts and direct repository calls outside an authenticated tenant scope. Keep the anonymous-route sweep in CI and retain route-auth structure tests in the build.

### Required local/CI commands

```bash
pnpm exec prisma validate --schema prisma/schema.prisma
pnpm exec prisma migrate deploy
pnpm run test
pnpm run test:integration
pnpm run build
```

Integration jobs must provision PostgreSQL, set `TEST_DATABASE_URL`, apply migrations, and use a unique disposable database/schema per worker. No test may read or write `apps/web/orbitox/data` or another default application data directory.

## 8. Rollout and rollback

1. Confirm migration lineage and backup/restore procedure for each environment.
2. Apply additive schema migrations; do not remove JSON data or switch reads yet.
3. Run import in validation mode, review collection counts and key checks, then perform the idempotent import.
4. Run transaction, SIGKILL, multi-server, tenant-isolation, route-auth, anonymous-sweep, and full build/test gates.
5. Deploy with PostgreSQL authoritative and JSON import path disabled for normal requests. Monitor readiness, transaction errors, quota contention, and migration version.
6. Keep the source JSON snapshot read-only for the agreed rollback window. Rollback is an application rollback to a compatible DB schema, not a silent switch back to JSON writes.
7. Remove JSON runtime persistence only after successful cutover and explicit acceptance. Preserve the legacy-format import fixture indefinitely.

## 9. Open decisions before implementation

- Which deployed database history is authoritative: a fresh baseline or one/more existing schemas with `_prisma_migrations` history?
- What disposable `TEST_DATABASE_URL` and CI PostgreSQL service should be used? No database URL is configured in the current worktree.
- Which rate-limit window semantics and anonymous identity key are the compatibility contract?
- Which plugins currently persist tenant-owned state and therefore require cross-tenant tests in the first CI gate?
- What is the JSON import retention and rollback window for production cutover?
