# 🪐 OrbitoX Platform OS — Phase 7C Stage 0
# Document 02: Existing Screen & Reference Inventory

**Milestone:** Phase 7C Operations Console & System Screens  
**Governing Baseline:** Phase 7B.2 Delivered HEAD `188680c27ce51ebb8ca6e998e504c51a24c34fa0`  
**Specification Branch:** `docs/phase-7c-stage0-specification`  
**Date:** November 18, 2026 (Authoritative Census Revision)  
**Auditor / Role:** Principal Software Architect & Lead Fullstack Engineer

---

## 1. Visual Reference Artwork Census

The Phase 7C design directly translates the approved visual benchmarks located in `OrbitoX — new look concept-png/`:

| Concept Asset Name | Core Visual Elements & UI Patterns | Implementation Target in Phase 7C |
| :--- | :--- | :--- |
| `1 · Operator console — dark.png` | Dark background (`#0A0F1D`), crisp high-contrast cards, top stats row (Organizations, Active Tenants, Provisioning Sagas, System Load), search bar, and primary navigation sidebar. | **Master Console Layout (`/console`)** |
| `Operator console · phone.png` | Compact mobile portrait view with sticky header, collapsible KPI summary cards, quick action pills, bottom navigation bar, and minimum $44 \times 44$px touch targets. | **Mobile Phone Breakpoint (`< 640px`)** |
| `Shared console sidebar.png` | Grouped navigation items: Core Command (Overview), Fleet (Organizations, Tenants, Projects), Extensibility (Packages, Plugins), Ops (Provisioning, Approvals), Security (Keys, Operators, Audit, Data Rights), Commercial (Billing). | **`ConsoleNavItems` Hierarchy** |
| `Organization detail.png` | Header with organization status badge, quick actions (Suspend, Edit, Export), multi-tab inspection (Overview, Projects, Branches, Domains, Audit, Billing). | **`/console/organizations/[id]` & `/console/tenants/[id]` Inspector** |
| `Tenant detail · suspend with re-auth.png` | Red-accented destructive confirmation modal with reason selector, impacted project list, and TOTP MFA verification code input. | **Tenant Suspension Step-Up Modal** |
| `Provisioning job · retry.png` | Step-by-step saga execution pipeline with timestamps, error log drawer, and safe idempotent retry button. | **`/console/provisioning` Saga Inspector** |
| `API keys · rotate.png` | Active API credential table with permissions scope tags, expiry timer, and one-click key rotation modal showing 24h grace overlap. | **`/console/security` Key Rotation Drawer** |
| `Billing & payments.png` | Current plan summary, MRR graph, active subscriptions table, failed payment alerts, and manual invoice adjustment drawer. | **`/console/billing` Operational View** |
| `Data rights requests.png` | Data Rights job queue, export ZIP readiness indicator, and signed cryptographic deletion certificate viewer. | **`/console/data-rights` Compliance View** |
| `Pop-ups, warnings & utilities@2x.png` | Standardized dialog styles: Alert dialogs, destructive confirmations, toast notifications, and drawer slide-overs. | **Global Operational Dialogs** |

---

## 2. Authoritative Monorepo Route Census (52 Existing `page.tsx` Routes)

An exhaustive forensic census of the `apps/platform/src/app/(console)` tree at baseline commit `188680c` identified **exactly 52 `page.tsx` route files** distributed across three legacy/current namespaces:
- **16 routes** in `/admin/*`
- **12 routes** in `/console/*`
- **24 routes** in `/platform/*`

Every single route is documented below with its exact source path, current purpose, maturity status, and unambiguous migration target:

### 2.1 Legacy `/admin/*` Routes (16 Routes)

All legacy `/admin/*` routes are scheduled for permanent HTTP 308 redirection to canonical `/console/*` routes once functional parity is certified in Phase 7C:

