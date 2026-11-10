# Phase 7A-1 Repository Cleanup Inventory (`feat/compose-saas`)

**Generated:** 2026-11-10  
**Baseline commit:** `0bb2cef` (after Phase 6G Review 2 fixes `G-7`, `G-8`, `G-10`, `G-11`)  
**Product Scope (Owner Decision):** **OrbitoX Control Plane + HospitalOS + RestaurantOS** only.

## 1. Methodology & Tooling Run

Evidence for every entry below combines four independent analyses run against the checked-out workspace:
1. **Static Workspace & Dead-Code Analysis (`knip 6.44.2`):** Executed across `orbitox/` (267 issues, mostly in `apps/celebrations` [141 files, 59 unused exports] and `apps/web` [53 files, 88 unused exports]) and `projects/external-os/restaurant-os/` (58 issues).
2. **Circular Dependency Analysis (`madge --circular 8.0.0`):** Executed across `orbitox/apps/web` (4 cycles — 2 in `.next/standalone/apps/celebrations`, 1 in `plugin-engine/dist`, 1 runtime cycle `provisioning-saga.ts -> plugin-lifecycle-client.ts -> app/api/hospital/lifecycle/[action]/route.ts`), `orbitox/packages|plugins` (8 cycles in `plugin-engine` & `runtime`), and `projects/external-os/restaurant-os` (13 cycles across `packages/domain` & `packages/storage`).
3. **TypeScript AST Import Graph + `package.json` Dependency Graph:** Parsed every workspace package/plugin (`packages/*`, `plugins/*`, `apps/*`, `tools/*`, `projects/*`) for TS/JS imports (`tsImporters`) and workspace `dependencies`/`devDependencies` (`pkgDeps`).
4. **CI / Terraform / Docker / Script Cross-Reference Scan:** Checked `.github/workflows/*.yml`, `infra/**/*.tf`, `Dockerfile*`, `docker-compose*.yml`, and `package.json` scripts across the entire repo.

---

## 2. Complete Inventory Table

### 2.1 Applications & Examples

| Path | Evidence | Decision | Notes / Commit |
|---|---|---|---|
| `orbitox/apps/web` | Active control plane + HospitalOS Web UI + RestaurantOS Web Portal; referenced by `ci.yml`, `deploy-staging.yml`, `infra/`, `Dockerfile` (`pkgDeps=0`, app entry) | **KEEP** | Core web app |
| `orbitox/apps/celebrations` | Owner decision to delete; zero CI jobs, zero infra refs, 141 `knip` issues; depends only on `plugins/celebrations` & `packages/importer-core` | **DELETE** | 7A-1 Commit B |
| `projects/external-os/restaurant-os` | Active RestaurantOS independent runtime; verified by 2 CI jobs (`restaurantos-e2e`, `restaurantos-phase2b4`), `Dockerfile`, `infra/`, and 6G DSR CI tests | **KEEP** | Core product runtime |
| `projects/external-os/hospital-os` | Owner decision to delete; `tsImporters=0`, `pkgDeps=0`, zero CI/infra refs (real HospitalOS runs inside `orbitox/apps/web`) | **DELETE** | 7A-1 Commit B |
| `projects/examples/test-consumer-app` | Historical Aug-2026 example consumer hardcoded to `@orbitox-io/crm` + `@orbitox-io/plugin-engine`; zero CI/workspace/package refs | **DELETE** | 7A-1 Commit A/F (clean obsolete CRM example) |

---

### 2.2 Plugins & Workspace Packages

