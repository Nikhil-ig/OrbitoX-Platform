# 🪐 OrbitoX Platform OS — Master Project Completion Program
# Document 03: API & Database Inventory

**Repository:** `Nikhil-ig/OrbitoX-Platform`  
**Delivered HEAD:** `188680c27ce51ebb8ca6e998e504c51a24c34fa0`  
**Date:** November 18, 2026  
**Auditor / Role:** Principal Software Architect & Database Engineer

---

## 1. Database Architecture & Schema Inventory

OrbitoX utilizes a multi-database architecture with two distinct PostgreSQL schemas and independent migration lineages.

### 1.1 Control Plane Schema (`apps/platform/prisma/schema.prisma`)
- **Database Name:** `orbitox_phase2` (Production) / `orbitox_smoke` (CI)
- **Total Models:** 83 models
- **Migration Count:** 44 linear migrations from `20261027000000_orbitox_phase2_full_baseline` to `20261117140000_orbitox_outbox_concurrency_and_retry_hardening`
- **PostgreSQL Runtime Roles Configured:**
  - `orbitox_runtime`: Day-to-day application queries with RLS enforcement.
  - `orbitox_platform_admin_audit`: Dedicated append-only role for audit events.
  - `hms_audit_reader`: Read-only role for clinical audit inspection.
  - `orbitox_maintenance`: Schema migration and partition maintenance role.
  - `orbitox_outbox_relay`: Isolated outbox polling role.

#### Model Domain Catalog

| Domain / Functional Area | Key Prisma Models | Purpose / Characteristics |
| :--- | :--- | :--- |
| **Organizations & Tenancy** | `PlatformOrganization`, `CustomerOrganizationClosureContext`, `CustomerUser`, `CustomerMembership`, `AccountToken`, `CustomerSession` | Core multi-tenant business accounts, membership RBAC (`OWNER`, `ADMIN`, `MEMBER`), session revocation. |
| **Operator Identity & Auth** | `PlatformOperator`, `PlatformOperatorSession`, `PlatformOperatorBackupCode`, `AccountAuthRateLimitBucket` | High-privilege platform console operators, TOTP MFA secrets, emergency recovery backup codes. |
| **Email & Communication** | `AccountEmailOutbox`, `AccountEmailSuppression`, `AccountEmailWebhookEvent` | Resend/SES transactional outbox queue, bounce/complaint suppression list, delivery webhooks. |
| **Projects & Environments** | `PlatformProject`, `ProjectEnvironment`, `ProjectDomain`, `EnvironmentQuotaPolicy`, `EnvironmentRateLimitPolicy` | Business software projects (RestaurantOS, HospitalOS), environment staging, custom domains. |
| **Credentials & Security** | `PlatformApiKey`, `PlatformCredential`, `BridgeNonce`, `PlatformAuditEvent`, `PlatformRateLimitBucket` | Scoped API tokens, encrypted vault credentials, bridge replay attack nonces, immutable audit logs. |
| **Packages & Plugins** | `PlatformPackage`, `PackageVersion`, `PackageInstallation`, `Plugin`, `PluginInstallation`, `PluginGrantRevision`, `PlatformPluginUsage` | Software package catalogue, version compatibility, signed plugin grants, usage tracking. |
| **Plans & Billing** | `Plan`, `PlanFeature`, `PlanQuota`, `BillingSubscription`, `BillingPlanMap`, `BillingProviderCache`, `BillingWebhookEvent`, `BillingGraceSweepLease` | Tiered plan catalogue, quota definitions, Razorpay subscription state machine, grace period leases. |
| **Data Rights (Phase 6G)** | `DataRightsJob`, `DataExportDownloadToken`, `OrganizationDeletionRequest`, `DataRightsSweepLease` | GDPR/DPDP Article 17/20 data exports (ZIP with SHA-256 manifest), cryptographic deletion certificates. |
| **Operations Engine** | `PlatformOperation`, `PlatformIdempotencyRecord`, `PlatformOutboxMessage`, `PlatformImporterLease` | Long-running asynchronous provisioning sagas, idempotent execution guards, outbox workers. |
| **HospitalOS (HMS Subsystem)** | `HmsDepartment`, `HmsWard`, `HmsBed`, `HmsStaff`, `HmsRole`, `HmsRolePermission`, `HmsPatient`, `HmsAdmission`, `HmsAppointment`, `HmsLabOrder`, `HmsInvoice`, `HmsPayment`, `HmsPhiAccessLog`, `HmsBreakGlassGrant` | Complete clinical and hospital operations model with AES-256-GCM PHI encryption and break-glass grants. |
| **Control Plane Restaurant** | `RestaurantLocation`, `RestaurantTable`, `RestaurantMenu`, `RestaurantOrder`, `KitchenStation`, `RestaurantPaymentRecord` | Control-plane metadata mirrors and centralized restaurant reporting views. |

