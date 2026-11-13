# 🪐 OrbitoX Platform Console: Parity Inventory & Architecture Specification (Step C0)

**Stage**: Phase 7C — Step C0 (Master Parity Inventory & Architecture Mapping)  
**Governing Specification**: `PHASE7_UI_MASTER_BRIEF.md` (supersedes all prior briefs)  
**Target Visual Language**: Phase 7B.1 Visual System (Plus Jakarta Sans, 28px cards, 999px pills, dark `#0D0F12` operator mood, dual-mode Ocean accent)  
**Status**: Ready for Owner Sign-off  

---

## 1. Executive Overview & Route Census

Historically, operator-facing features were authored across two parallel surfaces:
- **Legacy Admin Console (`/admin/*`)**: 16 routes created during initial prototyping for mock marketplace plugins, early service health, and experimental quota sliders.
- **Platform Management Console (`/platform/*`)**: 24 routes created during enterprise multi-tenant rollout for zero-trust provisioning, Ed25519 cryptographic security, and RBAC enforcement.

Together, these represent exactly **40 legacy routes**. With the addition of `/console/settings/appearance` (the interactive user appearance engine built and verified in Stage 7B.1), the total inventory surveyed comprises **41 routes**.

Step C0 establishes the **definitive inventory, disposition recommendations, and API gap analysis** to converge all operator capabilities into the master **7B.1 Operator Console Navigation** (Master Brief `A1`, `C0`–`C6`) with zero operational downtime and zero data loss.

---

## 2. Master Navigation Mapping (Screen IDs: A1, C0–C6)

Every retained capability maps cleanly to the unified console navigation:

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

## 3. Comprehensive Inventory of All 41 Routes

Each existing page is assigned an architectural disposition:
- **Migrate**: Retained as a primary production capability and restyled to the 7B.1 visual language.
- **Merge**: Redundant or fragmented functionality consolidated into a primary master screen.
- **Hold**: Retained temporarily under architectural freeze until the modern replacement stage is complete.
- **Drop**: Scaffolding, static mockups, or developer harnesses with no runtime operator role.
- **Live**: Already built, verified, and active in production.