| # | Existing Source Path | Current Purpose | Maturity | Migration Action & Single Target |
| :- | :--- | :--- | :--- | :--- |
| 1 | `apps/platform/src/app/(console)/admin/page.tsx` | Legacy admin root entry | Prototype | **308 Redirect** $\to$ `/console/overview` |
| 2 | `apps/platform/src/app/(console)/admin/api-keys/page.tsx` | Legacy API key management | Prototype | **308 Redirect** $\to$ `/console/security` |
| 3 | `apps/platform/src/app/(console)/admin/audit/page.tsx` | Legacy audit log table | Prototype | **308 Redirect** $\to$ `/console/audit` |
| 4 | `apps/platform/src/app/(console)/admin/business/page.tsx` | Business marketplace catalog | Prototype | **308 Redirect** $\to$ `/console/packages` |
| 5 | `apps/platform/src/app/(console)/admin/business/[category]/page.tsx` | Marketplace category drilldown | Prototype | **308 Redirect** $\to$ `/console/packages` |
| 6 | `apps/platform/src/app/(console)/admin/business/[category]/[providerId]/page.tsx` | Provider detail view | Prototype | **308 Redirect** $\to$ `/console/packages` |
| 7 | `apps/platform/src/app/(console)/admin/developer-apis/page.tsx` | Developer API documentation | Prototype | **308 Redirect** $\to$ `/console/developer/explorer` |
| 8 | `apps/platform/src/app/(console)/admin/marketplace/page.tsx` | Plugin marketplace catalog | Prototype | **308 Redirect** $\to$ `/console/packages` |
| 9 | `apps/platform/src/app/(console)/admin/projects/page.tsx` | Legacy project list | Prototype | **308 Redirect** $\to$ `/console/projects` |
| 10 | `apps/platform/src/app/(console)/admin/projects/[projectId]/page.tsx` | Legacy project detail | Prototype | **308 Redirect** $\to$ `/console/projects/[id]` |
| 11 | `apps/platform/src/app/(console)/admin/projects/create/page.tsx` | Legacy project creation wizard | Prototype | **308 Redirect** $\to$ `/console/projects/create` |
| 12 | `apps/platform/src/app/(console)/admin/quotas/page.tsx` | Legacy quotas and usage limits | Prototype | **308 Redirect** $\to$ `/console/billing` |
| 13 | `apps/platform/src/app/(console)/admin/restaurant/page.tsx` | Legacy restaurant runtime manager | Prototype | **308 Redirect** $\to$ `/console/tenants` |
| 14 | `apps/platform/src/app/(console)/admin/services/page.tsx` | Microservices status catalog | Prototype | **308 Redirect** $\to$ `/console/packages` |
| 15 | `apps/platform/src/app/(console)/admin/services/[serviceId]/page.tsx` | Individual service detail | Prototype | **308 Redirect** $\to$ `/console/packages` |
| 16 | `apps/platform/src/app/(console)/admin/system/page.tsx` | Legacy system health & telemetry | Prototype | **308 Redirect** $\to$ `/console/overview` |

### 2.2 Active `/console/*` Routes (12 Routes)

The current `/console/*` routes provide the foundational shells established in Phase 7B.2 and are retained as the canonical home for console operations:

| # | Existing Source Path | Current Purpose | Maturity | Migration Action & Single Target |
| :- | :--- | :--- | :--- | :--- |
| 17 | `apps/platform/src/app/(console)/console/page.tsx` | Console root entry point | Production-ready | **308 Redirect** $\to$ `/console/overview` |
| 18 | `apps/platform/src/app/(console)/console/overview/page.tsx` | Command center & KPI summary | Pilot-ready | **Retain & Expand** as canonical `/console/overview` |
| 19 | `apps/platform/src/app/(console)/console/organizations/page.tsx` | Customer legal entities table | Pilot-ready | **Retain & Harden** as canonical `/console/organizations` |
| 20 | `apps/platform/src/app/(console)/console/tenants/page.tsx` | Tenant runtime fleet table | Pilot-ready | **Retain & Expand** as canonical `/console/tenants` |
| 21 | `apps/platform/src/app/(console)/console/tenants/[id]/page.tsx` | Tenant runtime inspector drawer/view | Pilot-ready | **Retain & Expand** as canonical `/console/tenants/[id]` |
| 22 | `apps/platform/src/app/(console)/console/provisioning/page.tsx` | Provisioning saga & jobs queue | Pilot-ready | **Retain & Expand** as canonical `/console/provisioning` |
| 23 | `apps/platform/src/app/(console)/console/security/page.tsx` | Master API keys & operator security | Pilot-ready | **Retain & Expand** as canonical `/console/security` |
| 24 | `apps/platform/src/app/(console)/console/billing/page.tsx` | Plans, subscriptions & billing | Pilot-ready | **Retain & Expand** as canonical `/console/billing` |
| 25 | `apps/platform/src/app/(console)/console/audit/page.tsx` | Append-only audit log search | Pilot-ready | **Retain & Harden** as canonical `/console/audit` |
| 26 | `apps/platform/src/app/(console)/console/data-rights/page.tsx` | GDPR/DPDP Phase 6G data rights | Production-ready | **Retain & Harden** as canonical `/console/data-rights` |
| 27 | `apps/platform/src/app/(console)/console/settings/appearance/page.tsx` | Theme, mode & accent picker | Production-ready | **Retain & Harden** as canonical `/console/settings/appearance` |
| 28 | `apps/platform/src/app/(console)/console/design-system/page.tsx` | Design system component gallery | Production-ready | **Retain** as canonical `/console/design-system` |

