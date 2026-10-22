# 🪐 SwiftBite — Single-Brand Mobile-First Restaurant Ordering App
## Comprehensive Product, Technical & Interaction Specification

---

## 1. Executive Overview

**SwiftBite** (`/apps/swift-bite`) is the primary speed-first, mobile-optimized customer ordering application within **OrbitoX RestaurantOS 5.2**.

While CraveAtlas focuses on culinary discovery, brand storytelling, and an atmospheric flagship website experience, SwiftBite is engineered for **high-velocity, low-friction mobile reordering and quick delivery/takeaway**. Inspired by best-in-class consumer food apps (such as Swiggy and Zomato), SwiftBite emphasizes:
- Ultra-fast browsing with instant category hopping and 1-tap reordering.
- A single-brand, multi-branch architecture: strictly displaying **one restaurant brand** (*OrbitoX Bistro & Bar*) while enabling 1-tap switching across physical branches (*Ludhiana Main*, *Chandigarh Sector 17*, and *Delhi Connaught Place*).
- Instant branch resolution of local pricing overrides (e.g. ₹580 Butter Chicken in Delhi CP vs ₹520 base in Ludhiana), 86'd out-of-stock items (e.g. Dal Makhani sold out in Chandigarh), and location operating hours.
- Direct in-place `[− 1 +]` steppers on uncustomized dishes with zero navigation overhead.
- A focused customizer bottom sheet (`#sb-customizer-modal`) for options-driven dishes.
- A sticky mobile bottom bar on phone viewports (390×844 and 430×932) paired with a persistent 2-column live order folio on desktop screens (1440×900).
- Server-authoritative quoting, integer minor unit (paise) accounting, idempotency protection, and direct KDS task routing.

---

## 2. Architecture & Hierarchy

SwiftBite operates within the single-brand, multi-branch hospitality model:

```
Platform (OrbitoX)
  └── Restaurant Tenant / Group (OrbitoX Hospitality)
        └── Restaurant Brand (OrbitoX Bistro & Bar)
              ├── Branch / Location (Ludhiana Main | Chandigarh Sec 17 | Delhi CP)
              │     ├── Branch Operating Hours (Opening, Closing, Live SLA)
              │     ├── Branch Contact & Address
              │     └── Branch Menu Overrides (Price variations, 86'd status)
              └── Customer Ordering Surface (SwiftBite Speed App)
                    ├── Mobile: Sticky Bottom Order Bar (View Order · ₹XXX)
                    ├── Desktop: Persistent 2-Column Live Order Folio
                    └── Kitchen Routing: Real-time KDS Task Dispatch (CURRY_LINE, TANDOOR, etc.)
```

### URL Routing & Scoping
* **Canonical Entry Route**: `/apps/swift-bite` (resolves primary default branch: `branch_ldh`).
* **Branch-Scoped Route**: `/apps/swift-bite?branch=:branchId` (e.g. `/apps/swift-bite?branch=branch_del`).
* **Table QR Context**: `/apps/swift-bite?branch=:branchId&table=:tableNumber` (binds mobile ordering session to physical table locator).
* **Cross-Tenant Guard**: Non-existent or unauthorized branch IDs are rejected by the server with HTTP 400 `INVALID_BRANCH`.

---

## 3. Key Features Matrix

