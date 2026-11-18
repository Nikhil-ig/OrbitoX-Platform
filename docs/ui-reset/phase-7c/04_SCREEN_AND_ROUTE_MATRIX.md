# 🪐 OrbitoX Platform OS — Phase 7C Stage 0
# Document 04: Screen & Route Matrix

**Milestone:** Phase 7C Operations Console & System Screens  
**Governing Baseline:** Phase 7B.2 Delivered HEAD `188680c27ce51ebb8ca6e998e504c51a24c34fa0`  
**Date:** November 18, 2026 (Revised)  
**Auditor / Role:** Principal Software Architect & Lead Fullstack Engineer

---

## 1. Unified Route Consolidation Matrix

Phase 7C consolidates all administrative and platform operations into the canonical `/console/*` route namespace. In accordance with Non-Negotiable Governance Rule 3.1, legacy routes (`/admin/*`, `/platform/*`) remain operational with verified functional parity before 308 permanent redirects are enabled.

### 1.1 Complete Route-by-Route Consolidation Ledger

| Canonical Console Route | Screen Purpose | Predecessor Routes | Migration Action | Required Role (`PlatformOperatorRole`) |
| :--- | :--- | :--- | :--- | :--- |
| **`/console`** | Root entry redirect | `/admin`, `/platform` | Permanent 308 redirect to `/console/overview` | `SUPPORT_READONLY` |
| **`/console/overview`** | System Command Center & Fleet Telemetry | `/(console)/console/overview`, `/admin/system`, `/platform/overview`, `/platform/fleet` | **Retain & Expand** with live metrics from `OverviewService` | `SUPPORT_READONLY` |
| **`/console/organizations`** | Legal Entities, Billing Owners & Memberships | `/(console)/console/organizations` | **Retain & Harden** (Dedicated customer legal entity view) | `OPERATOR` |
| **`/console/organizations/[id]`**| Organization detail & membership inspector | New canonical screen | **Add** multi-tab inspector (Projects, Subscriptions, Members) | `OPERATOR` |
| **`/console/tenants`** | Provisioned Workspaces & Runtime Fleet | `/(console)/console/tenants`, `/admin/tenants`, `/platform/tenants`, `/platform/restaurants` | **Consolidate** all vertical runtimes under unified fleet table | `OPERATOR` |
| **`/console/tenants/[id]`** | Tenant runtime inspector & branch controls | `/(console)/console/tenants/[id]`, `/platform/restaurants/[id]` | **Retain & Expand** with suspension modal and domain status | `OPERATOR` |
| **`/console/tenants/new`** | Manual runtime provisioning wizard | `/platform/tenants/new` | **Move** to canonical console path | `OPERATOR` |
| **`/console/projects`** | Business software projects & environments | `/(console)/platform/projects`, `/admin/projects` | **Move** to `/console/projects` (Environments: dev, stg, prod) | `OPERATOR` |
| **`/console/projects/[id]`** | Project environment & resource graph | `/(console)/platform/projects/[projectId]`, `/admin/projects/[projectId]` | **Move** to `/console/projects/[id]` (Resource drift & topology) | `OPERATOR` |
| **`/console/projects/create`**| Project template factory wizard | `/admin/projects/create` | **Move** to canonical `/console/projects/create` | `OPERATOR` |
| **`/console/packages`** | Package & plugin registry catalogue | `/(console)/platform/packages`, `/admin/marketplace`, `/admin/business`, `/admin/services` | **Consolidate** under canonical `/console/packages` | `OPERATOR` |
| **`/console/provisioning`** | Asynchronous provisioning jobs & sagas | `/(console)/console/provisioning`, `/platform/operations`, `/platform/fleet` | **Retain & Expand** with `PlatformOperation` retry actions | `OPERATOR` |
| **`/console/security`** | Master API credentials & key rotation | `/(console)/console/security`, `/admin/api-keys`, `/platform/security`, `/platform/credentials` | **Consolidate** with credential vault and rotation drawers | `PLATFORM_OWNER` |
| **`/console/billing`** | Commercial plans, subscriptions & invoices | `/(console)/console/billing`, `/admin/quotas`, `/platform/plans` | **Consolidate** with Razorpay subscription state machine | `BILLING` |
| **`/console/approvals`** | Operator multi-person approvals inbox | `/(console)/platform/approvals` | **Retain** as canonical `/console/approvals` | `OPERATOR` |
| **`/console/audit`** | Append-only immutable audit trail | `/(console)/console/audit`, `/admin/audit`, `/platform/audit` | **Retain & Harden** with live stream and redacted diffs | `SUPPORT_READONLY` |
| **`/console/data-rights`** | GDPR/DPDP data export & erasure certs | `/(console)/console/data-rights`, `/platform/data-rights` | **Retain & Harden** with ZIP streaming and signed certs | `PLATFORM_OWNER` |
| **`/console/ai`** | AI Gateway & MCP diagnostic tools | `/(console)/platform/ai` | **Retain** as canonical `/console/ai` with human-in-the-loop gates | `OPERATOR` |
| **`/console/developer/explorer`**| Interactive OpenAPI Explorer | `/(console)/platform/explorer`, `/admin/developer-apis` | **Move** to developer sub-path | `SUPPORT_READONLY` |
| **`/console/developer/tests`** | In-browser automated test runner | `/(console)/platform/tests` | **Move** to developer sub-path (Owner only) | `PLATFORM_OWNER` |
| **`/console/settings/configuration`**| Global platform runtime configuration | `/(console)/platform/configuration`, `/platform/settings` | **Move** to canonical settings path | `PLATFORM_OWNER` |
| **`/console/settings/appearance`**| Operator dark theme & accent selection | `/(console)/console/settings/appearance` | **Retain** as canonical appearance settings | `SUPPORT_READONLY` |
| **`/console/design-system`**| Internal design system showcase | `/(console)/console/design-system` | **Retain** as developer reference | `SUPPORT_READONLY` |

