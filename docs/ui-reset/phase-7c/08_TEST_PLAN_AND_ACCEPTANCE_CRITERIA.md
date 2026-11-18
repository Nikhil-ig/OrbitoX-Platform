# 🪐 OrbitoX Platform OS — Phase 7C Stage 0
# Document 08: Test Plan & Acceptance Criteria

**Milestone:** Phase 7C Operations Console & System Screens  
**Governing Baseline:** Phase 7B.2 Delivered HEAD `188680c27ce51ebb8ca6e998e504c51a24c34fa0`  
**Specification Branch:** `docs/phase-7c-stage0-specification`  
**Date:** November 18, 2026 (Authoritative Reconciliation Revision)  
**Auditor / Role:** Principal QA Lead & Staff Architect

---

## 1. Multi-Tiered Verification Test Plan

Phase 7C implementation will be verified through five automated test tiers prior to requesting final acceptance:

```mermaid
graph TD
    subgraph Tier1 ["Tier 1: Unit & Schema Contracts"]
        ZOD["Zod Schema Contracts (Input bounds, regex, UUIDs, enums)"]
        AUTH_UNIT["Canonical RBAC Unit Tests (operatorRoleAllows, PlatformOperatorRole)"]
        REDACT_UNIT["Audit Redaction Unit Tests (Recursive sanitizeAuditPayload across boundaries)"]
    end

    subgraph Tier2 ["Tier 2: Server Actions & Security Enforcement"]
        ACTION_AUTH["Server Action Guards (suspendTenant, rotateApiKey, reconcileCluster)"]
        IDLE_EXP["Server-Side Inactivity Timeout (idleExpiresAt & revokedAt setting)"]
        TOTP_REPLAY["TOTP Replay Defense (getTotpStep & consume_platform_operator_totp_step)"]
        STEPUP_MFA["Step-Up MFA Session Elevation (reauthenticatedAt 5-min gate)"]
    end

    subgraph Tier3 ["Tier 3: Database & State Cascade Integrity"]
        TENANT_CASCADE["Tenant Suspension Cascade (Runtime Bridge call + status update)"]
        KEY_ROTATION["API Key Rotation (Grace period overlap & dual-key active state)"]
        AUDIT_IMMUTABLE["Immutable Audit Trail (PlatformAuditEvent append-only persistence)"]
    end

    subgraph Tier4 ["Tier 4: Playwright Browser E2E Tests"]
        ROUTE_NAV["Console 12-Route Primary Navigation & Route Consolidation (308 Redirects)"]
        DRAWER_E2E["DetailDrawer Deep-Linking & History State (Push/Replace, Esc close)"]
        TABLE_E2E["OperationalDataTable (Virtualization, Server Sort/Filter, URL sync)"]
        STEPUP_E2E["Step-Up MFA Modal Dialog Flow (Valid vs Invalid TOTP code)"]
    end

    subgraph Tier5 ["Tier 5: Responsive, Accessibility & Visual Regression"]
        RESPONSIVE_4B["4-Band Responsive Viewports (< 640px, 640–1023px, 1024–1279px, ≥ 1280px)"]
        TOUCH_TARGETS["Touch Target Verification (44x44px minimum bounding box on mobile)"]
        AXE_WCAG["Axe-core WCAG 2.2 AA Automated Scan (0 violations required)"]
        PIXELMATCH["Visual Snapshot Regression (Desktop & Mobile, Dark/Light tokens ≤ 5% diff)"]
    end

    Tier1 --> Tier2 --> Tier3 --> Tier4 --> Tier5
```

---

## 2. Detailed Test Specifications

### 2.1 Server Action & Security Tests (`tests/unit/console-actions.test.ts`)

These tests execute against the server actions and authorization middleware powering `/console/*`:

- **TST-7C-01 (Authentication Enforcement):**  
  Calling any mutating server action (`suspendTenantAction`, `resumeTenantAction`, `rotateApiKeyAction`, `reconcileClusterAction`) without an active session cookie returns `{ success: false, error: "UNAUTHORIZED", status: 401 }`.