| Path | Package Name | Evidence (`tsImporters` / `pkgDeps` / `ciInfra`) | Decision | Notes / Commit |
|---|---|---|---|---|
| `orbitox/packages/bridge` | `@orbitox-io/bridge` | `14 / 2 / 5` (CI + RestaurantOS + Web) | **KEEP** | Core signed bridge |
| `orbitox/packages/core` | `@orbitox-io/core` | `25 / 5 / 7` (CI unit tests + Web + CLI) | **KEEP** | Core domain/storage |
| `orbitox/packages/external-runtime-sdk` | `@orbitox-io/external-runtime-sdk` | `3 / 2 / 4` (CI + RestaurantOS + Web) | **KEEP** | Runtime bridge SDK |
| `orbitox/packages/plugin-engine` | `@orbitox-io/plugin-engine` | `40 / 9 / 11` (CI + RestaurantOS + Web + CLI) | **KEEP** (strip sample capabilities/templates) | Core tenancy/security/catalogue kernel |
| `orbitox/packages/runtime` | `@orbitox-io/runtime` | `2 / 1 / 3` (App bootstrapping, 24 compat callers) | **KEEP** | Kernel facade runtime |
| `orbitox/packages/sdk` | `@orbitox-io/sdk` | `10 / 7 / 9` (Web + CLI + plugins) | **KEEP** | Core SDK |
| `orbitox/packages/types` | `@orbitox-io/types` | `26 / 8 / 10` (Workspace-wide types) | **KEEP** | Core types |
| `orbitox/packages/ui` | `@orbitox-io/ui` | `2 / 1 / 2` (2 compat callers in Web/celebrations; base for 7B DS) | **KEEP** | Base UI package |
| `orbitox/packages/utils` | `@orbitox-io/utils` | `2 / 3 / 5` | **KEEP** | Core utilities |
| `orbitox/packages/config` | `@orbitox/{eslint,jest,tsconfig}` | Workspace build/lint/TS/Jest configs imported by almost all packages & `apps/web` | **KEEP** | Shared workspace tooling config |
| `orbitox/tools/cli` | `@orbitox-io/cli` | Used by CI `pack-and-verify` & `test-scaffold-smoke.ts` | **KEEP** (remove CRM/ecommerce templates in Commit A) | CLI tooling |
| `orbitox/plugins/external-project-engine` | `@orbitox-io/external-project-engine` | `25` compat importers in `apps/web` (`/api/v1/projects/*`, `/fleet`, `/overview`, `/platform/*`), unit tests run in CI | **KEEP** (strip sample templates/plugins in Commit A) | Project factory & runtime controller |
| `orbitox/plugins/pos` | `@orbitox-io/pos` | Imported directly at runtime by `projects/external-os/restaurant-os` (`src/server.ts`, `repository.ts`), `Dockerfile`, CI `pack-and-verify`, and `test-scaffold-smoke.ts` | **KEEP (7A-1)** / remove standalone platform catalogue/API entries (`route-classification.ts`, `platform-repository.ts`, modals) | Owner requested POS deletion, but RestaurantOS depends directly on `PosService`/`PosRepository`; keep package until folded in 7A-2 while removing POS from platform plugin catalogue |
| `orbitox/plugins/commerce` | `@orbitox-io/commerce` | Owner decision to delete; only used by deleted `/commerce/*`, `/store/*`, and `launch-wizard-modal.tsx` | **DELETE** | 7A-1 Commit A |
| `orbitox/plugins/crm` | `@orbitox-io/crm` | Owner decision to delete; imported only by deleted `plugins/crm`, `apps/web/app/crm/*`, `test-consumer-app`, and CLI CRM scaffold smoke | **DELETE** | 7A-1 Commit A |
| `orbitox/plugins/finance` | `@orbitox-io/finance` | Owner decision to delete; `0 / 0 / 1` | **DELETE** | 7A-1 Commit A |
| `orbitox/plugins/hrms` | `@orbitox-io/hrms` | Owner decision to delete; `0 / 0 / 1` | **DELETE** | 7A-1 Commit A |
| `orbitox/plugins/inventory` | `@orbitox-io/inventory` | Owner decision to delete; `0 / 0 / 1` | **DELETE** | 7A-1 Commit A |
| `orbitox/plugins/school` | `@orbitox-io/school` | Owner decision to delete; only `/api/v1/school/students` | **DELETE** | 7A-1 Commit A |
| `orbitox/plugins/celebrations` | `@orbitox-io/celebrations` | Owner decision to delete; used solely by deleted `orbitox/apps/celebrations` | **DELETE** | 7A-1 Commit A |
| `orbitox/plugins/hms` | `@orbitox-io/hms` | `0 / 0 / 1`; unused Aug-4 NestJS stub (`@orbitox/hms-backend`); real HospitalOS runs in `apps/web` (`app/hms/*`, `lib/hms-*`, `app/api/hospital/*`) | **DELETE** | 7A-1 Commit A (unused prototype; DB plugin identifier `'@orbitox/hms'` stays unchanged) |
| `orbitox/plugins/my-noob-plugin` | `@orbitox/my-noob-plugin` | `0 / 0 / 1`; local scratch test directory | **DELETE** | 7A-1 Commit A |
| `orbitox/packages/services` | `@orbitox-io/services` | `0 / 0 / 1`; unused Aug-4 NestJS stubs | **DELETE** | 7A-1 Commit F |
| `orbitox/packages/importer-core` | `@orbitox-io/importer-core` | `5 / 1 / 2` — ALL 5 importers reside inside deleted `orbitox/apps/celebrations` | **DELETE** | 7A-1 Commit F |
| `orbitox/packages/plugin-hospital-os` | `null` (no `package.json`) | Untracked leftover `dist/` + `node_modules/` artifacts only; `0 / 0 / 0` | **DELETE** (clean untracked artifacts on disk) | 7A-1 Commit F / disk cleanup |