### 2.3 Legacy `/platform/*` Routes (24 Routes)

The `/platform/*` routes represent earlier operational screens that will be consolidated into canonical `/console/*` routes:

| # | Existing Source Path | Current Purpose | Maturity | Migration Action & Single Target |
| :- | :--- | :--- | :--- | :--- |
| 29 | `apps/platform/src/app/(console)/platform/page.tsx` | Platform root entry | Prototype | **308 Redirect** $\to$ `/console/overview` |
| 30 | `apps/platform/src/app/(console)/platform/ai/page.tsx` | AI Gateway & MCP diagnostic tools | Technical preview | **Move & 308 Redirect** $\to$ `/console/ai` |
| 31 | `apps/platform/src/app/(console)/platform/api-keys/page.tsx` | Platform API key screen | Pilot-ready | **308 Redirect** $\to$ `/console/security` |
| 32 | `apps/platform/src/app/(console)/platform/approvals/page.tsx` | Operational approvals inbox | Technical preview | **Move & 308 Redirect** $\to$ `/console/approvals` |
| 33 | `apps/platform/src/app/(console)/platform/audit/page.tsx` | Platform audit log stream | Pilot-ready | **308 Redirect** $\to$ `/console/audit` |
| 34 | `apps/platform/src/app/(console)/platform/configuration/page.tsx` | Global runtime system config | Technical preview | **Move & 308 Redirect** $\to$ `/console/settings/configuration` |
| 35 | `apps/platform/src/app/(console)/platform/connect/page.tsx` | Third-party plugin connections | Technical preview | **308 Redirect** $\to$ `/console/packages` |
| 36 | `apps/platform/src/app/(console)/platform/credentials/page.tsx` | Third-party credential vault | Technical preview | **308 Redirect** $\to$ `/console/security` |
| 37 | `apps/platform/src/app/(console)/platform/explorer/page.tsx` | Interactive OpenAPI Explorer | Pilot-ready | **Move & 308 Redirect** $\to$ `/console/developer/explorer` |
| 38 | `apps/platform/src/app/(console)/platform/fleet/page.tsx` | External project engine fleet connections | Technical preview | **308 Redirect** $\to$ `/console/provisioning` *(Unambiguous single target)* |
| 39 | `apps/platform/src/app/(console)/platform/login/page.tsx` | Platform operator login screen | Pilot-ready | **Move & 308 Redirect** $\to$ `/console/login` |
| 40 | `apps/platform/src/app/(console)/platform/observability/page.tsx` | Infrastructure telemetry metrics | Technical preview | **308 Redirect** $\to$ `/console/overview` |
| 41 | `apps/platform/src/app/(console)/platform/operations/page.tsx` | Async operations saga tracker | Technical preview | **308 Redirect** $\to$ `/console/provisioning` |
| 42 | `apps/platform/src/app/(console)/platform/packages/page.tsx` | Package & plugin registry catalogue | Pilot-ready | **Move & 308 Redirect** $\to$ `/console/packages` |
| 43 | `apps/platform/src/app/(console)/platform/plans/page.tsx` | Commercial plans & pricing tiers | Pilot-ready | **308 Redirect** $\to$ `/console/billing` |
| 44 | `apps/platform/src/app/(console)/platform/projects/page.tsx` | Business software projects list | Pilot-ready | **Move & 308 Redirect** $\to$ `/console/projects` |
| 45 | `apps/platform/src/app/(console)/platform/projects/[projectId]/page.tsx` | Project details & environment graph | Pilot-ready | **Move & 308 Redirect** $\to$ `/console/projects/[id]` |
| 46 | `apps/platform/src/app/(console)/platform/restaurants/page.tsx` | RestaurantOS locations fleet | Pilot-ready | **308 Redirect** $\to$ `/console/tenants` |
| 47 | `apps/platform/src/app/(console)/platform/restaurants/[id]/page.tsx` | RestaurantOS location inspector | Pilot-ready | **308 Redirect** $\to$ `/console/tenants/[id]` |
| 48 | `apps/platform/src/app/(console)/platform/security/page.tsx` | Master security dashboard | Pilot-ready | **308 Redirect** $\to$ `/console/security` |
| 49 | `apps/platform/src/app/(console)/platform/settings/page.tsx` | General platform settings | Technical preview | **308 Redirect** $\to$ `/console/settings/configuration` |
| 50 | `apps/platform/src/app/(console)/platform/tenants/page.tsx` | Platform tenants listing | Pilot-ready | **308 Redirect** $\to$ `/console/tenants` |
| 51 | `apps/platform/src/app/(console)/platform/tenants/new/page.tsx` | Tenant manual provisioning wizard | Pilot-ready | **Move & 308 Redirect** $\to$ `/console/tenants/new` |
| 52 | `apps/platform/src/app/(console)/platform/tests/page.tsx` | In-browser automated test runner | Technical preview | **Move & 308 Redirect** $\to$ `/console/developer/tests` |

