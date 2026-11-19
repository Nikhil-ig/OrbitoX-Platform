# 🪐 RESTAURANTOS 5.2 — SINGLE-BRAND, MULTI-BRANCH COMMERCE & RESTAURANT POS ARCHITECTURE

**Document ID**: `RESTAURANTOS-5.2-COMMERCE-PLAN`  
**Status**: APPROVED & ACTIVE ARCHITECTURAL DIRECTIVE  
**Date**: October 2026  
**Target Runtime**: `projects/external-os/restaurant-os` (Port 4010)  
**Control Plane**: OrbitoX Control Plane (Port 3005)  
**Author**: Antigravity Principal Architecture Team  

---

## 1. Executive Summary & Problem Reset

In RestaurantOS 5.1, initial multi-experience templates (`CraveAtlas`, `SwiftBite`, and `PantryRush`) were introduced. However, CraveAtlas presented a multi-merchant marketplace showing disparate, unrelated restaurants ("Verified Partner Kitchens"). 

### 1.1 The Core Problem
RestaurantOS is an enterprise restaurant SaaS and hospitality operating system designed for **individual restaurant brands and restaurant groups**. A restaurant owner subscribes to RestaurantOS to power **their own brand's digital presence**, including:
1. Branded public customer website with culinary storytelling and online ordering.
2. High-conversion mobile ordering PWA for rapid food delivery and takeaway.
3. Connected Kitchen Display System (KDS), floor management, and POS.
4. Multi-location / branch management with centralized menu catalog and branch-specific pricing, availability (86'ing), and operating hours.

A patron ordering from "OrbitoX Bistro & Bar" must **never see competitor restaurants or partner kitchens**. When the customer switches locations (e.g., from *Ludhiana Main* to *Delhi Connaught Place*), they are switching to another outlet of the **same brand**, viewing branch-resolved availability, localized pricing, and outlet-specific fulfillment schedules.

---

## 2. Industry Research & POS Systems Analysis

### 2.1 Toast Restaurant POS & Multi-Location Management
*References*:
- [Toast Restaurant POS](https://pos.toasttab.com/restaurant-pos)
- [Toast Multi-Location Management](https://pos.toasttab.com/products/multi-location-management)
- [Toast Menu Management](https://support.toasttab.com/en/article/Get-Started-With-Menus)

**Key Toast Patterns Documented**:
1. **Master Menu vs Location Menus**: Toast utilizes an enterprise master menu containing root items, categories, and modifier definitions. Outlets inherit this master structure, preventing duplication of menu maintenance across dozens of branches.
2. **Location-Specific Overrides**:
   - **86'ing (Availability)**: Outlets can mark items as "Unavailable" or set a countdown quantity without affecting other branches.
   - **Price Overrides**: Locations with higher rent or distinct market demographics can override the base price while keeping the item identity consistent.
   - **Service Hours**: Different locations operate on different schedules (e.g., mall outlet closes at 10 PM; standalone downtown outlet operates late-night until 1 AM).
3. **Kitchen Ticket Routing**: When an order is placed on Toast Go handhelds or Toast Online Ordering, items are split and routed to distinct KDS hardware stations based on station assignment (Grill, Saute, Cold/Salad, Bar, Expo).

### 2.2 Square for Restaurants & Multi-Channel Management
*References*:
- [Square Restaurant Menu Management](https://squareup.com/help/us/en/article/6424-create-menus-with-square-for-restaurants)
- [Square Multi-Channel Menu Management](https://squareup.com/help/us/en/article/8553-manage-your-menus-across-locations-and-sales-channels)

**Key Square Patterns Documented**:
1. **Channel-Aware Visibility**: Menu items can be selectively published to POS, Online Store, or Delivery channels.
2. **Unified Item Library**: Shared item attributes (modifiers, dietary tags, photos) with location-level stock tracking and pricing.
3. **Modifier Inheritance**: Required options (e.g. choice of protein or size) vs optional add-ons with custom price deltas.

### 2.3 Baymard Food-Delivery & Takeout UX Benchmark (2026)
*References*:
- [Baymard Online Food Delivery Research](https://baymard.com/research/online-food-delivery)
- [Baymard 2026 Food Delivery UX Benchmark](https://baymard.com/research-articles/food-delivery-and-takeout-ux-benchmark-2026)

**Key UX Patterns Documented**:
1. **Single-Brand Fulfillment Transparency**: Patrons require unambiguous clarity on the active branch fulfilling their food, its preparation SLA, and direct contact info.
2. **1-Tap Add vs Customization Modals**: Items without required modifiers should support instantaneous 1-tap addition from menu cards. Items with mandatory choices must trigger a focused bottom sheet preventing premature submission.
3. **Cart Validation on Location Switch**: If a user switches fulfillment locations while having items in their cart, the system must validate stock and pricing against the new branch, alerting the user to any price differences or unavailable items before clearing or mutating the cart.

---

## 3. Comparative Capability Matrix: Toast / Square vs. RestaurantOS 5.2

| Capability | Reference Standard (Toast / Square) | Existing RestaurantOS 5.1 Status | Required Work in 5.2 | Acceptance Test |
| :--- | :--- | :--- | :--- | :--- |
| **Central Menu Catalog** | Shared master menu with categories, items, and modifiers | `store.getMenuItems()` stored in atomic JSON store | Preserve central catalog; add structured modifier editing & category sorting | Create/edit dish in `/menu`; verify persistence across store |
| **Branch Overrides** | Location-level availability (86'ing), price overrides, and hours | Brand config had theme overrides only; menu items lacked branch overrides | Implement `BranchMenuOverride` domain model in store: `isAvailable`, `priceOverrideMinor` | Set Delhi CP price to ₹580 vs Ludhiana ₹540; verify branch menu |
| **Branch Resolution** | URL/query/context resolves outlet of same brand | CraveAtlas showed 6 different restaurant brands | Rewrite CraveAtlas & SwiftBite to resolve selected branch of single brand | Switch branches; verify brand remains constant and address/pricing updates |
| **Channel-Aware Visibility** | Items can be enabled for Dine-in, Takeaway, or Online | Global availability only | Add sales channel filter support (`DINE_IN`, `ONLINE_TAKEOUT`) | Filter menu items by channel; verify visibility |
| **Connected POS / KDS** | Online orders route directly to branch KDS stations | Commerce orders emitted domain event but didn't spawn `KitchenTask` records | Inject online orders into `RestaurantOrder` & `KitchenTask` for target branch | Place CraveAtlas/SwiftBite order; verify appearance on `/kds?branch=...` |
| **Cart Guard on Branch Switch** | Checks if cart items are available & re-quotes at new branch | Guarded against different restaurants, not branches | Guard cart against branch item availability and re-price items on branch switch | Add item in Ludhiana; switch to branch where item is 86'd; verify warning |
| **Financial & Idempotency** | Integer minor units (cents/paise), idempotent replay | Implemented via `x-idempotency-key` & integer paise | Preserve and extend idempotency across all commerce ordering endpoints | Replay POST request with duplicate key; verify identical response & 0 duplicate tasks |

---

## 4. Architectural Domain & Data Contracts

### 4.1 Hierarchical Domain Model
```
Platform (OrbitoX Engine)
 └── Tenant / Restaurant Group (tenant_orbitox_bistro)
      └── Restaurant Brand (OrbitoX Bistro & Bar)
           ├── Master Menu Catalog (MenuItems, ModifierGroups)
           ├── Shared Brand Tokens (Logo, Colors, Fonts, Story)
           └── Branch Locations (BranchRecords)
                ├── branch_ldh (Ludhiana Main)
                │    ├── Hours: 12:00 - 23:30
                │    ├── Tables: T-1 to T-28
                │    ├── KDS Stations: TANDOOR, CURRY_LINE, BAR, DESSERT
                │    └── Menu Overrides: (All available, base prices)
                ├── branch_chd (Chandigarh Sector 17)
                │    ├── Hours: 11:30 - 23:00
                │    ├── Tables: T-1 to T-22
                │    └── Menu Overrides: (Garden patio specials)
                └── branch_del (Delhi Connaught Place)
                     ├── Hours: 12:00 - 01:00 (Late Night)
                     ├── Tables: T-1 to T-34
                     └── Menu Overrides: (Price deltas +₹40, item_dal_makhani 86'd test)
```

### 4.2 Branch Menu Override Contract
```typescript
export interface BranchMenuOverride {
  itemId: string;
  branchId: string;
  isAvailable: boolean;          // true = available, false = 86'd / sold out at this branch
  priceOverrideMinor?: number;   // if defined, overrides MenuItem.basePriceMinor
  formattedPriceOverride?: string;
  customPrepMinutes?: number;
}

export interface ResolvedMenuItem extends MenuItem {
  isAvailableAtBranch: boolean;
  effectivePriceMinor: number;
  effectiveFormattedPrice: string;
  isPriceOverridden: boolean;
  sourceBranchId: string;
}
```

### 4.3 Branch Record Extension
```typescript
export interface BranchRecord {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  timezone: string;
  currency: string;
  status: 'OPERATIONAL' | 'SETUP' | 'OFFLINE';
  serviceAreasCount: number;
  activeTablesCount: number;
  openingHours?: {
    openTime: string;
    closeTime: string;
    daysOpen: string;
    isOpenNow?: boolean;
  };
  phone?: string;
  email?: string;
}
```

---

## 5. Experience Architecture & Redesigns

### 5.1 Template A: CraveAtlas (Single-Brand Flagship Website)
- **Role**: The official discovery and brand website for the restaurant brand (e.g. *OrbitoX Bistro & Bar*).
- **Header**: Restaurant brand logo, brand title, branch selector (`Ludhiana Main`, `Chandigarh Sector 17`, `Delhi Connaught Place`), global dish search, online ordering CTA, active cart button.
- **Hero Section**: High-impact editorial culinary hero showcasing the restaurant's signature dining concept (e.g. Charcoal Embers, Heritage Tandoor, Sommelier Pairings) with "Order Online" and "Book a Table" buttons.
- **Brand Story & Culinary Philosophy**: Editorial narrative with heritage highlights, chef recommendations, and artisan sourcing.
- **Branch-Aware Menu Explorer**:
  - Live category navigation (Starters, Mains, Breads, Beverages, Desserts).
  - Branch availability indicators (displays "Sold Out at this Location" if 86'd for selected branch).
  - Effective branch pricing (displays branch-specific price overrides).
  - Veg / Non-Veg / Dietary badges.
  - Modifiers configuration.
- **Slide-in Cart & Order Folio**:
  - Item listing with quantity steppers.
  - Fulfillment option: Delivery (with delivery address) vs Pickup at branch.
  - Authoritative quote: Subtotal + 5% GST + Delivery/Packaging Fee.
  - One-tap submission with idempotency protection.
- **Connected Order Tracking**: Direct link to live order status connected to KDS.

### 5.2 Template B: SwiftBite (Single-Brand High-Velocity Mobile Ordering App)
- **Role**: Speed-first mobile food ordering application for the restaurant brand.
- **Mobile-First Layout**: Optimized for 390×844 and 430×932 viewports with thumb-friendly controls and zero layout jumps.
- **Speed Topbar**: Brand logo, 1-tap branch switcher pill, dynamic delivery ETA badge (e.g. `20-25 mins from Ludhiana Main`), instant dish search.
- **1-Tap Category Rail**: Horizontal scroll with active state.
- **"Order Again in 1-Tap" Carousel**: Populated from real customer order history in the store.
- **Menu Feed & Fast Add**:
  - Items with no required modifiers (e.g. *Tandoori Roti*) feature 1-tap addition that transitions into an inline `[- 1 +]` stepper directly on the card face.
  - Items with required modifier groups (e.g. *Murgh Makhani* with Portion Size and Spice Level) open a targeted bottom sheet modal.
- **Persistent Mobile Order Bar**: Floating bottom pill displaying item count, subtotal, and "View Cart & Checkout →" action.
- **Order Tracking**: Genuine milestone progression tied to branch KDS.

### 5.3 Template C: PantryRush (Single-Brand Gourmet Pantry & Essentials)
- **Role**: Gourmet retail and dark-store pantry extension for the restaurant brand (e.g., house spice blends, bottled cold brews, artisanal breads, packaged curries, dessert jars).
- **Branch/Fulfillment Inventory**: Stock counts verified against the specific outlet or dark-store fulfillment center.
- **Hard Stock Limits**: Prevents ordering units exceeding real inventory.
- **Explicit Substitution Workflow**: `ASK_BEFORE_SUBSTITUTE`, `ALLOW_STORE_REPLACEMENT`, `DO_NOT_SUBSTITUTE`.

---

## 6. Restaurant Management & Menu Workspace (`/menu`, `/studio`, `/operations/locations`)

### 6.1 Menu Workspace Enhancements (`/menu`)
1. **Catalog CRUD**:
   - Create new culinary items with image URL, description, category, base price, prep SLA, station, allergens, dietary flags.
   - Edit existing items with comprehensive modal.
   - Delete items safely.
2. **Branch Overrides Tab / Manager**:
   - Dropdown to select target branch (`Ludhiana Main`, `Chandigarh Sector 17`, `Delhi Connaught Place`).
   - Table of items showing:
     - Item Name & Category
     - Base Catalog Price
     - Branch Price Override field (e.g. ₹580 vs base ₹540)
     - Availability Toggle: **Available** vs **86'd / Sold Out**
     - Status Badge: `[Inherited from Base]` vs `[Branch Override Active]` vs `[Sold Out]`
   - API: `POST /api/restaurant/menu/branch-overrides` (saves override and flushes to persistent store).

### 6.2 Locations Workspace (`/operations/locations`)
- Full branch details: Name, code, street address, city, timezone, currency, opening hours, contact phone/email.
- Add branch / Edit branch modal with authoritative persistence.

---

## 7. Connected POS, KDS & Order Workflow

1. **Submission**:
   - Patron submits order via CraveAtlas (`/apps/crave-atlas`), SwiftBite (`/apps/swift-bite`), or Diner PWA (`/dine/:locator`).
   - Request includes `branchId`, `items`, `modifiers`, `fulfillmentMethod`, `customer`, `idempotencyKey`.
2. **Server Quote & Validation**:
   - Server re-calculates prices from branch-resolved menu.
   - Verifies all items are available at `branchId`. Rejects if 86'd.
3. **Domain Order Creation**:
   - Creates `RestaurantOrder` with unique `orderId`, `branchId`, and integer minor unit totals.
   - Spawns `KitchenTask` records for the target branch's kitchen stations (`TANDOOR`, `CURRY_LINE`, `BAR`, `DESSERT`).
   - Records monotonic event `COMMERCE_ORDER_CREATED` in the outbox.
4. **Operations & KDS Ingestion**:
   - Order appears immediately on `/kds?branch=:branchId`.
   - Chefs can bump tasks through standard states: `QUEUED` → `IN_PROGRESS` → `READY` → `BUMPED`.
   - Appears on `/operations/orders?branch=:branchId`.

---

## 8. Implementation Roadmap & Acceptance Criteria

### Phase 1: Domain & Storage Foundation
- [x] Add `BranchMenuOverride` and `ResolvedMenuItem` interfaces to `packages/domain/index.ts`.
- [x] Extend `BranchRecord` with opening hours and contact info.
- [x] Add branch override storage and query methods to `packages/storage/store.ts`:
  - `getBranchMenuOverrides(branchId?: string)`
  - `setBranchMenuOverride(override: BranchMenuOverride)`
  - `getResolvedMenuForBranch(branchId: string)`
- [x] Pre-populate realistic branch overrides (e.g., Delhi CP price premium, specific item sold-out states).

### Phase 2: Single-Brand Multi-Branch Customer Routing & API Contracts
- [x] Enhance `/apps/crave-atlas` to accept `?branch=:branchId` and resolve the single restaurant brand and its branches.
- [x] Enhance `/apps/swift-bite` to accept `?branch=:branchId` and resolve the single restaurant brand and its branches.
- [x] Add API endpoints:
  - `GET /api/restaurant/branches/:branchId/menu`: Returns branch-resolved menu with effective prices and availability.
  - `POST /api/restaurant/menu/branch-overrides`: Saves branch override.
  - `POST /api/commerce/orders`: Connected order ingestion creating `RestaurantOrder` and `KitchenTask` records for the selected branch.

### Phase 3: Rebuild CraveAtlas as Single-Brand Discovery Website
- [x] Redesign `packages/ui/pages/crave-atlas.ts`:
  - Clean restaurant brand header with branch selector.
  - High-impact culinary storytelling hero for *OrbitoX Bistro & Bar*.
  - Category explorer and signature chef dishes.
  - Branch-aware menu grid with Veg/Non-Veg icons, modifiers, and branch availability.
  - Slide-in cart with delivery/pickup toggle, GST, and server-authoritative quote.
  - Real order submission and live status drawer.

### Phase 4: Rebuild SwiftBite as Mobile-First Ordering App
- [x] Redesign `packages/ui/pages/swift-bite.ts`:
  - Dedicated mobile-first layout (390×844 & 430×932) with thumb-zone controls.
  - Brand header with branch selector pill & 20-25 min delivery SLA.
  - 1-tap category rail & "Order Again in 1-Tap" favorites.
  - 1-tap fast add for uncustomized items (`[- 1 +]`) and bottom sheet for customizable items.
  - Persistent mobile cart pill and checkout flow.

### Phase 5: Enhance Menu Workspace with Branch Overrides
- [x] Update `packages/ui/pages/menu.ts`:
  - Add "Branch Overrides & 86'ing" tab.
  - Branch selector dropdown.
  - Price override and availability toggle controls per item.
  - Immediate persistence to server.

### Phase 6: Automated Verification & Responsive Visual Capture
- [x] Create comprehensive E2E test suite `scripts/test-commerce-5-2-single-brand.js` testing Scenarios A through E.
- [x] Capture screenshots across all 7 viewports (390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080).
- [x] Produce `docs/restaurantos/RESTAURANTOS_5_2_ACCEPTANCE_REPORT.md` and user showcase artifact.

---
*End of Implementation Plan.*
