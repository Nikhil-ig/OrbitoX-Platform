# 🪐 CraveAtlas — Single-Brand Restaurant Flagship Website
## Comprehensive Product, Technical & Interaction Specification

---

## 1. Executive Overview

**CraveAtlas** (`/apps/crave-atlas`) is the discovery-first flagship restaurant website and customer ordering engine within **OrbitoX RestaurantOS 5.2**.

In previous releases, CraveAtlas presented an incorrect multi-merchant food marketplace model featuring disparate third-party restaurants under "Verified Partner Kitchens". In RestaurantOS 5.2, CraveAtlas has been completely reset to an authoritative **single-brand, multi-branch restaurant digital presence**.

When a guest visits CraveAtlas:
- They see **strictly one culinary brand** (*OrbitoX Bistro & Bar*), its brand story, philosophy, luxury imagery, and contact details.
- They can switch between physical locations (*Ludhiana Main*, *Chandigarh Sector 17*, and *Delhi Connaught Place*).
- Switching branch updates the menu dynamically: reflecting branch-specific price overrides (e.g. ₹580 Butter Chicken in Delhi CP vs ₹520 base in Ludhiana), 86'd out-of-stock items (e.g. Dal Makhani sold out in Chandigarh), and location operating hours.
- Guests can browse categories, perform instant searches, configure dishes with modifier options, review a server-quoted cart with 5% GST, place orders with idempotency guarantees, and track real-time kitchen progress routed to branch KDS stations.
- Non-customized items can be added with 1 tap, instantly transforming the card button into an in-place `[− 1 +]` stepper, while a floating bottom order bar smoothly enters without forcing open the cart drawer.

---

## 2. Architecture & Tenant/Branch Model

CraveAtlas operates under the zero-trust single-brand restaurant hierarchy:

```
Platform (OrbitoX)
  └── Restaurant Tenant / Group (OrbitoX Hospitality)
        └── Restaurant Brand (OrbitoX Bistro & Bar)
              ├── Branch / Location (Ludhiana Main | Chandigarh Sec 17 | Delhi CP)
              │     ├── Branch Operating Hours (Opening, Closing, Live status)
              │     ├── Branch Contact & Address (Mall Rd, Sector 17, Inner Circle CP)
              │     └── Branch Menu Overrides (Price variations, 86'd / Sold-out status)
              └── Customer Ordering Surface (CraveAtlas Flagship Website)
                    └── Branch KDS Task Dispatch (CURRY_LINE, TANDOOR, BAR, APPETIZERS)
```

### URL Resolution & Branch Scope
* **Canonical Entry Route**: `/apps/crave-atlas` (resolves default primary operational branch: `branch_ldh`).
* **Branch-Scoped Route**: `/apps/crave-atlas?branch=:branchId` (e.g. `/apps/crave-atlas?branch=branch_del`).
* **Cross-Tenant Guard**: If a user attempts to supply a non-existent or foreign tenant branch ID, the server rejects with HTTP 400 `INVALID_BRANCH`.

---

## 3. Key Features Matrix