- **TST-7C-02 (Canonical RBAC Enforcement):**  
  Calling `suspendTenantAction` or `rotateApiKeyAction` with a session assigned `OPERATOR`, `BILLING`, or `SUPPORT_READONLY` returns `{ success: false, error: "FORBIDDEN", status: 403 }`. Only `PLATFORM_OWNER` possesses authority for destructive operations.
- **TST-7C-03 (Server-Side Inactivity Timeout & Session Invalidation):**  
  When `PlatformOperatorSession.idleExpiresAt` is older than the current timestamp ($t > t_{\text{idleExpiresAt}}$), `getOperatorSession()` returns `null`. Any subsequent request fails closed with HTTP 401 Unauthorized. In Stage 1 implementation, the test verifies that:
  1. `PlatformOperatorSession.revokedAt` is actively updated to `now` in PostgreSQL via `tx.platformOperatorSession.updateMany` (using the existing `revokedAt` model, requiring zero schema migrations).
  2. The response headers include `Set-Cookie` directives clearing `orbitox_op_session` and `orbitox_op_csrf` (`Max-Age=0`).
- **TST-7C-04 (Grounded TOTP Atomic Step Consumption & Replay Prevention):**  
  Submitting a valid 6-digit TOTP code for step-up verification calculates candidate step $S = \lfloor \text{Date.now()} / 30000 \rfloor$ via `getTotpStep()` and invokes `SELECT public.consume_platform_operator_totp_step(operatorId, S, now)`.  
  Submitting the identical code or any code within the same 30-second window receives `consumed = false` from the PostgreSQL function and fails with `{ success: false, error: "TOTP_ALREADY_USED", message: "TOTP code has already been consumed" }`.
- **TST-7C-05 (Step-Up MFA 5-Minute Freshness Window):**  
  Executing destructive operations (`tenant:suspend`, `security-keys:rotate`, `data-rights:delete`) verifies that `Date.now() - session.reauthenticatedAt.getTime() <= 5 * 60 * 1000` (300 seconds). If older or null, the action rejects with `{ success: false, error: "REAUTH_REQUIRED" }`.
- **TST-7C-06 (Dual-Boundary Recursive Audit Log Redaction):**  
  Verifies that `sanitizeAuditPayload()` scrubbers execute at both boundaries:
  - **Boundary 1 (Event Writing):** Mutating server actions verify that sensitive keys (`password`, `token`, `secret`, `mfaTotpSealed`, `mfaToken`, `backupCode`, `credential`, `apiKey`, `pepper`, `privateKey`, `authorization`, `cookie`) and nested objects (e.g., `{ config: { auth: { clientSecret: "xyz" } } }`) are replaced with `"[REDACTED]"` prior to persisting into `PlatformAuditEvent`.
  - **Boundary 2 (Event Reading/Export):** `AuditConsoleService.queryAuditLogs()` and `GET /api/v1/platform/audit-logs/export` ensure all returned `metadata` objects are sanitized before reaching the browser or export streams.
- **TST-7C-07 (Reconcile Cluster Action HTTP Semantics):**  
  `reconcileClusterAction` executes strictly as a `POST` mutation against `/api/v1/platform/reconcile`, triggering idempotent state convergence via `reconciliation.reconcileAll()` and writing an audit event.

### 2.2 End-to-End Browser Playwright Tests (`tests/e2e/console-e2e.spec.ts`)

- **TST-7C-08 (Operator Login & Route Protection):**  
  Operator logs in at `/console/login` with credentials and TOTP MFA code; successfully redirects to `/console/overview`. Unauthenticated requests to any `/console/*` route redirect cleanly to `/console/login` with preserved `returnUrl`.