---

## 2. Exhaustive End-to-End Traceability Matrix

Every screen in the Operations Console connects to authoritative backend services, validated server actions, canonical permissions, and verification test specifications:

| Screen Route | Authoritative Backend Service | HTTP Endpoint & Method | Required Role | Primary Input / Output Data Contract | Verification Test Spec Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`/console/overview`** | `OverviewService` (`apps/platform/src/server/overview/overview-service.ts`) | `GET /api/v1/platform/overview/summary`<br>`GET /api/v1/platform/overview/telemetry`<br>`GET /api/v1/platform/overview/alerts`<br>`POST /api/v1/platform/reconcile` | `SUPPORT_READONLY`<br>(Reconcile: `OPERATOR`) | Out: `{ counts: { orgs, tenants, sagas }, telemetry: { heap, cpu, eventLoop, dbPool }, alerts: Alert[] }`<br>In: `{ resourceId?: string }` | `tests/unit/overview-service.test.ts`<br>`tests/integration/test-console-overview.ts` |
| **`/console/organizations`**| `OrganizationService` (`apps/platform/src/server/organizations/organization-service.ts`) | `GET /api/v1/platform/organizations`<br>`POST /api/v1/platform/organizations` | `OPERATOR` | In: `{ name, slug, billingEmail, planId }`<br>Out: `PlatformOrganization[]` | `tests/integration/console-c1-organizations.test.ts` |
| **`/console/tenants`** | `TenantsService` (`apps/platform/src/server/tenants/tenants-service.ts`) | `GET /api/v1/platform/tenants`<br>`POST /api/v1/platform/tenants` | `OPERATOR` | In: `{ query?, status?, page, pageSize }`<br>Out: `{ items: TenantSummary[], totalCount: number }` | `tests/integration/console-tenant-crud.test.ts`<br>`tests/unit/tenants-service.test.ts` |
| **`/console/tenants/[id]`** | `TenantsService` & `RestaurantBridgeClient` | `GET /api/v1/platform/tenants/:id`<br>`POST /api/v1/platform/tenants/:id/suspend`<br>`POST /api/v1/platform/tenants/:id/resume` | `OPERATOR`<br>(Suspend: `PLATFORM_OWNER` with TOTP) | In: `{ reason, notes, mfaToken }`<br>Out: `{ success: boolean, suspendedAt: Date }` | `tests/unit/phase6-account-security.test.ts`<br>`tests/chaos/test-platform-db-outage.ts` |
| **`/console/projects`** | `PlatformRepository` & `ProjectFactory` | `GET /api/v1/projects`<br>`POST /api/v1/projects/factory`<br>`GET /api/v1/platform/drift` | `OPERATOR` | In: `{ name, templateId, environment }`<br>Out: `PlatformProject[]` | `tests/unit/platform-repository-mode.test.ts` |
| **`/console/packages`** | `PluginLifecycleService` (`packages/plugin-engine`) | `GET /api/v1/platform/packages`<br>`GET /api/v1/platform/plugins`<br>`GET /api/v1/platform/grants` | `OPERATOR` | In: `{ packageId, version }`<br>Out: `{ packages: PlatformPackage[], verifiedSignatures: boolean }` | `packages/plugin-engine/src/manifest.validator.spec.ts` |
| **`/console/provisioning`**| `ProvisioningSaga` & `OperationStore` | `GET /api/v1/platform/operations`<br>`POST /api/v1/platform/operations/:id/retry`<br>`POST /api/v1/platform/operations/:id/cancel` | `OPERATOR` | In: `{ jobId, idempotentKey }`<br>Out: `PlatformOperation` with step history | `tests/unit/operation-store-persistence.test.ts`<br>`tests/unit/provisioning-lease-concurrency.test.ts` |
| **`/console/security`** | `SecurityConsoleService` (`apps/platform/src/server/security/security-console-service.ts`) | `GET /api/v1/platform/security-keys`<br>`POST /api/v1/platform/security-keys/:id/rotate`<br>`POST /api/v1/platform/security-keys/:id/revoke` | `PLATFORM_OWNER` (with TOTP) | In: `{ keyId, graceHours, mfaToken }`<br>Out: `{ newKeyId, expiresAt, gracePeriodEndsAt }` | `tests/integration/console-c6-security.test.ts`<br>`tests/unit/phase6-account-auth.test.ts` |
| **`/console/billing`** | `RazorpayBillingService` (`apps/platform/src/server/billing/razorpay-billing.ts`) | `GET /api/v1/billing/plans`<br>`GET /api/v1/platform/billing/summary`<br>`POST /api/v1/platform/plan/preflight-downgrade` | `BILLING` | In: `{ targetPlanId, tenantId }`<br>Out: `{ canDowngrade: boolean, violations: QuotaViolation[] }` | `tests/integration/console-c3-billing.test.ts`<br>`tests/unit/phase6-billing-checkout-db.test.ts` |
| **`/console/audit`** | `AuditConsoleService` (`apps/platform/src/server/audit/audit-console-service.ts`) | `GET /api/v1/platform/audit-logs`<br>`GET /api/v1/platform/audit-logs/export` | `SUPPORT_READONLY` | In: `{ query?, actor?, tenantId?, dateRange?, page }`<br>Out: `PlatformAuditEvent[]` (Redacted) | `tests/integration/console-audit.test.ts`<br>`tests/unit/audit-role-permissions.test.ts` |
| **`/console/data-rights`** | `DataRightsService` (`apps/platform/src/server/data-rights/service.ts`) | `GET /api/v1/platform/data-rights`<br>`POST /api/v1/data-rights/export`<br>`POST /api/v1/data-rights/delete` | `PLATFORM_OWNER` (with TOTP) | In: `{ tenantId, mfaToken }`<br>Out: `{ exportJobId, downloadToken }` or signed deletion certificate | `tests/integration/test-data-rights-6g.ts`<br>`tests/unit/data-rights-foundations.test.ts` |
| **`/console/settings/appearance`** | `AppearanceService` (`apps/platform/src/server/appearance/appearance-service.ts`) | `GET /api/v1/platform/me/appearance`<br>`PUT /api/v1/account/appearance` | `SUPPORT_READONLY` | In: `{ theme: 'dark'|'light', accent: AccentPreset, density: DensityPreset }`<br>Out: `UserAppearance` | `tests/unit/appearance-api.test.ts`<br>`tests/unit/appearance-persistence.test.ts` |
