# 🪐 OrbitoX Platform Console: Parity Inventory & Architecture Specification (Step C0)

**Stage**: Phase 7C — Step C0 (Master Parity Inventory & Architecture Mapping)  
**Governing Specification**: `PHASE7_UI_MASTER_BRIEF.md` (supersedes all prior briefs) & `OrbitoX UI Reset Master Plan`  
**Target Visual Language**: Phase 7B.1 Visual System (Plus Jakarta Sans, 28px cards, 999px pills, dark `#0D0F12` operator mood, dual-mode Ocean accent)  
**Status**: Updated & Aligned with Owner Decisions  
**Date**: November 17, 2026  

---

## 1. Executive Overview & Route Census

Across the entire platform application, the repository contains **67 physical Next.js page routes** across 7 route groups:
1. **Legacy Admin Prototype (`/admin/*`)**: 16 routes created during early prototyping for mock marketplace plugins, basic service health, and experimental quota sliders.
2. **Platform Management (`/platform/*`)**: 24 routes created during enterprise multi-tenant rollout for zero-trust provisioning, Ed25519 cryptographic security, and RBAC enforcement.
3. **Stage 7B.1 Appearance Engine (`/console/settings/appearance`)**: 1 active route for server-resolved interactive theme and appearance controls.
4. **Unified Operator Console (`/console/*`)**: 11 routes serving as the modern foundation for the Operator Console (`A1`, `C0`–`C6`).
5. **Legacy Executive Dashboard (`/`)**: 1 self-nesting legacy route with sample production metrics.
6. **HospitalOS (`/hms/*`)**: 11 clinical and hospital administrative routes.
7. **Public Onboarding (`/onboarding`)**: 1 customer signup and organization onboarding route.
8. **RestaurantOS Legacy Surfaces (`/dine/*`, `/kds`)**: 2 diner ordering and kitchen display system routes.

The **41 operator console routes** (items 1, 2, and 3) are the primary subject of parity convergence into the unified **7B.1 Operator Console Navigation** (`A1`, `C0`–`C6`), while the remaining **26 application routes** are mapped to their respective persona shells.

---

## 2. Master Navigation Mapping (Screen IDs: A1, C0–C6)

Every retained operator capability maps cleanly to the unified console navigation:

| # | Master Screen ID | Sidebar Item | Primary Route | Purpose & Target Spec |
|---|---|---|---|---|
| 1 | **A1** | **Overview** | `/console/overview` | Fleet-wide telemetry, throughput charts, active alerts, service health |
| 2 | **C1** | **Organizations** | `/console/organizations` | Customer accounts, subscriptions, ownership, member rosters |
| 3 | **C2** | **Tenants** | `/console/tenants` | Multi-tenant environments, custom domains, `DangerousAction` suspend |
| 4 | **C4** | **Provisioning** | `/console/provisioning` | Async saga operation pipelines, vertical `Stepper` status, retry |
| 5 | **C3** | **Billing** | `/console/billing` | Invoices, Razorpay/Stripe gateways, grace periods, plan limits |
| 6 | **C5** | **Data Rights** | `/console/data-rights` | DSR requests (GDPR/DPDP), archive generation, tenant purging |
| 7 | **C6** | **Security & Keys** | `/console/security` | Ed25519 signing keys, `CopyOnceSecret` single-reveal, API tokens |
| 8 | — | **Audit Log** | `/console/audit` | Append-only tamper-evident compliance audit trail |
| 9 | **A3** | **Appearance / Settings** | `/console/settings/appearance` | Interactive theme mode, 8 accent presets, density, reduce-motion |
| 10 | *7G* | *Ask OrbitoX* | `/console/ai` | *Stage 7G*: Model Context Protocol (MCP) AI assistant |

---

## 3. Comprehensive Inventory of the 41 Operator Console Routes

Each page is assigned an architectural disposition:
- **Migrate**: Retained as a primary production capability and restyled to the 7B.1 visual language.
- **Merge**: Redundant or fragmented functionality consolidated into a primary master screen.
- **Hold**: Retained temporarily under architectural freeze until the modern replacement stage is complete.
- **Drop Candidate**: Obsolete, insecure, or developer-only scaffolding recommended for owner-reviewed drop.
- **Redirect**: Route already acts as an active HTTP/client redirect.
- **Live**: Built, verified, and active in production.

