# 🪐 OrbitoX Platform OS — Phase 7C Stage 0
# Document 04: Screen & Route Matrix

**Milestone:** Phase 7C Operations Console & System Screens  
**Governing Baseline:** Phase 7B.2 Delivered HEAD `188680c27ce51ebb8ca6e998e504c51a24c34fa0`  
**Date:** November 18, 2026  
**Auditor / Role:** Principal Software Architect & Lead Fullstack Engineer

---

## 1. Unified Route Consolidation Matrix

Phase 7C establishes `/console/*` as the authoritative persona route for all platform operations, replacing legacy split routes (`/admin/*`, `/platform/*`).

### 1.1 Consolidated Route Map & Deprecation Redirects

| Modern Canonical Route | Primary Server Component / Page | Legacy Route (Redirect Source) | HTTP Status | Required Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **`/console`** | `(console)/console/page.tsx` | `/admin`, `/platform` | `308 Permanent` | `OPERATOR_VIEW` |
| **`/console/overview`** | `(console)/console/overview/page.tsx` | `/admin/system`, `/platform/overview` | `308 Permanent` | `OPERATOR_VIEW` |
| **`/console/tenants`** | `(console)/console/tenants/page.tsx` | `/admin/tenants`, `/platform/tenants` | `308 Permanent` | `TENANT_MANAGE` |
| **`/console/tenants/[id]`** | `(console)/console/tenants/[id]/page.tsx` | `/admin/tenants/:id`, `/platform/restaurants/:id`| `308 Permanent` | `TENANT_MANAGE` |
| **`/console/projects`** | `(console)/console/projects/page.tsx` | `/admin/projects`, `/platform/projects` | `308 Permanent` | `PROJECT_MANAGE` |
| **`/console/projects/[id]`** | `(console)/console/projects/[id]/page.tsx`| `/admin/projects/:id` | `308 Permanent` | `PROJECT_MANAGE` |
| **`/console/packages`** | `(console)/console/packages/page.tsx` | `/admin/marketplace`, `/admin/business` | `308 Permanent` | `PACKAGE_MANAGE` |
| **`/console/provisioning`** | `(console)/console/provisioning/page.tsx` | `/admin/services`, `/platform/fleet` | `308 Permanent` | `PROVISION_MANAGE` |
| **`/console/security`** | `(console)/console/security/page.tsx` | `/admin/api-keys`, `/platform/security` | `308 Permanent` | `SECURITY_ADMIN` |
| **`/console/billing`** | `(console)/console/billing/page.tsx` | `/admin/quotas`, `/platform/plans` | `308 Permanent` | `BILLING_ADMIN` |
| **`/console/audit`** | `(console)/console/audit/page.tsx` | `/admin/audit`, `/platform/audit` | `308 Permanent` | `AUDIT_VIEW` |
| **`/console/data-rights`** | `(console)/console/data-rights/page.tsx` | `/platform/data-rights` | `308 Permanent` | `COMPLIANCE_OFFICER` |
| **`/console/settings/appearance`** | `(console)/console/settings/appearance/page.tsx`| `/platform/settings` | `308 Permanent` | `OPERATOR_VIEW` |

---

## 2. Screen Data Contract & Action Specifications

### 2.1 `/console/overview` (System Command Center)
- **Data Loaders:** `getOverviewSummary()`, `getOverviewTelemetry()`, `getActiveAlerts()`.
- **Primary Actions:**
  - `triggerClusterReconcile()`: Triggers background reconciliation of project desired vs observed states.
  - `acknowledgeAlert(alertId)`: Marks operational alert as acknowledged with operator timestamp.
- **Refresh Policy:** Polling interval 15 seconds; instant refresh on focus.

### 2.2 `/console/tenants` & `/console/tenants/[id]` (Tenant Management)
- **Data Loaders:** `getTenantsList(query, status, page)`, `getTenantDetails(tenantId)`.
- **Primary Actions:**
  - `suspendTenantAction(tenantId, reason, mfaToken)`: Cryptographically suspends tenant runtime across all edge nodes.
  - `resumeTenantAction(tenantId, mfaToken)`: Re-activates tenant and verifies database bridge connectivity.
  - `updateTenantBrandingAction(tenantId, brandPayload)`: Updates tenant logo, theme, and custom accent tokens.
  - `verifyDomainAction(tenantId, domainId)`: Triggers real-time DNS TXT record challenge check.

### 2.3 `/console/provisioning` (Saga Execution & Retry)
- **Data Loaders:** `getProvisioningJobsList(filter, page)`, `getJobExecutionLogs(jobId)`.
- **Primary Actions:**
  - `retryProvisioningJobAction(jobId, idempotentKey)`: Re-queues failed step using `PlatformOperation` atomic lease lock.
  - `abortProvisioningJobAction(jobId, rollbackFlag)`: Aborts failed job and triggers cleanup of partially provisioned resources.

### 2.4 `/console/security` (API Keys & Credentials)
- **Data Loaders:** `getActiveApiKeys()`, `getOperatorAccounts()`.
- **Primary Actions:**
  - `rotateApiKeyAction(keyId, graceHours, mfaToken)`: Generates fresh Ed25519/HMAC credential pair with 24-hour transition overlap.
  - `revokeApiKeyAction(keyId, mfaToken)`: Immediately blacklists credential in Redis cache and DB.
  - `revokeOperatorSessionAction(sessionId)`: Terminates remote operator session immediately.