| # | Route | Current Purpose | Disposition | Target Screen / Architectural Destination |
|---|---|---|---|---|
| 1 | `/admin` | Prototype dashboard overview | **Merge** | Merge into `A1` (Overview) |
| 2 | `/admin/api-keys` | Basic API key generation table | **Merge** | Merge into `C6` (Security & Keys) |
| 3 | `/admin/audit` | Flat audit log viewer | **Merge** | Merge into unified `Audit Log` |
| 4 | `/admin/business` | Plugin categories directory | **Merge** | Merge into `C2` (Tenants Plugin Sub-view) |
| 5 | `/admin/business/[category]` | Filtered category plugins | **Merge** | Merge into `C2` (Tenant Plugin Configuration) |
| 6 | `/admin/business/[category]/[providerId]` | Plugin detail & mock settings | **Merge** | Merge into `C2` (Tenant Plugin Detail) |
| 7 | `/admin/developer-apis` | OpenAPI static explorer | **Merge** | Merge into `C6` (Security & Developer APIs) |
| 8 | `/admin/marketplace` | Legacy plugin store mockup | **HOLD** | Replaced in `C2` via `@orbitox-io/plugin-engine` & `C3` billing entitlements |
| 9 | `/admin/projects` | Project table with legacy schema | **Merge** | Merge into `C2` (Tenants) |
| 10 | `/admin/projects/[projectId]` | Project detail view | **Merge** | Merge into `C2` (Tenant Detail) |
| 11 | `/admin/projects/create` | Project creation wizard | **Merge** | Merge into `C4` (Provisioning Job Flow) |
| 12 | `/admin/quotas` | Basic quota slider UI | **Merge** | Merge into `C2` (Tenant Resource Limits) |
| 13 | `/admin/restaurant` | Hardcoded restaurant shortcut | **HOLD** | Replaced in `C2` by filtered tenant view (`plugin = @orbitox/pos`) |
| 14 | `/admin/services` | In-memory microservices view | **Merge** | Merge into `A1` (Cluster Health Strip) |
| 15 | `/admin/services/[serviceId]` | Service health detail | **Merge** | Merge into `A1` (Service Telemetry Drawer) |
| 16 | `/admin/system` | Prototype system toggles | **Merge** | Merge into `Settings` (Platform Parameters) |
| 17 | `/platform` | Operator overview redirect | **Merge** | Merge into `A1` (Overview) |
| 18 | `/platform/ai` | Early AI assistant prototype | **HOLD** | Preserved intact until Stage 7G (*Ask OrbitoX* MCP assistant) |
| 19 | `/platform/api-keys` | Cryptographic API keys list | **Migrate** | Primary source for `C6` (Security & Keys) |
| 20 | `/platform/approvals` | Operator step-up approval queue | **Merge** | Merge into `C4` (Provisioning) & `Audit Log` |
| 21 | `/platform/audit` | Audited action feed | **Migrate** | Primary source for unified `Audit Log` |
| 22 | `/platform/configuration` | JSON configuration editor | **Merge** | Merge into `Settings` (Configuration tab) |
| 23 | `/platform/connect` | Bridge protocol diagnostic | **Merge** | Merge into `C6` (Security / Bridge tab) |
| 24 | `/platform/credentials` | Vault credential listing | **Merge** | Merge into `C6` (Security & Keys) |
| 25 | `/platform/explorer` | Database table explorer | **Drop** | Security risk: internal debugging tool that bypasses tenant RLS |
| 26 | `/platform/fleet` | Fleet instance telemetry | **Merge** | Merge into `A1` (Fleet Health Strip) |
| 27 | `/platform/login` | Operator authentication & TOTP | **Retain** | Gated security auth barrier (retained without breaking changes) |
| 28 | `/platform/observability` | Raw Prometheus/metrics graphs | **Merge** | Merge into `A1` (Lollipop throughput & line charts) |
| 29 | `/platform/operations` | Async operation store listing | **Migrate** | Primary source for `C4` (Provisioning) |
| 30 | `/platform/packages` | npm package release status | **Drop** | Build artifact: CI/CD concern, not operator runtime work |
| 31 | `/platform/plans` | Tier catalog & entitlement matrix | **Merge** | Merge into `C3` (Billing & Plan Entitlements) |
| 32 | `/platform/projects` | Project environments table | **Merge** | Merge into `C2` (Tenants) |
| 33 | `/platform/projects/[projectId]` | Project deep detail | **Merge** | Merge into `C2` (Tenant Detail) |
| 34 | `/platform/restaurants` | External OS instance list | **Merge** | Filtered query view in `C2` (`plugin = @orbitox/pos`) |
| 35 | `/platform/restaurants/[id]` | External restaurant detail | **Merge** | Tenant detail sub-view in `C2` |
| 36 | `/platform/security` | Key rotation & session security | **Migrate** | Primary source for `C6` (Security & Keys) |
| 37 | `/platform/settings` | Platform system settings | **Migrate** | Primary source for `Settings` (System tab) |
| 38 | `/platform/tenants` | Multi-tenant cluster manager | **Migrate** | Primary source for `C2` (Tenants) |
| 39 | `/platform/tenants/new` | Multi-tenant creation wizard | **Migrate** | Modal creation workflow in `C2` |
| 40 | `/platform/tests` | In-browser test runner | **Drop** | Developer tool: replaced by Playwright and Vitest in CI |
| 41 | `/console/settings/appearance` | Interactive appearance controls | **Live** | Production user appearance engine built in Stage 7B.1 |

---

## 4. Architectural Drop List & Formal Holds (Owner Sign-off)

### 4.1 Agreed Drops (Recommended for Immediate Removal in 7C)
1. **`/platform/packages`**:
   - *Technical Rationale*: Displays static npm release metadata. Package publishing is strictly automated via GitHub Actions (`build-and-test.yml`) and GitHub Packages (`@orbitox-io`). Operators manage tenant runtime services, not build packages.
2. **`/platform/tests`**:
   - *Technical Rationale*: In-browser test runner that exposes unauthenticated test execution endpoints. Testing is strictly automated in CI (Playwright, Node.js runner, Vitest).
