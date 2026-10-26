# 🪐 OrbitoX Platform — Master Repository Audit & State of the Art Report
**Audit Date:** October 25, 2026  
**Audited Branch:** `feat/compose-saas`  
**Audited Commit SHA:** `e3fd2fa74174360f0984a7b9c9cd04e4059d3e57`  
**Working Tree Status:** Clean (0 uncommitted files)  
**Classification:** Enterprise Engineering Audit & Technical Due Diligence  

---

## 1. Executive Assessment

### 1.1 What OrbitoX Currently Is
OrbitoX is an ambitious, dual-topology enterprise platform composed of:
1. **The Core Monorepo (`orbitox/`)**: A Turborepo + pnpm workspace containing 37 package targets across foundational libraries (`@orbitox/core`, `@orbitox/runtime`, `@orbitox/plugin-engine`, `@orbitox/types`), domain plugins (`@orbitox/pos`, `@orbitox/crm`, `@orbitox/commerce`, `@orbitox/hms`, `@orbitox/finance`, `@orbitox/inventory`), developer tooling (`@orbitox/cli`), a Next.js Platform Control Center (`orbitox/apps/web`), and an interactive visual design application (`orbitox/apps/celebrations`).
2. **Independent Vertical Runtimes (`projects/external-os/`)**: Dedicated business operating systems that consume the platform kernel and domain plugins. Most notably, **RestaurantOS** (`projects/external-os/restaurant-os`) represents an independent, multi-tenant hospitality operations product featuring a 7,000+ line authoritative runtime server (`src/server.ts`), PostgreSQL Row Level Security (RLS), atomic file-backed JSON fallback storage, kitchen DAG scheduling, and real-time Server-Sent Events (SSE).
3. **Reference Products & Test Consumers (`projects/`)**:
   - `projects/external-os/hospital-os`: An enterprise hospital management system prototype with a 6-tier context tree, IoT telemetry alerting, and 11 clinical workflow stages.
   - `projects/examples/test-consumer-app`: A clean external Node.js consumer validating the consumption of `@orbitox-io/*` packages published to GitHub Packages (`npm.pkg.github.com`).

### 1.2 Demonstrably Implemented & Working Capabilities
Through executable verification and static analysis, the following capabilities are confirmed **Verified Implemented**:
- **Multi-Tenant Context Propagation**: `AsyncLocalStorage` tenant context propagation via `MultiTenantEngine` (`@orbitox/plugin-engine`) with sub-millisecond RAM caching (`~6 µs`) and Express/Connect middleware.
- **Cryptographic Security Primitives**: Ed25519 and RSA-2048 keypair generation, SHA-256 payload signing, anti-tamper verification, and runtime facade freezing (`SandboxGuard.freezeAllFacades`).
- **Core Domain State Machines & Business Logic**:
  - Headless CRM lead lifecycle (`NEW` → `CONTACTED` → `QUALIFIED` → `PROPOSAL_SENT` → `WON`) with algorithmic lead scoring (`@orbitox/crm`).
  - Headless POS order state machines, deterministic pricing quotes, kitchen preparation directed acyclic graphs (DAGs), double-idempotency order outbox, and table QR trust credentials (`@orbitox/pos`).
- **RestaurantOS Hospitality Workspaces & SSE Isolation**: Multi-tenant SSE event bus partitioning with strict tenant isolation, zero cross-tenant leakage, staff PIN/device authentication, and floor layout persistence.
- **External Runtime Control SDK**: Project heartbeat registration, command issuance/polling loop, and fleet health monitoring (`@orbitox/external-runtime-sdk` and `@orbitox/external-project-engine`).

### 1.3 Key Architectural Divergences & Gaps
1. **Platform Control Plane Persistence Duality**: The Platform Control Center operates two competing state layers:
   - `PersistentControlStore` (in `external-project-engine`): File-backed atomic JSON store (`control-plane-store.json`) for projects, revisions, commands, and audit records.
   - `PlatformRepository` (in `plugin-engine`): In-memory static arrays for organizations, environments, API keys, credentials, and quota policies that do not persist across restarts.
2. **HospitalOS Compilation Failure**: While its integration test passes using runtime interpretation (`tsx`), its production build (`npm run build` / `tsc -p tsconfig.json`) fails with **14 TypeScript errors** across duplicate function declarations and missing type exports.
3. **Celebrations Studio Usability vs. Test Claims**: A deep forensic audit (P27) uncovered that automated tests claiming "100% Pass" bypassed the DOM and executed controller functions directly. The actual editor suffers from lack of PostCSS compilation, selection overlay event interception, and missing database models for project state.
4. **Test Suite Coverage in CI**: The monorepo defines extensive unit tests (70 passing in `@orbitox/core`, 9 passing in `@orbitox/pos`, 31 in `test-consumer-app`), yet `.github/workflows/ci.yml` only runs tests for `@orbitox/external-project-engine` and RestaurantOS, completely skipping `@orbitox/core`, `@orbitox/pos`, `@orbitox/crm`, and `@orbitox/plugin-engine`.
5. **Type-Check Silencing**: `pnpm run type-check` at the monorepo root runs `tsc --noEmit` on only 4 of 37 packages because the remaining 33 packages omit the `"type-check"` script from their `package.json`.

