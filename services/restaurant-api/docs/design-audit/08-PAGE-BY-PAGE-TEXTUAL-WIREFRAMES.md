# 📐 RestaurantOS — Design Reset Phase 0: Page-by-Page Textual Wireframes
**Document ID:** `REST-OS-RESET-08-TEXTUAL-WIREFRAMES`  
**Repository:** `projects/external-os/restaurant-os`  
**Status:** Comprehensive Page-by-Page Wireframe Specifications  
**Coverage:** All 22 Verified Screens & Canonical Route Aliases  

---

## 1. Overview & Structural Wireframe Conventions

This document provides exhaustive, screenshot-independent textual wireframes, component trees, reading orders, interaction behaviors, and acceptance criteria for all 22 verified screens across RestaurantOS.

### Wireframe Notation Key
- `[ Button ]`: Clickable action button.
- `( * ) / ( )`: Radio selection toggle.
- `[ X ] / [ ]`: Checkbox selection.
- `[ Search... | 🔍 ]`: Text or search input.
- `[ ▼ Dropdown ]`: Select/dropdown menu.
- `| Column |`: Table column header.
- `┌─┐ / └─┘`: Container or card boundary.
- `───`: Divider or visual separator.
- `<Drawer>` / `<Modal>`: Overlay or slide-in panel.

---

## 2. Operational Workspace Surfaces (Back-of-House)

---

### Screen 01: Operations Command Home (`SCR-OPS-OVERVIEW`)
- **Canonical Route:** `/` (Alias: `/overview`)
- **Owning Component:** [`packages/ui/pages/overview.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/overview.ts)
- **Primary Users:** General Manager, Shift Supervisor, Floor Host.
- **Purpose:** Central operational mission-control displaying live covers, urgent attention items, active tables mini-map, quick service actions, and real-time revenue telemetry.

#### Textual Wireframe (Desktop 1440px)
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Brand Mark] OrbitoX Bistro  │  [Branch: Ludhiana Main ▼] [Floor: All ▼] [Shift: Dinner ▼] │ [● SSE Live] [?]│
├──────────────┬──────────────────────────────────────────────────────────────────────────────────────────────┤
│ OPERATIONS   │ Good evening, Ludhiana Main. Service is LIVE.                         [Shift: 17:00 - 23:30] │
│ • Overview * │ [ Quick Action: Floor ]  [ Quick Action: KDS ]  [ Quick Action: Menu ]  [ Quick Action: Mkt ]│
│ • Floor Map  ├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Tables     │ METRIC CARDS                                                                                 │
│ • Orders     │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│ • KDS Kitchen│ │ OCCUPIED     │ │ ACTIVE ORDERS│ │ SERVICE CALLS│ │ AVG TURN TIME│ │ TODAY'S REVENUE      │ │
│              │ │ 14 / 24 (58%)│ │ 8 Pending    │ │ 2 Urgent ⚠️  │ │ 48 mins      │ │ ₹1,48,250.00 (PAID)  │ │
│ CATALOG      │ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────────┘ │
│ • Menu       ├──────────────────────────────────────────────────────┬───────────────────────────────────────┤
│ • Guests     │ ATTENTION & SERVICE REQUEST FEED                     │ LIVE FLOOR MINI-MAP                   │
│ • Analytics  │ ┌──────────────────────────────────────────────────┐ │ ┌───────────────────────────────────┐ │
│              │ │ ⚠️ Table T-14: BILL REQUESTED (Cash) · 4m ago    │ │ │ [T-01: Occ] [T-02: Avl] [T-03: Occ]│ │
│ BRAND/STUDIO │ │    [ Resolve Request ]  [ Print Bill & Settle ]  │ │ │ [T-04: Res] [T-05: Occ] [T-06: Avl]│ │
│ • Studio     │ ├──────────────────────────────────────────────────┤ │ │ [T-07: Occ] [T-08: Drt] [T-14: Bil]│ │
│ • Templates  │ │ 💧 Table T-04: WATER REFILL · 1m ago             │ │ │                                   │ │
│ • Whitelabel │ │    [ Mark Refilled ]                             │ │ │ Active: 14 Occ · 6 Avl · 2 Bill   │ │
│              │ └──────────────────────────────────────────────────┘ │ │ [ Open Full Floor Studio ↗ ]      │ │
│ MANAGEMENT   ├──────────────────────────────────────────────────────┴─┴───────────────────────────────────┤
│ • Staff      │ RECENT COMPLETED SETTLEMENTS                                                                 │
│ • Locations  │ | Bill #   | Table | Guest Name     | Method | Subtotal  | Tax (5%) | Total Paid  | Time   |  │
│ • Floors     │ | BILL-102 | T-02  | Kapoor Family  | CARD   | ₹3,200.00 | ₹160.00  | ₹3,360.00   | 20:14  |  │
│ • Support    │ | BILL-101 | T-09  | Corporate PDR  | UPI    | ₹8,400.00 | ₹420.00  | ₹8,820.00   | 19:55  |  │
└──────────────┴──────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Reading Order & Hierarchy
1. Header context bar (Branch, floor, active shift).
2. Primary KPI telemetry cards (Left-to-right: Occupancy, Active Orders, Service Requests, Turn Time, Revenue).
3. Two-column operational split: Attention Feed (urgent actionable items) on left, Spatial Mini-Map on right.
4. Bottom audit ledger of recent settlements and events.

#### Actions & Handlers
- **Primary:** `[ Quick Action: Floor ]` navigates to `/operations/floor`; `[ Quick Action: KDS ]` navigates to `/kds`.
- **Secondary:** `[ Resolve Request ]` dispatches `POST /api/restaurant/service-requests/:id/resolve`.
- **Destructive:** `[ Emergency Shift Pause ]` (Manager role only).

#### Responsive Rules
- **Mobile (390px):** Sidebar hidden; hamburger trigger; KPI cards become 2x2 grid; Attention feed stacks above Mini-Map.
- **Tablet (768px):** Sidebar collapses to 64px icon rail; KPI cards wrap to 3 columns; Attention feed and Mini-Map 50/50 split.
- **Desktop (1440px):** Standard 3-column layout.

#### Functional Defect Repair (`UX-DEF-001`)
- Reconnect the 4 quick action cards (`OPS-CTRL-005..008`) which currently have empty `href="#"` to their respective canonical routes (`/operations/floor`, `/kds`, `/menu`, `/marketplace`).

#### Acceptance Criteria
- [ ] Clicking any quick action card immediately navigates to the target screen without console errors.
- [ ] Resolving an attention request dismisses the card and emits `service_request.resolved` via SSE.
- [ ] Revenue KPI strictly renders formatted integer paise (`₹1,48,250.00`).

---

### Screen 02: Spatial Floor Studio (`SCR-OPS-FLOOR`)
- **Canonical Route:** `/operations/floor` (Alias: `/operations`)
- **Owning Component:** [`packages/ui/pages/floor.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/floor.ts)
- **Primary Users:** Floor Host, Server, Floor Manager.
- **Purpose:** Interactive 2D floor layout canvas for table seating, status management, party assignment, merge/unmerge operations, and check settlement.