| # | Route | Current Purpose | Disposition | Target Screen / Destination | APIs & Actions Used |
|---|---|---|---|---|---|
| 1 | `/admin` | Active 307 redirect to `/console/overview` | **Redirect** | `/console/overview` | Active redirect (`redirect('/console/overview')`) |
| 2 | `/admin/api-keys` | Basic API key generation table | **Merge** | Merge into `C6` (Security & Keys) | Static key listing, mock copy action |
| 3 | `/admin/audit` | Flat audit log viewer | **Merge** | Merge into unified `Audit Log` | `GET /api/v1/projects/project_restaurant_os/audit` (audit log pagination) |
| 4 | `/admin/business` | Plugin categories directory | **Merge** | Merge into `C2` (Tenants Plugin Sub-view) | Static directory category cards |
| 5 | `/admin/business/[category]` | Filtered category plugins | **Merge** | Merge into `C2` (Tenant Plugin Configuration) | Static plugin tile listing per category |
| 6 | `/admin/business/[category]/[providerId]` | Plugin detail & mock settings | **Merge** | Merge into `C2` (Tenant Plugin Detail) | Static configuration form, mock save toggle |
| 7 | `/admin/developer-apis` | OpenAPI static explorer | **Merge** | Merge into `C6` (Security & Developer APIs) | `GET /api/v1/openapi` (schema viewer, test request console) |
| 8 | `/admin/marketplace` | Legacy plugin store mockup | **HOLD** | Replaced in `C2` via `@orbitox-io/plugin-engine` & `C3` billing entitlements | Client-side plugin catalog filter, mock install triggers |
| 9 | `/admin/projects` | Project table with legacy schema | **Merge** | Merge into `C2` (Tenants) | Static project cards, mock environment toggles |
| 10 | `/admin/projects/[projectId]` | Project detail view | **Merge** | Merge into `C2` (Tenant Detail) | Static project overview, mock metrics |
| 11 | `/admin/projects/create` | Project creation wizard | **Merge** | Merge into `C4` (Provisioning Job Flow) | `POST /api/v1/projects/factory` (multi-step project bootstrap) |
| 12 | `/admin/quotas` | Basic quota slider UI | **Merge** | Merge into `C2` (Tenant Resource Limits) | Static resource sliders, mock update toast |
| 13 | `/admin/restaurant` | Hardcoded restaurant shortcut | **HOLD** | Replaced in `C2` by filtered tenant view (`plugin = @orbitox/pos`) | Static dashboard cards for legacy restaurant view |
| 14 | `/admin/services` | In-memory microservices view | **Merge** | Merge into `A1` (Cluster Health Strip) | Static microservice health tiles |
| 15 | `/admin/services/[serviceId]` | Service health detail | **Merge** | Merge into `A1` (Service Telemetry Drawer) | Static service metrics and logs viewer |
| 16 | `/admin/system` | Prototype system toggles | **Merge** | Merge into `Settings` (Platform Parameters) | Static maintenance mode and feature toggles |
| 17 | `/platform` | Live Fleet Overview with polling (10s), status tags, and audit feed | **Migrate / Merge** | Merge into `A1` (Overview) | Polls `/api/v1/fleet` and `/api/v1/overview`, fleet attention filters |
| 18 | `/platform/ai` | Early AI assistant prototype | **HOLD** | Preserved intact until Stage 7G (*Ask OrbitoX* MCP assistant) | `POST /api/v1/platform/ai` (chat query execution & streaming) |
| 19 | `/platform/api-keys` | Cryptographic API keys list | **Migrate** | Primary source for `C6` (Security & Keys) | `GET /api/v1/platform/api-keys`, `GET /api/v1/platform/projects`, key revocation |
| 20 | `/platform/approvals` | Operator step-up approval queue | **Merge** | Merge into `C4` (Provisioning) & `Audit Log` | `GET /api/v1/platform/approvals`, approve/reject step-up mutations |
| 21 | `/platform/audit` | Audited action feed | **Migrate** | Primary source for unified `Audit Log` | `GET /api/v1/platform/audit` (paginated audit query & filtering) |
| 22 | `/platform/configuration` | JSON configuration editor | **Merge** | Merge into `Settings` (Configuration tab) | `GET /api/v1/platform/configuration`, save schema configuration |
| 23 | `/platform/connect` | Bridge protocol diagnostic | **Merge** | Merge into `C6` (Security / Bridge tab) | `GET /api/v1/system/runtime-token`, `POST /api/v1/projects/template-provision`, `GET /api/v1/fleet` |
| 24 | `/platform/credentials` | Vault credential listing | **Merge** | Merge into `C6` (Security & Keys) | `GET /api/v1/platform/credentials`, `GET /api/v1/platform/projects`, test secret connection |
| 25 | `/platform/explorer` | Interactive API Explorer & Execution Console (Endpoint selector, request payload editor, latency meter) | **Review / Hold** | Retain under `C6` (Developer APIs tab); defer migration until security closure | Executes live requests to `/api/v1/platform/*` with latency metrics |
| 26 | `/platform/fleet` | Fleet instance telemetry | **Merge** | Merge into `A1` (Fleet Health Strip) | `GET /api/v1/fleet`, `POST /api/v1/projects/[id]/commands` (reboot/pause) |
| 27 | `/platform/login` | Operator authentication & TOTP | **Retain** | Gated security auth barrier for operators only | `POST /api/v1/platform/auth/login` (session cookie + CSRF issuance) |
| 28 | `/platform/observability` | Raw Prometheus/metrics graphs | **Merge** | Merge into `A1` (Lollipop throughput & line charts) | Static Prometheus charts wrapper |
| 29 | `/platform/operations` | Async operation store listing | **Migrate** | Primary source for `C4` (Provisioning) | `GET /api/v1/platform/operations`, `POST /api/v1/platform/reconcile` (retry saga) |
| 30 | `/platform/packages` | npm package release status | **Drop Candidate** | Build artifact: CI/CD concern, not operator runtime work | `GET /api/v1/platform/packages` (scans local/published tarballs) |
| 31 | `/platform/plans` | Tier catalog & entitlement matrix | **Merge** | Merge into `C3` (Billing & Plan Entitlements) | `GET /api/v1/platform/plans`, update plan entitlement boundaries |
| 32 | `/platform/projects` | Project environments table | **Merge** | Merge into `C2` (Tenants) | Static project listing / environment overview |
| 33 | `/platform/projects/[projectId]` | Project deep detail | **Merge** | Merge into `C2` (Tenant Detail) | `GET /api/v1/projects/[id]`, commands, activity, plans, entitlements, quotes |
| 34 | `/platform/restaurants` | External OS instance list | **Merge** | Filtered query view in `C2` (`plugin = @orbitox/pos`) | `GET /api/v1/platform/restaurants`, check slug, suspend/resume |
| 35 | `/platform/restaurants/[id]` | External restaurant detail | **Merge** | Tenant detail sub-view in `C2` | `GET /api/v1/platform/restaurants/[id]`, suspend/resume, export data |
| 36 | `/platform/security` | Key rotation & session security | **Migrate** | Primary source for `C6` (Security & Keys) | `GET /api/v1/platform/security` (key rotation, session invalidation) |
| 37 | `/platform/settings` | Platform system settings | **Migrate** | Primary source for `Settings` (System tab) | `GET /api/v1/system/settings`, update global runtime flags |
| 38 | `/platform/tenants` | Multi-tenant cluster manager | **Migrate** | Primary source for `C2` (Tenants) | `GET /api/v1/fleet` (cluster tenant listing, health, status) |
| 39 | `/platform/tenants/new` | Multi-tenant creation wizard | **Migrate** | Modal creation workflow in `C2` | `POST /api/v1/tenants` (provision tenant), poll `/api/v1/operations/[id]` |
| 40 | `/platform/tests` | In-browser test runner | **Drop Candidate** | Developer tool: replaced by Playwright and Vitest in CI | In-browser test runner execution hooks |
| 41 | `/console/settings/appearance` | Interactive appearance controls | **Live** | Production user appearance engine built in Stage 7B.1 | `GET/PUT /api/v1/platform/me/appearance`, `GET/PUT /api/v1/customer/me/appearance` |