---

### 1.2 Runtime Plane Schema (`services/restaurant-api/prisma/schema.prisma`)
- **Database Name:** `restaurant_os`
- **Total Models:** 24 models
- **Migration Count:** 7 linear migrations
- **Tenant Isolation:** Enforced via PostgreSQL Row-Level Security (`current_setting('app.current_tenant_id', true)`).

#### Model Domain Catalog

| Domain / Functional Area | Key Prisma Models | Purpose / Characteristics |
| :--- | :--- | :--- |
| **Tenancy & Branding** | `Tenant`, `Branch`, `TenantBrandConfig`, `TenantDomain`, `TenantPaymentConfig` | Multi-tenant restaurant entity, physical branch locations, custom brand colors/logos, Razorpay keys. |
| **Floor & Seating** | `Floor`, `TableFloor`, `DiningSession`, `Guest` | Floor plan diagrams, tables, live diner sessions, QR code guest sessions. |
| **Menu & Catalog** | `MenuCategory`, `MenuItem`, `BranchMenuOverride` | Dishes, categories, dietary tags, prices, branch-specific availability overrides. |
| **Orders & Kitchen** | `RestaurantOrder`, `KitchenTask`, `ServiceRequest` | Real-time guest and waiter orders, kitchen preparation queue (KDS), table call buttons. |
| **Staff & Security** | `StaffMember`, `StaffTokenRevocation`, `OwnerInvite`, `SupportTicket` | Kitchen staff, waiters, managers, PIN authentication, JWT revocation blacklists. |
| **Payments & Invoicing** | `Invoice`, `RazorpayPaymentSession`, `DomainEvent`, `IdempotencyRecord` | GST-compliant tax invoices, payment gateway sessions, webhook idempotency keys. |
| **Bridge & Governance** | `BridgeNonce`, `PluginGrantRevision` | Control Plane HMAC bridge nonces, license verification records. |

---

## 2. API Route & Service Endpoint Inventory

OrbitoX provides two primary HTTP API surfaces: the Control Plane API (`apps/platform/src/app/api`) and the RestaurantOS Runtime API (`services/restaurant-api/src/http`).

### 2.1 Control Plane API Catalog (`apps/platform`)

```text
/api/health
  ├── GET /api/health                                [Public] System health, DB connectivity, and version check

/api/v1/platform (Operator Console APIs)
  ├── GET /api/v1/platform/overview/summary          [Operator] Real-time platform summary metrics
  ├── GET /api/v1/platform/overview/telemetry        [Operator] System load, resource usage, active sessions
  ├── GET /api/v1/platform/overview/alerts           [Operator] Active infrastructure and security alerts
  ├── POST /api/v1/platform/reconcile                [Operator] Reconcile desired vs observed cluster state
  ├── GET /api/v1/platform/search                    [Operator] Global cross-tenant search
  ├── GET, POST /api/v1/platform/tenants             [Operator] List and create platform tenants
  ├── GET, PUT /api/v1/platform/tenants/:id          [Operator] Inspect and update tenant metadata
  ├── POST /api/v1/platform/tenants/:id/suspend      [Operator] Cryptographically suspend tenant runtime
  ├── POST /api/v1/platform/tenants/:id/resume       [Operator] Resume suspended tenant runtime
  ├── GET, POST /api/v1/platform/plans               [Operator] Manage pricing and feature plans
  ├── GET /api/v1/platform/plans/:planId             [Operator] Inspect plan entitlements and quotas
  ├── POST /api/v1/platform/plan/preflight-downgrade [Operator] Validate resource limits before downgrade
  ├── GET, POST /api/v1/platform/packages            [Operator] Package registry management
  ├── GET, POST /api/v1/platform/plugins             [Operator] Plugin discovery, licensing, and installation
  ├── GET, POST /api/v1/platform/security-keys       [Operator] Master API credentials and key rotation
  ├── POST /api/v1/platform/security-keys/:id/rotate [Operator] Rotate API keys with grace overlap
  └── GET, POST /api/v1/platform/operations          [Operator] Asynchronous provisioning saga tracking

/api/v1/account & auth (Customer Identity APIs)
  ├── POST /api/v1/account/register                  [Public] Customer organization & user signup
  ├── POST /api/v1/account/login                     [Public] Password authentication with rate-limiting
  ├── POST /api/v1/account/mfa/verify                [Public] Verify TOTP MFA challenge
  ├── POST /api/v1/account/logout                    [Authenticated] Invalidate session token
  ├── GET /api/v1/account/session                    [Authenticated] Current user, permissions, and active org
  ├── POST /api/v1/account/switch-organization       [Authenticated] Change active tenant context
  └── GET, PUT /api/v1/account/appearance            [Authenticated] Persist user theme, mode, and accent color

/api/v1/billing (Subscription & Commercial APIs)
  ├── GET /api/v1/billing/plans                      [Authenticated] Available subscription plans
  ├── POST /api/v1/billing/checkout/session          [Authenticated] Initiate Razorpay subscription checkout
  ├── POST /api/v1/billing/webhook/razorpay          [Public / Signed] Webhook listener for payment events
  └── GET /api/v1/billing/invoices                   [Authenticated] List customer invoices and payment history

/api/v1/data-rights (GDPR / DPDP Compliance APIs)
  ├── POST /api/v1/data-rights/export                [Owner] Request complete tenant data export
  ├── GET /api/v1/data-rights/export/:token/download [Token] Stream encrypted ZIP data archive
  └── POST /api/v1/data-rights/delete                [Owner / Multi-MFA] Request organization data erasure

/api/v1/projects (Project & Runtime Orchestration)
  ├── GET, POST /api/v1/projects                     [Authenticated] List and create business projects
  ├── GET, PUT /api/v1/projects/:id                  [Authenticated] Inspect project configuration
  ├── POST /api/v1/projects/factory                  [Authenticated] Scaffold new project from template
  ├── GET /api/v1/projects/:id/health                [Authenticated] Query runtime health and latency
  └── GET /api/v1/projects/:id/usage                 [Authenticated] Query metered quota usage
```