---

### 2.3 Compatibility Alias Packages (`@orbitox/*` -> `@orbitox-io/*`)

Across the repo, **149** TS/JS imports across **144** files still import deprecated `@orbitox/*` names instead of canonical `@orbitox-io/*` (plus `package.json` `workspace:*` entries, CI `--filter` flags, and `projects/external-os/restaurant-os/Dockerfile` / `package.json`). After Commits A & B remove sample plugins & `apps/celebrations`, all remaining kept imports & dependencies will be codemodded to `@orbitox-io/*`, keeping database/entitlement **string plugin IDs** (`'@orbitox/hms'`, `'@orbitox/restaurant'`) untouched.

| Path | Deprecated Name | Importers Count | Decision | Commit |
|---|---|---|---|---|
| `orbitox/packages/compat-commerce` | `@orbitox/commerce` | 49 TS/JS, 2 `package.json` | **DELETE** (after sample deletion) | 7A-1 Commit A/C |
| `orbitox/packages/compat-crm` | `@orbitox/crm` | 0 TS/JS, 1 `package.json` | **DELETE** | 7A-1 Commit A/C |
| `orbitox/packages/compat-school` | `@orbitox/school` | 0 TS/JS, 1 `package.json` | **DELETE** | 7A-1 Commit A/C |
| `orbitox/packages/compat-core` | `@orbitox/core` | 6 TS/JS, 12 `package.json` | **DELETE** (codemod to `@orbitox-io/core`) | 7A-1 Commit C |
| `orbitox/packages/compat-external-project-engine` | `@orbitox/external-project-engine` | 25 TS/JS, 1 `package.json` | **DELETE** (codemod to `@orbitox-io/external-project-engine`) | 7A-1 Commit C |
| `orbitox/packages/compat-external-runtime-sdk` | `@orbitox/external-runtime-sdk` | 7 TS/JS, 3 `package.json` | **DELETE** (codemod to `@orbitox-io/external-runtime-sdk`) | 7A-1 Commit C |
| `orbitox/packages/compat-plugin-engine` | `@orbitox/plugin-engine` | 2 TS/JS, 4 `package.json` | **DELETE** (codemod to `@orbitox-io/plugin-engine`) | 7A-1 Commit C |
| `orbitox/packages/compat-pos` | `@orbitox/pos` | 2 TS/JS, 2 `package.json` | **DELETE** (codemod to `@orbitox-io/pos`) | 7A-1 Commit C |
| `orbitox/packages/compat-runtime` | `@orbitox/runtime` | 24 TS/JS, 2 `package.json` | **DELETE** (codemod to `@orbitox-io/runtime`) | 7A-1 Commit C |
| `orbitox/packages/compat-sdk` | `@orbitox/sdk` | 6 TS/JS, 13 `package.json` | **DELETE** (codemod to `@orbitox-io/sdk`) | 7A-1 Commit C |
| `orbitox/packages/compat-types` | `@orbitox/types` | 2 TS/JS, 11 `package.json` | **DELETE** (codemod to `@orbitox-io/types`) | 7A-1 Commit C |
| `orbitox/packages/compat-ui` | `@orbitox/ui` | 15 TS/JS, 2 `package.json` | **DELETE** (codemod to `@orbitox-io/ui`) | 7A-1 Commit C |
| `orbitox/packages/compat-utils` | `@orbitox/utils` | 0 TS/JS, 6 `package.json` | **DELETE** (codemod `package.json` to `@orbitox-io/utils`) | 7A-1 Commit C |