---

## 3.1 Inventory of the Remaining 26 Platform Application Routes

The remaining 26 application routes serve non-operator personas or modern console foundations:

| Route Group | Route Paths | Current Purpose | Target Shell / Destination |
|---|---|---|---|
| **Modern Console (`/console/*`)** (11 pages) | `/console`, `/console/overview`, `/console/organizations`, `/console/tenants`, `/console/tenants/[id]`, `/console/provisioning`, `/console/billing`, `/console/data-rights`, `/console/security`, `/console/audit`, `/console/design-system` | The modern foundation screens built for the 7B.1 Operator Console | Operator Console Shell (`AppShell`) |
| **Root Dashboard (`/`)** (1 page) | `/` | Legacy self-nesting dashboard with mock metrics | Target: Role-based session redirect (public / operator `/console/overview` / customer workspace). Defer implementation to customer-workspace milestone |
| **HospitalOS (`/hms/*`)** (11 pages) | `/hms`, `/hms/login`, `/hms/patients`, `/hms/beds`, `/hms/appointments`, `/hms/telemetry`, `/hms/pharmacy`, `/hms/labs`, `/hms/billing`, `/hms/hierarchy`, `/hms/profile`, `/hms/staff` | Clinical EHR, inpatient registry, ward matrix, vital telemetry | Product Owner / Staff Workspace Shell (Phase 7E) |
| **Public Onboarding (`/onboarding`)** (1 page) | `/onboarding` | Customer organization and restaurant bootstrap wizard | Public / Auth Shell (Phase 7D) |
| **RestaurantOS Legacy (`/dine/*`, `/kds`)** (2 pages) | `/dine/[locator]`, `/kds` | QR diner guest ordering and kitchen display queue | Staff Operational Shell (Phase 7F) |

