# 🪐 RestaurantOS 5.2 — Single-Brand Multi-Branch Acceptance Report

## Executive Summary

RestaurantOS 5.2 executes a definitive architectural and user-experience reset from an incorrect third-party multi-merchant marketplace model to the authoritative **Single-Brand, Multi-Branch Restaurant Commerce Engine**.

Previously, the CraveAtlas customer experience displayed cards for unrelated third-party merchants under "Verified Partner Kitchens". In RestaurantOS 5.2, all customer-facing storefronts represent **strictly one restaurant brand** (*OrbitoX Bistro & Bar*), operating across multiple physical branches (*Ludhiana Main*, *Chandigarh Sector 17*, and *Delhi Connaught Place*). Customers switching branches view alternative locations of the same culinary brand—reflecting branch-specific menu overrides, local pricing, 86'd item availability, and outlet operating hours.

---

## Key Architectural & Domain Enhancements

### 1. Extended Domain Models (`packages/domain/index.ts`)
* **`BranchOpeningHours`**: Configures opening/closing times, days of operation, and live `isOpenNow` status.
* **`BranchRecord`**: Extended with `openingHours`, direct telephone contact, manager email, and location coordinates.
* **`BranchMenuOverride`**: Implements Toast & Square style location-specific overrides:
  * `pricePaise`: Custom branch price in integer minor units (paise).
  * `isAvailable`: Real-time 86'd / sold-out state per branch.
  * `isHidden`: Branch-specific item visibility toggle.
* **`ResolvedMenuItem`**: Authoritative runtime resolution merging global catalog definitions with branch-specific overrides, exposing computed properties `effectivePricePaise`, `effectivePriceFormatted`, `isPriceOverridden`, and `isAvailableAtBranch`.

### 2. File-Backed Storage & Overrides (`packages/storage/store.ts`)
* Added `branchMenuOverrides` array with migration in `init()` and reset in `reseed()`.
* Implemented `getBranchMenuOverrides(branchId?)`, `setBranchMenuOverride(override)`, and `getResolvedMenuForBranch(branchId)`.

### 3. Server APIs & Server-Authoritative Order Engine (`src/server.ts`)
* **`GET /api/restaurant/branches`**: Lists all active branches with operating hours and contact metadata.
* **`GET /api/restaurant/branches/:id`**: Returns specific branch details.
* **`GET /api/restaurant/branches/:id/menu`**: Returns the branch-resolved menu.
* **`GET /api/restaurant/menu/branch-overrides`**: Queries active overrides.
* **`POST /api/restaurant/menu/branch-overrides`**: Persists branch price adjustments and 86'd states.
* **`POST /api/commerce/orders`**: Server-authoritative order placement:
  * Validates target branch existence (rejects invalid branches with HTTP 400 `INVALID_BRANCH`).
  * Enforces 86'd availability at the branch level (rejects orders containing 86'd dishes with HTTP 400 `ITEM_UNAVAILABLE_AT_BRANCH`).
  * Computes quotes using branch-effective prices, calculating subtotal, 5% GST, and delivery/pickup fee in integer minor units.
  * Spawns station-specific `KitchenTask` records for the target branch's KDS (`CURRY_LINE`, `TANDOOR`, `APPETIZER_STATION`, `BAR`).
  * Enforces idempotency via `x-idempotency-key` header to prevent duplicate orders upon network retries.
* **`GET /api/commerce/orders/:id`**: Exposes live order milestone status linked to KDS task progression.

---

## Rebuilt Commerce Surfaces

### 1. CraveAtlas (`/apps/crave-atlas`)
* **Single-Brand Flagship Website**: Features *OrbitoX Bistro & Bar* culinary identity with high-resolution imagery and story.
* **Interactive Branch Selector**: Switch between Ludhiana, Chandigarh, and Delhi CP with immediate live menu recalculation.
* **86'd Item Badges & Disabling**: Sold-out dishes (e.g. Dal Makhani in Chandigarh) display high-contrast `SOLD OUT` badges and disable addition.
* **Slide-in Cart Drawer**: Allows delivery vs dine-in/takeaway toggles, server quote breakdown with 5% GST, and live order placement.
* **Multi-Merchant Removal**: Zero third-party partner kitchen cards.

### 2. SwiftBite (`/apps/swift-bite`)
* **Mobile-First Speed App**: Built specifically for phone viewports (390×844 and 430×932) while scaling to desktop (1440×900 folio view).
* **1-Tap Branch Selector Pill**: Quick switching with truncated address and real-time ETA pill (⚡ 20-25 mins).
* **1-Tap Reorder Carousel**: Direct reordering from previous order favorites.
* **Instant Quantity Stepper**: Items without choices convert instantly into `[- 1 +]` counter buttons.
* **Focused Customizer Bottom Sheet**: Modal sheet for customizing options (e.g., Dum Biryani spice level, gravy style, raita selection).
* **Sticky Bottom Checkout Bar**: Safe-area aware floating bar displaying order summary and 1-tap checkout.

