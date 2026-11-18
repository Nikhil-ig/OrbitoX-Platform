# 🪐 OrbitoX Platform OS — Master Project Completion Program
# Document 04: Product Capability Matrix

**Repository:** `Nikhil-ig/OrbitoX-Platform`  
**Delivered HEAD:** `188680c27ce51ebb8ca6e998e504c51a24c34fa0`  
**Date:** November 18, 2026  
**Auditor / Role:** Principal Software Architect & Product Engineer

---

## 1. Capability Maturity Scale Definition

Every subsystem, package, and user-facing workflow in OrbitoX is strictly evaluated against this standardized six-tier classification system:

| Classification | Definition & Criteria |
| :--- | :--- |
| **Production-ready** | Complete, secure, fully tested, documented implementation; passes strict CI (unit, integration, WCAG 2.2 AA, visual regression) with zero known critical gaps. |
| **Pilot-ready** | Functionally complete with end-to-end workflows and security controls; suitable for closed, controlled beta or pilot deployments under defined operational parameters. |
| **Technical preview** | Subsystem has functional backend models, APIs, and preliminary UI; end-to-end integration or edge-case handling remains incomplete. Not ready for commercial use. |
| **In development** | Architecture and preliminary interfaces established; active development or partial implementation underway. |
| **Missing** | Required platform capability defined in architecture specifications but no functional implementation exists in the codebase. |
| **Blocked** | Implementation cannot proceed until an upstream dependency, architectural decision, or third-party requirement is resolved. |

---

## 2. Comprehensive Subsystem Capability Matrix

### 2.1 Core Platform & Control Plane

| Subsystem / Capability | Current Classification | Code & Test Evidence | Critical Gaps / Remaining Work |
| :--- | :--- | :--- | :--- |
| **Zero-Trust Multi-Tenancy** | **Production-ready** | `apps/platform/src/server/organizations/platform-tenant-scope.ts`, PostgreSQL RLS, 100% CI pass. | None. Robust tenant isolation across all persistent mutations. |
| **Cryptographic Security & Anti-Tamper** | **Production-ready** | `packages/core/src/security`, `CryptoSigner`, `SandboxGuard.freezeAllFacades`, Gitleaks scan passed. | None. Deeply frozen facades and signature validation. |
| **Database Resilience & Crash Safety** | **Production-ready** | `apps/platform/tests/chaos/test-platform-db-outage.ts`, kill -9 WAL durability harness passing. | None. Authoritative fallback to `light`/24 public appearance on DB failure. |
| **Operator Console Shell & UI** | **Pilot-ready** | Phase 7B.2 Persona Shell (`ResponsiveShell`, `ConsoleNavItems`), WCAG 2.2 AA 0 violations. | Consolidate dual `/admin` vs `/console` routes in Phase 7C. |
| **Organization & Tenant Management** | **Pilot-ready** | `apps/platform/src/server/organizations/organization-service.ts`, suspension/resumption APIs. | Add bulk tenant search and domain SSL status verification inspector in UI. |
| **Plan & Quota Entitlements** | **Pilot-ready** | `Plan`, `PlanFeature`, `PlanQuota`, downgrade preflight validation endpoint. | Connect preflight downgrade validator to customer billing change UI modal. |
| **Data Rights & Compliance (Phase 6G)** | **Production-ready** | `apps/platform/src/server/data-rights`, ZIP exports with SHA-256 manifest, deletion certs. | None. Fully verified under automated multi-tenant adversarial test suite. |

---

### 2.2 Theme Tokens & Design System

| Subsystem / Capability | Current Classification | Code & Test Evidence | Critical Gaps / Remaining Work |
| :--- | :--- | :--- | :--- |
| **Semantic Design Tokens** | **Production-ready** | `packages/ui/src/tokens/semantic.css`, `[data-accent]`, light/dark token matrices. | None. 8 authentic presets verified across themes. |
| **WCAG 2.2 AA Accessibility** | **Production-ready** | 372 Storybook checks with 0 Axe violations (`packages/ui/test/storybook-a11y-visual.mjs`). | None. Contrast ratios $\ge 4.5:1$ text and $\ge 3:1$ UI components strictly maintained. |
| **Cross-Platform Visual Regression** | **Production-ready** | Calibrated `MAX_DIFF_RATIO = 0.05` handling Linux/Darwin antialiasing; 0 visual diffs in CI #447. | None. Synchronized baselines for 93 stories across 2 viewports $\times$ 2 themes. |
| **Persona Shell Primitives** | **Production-ready** | `packages/ui/src/shells/ResponsiveShell.tsx`, `MoreNavSheet`, 44x44px touch targets. | None. Verified on CDP touch input and mobile portrait/landscape bands. |

---

### 2.3 Vertical SaaS Runtimes: RestaurantOS