**Total Platform Inventory:** `41 operator routes + 26 application routes = 67 total routes`.

---

## 4. Architectural Drop List, Formal Holds & API Explorer Security

### 4.1 Candidate Drops (Owner Review)
1. **`/platform/packages`**:
   - *Technical Rationale*: Displays static npm release metadata. Package publishing is strictly automated via GitHub Actions (`ci.yml`) and GitHub Packages (`@orbitox-io`). Operators manage tenant runtime services, not build packages. Recommended drop candidate.
2. **`/platform/tests`**:
   - *Technical Rationale*: In-browser test runner exposing unauthenticated test execution triggers. Testing is strictly automated in CI (Playwright, Node.js runner, Vitest). Recommended drop candidate.

### 4.2 Explicit Holds & Replacement Mapping (Preserved Until Successor Built)
1. **`/admin/marketplace` (HOLD)**:
   - *Architecture Direction*: Do NOT drop without replacement. In modern OrbitoX, plugins are versioned npm packages installed via `@orbitox-io/plugin-engine` (v1.4.0).
   - *Exact Replacement*: Tenant plugin management is located under **`C2` (`/console/tenants/[id]` -> Plugins tab)**, and global plan entitlements/catalog are managed under **`C3` (`/console/billing`)**. Retain `/admin/marketplace` until `C2` and `C3` are verified in 7C.
2. **`/admin/restaurant` (HOLD)**:
   - *Architecture Direction*: Do NOT drop without replacement.
   - *Exact Replacement*: In modern OrbitoX, restaurant POS instances are simply tenants with `@orbitox/pos` active. The exact replacement is **`C2` (`/console/tenants?plugin=@orbitox/pos`)**. Retain until `C2` is active.
3. **`/platform/ai` (HOLD)**:
   - *Architecture Direction*: Keep the existing prototype intact without disruption.
   - *Exact Replacement*: Stage 7G will introduce **Ask OrbitoX**, an enterprise AI console assistant communicating via Model Context Protocol (MCP) tool bindings. `/platform/ai` remains functional until Stage 7G replaces it.

### 4.3 API Explorer (`/platform/explorer`): Retention Approved — Hold Migration Until Security Closure
- **Owner Directive**: Approved for retention as a Developer APIs capability under `C6`, rather than dropping it.
- **Formal Future Structure**:
  | Mode | Execution Scope & Security Contract |
  |---|---|
  | **Observe** | Read-only requests (`GET`, `HEAD`) against platform metadata. |
  | **Sandbox** | Mutations against isolated synthetic test data. |
  | **Live Production** | Explicitly authorized production mutations requiring recent elevated authentication, mandatory idempotency, blast-radius preview, typed confirmation, and an auditable server-side execution path. Browser code must never receive reusable production secrets. Reference: `docs/platform-control-center/18_API_EXPLORER_SECURITY.md`. |
- **Current Implementation Gap & Non-Misrepresentation Guarantee**:
  - The current Explorer page (`apps/platform/src/app/(console)/platform/explorer/page.tsx`) sends requests directly from the browser client via `fetch()`, including a `POST` simulation.
  - The existing operator route policy (`apps/platform/src/server/organizations/operator-route-policy.ts`) does not enforce recent step-up reauthentication on every such operation.
  - **Contract Statement**: The existing Explorer must NOT be described as step-up protected until the actual execution path enforces that contract. It is held intact under `/platform/explorer` until Stage 7C Step C2 completes the security closure.

---

## 5. Target Screens & Existing vs Missing APIs