### 3. PantryRush (`/apps/pantry-rush`)
* **Single-Merchant Dark Store Essentials**: Scoped strictly to the restaurant brand's gourmet retail pantry (house masalas, cold brews, par-baked naans).
* **Fulfillment Binding**: Binds dark-store inventory to the selected branch outlet.

### 4. Menu Management Workspace (`/menu`)
* **Toast & Square Overrides Tab**: "Branch Overrides & 86'ing" interface allowing restaurant owners and branch managers to view base catalog pricing side-by-side with branch overrides.
* **Instant 86'd Toggle**: Branch managers can toggle dish availability on/off with 1 click, persisting instantly to server storage.
* **Real-time Price Overrides**: Modify branch-level prices in integer rupees, persisted as paise.

### 5. Kitchen Display System (`/kds?branch=...`)
* **Station Routing**: Orders placed through customer apps automatically generate KDS tickets routed by station (`CURRY_LINE`, `TANDOOR`, etc.) filtered for the target branch.

---

## Test Automation & Verification Results

### 1. RestaurantOS 5.2 Acceptance Suite (`test-commerce-5-2-single-brand.js`)
**Result: Total 45 | Passed 45 | Failed 0 (100% PASS)**

| Scenario | Assertion Description | HTTP Status | Result |
| :--- | :--- | :--- | :--- |
| **Scenario A** | `GET /api/restaurant/branches` returns all 3 branches | 200 OK | ✅ PASS |
| Scenario A | Ludhiana & Delhi CP operating hours accurately configured | - | ✅ PASS |
| Scenario A | `GET /apps/crave-atlas` displays single brand "OrbitoX Bistro & Bar" | 200 OK | ✅ PASS |
| Scenario A | CraveAtlas contains zero multi-merchant partner kitchen cards | - | ✅ PASS |
| Scenario A | CraveAtlas `?branch=branch_del` resolves Delhi CP with price override | 200 OK | ✅ PASS |
| Scenario A | SwiftBite displays single brand header and 1-tap reorder carousel | 200 OK | ✅ PASS |
| Scenario A | Order to non-existent branch rejected with `INVALID_BRANCH` | 400 Bad Request | ✅ PASS |
| **Scenario B** | `POST /api/restaurant/menu/items` creates new dish | 201 Created | ✅ PASS |
| Scenario B | `POST /api/restaurant/menu/branch-overrides` persists branch override | 200 OK | ✅ PASS |
| Scenario B | Ludhiana inherits base price ₹520.00 (`isPriceOverridden: false`) | - | ✅ PASS |
| Scenario B | Delhi receives overridden price ₹590.00 (`isPriceOverridden: true`) | - | ✅ PASS |
| Scenario B | Chandigarh 86'd override marks item unavailable (`isAvailableAtBranch: false`) | - | ✅ PASS |
| **Scenario C** | `POST /api/commerce/orders` creates order with server quote | 201 Created | ✅ PASS |
| Scenario C | Subtotal (₹660), 5% GST (₹33), Delivery fee (₹40), Total (₹733) computed | - | ✅ PASS |
| Scenario C | Order spawns kitchen station tasks routed to `CURRY_LINE` and `TANDOOR` | - | ✅ PASS |
| Scenario C | `GET /api/commerce/orders/:id` tracks live order milestone | 200 OK | ✅ PASS |
| **Scenario D** | Order with 86'd item at Chandigarh branch rejected | 400 Bad Request | ✅ PASS |
| Scenario D | Rejection code is `ITEM_UNAVAILABLE_AT_BRANCH` | 400 Bad Request | ✅ PASS |
| Scenario D | Same dish ordered at Ludhiana (in stock) succeeds | 201 Created | ✅ PASS |
| Scenario D | Pickup fulfillment applies ₹0 delivery fee | - | ✅ PASS |
| **Scenario E** | Replayed order with duplicate `x-idempotency-key` returns original order | 200 OK | ✅ PASS |
| Scenario E | Response confirms `idempotentReplay: true` with zero duplicate creation | - | ✅ PASS |

### 2. Storefront Design Systems Regression Suite (`test-storefront-commerce-flows.js`)
**Result: Total 35 | Passed 35 | Failed 0 (100% PASS)**
* Preserved all 6 canonical restaurant storefront themes:
  1. *Haute Gastronomy* (Atelier Étoile Noir)
  2. *Nordic Minimal* (Fjord & Form Botanical)
  3. *Artisan Coffee & Vitrine* (Roastery 1984 Vitrine)
  4. *Neon Street Food* (Neon Yokocho Night Alley)
  5. *Trattoria Convivial* (Osteria Rustica Convivial)
  6. *Tokyo Izakaya & Ramen* (Shokunin Ramen & Robata)
* Structural divergence across all pairs exceeds 40% (average 49.8%).

### 3. Security & Session Isolation Suite (`test-phase6-security-and-session-isolation.js`)
**Result: Total 31 | Passed 31 | Failed 0 (100% PASS)**
* Cryptographic HMAC-SHA256 staff token verification.
* Table QR session isolation (Party A vs Party B zero data leakage).
* Integer minor-unit financial reconciliation with zero variance.
* Production fail-closed protections.