---

## 3. Organizations vs Tenants: Core Domain Boundary Clarification

A critical architectural distinction in OrbitoX is the separation between an **Organization** and a **Tenant**:

```mermaid
graph TD
    subgraph OrganizationLevel ["Organization (Legal & Commercial Customer Entity)"]
        ORG["PlatformOrganization\n(ID, Name, Legal Entity, Tax GSTIN, Billing Owner)"]
        MEMBERS["CustomerMembership[]\n(Owners, Admins, Accountants, Staff)"]
        SUB["BillingSubscription\n(Razorpay Subscription, Plan, Invoices)"]
        TOKENS["AccountToken[]\n(User Login Sessions, Auth Buckets)"]
    end

    subgraph TenantLevel ["Tenants / Runtime Workspaces (Software Instances)"]
        TENANT1["Tenant A (Production RestaurantOS)\n(Schema: tenant_a, Custom Domain: dining.bistro.com)"]
        TENANT2["Tenant B (Staging RestaurantOS)\n(Schema: tenant_b_stg, Domain: staging.bistro.com)"]
        TENANT3["Tenant C (Retail POS Runtime)\n(Plugin: @orbitox-io/pos)"]
    end

    ORG --> MEMBERS
    ORG --> SUB
    ORG --> TOKENS
    ORG -->|1-to-Many Ownership| TENANT1
    ORG -->|1-to-Many Ownership| TENANT2
    ORG -->|1-to-Many Ownership| TENANT3
```

1. **`/console/organizations` (Organization Management):**
   - Represents the commercial and legal customer account (`PlatformOrganization`).
   - Manages billing contracts, payment methods, GST/tax configurations, user memberships, and organization-level data rights erasure.
2. **`/console/tenants` (Tenant / Runtime Fleet Management):**
   - Represents an active provisioned application runtime instance or workspace (`RestaurantLocation`, external project deployment).
   - Manages runtime health, database RLS schema binding, custom domain routing, branch layouts, and operational suspension/resumption.
   - An organization may own multiple tenants (e.g., a main restaurant branch, a secondary delivery kitchen, and a staging environment).

---

## 4. Disconnected & Mocked Data Real-Data Remediation Plan

To eliminate all mocked responses in accordance with Governance Rule 3.4:

1. **Observability & Telemetry (`/platform/observability` $\to$ `/console/overview`):**
   - Replace static mock cards with live data from `GET /api/v1/platform/overview/telemetry`.
   - Queries `node:process` for memory usage (`rss`, `heapUsed`), `eventLoopDelay` histogram, and `platform-database-readiness.ts` for active/idle PostgreSQL connection pool metrics.
2. **Cluster Reconciliation (`/api/v1/platform/reconcile`):**
   - Execute strictly as `POST /api/v1/platform/reconcile`, invoking `reconciliation.reconcileAll()` to compare desired resource graphs against live observed runtime state.
3. **Plan Entitlements & Preflight Downgrades:**
   - Connect `POST /api/v1/platform/plan/preflight-downgrade` to inspect active tenant seat counts, branch counts, and dish items before rendering plan change options.
