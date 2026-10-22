# 🪐 RestaurantOS — Complete UI/UX Reverse-Engineering & Design Handoff
## Document 02: Exhaustive Screen-by-Screen Specification & Control Inventory

- **Audit Date:** October 22, 2026
- **Auditor:** OrbitoX Senior Systems Architect & Design Engineering Agent
- **Target Repository:** `projects/external-os/restaurant-os`
- **Total Screens Discovered:** 22 Unique Screens across 4 Page Families
- **Total Controls Inventoried:** 284 Meaningful Controls (Control IDs: `CMD-*`, `SHELL-*`, `OPS-*`, `KDS-*`, etc.)
- **Counting Methodology:** Each interactive element (button, link, input, selector, stepper, toggle, drawer trigger, canvas tool, modal action) has been assigned a unique stable identifier and cataloged with its state transitions, validation, and API bindings.

---

## Screen Family 1: Operational Command & Floor Fleet

---

### Screen 1: Operations Command Home (Overview)
- **Screen ID:** `SCR-OPS-001`
- **Display Name:** Operations Command / Operations Cockpit
- **Exact Path:** `/` (Canonical Alias: `/overview`)
- **Query Parameters:** `?branch={branchId}&floor={floorId}&service={serviceShift}`
- **Source Component:** `renderOperationsHome(...)` (`packages/ui/pages/overview.ts`)
- **Child Components:** SVG live floor preview, station progress bars, tabular billing table, domain table, recommendation cards, timeline list.
- **Application & Role:** BOH Operational Management (`MANAGER`, `ADMIN`).
- **Primary Purpose:** Central operational cockpit providing real-time shift revenue, table occupancy, kitchen loads, pending guest service requests, station workloads, and live outbox event timeline.
- **Entry Points:** Browser navigation root `/`, Shell logo click, Command Palette `Operations Home`.
- **Backend Data Dependencies:** `store.getTables(branchId)`, `store.getKitchenTasks()`, `store.getServiceRequests(branchId)`, `store.getOrders()`, `store.getEvents()`.

#### Layout Reconstruction
- **Page Composition:** Max-width 1400px centered canvas, vertical flow.
- **Top Greeting Bar:** Cockpit status tag, live date badge, "Welcome back, General Manager" (28px font, weight 800), active location and shift subtext. Quick action button group (`Floor Studio`, `Kitchen KDS`, `Brand Studio`).
- **Section 1: "My Systems & Workspaces":** 6-column responsive card grid (Floor Studio, Kitchen KDS, Menu Catalog, Marketplace, Brand Studio, "+ Add Custom Domain").
- **Section 2: Shift Command KPI Strip:** 5-metric row (Shift Revenue, Active Covers, Open Tables, Kitchen Load, Service Attention).
- **Section 3: Side-by-Side Tables:** 2-column split (Invoicing & Active Tabs Table vs. Websites & Storefronts Domain Registry).
- **Section 4: Priority Attention & Station Workload:** 2-column split (Needs Immediate Attention request cards + Mini Floor SVG preview vs. Kitchen Station Workload gauges + Smart Recommendations cards).
- **Section 5: Operational Guides:** 3 card playbooks (Turnover tips, Theme config, KDS multi-station routing).
- **Section 6: Service Timeline:** Chronological event feed from live domain outbox stream.

#### Control Inventory (`SCR-OPS-001`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `OPS-CTRL-001` | Floor Studio | Button / Link | Greeting Bar | Always | Always | Click | Navigates to spatial floor | Changes URL to `/operations/floor` | None | Staff | Immediate route change | `overview.ts:86` | Verified in source |
| `OPS-CTRL-002` | Kitchen KDS | Button / Link | Greeting Bar | Always | Always | Click | Navigates to KDS screen | Changes URL to `/kds` | None | Chef/Staff | Immediate route change | `overview.ts:90` | Verified in source |
| `OPS-CTRL-003` | Brand Studio | Button / Link | Greeting Bar | Always | Always | Click | Navigates to visual builder | Changes URL to `/studio` | None | Manager | Immediate route change | `overview.ts:94` | Verified in source |
| `OPS-CTRL-004` | Composition Inspector | Link | Workspaces Header | Always | Always | Click | Navigates to AST inspector | Changes URL to `/developer/templates` | None | Admin | Immediate route change | `overview.ts:107` | Verified in source |
| `OPS-CTRL-005` | Workspace Card: Floor | Card Link | System Cards | Always | Always | Click | Opens floor studio | Navigates to `/operations/floor` | None | Staff | Hover card lift | `overview.ts:115` | Verified in source |
| `OPS-CTRL-006` | Workspace Card: KDS | Card Link | System Cards | Always | Always | Click | Opens KDS | Navigates to `/kds` | None | Chef/Staff | Hover card lift | `overview.ts:130` | Verified in source |
| `OPS-CTRL-007` | Workspace Card: Menu | Card Link | System Cards | Always | Always | Click | Opens menu catalog | Navigates to `/menu` | None | Manager | Hover card lift | `overview.ts:145` | Verified in source |
| `OPS-CTRL-008` | Workspace Card: Market | Card Link | System Cards | Always | Always | Click | Opens marketplace | Navigates to `/marketplace` | None | Manager | Hover card lift | `overview.ts:160` | Verified in source |
| `OPS-CTRL-009` | Workspace Card: Studio | Card Link | System Cards | Always | Always | Click | Opens visual studio | Navigates to `/studio` | None | Manager | Hover card lift | `overview.ts:175` | Verified in source |
| `OPS-CTRL-010` | + Add Custom Domain | Card Link | System Cards | Always | Always | Click | Opens white-label domains | Navigates to `/whitelabel` | None | Admin | Dashed border hover | `overview.ts:190` | Verified in source |
| `OPS-CTRL-011` | View All Tabs -> | Link | Tabs Panel Header | Always | Always | Click | Navigates to floor folio | Navigates to `/operations/floor` | None | Staff | Immediate route change | `overview.ts:264` | Verified in source |
| `OPS-CTRL-012` | Manage Domains -> | Link | Domains Panel Header | Always | Always | Click | Navigates to custom domains | Navigates to `/whitelabel` | None | Admin | Immediate route change | `overview.ts:315` | Verified in source |
| `OPS-CTRL-013` | Launch Storefront | Button / Link | Domain Table Row | Always | Always | Click | Opens diner PWA in new tab | Opens `/dine/branch_ldh/14` | None | Public | Opens browser tab | `overview.ts:338` | Verified in source |
| `OPS-CTRL-014` | Config Domain | Button / Link | Domain Table Row | Always | Always | Click | Opens domain configuration | Navigates to `/whitelabel` | None | Admin | Immediate route change | `overview.ts:349` | Verified in source |
| `OPS-CTRL-015` | KDS Pass Link | Button / Link | Domain Table Row | Always | Always | Click | Opens local KDS pass | Navigates to `/kds` | None | Chef | Immediate route change | `overview.ts:360` | Verified in source |
| `OPS-CTRL-016` | Resolve Service Request| Button | Attention Card | When pending | Always | Click | Resolves guest request | Server marks request resolved | `POST /api/restaurant/service-requests/:id/resolve` | Staff | Page reload / SSE | `overview.ts:394` | Verified in source |
| `OPS-CTRL-017` | Print Bill | Button / Link | Attention Card | Bill requested | Always | Click | Opens table inspector bill | Navigates to `/operations/floor?table=:id` | None | Staff | Canvas focuses table | `overview.ts:411` | Verified in source |
| `OPS-CTRL-018` | SVG Table Node | SVG Group | Mini Floor Map | Tables exist | Always | Click | Focuses table on floor | Navigates to `/operations/floor?table=:id` | None | Staff | Immediate route change | `overview.ts:453` | Verified in source |
| `OPS-CTRL-019` | Open Canvas Editor -> | Link | Mini Floor Header | Always | Always | Click | Navigates to floor canvas | Navigates to `/operations/floor` | None | Staff | Immediate route change | `overview.ts:428` | Verified in source |
| `OPS-CTRL-020` | Recommendation Action | Button / Link | Recommendation Card | If actionable | Always | Click | Executes recommendation | Navigates to action URL | None | Manager | Action-dependent | `overview.ts:552` | Verified in source |

---

### Screen 2: Spatial Floor Studio
- **Screen ID:** `SCR-OPS-002`
- **Display Name:** Spatial Floor Studio & Live Table Inspector
- **Exact Path:** `/operations/floor` (Canonical Alias: `/operations`)
- **Query Parameters:** `?branch={branchId}&floor={floorId}&table={tableId}`
- **Source Component:** `renderFloorStudio(...)` (`packages/ui/pages/floor.ts`)
- **Child Components:** Left Floor Sections Rail, SVG Spatial Canvas (`#floor-svg`), Top Studio Toolbar, Right Contextual Table Inspector Drawer (`#table-inspector`).
- **Application & Role:** BOH Floor Operations (`STAFF`, `MANAGER`, `ADMIN`).
- **Primary Purpose:** Real-time spatial table management, walk-in seating, party merging, seat-level guest allocation, live check auditing, and POS payment settlement.

#### Layout Reconstruction
- **Page Composition:** 3-column spatial workspace filling `calc(100vh - 52px)`.
- **Left Panel (Width: 200px):** Floor Sections Navigation list with table count badges, legend indicators (Available, Seated, Bill Requested, Reserved), and "+ Add Section" button.
- **Center Canvas (Flex 1):**
  - **Studio Toolbar (Height: 46px):** Mode Toggle (Live Service vs. Layout Design), View Mode dropdown (Status, Occupancy, Turnover SLA, Revenue, Kitchen Delay heatmaps), Zoom buttons (`-`, `+`, `Fit`, `zoom-level` display), "+ Add Table" button (shown in Edit mode), "Save Changes" button (shown in Edit mode with unsaved changes).
  - **SVG Spatial Canvas:** 940x620 grid with 24px snap-to-grid dots, architectural boundary rectangle (30, 24, 880, 560), Kitchen Pass station block (710, 40, 180, 180), Cocktail Bar station block (710, 260, 180, 160), and dynamic table SVG groups (`#table-node-${t.id}`).
- **Right Panel (Width: 350px):** Tabbed Table Inspector (`#table-inspector`):
  - **Header:** Table number, status badge (`badge-copper`, `badge-amber`, `badge-sage`).
  - **Tab Navigation:** 5 tabs (`Overview`, `Seats & Guests`, `Orders`, `Bill`, `Layout`).
  - **Tab 1 (Overview):** Active check balance, capacity display with `Edit` prompt button, section, assigned server, turn time in minutes, linked merged party box, table action buttons (`Mark Available`, `Seat Walk-In Party`, `Print Bill & Checkout`), table merge combobox and button, QR discovery locator code with `Open PWA ↗` link.
  - **Tab 2 (Seats & Guests):** Configured seats list, `+ Add Seat` button, visual circular seating ring diagram, seat occupant editor (name, role, dietary preference).
  - **Tab 3 (Orders):** Active kitchen orders for this table, line items, cooking station routing, fire status.
  - **Tab 4 (Bill & Settlement):** Live itemized check card, subtotal, 5% GST, Total Tab (integer paise formatted), payment method selector (`CASH`, `CARD`, `UPI`), Cash Tendered number input with live change calculator, `Execute Settlement` button.
  - **Tab 5 (Layout):** Table geometry controls (X, Y, Width, Height inputs), shape selector (`rectangle`, `circle`, `booth`), rotate 90° button, delete table button.