3. **`/platform/explorer`**:
   - *Technical Rationale*: Unscoped SQL table browser created during early development. Violates zero-trust isolation by exposing raw multi-tenant rows without tenant filtering.

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

---

## 5. Target Screens & Existing vs Missing APIs

| Screen ID | Target Functionality | Existing API Endpoints | Missing APIs to Build in 7C |
|---|---|---|---|
| **C1**<br>Organization Detail | Metadata, member roster, plan quotas, tenant listing, ownership transfer | • `GET /api/v1/customer/organizations/[id]`<br>• `GET /api/v1/customer/organizations/[id]/members`<br>• `GET /api/v1/customer/organizations/[id]/tenants` | • `GET /api/v1/platform/organizations/[id]` (Cross-tenant elevated operator view)<br>• `PUT /api/v1/platform/organizations/[id]/plan` |
| **C2**<br>Tenant Detail & Suspend | Domain config, database isolation, resource usage, step-up gated `DangerousAction` suspend | • `GET /api/v1/tenants/[id]`<br>• `POST /api/v1/tenants/[id]/suspend`<br>• `POST /api/v1/tenants/[id]/resume` | • `GET /api/v1/platform/tenants/[id]/telemetry` (Real-time latency & error rate)<br>• `PUT /api/v1/platform/tenants/[id]/domain` |
| **C3**<br>Billing & Payments | Invoices, payment gateway status (Razorpay / Stripe), grace period countdown, retry payment | • `GET /api/v1/billing/webhook`<br>• `GET /api/v1/customer/organizations/[id]/billing` | • `GET /api/v1/platform/billing/invoices`<br>• `POST /api/v1/platform/billing/invoices/[id]/retry`<br>• `PUT /api/v1/platform/billing/grace-period` |
| **C4**<br>Provisioning Job | Async operation pipeline, vertical `Stepper` status (done, failed, waiting), diagnostics, retry | • `GET /api/v1/operations/[id]`<br>• `POST /api/v1/operations/[id]/retry` | • `GET /api/v1/platform/operations` (Paginated filterable operation stream)<br>• `POST /api/v1/platform/operations/[id]/cancel` |
| **C5**<br>Data Rights (DSR) | GDPR/DPDP data subject rights requests, archive generation, tenant purging, status pill | • `GET /api/v1/customer/organizations/[id]/data/export`<br>• `POST /api/v1/customer/organizations/[id]/data/deletion` | • `GET /api/v1/platform/data-rights/requests`<br>• `POST /api/v1/platform/data-rights/requests/[id]/approve`<br>• `GET /api/v1/platform/data-rights/requests/[id]/download` |
| **C6**<br>Security & Keys | Ed25519 signing keypairs, rotate key action, `CopyOnceSecret` single-reveal, token revocation | • `GET /api/v1/platform/security`<br>• `POST /api/v1/admin/api-keys/[keyId]/rotate` | • `POST /api/v1/platform/security/keys/rotate` (Strict Ed25519 with volatile memory wipe)<br>• `DELETE /api/v1/platform/security/keys/[keyId]` |

---

## 6. Execution Roadmap for Phase 7C (Post-7B.1 Acceptance)

> [!IMPORTANT]
> Under strict technical governance, **no console screens (C1–C6) will be constructed until Phase 7B.1 visual language and Step C0 inventory are accepted.**

1. **Step C0** *(Completed)*: Parity inventory, screen ID alignment, API gap analysis, and drop list.
2. **Step C1**: Build Operator Overview (`A1`, `/console/overview`) and Tenant Management (`C2`, `/console/tenants`).
3. **Step C2**: Build Provisioning Pipeline (`C4`, `/console/provisioning`) and Security & Keys (`C6`, `/console/security`).
4. **Step C3**: Build Billing (`C3`, `/console/billing`) and Data Rights (`C5`, `/console/data-rights`).
5. **Step C4**: Establish 301/308 redirect mappings from legacy `/admin/*` and `/platform/*` routes to unified `/console/*` routes.
