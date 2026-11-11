# 🪐 RestaurantOS 5.2 — Operations, POS/KDS & Multi-Branch Management
## Comprehensive Product, Technical & Interaction Specification

---

## 1. Executive Overview

**RestaurantOS 5.2 Operations Engine** provides the mission-critical back-of-house (BOH) and front-of-house (FOH) operational spine for single-brand, multi-branch restaurant hospitality enterprises.

While consumer storefronts (**CraveAtlas**, **SwiftBite**, and **PantryRush**) manage customer discovery and order placement, the **Operations Engine** orchestrates:
1. **Master Menu Management & Multi-Location Branch Overrides** (`/menu`): Toast & Square 2026-grade catalog workspace supporting base catalog inheritance, branch-specific price overrides, and instantaneous 86'ing (marking items out-of-stock).
2. **Kitchen Display System (KDS) & Station Task Routing** (`/kds`): High-contrast, commercial touchscreen instrument routing preparation tasks across culinary stations (`TANDOOR`, `CURRY_LINE`, `BAR`, `DESSERT`, `EXPO`).
3. **Physical Table QR Dine-In Ordering & Session Isolation** (`/dine/:locator`): Zero-trust physical table ordering where permanent QR codes securely bind to live table sessions with HMAC-authenticated `GuestCapability` tokens.
4. **Multi-Branch Organization & Floor Management** (`/operations/locations`): Management of physical outlets, service areas, tables, timezones, and operational statuses.

---

## 2. Multi-Branch Architecture & Inheritance Model

The enterprise data hierarchy follows an authoritative inheritance pattern:

```
Platform (OrbitoX Core)
  └── Organization / Tenant Group (OrbitoX Hospitality)
        └── Restaurant Brand (OrbitoX Bistro & Bar)
              │
              ├── Base Menu Catalog (`MenuItem[]`)
              │     ├── Master Pricing (in integer paise)
              │     ├── Category Taxonomy (Starters, Mains, Breads, etc.)
              │     ├── Kitchen Station Binding (TANDOOR, CURRY_LINE, BAR)
              │     ├── Preparation SLAs & Dietary Flags (Veg, Non-Veg, Allergens)
              │     └── Modifier Groups (Sizes, Spice Profiles, Add-ons)
              │
              ├── Branch Fleet (`BranchRecord[]`)
              │     ├── Branch A: Ludhiana Main (LDH-01) ── Inherits Base Menu
              │     ├── Branch B: Chandigarh Sec 17 (CHD-02) ── Overrides: 86'd Dal Makhani
              │     └── Branch C: Delhi CP (DEL-03) ── Overrides: +₹60 on Butter Chicken
              │
              └── Operational Surfaces
                    ├── Menu Workspace (/menu) ── Catalog & Overrides
                    ├── Kitchen Instrument (/kds) ── Real-Time Line Routing
                    ├── Table Dine-In PWA (/dine/:locator) ── QR Session Isolation
                    └── Locations Manager (/operations/locations) ── Branch Fleet
```

### Inheritance Resolution Algorithm
When any client (storefront, POS, or table QR) requests menu items for branch $B$:
$$\text{EffectivePrice}(Item, B) = \begin{cases} \text{Override.priceOverrideMinor} & \text{if override exists for } (Item, B) \\ \text{Item.basePriceMinor} & \text{otherwise} \end{cases}$$
$$\text{IsAvailable}(Item, B) = \begin{cases} \text{Override.isAvailable} & \text{if override exists for } (Item, B) \\ \text{Item.isAvailable} & \text{otherwise (defaults to true)} \end{cases}$$