---

### 2.2 RestaurantOS Runtime API Catalog (`services/restaurant-api`)

```text
/api/v1/bridge (Control Plane Integration)
  ├── POST /api/v1/bridge/provision                  [Signed HMAC] Provision new tenant schema & credentials
  ├── POST /api/v1/bridge/suspend                    [Signed HMAC] Set tenant status to SUSPENDED
  ├── POST /api/v1/bridge/resume                     [Signed HMAC] Re-enable tenant operations
  └── POST /api/v1/bridge/grant                      [Signed HMAC] Update plan features and entitlements

/api/v1/diners (Public Guest & QR Dining APIs)
  ├── GET /api/v1/diners/menu                        [Public] Fetch active menu for branch/table
  ├── POST /api/v1/diners/session/join               [Public] Join table dining session via QR code
  ├── POST /api/v1/diners/orders                     [Guest] Place new order for table
  ├── GET /api/v1/diners/orders/:orderId             [Guest] Track order status and preparation time
  └── POST /api/v1/diners/call-waiter                [Guest] Emit service request to floor staff

/api/v1/kitchen (Kitchen Display System APIs)
  ├── GET /api/v1/kitchen/tasks                      [Staff] Live preparation queue by station
  ├── POST /api/v1/kitchen/tasks/:id/start           [Staff] Transition task to IN_PREPARATION
  ├── POST /api/v1/kitchen/tasks/:id/complete        [Staff] Transition task to READY_FOR_PICKUP
  └── GET /api/v1/kitchen/stations                   [Staff] List configured kitchen prep stations

/api/v1/tables & floors (Floor Management APIs)
  ├── GET, POST /api/v1/floors                       [Staff] List and configure dining floors
  ├── GET, POST /api/v1/tables                       [Staff] List tables, active sessions, and statuses
  └── POST /api/v1/tables/:id/clear                  [Staff] Reset table to VACANT after payment

/api/v1/payments & invoicing (Checkout APIs)
  ├── POST /api/v1/payments/create-session           [Guest/Staff] Create Razorpay checkout order
  ├── POST /api/v1/payments/webhook                  [Signed Webhook] Reconcile order payment
  └── GET /api/v1/invoices/:id/pdf                   [Guest/Staff] Generate GST-compliant invoice
```

---

## 3. Disconnected & Incomplete API Analysis

1. **Dual Route Paths in Control Center:**
   - `/admin/projects` (legacy) vs `/platform/projects` vs `/console/tenants`.
   - **Resolution in Phase 7C:** Consolidate all operational views under the unified `/console/*` persona shell path.
2. **Missing UI Wiring for Advanced APIs:**
   - Preflight downgrade endpoint (`/api/v1/platform/plan/preflight-downgrade`) has 100% test coverage but is not invoked in the frontend before plan downgrades.
   - Resource drift inspection (`/api/v1/platform/resources/:id/drift`) has backend support but lacks a diff viewer in the UI.
3. **HospitalOS Route Coverage:**
   - Endpoints in `/api/hospital/*` are functionally complete with cryptographic PHI handling, but have no live connection to the modern Phase 7B.2 shell architecture.