#### Textual Wireframe (Desktop 1440px)
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Brand Mark]  Floor Studio  │  [Branch: Ludhiana Main ▼] [Floor: Main Courtyard ▼]          │ [● SSE Live]  │
├──────────────┬──────────────────────────────────────────────────────────────┬───────────────────────────────┤
│ SECTIONS     │ TOOLBAR: [● Live Service] [✏️ Layout Design]  Zoom: [-] 100% [+]│ TABLE INSPECTOR: Table T-14   │
│ • Courtyard* │ Status Views: [▼ Operational Heatmap]     [+ Add Table] [Save]│ Status: [ BILL_REQUESTED  ▼ ] │
│ • Bar Lounge ├──────────────────────────────────────────────────────────────┤ Capacity: 4 Covers (Max 6)    │
│ • PDR Room   │ SPATIAL SVG CANVAS (Grid Snap: 10px)                         │ Party: Sharma Party (4 Guests)│
│ • Terrace    │                                                              │ Mood: Celebratory 🎉          │
│              │    ┌────────┐             ┌────────┐         ┌────────┐      ├───────────────────────────────┤
│              │    │  T-01  │             │  T-02  │         │  T-03  │      │ TABS: [Overview] [Seats] [Bill│
│              │    │ 2-Top  │             │ 4-Top  │         │ 4-Top  │      ├───────────────────────────────┤
│              │    │ [Avl]  │             │ [Occ]  │         │ [Occ]  │      │ ACTIVE CHECK BREAKDOWN        │
│              │    └────────┘             └────────┘         └────────┘      │ 1x Paneer Tikka       ₹380.00 │
│              │                                                              │ 1x Truffle Marinade   ₹120.00 │
│              │               ┌───────────────────┐                          │ 2x Garlic Naan        ₹220.00 │
│              │               │       T-14        │ <── [Selected]           │ 1x Butter Chicken     ₹540.00 │
│              │               │       4-Top       │                          │ ───────────────────────────── │
│              │               │  [Bill Requested] │                          │ Subtotal:           ₹1,260.00 │
│              │               └───────────────────┘                          │ GST (5%):              ₹63.00 │
│              │                                                              │ TOTAL DUE:          ₹1,323.00 │
│              │                                                              ├───────────────────────────────┤
│              │                                                              │ SETTLEMENT ACTIONS:           │
│              │                                                              │ Method: [ CASH              ▼]│
│              │                                                              │ Cash Tendered: [ ₹1,500.00   ]│
│              │                                                              │ Change Due:    [ ₹177.00     ]│
│              │                                                              │ [ Settle Check & Free Table ] │
│              │                                                              │ [ Merge with Table...       ▼]│
└──────────────┴──────────────────────────────────────────────────────────────┴───────────────────────────────┘
```

#### Reading Order & Hierarchy
1. Left vertical rail: Floor section switcher (`Main Courtyard`, `Bar Lounge`, `PDR`).
2. Center top toolbar: Mode toggle (`Live Service` vs `Layout Design`), canvas zoom controls, batch save button.
3. Center viewport: Interactive SVG coordinate canvas showing physical table placements and live status colors.
4. Right inspector panel (380px fixed width): Selected table details, party information, live seat diagram, order breakdown, and bill settlement drawer.

#### Interaction States & Validation
- **Table Dragging:** In `Layout Design` mode, dragging a table updates `x, y` coordinates in local state, snapping to 10px increments. Displays floating coordinate badge `(X: 240, Y: 180)`.
- **Settlement Mutex:** When `[ Settle Check ]` is tapped, frontend disables button, acquires `activeSettlementLocks` on server, flushes atomic settlement, and broadcasts `table.updated` + `session.closed`.
- **Change Calculator:** For `CASH` settlement, entering `Cash Tendered < Total Due` shows validation error in red text ("Amount is less than total bill").

#### Responsive Rules
- **Mobile (390px):** SVG canvas requires pan/pinch; inspector panel becomes a full-height bottom drawer (`.sheet-overlay.open`) triggered by tapping any table.
- **Tablet (768px):** Inspector docks at bottom (40% height) with canvas taking top 60% height.

#### Functional Defect Repair (`UX-DEF-002`)
- Add passive-false touch event listeners (`touchstart`, `touchmove`, `touchend`) with `touch-action: none` to enable table dragging on iPads and touch monitors.

#### Acceptance Criteria
- [ ] Table dragging works smoothly with both mouse and touch input.
- [ ] Settling a bill transitions table status to `AVAILABLE` (green) across all connected clients via SSE within 300ms.
- [ ] Tapping a table selects it and updates the right inspector without deselecting when clicking inspector tabs.

---

### Screen 03: Tables Fleet Management (`SCR-OPS-TABLES`)
- **Canonical Route:** `/operations/tables`
- **Owning Component:** [`packages/ui/pages/tables.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/tables.ts)
- **Primary Users:** Floor Host, Server.
- **Purpose:** Dense tabular view of all restaurant tables across all floors, with status filters, capacity sorting, multi-table merge actions, and locator QR code actions.

#### Textual Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Tables Fleet Management  │  [Branch: Ludhiana Main ▼]                   [ Search table or guest... | 🔍 ]   │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ FILTERS: [ ALL (24) ]  [ Available (6) ]  [ Occupied (14) ]  [ Bill Requested (2) ]  [ Dirty (2) ]          │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ | Table | Floor       | Shape  | Capacity | Status         | Current Party   | Active Bill | QR Locator     | │
│ | T-01  | Courtyard   | Square | 2 Seats  | [ Available  ] | -               | ₹0.00       | [ View QR ↗ ]  | │
│ | T-02  | Courtyard   | Round  | 4 Seats  | [ Occupied   ] | Kapoor Party (3)| ₹3,360.00   | [ View QR ↗ ]  | │
│ | T-14  | Courtyard   | Rect   | 4 Seats  | [ Bill Req   ] | Sharma Party (4)| ₹1,323.00   | [ View QR ↗ ]  | │
│ | T-10  | Bar Lounge  | HighTop| 2 Seats  | [ Occupied   ] | Walk-in (2)     | ₹940.00     | [ View QR ↗ ]  | │
│ | T-09  | Private Dining| Long | 16 Seats | [ Reserved   ] | Corporate Dinner| ₹0.00       | [ Rotate Key ] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ BATCH ACTIONS: [ Merge Selected Tables ]  [ Bulk Mark Dirty ]  [ Bulk Rotate QR Locators ]                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Status filter chips instantly filter the table rows without full-page reload.
- [ ] Clicking `[ View QR ↗ ]` opens `/api/restaurant/qr/:locator` in a modal dialog with printable SVG QR code.
- [ ] Merging two tables links their sessions and displays `[M]` badge in both rows.

---

### Screen 04: Service Order Ledger (`SCR-OPS-ORDERS`)
- **Canonical Route:** `/operations/orders` (Alias: `/orders`)
- **Owning Component:** [`packages/ui/pages/orders.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/orders.ts)
- **Primary Users:** Cashier, Server, Floor Manager.
- **Purpose:** Comprehensive searchable log of all customer orders, items, preparation statuses, payment states, and void/cancellation workflows.

#### Textual Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Service Order Ledger  │  [Branch: Ludhiana Main ▼]                 [ Search Order ID, Table, Dish... | 🔍 ] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ TABS: [ ALL ORDERS (42) ]  [ Active (8) ]  [ Cooking (5) ]  [ Ready to Serve (3) ]  [ Settled / Paid (34) ] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ | Order ID  | Time  | Table | Items Summary             | Station   | Status       | Total     | Actions   |│
│ | #ord_9821 | 20:22 | T-14  | 1x Butter Chicken, 2x Naan| CURRY,TAN | [ PREPPING ] | ₹760.00   | [View] [X]│
│ | #ord_9820 | 20:18 | T-02  | 2x Mango Lassi, 1x Tikka  | BAR,TANDOOR| [ READY   ] | ₹580.00   | [Serve]   │
│ | #ord_9819 | 20:05 | T-05  | 1x Dal Makhani, 2x Roti   | CURRY,TAN | [ DELIVERED] | ₹490.00   | [Receipt] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ <Slide-Over Order Detail Drawer: #ord_9821>                                                                 │
│ Table: T-14 · Seated: 20:10 · Staff: Rohit (Server)                                                        │
│ Items:                                                                                                      │
│   • 1x Butter Chicken (Boneless) · Curry Line · Cook: Vikram · [ Ready in 4m ]                              │
│   • 2x Garlic Naan (Crisp) · Tandoor · Cook: Jagjit · [ BUMPED READY ]                                      │
│ Financials: Subtotal ₹723.81 + 5% GST ₹36.19 = ₹760.00                                                      │
│ Actions: [ Mark All Delivered ]  [ Repack for Takeaway ]  [ Void / Cancel Order ⚠️ ]                        │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Real-time updates: When a cook bumps a task on KDS, the corresponding order row status transitions to `READY` via SSE within 300ms.
- [ ] Cancelling an order requires manager confirmation modal with mandatory cancellation reason selection.

---

### Screen 05: Kitchen Display System (`SCR-OPS-KDS`)
- **Canonical Route:** `/kds`
- **Owning Component:** [`packages/ui/pages/kds.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/kds.ts)
- **Primary Users:** Station Cooks, Expeditor ("Expo"), Head Chef.
- **Purpose:** Full-screen touch workstation for tracking cooking SLA, item fulfillment, bump actions, recipe recall, and expediter dispatch.

