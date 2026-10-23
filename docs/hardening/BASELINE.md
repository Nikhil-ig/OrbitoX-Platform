# OrbitoX Platform Hardening — Baseline Report

**Execution Timestamp:** 2026-10-23T13:38:00+05:30  
**Branch:** `hardening/phase-0`  
**Node Version:** `v22.20.0`  
**pnpm Version:** `9.15.0`  

---

## 1. Monorepo Build Baseline (`cd orbitox && pnpm -r build`)

- **Total Workspace Projects:** 34
- **Packages/Plugins Passing Build (33/34):**
  - `@orbitox-io/core`
  - `@orbitox-io/runtime`
  - `@orbitox-io/plugin-engine`
  - `@orbitox-io/services`
  - `@orbitox-io/external-runtime-sdk`
  - `@orbitox-io/importer-core`
  - `@orbitox-io/commerce`
  - `@orbitox-io/pos`
  - `@orbitox-io/crm`
  - `@orbitox-io/finance`
  - `@orbitox-io/hms`
  - `@orbitox-io/hrms`
  - `@orbitox-io/inventory`
  - `@orbitox-io/school`
  - `@orbitox-io/external-project-engine`
  - *(and remaining package/plugin libraries)*
- **Failing Build (1/34):**
  - `orbitox/apps/web`: `next build` failed with `PageNotFoundError`:
    - `[Error [PageNotFoundError]: Cannot find module for page: /automations]`
    - `[Error [PageNotFoundError]: Cannot find module for page: /admin/business/[customDomain]]`
    - Status: Recorded per Phase 0 rules (not modifying yet).

---

## 2. Non-Browser Integration & Safety Script Baseline

Total non-browser test scripts executed: **21**  
- **Passed:** **7**
- **Failed:** **14**

| Script Name | Status | Exit Code | Duration | Failure Reason / Assertion Details |
|---|---|---|---|---|
| `test-external-os-control-plane.js` | **FAILED** | 1 | 4.75s | Factory API query failed (port 3005 web app returned 500) |
| `test-gate-a-and-b-integrity.js` | **FAILED** | 1 | 2.08s | `MODULE_NOT_FOUND` on internal dynamic import require |
| `test-kds-concurrency-hardening.js` | **FAILED** | 1 | 1.91s | AssertionError: Expo dispatch returned HTTP 422 !== 200 |
| `test-kds-security-adversarial.js` | **FAILED** | 1 | 0.69s | AssertionError: Role guard returned 401 !== 403 expected |
| `test-live-restaurant-apis.js` | **FAILED** | 1 | 2.13s | HTTP 200 returned for valid locator (locator 7Kp9xQ8m2L rotated) |
| `test-phase1-security-and-settlement.js` | **PASSED** | 0 | 2.44s | Branch and settlement operations pass |
| `test-phase2-menu-and-categories.js` | **FAILED** | 1 | 0.51s | Customer name validation & price calculation: 400 !== 201 |
| `test-phase3-closure-audit.js` | **FAILED** | 1 | 0.80s | AssertionError: Expected 403, received 401 |
| `test-phase3-floor-and-orders.js` | **PASSED** | 0 | 5.03s | 20 PASS assertions: table ordering, sync & KDS verified |
| `test-phase3-gate0-preflight.js` | **FAILED** | 1 | 1.12s | Delivery/pickup pricing payload validation: 400 !== 201 |
| `test-phase3-production-gates.js` | **PASSED** | 0 | 5.26s | Branch isolation verified (Ludhiana vs Chandigarh) |
| `test-phase4-gate0-kds-isolation-and-idempotency.js` | **PASSED** | 0 | 2.31s | Zero state drift & idempotency on 409 conflict verified |
| `test-phase4-release-audit.js` | **FAILED** | 1 | 0.09s | `Cannot find module '../projects/external-os/restaurant-os/packages/storage/store'` (TypeScript module path resolution in CJS) |
| `test-phase5-acceptance.js` | **FAILED** | 1 | 0.16s | TypeError: Cannot read properties of undefined (reading 'id') |
| `test-phase6-1-identity-lifecycle.js` | **FAILED** | 1 | 0.12s | AssertionError: Expected 401, received 200 (auth bypass on unauthenticated token check) |
| `test-phase6-security-and-session-isolation.js` | **FAILED** | 1 | 4.33s | Stale revision conflict check returned 403 !== 409 |
| `test-restaurantos-vertical-slices.js` | **FAILED** | 1 | 2.78s | Expo dispatch completed returned 422 !== 200 |
| `test-session-payment-safety.js` | **PASSED** | 0 | 1.21s | Zero cross-session data leakage verified on reused table |
| `test-sse-resilience-and-replay.js` | **PASSED** | 0 | 0.87s | Branch event scoping verified |
| `test-verification-addendum.js` | **FAILED** | 1 | 0.12s | New order creation returned 400 !== 201 |
| `verify-gate2-spot-checks.js` | **PASSED** | 0 | 2.04s | Settlement tagged as MANUAL_STAFF_RECORDED verified |

---

## 3. Browser-Dependent Scripts (Skipped in Phase 0 Baseline)

The following scripts require Chromium/Playwright/Puppeteer and were skipped per Phase 0 instructions:
- `scripts/audit-visual-truth.js`
- `scripts/capture-phase5-2-viewports.js`
- `scripts/capture-showcase.js`
- `scripts/sweep-all-apps-browser.js`
- `scripts/test-browser-e2e.js`
- `scripts/test-commerce-experiences-5-1.js`
- `scripts/test-crave-atlas-interactions.js`
- `scripts/test-phase5-viewports.js`
- `scripts/test-restaurantos-3-redesign.js`
- `scripts/test-template-differentiation.js`