---

## 2. Repository Anatomy & Directory Structure

```
OrbitoX Platform/ (Repository Root)
├── .agents/
│   └── skills/orbitox-expert/       Master engineering and API reference manual
├── .github/
│   └── workflows/ci.yml             Main CI pipeline (Build, Pack-and-verify, Gitleaks, RestaurantOS E2E, Docker)
├── AGENTS.md                        Strict architecture, security, and package guidelines
├── README.md                        Top-level onboarding and fleet monitoring overview
├── docs/                            Platform, control-plane, and architecture guides
│   ├── control-plane/               Universal Control Plane architecture (v4.0–v4.2)
│   ├── platform-control-center/     Control Center wireframes, UX, and security models
│   ├── implementation/              Historical implementation plans and security threat models
│   ├── archive/celebrations-studio/ Comprehensive archive of Studio engineering phases (P10–P27)
│   └── SECURITY_CLEANUP.md          Security audit and history remediation procedures
├── developer_guide/                 Deep-dive database, core engine, and hospital SaaS guides
├── B2B2C_Template_Docs/             B2B2C and multi-tier commerce architecture guides
├── scripts/                         31 root integration, stress, and security test scripts
├── projects/                        Independent external runtime products and examples
│   ├── external-os/
│   │   ├── restaurant-os/           Authoritative RestaurantOS independent product runtime
│   │   └── hospital-os/             HospitalOS reference clinical vertical
│   └── examples/
│       └── test-consumer-app/       Consumer application testing @orbitox-io packages
└── orbitox/                         Central monorepo (pnpm + Turborepo)
    ├── apps/
    │   ├── web/                     Platform Control Center (Next.js 15, port 3005)
    │   └── celebrations/            Celebrations Studio visual editor (Next.js 15, port 3001)
    ├── packages/                    Shared foundational packages (kernel & SDKs)
    │   ├── core/                    Kernel auth, RBAC, ABAC, audit, billing, control plane
    │   ├── types/                   Canonical TypeScript domain interfaces
    │   ├── utils/                   Common cryptographic, string, and math utilities
    │   ├── sdk/                     Plugin decorator and dependency injection abstractions
    │   ├── plugin-engine/           Bootstrapper, MultiTenantEngine, CryptoSigner, SandboxGuard
    │   ├── runtime/                 OrbitoX application runtime container
    │   ├── services/                AI gateway, file storage, notification services
    │   ├── ui/                      Shared React design system and dynamic components
    │   ├── importer-core/           Visual design importer and scene graph compiler
    │   ├── external-runtime-sdk/    ControlClient for external runtimes
    │   └── compat-*/                Compatibility forwarding proxies (@orbitox-io/* -> @orbitox/*)
    ├── plugins/                     Business domain packages
    │   ├── pos/                     Headless POS, dining, kitchen DAG, KDS, QR trust
    │   ├── crm/                     Headless CRM sales engine, lead scoring, state machine
    │   ├── commerce/                E-commerce catalog, cart, and checkout engine
    │   ├── finance/                 General ledger and accounting engine
    │   ├── inventory/               Warehouse stock and SKU tracking
    │   ├── hms/                     Hospital management system plugin
    │   ├── hrms/                    Human resource management and employee tracking
    │   ├── school/                  School administration and student records
    │   └── external-project-engine/ Control plane fleet engine and project provisioning
    ├── tools/
    │   └── cli/                     OrbitoX CLI (@orbitox/cli) for scaffolding and key management
    ├── prisma/                      Prisma schema (PostgreSQL 16) and restaurant subsystem migration
    └── infra/docker/                Docker initialization scripts and health check profiles
```

---

## 3. Package and Plugin Inventory

