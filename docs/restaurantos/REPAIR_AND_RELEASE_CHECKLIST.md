# 🪐 RestaurantOS 5.2 — Repair and Release Checklist
## Prioritized Implementation Roadmap, Release Gates, Dependencies & Risk Mitigation

---

## 1. Executive Release Overview

This checklist establishes the engineering roadmap, verified fixes, and explicit release gates required to advance **OrbitoX RestaurantOS 5.2** from single-node staging to enterprise-grade production.

### Operational Posture at Current Checkpoint:
* **Current Runtime Health**: **ACTIVE & HEALTHY** on `http://localhost:4010` (PID / Daemon active, 0 TypeScript compilation errors).
* **Core Restaurant Commerce & Ordering**: **VERIFIED & OPERATIONAL** (CraveAtlas single-brand multi-branch, SwiftBite 1-tap reorder, PantryRush dark-store, BOH menu overrides, 9-station KDS).
* **Security & Financial Integrity**: **VERIFIED** (HMAC-SHA256 staff auth, zero-trust table QR session isolation, integer minor units ledger reconciliation, fail-closed production guards, unguessable orderToken PII protection).
* **Automated Acceptance Baseline**: **169 / 169 PASSING (100%)** across 6 test suites.
* **Platform Multi-App Browser Sweep**: **12 / 12 ROUTES MOUNTED CLEAN (100%)** with HTTP 200, 0 console errors, 0 broken requests, and 0 horizontal overflow.
* **Hardware & Provider Readiness**: **IMPLEMENTED / MOCK-VERIFIED, NOT PROVIDER/HARDWARE-VERIFIED** (ESC/POS thermal printing console adapter, simulated UPI/Card payment adapter).
* **Real-time Status**: **PARTIALLY VERIFIED** (Active 4s client polling active in tracking modal; native EventSource / SSE push stream scheduled for P1).
* **Deployment Model**: **SINGLE-NODE CERTIFIED** (Atomic JSON file store with in-memory synchronization; multi-node cluster requires distributed PostgreSQL / Redis migration).

---

## 2. P0: Functional Correctness & Data Integrity (COMPLETED & VERIFIED)

The following critical P0 defects and data-integrity risks were identified during the forensic audit and actively repaired in the codebase:

| Item ID | Description of Defect / Vulnerability | Root Cause in Source | Resolution & Code Repair Applied | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P0-1** | **Cryptographic Secret Hierarchy Inconsistency** | `packages/domain/security.ts` checked `STAFF_AUTH_SECRET || STAFF_JWT_SECRET`, ignoring `JWT_SECRET` and lacking canonical fallback. | Updated `getStaffAuthSecret()` to evaluate `STAFF_AUTH_SECRET || STAFF_JWT_SECRET || JWT_SECRET` with strict 32-character minimum length in production. | `test-phase6-security-and-session-isolation.js` (Suites 1, 2, 8) | **VERIFIED** |
| **P0-2** | **Client Untrusted PriceMinor Derivation** | `src/server.ts` previously accepted client-supplied `item.priceMinor` if catalog lookup failed, allowing potential price tampering. | Hardened `src/server.ts`: Server strictly resolves items against `resolvedMenu` for the target branch, deriving `effectivePriceMinor` authoritatively and rejecting invalid items with HTTP 400 `INVALID_MENU_ITEM`. | `test-commerce-5-2-single-brand.js` (Scenario C), `test-phase6-security-and-session-isolation.js` (Suite 4.1) | **VERIFIED** |
| **P0-3** | **Non-Cryptographic Idempotency Generation & Retry Volatility** | `crave-atlas.ts` and `swift-bite.ts` generated keys using `Math.random()` and regenerated a new key on every click attempt, breaking idempotency replay on network errors. | Replaced with collision-resistant `window.crypto.randomUUID()`. Cached `pendingOrderAttemptKey` across submission errors, preserving the exact same key during retries. | `test-commerce-5-2-single-brand.js` (Scenario E), `test-crave-atlas-interactions.js` (Suite 5) | **VERIFIED** |
| **P0-4** | **Static Tracking Modal in CraveAtlas** | Tracking modal `#ca-tracking-modal` displayed static milestone text upon order placement without dynamic status progression. | Implemented `startOrderPolling(orderId, orderToken)` calling `GET /api/commerce/orders/:id?token=...` every 4s, dynamically reflecting KDS task bumps in the status badge and timeline. | Browser audit & `test-crave-atlas-interactions.js` (Suite 5.5–5.6) | **VERIFIED** |
| **P0-5** | **PantryRush Non-Atomic Multi-SKU Stock Decrement** | Decrement loop in grocery orders modified stock item-by-item without rollback if subsequent items failed validation. | Implemented two-phase atomic `transactGroceryStock()` in `RestaurantRuntimeStore` with inventory pre-validation before committing decrements and audit logs. | Storage unit tests & concurrent order simulations | **VERIFIED** |
| **P0-6** | **Menu Branch Override Route Singular / Plural Inconsistency** | Server exposed `/api/restaurant/menu/branch-override` while test scripts and BOH UI posted to `/branch-overrides`. | Registered unified express route handlers for both singular and plural aliases in `src/server.ts`. | `test-commerce-5-2-single-brand.js` (Scenario B.3) | **VERIFIED** |
| **P0-7** | **Idempotency Key Collision Rejection** | Replaying an idempotency key with modified items or different branches previously risked executing mismatched order state. | Hardened `src/server.ts`: Identical orders safely replay HTTP 200 with `idempotentReplay: true`; conflicting replays with foreign items or mismatched branches strictly rejected with HTTP 409 `IDEMPOTENCY_CONFLICT`. | `test-verification-addendum.js` (Suites 1 & 5) | **VERIFIED** |
| **P0-8** | **Order Tracking Token & Header Authorization Privacy** | Querying orders via public REST route previously exposed customer phone number and delivery address to ID guessers, and URL query tokens could leak in referrers/logs. | Generated unguessable `orderToken` (`ordtok_...`) at checkout. `GET /api/commerce/orders/:id` accepts `Authorization: Bearer <orderToken>` and `X-Order-Token` headers alongside query fallback; masks phone and redacts address for unauthenticated queries; full data requires valid token; forged tokens rejected with HTTP 403 `UNAUTHORIZED_ORDER_ACCESS`. Set `Referrer-Policy: strict-origin-when-cross-origin`. | `test-verification-addendum.js` (Suite 2.1–2.5) | **VERIFIED** |
| **P0-9** | **Cart Branch-Switch Price Revalidation** | Switching branches in CraveAtlas previously wiped the in-memory cart array without preserving items or checking price overrides. | Cached cart in `sessionStorage` (`ca_branch_switch_cart` / `ca_active_cart`) tagged with `branchId`. Re-validates line items against target branch catalog, updates price deltas, and drops unavailable items upon branch navigation. | Browser audit & manual interaction | **VERIFIED** |
| **P0-10** | **White-Label Allowlist CSS Security Parser** | Administrative custom CSS injection allowed arbitrary styles, posing token exfiltration and clickjacking overlay risks. | Implemented AST allowlist parser `validateAndSanitizeCustomCss` in `packages/domain/css-security.ts`, restricting properties to safe visual declarations and `--*` variables, scoping rules under `.brand-custom-theme`, blocking `@import`, `url()`, clickjacking overlays (`position: fixed`, extreme `z-index`, opacity 0 on checkout controls), rejecting dangerous payloads with HTTP 400 `INVALID_CUSTOM_CSS`. | `test-verification-addendum.js` (Suite 4.1–4.4) | **VERIFIED** |
| **P0-11** | **Canonical Route Aliases & Parameterized KDS Endpoints** | Discrepancies between specification documents and server routes caused integration friction for staff login, grocery catalogs, domain verification, and KDS task operations. | Aliased `/auth/login`, `/grocery/catalog`, `/settings/whitelabel`, `/settings/domains/verify`, `/whitelabel`, and added RESTful `/api/restaurant/kds/tasks/:id/bump`, `/fulfill-item`, `/recall`, `/dispatch`. | `test-verification-addendum.js` (Suite 3) | **VERIFIED** |

---

## 3. P1: Real-Time Behavior & Operational Consistency (IN PROGRESS)