| Feature | Description | Technical Implementation |
| :--- | :--- | :--- |
| **Single-Brand Identity** | Luxury brand presence with zero third-party merchant leakage | Bound to `TenantBrandConfig` (`OrbitoX Bistro & Bar`) |
| **Branch Selector Pill** | Dropdown displaying all valid branches for this brand | Reads `branches[]`, toggles `.ca-branch-dropdown` |
| **Branch Overrides & 86'ing** | Dynamic pricing and stock availability per branch | Evaluated via `store.getResolvedMenuForBranch(activeBranch.id)` |
| **Culinary Hero Section** | Visual storytelling, operating hours, phone, address, and CTA | Dynamic markup with vector SVGs from `packages/ui/icons.ts` |
| **Signature Highlights Carousel** | WAI-ARIA compliant horizontal carousel with desktop arrows & touch swipe | `section[aria-roledescription="carousel"]` with scroll-snap track |
| **In-Place Card Steppers** | `+ ADD` transforms into `[− 1 +]` without opening drawer | `.ca-dish-stepper` active toggle on simple dishes |
| **Dish Customizer Modal** | Modal sheet for dishes with choices (spice, accompaniments) | `#ca-customizer-modal` with live subtotal calculation |
| **Floating Bottom Order Bar** | Mobile-first sticky bar indicating item count and subtotal | `#ca-float-bar` slides up when cart > 0, opens drawer on tap |
| **Outlet Menu Catalog** | Grid of dishes with veg/non-veg markers and SLA badges | Renders `ResolvedMenuItem[]` with price & availability checks |
| **Unified Search & Filters** | Instant search synced with category chips & clear recovery | `applyFilters()` manages `currentCategory` and `currentSearchQuery` |
| **Slide-In Cart Drawer** | Full-height side drawer displaying order folio & breakdown | Right-aligned off-canvas modal with smooth CSS transition |
| **Delivery vs Pickup Toggle** | Switches fulfillment mode; recalculates fees automatically | Updates `fulfillmentMethod` and adjusts ₹40 delivery fee |
| **Authoritative Quoting** | Subtotal, 5% GST, and delivery fees calculated in paise | Integer minor unit arithmetic on client & validated on server |
| **Idempotent Order Placement** | Prevents duplicate orders and charges upon network retries | Sends `x-idempotency-key` header to `POST /api/commerce/orders` |
| **Station Task Routing** | Direct connection to Kitchen Display System (KDS) | Spawns `KitchenTask` records routed to station lines |
| **Live Tracking Modal** | Visual milestone stepper showing kitchen prep progression | Progresses through `RECEIVED` → `CONFIRMED` → `PREPARING` → `READY` |

---

## 4. Full Catalog of User Actions & Event Handlers

The following interactive actions are built into the CraveAtlas client-side runtime:

### 1. `toggleBranchDropdown()`
* **Trigger**: Clicking `#ca-branch-btn` in the top navigation header.
* **Behavior**: Toggles the `.open` CSS class on `#ca-branch-dropdown`.
* **Click-Outside Guard**: Any click outside the button and dropdown automatically closes it.

### 2. `selectBranch(branchId)`
* **Trigger**: Clicking any branch option (`.ca-branch-option`) in the location dropdown.
* **Behavior**:
  1. Checks if the chosen branch is already active; if so, closes the dropdown.
  2. If items exist in the cart, prompts user: *"Switching branch will update menu prices and check item availability for the new location. Proceed?"*
  3. Navigates the browser to `/apps/crave-atlas?branch=${encodeURIComponent(branchId)}`.
* **Safety Invariant**: Prevents silent order submission to an unintended branch.

### 3. `scrollCarousel(direction)` & `updateCarouselButtons()`
* **Trigger**: Clicking `#ca-carousel-prev` (direction `-1`) or `#ca-carousel-next` (direction `+1`).
* **Behavior**: Smoothly scrolls `#ca-carousel-track` by one slide width + gap (`step`).
* **Boundary Handling**: Dynamically disables `#ca-carousel-prev` when at `scrollLeft <= 5`, and `#ca-carousel-next` when scrolled to the end.
* **Keyboard Support**: Listens for `ArrowLeft` and `ArrowRight` on `#ca-carousel-track`.

### 4. `handleHighlightClick(category)`
* **Trigger**: Clicking any slide (`.ca-carousel-slide`) or pressing `Enter`/`Space`.
* **Behavior**: Activates that category chip, filters the menu catalog, and smoothly scrolls to `#menu-catalog`.

### 5. `filterCategory(category)`
* **Trigger**: Clicking any category chip (`.ca-cuisine-chip`).
* **Parameters**: `category: string` (`'ALL'`, `'Starters'`, `'Mains'`, `'Breads'`, `'Beverages'`, `'Desserts'`).
* **Behavior**: Sets `currentCategory`, highlights the active chip, and invokes `applyFilters()`.

### 6. `handleMenuSearch(query)`
* **Trigger**: Typing in the global search input (`#ca-global-search`).
* **Behavior**: Updates `currentSearchQuery`, and invokes `applyFilters()`.

