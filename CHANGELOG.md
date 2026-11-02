# 🪐 OrbitoX Platform Changelog

All notable changes to the OrbitoX Platform and Compose SaaS architecture are documented in this file.

---

## [Phase 5 & Compose SaaS Deliverables] - 2026-11-02

### 🚀 Highlights & Features
- **Scoped Package Architecture (`@orbitox-io`)**:
  - Published and converted all workspace packages and engines under the official `@orbitox-io` GitHub Packages scope (`@orbitox-io/plugin-engine`, `@orbitox-io/sdk`, `@orbitox-io/cli`, `@orbitox-io/crm`).
  - Added seamless backward-compatible deprecation stubs for legacy `@orbitox/*` packages.
- **Tenant Lifecycle SDK (`@orbitox-io/sdk`)**:
  - Released client SDK with full tenant lifecycle governance (`tenants.create`, `tenants.get`, `tenants.suspend`, `tenants.resume`, `operations.get`, `operations.retry`).
  - Built-in automatic exponential backoff retry for transient network (503) and rate limits (429).
  - Strongly typed HospitalOS client methods with zero secret exposure.
- **Operator CLI (`@orbitox-io/cli`)**:
  - Released administrative and tenant operator CLI with commands for `tenants provision`, `tenants suspend`, `tenants resume`, `operations inspect`, and `plugins list`.
  - Enforced catalogue filtering (installable HospitalOS / RestaurantOS only; CRM excluded) and strict terminal log secret masking.
- **OpenAPI 3.1.0 Specifications & CI Parity**:
  - Public platform specification: `docs/openapi/platform-api.json`.
  - Plugin runtime specifications: `docs/openapi/hospital-os-api.json` (28 routes) and `docs/openapi/restaurant-os-api.json` (13 routes).
  - Automated CI route parity test (`test/openapi-route-parity.test.ts`) guaranteeing 100% synchronization between code routes and specifications.

### 🛡️ Resilience & Security Hardening
- **Distributed Operation Lease (`PlatformOperation`)**:
  - Implemented distributed lease locking with configurable TTL (`OPERATION_LEASE_TTL_SECONDS`, default 30s in prod, 2s in test).
  - Exactly one server worker can hold a provisioning lease; crash recovery cleanly takes over expired leases without split-brain races.
  - **Audit Rule (a)**: Restricted lease force (`$4 = true`) exclusively to audited platform admin overrides (`action=admin-force-lease`). Ordinary `retry` and `resume` operations never force active leases.
- **Atomic Tenant Idempotency & Safe Retries**:
  - **Audit Rule (b)**: Introduced `TenantIdempotencyKey` table committed within the exact same database transaction as business records (`withTenantTx`).
  - SDK retries on HTTP 503 or 429 replay idempotent responses without creating duplicate records.
- **Strictly Gated Test Latency**:
  - **Audit Rule (c)**: Gated `TEST_STEP5_DELAY_MS` and standalone harness flags exclusively to `NODE_ENV === 'test'`.
  - Enforced fail-closed boot assertion in `instrumentation.node.ts` prohibiting test flags in production deployments.

### 📚 Documentation
- Added 2-minute tenant provisioning quickstart: `docs/QUICKSTART_TENANT_PROVISIONING.md`.
- Added Contract V2 plugin authoring guide: `docs/CONTRACT_V2_PLUGIN_AUTHOR_GUIDE.md`.
- Added complete operational environment variables manual: `docs/OPERATIONS_GUIDE_ENV_VARS.md`.

---

## [Phase 4] - 2026-10-31

### Features & Resiliency Matrices
- Implemented transactional multi-tenant provisioning saga with 8 discrete phases and cryptographic audit identity.
- Added comprehensive 8-stage provisioning matrix (`test/phase4-full-matrix.test.ts`):
  - Matrix 1 & 2: Sub-60s provisioning SLA on real Next.js and RestaurantOS servers.
  - Matrix 3: Idempotent replay with matching operation and tenant IDs.
  - Matrix 4: Real server kill-and-resume recovery via distributed lease.
  - Matrix 5: Partial failure recovery through `POST /api/v1/operations/:id?action=retry`.
  - Matrix 6: Cross-organization 403 authorization isolation.
  - Matrix 7: Dual-plugin suspend/resume enforcement within 5-second SLA.
  - Matrix 8: Audit event operator identity recording.