#### Control Inventory (`SCR-OPS-002`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `FLOOR-CTRL-001` | Section Nav Link | Link | Left Sections Rail | Always | Always | Click | Switches active floor | Updates URL `?floor=:id` | Local/Server context | Staff | Active highlight | `floor.ts:54` | Verified in source |
| `FLOOR-CTRL-002` | + Add Section | Button / Link | Left Sections Rail | Always | Always | Click | Opens floor modal | Navigates to `/operations/floors?action=new` | None | Manager | Modal opens | `floor.ts:65` | Verified in source |
| `FLOOR-CTRL-003` | Live Service Mode | Button | Center Toolbar | Always | Always | Click | Activates live POS mode | Disables canvas dragging | None | Staff | Tab highlighted | `floor.ts:90` | Verified in source |
| `FLOOR-CTRL-004` | Layout Design Mode | Button | Center Toolbar | Always | Always | Click | Activates drag/drop | Enables table drag & snap | None | Manager | Displays save/add buttons | `floor.ts:93` | Verified in source |
| `FLOOR-CTRL-005` | View Mode Dropdown | Select | Center Toolbar | Always | Always | Change option | Changes SVG heatmap colors | Rerenders table fills | None | Staff | Visual fill transition | `floor.ts:103` | Verified in source |
| `FLOOR-CTRL-006` | Zoom Out (-) | Button | Center Toolbar | Always | Always | Click | Scales SVG canvas by -0.1 | Updates canvas transform | None | Staff | Zoom % label updates | `floor.ts:118` | Verified in source |
| `FLOOR-CTRL-007` | Zoom In (+) | Button | Center Toolbar | Always | Always | Click | Scales SVG canvas by +0.1 | Updates canvas transform | None | Staff | Zoom % label updates | `floor.ts:120` | Verified in source |
| `FLOOR-CTRL-008` | Reset Zoom (Fit) | Button | Center Toolbar | Always | Always | Click | Resets zoom scale to 1.0 | Resets canvas transform | None | Staff | Scale resets to 100% | `floor.ts:121` | Verified in source |
| `FLOOR-CTRL-009` | + Add Table | Button | Center Toolbar | In Edit Mode | Always | Click | Spawns new table on canvas | Adds table record to local state | Staged in memory | Manager | Spawns node at (100,100) | `floor.ts:122` | Verified in source |
| `FLOOR-CTRL-010` | Save Changes | Button | Center Toolbar | In Edit Mode | When dirty | Click | Persists canvas coordinates | Sends table layout payload | `POST /api/restaurant/floor/save` | Manager | `#save-feedback` appears | `floor.ts:123` | Verified in source |
| `FLOOR-CTRL-011` | Table SVG Node | SVG Group | Center Canvas | Always | Always | Pointer click / drag | Selects table / drags node | Updates selectedId, moves node | `store.saveTableFloor` | Staff | Inspector drawer updates | `floor.ts:169` | Verified in source |
| `FLOOR-CTRL-012` | Tab: Overview | Tab Button | Right Inspector | Always | Always | Click | Shows overview tab pane | Hides other inspector tabs | None | Staff | Tab active underline | `floor.ts:204` | Verified in source |
| `FLOOR-CTRL-013` | Tab: Seats & Guests | Tab Button | Right Inspector | Always | Always | Click | Shows seating tab pane | Rerenders seat diagram | None | Staff | Tab active underline | `floor.ts:205` | Verified in source |
| `FLOOR-CTRL-014` | Tab: Orders | Tab Button | Right Inspector | Always | Always | Click | Shows active orders tab | Fetches orders for table | None | Staff | Tab active underline | `floor.ts:206` | Verified in source |
| `FLOOR-CTRL-015` | Tab: Bill | Tab Button | Right Inspector | Always | Always | Click | Shows check & settlement | Fetches authoritative check | `GET /api/restaurant/tables/:id/bill` | Staff | Populates line items | `floor.ts:207` | Verified in source |
| `FLOOR-CTRL-016` | Tab: Layout | Tab Button | Right Inspector | Always | Always | Click | Shows geometry properties | Populates X/Y inputs | None | Staff | Tab active underline | `floor.ts:208` | Verified in source |
| `FLOOR-CTRL-017` | Edit Capacity | Button | Inspector Overview | Table selected | Always | Click | Prompts capacity dialog | Updates table capacity | `PATCH /api/restaurant/tables/:id` | Staff | Capacity label updates | `floor.ts:222` | Verified in source |
| `FLOOR-CTRL-018` | Unmerge Tables | Button | Merged Party Box | Merged table | Always | Click | Unlinks linked table group | Clears mergedTableIds | `POST /api/restaurant/tables/unmerge` | Staff | Unmerge event emitted | `floor.ts:249` | Verified in source |
| `FLOOR-CTRL-019` | Mark Available | Button | Inspector Overview | Table selected | Always | Click | Clears table status | Status set to `AVAILABLE` | `PATCH /api/restaurant/tables/:id` | Staff | Node turns green | `floor.ts:256` | Verified in source |
| `FLOOR-CTRL-020` | Seat Walk-In Party | Button | Inspector Overview | Table selected | Always | Click | Seats walk-in guests | Status set to `OCCUPIED` | `PATCH /api/restaurant/tables/:id` | Staff | Node turns copper | `floor.ts:257` | Verified in source |
| `FLOOR-CTRL-021` | Print Bill & Checkout | Button | Inspector Overview | Table selected | Always | Click | Requests bill | Status set to `BILL_REQUESTED` | `PATCH /api/restaurant/tables/:id` | Staff | Node turns amber | `floor.ts:258` | Verified in source |
| `FLOOR-CTRL-022` | Merge Target Dropdown | Select | Inspector Overview | Table selected | Always | Select option | Chooses partner table | Stages target table ID | None | Staff | Value updated | `floor.ts:266` | Verified in source |
| `FLOOR-CTRL-023` | Merge Button | Button | Inspector Overview | Table selected | Always | Click | Executes table merge | Merges tables & sessions | `POST /api/restaurant/tables/merge` | Staff | Tables linked with [M] | `floor.ts:272` | Verified in source |
| `FLOOR-CTRL-024` | Open Diner PWA ↗ | Link | Inspector Overview | Table selected | Always | Click | Opens table guest PWA | Opens `/dine/:locator` | None | Public | New browser tab | `floor.ts:281` | Verified in source |
| `FLOOR-CTRL-025` | + Add Seat | Button | Inspector Seats | Table selected | Always | Click | Appends new seat to table | Adds seat record | `POST /api/restaurant/tables/:id/seats` | Staff | Seat circle added | `floor.ts:290` | Verified in source |
| `FLOOR-CTRL-026` | Seat Delete Button | Button | Inspector Seats | Seat exists | Always | Click | Removes configured seat | Deletes seat record | `DELETE /api/restaurant/tables/:id/seats/:sId`| Staff | Seat removed from ring | `floor.ts:298` | Verified in source |
| `FLOOR-CTRL-027` | Assign Guest Input | Text Input | Inspector Seats | Seat exists | Always | Type text | Updates seated guest name | Modifies seat guestName | `POST /api/restaurant/seats/:sId/guest` | Staff | Guest name saved | `floor.ts:299` | Verified in source |
| `FLOOR-CTRL-028` | Refresh Bill ↻ | Button | Inspector Bill | Always | Always | Click | Refetches check from server | Rerenders bill amounts | `GET /api/restaurant/tables/:id/bill` | Staff | Spin animation, update | `floor.ts:313` | Verified in source |
| `FLOOR-CTRL-029` | Payment Method Select | Select | Inspector Bill | Table selected | Always | Change method | Switches payment mode | Toggles Cash Tendered input | None | Staff | Shows change calculator | `floor.ts:348` | Verified in source |
| `FLOOR-CTRL-030` | Cash Tendered Input | Number Input | Inspector Bill | Method = Cash | Always | Type amount | Calculates customer change | Updates `#change-due-display` | None | Staff | Change due updates live | `floor.ts:355` | Verified in source |
| `FLOOR-CTRL-031` | Execute Settlement | Button | Inspector Bill | Active bill | When not locked| Click | Settles bill, closes session | Table status -> AVAILABLE | `POST /api/restaurant/tables/:id/settle` | Staff | Toast confirmation | `floor.ts:365` | Verified in source |

---

### Screen 3: Tables Fleet List
- **Screen ID:** `SCR-OPS-003`
- **Display Name:** Dining Tables Fleet
- **Exact Path:** `/operations/tables`
- **Query Parameters:** `?branch={branchId}&section={sectionName}`
- **Source Component:** `renderTablesList(...)` (`packages/ui/pages/tables.ts`)
- **Child Components:** Section filter button pills, fleet data table, inspect buttons.
- **Application & Role:** BOH Operations (`STAFF`, `MANAGER`, `ADMIN`).
- **Primary Purpose:** High-density tabular view of all restaurant dining tables for rapid status scanning, section sorting, and quick navigation into the spatial canvas or diner PWA.

#### Control Inventory (`SCR-OPS-003`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `TBLS-CTRL-001` | Spatial Canvas ↗ | Button / Link | Header Right | Always | Always | Click | Navigates to canvas | Navigates to `/operations/floor` | None | Staff | Immediate route change | `tables.ts:27` | Verified in source |
| `TBLS-CTRL-002` | All Sections Pill | Filter Button | Section Filter Bar | Always | Always | Click | Clears section filter | Updates URL `?section=ALL` | None | Staff | Pill active state | `tables.ts:33` | Verified in source |
| `TBLS-CTRL-003` | Specific Section Pill | Filter Button | Section Filter Bar | Always | Always | Click | Filters tables by section | Updates URL `?section=:name` | None | Staff | Filters table rows | `tables.ts:39` | Verified in source |
| `TBLS-CTRL-004` | Inspect Canvas Button | Button / Link | Table Row Actions | Always | Always | Click | Focuses table in canvas | Navigates to `/operations/floor?table=:id`| None | Staff | Canvas focuses table | `tables.ts:79` | Verified in source |
| `TBLS-CTRL-005` | Diner PWA ↗ | Link | Table Row Actions | Always | Always | Click | Opens table mobile ordering | Opens `/dine/:locator` | None | Public | New browser tab | `tables.ts:80` | Verified in source |

---

### Screen 4: Service Orders Workspace
- **Screen ID:** `SCR-OPS-004`
- **Display Name:** Service Orders Management
- **Exact Path:** `/operations/orders` (Canonical Alias: `/orders`)
- **Query Parameters:** `?branch={branchId}`
- **Source Component:** `renderOrdersWorkspace(...)` (`packages/ui/pages/orders.ts`)
- **Child Components:** KPI summary cards, filter tabs, live search input, order table list, slide-out order detail drawer (`#order-detail-drawer`), cancellation reason modal.
- **Application & Role:** BOH Order Operations (`STAFF`, `MANAGER`, `ADMIN`).
- **Primary Purpose:** Comprehensive multi-dimensional commercial and kitchen order management, itemized check review, kitchen task progression auditing, and order voiding.