---

### 2.4 Sample Web Surfaces, Flags, Plan Catalogue, & Database Tables

| Item | Evidence | Decision | Notes / Commit |
|---|---|---|---|
| Web pages: `app/commerce/*`, `app/store/*`, `app/crm/*`, `app/finance/*`, `app/hrms/*`, `app/inventory/*`, `app/(platform)/automations/*` | Owner decision: sample plugins deleted; not HospitalOS/RestaurantOS/platform | **DELETE** | 7A-1 Commit A |
| Web components: `components/commerce/*`, `components/storefront/*`, `components/onboarding/launch-wizard-modal.tsx` | Exclusively render deleted Commerce/Storefront flows (`@orbitox/commerce`) | **DELETE** | 7A-1 Commit A |
| Web sample APIs: `app/api/v1/{commerce,crm,finance,hrms,inventory,school}/*` | Sample plugin HTTP endpoints gated behind `isSamplePluginEnabled` | **DELETE** | 7A-1 Commit A |
| Sample plugin flag helper: `orbitox/apps/web/lib/sample-plugins.ts`, `ORBITOX_DISABLE_SAMPLE_PLUGINS`, `ORBITOX_ENABLE_*_PLUGIN`, `test/sample-data-plugins-elimination.test.ts` | Owner decision + Program GO §7A-1 explicit deletion item | **DELETE** | 7A-1 Commit A; update `service-env-contracts.test.ts` |
| Platform catalogue/modals/UI: `admin/{data/mock-data.ts,services,marketplace,components,projects/create}`, `platform/connect`, `app/(platform)/layout.tsx`, `app/page.tsx`, `app/api/v1/{projects/template-provision,platform/packages,openapi.json,tenants,_lib/*}`, `lib/platform-repository.ts`, `packages/plugin-engine`, `plugins/external-project-engine`, `packages/core/src/control-plane/blueprint.service.ts` | Kept files still list sample plugins (CRM/Commerce/Finance/HRMS/Inventory/School/Celebrations/standalone POS) | **STRIP SAMPLE ENTRIES** | Retain kept routes/consoles (`/admin/*`, `/platform/*` consolidate in 7C–7E); remove sample/standalone-POS cards, nav items, templates, OpenAPI entries |
| Kept Web Restaurant/HMS UI: `app/kds/*`, `app/dine/*`, `app/hms/*`, `app/admin/*`, `app/platform/*`, `app/api/{hospital,restaurant}/*` | Explicit Program GO scope: HospitalOS & RestaurantOS stay active; console/UI consolidation happens in 7C–7F | **KEEP** | Untouched routes (except stripping sample plugin options inside kept nav/catalogue) |
| Prisma Schema Models & DB Tables (32 tables + 7 enums): `Store`, `StoreTheme`, `StorePage`, `Category`, `Collection`, `Product`, `ProductVariant`, `Cart`, `Customer`, `Order`, `PaymentTransaction`, `StoreDiscount`, `StoreMedia`, `StoreReview`; `CelebrationOccasionCategory`, `CelebrationOccasion`, `CelebrationTheme`, `CelebrationSectionDefinition`, `CelebrationFeatureDefinition`, `CelebrationExperience`, `CelebrationExperienceSection`, `CelebrationGuest`, `CelebrationWish`, `CelebrationExperienceAnalytics`, `CelebrationPricingPlan`, `CelebrationOrder`, `CelebrationMedia`; `StudioProject`, `StudioPage`, `StudioSection`, `StudioAsset`, `StudioSnapshot` (`StudioProjectStatus` + 6 Store enums) | Owner decision to drop Commerce & Celebrations/Studio tables; zero active TS references after deleting `apps/celebrations`, `/commerce`, `/store`, and removing `StudioAsset`/`StudioPage`/`StudioSnapshot` cleanup lines in `lib/data-rights/service.ts` | **DROP VIA NEW MIGRATION** | 7A-1 Commit A: remove from `prisma/schema.prisma`, create **new** forward migration (`DROP TABLE IF EXISTS ... CASCADE`), update `globalTableAllowlist` in `test-platform-step1-db.ts` and `REVIEWED_SECRET_COLUMN_ALLOWLIST` in `lib/data-rights/archive.ts` |