| Feature | Description | Technical Implementation |
| :--- | :--- | :--- |
| **Mobile-First Responsive Layout** | Optimized for phones (390×844, 430×932) with desktop 2-column folio scaling | CSS Grid with `minmax(0, 1fr) 380px` on desktop and single column on mobile |
| **1-Tap Branch Selector Pill** | Fast location switcher showing outlet code & address | Compact pill in header with `#sb-branch-dropdown` |
| **Fast Delivery SLA Badge** | Real-time prep and delivery estimate from selected branch | `⚡ 20-25 mins (${activeBranch.code})` indicator |
| **1-Tap Reorder Carousel** | Quick reorder combos from past favorites | Horizontal carousel invoking `reorderPair(id1, id2)` |
| **In-Place Fast Stepper** | Simple items turn directly into `[− 1 +]` steppers | `.sb-dish-add-btn` toggles to `.sb-fast-stepper` |
| **Customizer Bottom Sheet** | Modal sheet for items requiring choice selections | `#sb-customizer-modal` with spice profile and size selectors |
| **Sticky Mobile Bottom Bar** | Persistent floating bar on mobile devices | `.sb-mobile-bar` anchored above `env(safe-area-inset-bottom)` |
| **Desktop Order Folio** | Persistent right-hand cart and quote panel on desktop | Sticky `.sb-folio-card` displaying live items, tax, and checkout |
| **Unified Fast Dish Search** | Real-time client-side substring filter on names and descriptions | Input listener executing `handleQuickSearch(query)` |
| **Category Navigation Rail** | 1-tap horizontal chip rail for category jumping | `.sb-cat-rail` filtering dishes via `filterCategory(cat)` |
| **Authoritative Pricing & Quotes** | Recalculates subtotal, 5% GST, and packaging/delivery fees | Integer minor-unit math validated on server |
| **Idempotency Protection** | Prevents duplicate orders and double charges on client retry | Sends `x-idempotency-key` header to `POST /api/commerce/orders` |
| **Station Task Routing** | Direct connection to Kitchen Display System (KDS) | Spawns `KitchenTask` records tied to target branch stations |

---

## 4. Full Catalog of User Actions & Event Handlers

The following interactive actions are built into the SwiftBite client-side runtime:

### 1. `toggleBranchDropdown()`
* **Trigger**: Clicking `#sb-branch-trigger` in the top header.
* **Behavior**: Toggles the `.open` CSS class on `#sb-branch-dropdown`.
* **Click-Outside Guard**: Automatically closes when clicking outside the dropdown container.

### 2. `selectBranch(branchId)`
* **Trigger**: Clicking any branch option (`.sb-branch-item`) in the dropdown.
* **Behavior**:
  1. If selected branch is already active, closes dropdown.
  2. If cart contains items, prompts user: *"Switching branch will update menu pricing and verify availability for this location. Proceed?"*
  3. Navigates the browser to `/apps/swift-bite?branch=${encodeURIComponent(branchId)}`.
* **Safety Invariant**: Re-resolves all branch price overrides and 86'd statuses without cross-tenant leakage.

### 3. `filterCategory(category)`
* **Trigger**: Clicking any category chip (`.sb-cat-btn`) in the horizontal rail.
* **Parameters**: `category: string` (`'ALL'`, `'Starters'`, `'Mains'`, `'Breads'`, `'Beverages'`, `'Desserts'`).
* **Behavior**:
  1. Updates the `.active` styling on category buttons.
  2. Filters `.sb-dish-card` elements matching `data-dish-cat="${category}"`.

### 4. `handleQuickSearch(query)`
* **Trigger**: Typing in the search input (`.sb-search-input`).
* **Behavior**: Substring matching across dish names and culinary descriptions, toggling `display: flex` or `none`.

### 5. `triggerItemAdd(id, name, priceMinor, hasRequiredModifiers)`
* **Trigger**: Clicking the "+ ADD" button (`.sb-dish-add-btn`) on a dish card.
* **Behavior**:
  - **If `hasRequiredModifiers === true`**:
    1. Sets `activeCustomizingItem = { id, name, priceMinor }`.
    2. Populates `#cust-item-name` and `#cust-item-price`.
    3. Opens `#sb-customizer-modal` bottom sheet.
  - **If `hasRequiredModifiers === false`**:
    1. Directly calls `addItemToCart(id, name, priceMinor)`.
    2. Invokes `toggleStepper(id, true, 1)` to transform the card button into `[− 1 +]`.

### 6. `closeCustomizer()`
* **Trigger**: Clicking the close `x` button on `#sb-customizer-modal` or clicking the dark backdrop.
* **Behavior**: Removes `.open` class and resets `activeCustomizingItem = null`.

### 7. `confirmCustomization()`
* **Trigger**: Clicking "Add Customized Item to Order" inside the customizer modal.
* **Behavior**:
  1. Reads selected spice profile (e.g. `Mild`, `Medium`, `Fiery`).
  2. Reads selected portion size handi and calculates option price delta (`data-delta`).
  3. Computes `finalPriceMinor = activeCustomizingItem.priceMinor + deltaMinor`.
  4. Formats name with choices: `Butter Chicken (Medium, Feast Size Handi)`.
  5. Calls `addItemToCart(id, configuredName, finalPriceMinor)`.
  6. Closes customizer modal.

