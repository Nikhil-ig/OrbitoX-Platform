# 🪐 ORBITOX RESTAURANTOS 5.3 — SOURCE-OF-TRUTH AUDIT, END-TO-END FUNCTIONAL ACCEPTANCE & PRODUCT COMPLETION PLAN

**Document ID**: `RESTAURANTOS-5.3-MASTER-IMPLEMENTATION-PLAN`  
**Status**: CONDITIONALLY APPROVED — AMENDED FOR PHASE 1 EXECUTION GATE  
**Date**: October 2026  
**Target Runtime**: `projects/external-os/restaurant-os` (Port 4010)  
**Control Plane**: OrbitoX Control Plane (Port 3005)  
**Author**: Antigravity Principal Architecture Team  

---

## 0. Product Intent & Acceptance Standard

OrbitoX RestaurantOS is an enterprise restaurant management and commerce platform designed for **a single restaurant business operating multiple branches** (the flagship reference restaurant: **OrbitoX Bistro & Bar**).

### Core Architectural Axioms
1. **Single-Brand Multi-Branch Primacy**: The customer-facing storefronts (`/apps/crave-atlas`, `/apps/swift-bite`, `/dine/:locator`) represent **OrbitoX Bistro & Bar** across its authorized branches (*Ludhiana Main*, *Chandigarh Sector 17*, *Delhi Connaught Place*). It is **not** a generic aggregator marketplace showing third-party competitor restaurants.
2. **Authoritative Menu Hierarchy & Branch Inheritance**: Restaurant owners manage a centralized master catalog (categories, items, descriptions, dietary flags, images, stations, base prices, modifier groups). Branches inherit this catalog and apply location-specific overrides (86'ing / availability, localized pricing, custom SLAs) without polluting other branches.
3. **Closed-Loop Operational Integrity**: Actions in customer ordering immediately dispatch to the active branch's Kitchen Display System (`/kds`), register in operational orders (`/operations/orders`), attach to table sessions on the spatial floor (`/operations/floor`), and reflect in financial reconciliation (`/reports`).
4. **Zero-Trust Security & RBAC**: Every administrative mutation (menu editing, branch overrides, table settlement, staff credential rotation, template publishing) must be authenticated and authorized via cryptographic HMAC-SHA256 tokens scoped to staff roles (`OWNER`, `MANAGER`, `SERVER`, `CHEF`, `EXPO`).
5. **No Visual Façades or Fake Behaviors**: Buttons that appear interactive must execute authoritative backend state mutations. Placeholders, browser `alert()` shortcuts on failure, hardcoded bill totals, and dummy forms are unacceptable.
6. **Canonical Documentation Twin**: This document and its counterpart at `projects/external-os/restaurant-os/docs/RESTAURANTOS_5_3_IMPLEMENTATION_PLAN.md` are canonical, synchronized byte-for-byte, and serve as the single source of truth for engineering execution.

---

## 1. Industry Research & Operational Workflow Analysis

### 1.1 Toast Online Ordering & Multi-Location Management
*Authoritative Documentation References*:
- [Toast Online Ordering](https://pos.toasttab.com/products/online-ordering)
- [Toast Multi-Location Management](https://pos.toasttab.com/products/multi-location-management)
- [Toast Menu Hierarchy](https://support.toasttab.com/en/article/Get-Started-With-Menus?lang=en_US)
- [Toast Restaurant POS & Operations](https://pos.toasttab.com/restaurant-pos)

#### Architectural Insights from Toast:
1. **Hierarchical Menu Structure**: Toast structures menus as:
   $$\text{Master Catalog} \longrightarrow \text{Menu Groups (Categories)} \longrightarrow \text{Items} \longrightarrow \text{Modifier Groups} \longrightarrow \text{Modifiers} \ (\Delta\text{Price})$$
   Items possess canonical attributes (SKU, title, description, photography, prep station, allergens, dietary flags) and inherit global properties unless explicitly overridden at the location level.
2. **Enterprise Multi-Location Overrides**:
   - **86'ing (Item Availability)**: Outlets can mark an item as 86'd (out of stock) or set an inventory countdown quantity. The 86'd state takes effect immediately on that branch's digital channels without affecting neighboring outlets.
   - **Price Overrides**: Branches in higher-cost metropolitan areas (e.g. Connaught Place vs. Ludhiana) apply location-specific base price overrides while preserving the master item's identity, modifiers, and recipe associations.
   - **Service Hours & Ordering Schedules**: Each location defines its own delivery and pickup hours, fulfillment lead times, and capacity throttling.
3. **Kitchen Ticket Splitting & Routing**: When an order is placed (whether at a table, POS handheld, or online storefront), Toast routes individual line items to designated kitchen stations (e.g. *Grill*, *Sauté*, *Pantry*, *Bar*, *Expo*) based on station tags, assembling them on the Expediter (Expo) station for final consolidation.

### 1.2 Swiggy Restaurant Partner App (Hyper-Local Food Commerce)
*Authoritative Documentation Reference*:
- [Swiggy Partner Operations Playbook & App](https://play.google.com/store/apps/details?id=in.swiggy.partnerapp)

#### Operational Insights from Swiggy Partner App:
1. **1-Tap Operational Toggles**: Kitchen operators require high-contrast, instantaneous controls for:
   - "Outlet Online / Offline" status with automated scheduled reopening.
   - "Item Out of Stock Today" (auto-resets at start of next day) vs. "Out of Stock Indefinitely".
   - "Rush Hour Mode": Automatically extends prep SLA by 10–15 minutes across online channels during kitchen surges.
2. **Mobile Ergonomics**: Drivers and kitchen staff operate with grease or moisture on fingers. Interfaces must utilize large touch targets (minimum 48×48px), high contrast (meeting WCAG AAA), tactile audio feedback, and unambiguous status badges.
3. **Delivery Address & Identity Accuracy**: Online checkouts strictly collect customer name, verified phone number, and street address with landmark notes to ensure couriers can fulfill orders without lost transit time.

### 1.3 Architectural Synthesis: What Applies to RestaurantOS vs. What Remains Proprietary

| Architectural Pattern | How It Applies to RestaurantOS 5.3 | What Remains Specific / Proprietary to OrbitoX |
| :--- | :--- | :--- |
| **Menu Hierarchy & Overrides** | Master menu catalog with branch-specific price overrides and 86'ing toggles. | Stored in an atomic JSON state engine (`RestaurantRuntimeStore`) with immutable event bus replay (`eventBus.broadcast`) and versioned template drafts. |
| **Kitchen Station Routing** | Routing by dish station tag (`TANDOOR`, `CURRY_LINE`, `BAR`, `DESSERT`) with item-level fulfillment and Expo dispatch. | Lightweight browser KDS rendering directly on Port 4010, supporting both keyboard bump bar emulation (`Space`, `Enter`, `R`) and large touch buttons without heavy Electron runtimes. |
| **Single-Brand Commerce** | Branded customer ordering PWA with branch selector, real dish photography, and live status tracking. | Multi-experience storefront engines (`CraveAtlas`, `SwiftBite`, `PantryRush`, `DinerPwa`) running simultaneously from one authoritative backend and shared theme tokens. |
| **Security & Multi-Tenancy** | Protection against cross-branch mutations and unauthorized menu changes. | Salted SHA-256 PIN authentication, ephemeral HMAC-SHA256 JWT tokens, durable token revocation registry (`revoked-tokens.json`), and AST allowlist CSS sanitization (`css-security.ts`). |

---

## 2. Route-by-Route Inventory of Actual Functionality

The following table documents all 19 active application routes registered in `projects/external-os/restaurant-os/src/server.ts`, verifying their implementation status and identifying missing operational paths:

| # | Route | Page Component & Server Handler Line | Rendered Functionality | Backing Domain Service & Store Method | Actual Implementation Status | Gaps & Missing Operational Paths |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `/` or `/overview` | `renderOperationsHome` (`server.ts:2480-2511`) | High-level metrics: revenue, active tables, kitchen queue, live alerts, quick actions | `store.getTables()`, `store.getKitchenTasks()`, `store.getOrders()` | **Verified & Operational** | Quick action buttons ("New Order", "Shift Handover") lack action modals. |
| **2** | `/operations/floor` | `renderFloorStudio` (`server.ts:2514-2535`) | Spatial SVG floor plan, table drag/rotate/resize, live heatmap modes (Status, Occupancy, Turnover, Revenue) | `store.getTables(branchId)`, `store.getOrders()`, `store.saveTables()` | **Partially Verified (Defects Found)** | **CRITICAL DEFECT**: Bill settlement (line 327) uses hardcoded amounts (`₹730.00`) and fires dummy browser `alert()` without calling server settlement API. |
| **3** | `/operations/tables` | `renderTablesList` (`server.ts:2538-2553`) | Table fleet list with status filtering, server assignment, seat count, QR locator links | `store.getTables(branchId)` | **Verified & Operational** | Table status quick-toggle is read-mostly; bulk status actions not wired. |
| **4** | `/operations/orders` | `renderOrdersWorkspace` (`server.ts:2556-2570`) | Operational service orders table displaying Order #, Table, Status, Items, Total, Time | `store.getOrders()` | **Visually Implemented, Incomplete (Defects Found)** | **CRITICAL DEFECT**: Filter pills (lines 28–31) have no event handlers (dead buttons). Rows have no click drawer, no order cancellation, no station details. Entire file lacks JavaScript! |
| **5** | `/kds` | `renderKdsWorkspace` (`server.ts:2573-2585`) | Station-filtered kitchen queue (`ALL`, `TANDOOR`, `CURRY_LINE`, `BAR`, `DESSERT`), order timer SLA badges, item fulfillment, bump shortcuts | `store.getKitchenTasks()`, `store.bumpKitchenTask()`, `store.fulfillItem()` | **Verified (Ergonomic Flaws Found)** | **DEFECT**: Failure handlers (lines 743, 747, 764, 780, 796) trigger disruptive browser `alert()` popups, freezing kitchen touchscreen UI. |
| **6** | `/menu` | `renderMenuWorkspace` (`server.ts:2588-2603`) | Master culinary catalog table, category filters, item edit modal, branch override manager | `store.getMenuItems()`, `store.getBranchMenuOverrides()`, `store.createMenuItem()` | **Partially Verified (Defects Found)** | **CRITICAL DEFECTS**: Intelligence action buttons (line 96) trigger fake alerts. Edit modal (lines 270–285) only edits price/SLA/station—missing name, description, category, images, dietary flags, modifiers. No category CRUD. Unauthenticated API mutations. |
| **7** | `/guests` | `renderGuestsWorkspace` (`server.ts:2606-2620`) | Active seated guests, dietary preferences, lifetime spend, loyalty tier | `store.getGuests()`, `store.getTables()` | **Verified & Operational** | Manual guest check-in modal is simulated. |
| **8** | `/operations/locations` | `renderLocationsWorkspace` (`server.ts:2623-2637`) | Branch fleet management, operating hours, delivery radius, tax IDs, active tables count | `store.getBranches()`, `store.getBranch()` | **Verified & Operational** | Branch creation form needs server-authoritative validation. |
| **9** | `/operations/floors` | `renderFloorsWorkspace` (`server.ts:2640-2654`) | Multi-floor layout section editor (Main Dining, Courtyard, Bar, Private Dining) | `store.getFloors()`, `store.saveFloors()` | **Verified & Operational** | Works with SVG canvas persistence. |
| **10** | `/reports` | `renderReportsWorkspace` (`server.ts:2657-2671`) | Financial reconciliation, hourly sales, category mix, table turnover, server sales performance | `store.getOrders()`, `store.getKitchenTasks()` | **Verified & Operational** | Export CSV relies on client Blob generation; functional. |
| **11** | `/dine/:locator` | `renderDinerPwa` (`server.ts:2674-2692`) | Table-side QR digital menu supporting 6 distinct template aesthetics, seat order staging, server quote, order submission | `store.getTableByLocator()`, `store.getMenuItems()`, `store.createOrder()` | **Verified & Operational** | Full interactive cart, SHA-256 pricing quote, and session joining. |
| **12** | `/marketplace` | `renderMarketplaceWorkspace` (`server.ts:2695-2705`) | Template gallery with live preview, token inspection, 1-click installation to tenant brand | `store.getTemplates()`, `store.installTemplate()` | **Verified & Operational** | Fully wired to tenant brand config. |
| **13** | `/apps/crave-atlas` | `renderCraveAtlasPage` (`server.ts:2708-2716`) | Single-brand premium restaurant storefront for OrbitoX Bistro & Bar, branch selector, dish search, customizer, cart drawer, order tracking modal | `store.getResolvedMenuForBranch()`, `store.getTenantBrand()`, `store.createCommerceOrder()` | **Verified (Defects Found)** | **CRITICAL DEFECT**: Checkout drawer (lines 1426–1435) only collects delivery address; customer name and phone are hardcoded to dummy values (`Patron Guest`, `+91 98765 43210`). |
| **14** | `/apps/swift-bite` | `renderSwiftBitePage` (`server.ts:2719-2728`) | Speed-first mobile food ordering app, 1-tap branch selector, past reorders, rapid add, bottom-sheet customizer, sticky cart | `store.getResolvedMenuForBranch()`, `store.getOrders()`, `store.createCommerceOrder()` | **Verified (Defects Found)** | **CRITICAL DEFECT**: Checkout submit (lines 1122–1124) hardcodes customer name and phone. Confirmation triggers browser `alert()` and lacks in-app tracking folio. |
| **15** | `/apps/pantry-rush` | `renderPantryRushPage` (`server.ts:2731-2740`) | 15-minute quick-commerce dark-store grocery, inventory stock decrement, substitution preferences | `store.getGrocerySkus()`, `store.transactGroceryStock()` | **Verified (Defects Found)** | **DEFECT**: Hardcodes phone/address; order success triggers browser `alert()` and full reload instead of in-page order status tracking. |
| **16** | `/studio` | `renderVisualStudio` (`server.ts:2743-2756`) | 3-pane storefront visual editor with live preview, mobile/tablet/desktop viewports, undo/redo, draft save, and live publication | `store.getTemplateDraft()`, `store.saveTemplateDraft()`, `store.publishTemplateDraft()` | **Verified & Operational** | Saves drafts to JSON store and publishes with versioning. |
| **17** | `/whitelabel` | `renderWhiteLabelWorkspace` (`server.ts:2759-2776`) | Brand styling (colors, logo, typography), custom domains, DNS check, safe CSS injection, branch overrides | `store.getTenantBrand()`, `store.saveTenantBrand()`, `css-security.ts` | **Partially Verified (Defects Found)** | **CRITICAL DEFECT**: `saveBrandSettings()` (line 383) omits `branchOverrides` from payload; branch branding overrides are silently lost! |
| **18** | `/staff` | `renderStaffWorkspace` (`server.ts:2779-2796`) | Staff directory table, 8-role RBAC matrix, PIN authentication tester, durable token revocation | `STAFF_DIRECTORY`, `security.ts:revokeStaffToken()` | **Partially Verified (Defects Found)** | **DEFECT**: Revoke member button (lines 302–306) fires fake `alert()` without server API call. Missing staff member creation/PIN edit forms. |
| **19** | `/support` | `renderSupportWorkspace` (`server.ts:2799-2810`) | 3-pane incident support desk, priority queue, message timeline, new ticket modal | `store.getSupportTickets()`, `store.createSupportTicket()` | **Verified & Operational** | Full REST backend wired to store. |

---

## 3. Forensic Defect Audit & Security Vulnerability Register

The following register audits all operational endpoints in `src/server.ts`, documenting their current authentication status, required roles, branch scoping, and remediation specifications:

### 3.1 Comprehensive Endpoint Security & Authorization Audit

| Endpoint | Method | Existing Auth Status in `server.ts` | Required Role / Capability | Branch Scoping Rule | Defect & Remediation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/restaurant/menu/items` | `POST` | **None** (`server.ts:1983`) | `OWNER`, `MANAGER`, `ADMIN` (`menu.mutate`) | Global master catalog | Require valid staff token; return HTTP 401 if unauthenticated, 403 if unauthorized. |
| `/api/restaurant/menu/items/:id` | `PATCH` | **None** (`server.ts:1994`) | `OWNER`, `MANAGER`, `ADMIN` (`menu.mutate`) | Global master catalog | Require valid staff token; return HTTP 401/403. |
| `/api/restaurant/menu/items/:id` | `DELETE` | **None** (`server.ts:2006`) | `OWNER`, `MANAGER`, `ADMIN` (`menu.mutate`) | Global master catalog | Require valid staff token; return HTTP 401/403. |
| `/api/restaurant/menu/branch-overrides` | `POST` | **None** (`server.ts:2052`) | `OWNER`, `MANAGER`, `ADMIN` (`menu.mutate`) | Must match `body.branchId` or `branchId === '*'` | Verify operator branch matches `body.branchId`; reject cross-branch override attempts with HTTP 403 `BRANCH_MISMATCH`. |
| `/api/restaurant/floor/save` | `POST` | Insecure non-prod fallback (`server.ts:1211`) | `OWNER`, `MANAGER`, `ADMIN`, `OPERATIONS` (`floor.mutate`) | Must match current branch | **Eliminate anonymous dev fallback**. Enforce staff auth and branch match in all environments. |
| `/api/restaurant/tables/:id` | `PATCH` | Insecure non-prod fallback (`server.ts:1268`) | `OWNER`, `MANAGER`, `ADMIN`, `OPERATIONS`, `SERVER` | Must match table branch | **Eliminate anonymous dev fallback**. Enforce branch match. |
| `/api/restaurant/tables/:id` | `DELETE` | Insecure non-prod fallback (`server.ts:1346`) | `OWNER`, `MANAGER`, `ADMIN` | Must match table branch | **Eliminate anonymous dev fallback**. Reject cross-branch table deletions. |
| `/api/restaurant/tables/merge` | `POST` | Insecure non-prod fallback (`server.ts:1562`) | `OWNER`, `MANAGER`, `ADMIN`, `SERVER` | Both tables must be in operator branch | **Eliminate anonymous dev fallback**. Verify both tables belong to operator's branch. |
| `/api/restaurant/tables/unmerge` | `POST` | Insecure non-prod fallback (`server.ts:1597`) | `OWNER`, `MANAGER`, `ADMIN`, `SERVER` | Table must be in operator branch | **Eliminate anonymous dev fallback**. |
| `/api/restaurant/tables/:id/settle` | `POST` | **Missing endpoint** (Currently stubbed in UI) | `OWNER`, `MANAGER`, `ADMIN`, `POS`, `SERVER` (`settlement.execute`) | Must match table branch | **Implement authoritative settlement endpoint**. Enforce full bill calculation, concurrency locks, idempotency, audit trail. |
| `/api/restaurant/sessions/close` | `POST` | Partially enforced (`server.ts:586`) | `OWNER`, `MANAGER`, `ADMIN`, `POS`, `SERVER` or Table Diner | Must match table branch or diner session | Keep existing check, eliminate unauthenticated fallbacks. |
| `/api/restaurant/kds/bump` | `POST` | Enforced via token/secret (`server.ts:996`) | `CHEF`, `EXPO`, `MANAGER`, `ADMIN` (`kds.bump`) | Must match task branch | Enforce station-level validation (e.g. Tandoor cook cannot bump Bar cocktail). |
| `/api/restaurant/branding` | `POST` | **None** (`server.ts:1871`) | `OWNER`, `ADMIN` (`branding.publish`) | Global tenant scope | Require `OWNER` or `ADMIN` token. Validate CSS via allowlist parser. Persist `branchOverrides`. |
| `/api/restaurant/branding/verify-domain` | `POST` | **None** (`server.ts:1896`) | `OWNER`, `ADMIN` | Global tenant scope | Require `OWNER` or `ADMIN` token. |
| `/api/restaurant/templates/install` | `POST` | **None** (`server.ts:1808`) | `OWNER`, `ADMIN` (`templates.install`) | Global tenant scope | Require `OWNER` or `ADMIN` token. |
| `/api/restaurant/studio/draft` | `POST` | **None** (`server.ts:1829`) | `OWNER`, `MANAGER`, `ADMIN` | Global tenant scope | Require valid staff token. |
| `/api/restaurant/studio/publish` | `POST` | **None** (`server.ts:1843`) | `OWNER`, `ADMIN` (`branding.publish`) | Global tenant scope | Require `OWNER` or `ADMIN` token. |
| `/api/restaurant/branches` | `POST` | **None** (`server.ts:1474`) | `OWNER`, `ADMIN` (`branch.manage`) | Global tenant scope | Require `OWNER` or `ADMIN` token. |
| `/api/restaurant/branches/:id` | `DELETE` | **None** (`server.ts:1490`) | `OWNER`, `ADMIN` (`branch.manage`) | Global tenant scope | Require `OWNER` or `ADMIN` token. Prevent deleting branch with active sessions. |
| `/api/restaurant/branches` (Line 2018) | `GET` | **Duplicate unreachable code** (`server.ts:2018`) | N/A | Global | Remove unreachable duplicate. Line 1468 remains canonical. |
| `/api/commerce/restaurants` | `GET` | Legacy multi-merchant (`server.ts:2072`) | Public | Global | Maintain backward compatibility for `test-commerce-experiences-5-1.js`; add deprecation warning header. |

---

## 4. Table Settlement, Financial Integrity & Transactional Model

### 4.1 Existing Data & Persistence Models
In `projects/external-os/restaurant-os`:
1. **`TableFloorRecord`** (`packages/domain/index.ts:133-156`):
   - `id`: unique numeric table ID
   - `number`: table code (e.g. `T-14`)
   - `branchId`: outlet identifier (e.g. `branch_ldh`)
   - `status`: `'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'BILL_REQUESTED' | 'DIRTY'`
   - `activeSessionId`: pointer to currently active `DiningSessionRecord`
   - `activeBillMinor`: accumulated balance in integer minor units (paise)
2. **`DiningSessionRecord`** (`packages/storage/store.ts:75-87`):
   - `sessionId`: unique string ID (`sess_...`)
   - `tableNumber`, `branchId`, `floorId`, `hostName`
   - `status`: `'ACTIVE' | 'CLOSED'`
   - `openedAt`, `closedAt`, `guestCapabilityTokens`
   - `settlement`: optional `SettlementRecord`
3. **`RestaurantOrder`** (`packages/domain/index.ts:258-284`):
   - `orderId`, `tableNumber`, `sessionId`, `status`: `'PENDING' | 'CONFIRMED' | 'IN_PREPARATION' | 'SERVED' | 'PAID' | 'COMPED' | 'VOIDED'`
   - `items`: array of line items with `unitPriceMinor`, `quantity`, `station`
   - `subtotalMinor`, `taxMinor` (5% GST), `totalMinor`, `currency`
4. **`SettlementRecord`** (`packages/storage/store.ts:65-73`):
   - `method`: `'CASH' | 'CARD' | 'UPI' | 'COMP' | 'VOID' | 'REFUND' | 'EMERGENCY_OVERRIDE'`
   - `status`: `'PAID' | 'COMPED' | 'VOIDED' | 'REFUNDED' | 'PARTIAL' | 'UNSETTLED_OVERRIDE'`
   - `amountMinor`, `settledAt`, `authorizedBy`, `reason`, `unsettledLiabilityMinor`

### 4.2 Authoritative Server-Side Bill Calculation
To eliminate drifting totals and hardcoded UI numbers:
$$\text{Active Orders} = \{ o \in \text{orders} \mid o.\text{tableNumber} = \text{table}.\text{number} \land o.\text{sessionId} = \text{table}.\text{activeSessionId} \land o.\text{status} \notin \{\text{'PAID'}, \text{'VOIDED'}, \text{'CANCELLED'}\} \}$$
$$\text{Authoritative Subtotal} = \sum_{o \in \text{Active Orders}} \sum_{i \in o.\text{items}} (i.\text{quantity} \times i.\text{unitPriceMinor})$$
$$\text{Authoritative 5\% GST} = \text{Math.round}(\text{Authoritative Subtotal} \times 0.05)$$
$$\text{Authoritative Total Tab} = \text{Authoritative Subtotal} + \text{Authoritative 5\% GST}$$

- **Rounding Guarantee**: All arithmetic is performed strictly on integer minor units (paise). Floating-point arithmetic on currency is strictly forbidden.
- **Authoritative Source of Truth**: The active bill is computed by summing the active line items of the session, overriding any stale client-side caches.

### 4.3 Transactional Integrity & Concurrency Protection
1. **Single-Thread Event Loop & OCC**: In `RestaurantRuntimeStore`, synchronous in-memory mutations commit sequentially within the Node.js event loop. Every mutation increments `this.data.revisions += 1` and executes `flushSync()`, which writes to a unique temporary file (`${filePath}.tmp.${Date.now()}_${process.pid}`) and atomically renames it to `restaurant-runtime-store.json`.
2. **In-Memory Table Settlement Mutex**: To protect against concurrent settlement race conditions across asynchronous HTTP requests:
   - An in-memory settlement lock map (`const activeSettlementLocks = new Set<string>()`) tracks tables currently in an active settlement pipeline.
   - If a second request arrives while a settlement is in-flight for that table, it is rejected immediately with HTTP 409 `SETTLEMENT_IN_PROGRESS`.
   - On completion (or caught exception), the table lock is released in a `finally` block.
3. **Idempotency via `x-idempotency-key`**:
   - Replays with the identical idempotency key return the cached settlement result with `{ idempotentReplay: true }` and HTTP 200.
   - Replays with modified amounts or methods return HTTP 409 `IDEMPOTENCY_CONFLICT`.
4. **Payment Status & Vacating Rules**:
   - **Full Payment (`status === 'PAID'`)**: Permitted if `amountMinor >= totalMinor`. All session orders transition to `'PAID'`. The session marks `'CLOSED'`. The table active bill is zeroed, active session cleared, and table transitions to `'AVAILABLE'`.
   - **Partial Payment (`status === 'PARTIAL'`)**: Rejected from vacating the table (`code: 'PARTIAL_SETTLEMENT_UNRESOLVED'`, HTTP 422). Table remains `'OCCUPIED'` with remaining balance recorded.
   - **Comp / Void (`COMPED` / `VOIDED`)**: Permitted **only** if the authorizer possesses `MANAGER` or `ADMIN` role with a mandatory operational reason.
   - **Audit Trail**: Every settlement attempt emits `TABLE_SETTLEMENT_ATTEMPT` and, on success, `TABLE_SETTLEMENT_SUCCESS` with authorizer identity, table number, tender method, amount, and order IDs.

### 4.4 Simulation vs. Real Gateway Distinction
- Tenders recorded via `CARD` or `UPI` are clearly flagged in the audit payload with:
  ```json
  { "provider": "SIMULATED_GATEWAY", "gatewayVerified": false }
  ```
- Simulated transactions never fabricate a fake Razorpay/Stripe charge ID. Real gateway webhooks remain classified as `Implemented, not hardware/provider verified`.

---

## 5. End-to-End Interaction Traces for Critical Business Actions

```
[UI Control Event] ──► [Client Handler] ──► [HTTP REST / Auth] ──► [Domain Service / Validator] ──► [Storage Mutation] ──► [Event Bus] ──► [Refreshed UI]
```

### Trace Table: Critical Workflows
| Interaction | UI Control & Event | Client Event Handler | API Route & Headers | Domain Service Mutation | Persistence Target | Refreshed UI Observable Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Create Menu Item** | `#btn-save-new-dish` (`onclick`) | `createNewItem()` in `menu.ts` | `POST /api/restaurant/menu/items`<br>`Authorization: Bearer <staffToken>` | `store.createMenuItem(payload)` validates name, category, price, station, flags | `data/restaurant-runtime-store.json` (`menuItems` array) | Item row immediately renders in `/menu` table with correct badge, price, and category pill count. |
| **B. Update Dish & Modifiers** | `#btn-save-dish-edit` (`onclick`) | `saveItemChanges()` in `menu.ts` | `PATCH /api/restaurant/menu/items/:id`<br>`Authorization: Bearer <staffToken>` | `store.updateMenuItem(id, updates)` updates title, desc, price, SLA, station, image, modifiers | `data/restaurant-runtime-store.json` (`menuItems` entry) | Modal closes; dish card/row displays updated title, price, photo, and modifier count. |
| **C. Set Branch Override** | `#ov-save-btn` (`onclick`) | `saveBranchOverride(id)` in `menu.ts` | `POST /api/restaurant/menu/branch-overrides`<br>`Authorization: Bearer <staffToken>` | `store.setBranchMenuOverride(override)` sets `isAvailable` and `priceOverrideMinor` | `data/restaurant-runtime-store.json` (`branchMenuOverrides`) | Toast confirms override; storefronts at that branch display updated price or 86'd badge. |
| **D. Submit CraveAtlas Order** | `#ca-checkout-btn` (`onclick`) | `submitOrder()` in `crave-atlas.ts` | `POST /api/commerce/orders`<br>`x-idempotency-key: <key>` | `store.createCommerceOrder()` calculates GST, issues `orderToken`, routes kitchen tasks | `data/restaurant-runtime-store.json` (`orders` and `kitchenTasks`) | Drawer closes; `#ca-tracking-modal` displays real Order ID, milestone stepper, and items. KDS shows tasks. |
| **E. Kitchen Task Bump** | `.bump-btn-ready` / `Space` key | `bumpTask(id, nextStatus)` in `kds.ts` | `POST /api/restaurant/kds/bump`<br>`Authorization: Bearer <kdsToken>` | `store.bumpKitchenTask(taskId, nextStatus)` advances `QUEUED` ➔ `IN_PROGRESS` ➔ `READY` | `data/restaurant-runtime-store.json` (`kitchenTasks` entry) | Ticket card transitions state or removes from station queue; Expo ticket advances. |
| **F. Table Bill Settlement** | `#btn-settle-check` (`onclick`) | `settleTableCheck(tableId)` in `floor.ts` | `POST /api/restaurant/tables/:id/settle`<br>`Authorization: Bearer <staffToken>` | `store.settleTableSession(tableId, method)` marks orders `PAID`, frees table, records tender | `data/restaurant-runtime-store.json` (`orders`, `tables`, `sessions`) | Table badge turns green (`AVAILABLE`); session orders mark `PAID`; reconciliation records payment. |
| **G. Save Brand Overrides** | `#btn-save-brand` (`onclick`) | `saveBrandSettings()` in `whitelabel.ts` | `POST /api/restaurant/branding`<br>`Authorization: Bearer <staffToken>` | `store.saveTenantBrand(payload)` validates CSS with `css-security.ts`, stores `branchOverrides` | `data/restaurant-runtime-store.json` (`tenantBrand`) | Toast confirms save; branch selector reflects branch-specific branding and custom domains. |

---

## 6. Branch Isolation & Menu Publication Architecture

### 6.1 Three-Tier Catalog Resolution
To maintain strict single-brand multi-branch integrity, RestaurantOS resolves the menu for any given channel using a deterministic 3-tier inheritance tree:

```
[Master Menu Catalog] (Global defaults: title, base price, description, images, dietary tags, station)
         │
         ▼
[Branch Menu Overrides] (Branch-specific: isAvailable [86'ing], priceOverrideMinor, prepDurationOverride)
         │
         ▼
[Resolved Branch Menu] (Authoritative catalog served to /apps/crave-atlas, /apps/swift-bite, /dine/:locator)
```

### 6.2 Branch Isolation Guarantees
1. **Catalog Integrity**: Modifying a branch price override for `Delhi Connaught Place` (e.g. ₹580 for Butter Chicken) has zero effect on `Ludhiana Main` (base ₹540).
2. **86'ing Scope**: Marking an item out of stock at `Chandigarh Sector 17` disables the "Add to Cart" button at Chandigarh only; patrons browsing Ludhiana continue to order normally.
3. **Cart Switch Revalidation**: If a customer adds an item in Ludhiana and subsequently changes branches to Chandigarh:
   - The system checks if all items exist and are available at the destination branch.
   - Prices are automatically updated to destination branch rates.
   - If an item is 86'd at the destination branch, the customer is notified with a polite warning before removing the item from the cart.
4. **Order Scoping**: An order submitted with `branchId: 'branch_del'` cannot route tasks to Ludhiana's KDS or affect tables at Chandigarh.

---

## 7. Mobile Usability & Ergonomics Audit

Every customer-facing experience and operational workspace must be tested and responsive across:
- **Mobile Viewports**: 390×844px (iPhone 14/15/16), 430×932px (iPhone 14/15/16 Pro Max)
- **Tablet Viewports**: 768×1024px (iPad mini / Mobile POS Handheld)
- **Desktop Viewports**: 1440×900px (Manager Office / Large Screen Display)

| Surface | Mobile Ergonomics (390px / 430px) | Touch Target Compliance | Bottom Sheet & Cart Dock | Safe-Area & Keyboard Clearance |
| :--- | :--- | :--- | :--- | :--- |
| **CraveAtlas** (`/apps/crave-atlas`) | Sticky header, horizontal scrolling category pills, vertical food card list | All stepper buttons `+` / `-` are at least 44×44px; touch targets compliant. | Persistent floating bottom cart bar (shows item count + total + "View Cart →"). Opens smooth slide-up drawer. | Bottom drawer applies `padding-bottom: calc(24px + env(safe-area-inset-bottom))`. Form inputs clear mobile keyboard. |
| **SwiftBite** (`/apps/swift-bite`) | High-density card layout, 1-tap branch selector pill, 1-tap reorder carousel | Quick add buttons convert inline to `[- 1 +]` stepper with haptic/tactile feedback. | Sticky bottom order dock with delivery SLA (20–25m) and 1-tap checkout. | Safe-area insets applied on iOS Safari viewport. |
| **PantryRush** (`/apps/pantry-rush`) | 2-column grocery shelf grid, pack size pill badges, clear out-of-stock overlay | Stepper buttons 44px; stock limit prevents exceeding available dark-store inventory. | Slide-up cart drawer with free delivery progress bar (Free above ₹199). | Clean sticky bottom navigation. |
| **Diner PWA** (`/dine/:locator`) | Split view shifts to stacked mobile scroll; sticky table badge ("Table 14 · Courtyard") | Large modifier selection chips (8oz/12oz, spice dials, broth richness). | Floating check presenter / cart dock with live server quote total. | In-app QR table session joining without requiring app install. |
| **KDS Workstation** (`/kds`) | Responsive grid collapses to 1-column or 2-column touch cards on smaller tablets | Minimum 52×52px bump action buttons for wet/greasy kitchen hands. | N/A (Full-screen kitchen station workstation). | High-contrast dark theme (#090B10, #22C55E, #EAB308, #EF4444) with zero decorative distractions. |
| **Floor Studio** (`/operations/floor`) | Left section rail collapses to top drawer; SVG canvas supports pinch-to-zoom | Table selection nodes support 24px snap-to-grid drag and drop. | Slide-up Table Inspector drawer with Overview, Seating, Orders, Bill tabs. | Full touch and pointer support. |

---

## 8. Prioritized Defect Backlog (P0 / P1 / P2)

### P0 Defects (Blockers for Real Restaurant Operations)
- **DEF-01 [P0 - Menu]**: BOH Menu Item Editor lacks Name, Description, Category, Image URL, Dietary Flags, and Modifier Groups (`menu.ts:270-285`).
- **DEF-02 [P0 - Security]**: Menu catalog and branch override mutation endpoints lack authentication (`server.ts:1983-2015, 2052-2061`).
- **DEF-03 [P0 - Floor POS]**: Table bill settlement uses hardcoded dummy amounts (`₹730.00`) and fake `alert()` without backend settlement execution (`floor.ts:315-329`).
- **DEF-04 [P0 - Commerce]**: CraveAtlas and SwiftBite checkouts hardcode customer name and phone number (`crave-atlas.ts:1426-1435, 2148-2150`, `swift-bite.ts:1122-1124`).
- **DEF-05 [P0 - White-Label]**: White-label settings drop `branchOverrides` on save (`whitelabel.ts:383-400`).

### P1 Defects (Operational & Ergonomic Deficiencies)
- **DEF-06 [P1 - Orders Workspace]**: Filter pills and table rows in `/operations/orders` are dead buttons with no details or actions (`orders.ts:28-32, 52-74`).
- **DEF-07 [P1 - Menu]**: Menu Intelligence cards fire dummy browser alerts; no Category CRUD interface exists (`menu.ts:96, 107-113`).
- **DEF-08 [P1 - KDS]**: KDS failure handlers trigger blocking browser `alert()` popups (`kds.ts:743-796`).
- **DEF-09 [P1 - Commerce Tracking]**: SwiftBite and PantryRush order confirmations use browser alerts instead of live order tracking (`swift-bite.ts:1137`, `pantry-rush.ts:780-785`).
- **DEF-10 [P1 - Code Cleanup]**: Duplicate unreachable `GET /api/restaurant/branches` at line 2018 in `server.ts`.

### P2 Defects (Visual Polish & Staff Directory Completion)
- **DEF-11 [P2 - Staff Management]**: Staff credential revocation uses fake alert without backend call; missing Add Staff Member form (`staff.ts:302-306`).
- **DEF-12 [P2 - Mobile Polish]**: Ensure touch targets on all modals and bottom bars strictly meet minimum 44×44px standards with zero overflow across 390px, 430px, 768px viewports.

---

## 9. Phased Execution Sequence & Strict Gates

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: SECURITY & API HARDENING + SETTLEMENT PREREQUISITES (CURRENT) │
│ - Cryptographic staff authentication on all mutation endpoints         │
│ - Eliminate all insecure anonymous development fallbacks               │
│ - Authoritative POST /api/restaurant/tables/:id/settle endpoint        │
│ - Table settlement mutex & concurrency protection                      │
│ - Safe table-vacating and order PAID state transition                  │
│ - Remove shadowed duplicate branch route; preserve legacy commerce     │
│ - Negative security & settlement test suites                           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ (STOP CONDITION: User Approval Gate)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: BOH MENU CATALOG & CATEGORY MANAGEMENT REBUILD                │
│ - Complete culinary item editor (Name, Description, Image, Modifiers) │
│ - Category CRUD interface (Add, Reorder, Archive)                      │
│ - Wire intelligence recommendations                                    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: FLOOR POS BILL SETTLEMENT & ORDERS WORKSPACE REPAIR           │
│ - Wire Floor UI to real settlement API                                 │
│ - Real dynamic bill calculation replacing hardcoded template           │
│ - Interactive Orders Workspace with detail drawer & filters            │
└────────────────────────────────────┬───────────────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: CUSTOMER COMMERCE EXPERIENCE POLISH                           │
│ - Collect real Customer Name and Phone in CraveAtlas & SwiftBite       │
│ - In-app live tracking status drawer (replacing browser alerts)        │
│ - Fix branchOverrides persistence in white-label settings              │
└────────────────────────────────────┬───────────────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: KDS WORKSTATION REFINEMENTS & STAFF MANAGEMENT                │
│ - Non-blocking KDS toast notifications                                 │
│ - Real staff revocation endpoint wiring & Add Staff modal              │
└────────────────────────────────────┬───────────────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: AUTOMATED REGRESSION SUITES & BROWSER ACCEPTANCE              │
│ - Run all automated test suites (>200 assertions)                      │
│ - Playwright multi-viewport sweep (390px, 430px, 768px, 1440px)        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Phase 1 Execution Scope, Dependencies, Risks & Acceptance Criteria

### 10.1 Affected Files in Phase 1
- `projects/external-os/restaurant-os/src/server.ts`:
  - Enforce `resolveRequestIdentity()` on all mutation endpoints:
    - `POST /api/restaurant/menu/items`, `PATCH /api/restaurant/menu/items/:id`, `DELETE /api/restaurant/menu/items/:id`
    - `POST /api/restaurant/menu/branch-overrides`
    - `POST /api/restaurant/floor/save` (remove anonymous fallback)
    - `PATCH /api/restaurant/tables/:id` (remove anonymous fallback)
    - `DELETE /api/restaurant/tables/:id` (remove anonymous fallback)
    - `POST /api/restaurant/tables/merge`, `POST /api/restaurant/tables/unmerge` (remove anonymous fallback)
    - `POST /api/restaurant/branding`, `POST /api/restaurant/branding/verify-domain`
    - `POST /api/restaurant/templates/install`
    - `POST /api/restaurant/studio/draft`, `POST /api/restaurant/studio/publish`, `POST /api/restaurant/studio/revisions/:id/restore`
    - `POST /api/restaurant/branches`, `DELETE /api/restaurant/branches/:id`
    - `POST /api/restaurant/floors`
  - Remove duplicate unreachable `GET /api/restaurant/branches` at line 2018.
  - Implement authoritative `POST /api/restaurant/tables/:id/settle` with table settlement lock, full bill calculation, idempotency, audit trail, order state update, and safe table vacating.
- `projects/external-os/restaurant-os/packages/storage/store.ts`:
  - Add `settleTableSession(tableIdOrNumber, settlement, options)` to `RestaurantRuntimeStore` connecting table orders, session closure, and table availability.
- `scripts/test-phase1-security-and-settlement.js`:
  - Comprehensive automated test suite verifying all Phase 1 criteria.

### 10.2 Dependencies
- Zero external package additions. Leverages Node.js core `crypto` and `fs` alongside existing `packages/domain/security.ts`.
- Retains backward compatibility on `/api/commerce/restaurants` with deprecation header so `test-commerce-experiences-5-1.js` is not broken.

### 10.3 Risks & Mitigation
- **Risk 1: Client breaking on newly secured endpoints**: The internal UI pages (`/menu`, `/operations/floor`, etc.) already receive `staffToken` generated by `issueStaffToken()` in `server.ts`. Client scripts will use `getStaffHeaders()` uniformly.
- **Risk 2: Race condition during concurrent settlement requests**: Mitigated by the in-memory `activeSettlementLocks` Set, rejecting overlapping settlement requests with HTTP 409.

### 10.4 Phase 1 Acceptance Criteria
1. **Unauthenticated / Anonymous Access Rejected**: `POST /api/restaurant/menu/items` and all operational mutations return HTTP 401 `UNAUTHENTICATED` when called without credentials in all environments.
2. **Invalid / Expired / Revoked Tokens Rejected**: Tokens with invalid signatures, expired timestamps, or matching revoked token/JTI lists return HTTP 401.
3. **Insufficient Roles Rejected**: Non-privileged tokens (e.g. `SERVER`) attempting to mutate menu catalog or publish brand settings return HTTP 403 `FORBIDDEN`.
4. **Cross-Branch Mismatches Blocked**: A staff member with credentials for `branch_ldh` attempting to mutate tables or settle checks for `branch_del` is rejected with HTTP 403 `BRANCH_MISMATCH`.
5. **Authoritative Table Settlement**: `POST /api/restaurant/tables/:id/settle`:
   - Computes bill from unpaid active session orders + 5% GST.
   - Idempotently replays duplicate requests with identical responses.
   - Rejects concurrent settlement attempts on the same table with HTTP 409.
   - Rejects partial payment attempts without authorized comp/void from vacating the table (HTTP 422).
   - Marks all session orders as `PAID` (or `COMPED`/`VOIDED`), marks session `CLOSED`, clears active bill, and sets table status to `AVAILABLE`.
   - Records audit entry `TABLE_SETTLEMENT_SUCCESS`.
6. **No Regressions**: Existing 169 test assertions across all suites continue to pass 100%.

---

## 11. Hardware & External-Provider Limitations (Release Truth)

In strict accordance with release truth standards:
1. **Physical ESC/POS Thermal Printers**: Physical Star Micronics and Epson receipt printers are not connected. The platform executes `MockThermalPrinterAdapter` (`packages/integrations/index.ts`) with logged byte streams.
2. **Live Payment Gateway Webhooks**: Live Razorpay/Stripe webhooks require external tunneling and live merchant keys. Tenders are verified via internal simulation (`provider: 'SIMULATED_GATEWAY'`).
3. **Hardware Bump Bars**: KDS bump bar support is verified via standard USB HID keyboard shortcut listeners (`Space`, `Enter`, `R`, `H`, `E`, `A`). Keyboard shortcuts simulate bump-bar protocol but do not establish physical device compatibility.

These capabilities are classified as:  
`Implemented, not hardware/provider verified`.

---

## 12. Stop Condition Notice
**STOP**: Upon completing Phase 1 implementation and verification, execution will halt immediately. Evidence (test output, diff inspection, runtime checks) will be presented for user review. Phase 2 will not commence until explicit approval is granted.