| Screen ID | Target Functionality | Existing API Endpoints | Missing APIs to Build in 7C |
|---|---|---|---|
| **A1**<br>Operator Overview | Telemetry cards, cluster health strip, active alerts, throughput & latency charts | • `GET /api/v1/overview`<br>• `GET /api/v1/fleet`<br>• `GET /api/health` | • `GET /api/v1/platform/overview/telemetry` (Fleet-wide request rate, p99 latency)<br>• `GET /api/v1/platform/overview/alerts` (Aggregated platform alerts & approvals) |
| **C1**<br>Organization Detail | Metadata, member roster, plan quotas, tenant listing, ownership transfer | • `GET /api/v1/customer/organizations/[id]`<br>• `GET /api/v1/customer/organizations/[id]/members`<br>• `GET /api/v1/customer/organizations/[id]/tenants` | • `GET /api/v1/platform/organizations/[id]` (Cross-tenant elevated operator view)<br>• `PUT /api/v1/platform/organizations/[id]/plan` |
| **C2**<br>Tenant Detail & Suspend | Domain config, database isolation, resource usage, step-up gated `DangerousAction` suspend | • `GET /api/v1/tenants/[id]`<br>• `POST /api/v1/tenants/[id]/suspend`<br>• `POST /api/v1/tenants/[id]/resume` | • `GET /api/v1/platform/tenants` (Paginated registry)<br>• `GET /api/v1/platform/tenants/[id]` (Topology & telemetry)<br>• `PATCH /api/v1/platform/tenants/[id]` (Domain & configuration)<br>• `POST /api/v1/platform/tenants/[id]/suspend` (Step-up gated)<br>• `POST /api/v1/platform/tenants/[id]/resume` (Reactivation) |
| **C3**<br>Billing & Payments | Invoices, payment gateway status (Razorpay / Stripe), grace period countdown, retry payment | • `GET /api/v1/billing/webhook`<br>• `GET /api/v1/customer/organizations/[id]/billing` | • `GET /api/v1/platform/billing/invoices`<br>• `POST /api/v1/platform/billing/invoices/[id]/retry`<br>• `PUT /api/v1/platform/billing/grace-period` |
| **C4**<br>Provisioning Job | Async operation pipeline, vertical `Stepper` status (done, failed, waiting), diagnostics, retry | • `GET /api/v1/operations/[id]`<br>• `POST /api/v1/operations/[id]/retry` | • `GET /api/v1/platform/operations` (Paginated filterable operation stream)<br>• `POST /api/v1/platform/operations/[id]/cancel` |
| **C5**<br>Data Rights (DSR) | GDPR/DPDP data subject rights requests, archive generation, tenant purging, status pill | • `GET /api/v1/customer/organizations/[id]/data/export`<br>• `POST /api/v1/customer/organizations/[id]/data/deletion` | • `GET /api/v1/platform/data-rights/requests`<br>• `POST /api/v1/platform/data-rights/requests/[id]/approve`<br>• `GET /api/v1/platform/data-rights/requests/[id]/download` |
| **C6**<br>Security & Keys | Ed25519 signing keypairs, rotate key action, `CopyOnceSecret` single-reveal, token revocation, API Explorer (Observe/Sandbox/Prod) | • `GET /api/v1/platform/security`<br>• `POST /api/v1/admin/api-keys/[keyId]/rotate` | • `POST /api/v1/platform/security/keys/rotate` (Strict Ed25519 with volatile memory wipe)<br>• `DELETE /api/v1/platform/security/keys/[keyId]`<br>• `POST /api/v1/platform/security/explorer/execute` (Step-up gated server execution path) |

---

## 6. Execution Roadmap for Phase 7C (Post-7B.1 Acceptance)

> [!IMPORTANT]
> Under strict technical governance, **no console screens (C1–C6) will be constructed until Phase 7B.1 visual language and Step C0 inventory are accepted.**

1. **Step C0** *(Completed)*: 67-route inventory reconciliation, screen ID alignment, API gap analysis, API Explorer security contract, and drop candidate ledger.
2. **Step C1**: Build Operator Overview (`A1`, `/console/overview`) and Tenant Management (`C2`, `/console/tenants`).
3. **Step C2**: Build Provisioning Pipeline (`C4`, `/console/provisioning`) and Security & Keys (`C6`, `/console/security` including secured API Explorer).
4. **Step C3**: Build Billing (`C3`, `/console/billing`) and Data Rights (`C5`, `/console/data-rights`).
5. **Step C4**: Establish 301/308 redirect mappings from legacy `/admin/*` and `/platform/*` routes to unified `/console/*` routes.