### 7. `applyFilters()` & `clearFilters()`
* **Behavior**: Iterates all `.ca-dish-card` elements, displaying only dishes that satisfy BOTH `currentCategory` and `currentSearchQuery`.
* **Empty State**: Displays `#ca-catalog-empty` if 0 items match.
* **Reset**: `clearFilters()` resets category to `'ALL'`, clears search input, and restores all 9 dishes without page reload.

### 8. `handleAddDish(id)` & `handleCardStepper(id, delta)`
* **Trigger**:
  - Clicking `+ ADD` on simple uncustomized dishes calls `handleAddDish(id)`.
  - Clicking `+` or `−` on `.ca-dish-stepper` calls `handleCardStepper(id, delta)`.
* **Behavior**:
  - Directly adds/increments item in `cart[]`.
  - Does NOT disruptively pop open the cart drawer.
  - Transforms card button into `[− 1 +]` stepper.
  - Smoothly reveals the floating bottom order bar if cart was previously empty.
  - When quantity reaches 0, removes line, reverts button to `+ ADD`, and hides floating bar if cart is empty.

### 9. `openCustomizer(dishId)`, `handleOptionToggle()`, and `confirmCustomizerAdd()`
* **Trigger**: Clicking `+ CUSTOMISE` on dishes with `modifierGroups`.
* **Behavior**:
  - Opens `#ca-customizer-modal` with dish photo, name, and base price.
  - Renders modifier groups: radio buttons for single-choice (`maxSelections === 1`), checkboxes for multi-choice.
  - Computes real-time modal subtotal (`dish.effectivePriceMinor + sum(selected deltas)`).
  - Validates `minSelections` for required groups.
  - Adds configured item as a distinct cart line (`dishId__opt1_opt2`).
  - Card button updates to `CUSTOMISED (X) +`.

### 10. `renderAllCartSurfaces()`
* **Trigger**: Master state synchronizer invoked after every cart modification.
* **Synchronized Surfaces**:
  1. Header badge (`#ca-cart-label`): updates `Order Folio (X)`.
  2. Floating order bar (`#ca-float-bar`): updates item count and subtotal `₹X.XX`; controls visibility.
  3. Menu dish cards: updates steppers and button labels.
  4. Cart drawer items list: renders line items, modifier summaries, unit prices, steppers, and line totals.
  5. Financial summary: updates subtotal, 5% GST, delivery fee, and grand total.

### 11. `toggleCartDrawer()`
* **Trigger**: Clicking header cart button, floating order bar, drawer close button, or dark overlay.
* **Behavior**: Toggles `.open` class on `#ca-cart-drawer` and `#ca-cart-overlay`.

### 12. `setFulfillment(method)`
* **Trigger**: Clicking fulfillment pills (`#btn-fulfill-delivery` or `#btn-fulfill-pickup`).
* **Behavior**: Toggles active styles, updates delivery fee (₹40 for delivery, ₹0 for pickup), and re-quotes total.

### 13. `submitOrder()` & `closeTrackingModal()`
* **Trigger**: Clicking `#ca-submit-order-btn` ("Place Order Now").
* **Behavior**:
  - Generates idempotency key (`x-idempotency-key`).
  - Dispatches `POST /api/commerce/orders`.
  - On HTTP 201: resets cart, closes drawer, opens `#ca-tracking-modal` displaying real order ID and KDS milestone progress.
  - On error: preserves cart and displays message.

---

## 5. API Endpoints Consumed & Provided

### 1. `GET /apps/crave-atlas?branch=:branchId`
* **Purpose**: Server-rendered HTML page for CraveAtlas.
* **Query Parameters**:
  * `branch`: (Optional) Target branch ID. Defaults to `branch_ldh`.

### 2. `GET /api/restaurant/branches`
* **Purpose**: Authoritative list of restaurant outlets.

### 3. `GET /api/restaurant/branches/:id/menu`
* **Purpose**: Retrieves the resolved menu for a specific branch with price overrides and availability flags.