### 8. `addItemToCart(id, name, priceMinor)`
* **Trigger**: Invoked by `triggerItemAdd`, `confirmCustomization`, or `reorderPair`.
* **Behavior**:
  1. Searches `cart[]` for an item matching `name`.
  2. If found, increments `quantity += 1`.
  3. If not found, appends `{ id, name, priceMinor, quantity: 1 }`.
  4. Invokes `renderFolio()`.

### 9. `updateQty(id, delta)`
* **Trigger**: Clicking `+` or `−` in the card stepper or in the persistent order folio.
* **Behavior**:
  1. Locates item in `cart[]`.
  2. Updates `quantity += delta`.
  3. If quantity falls to `0`, removes item from cart and calls `toggleStepper(id, false, 0)`.
  4. If quantity > 0, updates `#qty-${id}` span.
  5. Invokes `renderFolio()`.

### 10. `toggleStepper(id, show, qty)`
* **Trigger**: Called whenever an uncustomized dish switches between 0 and >0 units.
* **Behavior**:
  - If `show === true`: hides `#btn-add-${id}`, displays `#stepper-${id}` as `inline-flex`, sets count to `qty`.
  - If `show === false`: displays `#btn-add-${id}` as `inline-block`, hides `#stepper-${id}`.

### 11. `reorderPair(id1, id2)`
* **Trigger**: Clicking "Reorder Combo" inside the "Order Again in 1-Tap" carousel.
* **Parameters**: Dish IDs of two frequently paired dishes (e.g. `item_butter_chicken` + `item_garlic_naan`).
* **Behavior**:
  1. Looks up both dishes from authoritative catalog `menuItems`.
  2. Automatically adds both dishes to `cart[]` in a single tap.
  3. Updates card steppers and re-renders folio.

### 12. `renderFolio()`
* **Trigger**: Master state updater called on every cart transition.
* **Behavior**:
  1. Computes total item count and line subtotal.
  2. Formats item rows with unit prices, counts, and line subtotals.
  3. Computes:
     $$\text{Subtotal} = \sum (\text{item.priceMinor} \times \text{item.quantity})$$
     $$\text{GST (5\%)} = \operatorname{round}(\text{Subtotal} \times 0.05)$$
     $$\text{Delivery Fee} = 3500 \text{ paise (₹35.00)}$$
     $$\text{Total} = \text{Subtotal} + \text{GST} + \text{Delivery Fee}$$
  4. Updates `#sb-folio-subtotal`, `#sb-folio-tax`, `#sb-folio-total`.
  5. Updates mobile bottom bar `#sb-mobile-cart-count`: `"${totalItems} Items · ₹${totalFormatted}"`.
  6. Toggles `#sb-submit-order-btn` disabled state when cart is empty.