#### Textual Wireframe (Full Screen 1920px Wall / 1440px Touch Display)
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🍳 KDS STATION: [ ALL STATIONS ▼ ]  │  [ TANDOOR (3) ]  [ CURRY LINE (4) ]  [ BAR (1) ]  │ [🔊 Sound: ON ] │
│ ALL-DAY BATCH COUNTS: 5x Butter Chicken · 8x Garlic Naan · 3x Dal Makhani · 2x Paneer Tikka  │ Shift: Dinner│
├─────────────────────────┬─────────────────────────┬─────────────────────────┬───────────────────────────────┤
│ TICKET #ord_9821 (T-14) │ TICKET #ord_9820 (T-02) │ TICKET #ord_9822 (T-07) │ TICKET #ord_9818 (T-05)       │
│ Station: TANDOOR        │ Station: CURRY LINE     │ Station: TANDOOR        │ Station: EXPO PASS            │
│ Server: Rohit · Party: 4│ Server: Aman · Party: 2 │ Server: Simran · Party:6│ Server: Expo Master           │
│ Timer: 08:24 (SLA: 12m) │ Timer: 14:10 (SLA: 15m) │ Timer: 02:15 (SLA: 12m) │ Timer: 11:45 (ALL READY)      │
│ [ SLA: ON TRACK (Sage) ]│ [ SLA: DELAYED (Amber) ]│ [ SLA: ON TRACK (Sage) ]│ [ ASSEMBLED - READY RUNNER ]  │
├─────────────────────────┼─────────────────────────┼─────────────────────────┼───────────────────────────────┤
│ ITEMS:                  │ ITEMS:                  │ ITEMS:                  │ ITEMS:                        │
│ [ ] 2x Garlic Naan      │ [X] 1x Dal Makhani      │ [ ] 1x Paneer Tikka     │ [✓] 2x Butter Chicken (Curry) │
│     * Well Done / Crisp │     * Extra Cream       │     * Truffle Marinade  │ [✓] 4x Butter Naan (Tandoor)  │
│ [ ] 1x Butter Naan      │ [ ] 1x Butter Chicken   │ [ ] 1x Fish Tikka       │ [✓] 2x Sweet Lassi (Bar)      │
│     * Regular           │     * Boneless / Spicy  │     * Mint Dip          │ Course: MAIN COURSE           │
├─────────────────────────┼─────────────────────────┼─────────────────────────┼───────────────────────────────┤
│ [ BUMP COMPLETE (54px)] │ [ BUMP COMPLETE (54px)] │ [ BUMP COMPLETE (54px)] │ [ DISPATCH TO RUNNER (54px) ] │
│ [ Fulfill Next Item   ] │ [ Fulfill Next Item   ] │ [ Fulfill Next Item   ] │ [ Recall to Stations ↩ ]      │
└─────────────────────────┴─────────────────────────┴─────────────────────────┴───────────────────────────────┘
```

#### Functional Defect Repair (`UX-DEF-006` & `UX-DEF-008`)
- Unlock `AudioContext` on initial station select button tap so urgent audio alerts ring reliably even if the tab is backgrounded.
- Enforce toast notification max limit of 3 with auto-dismissal to prevent screen obscuration.

#### Acceptance Criteria
- [ ] Tapping `[ BUMP COMPLETE ]` advances task to `READY` and moves ticket to Expo Pass column.
- [ ] Tapping individual items marks them with strikethrough fulfillment (`fulfilledItemCount += 1`).
- [ ] Bumping tickets triggers zero page reloads and completes in under 100ms via optimized client DOM patch.

---

### Screen 06: Menu Catalog & Modifiers (`SCR-OPS-MENU`)
- **Canonical Route:** `/menu`
- **Owning Component:** [`packages/ui/pages/menu.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/menu.ts)
- **Primary Users:** Head Chef, General Manager.
- **Purpose:** Full CRUD management of dishes, base pricing, prep durations, kitchen station assignments, allergen badges, and multi-option modifier groups.

