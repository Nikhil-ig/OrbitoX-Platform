# OrbitoX Phase 2b Reference Pack (tested code from your technical lead)

This pack is **working, tested reference code** for 2b-1 and 2b-2. It is not pseudo-code. Port it into the repository, keep the behaviour, and keep the tests passing. Where the repo uses Prisma, follow the porting notes in section C.

## What was run, and the results

Everything ran on PostgreSQL 16.15 with real role logins (`orbitox_runtime`, `orbitox_maintenance`), each time on a fresh database:

| Suite | Command | Result |
|---|---|---|
| SQL invariants (adversarial, includes 2 concurrency races) | `bash sql/run_all.sh` | 62 passed, 0 failed |
| TypeScript type-check (strict) | `npx tsc -p ts` | 0 errors |
| Unit tests (crypto, pepper rotation, bridge signing, seed gate, errors) | `npx tsx --test ts/test/unit.test.ts` | 19 / 19 |
| Integration on the real database (pool safety, PHI, 20-way races, idempotency, outbox) | `HMS_IT_RUNTIME_URL=… npx tsx --test ts/test/integration.test.ts` | 12 / 12 |
| Negative control (dropped the bed-uniqueness index and the payment validator) | same integration suite | 2 failing tests, as required |

Two real bugs were found and fixed while building this. Do not reintroduce either:
1. **A BEFORE INSERT trigger fires even for rows that `ON CONFLICT DO NOTHING` then skips.** The first payment design bumped `paidMinor` on a retried idempotency key: one payment row, double the paid amount. That was reproduced, then fixed by validating in BEFORE (under a row lock) and applying the amount in AFTER, which fires only for rows actually inserted.
2. **A retry of a payment that settled the invoice hit "invoice is PAID"** instead of replaying. The fix: after taking the lock, the validator skips any row whose idempotency key already exists. plpgsql takes a fresh snapshot per statement, so it sees a concurrent duplicate that committed meanwhile.

## A. Files

```
sql/001_hms_plugin_schema.sql   HospitalOS plugin schema: 14 tables, forced RLS, invariants I1-I8
sql/test_hms_schema.sh          62 adversarial checks (tenant escape, FK escape, races, ledgers, logs)
sql/run_all.sh                  fresh DB -> migrate -> test
ts/src/tenant-db.ts             withTenantTx: tx-local tenant, branded TenantTx, safe retries, bounded timeouts
ts/src/db-errors.ts             PG error -> API error by SQLSTATE + constraint NAME (no message parsing)
ts/src/idempotency.ts           durable idempotency in the mutation tx + canonical JSON request hash
ts/src/phi-crypto.ts            AES-256-GCM field crypto (AAD-bound), key rotation, tenant-salted blind index
ts/src/hms-repository.ts        createPatient, phone search, purpose-limited audited read, admit/discharge,
                                book appointment, idempotent payment; outbox on every mutation
ts/src/pepper.ts                N1: rotation-aware API key verifiers (= ANY(candidates))
ts/src/bridge-signature.ts      platform -> RestaurantOS signed tenant/principal headers + replay protection
ts/src/seed-gate.ts             A5: demo seed only in development + flag; random 256-bit table tokens
ts/test/unit.test.ts, ts/test/integration.test.ts
```

## B. Invariants the database enforces (the app cannot bypass them)

| ID | Rule | Mechanism | Proven by |
|---|---|---|---|
| I1 | Tenant isolation; no tenant means 0 rows and inserts refused; rows cannot be moved to another tenant | forced RLS with `USING` + `WITH CHECK` on `app_current_tenant()` | 7 SQL checks + pool-leak integration test |
| I2 | No cross-tenant references, even for a superuser | composite `(tenantId, id)` FKs everywhere | SQL check |
| I3 | One open admission per patient and per bed; no admission to a bed under maintenance; closed admissions immutable | partial unique indexes + guard trigger | SQL + 20-way race (1 ok, 19 `BED_OCCUPIED`) |
| I4 | No doctor double-booking, no overlapping appointments for one patient | `EXCLUDE USING gist` on `tstzrange` (btree_gist) | SQL + 10-way race |
| I5 | Lab state machine, results immutable once VERIFIED, verifier ≠ resulter | trigger + CHECKs | SQL |
| I6 | Payments are an append-only ledger; never above the invoice total; never double-recorded; paid amount derived only from the ledger | BEFORE lock and validate, AFTER apply, unique idempotency key, guard on `paidMinor` | SQL + concurrent cashiers + 20 concurrent identical payments |
| I7 | PHI access log and break-glass grants are append-only; runtime cannot read the PHI log; break-glass needs a reason of 20+ characters and lasts at most 4 h | grants + policies + CHECKs | SQL |
| I8 | Runtime can never DELETE or TRUNCATE clinical or financial rows | grants | SQL |
| — | Plaintext PHI cannot be stored by mistake | `hms_is_sealed()` CHECK on every PHI column | SQL + integration (raw row has no plaintext) |