| Item ID | Task Description | Dependencies | Verification Plan | Risk & Failure Mode | Release Gate | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P1-1** | **Native SSE Order Event Push Stream** | HTTP EventSource or `fetch()` streaming route (`/api/commerce/events?orderId=...`) | Run simulated KDS bump and verify client DOM receives event within <100ms without polling. | Stale connection drop or query string token leakage in proxies. Must use short-lived stream ticket or auth header. | **Gate 1**: Order tracking reflects KDS bump via server push in <200ms. | **Partially verified** (Polling active; SSE push planned) |
| **P1-2** | **Live 86'd Out-of-Stock Broadcast** | PubSub event bus in `RestaurantRuntimeStore` broadcasting `BRANCH_OVERRIDE_SAVED` | Manager toggles 86'd item; connected CraveAtlas and SwiftBite clients immediately gray out item and disable add button. | Broadcast leakage across branches. Event payload must be strictly filtered by `branchId`. | **Gate 2**: 86'd item disabled in storefronts within 500ms of manager mutation. | **Partially verified** (Server validation verified; push planned) |
| **P1-3** | **Distance Matrix Delivery Fees** | Mapbox / Google Maps Distance Matrix API | Customer enters delivery address; computes exact road distance to branch kitchen and calculates dynamic delivery quote. | API quota exhaustion or network timeout. Must fall back safely to fixed zone-based fee (₹40). | **Gate 3**: Accurate kilometer-based fee calculated with graceful fallback. | **Planned** |

---

## 4. P1: Production Readiness & External Integrations (HARDWARE & PROVIDER GATES)

| Item ID | Task Description | Hardware / Provider Dependency | Verification Plan | Risk & Failure Mode | Release Gate | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P1-4** | **Live Payment Gateway (Stripe / Razorpay)** | Merchant API keys, Webhook Secret, Live HTTPS endpoint | Trigger sandbox payment; verify webhook signature (HMAC-SHA256); simulate duplicate webhook replay (must be idempotent). | Silent double-crediting or forged payment confirmation. Return URL must never be trusted without webhook confirmation. | **Gate 4**: 100% of orders require signed webhook verification before kitchen dispatch. | **Implemented, not provider verified** |
| **P1-5** | **ESC/POS Physical Receipt Printing** | Physical Star Micronics / Epson thermal printer on LAN/USB | Send 80mm ESC/POS byte buffer to IP:9100; verify ticket cut, Indian Rupee symbol encoding, and modifier layout. | Printer offline / paper out hangs order process. Print job must be queued asynchronously with KDS fallback. | **Gate 5**: Physical paper ticket printed with identical totals and zero blocking. | **Implemented, not hardware verified** |
| **P1-6** | **Physical USB HID Bump Bar Certification** | Logic Controls / Bematech 8-key bump bar | Connect USB bump bar; verify key mappings (`Space`=Next, `Enter`=Done, `R`=Recall, `H`=Hold, `E`=Expo) without software driver. | Tapping key while input is focused causes accidental text entry. DOM listener must scope to KDS canvas only. | **Gate 6**: 100% bump bar keycodes trigger expected task state transitions. | **Implemented, not hardware verified** |
| **P1-7** | **Production Secret Hardening & Env Contract** | Canonical `.env` contract (`STAFF_AUTH_SECRET`, `NODE_ENV=production`) | Verify server refuses to boot if `STAFF_AUTH_SECRET` is missing, <32 characters, or default development key. | Weak signing secret allowing token forging. | **Gate 7**: Server fails fast with exit code 1 if production secrets are insecure. | **VERIFIED** |
| **P1-8** | **Domain & SSL Provisioning Verification** | Cloudflare / Caddy Reverse Proxy, DNS API | Validate DNS CNAME and verify TLS certificate issuance via ACME before toggling `sslReady: true`. | Fake `sslReady` flag causing customers to hit insecure HTTP or broken DNS. | **Gate 8**: DNS lookup and TLS handshake confirmed before domain goes live. | **Verified (API Plane)** |

---

## 5. P2: Advanced Operational Features (SCOPED MODULES)