| Subsystem / Capability | Current Classification | Code & Test Evidence | Critical Gaps / Remaining Work |
| :--- | :--- | :--- | :--- |
| **Multi-Tenant HTTP Runtime** | **Production-ready** | `services/restaurant-api/src/server.ts`, PostgreSQL RLS, independent DB. | None. Verified in CI `RestaurantOS HTTP Multi-Tenant & RLS Suite`. |
| **Bridge Authentication & Grants** | **Production-ready** | `services/restaurant-api/src/bridge`, HMAC-SHA256 signatures, `BridgeNonce` deduplication. | None. Zero replay attack vulnerability. |
| **QR Code & Guest Dining Sessions** | **Pilot-ready** | `services/restaurant-api/src/modules/diners`, table locator resolution, cart session. | Add multi-diner bill splitting and real-time WebSocket order tracking. |
| **Kitchen Display System (KDS)** | **Pilot-ready** | `services/restaurant-api/src/modules/kitchen`, station-specific task queues. | Add audio buzzer cues and station rerouting for rush hours. |
| **Menu & Floor Management** | **Pilot-ready** | `MenuCategory`, `MenuItem`, `Floor`, `TableFloor` CRUD APIs and views. | Drag-and-drop floor plan designer in Operations Studio. |
| **GST Invoicing & Taxes** | **Pilot-ready** | `services/restaurant-api/src/modules/invoicing`, GSTIN format validation, tax breakdowns. | Add PDF invoice download template generator. |
| **POS Hardware Integration** | **Technical preview** | `plugins/pos/src`, domain entities, MCP tools. | Physical ESC/POS thermal printer and cash drawer bridge are currently stubbed. |

---

### 2.4 Vertical SaaS Runtimes: HospitalOS (HMS)

| Subsystem / Capability | Current Classification | Code & Test Evidence | Critical Gaps / Remaining Work |
| :--- | :--- | :--- | :--- |
| **Clinical Database Models** | **Production-ready** | 14 Prisma models (`HmsPatient`, `HmsAdmission`, `HmsLabOrder`, `HmsWard`, `HmsBed`). | None. Robust data architecture. |
| **Protected Health Info (PHI) Encryption** | **Production-ready** | `apps/platform/src/server/hospital/phi-crypto.ts`, AES-256-GCM, HMAC blind indexing. | None. Encrypted at rest, blind indexing for patient search. |
| **Clinical Staff RBAC & Break-Glass** | **Pilot-ready** | `HmsStaff`, `HmsRolePermission`, `HmsBreakGlassGrant` with emergency access audit. | Add multi-approver workflow for scheduled break-glass reviews. |
| **HMS Frontend Screens** | **Technical preview** | `apps/platform/src/app/(hospital)/hms/*` pages. | Screens currently use mock data; must connect to authenticated server actions. |

---

### 2.5 Extensibility, Developer Tools & CLI

| Subsystem / Capability | Current Classification | Code & Test Evidence | Critical Gaps / Remaining Work |
| :--- | :--- | :--- | :--- |
| **Plugin Engine Kernel** | **Production-ready** | `packages/plugin-engine`, Ed25519 digital signature validation, dynamic module loader. | None. Anti-tamper verification active. |
| **Developer SDK** | **Pilot-ready** | `packages/sdk`, `@OrbitoPlugin` decorators, transport clients, tenant context. | Publish full API reference documentation and sample plugin tutorial. |
| **External Runtime SDK** | **Pilot-ready** | `packages/external-runtime-sdk`, bridge client, contract interfaces. | Add gRPC / HTTP/2 transport option for low-latency external runtimes. |
| **Scaffolding CLI** | **Pilot-ready** | `tools/cli/src/bin.ts`, template generators, tenant wizard. | Add automated local Docker environment launcher (`orbitox dev`). |

---

### 2.6 Commercial, Billing & Subscriptions

| Subsystem / Capability | Current Classification | Code & Test Evidence | Critical Gaps / Remaining Work |
| :--- | :--- | :--- | :--- |
| **Plan & Quota Modeling** | **Production-ready** | `Plan`, `PlanQuota`, `BillingPlanMap`, tiered pricing structures. | None. Tiered models verified. |
| **Razorpay Checkout & Webhooks** | **Pilot-ready** | `apps/platform/src/server/billing/razorpay-billing.ts`, HMAC signature verification. | Production live mode credentials and multi-currency gateway support. |
| **Grace Period & Suspension Sweeper**| **Pilot-ready** | `apps/platform/src/workers/billing-grace-sweep.ts`, distributed lease locking. | Add automated multi-channel customer dunning emails prior to suspension. |

---

### 2.7 AI, MCP & Copilot

| Subsystem / Capability | Current Classification | Code & Test Evidence | Critical Gaps / Remaining Work |
| :--- | :--- | :--- | :--- |
| **Model Context Protocol (MCP) Tools**| **Technical preview** | `plugins/pos/src/mcp`, tool definitions. | Formalize platform-level MCP server for authorized operator diagnostics. |
| **AI Assistant Security Boundaries**| **In development** | Architecture specification in `docs/architecture/07_AI_GATEWAY.md`. | Enforce strict human approval gates for all destructive AI tool executions. |