### 4. TypeScript Strict Compilation
* `npx tsc --noEmit` exited cleanly with code 0 (zero compiler errors).

---

## Responsive Multi-Viewport Audit Matrix

Verified via automated Playwright execution across all 7 required viewports (`scripts/capture-phase5-2-viewports.js`). All layouts achieve **0 horizontal overflow** (`document.documentElement.scrollWidth <= window.innerWidth`).

| Viewport | Device Profile | Inspected Surfaces | Horizontal Overflow | Screenshot Artifact |
| :--- | :--- | :--- | :--- | :--- |
| **390 × 844** | Standard Phone (iPhone 14/15) | CraveAtlas Mobile, SwiftBite Mobile, SwiftBite Customizer Sheet | **0 px (Clean)** | `v5_2_craveatlas_390x844.png`<br>`v5_2_swiftbite_390x844.png`<br>`v5_2_swiftbite_customizer_390x844.png` |
| **430 × 932** | Large Phone (iPhone 15 Pro Max) | CraveAtlas Delhi Branch, SwiftBite Chandigarh Branch (86'd), PantryRush | **0 px (Clean)** | `v5_2_craveatlas_delhi_430x932.png`<br>`v5_2_swiftbite_chandigarh_430x932.png`<br>`v5_2_pantryrush_430x932.png` |
| **768 × 1024** | Tablet Portrait (iPad Mini/Air) | CraveAtlas Tablet, Menu Overrides Management Tab | **0 px (Clean)** | `v5_2_craveatlas_768x1024.png`<br>`v5_2_menu_overrides_768x1024.png` |
| **1024 × 768** | Tablet Landscape | CraveAtlas Tablet Landscape, KDS Delhi Branch Routing | **0 px (Clean)** | `v5_2_craveatlas_1024x768.png`<br>`v5_2_kds_delhi_1024x768.png` |
| **1280 × 800** | Small Desktop (MacBook Air 13) | CraveAtlas Small Desktop with Cart Drawer Open | **0 px (Clean)** | `v5_2_craveatlas_cart_drawer_1280x800.png` |
| **1440 × 900** | Standard Desktop (MacBook Pro) | CraveAtlas Desktop Flagship, SwiftBite 2-Column Folio, Menu Overrides | **0 px (Clean)** | `v5_2_craveatlas_flagship_1440x900.png`<br>`v5_2_swiftbite_desktop_1440x900.png`<br>`v5_2_menu_overrides_desktop_1440x900.png` |
| **1920 × 1080** | Full HD Desktop / Wall Display | CraveAtlas Full HD Flagship, KDS Full HD Wall Display | **0 px (Clean)** | `v5_2_craveatlas_fhd_1920x1080.png`<br>`v5_2_kds_fhd_1920x1080.png` |

---

## Toast POS & Square Comparison Matrix

| Capability | Reference Pattern (Toast / Square) | RestaurantOS 5.2 Implementation | Status |
| :--- | :--- | :--- | :--- |
| **Central Catalog** | Master catalog defined once, inherited by all locations | `store.getMenuItems()` provides base catalog inherited by all branches | ✅ Implemented |
| **Branch Overrides** | Location-level price overrides & 86'd status | `store.getBranchMenuOverrides()` + `setBranchMenuOverride()` | ✅ Implemented |
| **Authoritative Resolution** | Server merges master catalog with branch overrides | `getResolvedMenuForBranch(branchId)` provides merged resolved menu | ✅ Implemented |
| **Order 86'd Validation** | Rejects order placement containing out-of-stock items | `POST /api/commerce/orders` verifies `isAvailableAtBranch` | ✅ Implemented |
| **Station Task Routing** | Kitchen station task generation (`CURRY`, `TANDOOR`, `BAR`) | Spawns `KitchenTask` records tied to target branch KDS stations | ✅ Implemented |
| **Order Idempotency** | Prevents double charging/ordering on client retry | Header `x-idempotency-key` cached in store | ✅ Implemented |
| **Server Price Quoting** | Ignores client prices; calculates tax & total on server | Server recalculates subtotal, 5% GST, and delivery/pickup fee | ✅ Implemented |
| **Hardware Printers** | ESC/POS thermal kitchen printers & ESC/POS cash drawers | Simulated via KDS task logs; physical USB/Ethernet driver deferred | ⚠️ Safe Boundary |
| **EMV Card Terminals** | Square Terminal / Toast Tap hardware integration | Authoritative integer minor-unit simulation; external SDK deferred | ⚠️ Safe Boundary |

---

## Hardware & External Boundaries

1. **Thermal Printers (ESC/POS)**:
   * Real production deployments integrate with network ESC/POS thermal printers (Epson TM-T88VI, Star TSP143). In this single-node runtime environment, kitchen ticket dispatch is rendered digitally on `/kds?branch=...` and persisted in the server store. No external printer drivers are mocked.
2. **Payment Card Terminals (EMV)**:
   * In-person card present transactions are modeled with integer minor units (paise). External terminal SDK handshakes (e.g. Stripe Terminal, Square Reader API) are exposed with clear readiness flags rather than simulating counterfeit hardware success.