## C. Porting into the repo (Prisma 6)

1. **Migration.** Put `001_hms_plugin_schema.sql` into `prisma/migrations/<ts>_orbitox_phase2b_hms_plugin/migration.sql` as written. Prisma cannot express RLS, triggers, exclusion constraints or partial unique indexes, so they live in SQL. In `schema.prisma`, model the tables with `@@id([tenantId, id])` and composite `@relation(fields: [tenantId, x], references: [tenantId, id])`. **Must:** `prisma migrate diff --exit-code` stays clean after deploy. If Prisma reports drift on the partial indexes or the exclusion constraints, report exactly which, and do not "fix" it by deleting the constraint.
2. **withTenantTx on Prisma.** Same contract as `tenant-db.ts`:
   ```ts
   return prisma.$transaction(async (tx) => {
     await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true),
                                 set_config('statement_timeout', ${`${st}ms`}, true),
                                 set_config('lock_timeout', ${`${lt}ms`}, true)`;
     return fn(brand(tx, tenantId));          // TenantTx exposes only $queryRaw/$executeRaw + typed model calls
   }, { isolationLevel: 'ReadCommitted', timeout: 10_000 });
   ```
   Keep the retry policy: retry only 40001 and 40P01. A COMMIT that fails with no SQLSTATE becomes `COMMIT_OUTCOME_UNKNOWN` and is never retried. Keep the forbidden-SQL guard for raw queries.
3. **Errors.** Use `mapDbError`. Prisma wraps PostgreSQL errors (P2002, P2003, P2010 and the raw `meta`), so add an adapter that extracts the SQLSTATE and constraint name from the Prisma error before mapping. Add a test per constraint name in `CONSTRAINT_ERRORS`.
4. **Routes.** Every `/api/hospital/*` and `/api/v1/hms/*` handler becomes: guard (existing `withHospitalGuard`) → `withTenantTx(prisma, authContext.tenantId, tx => repo…)` → `mapDbError` on failure. Delete `safeProxyOrFallback`, the in-memory `hospitalStore` and its `AsyncLocalStorage`. A database failure returns 503, never `success: true` from memory.
5. **Keys and env.** `ORBITOX_PHI_KEYS`, `ORBITOX_PHI_ACTIVE_KID` and `ORBITOX_PHI_INDEX_KEY` become required in production. Add them to the startup validation in `instrumentation.ts` and to the secret scan rules. Never log them.
6. **Pepper (N1).** Replace the single-pepper lookups in `authorizeApiKey` and `findKeyByRawSecret` with `candidateVerifiers()` and `= ANY($1::text[]) LIMIT 2`; two rows means fail closed. Store `verifierPepperId` on new keys. Add a maintenance report: count of keys per pepper id. Keep compatibility with the existing `ORBITOX_SERVER_PEPPER` by treating it as `{"legacy": value}` when `ORBITOX_SERVER_PEPPERS` is unset.
7. **Bridge (for 2b-4).** The platform signs every request it forwards to RestaurantOS with `signBridgeRequest`, and RestaurantOS rejects any request that fails `verifyBridgeRequest`. Use a PostgreSQL nonce table (schema in the file comment) so replay protection holds across servers. Raw customer API keys are never forwarded.
8. **Seed (A5).** Every seeding path calls `assertDemoSeedAllowed()`. Production table tokens come from `newTableToken()`, with only the hash stored, and can be rotated per table. Remove `secret_t14_ludhiana` and `secret_t${i}` from the source.

## D. What is deliberately NOT in this pack (your work, with tests)

- **Staff identity in HospitalOS** (`security/login`, `session`, `roles`, `permissions`, `break-glass` routes). Design sessions as random tokens stored hashed with an expiry, revocable, stored in the plugin schema with RLS. Role checks happen in the repository layer, using the actor's role from the session, not from request headers.
- **Who may read which patient** (care-team relationships). The schema gives tenant isolation and purpose limits. Per-patient authorisation inside a tenant is an application rule: add it to `readPatientForPurpose`.
- **Outbox listener and SSE fan-out:** one dedicated `pg` LISTEN connection per server, re-reading the outbox under `withTenantTx`, with `Last-Event-ID` replay. The guide from 29 Oct, section 2.6, has the design.
- **Data import** of existing in-memory hospital data: the same insert-only rules as Step 5.
- **Maintenance jobs:** idempotency and outbox purge, PHI re-seal after key rotation, nonce purge.

## E. Order and acceptance

1. **2b-1:** pepper rotation (N1), the real pepper check (F1), the per-transaction import lock (F2), hospital writes failing closed (A2), seed gate (A5).
2. **2b-2:** migration + Prisma models + `withTenantTx` + `mapDbError` adapter + repository. Port both test suites so CI runs them on a fresh PostgreSQL 16 and adds the negative control (drop an invariant and expect failure).
3. Stop and report: commit SHA, commands, counts per suite, CI link with per-job conclusions, and any test you changed and why. Do not claim acceptance.