### 13. `submitOrder()`
* **Trigger**: Clicking `#sb-submit-order-btn` ("Dispatch Order (20-25m)").
* **Behavior**:
  1. Sets button text to *"Dispatching to KDS..."* and disables button.
  2. Generates unique idempotency key: `'idemp_sb_' + Math.random().toString(36).substring(2, 12)`.
  3. Dispatches `POST /api/commerce/orders` with target `branchId`, `items[]`, and delivery details.
  4. On HTTP 201: alerts customer with authentic `orderId`, clears cart, and resets folio.
  5. On error (e.g. 86'd item): alerts customer with server error message and preserves cart.
  6. Re-enables button in `finally` block.

---

## 5. API Endpoints Consumed & Provided

### 1. `GET /apps/swift-bite?branch=:branchId`
* **Purpose**: Serves the SwiftBite ordering app.
* **Query Parameters**:
  * `branch`: Target branch identifier (defaults to `branch_ldh`).
  * `table`: (Optional) Table identifier for dine-in ordering (e.g. `T-14`).

### 2. `POST /api/commerce/orders`
* **Headers**: `Content-Type: application/json`, `x-idempotency-key: <key>`
* **Payload**:
```json
{
  "branchId": "branch_del",
  "fulfillmentMethod": "delivery",
  "customerName": "Mobile Patron",
  "customerPhone": "+91 98765 43210",
  "deliveryAddress": "Urban Estate, Phase 2, New Delhi",
  "items": [
    {
      "id": "item_butter_chicken",
      "name": "Murgh Makhani (Old Delhi Style)",
      "quantity": 1,
      "priceMinor": 58000
    },
    {
      "id": "item_garlic_naan",
      "name": "Roasted Garlic Butter Naan",
      "quantity": 2,
      "priceMinor": 9000
    }
  ]
}
```
* **Success Response (HTTP 201)**:
```json
{
  "success": true,
  "orderId": "ord_mkt_55a2bf10",
  "branchId": "branch_del",
  "status": "ACCEPTED",
  "quote": {
    "subtotalPaise": 76000,
    "taxPaise": 3800,
    "deliveryFeePaise": 3500,
    "totalPaise": 83300,
    "totalFormatted": "₹833.00"
  },
  "kitchenTasksCreated": 2,
  "estimatedReadyMinutes": 22
}
```

---

## 6. Visual Design System & Styling Tokens

SwiftBite adopts an energetic, high-contrast, velocity-oriented color scheme inspired by premium food delivery applications:

### CSS Custom Properties (`:root`)
```css
:root {
  /* Brand Velocity Colors */
  --sb-primary: #FC8019;            /* Swiggy/Zomato High-Energy Tangerine */
  --sb-primary-hover: #E46F10;      /* Deep Tangerine */
  --sb-primary-subtle: rgba(252, 128, 25, 0.08);
  
  /* Canvas & Neutral Tones */
  --sb-bg: #F7F7F8;                 /* Clean light-gray backdrop */
  --sb-surface: #FFFFFF;            /* Pure white cards */
  --sb-dark: #171A29;               /* Slate charcoal */
  --sb-stone: #4A4D58;              /* Secondary text */
  --sb-muted: #8D929D;              /* Subtle labels */
  --sb-border: #E5E7EB;             /* Divider lines */
  
  /* Status Colors */
  --sb-green: #2E8540;              /* Fast ETA & Veg indicators */
  --sb-red: #D9383A;                /* Non-veg & 86'd indicators */
  
  /* Radii & Elevation */
  --sb-radius: 12px;
  --sb-radius-sm: 8px;
  --sb-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  --sb-shadow-hover: 0 8px 24px rgba(0, 0, 0, 0.1);
  
  /* Modern Typography */
  --font-display: "Plus Jakarta Sans", -apple-system, sans-serif;
  --font-body: "Inter", -apple-system, sans-serif;
}
```

### Strict Zero-Emoji Rule
Every interactive control renders vector SVGs via [`packages/ui/icons.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/icons.ts):
- `zap` — Swift brand badge
- `map-pin` — Location context
- `clock` — SLA & ETA timer
- `search` — Real-time dish search
- `refresh` — 1-tap reorder indicator
- `chevron-down` — Branch dropdown trigger
- `check` — Selection checkmark
- `shopping-bag` — Folio & checkout trigger

---

## 7. Responsive Viewport Specifications & Breakpoints

Audited across all target resolutions with **0 horizontal overflow**:

| Viewport | Profile | Layout Specifications |
| :--- | :--- | :--- |
| **390 × 844** | Standard Phone (iPhone 14/15) | Header wraps search box to row 2. ETA pill hidden to avoid row overflow. Desktop folio hidden (`display: none`). Sticky bottom bar (`.sb-mobile-bar`) fixed at bottom with safe-area bottom inset. Single-column dish feed. Compact 95px dish thumbnails. |
| **430 × 932** | Large Phone (iPhone 15 Pro Max) | Expanded typography. Reorder cards display at 220px width. Full-width sticky checkout bar. |
| **768 × 1024** | Tablet Portrait (iPad Mini/Air) | Single-column feed with mobile bottom checkout bar active. |
| **1024 × 768** | Tablet Landscape | 2-column layout active: Main dish feed on left, sticky order folio panel on right (380px). |
| **1440 × 900** | Standard Desktop (MacBook Pro) | Full 1320px container: `grid-template-columns: minmax(0, 1fr) 380px`. Sticky order folio stays visible while scrolling catalog. |
| **1920 × 1080** | Full HD Desktop | Wide view with comfortable padding, high-density item feed, and persistent checkout folio. |