- **TST-7C-09 (Full Authoritative Navigation Census — 12 Primary Console Routes):**  
  Navigating through all 12 canonical primary navigation routes from Document 03 renders with HTTP 200, valid persona shell layout, and 0 uncaught client console errors:
  1. `/console/overview` (Command center & telemetry)
  2. `/console/organizations` (Legal entities & billing accounts)
  3. `/console/tenants` (Runtime workspaces & software fleet)
  4. `/console/projects` (Software projects & environments)
  5. `/console/provisioning` (Sagas, operations & fleet connections)
  6. `/console/packages` (Packages & plugin registry)
  7. `/console/billing` (Plans, subscriptions & invoices)
  8. `/console/approvals` (Operator approvals inbox)
  9. `/console/security` (API keys, vault & operator security)
  10. `/console/audit` (Append-only audit trail)
  11. `/console/data-rights` (GDPR/DPDP compliance & erasure)
  12. `/console/settings/appearance` (Theme, mode & accent settings)
- **TST-7C-10 (Legacy Route 308 Permanent Redirects & Conflict-Free Mapping):**  
  Navigating to legacy admin paths issues HTTP 308 permanent redirects to their single authoritative `/console/*` targets while preserving URL query parameters:
  - `/admin`, `/platform`, `/console` $\to$ `/console/overview`
  - `/platform/fleet`, `/platform/operations` $\to$ `/console/provisioning` *(Unambiguous single target)*
  - `/admin/api-keys`, `/platform/credentials`, `/platform/security` $\to$ `/console/security`
  - `/admin/quotas`, `/platform/plans` $\to$ `/console/billing`
  - `/admin/restaurant`, `/platform/restaurants`, `/platform/tenants` $\to$ `/console/tenants`
- **TST-7C-11 (OperationalDataTable URL Synchronization & Virtualization):**  
  Filtering, sorting, and pagination updates the browser URL query string (`?page=2&sort=createdAt:desc&status=ACTIVE`). Refreshing the browser restores the exact grid state. Rapid scrolling through 10,000 mock tenant records maintains 60fps virtualization with bounded DOM nodes.
- **TST-7C-12 (DetailDrawer Deep-Linking & History State):**  
  Clicking a tenant row opens `DetailDrawer` and appends `?drawer=tenant&id=<tenantId>` via `window.history.pushState`. Switching tabs within the drawer updates `&tab=projects`. Pressing `Escape` or the browser Back button cleanly closes the drawer and restores the parent URL.
- **TST-7C-13 (Step-Up Confirmation Dialog Flow):**  
  Triggering "Suspend Tenant" opens `StepUpConfirmationDialog`. Entering an invalid TOTP shows an inline error message and disables submit. Entering a valid 6-digit TOTP executes the action, closes the dialog, shows a success toast, and updates the tenant status badge optimistically with rollback on failure.
- **TST-7C-14 (Keyboard Navigation & Hotkeys):**  
  Pressing `Cmd+K` / `Ctrl+K` opens the global omnibox search palette. Pressing `/` focuses table search filter. Pressing `Escape` closes all active modals, drawers, and popovers.

### 2.3 Responsive, Accessibility & Visual Regression Tests (`tests/e2e/console-a11y.spec.ts`)

- **TST-7C-15 (4-Band Responsive Viewport Adaptation — `UI-7B2-BP1`):**  
  Console layouts are verified across all four Phase 7B.2 approved viewport bands:
  - **Phone (< 640px):** Single-column layout, bottom navigation bar, card-list view for data tables, full-screen overlay for `DetailDrawer`.
  - **Tablet Portrait (640–1023px):** Compact sidebar, responsive summary metric grid (2-column), drawer slide-over width 480px.
  - **Tablet Landscape (1024–1279px):** Standard sidebar, full table view, side drawer slide-over width 560px.
  - **Desktop (≥ 1280px):** Expanded sidebar with label text, multi-column metric grid (4-column), side drawer slide-over width 640px.
- **TST-7C-16 (Touch Target Minimum Bounding Box — WCAG 2.2 SC 2.5.8):**  
  Automated Playwright layout evaluation verifies that every interactive element (buttons, pagination triggers, tab items, dropdown toggles, drawer close triggers) on viewport widths $< 640$px has a rendered bounding box of at least $44 \times 44$px or equivalent touch target spacing.