### 4. `POST /api/commerce/orders`
* **Purpose**: Places an authoritative customer order.
* **Headers**: `Content-Type: application/json`, `x-idempotency-key: <key>`
* **Success Response (HTTP 201)**: Returns `orderId`, `status: "ACCEPTED"`, server quote breakdown, and KDS task count.

### 5. `GET /api/commerce/orders/:id`
* **Purpose**: Fetches real-time milestone status linked to Kitchen Display System (KDS) progression.

---

## 6. Visual Design System & Styling Tokens

### CSS Custom Properties (`:root`)
```css
:root {
  /* Brand & Accents */
  --ca-primary: #C86B3C;            /* Terracotta Ember */
  --ca-primary-hover: #B55B2E;      /* Deep Terracotta */
  --ca-primary-subtle: rgba(200, 107, 60, 0.08);
  --ca-gold: #D99A45;               /* Warm Saffron Gold */
  
  /* Surfaces & Backgrounds */
  --ca-bg: #F9F9FA;                 /* Off-white canvas */
  --ca-surface: #FFFFFF;            /* Pure white cards */
  --ca-dark: #14171E;               /* Charcoal black */
  --ca-stone: #4E5463;              /* Secondary slate */
  --ca-muted: #8E95A5;              /* Subtle labels */
  --ca-border: #E6E9EE;             /* Clean border line */
  
  /* Semantic Status */
  --ca-green: #2E8540;              /* Vegetarian dot & success */
  --ca-red: #D9383A;                /* Non-vegetarian dot & sold-out */
  
  /* Radii & Shadows */
  --ca-radius: 12px;
  --ca-radius-sm: 8px;
  --ca-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
  --ca-shadow-hover: 0 10px 32px rgba(0, 0, 0, 0.12);
  
  /* Typography */
  --font-display: "Playfair Display", Georgia, serif;
  --font-heading: "Plus Jakarta Sans", -apple-system, sans-serif;
  --font-body: "Inter", -apple-system, sans-serif;
}
```

### Strict Zero-Emoji Rule
Every visual icon in CraveAtlas is rendered exclusively via vector SVGs through [`packages/ui/icons.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/icons.ts):
- `flame` — Restaurant brand logo
- `map-pin` — Branch location context
- `clock` — Operating hours & prep time
- `phone` — Contact number
- `search` — Menu discovery
- `shopping-bag` — Floating bar & cart trigger
- `sparkles` — Luxury gastronomy badge
- `chevron-left` / `chevron-right` — Carousel navigation
- `arrow-right` — Floating order CTA
- `x` — Modal & drawer dismissal
- `check` — Active selection indicator

---

## 7. Responsive Breakpoints & Viewport Guarantees

CraveAtlas is rigorously audited across 7 canonical viewports with a **0 horizontal overflow** guarantee (`document.documentElement.scrollWidth <= window.innerWidth`):

| Viewport | Device Profile | Layout Behavior |
| :--- | :--- | :--- |
| **390 × 844** | Standard Phone (iPhone 14/15) | Header wraps search box into full-width row 2. Carousel cards display at 250px with partial next-card peek for touch swiping. Floating bottom order bar anchored above home indicator. Single-column menu cards. |
| **430 × 932** | Large Phone (iPhone 15 Pro Max) | Expanded typography. Safe-area bottom padding applied. |
| **768 × 1024** | Tablet Portrait (iPad Mini/Air) | 2-column menu grid. Carousel navigation buttons visible. 380px slide-in cart drawer. |
| **1024 × 768** | Tablet Landscape | 2-column menu grid. Header renders in a single horizontal bar. |
| **1280 × 800** | Small Desktop (MacBook Air 13) | Standard desktop layout. Slide-in cart drawer operates alongside full catalog. |
| **1440 × 900** | Standard Desktop (MacBook Pro) | Flagship 1360px centered container. Rich hover animations. |
| **1920 × 1080** | Full HD Desktop | Wide catalog view with maximized image fidelity and generous whitespace. |