| Item ID | Feature Module | Core State Machine / Architectural Pattern | Complexity | Dependencies | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P2-1** | **Course Pacing & Staged Kitchen Firing** | DAG State Machine (`HELD -> RELEASED -> FIRED -> PLATED`). Automatic timer or server manual release per course (Appetizers, Mains, Desserts). | High | KDS task dependency graph, Expo coordination | **Planned** |
| **P2-2** | **Split Billing & Group Tabs** | Equal split, itemized split, and custom minor-unit amount allocation. Enforces strict zero-variance invariant ($\sum \text{splits} == \text{subtotal} + \text{tax}$). | High | Table QR session engine, financial ledger | **Planned** |
| **P2-3** | **PantryRush Barcode & Picker Workflow** | Picker mobile workflow (`ASSIGNED -> SCANNING -> BAGGED -> STAGED`). EAN-13 / UPC barcode scanning via mobile camera with manual override and substitution consent policy. | High | Camera Web API, Dark-store inventory store | **Planned** |

---

## 6. P3: Optional Future Omnichannel Capabilities

| Item ID | Capability | External Ecosystem Dependency | Target Milestone | Status |
| :--- | :--- | :--- | :--- | :--- |
| **P3-1** | **WhatsApp / SMS Order Updates** | Twilio / Meta WhatsApp Business Cloud API | Version 6.0 | **Planned** |
| **P3-2** | **WhatsApp Conversational Commerce** | Meta Webhooks + Orbito AI Agentic Natural Language Engine | Version 6.0 | **Planned** |
| **P3-3** | **Predictive Demand & Prep Batching** | Historical order time-series analysis & Prep Station Forecasting | Version 6.5 | **Planned** |
| **P3-4** | **Multi-Brand Cloud Kitchen Franchise Aggregation** | Multi-brand holding company management with shared commissary kitchen routing | Version 7.0 | **Planned** |
| **P3-5** | **iOS / Android Native Dynamic Island / Live Activities** | Apple APNs ActivityKit & Google Live Notifications | Version 6.5 | **Planned** |

---

## 7. Master Release Gate Checklist

Before designating RestaurantOS 5.2 as **ENTERPRISE PRODUCTION-READY (100%)**, all release gates below must be checked and signed off:

```
[X] GATE 0: Single-Brand Multi-Branch Acceptance (45/45 Passed)
[X] GATE 1: CraveAtlas Responsive Interaction & Viewports (52/52 Passed across 4 viewports)
[X] GATE 2: Zero-Trust Table QR & Physical Table Session Isolation (31/31 Passed)
[X] GATE 3: KDS Concurrency Hardening & State Machine Invariants (10/10 Passed)
[X] GATE 4: Session Closure & Financial Ledger Minor Units Safety (9/9 Passed)
[X] GATE 5: Verification Addendum Suite: Token Auth, Route Aliases, CSS Allowlist & Collision Guard (22/22 Passed)
[X] GATE 5b: Multi-App Browser Sweep: All 12 Platform Routes Mounted Clean (12/12 Passed: HTTP 200, 0 console errors, 0 overflow)
[X] GATE 6: Authoritative Server Pricing Derivation (Client priceMinor strictly rejected)
[X] GATE 7: Collision-Resistant UUID Idempotency Key Retention Across Retries
[X] GATE 8: Two-Phase Atomic Multi-SKU Stock Decrement in PantryRush
[X] GATE 9: Production Fail-Closed Security Guards (NODE_ENV=production enforces 32-char secret)
[X] GATE 10: High-Entropy Order Token Privacy, Header Auth (`Authorization: Bearer` / `X-Order-Token`) & Customer Contact Masking
[X] GATE 11: White-Label Allowlist CSS Security Parser (Scoping to `.brand-custom-theme`, blocking clickjacking overlays, at-rules, and url exfiltration)
[ ] GATE 12: Native EventSource / SSE Push Order Stream (Currently active 4s polling)
[ ] GATE 13: Real Physical ESC/POS Thermal Printer Certification (Tested on Star/Epson hardware)
[ ] GATE 14: Live Payment Gateway Webhook Certification (Live Stripe/Razorpay signature verified)
[ ] GATE 15: Distributed Clustering Support (PostgreSQL / Redis replacing single-node JSON store)
```

**Current Release Readiness Assessment**:
* **Staging & Pilot Demonstration**: **100% READY** (All 169 software assertions and 12-route browser sweep passed, all core dining and ordering workflows fully operational).
* **Enterprise Production Launch**: **PENDING GATES 12–15** (Physical printer hardware certification, live payment gateway webhooks, and SSE push streaming).
