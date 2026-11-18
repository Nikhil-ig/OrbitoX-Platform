# 🪐 OrbitoX Platform OS — Phase 7C Stage 0
# Document 02: Existing Screen & Reference Inventory

**Milestone:** Phase 7C Operations Console & System Screens  
**Governing Baseline:** Phase 7B.2 Delivered HEAD `188680c27ce51ebb8ca6e998e504c51a24c34fa0`  
**Date:** November 18, 2026  
**Auditor / Role:** Principal Software Architect & Senior Staff Designer

---

## 1. Visual Reference Artwork Census

The Phase 7C design directly translates the approved visual benchmarks located in `OrbitoX — new look concept-png/`:

| Concept Asset Name | Core Visual Elements & UI Patterns | Implementation Target in Phase 7C |
| :--- | :--- | :--- |
| `1 · Operator console — dark.png` | Dark background (`#0A0F1D`), crisp high-contrast cards, top stats row (Organizations, Active Tenants, Provisioning Sagas, System Load), search bar, and primary navigation sidebar. | **Master Console Layout (`/console`)** |
| `Operator console · phone.png` | Compact mobile portrait view with sticky header, collapsible KPI summary cards, quick action pills, and bottom navigation bar. | **Mobile Phone Breakpoint (`< 768px`)** |
| `Shared console sidebar.png` | Grouped navigation items: Overview, Fleet (Tenants, Projects), Extensibility (Packages, Plugins), Ops (Provisioning, Logs), Security (Keys, Operators, Audit), Commercial (Billing, Plans). | **`ConsoleNavItems` Hierarchy** |
| `Organization detail.png` | Header with organization status badge, quick actions (Suspend, Edit, Export), tenant tabs (Overview, Projects, Branches, Domains, Audit, Billing). | **`/console/tenants/[id]` Inspector** |
| `Tenant detail · suspend with re-auth.png` | Red-accented destructive confirmation modal with reason selector, impacted project list, and TOTP MFA verification code input. | **Tenant Suspension Step-Up Modal** |
| `Provisioning job · retry.png` | Step-by-step saga execution pipeline with timestamps, error log drawer, and safe idempotent retry button. | **`/console/provisioning` Saga Inspector** |
| `API keys · rotate.png` | Active API credential table with permissions scope tags, expiry timer, and one-click key rotation modal showing 24h grace overlap. | **`/console/security` Key Rotation Drawer** |
| `Billing & payments.png` | Current plan summary, MRR graph, active subscriptions table, failed payment alerts, and manual invoice adjustment drawer. | **`/console/billing` Operational View** |
| `Data rights requests.png` | Data Rights job queue, export ZIP readiness indicator, and signed cryptographic deletion certificate viewer. | **`/console/data-rights` Compliance View** |
| `Pop-ups, warnings & utilities@2x.png` | Standardized dialog styles: Alert dialogs, destructive confirmations, toast notifications, and drawer slide-overs. | **Global Operational Dialogs** |

---

## 2. Existing Route Census & Gap Analysis

A forensic audit of existing screens under `apps/platform/src/app/(console)` revealed three disparate route implementations that will be consolidated in Phase 7C:

### 2.1 Route Census Table

| Existing Route | Purpose in Codebase | Maturity Status | Consolidation Action in Phase 7C |
| :--- | :--- | :--- | :--- |
| `(console)/admin/page.tsx` | Legacy admin overview dashboard | Prototype (Mock data) | **Deprecate $\to$ Redirect to `/console/overview`** |
| `(console)/admin/api-keys/page.tsx` | Basic API key generation | Technical preview | **Consolidate into `/console/security`** |
| `(console)/admin/audit/page.tsx` | Prototype audit log table | Incomplete filters | **Consolidate into `/console/audit`** |
| `(console)/admin/business/page.tsx` | Category/provider catalog | Technical preview | **Consolidate into `/console/packages`** |
| `(console)/admin/projects/page.tsx` | Project listing | Partial CRUD | **Consolidate into `/console/projects`** |
| `(console)/admin/quotas/page.tsx` | Quota management | Mock UI | **Consolidate into `/console/billing`** |
| `(console)/admin/services/page.tsx` | Service catalog | Partial CRUD | **Consolidate into `/console/packages`** |
| `(console)/admin/system/page.tsx` | System status cards | Semi-static | **Consolidate into `/console/overview`** |
| `(console)/console/overview/page.tsx` | Modern overview screen | Pilot-ready | **Retain as primary `/console/overview`** |
| `(console)/console/tenants/page.tsx` | Tenant management table | Pilot-ready | **Retain as primary `/console/tenants`** |
| `(console)/console/tenants/[id]/page.tsx` | Tenant detail inspector | Pilot-ready | **Enhance with full multi-tab inspection** |
| `(console)/console/billing/page.tsx` | Operator billing management | Pilot-ready | **Connect to live Razorpay & plan models** |
| `(console)/console/provisioning/page.tsx` | Provisioning job monitor | Pilot-ready | **Enhance with saga retry actions** |
| `(console)/console/security/page.tsx` | Operator security & MFA | Pilot-ready | **Enhance with key rotation drawers** |
| `(console)/console/audit/page.tsx` | Append-only audit search | Pilot-ready | **Add live filter bar & diff viewer** |
| `(console)/console/data-rights/page.tsx` | Data rights compliance | Production-ready | **Retain with certificate viewer** |

---

## 3. Disconnected & Mocked Data Elimination Plan

In compliance with Non-Negotiable Governance Rule 3.4 (*Actual functionality only*), Phase 7C eliminates all remaining mocked responses in the console:

1. **Fleet Health & Resource Metrics:**  
   Replace hardcoded CPU/RAM/Network mock cards with `GET /api/v1/platform/overview/telemetry` which queries real node memory, event loop latency, and PostgreSQL pool health (`platform-database-readiness.ts`).
2. **Cluster Reconciliation:**  
   Replace static state cards with `POST /api/v1/platform/reconcile`, triggering real desired-vs-observed state checks across active tenant projects.
3. **Tenant Quotas & Limits:**  
   Replace client-side mock quotas with `GET /api/v1/platform/projects/:id/effective-plan`, computing live active seats, dish counts, and monthly transaction volumes against plan limits.
