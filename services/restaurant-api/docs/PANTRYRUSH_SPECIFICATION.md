# 🪐 PantryRush — Dark-Store Quick-Commerce Grocery Application
## Comprehensive Product, Technical & Interaction Specification

---

## 1. Executive Overview

**PantryRush** (`/apps/pantry-rush`) is the dedicated dark-store quick-commerce and gourmet essentials application within **OrbitoX RestaurantOS 5.2**.

Inspired by ultra-fast hyperlocal delivery platforms (such as Swiggy Instamart and Zepto), PantryRush empowers restaurant groups and food enterprises to run high-margin **hyperlocal dark-store retail alongside their culinary operations**. Customers can order pantry staples, chef-crafted spice blends, artisanal dairy, baked breads, marinated proteins, and cold beverages delivered to their doorstep in **12–15 minutes**.

### Strategic Product Tenets:
1. **Single-Brand Multi-Branch Dark-Store Network**: Every branch operates an attached micro-fulfillment dark store (e.g. *Ludhiana Model Town Dark Store #14*, *Chandigarh Sector 17 Hub*, *Delhi Connaught Place Pantry*).
2. **Real Inventory Stock Tracking with Hard Limits**: Unlike general restaurant dishes that are made to order, grocery SKUs track exact physical stock (`stockQuantity`). The client stepper strictly prevents customers from adding more units than physically available.
3. **Graceful Out-of-Stock and Low-Stock Badges**: Items with 0 inventory display disabled `UNAVAILABLE` buttons; items with $\le 3$ units trigger urgency badges (*"Only 2 left!"*).
4. **Authoritative 3-Tier Substitution Policy**: Quick-commerce dark stores frequently face stock discrepancies during rapid picking. Customers select their substitution preference at checkout (`ASK_BEFORE_SUBSTITUTE`, `ALLOW_STORE_REPLACEMENT`, `DO_NOT_SUBSTITUTE`).
5. **Threshold-Based Free Delivery Engine**: Orders $\ge ₹199$ qualify for free delivery; orders below ₹199 incur a flat ₹25 delivery partner fee, combined with an authentic ₹4 handling charge.
6. **High-Density 3-Column Desktop / Responsive Mobile Shelf**: Combines an aisle rail, center shelf grid, and sticky/collapsible basket drawer.

---

## 2. Architecture & Dark-Store Fulfillment Hierarchy

PantryRush integrates seamlessly into the OrbitoX RestaurantOS architecture:

```
Platform (OrbitoX)
  └── Restaurant Tenant / Enterprise (OrbitoX Hospitality)
        └── Restaurant Brand (OrbitoX Bistro & Bar)
              ├── Physical Branch Micro-Hub (Ludhiana Main | Chandigarh Sec 17 | Delhi CP)
              │     ├── Hyperlocal Dark Store SLA (12-15 Mins Delivery)
              │     ├── Pincode Serviceability Engine (e.g. 141001, 160017, 110001)
              │     └── Real-Time Grocery Inventory Store (`GrocerySkuItem[]`)
              └── Customer Ordering Surface (PantryRush Application)
                    ├── Left Navigation: Pantry Aisles Rail
                    ├── Center Canvas: Multi-Column SKU Shelf Grid
                    └── Right Panel: Quick-Commerce Delivery Basket & Substitution Policy Drawer
```

### URL Routing & Scoping
* **Canonical Entry Route**: `/apps/pantry-rush` (resolves primary branch `branch_ldh` and default pincode `141001`).
* **Branch-Scoped Route**: `/apps/pantry-rush?branch=:branchId` (e.g. `/apps/pantry-rush?branch=branch_del`).
* **Pincode & Geolocation Context**: `/apps/pantry-rush?branch=:branchId&pincode=:pincode` (evaluates instant serviceability and dark-store SLA).

---

## 3. Key Features Matrix

| Feature | Description | Technical Implementation |
| :--- | :--- | :--- |
| **Hyperlocal Dark-Store Badge** | Displays live SLA and fulfilling branch micro-store | `.pr-eta-badge` showing `15 Mins · ${activeBranch.name} Outlet` |
| **Pantry Aisles Left Rail** | 1-tap horizontal or vertical navigation through grocery aisles | `.pr-category-rail` filtering cards via `filterGroceryCategory(cat)` |
| **High-Density Shelf Grid** | Visual merchandise grid showing pack size, MRP, discount & stock | CSS Grid `.pr-sku-grid` (4 columns on desktop, 2 on tablet/mobile) |
| **Hard Inventory Stepper** | In-place `[− 1 +]` stepper that enforces physical stock ceiling | `changeSkuQty(skuId, delta, maxStock)` with alert on overflow |
| **Out-of-Stock Protection** | Greys out cards with 0 stock and disables cart additions | Renders `.pr-btn-disabled` button with `UNAVAILABLE` state |
| **Low-Stock Urgency Badges** | Highlights scarce inventory to accelerate conversion | Dynamic `.pr-badge-low-stock` indicator when `stockQuantity <= 3` |
| **Artisanal & Organic Badges** | Highlights chef-crafted and certified organic SKUs | Renders `.pr-badge-organic` badge ("100% Organic") |
| **Real-Time Live SKU Search** | Instant substring filtering across SKU title and brand name | Input listener executing `handleGrocerySearch(query)` |
| **Substitution Policy Selector** | 3-way dropdown for picking replacement instructions | `#pr-sub-preference` selector (`ASK_BEFORE_SUBSTITUTE`, etc.) |
| **Dynamic Free Delivery Engine** | Waives ₹25 delivery fee when basket subtotal $\ge ₹199$ | Real-time calculation in `renderGroceryBasketUI()` |
| **Collapsible Basket Drawer** | Sticky right rail on desktop, toggleable drawer on mobile | `#pr-basket-panel` toggled via `toggleGroceryBasket()` |
| **Zero-Emoji Compliance** | 100% SVG vector iconography across all surfaces | `icon('cart')`, `icon('clock')`, `icon('search')`, etc. |

---

## 4. Full Catalog of User Actions & Event Handlers

PantryRush client-side runtime event handlers:

### 1. `handleGrocerySearch(query)`
* **Trigger**: Input event on `#pr-search-input` in the top sticky header.
* **Parameters**: `query: string`
* **Behavior**:
  1. Normalizes query to lowercase trimmed string.
  2. Iterates over all `.pr-sku-card` elements.
  3. Inspects `data-name` and `data-brand` attributes.
  4. If query matches or is empty, sets `card.style.display = 'flex'`.
  5. Otherwise, sets `card.style.display = 'none'`.

### 2. `filterGroceryCategory(cat)`
* **Trigger**: Clicking any category item (`.pr-cat-link`) in the left aisle rail.
* **Parameters**: `cat: string` (`'ALL'`, `'Dairy, Bread & Eggs'`, `'Fresh Fruits'`, `'Fresh Vegetables'`, `'Pantry Staples'`, `'Cold Drinks & Juices'`, `'Instant Food & Snacks'`, `'Personal Care'`).
* **Behavior**:
  1. Clears `.active` class from all aisle links.
  2. Adds `.active` class to the clicked link.
  3. Iterates over all `.pr-sku-card` elements, reading `data-category`.
  4. Displays matching cards and hides non-matching cards.

### 3. `addGrocerySku(skuId, name, packSize, priceMinor, maxStock)`
* **Trigger**: Clicking the "+ ADD" button (`#btn-add-${skuId}`) on an in-stock SKU card.
* **Parameters**:
  * `skuId: string` — Unique SKU identifier (e.g. `sku_amul_butter_500g`).
  * `name: string` — Display name (e.g. `Amul Salted Butter`).
  * `packSize: string` — Weight or pack volume (e.g. `500 g Carton`).
  * `priceMinor: number` — Selling price in paise (e.g. `27500` for ₹275.00).
  * `maxStock: number` — Exact physical inventory count currently available.
* **Behavior**:
  1. Checks if SKU already exists in `groceryBasket[]`.
  2. If already present:
     - If `existing.quantity >= maxStock`: aborts addition and displays browser alert:
       `"Cannot add more! Only ${maxStock} units available in stock."`
     - Otherwise: increments `existing.quantity += 1`.
  3. If not present: pushes `{ id: skuId, name, packSize, priceMinor, maxStock, quantity: 1 }`.
  4. Calls `updateSkuStepper(skuId, maxStock)`.
  5. Calls `renderGroceryBasketUI()`.

### 4. `updateSkuStepper(skuId, maxStock)`
* **Trigger**: Invoked whenever SKU quantity changes between 0 and >0.
* **Behavior**:
  * Locates container `#sku-stepper-wrap-${skuId}`.
  * If item is in basket with `quantity > 0`: renders active stepper HTML:
    ```html
    <div class="pr-stepper-active">
      <button onclick="changeSkuQty('${skuId}', -1, ${maxStock})">-</button>
      <span>${item.quantity}</span>
      <button onclick="changeSkuQty('${skuId}', 1, ${maxStock})">+</button>
    </div>
    ```
  * If item is not in basket or `quantity === 0`: restores initial `+ ADD` button.

### 5. `changeSkuQty(skuId, delta, maxStock)`
* **Trigger**: Clicking `+` or `-` buttons inside the SKU card stepper or basket row.
* **Parameters**: `skuId: string`, `delta: number` (+1 or -1), `maxStock: number`.
* **Behavior**:
  1. Locates item in `groceryBasket[]`.
  2. If `delta > 0` and `item.quantity >= maxStock`:
     - Blocks increment and displays alert: `"Maximum available inventory reached (${maxStock} units)."`.
     - Returns immediately without modifying state.
  3. Modifies `item.quantity += delta`.
  4. If `item.quantity <= 0`: removes item from `groceryBasket[]`.
  5. Invokes `updateSkuStepper(skuId, maxStock)`.
  6. Invokes `renderGroceryBasketUI()`.

### 6. `renderGroceryBasketUI()`
* **Trigger**: Master state updater called after any grocery basket mutation.
* **Behavior**:
  1. Calculates `totalCount = sum(item.quantity)`.
  2. Updates header button `#pr-basket-badge` to `Basket (${totalCount})`.
  3. If basket is empty:
     - Displays empty placeholder inside `#pr-basket-items`.
     - Sets Item Total and Total to Pay to `₹0.00`.
     - Sets Delivery Partner Fee to `₹25.00`.
     - Returns.
  4. If basket has items:
     - Renders row for each SKU showing name, pack size, unit price, stepper buttons, and line subtotal.
     - Computes line subtotal:
       $$\text{SubtotalMinor} = \sum (\text{item.priceMinor} \times \text{item.quantity})$$
     - Evaluates Free Delivery Threshold ($\ge ₹199.00 = 19,900 \text{ paise}$):
       $$\text{DeliveryFeeMinor} = \begin{cases} 0 & \text{if } \text{SubtotalMinor} \ge 19900 \\ 2500 & \text{if } \text{SubtotalMinor} < 19900 \end{cases}$$
     - Adds fixed Handling Charge:
       $$\text{HandlingFeeMinor} = 400 \text{ paise (₹4.00)}$$
     - Computes Total to Pay:
       $$\text{TotalMinor} = \text{SubtotalMinor} + \text{DeliveryFeeMinor} + \text{HandlingFeeMinor}$$
     - Formats and injects amounts into `#pr-basket-subtotal`, `#pr-delivery-fee` (displaying `"FREE"` or `"₹25.00"`), and `#pr-basket-total`.

### 7. `toggleGroceryBasket()`
* **Trigger**: Clicking the `#pr-basket-badge` button in the header.
* **Behavior**:
  - On viewports $\le 1150\text{px}$: toggles the right-hand `#pr-basket-panel` between `display: none` and `display: block`.
  - On desktop viewports ($> 1150\text{px}$): panel remains persistently pinned.

### 8. `checkoutGroceryOrder()`
* **Trigger**: Clicking `#pr-checkout-btn` ("PLACE GROCERY ORDER →").
* **Behavior**:
  1. Guards against empty basket submissions.
  2. Reads selected substitution policy from `#pr-sub-preference` dropdown.
  3. Dispatches order to fulfillment queue with selected branch dark store ID.
  4. Triggers confirmation notification:
     `"Grocery Order Placed! Packing initiated at ${activeBranch.name} Dark Store. Substitution rule: ${pref}"`
  5. Empties `groceryBasket[]` and resets stepper UI.

---

## 5. Domain Data Models & API Contracts

### Data Model: `GrocerySkuItem`
```typescript
export interface GrocerySkuItem {
  id: string;                      // e.g. "sku_amul_butter_500g"
  name: string;                    // e.g. "Amul Salted Butter"
  brand: string;                   // e.g. "Amul"
  category:                        // Strict pantry taxonomy
    | 'Fresh Vegetables'
    | 'Fresh Fruits'
    | 'Dairy, Bread & Eggs'
    | 'Pantry Staples'
    | 'Cold Drinks & Juices'
    | 'Instant Food & Snacks'
    | 'Personal Care';
  packSize: string;                // e.g. "500 g Carton"
  mrpMinor: number;                // Maximum Retail Price in paise (e.g. 29000 = ₹290.00)
  sellingPriceMinor: number;       // Discounted dark-store price (e.g. 27500 = ₹275.00)
  unitPriceDescription: string;   // e.g. "₹55.00 / 100g"
  stockQuantity: number;           // Real inventory count (e.g. 14 units)
  imageUrl: string;                // High-resolution CDN URL
  isOrganic?: boolean;             // True for bio/organic items
  badge?: string;                  // e.g. "Bestseller", "New"
}
```

### Substitution Policies
```typescript
export type SubstitutionPolicy =
  | 'ASK_BEFORE_SUBSTITUTE'        // Picker will call customer before changing item
  | 'ALLOW_STORE_REPLACEMENT'      // Picker swaps with closest brand/pack size
  | 'DO_NOT_SUBSTITUTE';           // Auto-refund missing items immediately
```

### API Endpoint: `POST /api/commerce/groceries/orders`
* **Headers**: `Content-Type: application/json`, `x-idempotency-key: <key>`
* **Request Payload**:
```json
{
  "branchId": "branch_ldh",
  "pincode": "141001",
  "fulfillmentMethod": "dark_store_express",
  "substitutionPolicy": "ASK_BEFORE_SUBSTITUTE",
  "customerName": "Gourmet Patron",
  "customerPhone": "+91 98140 12345",
  "deliveryAddress": "House 42, Model Town, Ludhiana",
  "items": [
    {
      "skuId": "sku_amul_butter_500g",
      "name": "Amul Salted Butter",
      "packSize": "500 g Carton",
      "quantity": 2,
      "priceMinor": 27500
    },
    {
      "skuId": "sku_sourdough_loaf",
      "name": "Artisan Sourdough Loaf",
      "packSize": "400 g Loaf",
      "quantity": 1,
      "priceMinor": 18000
    }
  ]
}
```
* **Response Payload (HTTP 201 Created)**:
```json
{
  "success": true,
  "orderId": "ord_pantry_88c4d1",
  "branchId": "branch_ldh",
  "darkStoreHub": "Model Town Dark Store #14",
  "estimatedDeliveryMinutes": 14,
  "substitutionPolicy": "ASK_BEFORE_SUBSTITUTE",
  "quote": {
    "subtotalPaise": 73000,
    "deliveryFeePaise": 0,
    "handlingFeePaise": 400,
    "totalPaise": 73400,
    "totalFormatted": "₹734.00"
  },
  "inventoryReserved": true
}
```

---

## 6. Visual Design System & Styling Tokens

PantryRush utilizes a fresh, clean, high-vitality grocery aesthetic with emerald accents and crisp white surfaces:

### CSS Custom Properties (`:root`)
```css
:root {
  /* Brand Freshness Greens */
  --pr-primary: #22C55E;            /* Vibrant Emerald Green */
  --pr-primary-dark: #15803D;       /* Forest Picking Green */
  --pr-primary-subtle: #ECFDF5;     /* Ultra-light Mint Tint */
  
  /* Slate & Contrast Neutrals */
  --pr-dark: #0F172A;               /* Deep Slate Navy */
  --pr-slate: #334155;              /* Card secondary labels */
  --pr-muted: #64748B;              /* Unit price & metadata */
  --pr-bg: #F8FAF8;                 /* Clean organic off-white */
  --pr-surface: #FFFFFF;            /* Pure white shelf tiles */
  --pr-border: #E2E8F0;             /* Clean border separators */
  
  /* Stock & Urgency Accents */
  --pr-amber: #F59E0B;              /* Low-stock warning banner */
  --pr-red: #EF4444;                /* Out-of-stock badge */
  
  /* Radii & Elevation */
  --pr-radius: 10px;
  --pr-radius-sm: 6px;
  --pr-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  
  /* Font Family */
  --font-main: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### Strict Zero-Emoji Rule
Vector SVG icons rendered via `packages/ui/icons.ts`:
- `shopping-bag` — Brand mark & empty state
- `clock` — 15-minute SLA badge
- `search` — SKU search input
- `cart` — Basket trigger & drawer header
- `chevron-right` — Aisle selector navigation
- `alert-circle` — Substitution policy badge

---

## 7. Responsive Viewport Specifications & Breakpoints

Audited across target screen resolutions with **zero horizontal scrolling**:

| Viewport | Profile | Layout Specifications |
| :--- | :--- | :--- |
| **390 × 844** | Standard Phone (iPhone 14/15) | Header wraps search box to full width row 2. ETA badge hidden to preserve header height. Left aisle rail hidden; category chips scroll horizontally. 1-to-2 column SKU shelf grid. Basket drawer slides out on bottom/side when clicking top Basket button. |
| **430 × 932** | Large Phone (iPhone 15 Pro Max) | 2-column SKU shelf grid with 100px media thumbnails. Full-width sticky checkout trigger. |
| **768 × 1024** | Tablet Portrait (iPad Mini/Air) | 2-column SKU shelf grid (`repeat(2, 1fr)`). Category rail hidden to prioritize grid density. Basket panel toggles on tap. |
| **1024 × 768** | Tablet Landscape | 2-column container: 200px aisle rail + 2-to-3 column shelf grid. Basket drawer collapsible via button. |
| **1440 × 900** | Standard Desktop (MacBook Pro) | 3-column layout (`220px 1fr 340px`): Left aisle rail (220px), center 4-column SKU shelf grid, persistent right-hand delivery basket & substitution policy drawer (340px). |
| **1920 × 1080** | Full HD Desktop | High-density 4-column SKU grid with comfortable padding, high-resolution imagery, and live basket summary. |