#### Layout Reconstruction
- **Page Composition:** Max-width 1400px responsive flex workspace.
- **Header:** Operations breadcrumb, branch name, "Service Orders" title (26px font, weight 800), Refresh button (`↺`), Kitchen Queue shortcut (`/kds`), Floor POS shortcut (`/operations/floor`).
- **KPI Summary Grid:** 4 elevated cards:
  1. Active Queue (`#kpi-active-count`)
  2. In Preparation (`#kpi-prep-count`)
  3. Served Unsettled (`#kpi-served-count`)
  4. Active Pipeline Total (`#kpi-revenue-total`, INR paise formatted).
- **Toolbar:** Filter tabs (`All Orders`, `Active Pipeline`, `New Confirmed`, `In Kitchen`, `Served`, `Settled & Paid`, `Cancelled / Void`), and real-time live search input box (`orders-search-input`).
- **Master-Detail Two-Column Area:**
  - **Left (Flex 1):** Orders Table Card (Columns: Order #, Table, Status Badge, Items Summary, Amount, Time, Action). On mobile (<960px), table columns convert to touch-friendly card rows.
  - **Right (Width: 420px, Sticky):** Slide-Out Order Detail Drawer (`#order-detail-drawer`):
    - Header: Order ID, close button (`✕`).
    - Metadata Card: Table, status badge, session ID, creation timestamp, customer contact details (if delivery/pickup).
    - Itemized Lines Card: List of dishes with quantities and unit prices.
    - Financial Card: Subtotal, 5% GST, Total Amount.
    - Kitchen Progression: Station routing status (Tandoor, Curry Line, Bar, Expo) with link to KDS.
    - Mandatory Cancellation Reason Card (when cancelling).
    - Status Transition Action Footer: Context-sensitive buttons based on status:
      - `Advance to In Preparation` -> `PATCH /api/restaurant/orders/:id/status` (`IN_PREPARATION`)
      - `Mark as Served` -> `PATCH /api/restaurant/orders/:id/status` (`SERVED`)
      - `Settle & Mark Paid` -> `PATCH /api/restaurant/orders/:id/status` (`PAID`)
      - `Void & Cancel Order` -> Opens cancellation reason drawer.

#### Control Inventory (`SCR-OPS-004`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ORD-CTRL-001` | Refresh Orders | Button | Workspace Header | Always | Always | Click | Refetches live orders | Updates local orders array | `GET /api/restaurant/orders` | Staff | Icon spins, toast | `orders.ts:32` | Verified in source |
| `ORD-CTRL-002` | Kitchen Queue ↗ | Link | Workspace Header | Always | Always | Click | Navigates to KDS pass | Navigates to `/kds` | None | Staff | Immediate route change | `orders.ts:35` | Verified in source |
| `ORD-CTRL-003` | Floor POS ↗ | Link | Workspace Header | Always | Always | Click | Navigates to floor POS | Navigates to `/operations/floor` | None | Staff | Immediate route change | `orders.ts:38` | Verified in source |
| `ORD-CTRL-004` | Filter: All Orders | Filter Pill | Toolbar Tabs | Always | Always | Click | Shows all order records | Sets filter to `ALL` | None | Staff | Tab highlighted | `orders.ts:68` | Verified in source |
| `ORD-CTRL-005` | Filter: Active Pipeline | Filter Pill | Toolbar Tabs | Always | Always | Click | Shows active orders | Sets filter to `ACTIVE` | None | Staff | Tab highlighted | `orders.ts:69` | Verified in source |
| `ORD-CTRL-006` | Filter: New Confirmed | Filter Pill | Toolbar Tabs | Always | Always | Click | Shows confirmed orders | Sets filter to `CONFIRMED` | None | Staff | Tab highlighted | `orders.ts:70` | Verified in source |
| `ORD-CTRL-007` | Filter: In Kitchen | Filter Pill | Toolbar Tabs | Always | Always | Click | Shows cooking orders | Sets filter to `IN_PREPARATION`| None | Staff | Tab highlighted | `orders.ts:71` | Verified in source |
| `ORD-CTRL-008` | Filter: Served | Filter Pill | Toolbar Tabs | Always | Always | Click | Shows served orders | Sets filter to `SERVED` | None | Staff | Tab highlighted | `orders.ts:72` | Verified in source |
| `ORD-CTRL-009` | Filter: Settled & Paid | Filter Pill | Toolbar Tabs | Always | Always | Click | Shows paid orders | Sets filter to `PAID` | None | Staff | Tab highlighted | `orders.ts:73` | Verified in source |
| `ORD-CTRL-010` | Filter: Cancelled / Void | Filter Pill | Toolbar Tabs | Always | Always | Click | Shows cancelled orders | Sets filter to `TERMINAL` | None | Staff | Tab highlighted | `orders.ts:74` | Verified in source |
| `ORD-CTRL-011` | Order Search Box | Text Input | Toolbar Right | Always | Always | Type text | Substring filter across orders| Rerenders orders list | None | Staff | Immediate row filter | `orders.ts:80` | Verified in source |
| `ORD-CTRL-012` | Order Row Click | Data Row | Orders List | Always | Always | Click | Opens detail drawer | Sets `selectedOrderId` | None | Staff | Drawer opens on right | `orders.ts:231` | Verified in source |
| `ORD-CTRL-013` | Close Detail Drawer (✕)| Button | Drawer Header | When drawer open| Always | Click | Closes detail drawer | Sets `selectedOrderId = null` | None | Staff | Drawer closes | `orders.ts:121` | Verified in source |
| `ORD-CTRL-014` | Advance to In Prep | Button | Drawer Footer | Status = CONFIRMED| Always | Click | Moves order to cooking | Status -> `IN_PREPARATION` | `PATCH /api/restaurant/orders/:id/status`| Staff | Status badge turns blue| `orders.ts:198` | Verified in source |
| `ORD-CTRL-015` | Mark as Served | Button | Drawer Footer | Status = IN_PREP | Always | Click | Marks dishes served | Status -> `SERVED` | `PATCH /api/restaurant/orders/:id/status`| Staff | Status badge turns green| `orders.ts:198` | Verified in source |
| `ORD-CTRL-016` | Mark Paid & Settle | Button | Drawer Footer | Status = SERVED | Always | Click | Marks order paid | Status -> `PAID` | `PATCH /api/restaurant/orders/:id/status`| Staff | Status badge updates | `orders.ts:198` | Verified in source |
| `ORD-CTRL-017` | Void / Cancel Trigger | Button | Drawer Footer | Status != CANCEL | Always | Click | Opens cancel reason box | `#drawer-cancel-box` visible | None | Manager | Textarea appears | `orders.ts:186` | Verified in source |
| `ORD-CTRL-018` | Cancellation Reason | Textarea | Cancel Box | In cancel box | Always | Type text | Enters mandatory reason | Staged in DOM | None | Manager | Text input | `orders.ts:188` | Verified in source |
| `ORD-CTRL-019` | Confirm Void & Cancel | Button | Cancel Box | In cancel box | Reason entered | Click | Cancels order | Status -> `CANCELLED` | `POST /api/restaurant/orders/:id/cancel` | Manager | Toast, row strikethrough| `orders.ts:191` | Verified in source |

---

## Screen Family 2: Kitchen Display System (KDS)

---

### Screen 5: High-Density Kitchen Display System (KDS)
- **Screen ID:** `SCR-OPS-005`
- **Display Name:** KDS Kitchen Workstation Instrument
- **Exact Path:** `/kds`
- **Query Parameters:** `?station={ALL|TANDOOR|CURRY_LINE|BAR|DESSERT|EXPO|ALL_DAY|PREVIEW|RECALL}`
- **Source Component:** `renderKdsWorkspace(...)` (`packages/ui/pages/kds.ts`)
- **Child Components:** Station navigation bar, Rush Mode banner, ticket cards grid, item fulfillment check buttons, 54px bump buttons, Web Audio API chime synthesis, keyboard shortcut listener.
- **Application & Role:** Kitchen Station Display (`CHEF`, `STATION`, `MANAGER`).
- **Primary Purpose:** Purpose-built, high-contrast, touch-first kitchen instrument providing station-routed ticket queuing, SLA countdowns, individual dish fulfillment checkoffs, and bump bar workflows.

#### Layout Reconstruction
- **Page Composition:** Dedicated dark canvas (`#06080B`), 100vh fullscreen layout, zero outer administrative sidebar.
- **Instrument Header (Height: 60px):** Kitchen Workstation title, active station badge, location and shift meta, Audio Alerts toggle with Web Audio gesture unlock (`🔔 Alerts: Active`), Edge Synced connection indicator (`● ONLINE`), live 24h digital clock (`kds-clock`).
- **Rush Mode Alert Strip:** Linear red gradient banner (`#A83232` to `#C95757`) displayed whenever 4 or more tickets are queued.
- **Station Filter Bar (Height: 52px):** Horizontal scrolling buttons (`All Tickets`, `All Day Production`, `Tandoor`, `Curry Line`, `Bar & Drinks`, `Dessert`, `Expo Command`, `Fire Queue`, `Recall Fulfilled`).
- **Ticket Viewport:** Responsive grid (`minmax(320px, 1fr)`) containing high-density ticket cards (`.ticket-card`):
  - **Ticket Header:** Table number (19px font, weight 900), guest name, timer countdown with color escalation (`QUEUED` copper, `IN_PROGRESS` sky blue, `READY` sage, `SLA_WARNING` amber >75%, `SLA_BREACH` flashing crimson >=100%).
  - **Ticket Items List:** Individual rows with quantity badges, item names, modifiers, and touch-target checkmark buttons (`.item-check-btn`). Clicking marks the dish completed with strike-through styling.
  - **Ticket Action Footer:** 54px high-target tactile bump button:
    - If `QUEUED`: "START COOKING" button (`bump-btn-start`, copper).
    - If `IN_PROGRESS`: "MARK TICKET READY" button (`bump-btn-ready`, sage green).
    - If `READY`: "BUMP / DISPATCH" button (`bump-btn-bump`, dark charcoal).
    - In `RECALL` view: "RECALL / REFIRE" button (returns ticket to active kitchen pass).
- **All Day Production View:** Replaces ticket grid with aggregated batch counts per dish (e.g. "8x Butter Chicken across T-14, T-05") and production ingredient estimates.
- **Expo Command View:** Groups tickets by dining table, enforces whole-table readiness gating, and provides single-tap expedition dispatch.
- **Instrument Footer (Height: 40px):** Keyboard shortcuts reference: `Space` Bump focused ticket, `Enter` Item checkoff, `R` Recall, `E` Expo view, `A` All tickets.

#### Control Inventory (`SCR-OPS-005`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `KDS-CTRL-001` | Alerts Toggle | Button | Header Right | Always | Always | Click / Touch | Unlocks Web Audio & mutes | Toggles `isAudioMuted` | None | Station | Icon toggles 🔔 / 🔕 | `kds.ts:488` | Verified in source |
| `KDS-CTRL-002` | Station Tab: All Tickets | Link / Tab | Station Bar | Always | Always | Click / Touch | Shows all active tickets | URL `?station=ALL` | None | Station | Active copper shadow | `kds.ts:47` | Verified in source |
| `KDS-CTRL-003` | Station Tab: All Day | Link / Tab | Station Bar | Always | Always | Click / Touch | Shows aggregated prep | URL `?station=ALL_DAY` | None | Station | Aggregation view | `kds.ts:48` | Verified in source |
| `KDS-CTRL-004` | Station Tab: Tandoor | Link / Tab | Station Bar | Always | Always | Click / Touch | Filters Tandoor tickets | URL `?station=TANDOOR` | None | Station | Filtered tickets | `kds.ts:49` | Verified in source |
| `KDS-CTRL-005` | Station Tab: Curry Line | Link / Tab | Station Bar | Always | Always | Click / Touch | Filters Curry tickets | URL `?station=CURRY_LINE`| None | Station | Filtered tickets | `kds.ts:50` | Verified in source |
| `KDS-CTRL-006` | Station Tab: Bar | Link / Tab | Station Bar | Always | Always | Click / Touch | Filters Drink tickets | URL `?station=BAR` | None | Station | Filtered tickets | `kds.ts:51` | Verified in source |
| `KDS-CTRL-007` | Station Tab: Dessert | Link / Tab | Station Bar | Always | Always | Click / Touch | Filters Dessert tickets | URL `?station=DESSERT` | None | Station | Filtered tickets | `kds.ts:52` | Verified in source |
| `KDS-CTRL-008` | Station Tab: Expo Command| Link / Tab | Station Bar | Always | Always | Click / Touch | Opens Expo pass view | URL `?station=EXPO` | None | Station | Table grouping view | `kds.ts:53` | Verified in source |
| `KDS-CTRL-009` | Station Tab: Fire Queue | Link / Tab | Station Bar | Always | Always | Click / Touch | Filters queued orders | URL `?station=PREVIEW` | None | Station | Filtered tickets | `kds.ts:54` | Verified in source |
| `KDS-CTRL-010` | Station Tab: Recall | Link / Tab | Station Bar | Always | Always | Click / Touch | Shows bumped tickets | URL `?station=RECALL` | None | Station | Bumped ticket cards | `kds.ts:55` | Verified in source |
| `KDS-CTRL-011` | Item Fulfillment Check | Button | Ticket Item Row | In active ticket| Always | Touch / Click | Toggles item fulfillment | Strikethrough & progress | `POST /api/restaurant/kds/fulfill-item` | Station | Checkbox turns green | `kds.ts:337` | Verified in source |
| `KDS-CTRL-012` | 54px Bump Button | Button | Ticket Footer | In active ticket| Always | Touch / Click / Space | Advances ticket state | `QUEUED` -> `IN_PROGRESS` -> `READY` -> `BUMPED`| `POST /api/restaurant/kds/bump` | Station | Card color shifts/exits| `kds.ts:362` | Verified in source |
| `KDS-CTRL-013` | Recall Ticket Button | Button | Recall Ticket | In Recall view | Always | Touch / Click / R | Reopens bumped ticket | Returns ticket to active pass | `POST /api/restaurant/kds/recall` | Station | Restored to queue | `kds.ts:70` | Verified in source |
| `KDS-CTRL-014` | Expo Table Dispatch | Button | Expo Table Group | In Expo view | All items ready | Touch / Click | Dispatches whole table | Marks all table tasks bumped | `POST /api/restaurant/kds/expo-dispatch`| Station | Table cleared from pass | `kds.ts:98` | Verified in source |

---

## Screen Family 3: Menu Catalog, Catalog Taxonomy & Guests

---

### Screen 6: Menu Catalog & Taxonomy Workspace
- **Screen ID:** `SCR-OPS-006`
- **Display Name:** Menu Catalog & Multi-Location Taxonomy
- **Exact Path:** `/menu`
- **Query Parameters:** `?branch={branchId}`
- **Source Component:** `renderMenuWorkspace(...)` (`packages/ui/pages/menu.ts`)
- **Child Components:** 3-tab navigation bar, category filter pills, dish search box, master items data table, add/edit dish modal drawer, category taxonomy management view, category reorder drag list, category archive modal with orphan reassignment, branch overrides & 86'ing tab.
- **Application & Role:** BOH Culinary Administration (`MANAGER`, `ADMIN`).
- **Primary Purpose:** Authoritative management of the culinary menu catalog: item creation, recipe description, dietary flags, preparation SLA, kitchen station routing, integer paise pricing, modifier groups with price deltas, category hierarchy taxonomy, and location-level 86'ing overrides.

#### Control Inventory (`SCR-OPS-006`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `MENU-CTRL-001`| Manage Categories | Button | Header Actions | Always | Always | Click | Switches to categories tab | Shows `#view-menu-categories` | None | Manager | Tab active switch | `menu.ts:49` | Verified in source |
| `MENU-CTRL-002`| Branch Overrides & 86 | Button | Header Actions | Always | Always | Click | Switches to overrides tab | Shows `#view-menu-overrides` | None | Manager | Tab active switch | `menu.ts:52` | Verified in source |
| `MENU-CTRL-003`| Add New Dish | Button | Header Actions | Always | Always | Click | Opens item creation drawer | Resets form fields | None | Manager | Drawer slides in | `menu.ts:55` | Verified in source |
| `MENU-CTRL-004`| Tab: Master Dishes | Tab Button | Workspace Tabs | Always | Always | Click | Shows dishes catalog | Shows `#view-menu-catalog` | None | Manager | Underline active | `menu.ts:63` | Verified in source |
| `MENU-CTRL-005`| Tab: Category Hierarchy| Tab Button | Workspace Tabs | Always | Always | Click | Shows category taxonomy | Shows `#view-menu-categories` | None | Manager | Underline active | `menu.ts:66` | Verified in source |
| `MENU-CTRL-006`| Tab: Branch Overrides | Tab Button | Workspace Tabs | Always | Always | Click | Shows location overrides | Shows `#view-menu-overrides` | None | Manager | Underline active | `menu.ts:69` | Verified in source |
| `MENU-CTRL-007`| Category Filter Pill | Filter Button | Filter Scroll Bar | Always | Always | Click | Filters catalog by category | Filters table rows | None | Manager | Pill turns copper | `menu.ts:81` | Verified in source |
| `MENU-CTRL-008`| Dish Search Input | Text Input | Filter Bar Right | Always | Always | Type text | Substring search across dishes | Filters table rows | None | Manager | Live row filtering | `menu.ts:95` | Verified in source |
| `MENU-CTRL-009`| Edit Dish Button | Button | Dish Row Actions | Always | Always | Click | Opens item edit drawer | Populates form with dish data | None | Manager | Drawer slides in | `menu.ts:160` | Verified in source |
| `MENU-CTRL-010`| Archive Dish Button | Button | Dish Row Actions | Always | Always | Click | Archives menu item | Sets item `isArchived = true` | `DELETE /api/restaurant/menu/items/:id` | Manager | Row removed from view | `menu.ts:165` | Verified in source |
| `MENU-CTRL-011`| Item Name Input | Text Input | Item Modal | In Item Drawer | Always | Type text | Sets dish display name | Updates draft item state | None | Manager | Text updated | `menu.ts:600` | Verified in source |
| `MENU-CTRL-012`| Category Selector | Select | Item Modal | In Item Drawer | Always | Select option | Assigns dish category | Updates draft item state | None | Manager | Category chosen | `menu.ts:612` | Verified in source |
| `MENU-CTRL-013`| Station Selector | Select | Item Modal | In Item Drawer | Always | Select option | Routes dish to station | Updates station assignment | None | Manager | Station chosen | `menu.ts:625` | Verified in source |
| `MENU-CTRL-014`| Base Price (Rupees) | Number Input | Item Modal | In Item Drawer | Always | Type number | Sets price (converted to paise)| Multiplies by 100 for paise | None | Manager | Live preview updates | `menu.ts:638` | Verified in source |
| `MENU-CTRL-015`| Prep Duration Minutes | Number Input | Item Modal | In Item Drawer | Always | Type number | Sets kitchen SLA minutes | Modifies prepDurationMinutes | None | Manager | SLA badge updates | `menu.ts:645` | Verified in source |
| `MENU-CTRL-016`| Image URL Input | Text Input | Item Modal | In Item Drawer | Always | Type URL | Sets dish photography | Live thumbnail preview updates| None | Manager | Image preview changes | `menu.ts:655` | Verified in source |
| `MENU-CTRL-017`| Dietary Checkboxes | Checkboxes | Item Modal | In Item Drawer | Always | Toggle check | Toggles VEG/NON_VEG/VEGAN/GF | Updates dietaryFlags array | None | Manager | Badges toggle | `menu.ts:670` | Verified in source |
| `MENU-CTRL-018`| + Add Modifier Group | Button | Item Modal | In Item Drawer | Always | Click | Spawns modifier group builder | Appends modifier group | None | Manager | Group card created | `menu.ts:700` | Verified in source |
| `MENU-CTRL-019`| Save Dish (Cmd+Enter)| Button | Item Modal Footer | In Item Drawer | When form valid| Click / Cmd+Enter| Persists dish to server | Saves MenuItem in store | `POST /api/restaurant/menu/items` | Manager | Toast, catalog refresh | `menu.ts:750` | Verified in source |
| `MENU-CTRL-020`| Close Drawer (Esc) | Button | Item Modal Header | In Item Drawer | Always | Click / Esc | Closes drawer (checks dirty) | Discards or prompts unsaved | None | Manager | Drawer closes | `menu.ts:580` | Verified in source |
| `MENU-CTRL-021`| + Create Category | Button | Categories View | Categories tab | Always | Click | Opens new category modal | Shows `#category-create-modal` | None | Manager | Modal opens | `menu.ts:350` | Verified in source |
| `MENU-CTRL-022`| Reorder Category Handle| Drag Handle | Categories List | Categories tab | Always | Drag / Arrow | Reorders category ranking | Updates orderedIds array | `POST /api/restaurant/menu/categories/reorder`| Manager| Hierarchy re-indexed | `menu.ts:380` | Verified in source |
| `MENU-CTRL-023`| Archive Category Button| Button | Categories List | Categories tab | Always | Click | Prompts orphan reassignment | Opens archive modal | `DELETE /api/restaurant/menu/categories/:id`| Manager| Dishes reassigned | `menu.ts:405` | Verified in source |
| `MENU-CTRL-024`| Branch 86 Toggle | Switch / Toggle | Overrides View | Overrides tab | Always | Click / Touch | 86's item at active branch | Toggles isAvailableAtBranch | `POST /api/restaurant/menu/branch-overrides`| Manager| Sold-out badge toggles | `menu.ts:510` | Verified in source |
| `MENU-CTRL-025`| Branch Price Override | Number Input | Overrides View | Overrides tab | Always | Type number | Sets location-specific price | Overrides effective price | `POST /api/restaurant/menu/branch-overrides`| Manager| Price override saved | `menu.ts:530` | Verified in source |

---

### Screen 7: Active Guests & Parties Workspace
- **Screen ID:** `SCR-OPS-007`
- **Display Name:** Active Guests & Seated Parties
- **Exact Path:** `/guests`
- **Query Parameters:** `?branch={branchId}`
- **Source Component:** `renderGuestsWorkspace(...)` (`packages/ui/pages/guests.ts`)
- **Child Components:** Seated guests data table, role badge indicators (Primary Host vs. Companion), Guest Profile Modal Sheet.
- **Application & Role:** BOH Guest Intelligence (`STAFF`, `MANAGER`, `ADMIN`).
- **Primary Purpose:** Real-time visibility into currently seated restaurant patrons, table/seat positions, dietary restrictions, lifetime visit counts, and shared tab portions.

#### Control Inventory (`SCR-OPS-007`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `GST-CTRL-001` | Profile ↗ Button | Button | Guest Row Actions | Guests exist | Always | Click | Opens guest profile sheet | Sets modal data & opens sheet | None | Staff | Modal pops up | `guests.ts:122` | Verified in source |
| `GST-CTRL-002` | Close Profile Sheet (✕)| Button | Profile Modal Header| In Profile Modal| Always | Click | Closes guest profile sheet | Hides `#guest-profile-modal` | None | Staff | Sheet closes | `guests.ts:136` | Verified in source |

---

## Screen Family 4: Management, Support & Infrastructure

---

### Screen 8: Restaurant Locations & Branches
- **Screen ID:** `SCR-OPS-008`
- **Display Name:** Restaurant Locations & Branches
- **Exact Path:** `/operations/locations`
- **Query Parameters:** `?branch={branchId}&action={new}`
- **Source Component:** `renderLocationsWorkspace(...)` (`packages/ui/pages/locations.ts`)
- **Child Components:** Active location spotlight banner, branch fleet cards grid, Add/Edit Branch Modal form.
- **Application & Role:** Multi-Location Administration (`MANAGER`, `ADMIN`).
- **Primary Purpose:** Organization outlet management: creating new branches, editing branch metadata (code, city, street address, timezone, currency), duplicating branches, and switching active branch context.

#### Control Inventory (`SCR-OPS-008`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `LOC-CTRL-001` | + Add New Branch | Button | Header Actions | Always | Always | Click | Opens Add Branch Modal | Shows `#branch-modal` | None | Manager | Modal opens | `locations.ts:30` | Verified in source |
| `LOC-CTRL-002` | Edit Branch Button | Button | Branch Card Actions| Always | Always | Click | Opens Edit Branch Modal | Populates modal with data | None | Manager | Modal opens with data | `locations.ts:89` | Verified in source |
| `LOC-CTRL-003` | Duplicate Branch Button| Button | Branch Card Actions| Always | Always | Click | Clones branch configuration | Spawns clone payload | `POST /api/restaurant/branches` | Manager | New branch created | `locations.ts:90` | Verified in source |
| `LOC-CTRL-004` | Switch Branch -> | Button / Link | Branch Card Actions| If not current | Always | Click | Switches global context | Updates URL `?branch=:id` | Cascades context | Staff | Context switched | `locations.ts:95` | Verified in source |
| `LOC-CTRL-005` | Branch Name Input | Text Input | Branch Modal | In Branch Modal | Always | Type text | Sets branch display name | Form state | None | Manager | Text updated | `locations.ts:116` | Verified in source |
| `LOC-CTRL-006` | Branch Code Input | Text Input | Branch Modal | In Branch Modal | Always | Type text | Sets short branch code | Form state | None | Manager | Text updated | `locations.ts:121` | Verified in source |
| `LOC-CTRL-007` | Branch City Input | Text Input | Branch Modal | In Branch Modal | Always | Type text | Sets branch city | Form state | None | Manager | Text updated | `locations.ts:125` | Verified in source |
| `LOC-CTRL-008` | Street Address Input | Text Input | Branch Modal | In Branch Modal | Always | Type text | Sets street address | Form state | None | Manager | Text updated | `locations.ts:130` | Verified in source |
| `LOC-CTRL-009` | Timezone Input | Text Input | Branch Modal | In Branch Modal | Always | Type text | Sets IANA timezone | Form state | None | Manager | Text updated | `locations.ts:135` | Verified in source |
| `LOC-CTRL-010` | Currency Input | Text Input | Branch Modal | In Branch Modal | Always | Type text | Sets ISO currency code | Form state | None | Manager | Text updated | `locations.ts:139` | Verified in source |
| `LOC-CTRL-011` | Save Branch Button | Button | Branch Modal Footer| In Branch Modal | Valid fields | Click / Submit | Persists branch record | Saves BranchRecord in store | `POST /api/restaurant/branches` | Manager | Toast, page reload | `locations.ts:145` | Verified in source |
| `LOC-CTRL-012` | Close Branch Modal (✕) | Button | Branch Modal Header| In Branch Modal | Always | Click | Discards branch form | Closes modal | None | Manager | Modal closes | `locations.ts:109` | Verified in source |

---

### Screen 9: Service Areas & Floor Plans
- **Screen ID:** `SCR-OPS-009`
- **Display Name:** Service Areas & Service Layouts
- **Exact Path:** `/operations/floors`
- **Query Parameters:** `?branch={branchId}&action={new}`
- **Source Component:** `renderFloorsWorkspace(...)` (`packages/ui/pages/floors.ts`)
- **Child Components:** Floors cards grid, service layouts selector list, Add Service Area Modal, rename floor prompt.
- **Application & Role:** Floor Administration (`MANAGER`, `ADMIN`).
- **Primary Purpose:** Managing physical dining spaces, architectural floor boundaries, shift-based table configurations (Dinner vs. Lunch Rush), seating capacity, and spatial canvas launching.

#### Control Inventory (`SCR-OPS-009`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `FLR-CTRL-001` | + Add Service Area | Button | Header Actions | Always | Always | Click | Opens Add Floor Modal | Shows `#floor-modal` | None | Manager | Modal opens | `floors.ts:29` | Verified in source |
| `FLR-CTRL-002` | Activate Shift Layout | Button | Floor Card Layouts| Multiple layouts| Always | Click | Switches active shift layout| Updates `activeLayout` | `POST /api/restaurant/floors` | Manager | Layout becomes ACTIVE | `floors.ts:75` | Verified in source |
| `FLR-CTRL-003` | Rename Floor Button | Button | Floor Card Footer | Always | Always | Click | Prompts new area name | Renames FloorRecord | `POST /api/restaurant/floors` | Manager | Title updates | `floors.ts:85` | Verified in source |
| `FLR-CTRL-004` | Open Spatial Canvas ↗ | Button / Link | Floor Card Footer | Always | Always | Click | Opens spatial canvas editor | Navigates to `/operations/floor?floor=:id`| None | Staff | Immediate route change | `floors.ts:86` | Verified in source |
| `FLR-CTRL-005` | Area Name Input | Text Input | Floor Modal | In Floor Modal | Always | Type text | Sets floor display name | Form state | None | Manager | Text updated | `floors.ts:107` | Verified in source |
| `FLR-CTRL-006` | Area Type Select | Select | Floor Modal | In Floor Modal | Always | Select option | Sets area type (Dining/Bar/etc)| Form state | None | Manager | Type selected | `floors.ts:114` | Verified in source |
| `FLR-CTRL-007` | Capacity Number Input | Number Input | Floor Modal | In Floor Modal | Always | Type number | Sets max seating capacity | Form state | None | Manager | Number updated | `floors.ts:123` | Verified in source |
| `FLR-CTRL-008` | Default Layout Name | Text Input | Floor Modal | In Floor Modal | Always | Type text | Sets initial layout name | Form state | None | Manager | Text updated | `floors.ts:129` | Verified in source |
| `FLR-CTRL-009` | Create Area Submit | Button | Floor Modal Footer | In Floor Modal | Valid fields | Click / Submit | Persists floor record | Saves FloorRecord in store | `POST /api/restaurant/floors` | Manager | Toast, grid refresh | `floors.ts:134` | Verified in source |
| `FLR-CTRL-010` | Close Floor Modal (✕) | Button | Floor Modal Header | In Floor Modal | Always | Click | Discards floor form | Closes modal | None | Manager | Modal closes | `floors.ts:101` | Verified in source |

---

### Screen 10: Service Analytics & Performance Reports
- **Screen ID:** `SCR-OPS-010`
- **Display Name:** Service Shift Analytics & Reports
- **Exact Path:** `/reports`
- **Query Parameters:** `?branch={branchId}`
- **Source Component:** `renderReportsWorkspace(...)` (`packages/ui/pages/reports.ts`)
- **Child Components:** Performance analytics KPI cards, Station Production Throughput progress bars.
- **Application & Role:** Performance Intelligence (`MANAGER`, `ADMIN`).
- **Primary Purpose:** Real-time computation of shift revenue, seated covers, average ticket size, and kitchen station workload distribution. Zero hardcoded mock fixtures.

#### Control Inventory (`SCR-OPS-010`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `REP-CTRL-001` | Live Shift Compute Badge| Status Badge | Header Right | Always | Inert | None | Displays live status | None | Computed in memory | Manager | Static badge | `reports.ts:37` | Verified in source |

---

### Screen 11: Staff Directory & Cryptographic RBAC
- **Screen ID:** `SCR-OPS-011`
- **Display Name:** Staff Directory & Station Permissions
- **Exact Path:** `/staff` (Canonical Alias: `/operations/staff`)
- **Query Parameters:** `?branch={branchId}`
- **Source Component:** `renderStaffWorkspace(...)` (`packages/ui/pages/staff.ts`)
- **Child Components:** Security metrics strip, view switcher tabs (Staff Directory vs. RBAC Matrix), searchable staff table, Provision Staff Modal, Test PIN Auth Modal, Revoke Credential Modal.
- **Application & Role:** Personnel Security & RBAC (`MANAGER`, `ADMIN`).
- **Primary Purpose:** Cryptographic hospitality staff access management: provisioning salted SHA-256 PIN credentials, enforcing brute-force lockout thresholds (5 failed tries = 15m lockout), scoping station tokens, and auditing the durable token revocation registry.

#### Control Inventory (`SCR-OPS-011`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `STF-CTRL-001` | Provision Staff Member | Button | Header Actions | Always | Always | Click | Opens staff provision dialog | Prompts name, role, PIN | `POST /api/restaurant/staff` | Admin | Modal opens | `staff.ts:52` | Verified in source |
| `STF-CTRL-002` | Test Staff PIN Auth | Button | Header Actions | Always | Always | Click | Opens test PIN auth dialog | Prompts 4-digit PIN | `POST /api/restaurant/auth/staff-token`| Manager | Validates PIN | `staff.ts:55` | Verified in source |
| `STF-CTRL-003` | Revoke Credential | Button | Header Actions | Always | Always | Click | Opens token revocation dialog| Prompts token or JTI | `POST /api/restaurant/auth/revoke` | Admin | Credential revoked | `staff.ts:58` | Verified in source |
| `STF-CTRL-004` | Tab: Staff Directory | Tab Button | View Switcher Bar | Always | Always | Click | Displays staff data table | Shows `#staff-directory-view` | None | Manager | Table visible | `staff.ts:93` | Verified in source |
| `STF-CTRL-005` | Tab: RBAC Matrix | Tab Button | View Switcher Bar | Always | Always | Click | Displays permissions matrix | Shows `#staff-matrix-view` | None | Manager | Matrix visible | `staff.ts:96` | Verified in source |
| `STF-CTRL-006` | Staff Search Input | Text Input | Table Header Right | Directory tab | Always | Type text | Filters personnel by substring | Rerenders table rows | None | Manager | Live row filter | `staff.ts:109` | Verified in source |
| `STF-CTRL-007` | Revoke Staff Row Button| Button | Table Row Actions | Directory tab | Active member | Click | Revokes individual staff member| Appends to revocation list | `POST /api/restaurant/staff/:id/revoke` | Admin | Member revoked badge | `staff.ts:160` | Verified in source |
| `STF-CTRL-008` | Reset Lockout Button | Button | Table Row Actions | Member locked | Always | Click | Clears brute-force lockout | Resets failed attempt counter | `POST /api/restaurant/staff/reset-lockout`| Manager| Lockout cleared | `staff.ts:165` | Verified in source |

---

### Screen 12: Customer Support & Incident Desk
- **Screen ID:** `SCR-OPS-012`
- **Display Name:** Customer Support Desk & Incident Workbench
- **Exact Path:** `/support`
- **Query Parameters:** `?branch={branchId}`
- **Source Component:** `renderSupportWorkspace(...)` (`packages/ui/pages/support.ts`)
- **Child Components:** 3-Pane Linear-style incident desk: Pane 1 Ticket Queue, Pane 2 Chronological Conversation Timeline & Composer, Pane 3 Contextual Restaurant Telemetry & Diagnostics.
- **Application & Role:** Hospitality Operations & Support (`STAFF`, `MANAGER`, `ADMIN`).
- **Primary Purpose:** Resolving operational incidents, hardware malfunctions (KDS routing delays, printer errors), and diner service escalations with internal staff notes and live runtime telemetry.

#### Control Inventory (`SCR-OPS-012`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SUP-CTRL-001` | + New Case Button | Button | Queue Header | Always | Always | Click | Opens new case creation modal | Shows `#new-ticket-modal` | None | Staff | Modal opens | `support.ts:65` | Verified in source |
| `SUP-CTRL-002` | Ticket Search Input | Text Input | Queue Header | Always | Always | Type text | Substring search across cases | Filters ticket queue list | None | Staff | Live ticket filter | `support.ts:74` | Verified in source |
| `SUP-CTRL-003` | Filter: All Cases | Filter Button | Status Filters | Always | Always | Click | Shows all support cases | Sets filter to `ALL` | None | Staff | Filter active | `support.ts:86` | Verified in source |
| `SUP-CTRL-004` | Filter: Open Cases | Filter Button | Status Filters | Always | Always | Click | Shows open cases | Sets filter to `OPEN` | None | Staff | Filter active | `support.ts:87` | Verified in source |
| `SUP-CTRL-005` | Filter: Investigating | Filter Button | Status Filters | Always | Always | Click | Shows in-progress cases | Sets filter to `INVESTIGATING` | None | Staff | Filter active | `support.ts:88` | Verified in source |
| `SUP-CTRL-006` | Filter: Resolved | Filter Button | Status Filters | Always | Always | Click | Shows resolved cases | Sets filter to `RESOLVED` | None | Staff | Filter active | `support.ts:89` | Verified in source |
| `SUP-CTRL-007` | Ticket Row Click | Data Row | Queue List | Tickets exist | Always | Click | Selects active case in thread | Populates Pane 2 and Pane 3 | None | Staff | Row active highlight | `support.ts:102` | Verified in source |
| `SUP-CTRL-008` | Status Transition Select| Select | Thread Header Right| Case selected | Always | Select option | Updates ticket status | Status -> OPEN/INVEST/RESOLV | `PATCH /api/restaurant/support/tickets/:id`| Staff| Badge color updates | `support.ts:150` | Verified in source |
| `SUP-CTRL-009` | Message Type Tab: Public | Tab Button | Message Composer | Case selected | Always | Click | Sets reply type to Public | Updates composer mode | None | Staff | Tab highlighted | `support.ts:210` | Verified in source |
| `SUP-CTRL-010` | Message Type: Internal | Tab Button | Message Composer | Case selected | Always | Click | Sets reply to Internal Staff Note| Updates composer mode | None | Staff | Yellow accent highlight | `support.ts:213` | Verified in source |
| `SUP-CTRL-011` | Reply Textarea | Textarea | Message Composer | Case selected | Always | Type text | Enters message content | Staged in DOM | None | Staff | Text input | `support.ts:220` | Verified in source |
| `SUP-CTRL-012` | Send Reply Button | Button | Message Composer | Case selected | Text entered | Click / Cmd+Enter| Posts reply to incident thread| Appends message object | `POST /api/restaurant/support/tickets/:id/messages`| Staff| Message appears in thread| `support.ts:228` | Verified in source |

---

## Screen Family 5: Brand Studio, Marketplace & Developer Tools

---

### Screen 13: Multi-Template Marketplace
- **Screen ID:** `SCR-BRD-001`
- **Display Name:** Multi-Template Design Marketplace
- **Exact Path:** `/marketplace`
- **Query Parameters:** `?branch={branchId}`
- **Source Component:** `renderMarketplaceWorkspace(...)` (`packages/ui/pages/marketplace.ts`)
- **Child Components:** Template cards grid, interactive mini-previews, category filters (Fine Dining, Nordic, Specialty Coffee, Night Market, Convivial Italian, Japanese Craft), install confirmation modal.
- **Application & Role:** Brand Governance (`MANAGER`, `ADMIN`).
- **Primary Purpose:** Visual discovery, multi-device previewing, and 1-click installation of authentic restaurant design systems with Anti-Token-Clone validation.

#### Control Inventory (`SCR-BRD-001`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `MKT-CTRL-001` | Filter: All Themes | Button | Filter Tabs | Always | Always | Click | Shows all templates | Sets filter to `ALL` | None | Manager | Pill active highlight | `marketplace.ts:160`| Verified in source |
| `MKT-CTRL-002` | Filter: Fine Dining | Button | Filter Tabs | Always | Always | Click | Filters Haute Gastronomy | Sets category filter | None | Manager | Card grid filters | `marketplace.ts:165`| Verified in source |
| `MKT-CTRL-003` | Filter: Nordic | Button | Filter Tabs | Always | Always | Click | Filters Fjord & Form | Sets category filter | None | Manager | Card grid filters | `marketplace.ts:170`| Verified in source |
| `MKT-CTRL-004` | Filter: Cafe | Button | Filter Tabs | Always | Always | Click | Filters Roastery 1984 | Sets category filter | None | Manager | Card grid filters | `marketplace.ts:175`| Verified in source |
| `MKT-CTRL-005` | Filter: Street Food | Button | Filter Tabs | Always | Always | Click | Filters Neon Yokocho | Sets category filter | None | Manager | Card grid filters | `marketplace.ts:180`| Verified in source |
| `MKT-CTRL-006` | Live Demo ↗ Button | Button / Link | Template Card | Always | Always | Click | Launches live demo storefront | Opens `/dine/7Kp9xQ8m2L?templateId=:id`| None| Public | New browser tab | `marketplace.ts:210`| Verified in source |
| `MKT-CTRL-007` | Customize in Studio | Button / Link | Template Card | Always | Always | Click | Opens template in Visual Studio| Navigates to `/studio?template=:id`| None | Manager | Opens Visual Studio | `marketplace.ts:215`| Verified in source |
| `MKT-CTRL-008` | Install Theme Button | Button | Template Card | If not installed| Always | Click | Installs template to restaurant | Updates activeTemplateId | `POST /api/restaurant/templates/install`| Admin | Active Installed badge | `marketplace.ts:220`| Verified in source |

---

### Screen 14: Visual Brand Studio & Editor
- **Screen ID:** `SCR-BRD-002`
- **Display Name:** Visual Brand Studio & Editor
- **Exact Path:** `/studio`
- **Query Parameters:** `?template={templateId}&branch={branchId}`
- **Source Component:** `renderVisualStudio(...)` (`packages/ui/pages/studio.ts`)
- **Child Components:** Studio top toolbar, viewport toggle buttons (Mobile 390px, Tablet 768px, Desktop 1200px), undo/redo controls, left sections tree, center live storefront iframe canvas, right section properties inspector, revision history drawer.
- **Application & Role:** Visual Brand Authoring (`MANAGER`, `ADMIN`).
- **Primary Purpose:** Section-based visual storefront page builder: arranging hero, culinary highlights, menu grids, story chapters, and live publishing to diner storefronts.

#### Control Inventory (`SCR-BRD-002`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `STU-CTRL-001` | Back to Marketplace | Link | Top Toolbar Left | Always | Always | Click | Returns to marketplace | Navigates to `/marketplace` | None | Manager | Immediate route change | `studio.ts:31` | Verified in source |
| `STU-CTRL-002` | Mobile Viewport (390px)| Button | Viewport Segment | Always | Always | Click | Shrinks canvas to 390px width | Updates iframe width | None | Manager | Canvas scales to mobile | `studio.ts:47` | Verified in source |
| `STU-CTRL-003` | Tablet Viewport (768px)| Button | Viewport Segment | Always | Always | Click | Resizes canvas to 768px width | Updates iframe width | None | Manager | Canvas scales to tablet | `studio.ts:51` | Verified in source |
| `STU-CTRL-004` | Desktop (1200px) | Button | Viewport Segment | Always | Always | Click | Resizes canvas to 1200px width| Updates iframe width | None | Manager | Canvas scales to desktop| `studio.ts:55` | Verified in source |
| `STU-CTRL-005` | Undo Button (Cmd+Z) | Button | Toolbar Center | Always | When history > 0| Click / Cmd+Z | Reverts last section mutation | Pops undo stack | None | Manager | Canvas updates | `studio.ts:62` | Verified in source |
| `STU-CTRL-006` | Redo Button (Cmd+Shift+Z)| Button| Toolbar Center | Always | When redo > 0 | Click / Cmd+Shift+Z| Replays undone mutation | Pops redo stack | None | Manager | Canvas updates | `studio.ts:66` | Verified in source |
| `STU-CTRL-007` | Revision History | Button | Toolbar Right | Always | Always | Click | Toggles revision history drawer| Shows `#revisions-drawer` | None | Manager | Drawer slides in | `studio.ts:75` | Verified in source |
| `STU-CTRL-008` | Save Draft Button | Button | Toolbar Right | Always | Always | Click | Persists draft sections/tokens | Saves draft to server | `POST /api/restaurant/studio/draft` | Manager | `#save-status-indicator`| `studio.ts:79` | Verified in source |
| `STU-CTRL-009` | Publish to Storefront | Button | Toolbar Right | Always | Always | Click | Publishes draft to production | Overwrites tenantBrand config | `POST /api/restaurant/studio/publish` | Admin | Success modal, live sync| `studio.ts:83` | Verified in source |
| `STU-CTRL-010` | Section Move Up | Button | Section Row | Always | Index > 0 | Click | Moves section up in page order | Swaps section positions | Local staged draft | Manager | Section order changes | `studio.ts:130` | Verified in source |
| `STU-CTRL-011` | Section Move Down | Button | Section Row | Always | Index < Max | Click | Moves section down in page order| Swaps section positions | Local staged draft | Manager | Section order changes | `studio.ts:133` | Verified in source |
| `STU-CTRL-012` | Toggle Visibility (Eye)| Button | Section Row | Always | Always | Click | Hides/shows section on site | Toggles section `visible` | Local staged draft | Manager | Icon switches eye/x | `studio.ts:136` | Verified in source |

---

### Screen 15: White-Label & Custom Domains Studio
- **Screen ID:** `SCR-BRD-003`
- **Display Name:** Brand Identity, Custom Domains & SSL
- **Exact Path:** `/white-label` (Canonical Alias: `/whitelabel`)
- **Query Parameters:** `?branch={branchId}`
- **Source Component:** `renderWhiteLabelWorkspace(...)` (`packages/ui/pages/whitelabel.ts`)
- **Child Components:** 5-Tab vertical navigation (Identity, Domains & DNS, Branch Inheritance, SEO Metadata, Scoped Custom CSS), DNS instruction table, Domain Verification trigger button.
- **Application & Role:** Platform Brand Governance (`ADMIN`).
- **Primary Purpose:** White-label configuration: legal restaurant name, brand tagline, hex color token themes, custom apex domain and subdomain routing, DNS CNAME/TXT verification state machine, branch overrides, and scoped CSS customization.

#### Control Inventory (`SCR-BRD-003`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `WHT-CTRL-001` | Save Brand Configuration| Button | Header Right | Always | Always | Click | Persists all white-label settings| Saves TenantBrandConfig in store| `POST /api/restaurant/branding` | Admin | Toast confirmation | `whitelabel.ts:41` | Verified in source |
| `WHT-CTRL-002` | Tab: Brand Identity | Nav Button | Left Anchor Tabs | Always | Always | Click | Shows brand identity form pane | Displays `#section-identity` | None | Admin | Tab highlighted | `whitelabel.ts:52` | Verified in source |
| `WHT-CTRL-003` | Tab: Custom Domains | Nav Button | Left Anchor Tabs | Always | Always | Click | Shows DNS & domain form pane | Displays `#section-domain` | None | Admin | Tab highlighted | `whitelabel.ts:56` | Verified in source |
| `WHT-CTRL-004` | Tab: Branch Inheritance | Nav Button | Left Anchor Tabs | Always | Always | Click | Shows branch overrides pane | Displays `#section-locations` | None | Admin | Tab highlighted | `whitelabel.ts:60` | Verified in source |
| `WHT-CTRL-005` | Tab: SEO Metadata | Nav Button | Left Anchor Tabs | Always | Always | Click | Shows SEO and meta tags pane | Displays `#section-seo` | None | Admin | Tab highlighted | `whitelabel.ts:64` | Verified in source |
| `WHT-CTRL-006` | Tab: Scoped Custom CSS | Nav Button | Left Anchor Tabs | Always | Always | Click | Shows CSS code editor pane | Displays `#section-css` | None | Admin | Tab highlighted | `whitelabel.ts:68` | Verified in source |
| `WHT-CTRL-007` | Brand Name Input | Text Input | Identity Pane | Always | Always | Type text | Sets legal restaurant name | Updates `restaurantName` | None | Admin | Text updated | `whitelabel.ts:87` | Verified in source |
| `WHT-CTRL-008` | Primary Accent Color | Color Picker | Identity Pane | Always | Always | Pick / Type hex | Sets primary brand theme color | Updates `primaryColor` | None | Admin | Hex input syncs | `whitelabel.ts:110`| Verified in source |
| `WHT-CTRL-009` | Custom Domain Input | Text Input | Domains Pane | Always | Always | Type hostname | Sets custom domain (e.g. dine.com)| Updates `customDomain` | None | Admin | Text updated | `whitelabel.ts:210`| Verified in source |
| `WHT-CTRL-010` | Verify Domain & DNS | Button | Domains Pane | Domain entered | Always | Click | Triggers DNS validation check | Status -> PENDING/VERIFIED | `POST /api/restaurant/branding/verify-domain`| Admin| SSL badge turns green | `whitelabel.ts:240`| Verified in source |
| `WHT-CTRL-011` | Scoped CSS Editor | Textarea | Custom CSS Pane | Always | Always | Type CSS | Enters custom CSS rules | Validated via sanitizeCustomCss| `POST /api/restaurant/branding` | Admin | Applied to PWA | `whitelabel.ts:450`| Verified in source |

---

### Screen 16: Visual Template Composition Inspector
- **Screen ID:** `SCR-DEV-001`
- **Display Name:** Template Composition Inspector
- **Exact Path:** `/developer/templates`
- **Query Parameters:** `?selected={templateId}&compare={compareTemplateId}`
- **Source Component:** `renderTemplateCompositionInspector(...)` (`packages/ui/pages/template-inspector.ts`)
- **Child Components:** Anti-Token-Clone banner, primary template select, compare template select, view switcher (Component Tree vs. Side-by-Side Diff).
- **Application & Role:** Developer / Platform Architecture.
- **Primary Purpose:** Verifies that templates have genuine structural dissimilarity (>75%) across page architecture, card layout, navigation, and cart presentation rather than simple color token overrides.

#### Control Inventory (`SCR-DEV-001`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `TIN-CTRL-001` | Primary Template Select| Select | Controls Bar | Always | Always | Change option | Changes primary template to audit| Updates URL `?selected=:id` | None | Admin | Rerenders AST diff | `template-inspector.ts:105` | Verified in source |
| `TIN-CTRL-002` | Compare Template Select| Select | Controls Bar | Always | Always | Change option | Changes comparison template | Updates URL `?compare=:id` | None | Admin | Rerenders AST diff | `template-inspector.ts:116` | Verified in source |
| `TIN-CTRL-003` | Component Tree View | Button | Controls Bar | Always | Always | Click | Shows AST component tree | Shows `#inspector-tree-view` | None | Admin | Tree view visible | `template-inspector.ts:126` | Verified in source |
| `TIN-CTRL-004` | Side-by-Side Diff View | Button | Controls Bar | Always | Always | Click | Shows 2-column comparative diff | Shows `#inspector-diff-view` | None | Admin | Diff view visible | `template-inspector.ts:129` | Verified in source |

---

### Screen 17: Developer Runtime Inspector
- **Screen ID:** `SCR-DEV-002`
- **Display Name:** Developer Runtime Inspector
- **Exact Path:** `/developer/inspector`
- **Query Parameters:** `?branch={branchId}`
- **Source Component:** `renderDeveloperInspector(...)` (`packages/ui/pages/inspector.ts`)
- **Child Components:** Active canonical context card, persistence engine card, two-plane connectivity status, ASCII interaction debugger panel, live event outbox stream table, Reseed Store button.
- **Application & Role:** Developer / QA Diagnostics.
- **Primary Purpose:** Live auditing of the canonical context, atomic file storage revisions, realtime event bus sequence counter, and SSE subscriber connectivity.

#### Control Inventory (`SCR-DEV-002`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `INS-CTRL-001` | Reseed Store ↺ | Button | Header Right | Always | Always | Click | Reseeds runtime database to baseline| Resets store to default data | `POST /api/restaurant/reseed` | Admin | Confirmation dialog, reload| `inspector.ts:32` | Verified in source |
| `INS-CTRL-002` | Operations Home -> | Link | Header Right | Always | Always | Click | Returns to operations cockpit | Navigates to `/` | None | Staff | Immediate route change | `inspector.ts:33` | Verified in source |

---

### Screen 18: Developer Diagnostics Console
- **Screen ID:** `SCR-DEV-003`
- **Display Name:** Developer Diagnostics
- **Exact Path:** `/developer/diagnostics`
- **Query Parameters:** None
- **Source Component:** Inline HTML in `src/server.ts` lines 5069–5119.
- **Child Components:** Raw diagnostic metrics grid, signed desired-state JSON dump (`<pre>`).
- **Application & Role:** System Diagnostics.
- **Primary Purpose:** Exposes process PID, memory heap usage, storage engine type, store revision number, outbox event count, connected SSE client count, and control plane sync status.

---

## Screen Family 6: Customer-Facing Storefronts & Applications

---

### Screen 19: Diner Mobile Web Companion (PWA)
- **Screen ID:** `SCR-CUS-001`
- **Display Name:** Diner Mobile Web Companion
- **Exact Path:** `/dine/:locator` (e.g. `/dine/7Kp9xQ8m2L`)
- **Query Parameters:** `?templateId={tmplId}`
- **Source Component:** `renderDinerPwa(...)` (`packages/ui/pages/diner.ts`)
- **Child Components:** Dynamic theme renderer (Atelier Étoile, Fjord & Form, Roastery 1984, Neon Yokocho, Osteria Rustica, Shokunin Ramen), category filters, modifier selection bottom sheet, floating cart bar, live order tracking milestone cards, waiter call / water carafe service request buttons.
- **Application & Role:** In-Restaurant Dining Patron (`DINER`, Anonymous).
- **Primary Purpose:** Customer-facing table companion accessed by scanning table QR codes: digital menu browsing, dish customization, order placement, live kitchen preparation tracking, and requesting bill/water assistance.

#### Control Inventory (`SCR-CUS-001`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `DIN-CTRL-001` | Category Filter Pill | Button | Subheader Rail | Always | Always | Touch / Click | Filters menu by category | Filters visible dishes | None | Public | Pill active highlight | `diner.ts:160` | Verified in source |
| `DIN-CTRL-002` | Quick Add / Stepper (+) | Button | Dish Card | Always | Available | Touch / Click | Increments dish quantity | Updates local cart items array | None | Public | Card shows stepper | `diner.ts:190` | Verified in source |
| `DIN-CTRL-003` | Stepper Decrement (-) | Button | Dish Card | Quantity > 0 | Always | Touch / Click | Decrements dish quantity | Updates local cart items array | None | Public | Stepper decrements | `diner.ts:195` | Verified in source |
| `DIN-CTRL-004` | Customize Dish Options | Button | Dish Card | Has modifiers | Available | Touch / Click | Opens modifier selection sheet | Populates modifier options | None | Public | Bottom sheet slides up | `diner.ts:210` | Verified in source |
| `DIN-CTRL-005` | Modifier Radio / Check | Radio / Check | Modifier Sheet | In Modifier Sheet| Always | Touch / Click | Selects preparation option | Updates selectedModifierIds | None | Public | Price delta recalculates| `diner.ts:240` | Verified in source |
| `DIN-CTRL-006` | Add Customized to Cart | Button | Modifier Footer | In Modifier Sheet| Min selections met| Touch / Click | Adds customized item to cart | Closes sheet, updates cart | None | Public | Floating cart pops up | `diner.ts:260` | Verified in source |
| `DIN-CTRL-007` | Floating Cart Bar | Bar Link | Screen Bottom | Cart count > 0 | Always | Touch / Click | Opens slide-in order summary | Displays order summary folio | None | Public | Folio drawer enters | `diner.ts:310` | Verified in source |
| `DIN-CTRL-008` | Submit Dine-In Order | Button | Cart Summary Folio| Cart count > 0 | When not submitting| Touch / Click | Places table order | Creates order, spawns tasks | `POST /api/restaurant/orders` | Public / Diner| Transitions to tracking| `diner.ts:350` | Verified in source |
| `DIN-CTRL-009` | Request Water Carafe | Button | Table Actions Bar | Always | Always | Touch / Click | Sends service request to floor | Creates ServiceRequest record | `POST /api/restaurant/service-requests`| Diner | Toast: "Water requested" | `diner.ts:410` | Verified in source |
| `DIN-CTRL-010` | Request Waiter Service | Button | Table Actions Bar | Always | Always | Touch / Click | Alerts floor server | Creates ServiceRequest record | `POST /api/restaurant/service-requests`| Diner | Toast: "Server notified" | `diner.ts:420` | Verified in source |
| `DIN-CTRL-011` | Request Digital Bill | Button | Table Actions Bar | Active session | Always | Touch / Click | Requests bill from floor POS | Table status -> BILL_REQUESTED | `PATCH /api/restaurant/tables/:id` | Diner | Toast: "Bill requested" | `diner.ts:430` | Verified in source |

---

### Screen 20: CraveAtlas Single-Brand Flagship Website
- **Screen ID:** `SCR-CUS-002`
- **Display Name:** CraveAtlas Single-Brand Flagship
- **Exact Path:** `/apps/crave-atlas`
- **Query Parameters:** `?branch={branchId}`
- **Source Component:** `renderCraveAtlasPage(...)` (`packages/ui/pages/crave-atlas.ts`)
- **Child Components:** Top navigation header, Branch / Location Selector pill, Culinary Signature Carousel, category tabs, dish search input, dish cards, modifier customization modal, slide-in cart folio, idempotent order placement, live order tracking modal.
- **Application & Role:** Customer Online Ordering.
- **Primary Purpose:** Discovery-first restaurant flagship website for an individual brand, featuring culinary storytelling, branch-resolved menus, delivery/pickup ordering, and live KDS order tracking.

#### Control Inventory (`SCR-CUS-002`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `CRV-CTRL-001` | Branch Selector Pill | Dropdown / Pill | Nav Header | Always | Always | Click / Touch | Switches active outlet | Updates URL `?branch=:id` | Local / Server context | Public | Menu updates to branch | `crave-atlas.ts:110` | Verified in source |
| `CRV-CTRL-002` | Carousel Prev Arrow | Button | Signature Carousel| Always | Always | Click / Touch | Scrolls carousel left | Updates scrollLeft position | None | Public | Smooth card scroll | `crave-atlas.ts:180` | Verified in source |
| `CRV-CTRL-003` | Carousel Next Arrow | Button | Signature Carousel| Always | Always | Click / Touch | Scrolls carousel right | Updates scrollLeft position | None | Public | Smooth card scroll | `crave-atlas.ts:185` | Verified in source |
| `CRV-CTRL-004` | Category Tab Button | Button | Category Nav Rail | Always | Always | Click / Touch | Filters dishes by category | Filters visible dish cards | None | Public | Tab active underline | `crave-atlas.ts:240` | Verified in source |
| `CRV-CTRL-005` | Dish Search Input | Text Input | Search Bar | Always | Always | Type text | Substring search across menu | Filters visible dish cards | None | Public | Live card filtering | `crave-atlas.ts:260` | Verified in source |
| `CRV-CTRL-006` | Card Add / Stepper (+) | Button | Dish Card | Available | Always | Click / Touch | Increments item quantity | Updates local cart items array | None | Public | Card stepper appears | `crave-atlas.ts:310` | Verified in source |
| `CRV-CTRL-007` | Customize Options Button| Button | Dish Card | Has modifiers | Always | Click / Touch | Opens modifier modal | Opens `#ca-modifier-modal` | None | Public | Modal dialog pops up | `crave-atlas.ts:330` | Verified in source |
| `CRV-CTRL-008` | Fulfillment: Delivery | Toggle Button | Cart Folio Header | In Cart Folio | Always | Click / Touch | Sets fulfillment to Delivery | Adds ₹40.00 delivery fee | None | Public | Delivery address prompt | `crave-atlas.ts:420` | Verified in source |
| `CRV-CTRL-009` | Fulfillment: Pickup | Toggle Button | Cart Folio Header | In Cart Folio | Always | Click / Touch | Sets fulfillment to Pickup | Waives delivery fee (₹0) | None | Public | Address field hides | `crave-atlas.ts:425` | Verified in source |
| `CRV-CTRL-010` | Customer Name Input | Text Input | Cart Folio Form | In Cart Folio | Always | Type text | Sets customer name | Form validation (2-80 chars) | None | Public | Inline error if invalid | `crave-atlas.ts:440` | Verified in source |
| `CRV-CTRL-011` | Customer Phone Input | Text Input | Cart Folio Form | In Cart Folio | Always | Type text | Sets 10-digit Indian mobile | Validated via /^[6-9]\d{9}$/ | None | Public | Formats as +91 XXXXX | `crave-atlas.ts:450` | Verified in source |
| `CRV-CTRL-012` | Delivery Address Input | Textarea | Cart Folio Form | Delivery active | Always | Type text | Sets street address | Form validation (min 5 chars) | None | Public | Inline error if invalid | `crave-atlas.ts:460` | Verified in source |
| `CRV-CTRL-013` | Place Order Button | Button | Cart Folio Footer | In Cart Folio | Valid cart & form| Click / Touch | Places idempotent order | Creates order & kitchen tasks| `POST /api/commerce/orders` | Public | Opens tracking modal | `crave-atlas.ts:510` | Verified in source |
| `CRV-CTRL-014` | Track Live Status Modal | Modal Dialog | Overlay Viewport | Order placed | Always | Poll / SSE | Displays live cooking stage | Updates milestone timeline | `GET /api/commerce/orders/:id`| Public | Milestone indicators | `crave-atlas.ts:580` | Verified in source |

---

### Screen 21: SwiftBite Speed-First Ordering Mobile App
- **Screen ID:** `SCR-CUS-003`
- **Display Name:** SwiftBite Speed-First Ordering
- **Exact Path:** `/apps/swift-bite`
- **Query Parameters:** `?branch={branchId}`
- **Source Component:** `renderSwiftBitePage(...)` (`packages/ui/pages/swift-bite.ts`)
- **Child Components:** Fast 20-min delivery SLA banner, 1-tap branch selector pill, "Order Again in 1-Tap" past favorites carousel, 1-tap instant steppers, bottom customizer sheet, persistent mobile cart bar.
- **Application & Role:** Mobile Food Ordering.
- **Primary Purpose:** Mobile-first, speed-optimized food ordering interface designed for rapid 2-tap ordering from an individual restaurant brand.

#### Control Inventory (`SCR-CUS-003`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SWF-CTRL-001` | Outlet Switcher Pill | Pill Dropdown | Top Header | Always | Always | Touch / Click | Switches outlet | Updates URL `?branch=:id` | Local / Server context | Public | Menu updates to branch | `swift-bite.ts:110` | Verified in source |
| `SWF-CTRL-002` | 1-Tap Reorder Card | Card Button | Past Favorites | Always | Available | Touch / Click | Directly adds favorite to cart| Increments item in cart | None | Public | Cart badge bounces | `swift-bite.ts:150` | Verified in source |
| `SWF-CTRL-003` | Instant Card Stepper (+)| Button | Item Card | Always | Available | Touch / Click | Increments item quantity | Updates local cart items array | None | Public | Stepper appears | `swift-bite.ts:220` | Verified in source |
| `SWF-CTRL-004` | Quick Checkout Bar | Sticky Bottom Bar| Viewport Bottom | Cart > 0 | Always | Touch / Click | Opens quick checkout drawer | Displays order total & inputs | None | Public | Bottom drawer enters | `swift-bite.ts:280` | Verified in source |
| `SWF-CTRL-005` | Place Swift Order | Button | Checkout Drawer | In Drawer | Valid inputs | Touch / Click | Places idempotent speed order | Sends x-idempotency-key | `POST /api/commerce/orders` | Public | Milestone tracking screen| `swift-bite.ts:340` | Verified in source |

---

### Screen 22: PantryRush Quick-Commerce Grocery
- **Screen ID:** `SCR-CUS-004`
- **Display Name:** PantryRush 15-Minute Dark-Store Groceries
- **Exact Path:** `/apps/pantry-rush`
- **Query Parameters:** `?branch={branchId}&pincode={pincode}`
- **Source Component:** `renderPantryRushPage(...)` (`packages/ui/pages/pantry-rush.ts`)
- **Child Components:** Hyperlocal dark-store header, pincode serviceability prompt, SKU shelf grid (4-col desktop, 2-col mobile), pack sizes, MRP vs selling price discount badges, substitution preference radio group, atomic inventory stock guard, checkout cart.
- **Application & Role:** Quick-Commerce Essentials.
- **Primary Purpose:** 15-minute hyperlocal grocery delivery: strict stock limit enforcement, out-of-stock badges, substitution rules, and free delivery thresholds (free above ₹199).

#### Control Inventory (`SCR-CUS-004`)

| Control ID | Label / Name | Type | Placement | Visibility | Enabled State | Input / Gesture | Action | State Mutation | API / Data Endpoint | Auth | Feedback | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `PAN-CTRL-001` | Pincode Selector Pill | Pill Dropdown | Top Header | Always | Always | Touch / Click | Checks hyperlocal dark store | Updates URL `?pincode=:code` | Local context | Public | ETA updates (12-15m) | `pantry-rush.ts:90` | Verified in source |
| `PAN-CTRL-002` | Category Shelf Pill | Filter Button | Categories Rail | Always | Always | Touch / Click | Filters grocery SKU shelf | Filters visible SKUs | None | Public | Shelf items update | `pantry-rush.ts:120` | Verified in source |
| `PAN-CTRL-003` | Add SKU Stepper (+) | Button | SKU Shelf Card | In stock | Available | Touch / Click | Increments SKU quantity | Checks stock limit in memory | None | Public | Stepper increments | `pantry-rush.ts:180` | Verified in source |
| `PAN-CTRL-004` | Substitution Radio | Radio Option | Cart Drawer | In Cart Drawer | Always | Touch / Click | Selects substitution preference| Updates substitutionPreference | None | Public | Radio selected | `pantry-rush.ts:240` | Verified in source |
| `PAN-CTRL-005` | Place Grocery Order | Button | Cart Drawer Footer| In Cart Drawer | In stock | Touch / Click | Executes atomic stock order | Deducts stock atomically | `POST /api/commerce/grocery/orders`| Public| Dispatch milestone view | `pantry-rush.ts:310`| Verified in source |