#### Textual Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Menu Catalog & Pricing  │  [Branch: Ludhiana Main ▼]           [ Search dish by name... | 🔍 ]  [+ New Dish]│
├─────────────────────────┬───────────────────────────────────────────────────────────────────────────────────┤
│ CATEGORIES (Drag reorder│ DISH LIST: Starters (6 items)                                                     │
│ [≡] 1. Starters (8) *   │ ┌───────────────────────────────────────────────────────────────────────────────┐ │
│ [≡] 2. Mains (14)       │ │ Paneer Tikka · TANDOOR · Prep: 12m · [ VEG ] [ GLUTEN_FREE ] · Base: ₹380.00  │ │
│ [≡] 3. Breads (6)       │ │ Charcoal-grilled cottage cheese in spiced yogurt marinade.                    │ │
│ [≡] 4. Beverages (10)   │ │ Modifiers: Marinade Style (2 options), Accompaniments (3 options)             │ │
│ [≡] 5. Desserts (5)     │ │ [ Edit Dish ]  [ Branch Pricing Override ]  [ 86'd / Sold Out Toggle ]  [ Archive ]│
│ ─────────────────────── │ └───────────────────────────────────────────────────────────────────────────────┘ │
│ [+ Add Category]        │ <Dish Edit Modal / Drawer: "Paneer Tikka">                                        │
│                         │ Dish Name: [ Paneer Tikka                   ] Category: [ Starters            ▼ ] │
│                         │ Base Price (₹): [ 380.00 ]  Station: [ TANDOOR ▼ ]  Prep Time (m): [ 12         ] │
│                         │ Dietary: [X] VEG  [ ] NON-VEG  [X] GLUTEN_FREE  [ ] VEGAN                         │
│                         │ MODIFIER GROUPS BUILDER:                                                          │
│                         │ Group: "Marinade Style" (Min: 1, Max: 1 - Mandatory Radio)                        │
│                         │   • Cardamom Cream (Delta: +₹0.00) [Default]                                      │
│                         │   • Truffle Infused (Delta: +₹120.00)                                             │
│                         │   [+ Add Option]                                                                  │
│                         │ [ Save Dish Changes ]  [ Discard Changes ]                                        │
└─────────────────────────┴───────────────────────────────────────────────────────────────────────────────────┘
```

#### Functional Defect Repair (`UX-DEF-003`)
- Add `window.isFormDirty` guard and `beforeunload` interceptor to prevent silent loss of staged modifier configurations when clicking sidebar navigation links.

#### Acceptance Criteria
- [ ] Reordering categories via drag handle updates `displayOrder` and emits `CATEGORIES_REORDERED`.
- [ ] Toggling 86'd status immediately updates branch availability across all customer storefronts via SSE.

---

### Screen 07: Active Guests & CRM (`SCR-OPS-GUESTS`)
- **Canonical Route:** `/guests`
- **Owning Component:** [`packages/ui/pages/guests.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/guests.ts)
- **Primary Users:** Host, VIP Concierge, General Manager.
- **Purpose:** Seated guests directory, party preferences, dietary allergy records, dining history, and VIP tagging.

#### Textual Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Active Guests & Seating CRM  │  [Branch: Ludhiana Main ▼]                 [ Search guest name or phone... ] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ | Guest Name       | Phone (Masked)   | Table | Party Size | Seated At | Mood / Tag       | Lifetime Spend| │
│ | Rajesh Sharma    | +91 ******43210  | T-14  | 4 Guests   | 19:45     | Celebratory 🎉   | ₹48,500 (VIP) | │
│ | Sunita Kapoor    | +91 ******88192  | T-02  | 3 Guests   | 20:10     | Casual Dinner    | ₹14,200       | │
│ | Corporate Group  | +91 ******11049  | PDR-1 | 12 Guests  | 19:00     | Executive Gala   | ₹1,85,000 (VIP)| │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ <Guest Detail Slide-Over: Rajesh Sharma>                                                                    │
│ Allergens: Shellfish (Severe), Peanuts · Preferred Seating: Corner Courtyard Booth                          │
│ Favorite Dishes: Butter Chicken, Truffle Naan, Glenfiddich 15 · Average Spend per Cover: ₹1,850.00          │
│ Notes: "Prefers table T-14. Wine enthusiast. Celebrates wedding anniversary on Oct 24."                    │
│ [ Edit Profile ]  [ Send Welcome Wine Toast 🍷 ]  [ Reassign Table ]                                        │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Customer phone numbers are strictly masked (`+91 ******43210`) in UI and server logs.
- [ ] VIP badge is automatically assigned for guests with lifetime spend > ₹25,000.

---

### Screen 08: Locations & Branches (`SCR-OPS-LOCATIONS`)
- **Canonical Route:** `/operations/locations`
- **Owning Component:** [`packages/ui/pages/locations.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/locations.ts)
- **Primary Users:** Multi-Unit Owner, Operations Director.
- **Purpose:** Multi-branch fleet configuration, operating hours, service area definitions, tax profiles, and branch menu override management.

#### Textual Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Locations & Branches Fleet  │  Multi-Unit Operations                    [+ Provision New Branch]            │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐                        │
│ │ LUDHIANA MAIN (HQ)      │ │ CHANDIGARH SECTOR 17    │ │ DELHI CONNAUGHT PLACE   │                        │
│ │ Code: LDH-MAIN          │ │ Code: CHD-SEC17         │ │ Code: DEL-CP            │                        │
│ │ 3 Floors · 24 Tables    │ │ 2 Floors · 18 Tables    │ │ 3 Floors · 34 Tables    │                        │
│ │ Hours: 12:00 PM - 11:30 │ │ Hours: 11:00 AM - 11:00 │ │ Hours: 12:00 PM - 01:00 │                        │
│ │ Status: [ OPERATIONAL ] │ │ Status: [ OPERATIONAL ] │ │ Status: [ OPERATIONAL ] │                        │
│ │ Currency: INR (₹)       │ │ Currency: INR (₹)       │ │ Currency: INR (₹)       │                        │
│ │ ─────────────────────── │ │ ─────────────────────── │ │ ─────────────────────── │                        │
│ │ [ Manage Branch ]       │ │ [ Manage Branch ]       │ │ [ Manage Branch ]       │                        │
│ │ [ Menu Overrides (0) ]  │ │ [ Menu Overrides (1) ]  │ │ [ Menu Overrides (2) ]  │                        │
│ └─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ <Branch Detail Drawer: Delhi Connaught Place>                                                               │
│ Address: Radial Road 4, Inner Circle, New Delhi 110001 · Phone: +91 11 4150 9982                            │
│ Opening Hours: [ 12:00 PM ] to [ 01:00 AM ]  Days Open: [ Mon - Sun ▼ ]                                     │
│ Branch Menu Overrides:                                                                                      │
│   • Butter Chicken: Base ₹540.00 ➔ Override: [ ₹580.00 ] [ Enabled ]                                        │
│   • Dal Makhani: Base ₹420.00 ➔ Override: [ 86'd / SOLD OUT ]                                               │
│ [ Save Branch Settings ]  [ Switch Active Context to Delhi ]                                                │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Modifying opening hours or price overrides persists atomically to `store.data.branches` and `store.data.branchMenuOverrides`.
- [ ] Switching active branch context updates URL query parameter `?branch=branch_del` across all shell navigation links.

---

### Screen 09: Floor Plans & Service Areas (`SCR-OPS-FLOORS`)
- **Canonical Route:** `/operations/floors`
- **Owning Component:** [`packages/ui/pages/floors.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/floors.ts)
- **Primary Users:** General Manager, Operations Director.
- **Purpose:** Configuration of physical service areas, floor layout presets (Lunch Rush vs. Dinner Gala), and total cover capacities per floor.

#### Textual Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Floor Plans & Layout Presets  │  [Branch: Ludhiana Main ▼]                [+ Create New Service Area]       │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ | Floor Name     | Type       | Capacity | Active Layout Preset | Tables Count | Status   | Actions        |│
│ | Main Courtyard | Dining     | 84 Seats | Dinner Layout        | 9 Tables     | [ACTIVE] | [Edit] [Design]|│
│ | Bar Lounge     | Bar        | 24 Seats | Evening Cocktails    | 2 Tables     | [ACTIVE] | [Edit] [Design]|│
│ | Private Dining | Private PDR| 16 Seats | Gala Banquet         | 1 Table      | [ACTIVE] | [Edit] [Design]|│
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ <Service Layout Preset Manager: Main Courtyard>                                                             │
│ Configured Layouts:                                                                                         │
│   ( * ) Dinner Layout (Default) · Standard high-cover arrangement (9 tables, 84 capacity)                   │
│   (   ) Lunch Rush · Fast-turn 2-top and 4-top dense configuration (12 tables, 92 capacity)                │
│   (   ) Private Gala / Reception · Open cocktail reception & dance floor (5 banquet tables, 60 capacity)  │
│ [ Activate Preset for Current Shift ]  [ Duplicate Layout ]  [ Launch Spatial Designer ↗ ]                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Activating a preset immediately updates table assignments and coordinates on the spatial floor canvas.
- [ ] Floor deletions are blocked if tables with active open sessions exist on that floor.

---

### Screen 10: Service Analytics & Reports (`SCR-OPS-REPORTS`)
- **Canonical Route:** `/reports`
- **Owning Component:** [`packages/ui/pages/reports.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/reports.ts)
- **Primary Users:** General Manager, Accountant, Franchise Owner.
- **Purpose:** Service performance analytics, hourly cover heatmaps, item sales velocity, kitchen SLA compliance, and gross/net revenue breakdown.

#### Textual Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Service Analytics & Telemetry  │  [Branch: Ludhiana Main ▼]  [ Range: Today (Dinner Shift) ▼ ] [Export CSV]│
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SUMMARY METRICS                                                                                             │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────────────────────────┐ │
│ │ GROSS REVENUE│ │ TOTAL COVERS │ │ AVG CHECK/COV│ │ AVG PREP TIME│ │ KDS SLA COMPLIANCE                  │ │
│ │ ₹1,48,250.00 │ │ 86 Guests    │ │ ₹1,723.83    │ │ 11.4 mins    │ │ 94.2% On-Time (2 Breaches)          │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └─────────────────────────────────────┘ │
├──────────────────────────────────────────────────────┬──────────────────────────────────────────────────────┤
│ HOURLY REVENUE & COVERS VELOCITY                     │ TOP SELLING DISHES BY REVENUE                        │
│ 17:00 | ████░░░░░░░░░░░░  12 Covers · ₹18,400        │ 1. Butter Chicken     · 24 orders · ₹12,960.00       │
│ 18:00 | ████████░░░░░░░░  22 Covers · ₹34,200        │ 2. Paneer Tikka       · 18 orders ·  ₹6,840.00       │
│ 19:00 | ████████████████  38 Covers · ₹62,400 [PEAK] │ 3. Garlic Naan        · 42 orders ·  ₹4,620.00       │
│ 20:00 | ████████░░░░░░░░  14 Covers · ₹33,250        │ 4. Dal Makhani        · 16 orders ·  ₹6,720.00       │
├──────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┤
│ TAX & SETTLEMENT RECONCILIATION LEDGER                                                                      │
│ | Payment Method | Transactions Count | Net Subtotal  | GST (5%) Collected | Total Reconciled               |│
│ | CASH           | 12 transactions    | ₹38,400.00    | ₹1,920.00          | ₹40,320.00                     |│
│ | CARD (POS)     | 18 transactions    | ₹64,200.00    | ₹3,210.00          | ₹67,410.00                     |│
│ | UPI QR         | 14 transactions    | ₹38,590.48    | ₹1,929.52          | ₹40,520.00                     |│
│ | TOTALS         | 44 transactions    | ₹1,41,190.48  | ₹7,059.52          | ₹1,48,250.00                   |│
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Revenue numbers reconcile exactly with `store.data.bills` integer sums (`subtotalMinor + gstMinor === totalMinor`).
- [ ] Export CSV generates a downloadable comma-separated file of all completed bills for the selected date range.

---

### Screen 11: Staff Directory & RBAC Security (`SCR-OPS-STAFF`)
- **Canonical Route:** `/staff` (Alias: `/operations/staff`)
- **Owning Component:** [`packages/ui/pages/staff.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/staff.ts)
- **Primary Users:** General Manager, Platform Administrator.
- **Purpose:** Staff provisioning, role-based access control (ADMIN, MANAGER, CHEF, SERVER, HOST), 4-digit PIN assignment, station scoping, session token revocation, and PIN lockout reset.

#### Textual Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Staff Directory & RBAC Security  │  [Branch: Ludhiana Main ▼]                    [+ Provision Staff Member] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ | Name         | Role      | Station Scopes   | Branch    | Status  | PIN Lockout | Active Sessions | Actions│
│ | Vikram Singh | CHEF      | TANDOOR, CURRY   | Ludhiana  | ACTIVE  | 0 / 5 Fails | 1 Active POS    | [Edit] │
│ | Rohit Verma  | SERVER    | ALL STATIONS     | Ludhiana  | ACTIVE  | 0 / 5 Fails | 1 Mobile PWA    | [Edit] │
│ | Aman Joshi   | SERVER    | ALL STATIONS     | Ludhiana  | LOCKED  | 5 / 5 [LOCKED]| None          | [RESET]│
│ | Harpreet K.  | MANAGER   | GLOBAL ADMIN     | ALL       | ACTIVE  | 0 / 5 Fails | 2 Active        | [Edit] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ <Staff Provisioning Modal>                                                                                  │
│ Full Name: [ Aman Joshi                     ]  Role: [ SERVER ▼ ] (Permissions: Order, Settle, Table View)  │
│ Email:     [ aman@orbitoxbistro.com         ]  Phone: [ +91 98140 22910 ]                                   │
│ Branch:    [ Ludhiana Main ▼ ]                 Station Scopes: [X] Tandoor  [X] Curry  [X] Bar  [X] Expo    │
│ 4-Digit Security PIN: [ **** ] (Hashed via PBKDF2/SHA-256)                                                  │
│ [ Save Staff Credentials ]  [ Revoke All Active Sessions ]  [ Deactivate Account ⚠️ ]                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Entering 5 incorrect PIN attempts locks staff account; clicking `[ RESET ]` calls `POST /api/restaurant/staff/reset-lockout` and restores account.
- [ ] Clicking `[ Revoke All Active Sessions ]` invalidates issued bearer tokens and forces re-authentication on staff devices.

---

### Screen 12: Customer Support Desk (`SCR-OPS-SUPPORT`)
- **Canonical Route:** `/support`
- **Owning Component:** [`packages/ui/pages/support.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/support.ts)
- **Primary Users:** Restaurant Staff, General Manager, OrbitoX Support.
- **Purpose:** Operational incident ticketing, hardware/KDS troubleshooting, billing disputes, domain DNS escalation, and live messaging with platform support.

#### Textual Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Customer Support & Incident Desk  │  [Branch: Ludhiana Main ▼]                     [+ Open Support Ticket]  │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ FILTERS: [ ALL (8) ]  [ Open (2) ]  [ Investigating (1) ]  [ Critical / Escalated (1) ]  [ Closed (4) ]     │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ | Ticket # | Subject                        | Category     | Severity | Status        | Reported By | Time  │
│ | TIK-042  | Tandoor Station KDS Touchscreen| HARDWARE_KDS | HIGH     | [OPEN]        | Chef Vikram | 19:10 │
│ | TIK-041  | UPI Payment Webhook Timeout    | PAYMENTS     | CRITICAL | [INVESTIGATING| Mgr Harpreet| 18:45 │
│ | TIK-039  | Custom Domain SSL Provisioning | DOMAIN_SETUP | MEDIUM   | [RESOLVED]    | Admin       | 2d ago│
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ <Ticket Conversation View: TIK-041 - UPI Payment Webhook Timeout>                                           │
│ Status: [ INVESTIGATING ▼ ] · Severity: CRITICAL · Branch: Ludhiana Main · Reported By: Harpreet Kaur       │
│ Messages:                                                                                                   │
│   • Harpreet (18:45): "Guest paid ₹1,323 via HDFC UPI QR, but check did not auto-settle on floor canvas."  │
│   • OrbitoX Support (18:52): "Inspecting webhook logs. HDFC gateway returned 200; retry queue replay fired." │
│ Reply: [ Enter message to OrbitoX Engineering...                                                          ] │
│ [ Send Reply ]  [ Escalate to Urgent Incident ⚠️ ]  [ Mark Resolved & Close Ticket ]                        │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Functional Defect Repair (`UX-DEF-004`)
- Synchronize active filter pill selection with URL query parameters (`/support?status=OPEN&severity=CRITICAL`) so state persists across page reload.

#### Acceptance Criteria
- [ ] Submitting a message appends it to `ticket.messages` and dispatches `SUPPORT_TICKET_REPLIED` event.
- [ ] Changing ticket status to `RESOLVED` updates status badge without reloading page.

---

## 3. Brand & Studio Surfaces

---

### Screen 13: Template Marketplace (`SCR-BRD-MARKET`)
- **Canonical Route:** `/marketplace`
- **Owning Component:** [`packages/ui/pages/marketplace.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/marketplace.ts)
- **Primary Users:** Restaurant Owner, Creative Director.
- **Purpose:** Browsing, previewing, and installing authentic storefront themes for in-restaurant dining and online ordering.

#### Textual Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Template Marketplace  │  Storefront Experience Engines                     [ Active: Atelier Étoile Noir ]  │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ CATEGORIES: [ All (6) ]  [ Haute Gastronomy ]  [ Nordic Minimal ]  [ Café ]  [ Street Food ]  [ Italian ]   │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐                        │
│ │ ATELIER ÉTOILE NOIR     │ │ FJORD & FORM BOTANICAL  │ │ ROASTERY 1984 VITRINE   │                        │
│ │ [ Preview Thumbnail ]   │ │ [ Preview Thumbnail ]   │ │ [ Preview Thumbnail ]   │                        │
│ │ Haute Gastronomy · Pro  │ │ Nordic Minimal · Growth │ │ Café & Bakery · Starter │                        │
│ │ 50/50 Asymmetric Split  │ │ Centered Botanical Ledger│ │ Tactile Counter Vitrine │                        │
│ │ Champagne & Charcoal    │ │ Unbleached Linen & Slate│ │ Espresso Foam & Copper  │                        │
│ │ [ INSTALLED / ACTIVE ]  │ │ [ Live Preview ↗ ]      │ │ [ Live Preview ↗ ]      │                        │
│ │ [ Customize in Studio ] │ │ [ Install Theme ]       │ │ [ Install Theme ]       │                        │
│ └─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘                        │
│ ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐                        │
│ │ NEON YOKOCHO NIGHT ALLEY│ │ OSTERIA RUSTICA CONVIV. │ │ SHOKUNIN RAMEN & ROBATA │                        │
│ │ [ Preview Thumbnail ]   │ │ [ Preview Thumbnail ]   │ │ [ Preview Thumbnail ]   │                        │
│ │ Asian Street Food · Pro │ │ Italian Trattoria · Grow│ │ Japanese Izakaya · Pro  │                        │
│ │ Dense Ticket Grid       │ │ Course-Paced Feasting   │ │ Shoji 4-Step Ramen Slip │                        │
│ │ Lantern Amber & Vermilion│ │ Tuscan Terracotta & DOP│ │ Hinoki Cedar & Woodblock│                        │
│ │ [ Live Preview ↗ ]      │ │ [ Live Preview ↗ ]      │ │ [ Live Preview ↗ ]      │                        │
│ │ [ Install Theme ]       │ │ [ Install Theme ]       │ │ [ Install Theme ]       │                        │
│ └─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Clicking `[ Install Theme ]` triggers `POST /api/restaurant/templates/install`, updates `activeTemplateId`, resets template draft, and emits `TEMPLATE_INSTALLED`.
- [ ] Active theme is badged with green `[ INSTALLED / ACTIVE ]` indicator.

---

### Screen 14: Visual Brand Studio (`SCR-BRD-STUDIO`)
- **Canonical Route:** `/studio`
- **Owning Component:** [`packages/ui/pages/studio.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/studio.ts)
- **Primary Users:** Creative Director, Marketing Lead.
- **Purpose:** WYSIWYG visual site builder for customizing storefront sections, reordering layout hierarchy, configuring color tokens, and publishing production releases.

#### Textual Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [← Exit] Brand Studio  │  Template: Atelier Étoile Noir v4.1  │ [📱 390] [📱 768] [💻 1200]  │ [Save] [Publish]│
├─────────────────────┬─────────────────────────────────────────────────────────┬─────────────────────────────┤
│ SECTIONS HIERARCHY  │ LIVE INTERACTIVE PREVIEW CANVAS                         │ PROPERTY INSPECTOR          │
│ [≡] 1. Header Gate  │ ┌─────────────────────────────────────────────────────┐ │ Selected: Hero Manifesto    │
│     * Non-blocking  │ │ 🍷 ATELIER ÉTOILE NOIR                              │ │ Title:                      │
│ [≡] 2. Hero Manifest│ │ Executive Chef Manifesto                            │ │ [ Live Charcoal Embers    ]│
│     * Sal Wood Coals│ │                                                     │ │ Description:                │
│ [≡] 3. Tasting Course│ │ "Farm-to-fork gastronomy, crafted over live coals." │ │ [ Farm-to-fork gastronomy..]│
│     * Movements I-IV│ │                                                     │ │ Color Tokens:             │
│ [≡] 4. Sommelier Cel│ │ [ View Tasting Menu ↗ ]                             │ │ Primary:   [ #C5A059 🎨 ] │
│     * Cellar Folio  │ └─────────────────────────────────────────────────────┘ │ Secondary: [ #D99A45 🎨 ] │
│ [≡] 5. Footer Story │                                                         │ Background:[ #080A0D 🎨 ] │
│ ─────────────────── │                                                         │ Typography:                 │
│ [+ Add Block / Sec] │                                                         │ Headings:  [ Cormorant Gar▼]│
│                     │                                                         │ Body:      [ Inter        ▼]│
│ REVISION HISTORY    │                                                         │ [ Revert to Section Default]│
│ • v4 (Current Draft)│                                                         │                             │
│ • v3 (Published 2d) │                                                         │                             │
└─────────────────────┴─────────────────────────────────────────────────────────┴─────────────────────────────┘
```

#### Functional Defect Repair (`UX-DEF-007`)
- Add visual drop-target indicator borders (`.drag-over-above`, `.drag-over-below`) when dragging sections in the left hierarchy tree.

#### Acceptance Criteria
- [ ] Dragging a section reorders sections in memory and updates preview canvas order instantly.
- [ ] Clicking `[ Save Draft ]` persists to `store.data.templateDraft` without publishing live.
- [ ] Clicking `[ Publish to Live ]` bumps published version, creates immutable revision history record, and flushes to disk.

---

### Screen 15: White-Label & Custom Domains (`SCR-BRD-WHITELABEL`)
- **Canonical Route:** `/white-label` (Alias: `/whitelabel`)
- **Owning Component:** [`packages/ui/pages/whitelabel.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/whitelabel.ts)
- **Primary Users:** Franchise Owner, IT Administrator.
- **Purpose:** Full white-label branding, custom domain CNAME verification, automated SSL certificate staging, brand assets (logo, favicon, app icon), and branch-level CSS styling overrides.

#### Textual Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ White-Label & Custom Domains  │  Platform Branding Configuration            [ Save Branding Changes ]       │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ BRAND ASSETS & IDENTITY                                                                                     │
│ Restaurant Legal Name: [ OrbitoX Bistro & Bar                       ]  Tagline: [ Farm-to-fork gastronomy ] │
│ Brand Logo URL:        [ https://cdn.orbitox.io/bistro/logo.svg     ]  [ Upload Logo ↗ ]                    │
│ Favicon URL:           [ https://cdn.orbitox.io/bistro/favicon.ico  ]  App Icon URL: [ https://.../icon.png]│
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ CUSTOM DOMAIN & SSL PROVISIONING                                                                            │
│ Default Subdomain:   https://bistro.orbitox.io [ ACTIVE ]                                                   │
│ Custom Domain:       [ dine.orbitoxbistro.com                       ]  [ Verify DNS & Provision SSL ]       │
│ DNS Configuration Instructions:                                                                             │
│   Record Type: CNAME  ·  Host: dine  ·  Target Value: custom-ingress.orbitox.io  ·  TTL: 300 (5 mins)       │
│ Domain Verification Status: [ VERIFIED & ACTIVE ● ]  ·  SSL Certificate Status: [ PROVISIONED (TLS 1.3) ● ] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ BRANCH-SPECIFIC BRANDING OVERRIDES                                                                          │
│ | Branch               | Logo Override   | Primary Accent | Secondary Accent | Custom CSS Status           |│
│ | Ludhiana Main (HQ)   | [ Global Logo ] | [ #C86B3C 🎨 ] | [ #D99A45 🎨 ]   | [ 0 Rules Active ]  [Edit]  |│
│ | Delhi Connaught Place| [ Custom Logo ] | [ #9B2C2C 🎨 ] | [ #C5A059 🎨 ]   | [ 4 Rules Active ]  [Edit]  |│
│ | Chandigarh Sector 17 | [ Global Logo ] | [ #2E8540 🎨 ] | [ #D4883B 🎨 ]   | [ 0 Rules Active ]  [Edit]  |│
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ GLOBAL CUSTOM CSS STYLING INJECTION                                                                         │
│ [ /* Enter custom tenant CSS overrides here */                                                           ] │
│ [ :root { --diner-border-radius: 12px; }                                                                 ] │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Entering a valid domain and clicking `[ Verify DNS ]` updates `domainStatus` to `ACTIVE` and `sslStatus` to `ACTIVE`.
- [ ] Branch overrides allow individual locations to display unique primary colors and logos without affecting other branches.

---

## 4. Developer & Diagnostic Surfaces

---

### Screen 16: Template Composition Inspector (`SCR-DEV-TEMPLATES`)
- **Canonical Route:** `/developer/templates`
- **Owning Component:** `renderTemplateCompositionInspector()` in [`src/server.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/src/server.ts) line 5030.
- **Primary Users:** Frontend Architects, Theme Designers.
- **Purpose:** Diagnostic tool for comparing the Abstract Syntax Trees (AST), component composition models, responsive layouts, and token mappings between any two marketplace templates side-by-side.

#### Textual Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Template Composition AST Inspector  │  [ Base: Atelier Étoile Noir ▼ ] vs [ Compare: Roastery 1984 ▼ ]      │
├─────────────────────────────────────────────┬───────────────────────────────────────────────────────────────┤
│ TEMPLATE A: tmpl_haute_gastronomy           │ TEMPLATE B: tmpl_artisan_coffee                               │
│ Architecture: Split-Asymmetric Viewport     │ Architecture: Tactile Counter Vitrine                         │
│ Hero Model: Fixed Editorial Manifesto       │ Hero Model: Interactive Roast Profile Dial                    │
│ Card Pattern: Course Timeline Progression   │ Card Pattern: Tactile Counter Cards with Size Pills           │
│ Customizer: Sommelier Cellar Folio          │ Customizer: Milk Matrix & Cup Size Stepper                    │
│ Cart Dock: Sommelier Folio Slide-Over       │ Cart Dock: Barista Order Capsule Dock                         │
├─────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ COMPOSITION AST TREE:                       │ COMPOSITION AST TREE:                                         │
│ └─ PageRoot (split-asymmetric)              │ └─ PageRoot (counter-vitrine)                                 │
│    ├─ ViewportLeft (fixed 50%)              │    ├─ VitrineBarDial (interactive SVG)                        │
│    │  ├─ BrandEditorialManifesto            │    ├─ HearthBakeryDrawer (live countdown)                     │
│    │  └─ SommelierCellarPicks               │    ├─ CoffeeCategoryRail (horizontal pills)                   │
│    └─ ViewportRight (scroll 50%)            │    └─ ProductGrid (3-column responsive)                       │
│       ├─ TastingMovementTimeline            │       └─ VitrineCard [8oz / 12oz Steppers]                    │
│       └─ CourseDishStack                    │                                                               │
└─────────────────────────────────────────────┴───────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Selecting any two templates compares their JSON component trees and responsive column rules without syntax errors.

---

### Screen 17: Live Runtime Inspector (`SCR-DEV-INSPECT`)
- **Canonical Route:** `/developer/inspector`
- **Owning Component:** `renderDeveloperInspector()` in [`src/server.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/src/server.ts) line 5052.
- **Primary Users:** Platform Developers, DevOps Engineers.
- **Purpose:** Real-time inspection of in-memory Node.js runtime state, active mutex locks, idempotency records cache, SSE client connections, memory RSS, and event loop latency.

#### Textual Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🛰️ Live Runtime & Memory Inspector  │  PID: 9907 · Uptime: 4h 12m · Node v20.18.0 │ [ Refresh State ↻ ]     │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ RUNTIME TELEMETRY                                                                                           │
│ • Heap Used: 42.8 MB / 64.0 MB (66.8%)  ·  RSS Memory: 88.4 MB  ·  Event Loop Lag: 1.2ms                    │
│ • Active SSE Clients: 3 connections     ·  Last Event Sequence: 42  ·  Store File Size: 112 KB              │
├─────────────────────────────────────────────┬───────────────────────────────────────────────────────────────┤
│ ACTIVE MUTEX LOCKS                          │ IDEMPOTENCY RECORDS CACHE                                     │
│ • activeSettlementLocks: Set(0) []          │ • idemp_ord_9821 -> Hash: sha256_8f92a... (TTL: 23h 48m)     │
│ • activeDispatchLocks:   Set(0) []          │ • idemp_groc_1102 -> Hash: sha256_3b11c... (TTL: 23h 52m)    │
│ (All locks released. Zero deadlock risk.)   │ Total Cached Keys: 8 keys in memory                           │
├─────────────────────────────────────────────┴───────────────────────────────────────────────────────────────┤
│ RAW STORAGE SNAPSHOT (data/restaurant-runtime-store.json)                                                   │
│ [ View Raw JSON Tree ]  [ Force Atomic Flush ]  [ Download Backup ]  [ Test Simulated Disk Failure ]        │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Accurately reflects live process telemetry (heap, event sequence, lock status) without mutating data.

---

### Screen 18: Developer Diagnostics & System Health (`SCR-DEV-DIAG`)
- **Canonical Route:** `/developer/diagnostics`
- **Owning Component:** Handler in [`src/server.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/src/server.ts) line 5068.
- **Primary Users:** Site Reliability Engineers, Support Staff.
- **Purpose:** Diagnostic health checks, `/healthz/live` and `/healthz/ready` probe statuses, storage integrity verification, and audit event logs.

#### Textual Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🩺 System Diagnostics & Health Probes  │  Status: HEALTHY (100% Passing)           [ Run Full Diagnostic ↻ ]│
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PROBE RESULTS                                                                                               │
│ [✓] /healthz/live (Process Liveness) ......... HTTP 200 OK (0.8ms)                                           │
│ [✓] /healthz/ready (Storage & Engine) ........ HTTP 200 OK (1.2ms) · Database: READY, EventLoop: OK         │
│ [✓] Atomic File System (fs.renameSync) ....... PERMISSION GRANTED (Write / Read / Unlink OK)                │
│ [✓] Domain Event Sequence Monotonicity ...... VERIFIED (Seq: 42, Zero gaps detected)                        │
│ [✓] In-Memory Redaction Engine .............. VERIFIED (Base64, PII, Tokens masked 100%)                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ RECENT SECURITY & DOMAIN EVENTS LOG (Last 10 events)                                                        │
│ • [20:22:15] ORDER_CREATED · branch_ldh · Order #ord_9821 created on table T-14                             │
│ • [20:18:04] KDS_TASK_BUMPED · branch_ldh · Task #tsk_402 bumped to READY at Curry station                  │
│ • [20:10:00] SESSION_JOINED · branch_ldh · Table T-14 seated with party "Sharma Party"                      │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Probes execute non-destructively and return verified statuses.

---

## 5. Customer Storefronts & Standalone Applications

---

### Screen 19: Diner In-Restaurant PWA (`SCR-CUS-DINER`)
- **Canonical Route:** `/dine/:locator`
- **Owning Component:** [`packages/ui/pages/diner.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/diner.ts)
- **Primary Users:** In-Restaurant Dining Guest (Mobile Browser).
- **Purpose:** Atmospheric dining companion for browsing dishes, customizing food modifiers, submitting orders to kitchen, calling service, and tracking cooking status.
- **Note:** Dynamically mounts one of 6 canonical themes based on active configuration (detailed in Document 09). Below is the common shell and seating experience.

#### Textual Wireframe (Mobile 390px Viewport)
```
┌─────────────────────────────────────────────────────┐
│ 🍷 OrbitoX Bistro  │  Table 14 · Ludhiana  │ [🛎️ Call]│
├─────────────────────────────────────────────────────┤
│ WELCOMING SEATING BANNER (Non-blocking)             │
│ Welcome to Table 14! Party Name: [ Sharma Party   ] │
│ Guests: [ 4 ▼ ]  Mood: ( ) Casual  (•) Celebration  │
│ [ Save Seating Info ]                               │
├─────────────────────────────────────────────────────┤
│ MENU CATEGORY RAIL:                                 │
│ [ All ]  [ Starters * ]  [ Mains ]  [ Breads ] ...  │
├─────────────────────────────────────────────────────┤
│ DISH CARDS (Theme-Specific Composition)             │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [ High-Res Dish Photography ]                   │ │
│ │ PANEER TIKKA                            ₹380.00 │ │
│ │ Charcoal-grilled cottage cheese in spiced yogurt│ │
│ │ [ VEG ] [ GLUTEN_FREE ] · Chef's Signature      │ │
│ │ [ + Customize & Add ]                           │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ BUTTER CHICKEN                          ₹540.00 │ │
│ │ Slow-cooked in rich tomato butter gravy.        │ │
│ │ [ NON_VEG ] · Popular Item                      │ │
│ │ [ + Customize & Add ]                           │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ <FLOATING BOTTOM CART DOCK (Sticky)>                │
│ [ 🛒 2 Items · ₹920.00          | View Folio ➔ ]    │
├─────────────────────────────────────────────────────┤
│ <Slide-Up Modifier Drawer: "Paneer Tikka">          │
│ Marinade Style (Choose 1 - Required):               │
│   (•) Cardamom & Cream (+₹0.00)                     │
│   ( ) Black Truffle & Smoked Garlic (+₹120.00)      │
│ Accompaniments (Optional):                          │
│   [X] Mint Chutney (+₹0.00)                         │
│   [ ] Crisp Garlic Naan (+₹110.00)                  │
│ Special Requests: [ Extra spicy please...         ] │
│ Quantity: [- 1 +]                                   │
│ [ Add to Order · ₹500.00 ]                          │
└─────────────────────────────────────────────────────┘
```

#### Functional Defect Repair (`UX-DEF-005`)
- Implement downward swipe-to-dismiss gesture physics on `.sheet-content` so guests can flick the drawer closed naturally.

#### Acceptance Criteria
- [ ] Submitting order requests a SHA-256 pricing quote from `/api/restaurant/quote` before posting to `/api/restaurant/orders`.
- [ ] Tapping `[ 🛎️ Call ]` presents options (*Waiter*, *Water*, *Bill*); selecting one dispatches `POST /api/restaurant/service-requests` and shows confirmation toast.

---

### Screen 20: CraveAtlas Flagship Portal (`SCR-CUS-CRAVE`)
- **Canonical Route:** `/apps/crave-atlas`
- **Owning Component:** [`packages/ui/pages/crave-atlas.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/crave-atlas.ts)
- **Primary Users:** Takeaway Patrons, Direct Brand Ordering Guests.
- **Purpose:** Luxury brand discovery portal featuring culinary signature carousel, multi-branch switching, delivery radius validation, and 1-tap checkout.

#### Textual Wireframe (Desktop 1440px / Mobile Adaptable)
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🪐 OrbitoX Bistro  │  [📍 Ludhiana Main (Open Now · Closes 23:30) ▼]      │ [ Search Dishes... ] [ 🛒 Cart: 2 ]│
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ HERO STORYTELLING BANNER                                                                                    │
│ "Authentic Farm-to-Fork Indian Gastronomy Over Live Charcoal Embers"                                        │
│ Delivering to Ludhiana Urban (15-25 mins) · 5% Flat GST · 100% Contactless Takeaway                         │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ CULINARY SIGNATURES (WAI-ARIA Carousel with Swipe & Arrow Steppers)                                         │
│ [ < Prev ]                                                                                       [ Next > ] │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────────────┐ │
│ │ [ Butter Chicken ]   │ │ [ Dal Makhani ]      │ │ [ Paneer Tikka ]     │ │ [ Gulab Jamun ]              │ │
│ │ Tandoor Roast · ₹540 │ │ 24h Simmered · ₹420  │ │ Spiced Yogurt · ₹380 │ │ Saffron Pistachio · ₹220     │ │
│ │ [ + Add to Order ]   │ │ [ + Add to Order ]   │ │ [ + Add to Order ]   │ │ [ + Add to Order ]           │ │
│ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ └──────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ FULL MENU CATALOG: [ All ] [ Starters ] [ Mains ] [ Breads ] [ Beverages ] [ Desserts ]                     │
│ (3-column responsive dish cards with dietary badges, ingredient lists, and inline modifiers)                │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ <Slide-In Order Folio Drawer (Right)>                                                                       │
│ Mode: (•) Delivery  ( ) Pickup at Branch · Branch: Ludhiana Main                                            │
│ Items: 1x Butter Chicken (₹540.00), 2x Garlic Naan (₹220.00)                                                │
│ Delivery Address: [ 42 Mall Road, Civil Lines, Ludhiana              ]                                      │
│ Subtotal: ₹760.00 · Delivery Fee: ₹40.00 · 5% GST: ₹38.00 · TOTAL: ₹838.00                                  │
│ [ Proceed to Checkout (₹838.00) ➔ ]                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Carousel supports touch gestures on mobile and keyboard arrow keys on desktop.
- [ ] Switching branches checks distance and recalculates branch price overrides.

---

### Screen 21: SwiftBite Express Ordering (`SCR-CUS-SWIFT`)
- **Canonical Route:** `/apps/swift-bite`
- **Owning Component:** [`packages/ui/pages/swift-bite.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/swift-bite.ts)
- **Primary Users:** High-velocity QSR and express counter ordering guests.
- **Purpose:** Minimal friction mobile-first ordering app with 15-minute speed SLA guarantees, past favorites reordering, and inline quantity steppers.

#### Textual Wireframe (Mobile 390px Viewport)
```
┌─────────────────────────────────────────────────────┐
│ ⚡ SwiftBite · OrbitoX Express    │ [ Ludhiana ▼ ]  │
├─────────────────────────────────────────────────────┤
│ SPEED SLA GUARANTEE BANNER:                         │
│ ⚡ In Kitchen Now · Pick up in 15-20 Mins · Counter A│
├─────────────────────────────────────────────────────┤
│ 1-TAP REORDER PAST FAVORITES:                       │
│ ┌──────────────────────┐ ┌────────────────────────┐ │
│ │ Butter Chicken + Naan│ │ Dal Makhani + Roti     │ │
│ │ Ordered 2d ago · ₹650│ │ Ordered 5d ago · ₹490  │ │
│ │ [ ⚡ Reorder in 1-Tap]│ │ [ ⚡ Reorder in 1-Tap] │ │
│ └──────────────────────┘ └────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ FAST-ADD MENU ITEMS:                                │
│ ┌─────────────────────────────────────────────────┐ │
│ │ BUTTER CHICKEN                          ₹540.00 │ │
│ │ Rich tomato gravy · Ready in 10m                │ │
│ │ [ -  1  + ] <── (Transforms directly in card)   │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ GARLIC NAAN                             ₹110.00 │ │
│ │ Clay oven roasted crisp                         │ │
│ │ [ + ADD ]                                       │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ <STICKY BOTTOM 1-TAP CHECKOUT BAR>                  │
│ [ ⚡ 2 Items · ₹650.00       | 1-Tap UPI Pay ➔ ]     │
└─────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Uncustomized items transform directly into `[- 1 +]` steppers without opening modal drawers.
- [ ] 1-Tap checkout generates idempotent request (`x-idempotency-key`) preventing double submission.

---

### Screen 22: PantryRush Dark-Store Grocery (`SCR-CUS-PANTRY`)
- **Canonical Route:** `/apps/pantry-rush`
- **Owning Component:** [`packages/ui/pages/pantry-rush.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/pantry-rush.ts)
- **Primary Users:** Hyper-local grocery & dark-store delivery customers.
- **Purpose:** High-density supermarket SKU shelf, real inventory stock limits, out-of-stock substitution preference engine, and free delivery thresholds.

#### Textual Wireframe (Desktop 1440px / Mobile 390px)
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🛒 PantryRush · 15-Min Groceries  │  [📍 Deliver to: 141001 (12-15 Mins) ▼]      │ [ Search grocery SKUs ] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ FREE DELIVERY THRESHOLD BAR:                                                                                │
│ [████████████████████████░░░░░░░░] Add ₹49.00 more to unlock FREE Delivery! (Cart: ₹150 / ₹199)            │
├─────────────────────────┬───────────────────────────────────────────────────────────────────────────────────┤
│ AISLES                  │ SUPERMARKET SHELF GRID (4 Columns Desktop / 2 Columns Mobile)                     │
│ • Dairy & Bread *       │ ┌─────────────────────────┐ ┌─────────────────────────┐ ┌───────────────────────┐ │
│ • Fresh Fruits          │ │ [ Amul Butter 500g ]    │ │ [ Farm Fresh Eggs 6pk ] │ │ [ Organic Milk 1L ]   │ │
│ • Vegetables            │ │ Amul · Dairy Block      │ │ FarmFresh · Brown Eggs  │ │ Mother Dairy · Pouch  │ │
│ • Cold Drinks & Juices  │ │ MRP: ₹290  Selling: ₹275│ │ MRP: ₹90  Selling: ₹82  │ │ MRP: ₹68  Selling: ₹66│ │
│ • Instant Snacks        │ │ Stock: 14 units left    │ │ Stock: 2 units left ⚠️  │ │ Stock: 0 [SOLD OUT]   │ │
│ ─────────────────────── │ │ [ -  1  + ]             │ │ [ + ADD ]               │ │ [ OUT OF STOCK ]      │ │
│ SUBSTITUTION PREFERENCE │ └─────────────────────────┘ └─────────────────────────┘ └───────────────────────┘ │
│ If item is out of stock:│                                                                                   │
│ (•) Allow best replacem.│ <Checkout Summary: Cart Total: ₹357.00>                                           │
│ ( ) Call me to confirm  │ Free Delivery Applied! · ETA: 12 mins from Ludhiana Central Dark Store            │
│ ( ) Refund missing item │ [ Place 15-Min Delivery Order ➔ ]                                                 │
└─────────────────────────┴───────────────────────────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Attempting to increment quantity beyond `sku.stockQuantity` shows disabled button and warning tooltip ("Maximum available stock reached").
- [ ] Order placement triggers `store.decrementGroceryStock` and broadcasts `GROCERY_STOCK_DECREMENTED`.

---

## 6. Summary of Acceptance & Verification Matrix

Every screen wireframe defined above includes:
1. Exact component hierarchies and relative CSS flex/grid coordinates.
2. Verified backend data dependencies and mutation methods.
3. Explicit separation between visual design refinement and underlying functional defect repair.
4. Deterministic acceptance criteria verifiable by QA testers without subjective aesthetic ambiguity.