- **TST-7C-17 (Axe-core WCAG 2.2 AA Automated Scan):**  
  Running `@axe-core/playwright` across all console views reports **0 violations** against WCAG 2.2 AA rules (`color-contrast`, `target-size`, `aria-roles`, `focus-order`, `landmark-one-main`). Contrast ratios satisfy $\ge 4.5:1$ for normal text and $\ge 3:1$ for UI controls across dark and light operator themes.
- **TST-7C-18 (Visual Regression Diff Ratio Threshold):**  
  Visual snapshots captured at 1280px and 375px viewports against approved baseline snapshots maintain a pixel diff ratio $\le 0.05$ (5%), accommodating cross-platform Linux FreeType antialiasing while preventing structural visual regressions.

---

## 3. Implementation Stages & Approval Gate

Execution of Phase 7C follows a strict three-stage progression:

```mermaid
flowchart LR
    STAGE0["Stage 0: Design & Architectural Specification\n(docs/ui-reset/phase-7c/*)\n[STATUS: COMPLETED - PENDING OWNER APPROVAL]"] --> GATE{{"Explicit Owner\nApproval Gate"}}
    GATE -->|Approved| STAGE1["Stage 1: Operational Foundations\n- Consolidate /console/* routes & 308 redirects\n- Build DataTable, FilterToolbar, DetailDrawer\n- Canonical RBAC & server action guards"]
    STAGE1 --> STAGE2["Stage 2: Operational Screens & Wiring\n- Connect live backend services (Zero mock data)\n- Wire Step-Up MFA modals & TOTP replay check\n- Run Playwright E2E & Axe audits"]
    STAGE2 --> STAGE3["Stage 3: Verification & Sign-Off\n- 100% Green GitHub Actions CI (14/14 jobs)\n- Independent Review & Tagging"]
```

> [!IMPORTANT]
> **Stage 0 Approval Gate Rule:**  
> Implementation coding for Stage 1 will **NOT** begin until the platform owner reviews and provides explicit authorization on this Stage 0 design specification.

---

## 4. Phase 7C Acceptance Criteria Checklist

| Item | Requirement | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| **1. Route Consolidation** | All 52 legacy routes mapped to canonical `/console/*` routes; conflict-free 308 permanent redirect map. | Route curl & Playwright inspection | Pending Stage 1 |
| **2. Zero Mocked Data** | Every metric, table, and inspector queries real backend services. Real telemetry charts consume actual time-series. | Code audit & API network inspection | Pending Stage 2 |
| **3. Canonical RBAC** | Production `PlatformOperatorRole` enforced. Sensitive mutations restricted to `PLATFORM_OWNER`. | Unit & Action test execution | Pending Stage 1 |
| **4. Server-Side Inactivity Timeout** | Inactivity window verified server-side. Active `revokedAt = now` and cookie clearing verified. | Automated session expiration test | Pending Stage 1 |
| **5. Grounded TOTP Replay Defense** | Atomic step consumption via `consume_platform_operator_totp_step`. 5-minute step-up freshness enforced. | Automated MFA security test | Pending Stage 2 |
| **6. Dual-Boundary Audit Redaction** | Mutating actions and read/export services recursively redact sensitive keys and nested secrets. | Automated audit payload test | Pending Stage 1 |
| **7. Responsive Layout (`UI-7B2-BP1`)** | 4-band responsive viewport adaptation verified on real browser bands. | CDP Playwright audit | Pending Stage 2 |
| **8. WCAG 2.2 AA** | 0 Axe violations; contrast $\ge 4.5:1$ text and $\ge 3:1$ UI controls maintained. | Playwright Axe audit | Pending Stage 2 |
| **9. Touch Targets** | Minimum $44 \times 44$px touch targets on mobile interactive controls. | Automated CSS layout test | Pending Stage 2 |
| **10. Clean CI Run** | All 14 GitHub Actions CI jobs complete with conclusion: `success`. | GitHub Actions log | Pending Stage 3 |
| **11. Invariant Preservation**| `page.tsx` untouched; zero UI imports from platform; linear Git ancestry. | Git audit check | Pending Stage 3 |