---

### 2.5 Scripts (`scripts/*`, `orbitox/scripts/*`) & Stray Root Files

| Path | References (`ci.yml` / `package.json` / tests) | Decision | Justification |
|---|---|---|---|
| `scripts/rds-bootstrap-roles.sql` | `.github/workflows/ci.yml` | **KEEP** | RDS non-superuser bootstrap |
| `scripts/rds-enable-roles.sql` | `.github/workflows/ci.yml` | **KEEP** | RDS role activation |
| `scripts/verify-migration-immutability.sh` | `.github/workflows/ci.yml` | **KEEP** | Migration immutability CI guard |
| `scripts/staging/generate-secrets.sh` | `docs/runbooks/secret-rotation.md`, `TRACK_B_6G_6H_6I_GO.md` | **KEEP** | Staging secret generator wrapper |
| `scripts/staging/generate-secrets.ts` | Invoked by `generate-secrets.sh`; unit-tested by `orbitox/apps/web/test/staging-secret-generator.test.ts` | **KEEP** | Tested secret generator core |
| `scripts/audit-visual-truth.js`, `capture-phase5-2-viewports.js`, `capture-showcase.js`, `sweep-all-apps-browser.js`, `test-browser-e2e.js`, `test-commerce-experiences-5-1.js`, `test-crave-atlas-interactions.js`, `test-phase5-viewports.js`, `test-restaurantos-3-redesign.js`, `test-template-differentiation.js` | 0 CI/pkg refs; Oct-2026 legacy Playwright `:4010` scripts | **DELETE** | Historical manual visual/commerce scripts; UI rebuild arrives in 7C–7F and active RestaurantOS browser scripts reside in `projects/external-os/restaurant-os/scripts/` |
| `scripts/test-external-os-control-plane.js`, `test-gate-a-and-b-integrity.js`, `test-kds-concurrency-hardening.js`, `test-kds-security-adversarial.js`, `test-live-restaurant-apis.js`, `test-phase1-security-and-settlement.js`, `test-phase2-menu-and-categories.js`, `test-phase3-closure-audit.js`, `test-phase3-floor-and-orders.js`, `test-phase3-gate0-preflight.js`, `test-phase3-production-gates.js`, `test-phase4-gate0-kds-isolation-and-idempotency.js`, `test-phase4-release-audit.js`, `test-phase5-acceptance.js`, `test-phase6-1-identity-lifecycle.js`, `test-phase6-security-and-session-isolation.js`, `test-restaurantos-vertical-slices.js`, `test-session-payment-safety.js`, `test-sse-resilience-and-replay.js`, `test-verification-addendum.js`, `verify-gate2-spot-checks.js` | 0 CI/pkg refs; stale Oct-2026 JSON-mode root scripts | **DELETE** | Superseded by active multi-tenant PostgreSQL + RLS CI suites in `projects/external-os/restaurant-os/scripts/` (`test-tenant-staff-auth.ts`, `test-safe-tenancy-and-rls.ts`, `test-e2e-http-multitenancy.ts`, `test-restaurant-bridge-and-lifecycle.ts`, `test-restaurant-2servers.ts` [incl. `Last-Event-ID`], `test-restaurant-cross-tenant.ts`, `test-restaurant-crash-durability.ts`, `test-phase5-kds-and-staff.js` [`STATION_MISMATCH`], `test-phase1-security-and-settlement.js`, `test-pre-milestone3-security-and-truthfulness.js`) |
| `scripts/verify-phase16-production-http.mjs` | 0 CI/pkg refs; manual Oct-26 script hitting `/api/hospital/*` & deleted `/api/v1/crm/leads` | **DELETE** | Every kept `/api/hospital/*` & `/api/v1/admin/*` invariant is verified in CI by `hms-cross-tenant.test.ts` (52 routes), `hms-auth-security.test.ts`, `phase6-role-privileges.test.ts`, and `live-api-no-token-sweep.ts` |
| `orbitox/scripts/*` (15 files: `check-production-env.mjs`, `pack-and-verify.sh`, `smoke-control-plane.mjs`, `test-hms-adversarial-sql.sh`, `test-scaffold-smoke.ts`, `verify-deletion-certificate.ts`, `cliSwitch.*`, etc.) | Referenced by CI and `orbitox/package.json` scripts | **KEEP** (update `pack-and-verify.sh`, `test-scaffold-smoke.ts`, `smoke-control-plane.mjs` for CRM/sample removal in Commit A) | Active platform CI/ops scripts |
| `run250.log`, `run250_logs.zip` | Untracked debug CI log files at repo root (`2.96 MB` + `361 KB`) | **DELETE** | Stray local debug logs |
| `orbitox/orbitox/data/platform-repository-store.json` | Untracked stray nested `orbitox/orbitox/` runtime JSON artifact | **DELETE** | Stray local runtime file |