If an item is marked `isAvailable === false` (86'd) at Branch $B$, consumer storefronts immediately render it as disabled (`UNAVAILABLE` / `SOLD OUT`), and order submission endpoints reject any line items containing it with HTTP 400 `ITEM_86ED`.

---

## 3. Menu Workspace & Branch Overrides Specification (`/menu`)

### Functional Tabs & Layout
The menu workspace provides a two-tab interface modeled after modern Toast POS systems:

#### Tab 1: Master Menu Catalog (`#view-menu-catalog`)
* **Menu Intelligence & Quality Assistant**:
  Algorithmic recommendations highlighting:
  - *Margin Opportunities* (e.g. "Dal Makhani boasts a 72% gross margin and 94% guest satisfaction. Elevating to top category position can generate +₹18,000/mo").
  - *Modifier Optimizations* (e.g. "Missing Spice Customizer on Starters").
  - *Photography Audits* (e.g. "High Demand Dish Missing Studio Photography").
* **Category Filters & Real-Time Search**:
  Instant filtering across `ALL`, `Starters`, `Mains`, `Breads`, `Beverages`, and `Desserts`.
* **Master Dish Table**:
  Renders columns: *Dish Details*, *Category*, *Station*, *Base Price*, *SLA*, *Actions*.
* **Dish Edit Modal (`#item-modal`)**:
  Allows editing Base Price, Prep SLA, and Target Kitchen Station.

#### Tab 2: Branch Overrides & 86'ing (`#view-menu-overrides`)
* **Target Outlet Context Selector**:
  Selects active branch from dropdown (`#branch-override-select`), updating the override table dynamically.
* **Inheritance Table**:
  - Displays *Dish Name*, *Base Price*, *Branch Price (Override Input)*, *Availability Toggle*, and *Action*.
  - When an override price is left empty, the placeholder clearly reflects the inherited base price (`Base (₹520)`).
* **Instant 86'ing Toggle**:
  Clicking the availability toggle (`#ov-avail-btn-${id}`) switches between:
  - `● Available` (Button: Secondary Sage)
  - `○ 86'd (Sold Out)` (Button: Primary Crimson `#DC2626`)
* **Override Persistence (`saveBranchOverride(itemId)`)**:
  Dispatches `POST /api/restaurant/menu/branch-override` with:
  ```json
  {
    "branchId": "branch_del",
    "itemId": "item_butter_chicken",
    "priceOverrideMinor": 58000,
    "isAvailable": true
  }
  ```

---

## 4. Kitchen Display System (KDS) Specification (`/kds`)

The KDS is a purpose-built, high-contrast, edge-resilient kitchen instrument designed for commercial touchscreens in high-heat restaurant environments.

### Ergonomics & Layout
* **Color Palette**: Ultra-deep contrast canvas (`#06080B`), pure white typography, high-visibility status accents (Amber, Copper, Emerald, Crimson).
* **Touch Targets**: Minimum **54px touch targets** for quick gloved-hand interaction.
* **Connectivity Badge**: Live heartbeat indicator (`● ONLINE · Edge Synced`).
* **Shift Context**: Displays active outlet and service shift (e.g. `Ludhiana Main · Dinner Service`).
* **Rush Mode Indicator**: Automatically detects heavy load when active tickets $\ge 4$, displaying an emergency pulse banner.

### Station Categorization & Navigation
| Station Key | Label | Scope & Purpose |
| :--- | :--- | :--- |
| `ALL` | All Tickets | Complete view of every active ticket across all stations |
| `ALL_DAY` | All Day Production | Aggregates item quantities across all tables + estimates raw ingredients |
| `TANDOOR` | Tandoor | Clay oven items (Naans, Rotis, Tikkas, Kebabs) |
| `CURRY_LINE` | Curry Line | Handi curries, gravies, dals, and biryanis |
| `BAR` | Bar & Drinks | Specialty beverages, cold brews, lassis, mocktails |
| `DESSERT` | Dessert | Gulab Jamun, Kulfi, Halwa, baked treats |
| `EXPO` | Expo Command | Expediter station: groups tickets by table, validates complete vs partial orders, triggers `[ Send to Table ]` dispatch |
| `PREVIEW` | Fire Queue | Visualizes DAG course timings and scheduled fire delays |
| `RECALL` | Recall Fulfilled | Displays bumped tickets with 1-tap undo capability |

### All Day Production Aggregation
In `ALL_DAY` mode, the KDS calculates cumulative item counts and translates them into live kitchen prep batches:
* Aggregates identical dishes across different tables (e.g. *"Butter Naan: 14 pcs across T-14, T-02, T-08"*).
* Projects ingredient consumption estimates:
  - Cottage Cheese (Paneer): 3.4 kg
  - Black Lentils (Urad Dal): 6.2 kg
  - Farmhouse Butter: 2.8 kg
  - Refined Bread Flour: 8.0 kg

### Hardware Bump Bar & Keyboard Shortcuts
Built for fast, physical bump bar integration without touching the screen:
* `Space` — Bump selected active ticket
* `Enter` — Mark highlighted line item ready
* `R` — Toggle Rush Mode override
* `H` — Hold / Unhold ticket
* `E` — Switch to Expo Command view
* `A` — Switch to All Day Production view

---

## 5. Physical Table QR Dine-In Ordering PWA (`/dine/:locator`)

### Zero-Trust Session Isolation Architecture
Every dining table in an OrbitoX restaurant features an immutable physical QR code encoding a random 10-character locator (e.g. `/dine/7Kp9xQ8m2L` for Table 14).

#### Threat Model & Security Invariants:
1. **Public Locators Never Leak PII**: Visiting `/dine/:locator` without a valid guest session token displays only the table discovery state and the restaurant's branded menu. It never returns previous guest tabs, payment data, or customer names.
2. **Ephemeral Guest Tokens**: When a guest opens a tab or places an order, the server generates a cryptographically signed HMAC token (`GuestCapability`) bound to `(tenantId, branchId, tableNumber, sessionId, exp)`.
3. **Session Rollover & Clear Tab**: Once the guest pays their bill or staff resets the table on the POS floor plan, `table.activeSessionId` increments. Any subsequent scans of the static QR code start with a clean slate; former guests can no longer view or tamper with new diner tabs.

### Storefront Design System Adaptability
The Dine-In PWA dynamically renders the restaurant's active design template:
* **Haute Gastronomy (Atelier Étoile)**: Asymmetric viewport, sommelier pairings.
* **Nordic Editorial (Fjord & Form)**: Archival specimen layout, harvest dates.
* **Modern Specialty Café (Roastery 1984)**: Roast profiles, cup size selectors.
* **Night Alley Street-Food (Neon Yokocho)**: Stall cards, spice flame meters.
* **Italian Feasting (Osteria Rustica)**: Course-paced dining (Antipasti $\to$ Dolci).
* **Japanese Craft (Shokunin Ramen)**: 4-step craft ramen slips.

---

## 6. Multi-Branch & Floor Management (`/operations/locations`)

### Outlet Capabilities & Field Schema
Each branch record represents an operational node within the restaurant tenant:

```typescript
export interface BranchRecord {
  id: string;                     // e.g. "branch_ldh"
  name: string;                   // e.g. "Ludhiana Main (Saraba Nagar)"
  code: string;                   // e.g. "LDH-01"
  address: string;                // Street address
  city: string;                   // e.g. "Ludhiana"
  timezone: string;               // e.g. "Asia/Kolkata"
  currency: string;               // e.g. "INR"
  status: 'OPERATIONAL' | 'SETUP' | 'OFFLINE';
  serviceAreasCount: number;      // Number of dining floors/zones
  activeTablesCount: number;      // Configured table fleet size
  fulfillmentSluggishnessMinutes: number; // Dynamic SLA pad (e.g. +5 min in rain)
}
```

### Operational Actions:
1. **Switch Branch Context**: Switching active branch updates the entire operational context without parameter drilling via `AsyncLocalStorage`.
2. **Add New Branch Modal (`#branch-modal`)**: Creates new branch nodes, automatically provisioning default floor plans and inherited menu catalogs.
3. **Duplicate Branch Configuration**: Clones service areas, table layouts, and category configurations to accelerate multi-unit expansion.

---

## 7. Full Catalog of Operational API Endpoints

### Menu & Overrides APIs
* `GET /api/restaurant/menu` — Returns complete menu catalog with base pricing and station routes.
* `POST /api/restaurant/menu/items` — Creates a new culinary dish.
* `PATCH /api/restaurant/menu/items/:id` — Updates dish details, SLA, station, or allergens.
* `DELETE /api/restaurant/menu/items/:id` — Soft-deletes a dish from master catalog.
* `POST /api/restaurant/menu/branch-override` — Sets branch-specific pricing or 86'd status.
* `GET /api/restaurant/menu/resolved?branchId=:branchId` — Returns the fully-resolved, inheritance-flattened menu for a specific branch.

### KDS Task APIs
* `GET /api/restaurant/kds/tasks?branchId=:branchId&station=:station` — Returns active kitchen tasks.
* `POST /api/restaurant/kds/tasks/:taskId/bump` — Transitions task status (`QUEUED` $\to$ `IN_PROGRESS` $\to$ `READY` $\to$ `BUMPED`).
* `POST /api/restaurant/kds/tasks/:taskId/recall` — Reverses a bumped task back to `READY`.
* `POST /api/restaurant/kds/expo/dispatch` — Marks an entire table order ready and alerts servers.

### Table & QR Session APIs
* `GET /api/restaurant/tables/:locator` — Resolves public table locator to table number and branch.
* `POST /api/restaurant/tables/:tableNumber/session` — Starts a new dining session.
* `POST /api/restaurant/tables/:tableNumber/close` — Settles and closes table session, invalidating guest tokens.

---

## 8. Styling Tokens & Commercial Ergonomics

### Dark-Mode BOH Operational Theme (`:root`)
```css
:root {
  /* High-Contrast BOH Slate */
  --color-canvas: #06080B;
  --color-charcoal: #0E1218;
  --color-elevated: #151A22;
  
  /* Status & Station Accents */
  --color-copper: #D97736;         /* Brand accent & Tandoor station */
  --color-amber: #F59E0B;          /* Prep SLA warning & Curry Line */
  --color-sage: #22C55E;           /* Ready status & Veg indicator */
  --color-crimson: #EF4444;        /* 86'd / Alert / Non-veg */
  --color-sky: #0EA5E9;            /* Bar & Beverage station */
  
  /* Borders & Dividers */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.12);
  --border-strong: rgba(255, 255, 255, 0.22);
  
  /* High-Legibility Typography */
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

### Strict Zero-Emoji Rule
Vector SVGs used across all operations tools:
- `map-pin` — Location and outlet identification
- `clock` — SLA countdown timer
- `check` — Line item completion checkmark
- `refresh` — Ticket recall indicator
- `alert-circle` — Rush Mode and 86'd alerts
- `sparkles` — Menu Intelligence assistant
- `x` — Modal dismiss and line cancellation