| Package / Directory | Name in `package.json` | Classification | Dependencies | Consumers | Test Suite | Current Status | Known Issues |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `orbitox/packages/core` | `@orbitox/core` | Kernel Core | `@orbitox/types`, `utils`, `sdk`, NestJS, Redis, BullMQ | `plugin-engine`, `runtime`, `services`, `apps/web` | Jest (70 tests passing) | Verified Implemented | Heavy NestJS dependency in non-NestJS runtimes |
| `orbitox/packages/types` | `@orbitox/types` | Foundational Types | None | All packages | `tsc --noEmit` | Verified Implemented | None |
| `orbitox/packages/utils` | `@orbitox/utils` | Utilities | `@orbitox/types` | `core`, `services`, `commerce` | `tsc --noEmit` | Verified Implemented | None |
| `orbitox/packages/sdk` | `@orbitox/sdk` | Developer SDK | `@orbitox/types`, `@nestjs/common` | `core`, `ui`, `commerce`, `pos` | Jest (1 test passing) | Verified Implemented | Missing `type-check` script |
| `orbitox/packages/plugin-engine` | `@orbitox/plugin-engine` | Platform Kernel | `@orbitox/core`, `types`, NestJS | `apps/web`, `runtime`, `test-consumer-app` | Jest (31 tests passing) | Verified Implemented | `PlatformRepository` state is in-memory only |
| `orbitox/packages/runtime` | `@orbitox/runtime` | Runtime Container | `@orbitox/core`, `plugin-engine`, `sdk` | `apps/web`, `hospital-os` | Jest (1 test passing) | Verified Implemented | Missing `type-check` script |
| `orbitox/packages/services` | `@orbitox/services` | Platform Services | `@orbitox/core`, `types`, `utils` | `apps/web` | Jest (3 tests passing) | Implemented, insufficiently verified | S3 and OpenAI integrations rely on env vars |
| `orbitox/packages/ui` | `@orbitox/ui` | UI Design System | `@orbitox/types`, `sdk`, `react`, `lucide-react` | `apps/web` | Jest | Partially Implemented | Some dynamic components lack unit tests |
| `orbitox/packages/external-runtime-sdk` | `@orbitox/external-runtime-sdk` | Client SDK | None | `restaurant-os`, `apps/web` | Smoke tests | Verified Implemented | None |
| `orbitox/packages/importer-core` | `@orbitox/importer-core` | Ingestion Engine | `@orbitox/types` | `celebrations` | Jest (13 test suites) | Verified Implemented | High complexity; needs tighter integration with Studio |
| `orbitox/packages/compat-*` | `@orbitox-io/*` | Scope Compat Proxies | `@orbitox/*` | `test-consumer-app`, external clients | Verified via consumer app | Verified Implemented | Compatibility layer only |
| `orbitox/plugins/pos` | `@orbitox/pos` | Business Plugin | `@orbitox/core`, `sdk`, `types`, `plugin-engine` | `restaurant-os`, `apps/web` | Jest (9 tests passing) | Verified Implemented | Acts as the de facto Restaurant domain engine |
| `orbitox/plugins/crm` | `@orbitox/crm` | Business Plugin | `@orbitox/plugin-engine` | `apps/web`, `test-consumer-app`, `celebrations` | Jest (4 tests passing) | Verified Implemented | None |
| `orbitox/plugins/commerce` | `@orbitox/commerce` | Business Plugin | `@orbitox/core`, `sdk`, `types`, `utils` | `apps/web` | Jest (1 test passing) | Partially Implemented | Backend NestJS module split in `backend/` |
| `orbitox/plugins/finance` | `@orbitox/finance` | Business Plugin | `@orbitox/types`, `utils` | `apps/web` | None | Partially Implemented | No test suite; mock data in UI |
| `orbitox/plugins/inventory` | `@orbitox/inventory` | Business Plugin | `@orbitox/types`, `utils` | `apps/web` | None | Partially Implemented | No test suite; mock data in UI |
| `orbitox/plugins/hms` | `@orbitox/hms` | Business Plugin | `@orbitox/types`, `utils` | `apps/web` | None | Partially Implemented | Distinct from `projects/external-os/hospital-os` |
| `orbitox/plugins/hrms` | `@orbitox/hrms` | Business Plugin | `@orbitox/types`, `utils` | `apps/web` | None | Partially Implemented | No test suite |
| `orbitox/plugins/school` | `@orbitox/school` | Business Plugin | `@orbitox/core`, `sdk`, `types` | `apps/web` | None | Partially Implemented | Minimal prototype |
| `orbitox/plugins/celebrations` | `@orbitox/celebrations` | Business Plugin | `@orbitox-io/crm` | `apps/celebrations` | Jest | Partially Implemented | Heavily entangled with creative templates |
| `orbitox/plugins/external-project-engine` | `@orbitox/external-project-engine` | Fleet Engine | `@orbitox/core`, `external-runtime-sdk`, `types` | `apps/web` | Jest (4 test suites) | Verified Implemented | File-backed JSON persistence |
| `orbitox/tools/cli` | `@orbitox/cli` | Developer CLI | `@orbitox/plugin-engine`, `commander`, `chalk` | Developers | Offline verify suite | Verified Implemented | Commands need unification with `@orbitox-io` |
| `orbitox/apps/web` | `web` | Platform Control Plane | All packages, Next.js 15, React 19 | Platform Operators | Smoke test suite | Verified Implemented | Duality between `/platform` and `/admin` routes |
| `orbitox/apps/celebrations` | `celebrations` | Creative App | `@orbitox/celebrations`, Next.js 15 | End Users, Creators | Playwright (8 spec files) | Partially Implemented | P27 forensic audit shows 28 interactive bugs |
| `projects/external-os/restaurant-os` | `restaurant-os` | Independent Runtime | `@orbitox/pos`, `external-runtime-sdk`, `@prisma/client` | Restaurant Operators & Diners | E2E test suites in `scripts/` | Verified Implemented | Lacks `"test"` script in `package.json` |
| `projects/external-os/hospital-os` | `hospital-os` | Reference Vertical | `@orbitox/core`, `plugin-engine`, `runtime`, `sdk` | Healthcare Operators | Integration test (`tsx`) | Failed (Build) | 14 TypeScript errors on `npm run build` |