---

### 2.6 Documentation & Root Reference Folders

| Path | Evidence | Decision | Destination / Action |
|---|---|---|---|
| `docs/archive/` | 282 superseded phase files; explicitly slated for deletion | **DELETE** | 7A-1 Commit E (preserved in git history) |
| `B2B2C_Template_Docs/` | 52 Aug-2026 generic NestJS/commerce template docs; 0 CI/code refs; superseded by `docs/` | **DELETE** | 7A-1 Commit E (preserved in git history) |
| `developer_guide/` | 20 Aug-2026 NestJS/legacy developer guide files; 0 CI/code refs; superseded by `docs/` | **DELETE** | 7A-1 Commit E (preserved in git history) |
| Root phase prompts (`PHASE6_GO.md`, `PHASE6AB_ACCEPTANCE_AND_6CDE_GO.md`, `ORBITOX_PLUGIN_PLATFORM_BLUEPRINT.md`) | Historical phase GO docs / blueprint at repo root | **MOVE** | Move to `docs/history/` (7A-1 Commit E) |
| Reference packs (`orbitox-phase2b-reference-pack/` [18 files], `orbitox-phase6-reference-pack/` [9 files]) | Tracked in git `HEAD` (deleted in working tree before cleanup) | **RESTORE & MOVE** | Restore from `HEAD` and `git mv` to `docs/history/` (7A-1 Commit E) |
| Active `docs/*` files & folders | Currently 31 loose root `.md` files + `audits/`, `control-plane/`, `implementation/`, `platform-control-center/`, `openapi/`, `runbooks/`, `history/`, `cleanup/` | **REORGANIZE** | Organize cleanly under `docs/architecture/`, `docs/runbooks/`, `docs/security/`, `docs/decisions/`, `docs/history/`, `docs/audits/`, `docs/openapi/`, `docs/cleanup/`, keeping `docs/README.md` |

---

## 3. Kept Security & Critical Tests Manifest (BEFORE Deletions)

The rule for 7A-1 is strict: **no kept security or product test is deleted; tests are only updated if their fixture names reference deleted sample plugins (e.g. `@orbitox/crm` -> `@orbitox/hms`)**.

### 3.1 `orbitox/apps/web/test/` (44 files at baseline `0bb2cef`)
- **Deleted with removed sample plugin feature (1):**
  - `sample-data-plugins-elimination.test.ts` (tests `lib/sample-plugins.ts` & `ORBITOX_ENABLE_*_PLUGIN` flags being deleted)
- **Kept — All 43 remaining test suites:**
  - `api-guard-billing-queries.test.ts` *(update fixture plugin `'@orbitox/crm'` -> `'@orbitox/hms'`)*
  - `api-guard-negative.test.ts` *(update fixture plugin `'@orbitox/crm'` -> `'@orbitox/hms'`)*
  - `api-route-auth-structure.test.ts` *(remove deleted `/store` & `/crm` route assertions; keep all route & auth checks)*
  - `audit-role-permissions.test.ts`
  - `concurrent-usage-audit.test.ts`
  - `data-rights-foundations.test.ts` *(remove dropped-table entries from `REVIEWED_SECRET_COLUMN_ALLOWLIST` in `archive.ts`)*
  - `database-role-scram.test.ts`
  - `guest-api-auth.test.ts`
  - `health-route.test.ts`
  - `hms-auth-security.test.ts`
  - `hms-cross-tenant.test.ts` *(52/52 cross-tenant HMS route checks)*
  - `hms-restriction-enforcement.test.ts`
  - `hospital-route-structure.test.ts`
  - `mrn-concurrency.test.ts`
  - `openapi-route-parity.test.ts`
  - `phase2b-integration.test.ts`
  - `phase2b-unit.test.ts`
  - `phase3-parts-abc.test.ts`
  - `phase3-parts-defg.test.ts`
  - `phase4-full-matrix.test.ts` *(update sample capability fixture `'crm:*'` -> `'hms:*'`)*
  - `phase4-items-1-5.test.ts`
  - `phase5-operation-lease.test.ts`
  - `phase5-sdk.test.ts`
  - `phase6-account-auth.test.ts`
  - `phase6-account-security.test.ts`
  - `phase6-billing-checkout-db.test.ts`
  - `phase6-billing-webhook-db.test.ts`
  - `phase6-billing.test.ts`
  - `phase6-customer-cross-tenant.test.ts` *(customer cross-tenant checks)*
  - `phase6-email-worker-db.test.ts`
  - `phase6-email.test.ts`
  - `phase6-grant-builder.test.ts`
  - `phase6-plugin-installation-plan-constraints-db.test.ts`
  - `phase6-role-privileges.test.ts`
  - `platform-repository-mode.test.ts`
  - `production-startup-secrets.test.ts`
  - `provisioning-plan-validation.test.ts`
  - `restaurant-lifecycle-bridge-e2e.test.ts`
  - `security-headers.test.ts`
  - `service-env-contracts.test.ts`
  - `staging-secret-generator.test.ts`
  - `tenant-standalone-server.test.ts` *(update sample `'crm'` fixture -> `'hms'`)*
  - `terraform-task-definitions.test.ts`

### 3.2 Control Plane DB / Security / CLI / RestaurantOS Suites (All Kept)
- `orbitox/apps/web/scripts/test-platform-step1-db.ts` (RLS inventory — remove 6 dropped Celebration tables from `globalTableAllowlist`)
- `orbitox/apps/web/scripts/test-platform-step2-repository.ts`, `test-platform-step3-resilience.ts`, `test-platform-step4-concurrency.ts`, `test-platform-step5-import.ts`, `test-platform-db-outage.ts`, `live-api-no-token-sweep.ts`, `live-no-token-sweep.ts`, `test-data-rights-6g.ts`, `test-phase2b-negative-control.ts`, `test-hms-crash-durability.ts`
- `orbitox/scripts/test-hms-adversarial-sql.sh` (64/64 SQL checks)
- `orbitox/scripts/smoke-control-plane.mjs`, `pack-and-verify.sh`, `test-scaffold-smoke.ts`
- `orbitox/packages/core`, `orbitox/packages/plugin-engine`, `orbitox/plugins/external-project-engine`, `orbitox/tools/cli` unit test suites
- `projects/external-os/restaurant-os/` CI suites (`pnpm test`, `test-tenant-staff-auth.ts`, `test-safe-tenancy-and-rls.ts`, `test-owner-self-service.ts`, `test-custom-domains.ts`, `test-e2e-http-multitenancy.ts`, `test-restaurant-bridge-and-lifecycle.ts`, `test-restaurant-2servers.ts`, `test-restaurant-cross-tenant.ts`, `test-restaurant-crash-durability.ts`, `test/data-rights-model-coverage.test.ts`)

---

## 4. `knip` & `madge` Architectural Notes (Follow-up for 7A-2+)

- **`madge` circular dependency remaining after `apps/celebrations` removal:**
  1. `orbitox/apps/web/lib/tenant-provisioning/provisioning-saga.ts -> plugin-lifecycle-client.ts -> app/api/hospital/lifecycle/[action]/route.ts` (extract shared helper to `lib/hms-lifecycle.ts` in 7A-2)
  2. `orbitox/packages/plugin-engine/src/client.ts <-> modeSwitcher.ts`
  3. `orbitox/packages/runtime/src/builders/{plan,policy,workflow}.builder.ts <-> facades/{billing,security,workflows}.facade.ts`
  4. `projects/external-os/restaurant-os/packages/domain/* <-> packages/storage/*` (12 internal cycles — address during 7A-2/7F restructure)