---

## 4. Multi-Tenancy, Security, and Data Integrity Audit

### 4.1 Tenancy Isolation Mechanisms
- **AsyncLocalStorage Context**: Foundational context propagation is implemented in `MultiTenantEngine` (`packages/plugin-engine/src/tenancy/tenant-engine.ts`). Requests wrapped with `engine.middleware()` populate `req.tenant` and `req.tenantSession`. The `getActiveTenant()` helper prevents parameter drilling and throws a fail-closed exception if called outside an active tenant session.
- **PostgreSQL Row Level Security (RLS)**: Implemented in `projects/external-os/restaurant-os/packages/storage/postgres-store.ts` via `withTenantRlsTransaction(prisma, tenantId, callback)`. Every transaction sets `SET LOCAL app.current_tenant_id = '<tenantId>'` and verifies that PostgreSQL RLS policies enforce isolation on tables: `RestaurantLocation`, `RestaurantDiningTable`, `DiningSession`, `RestaurantOrder`, `KitchenPreparationTask`.
- **SSE Event Bus Partitioning**: Verified via `test-event-bus-tenants.ts`. Event broadcasts explicitly stamp `x-tenant-id`. Clients subscribed under Tenant Alpha receive zero events emitted by Tenant Beta.

### 4.2 Authorization & Secret Management
- **Role-Based Access Control (RBAC)**: Defined in `@orbitox/core/src/rbac` with 3-tier matrix validation. Unit tests confirm role-based boundaries (e.g. `HOSPITAL_ADMIN`, `CHIEF_SURGEON`, `TRIAGE_NURSE`, `SALES_EXECUTIVE`).
- **Staff Authentication & Rate Limiting**: RestaurantOS implements secure PIN hashing using PBKDF2/SHA-512, lockout monitoring after failed attempts, and JWT-equivalent staff tokens with explicit revocation tracking (`.revoked_staff_tokens.json`).
- **Secret Hardening**: All private keys (`keys/*.pem`), auth tokens (`.npmrc`), and local stores (`data/*.json`) are correctly ignored in `.gitignore`. Git history contains prior secret commits documented in `docs/SECURITY_CLEANUP.md`, necessitating non-blocking CI gitleaks scanning until history purging is executed.

---

## 5. Build, Dependency, and Runtime Audit

### 5.1 Workspace Package Manager
- **pnpm Version**: `9.15.0` managed via Corepack.
- **Node.js Target**: `v20.0.0` minimum, verified running on Node `v22.20.0`.
- **Turborepo**: Turbo `v2.10.12` orchestrates pipeline tasks (`build`, `test`, `lint`, `type-check`).

### 5.2 Build & Test Observations
1. **Turborepo Test Execution**: Running `pnpm run test` in `orbitox` executes 27 tasks successfully across packages, passing all suites in `@orbitox/core` (70 tests), `@orbitox/pos` (9 tests), `@orbitox/crm` (4 tests), and `@orbitox/plugin-engine` (31 tests).
2. **Type-Check Coverage Blindspot**: Turbo `type-check` succeeds in 6.7 seconds but only inspects 4 packages (`core`, `utils`, `types`, `importer-core`). 33 packages lack a `"type-check"` script in `package.json`.
3. **Container Build Health**:
   - `orbitox/apps/web/Dockerfile`: Standalone Next.js multi-stage build.
   - `projects/external-os/restaurant-os/Dockerfile`: Multi-stage build with Prisma generation and TypeScript compile (`pnpm exec tsc --noEmit`). Verified passing in commit `e3fd2fa`.
4. **Standalone vs. Distributed Modes**:
   - Standalone: Operates with local file storage and in-memory caches via `docker-compose.standalone.yml` or default profiles.
   - Distributed: Supported via `docker-compose.cluster.yml` and `cliSwitch.ts` with Redis pub/sub and PostgreSQL 16 replication.
