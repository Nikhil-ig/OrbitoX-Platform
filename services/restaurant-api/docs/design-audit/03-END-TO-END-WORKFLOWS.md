# 🪐 RestaurantOS — Complete UI/UX Reverse-Engineering & Design Handoff
## Document 03: End-to-End User Workflows & Operational State Transitions

- **Audit Date:** October 22, 2026
- **Auditor:** OrbitoX Senior Systems Architect & Design Engineering Agent
- **Target Repository:** `projects/external-os/restaurant-os`
- **Audit Scope:** 15 Complete User Journeys with Numbered Steps, Alternate Paths, Failure Recovery, and API Traces

---

## Workflow 1: Establish Global Context & Authenticate Staff Session

```mermaid
sequenceDiagram
    autonumber
    actor Manager as General Manager
    participant Shell as UI Shell Top Bar
    participant Server as Node HTTP Kernel (:4010)
    participant Store as RestaurantRuntimeStore

    Manager->>Shell: Opens http://localhost:4010/
    Shell->>Server: GET /?branch=branch_ldh&floor=floor_courtyard&service=Dinner+Service
    Server->>Store: validateAndResolveContext(branches, floors, query)
    Store-->>Server: Authoritative Context (Ludhiana Main, Courtyard, Dinner)
    Server->>Server: issueStaffToken({ role: 'MANAGER', branchId: 'branch_ldh' })
    Server-->>Shell: Render HTML with window.__STAFF_SESSION__
    Manager->>Shell: Clicks Branch Dropdown -> Chooses "Chandigarh Sector 26"
    Shell->>Server: GET /?branch=branch_chd&floor=floor_chd_main&service=Dinner+Service
    Server-->>Shell: Full context cascade across floor, tables, orders, and KDS
```

### Chronological Steps
1. **Starting Screen:** Any operational page (e.g. Operations Command `/`).
2. **User Role:** General Manager / Host (`MANAGER`, `ADMIN`).
3. **Step 1:** The user loads `http://localhost:4010/`. The server executes `validateAndResolveContext` (`src/server.ts:365`), verifying `branch` and `floor` against persisted `store.getBranches()` and `store.getFloors()`.
4. **Step 2:** If query parameters are missing or invalid, the engine defaults to `branches[0]` (`branch_ldh`) and its first floor (`floor_courtyard`).
5. **Step 3:** The server issues an ephemeral HMAC-SHA256 signed staff token (`orb_stf.[claims].[sig]`) and embeds it in `window.__STAFF_SESSION__`.
6. **Step 4 (Branch Switch):** The user clicks the top bar location button (`#branch-menu`). The dropdown displays all branches with live status (`● Live` / `○ Setup`). The user selects `Chandigarh Sector 26` (`branch_chd`).
7. **Step 5 (Cascading Resolution):** The browser navigates to `?branch=branch_chd&floor=floor_chd_main&service=Dinner+Service`. All left sidebar links, floor layouts, table fleet records, and active orders automatically filter to the new branch context.
8. **Failure & Recovery:** If a staff member enters an invalid PIN via the auth gateway (`POST /api/restaurant/auth/staff-token`), the server records a failed attempt in `failedPinAttempts`. On the 5th consecutive failure from the same client IP, a 15-minute brute-force lockout is triggered (`HTTP 429 TOO_MANY_FAILED_ATTEMPTS`). An admin must call `POST /api/restaurant/staff/reset-lockout` to restore access.

---

## Workflow 2: QR Discovery & In-Restaurant Dine-In Guest Ordering

```mermaid
sequenceDiagram
    autonumber
    actor Diner as Restaurant Patron
    participant PWA as Diner Mobile Companion (:4010/dine/:locator)
    participant Server as HTTP Kernel
    participant Store as RuntimeStore
    participant KDS as Kitchen KDS (:4010/kds)

    Diner->>PWA: Scans Table T-14 QR Code
    PWA->>Server: GET /dine/7Kp9xQ8m2L
    Server->>Store: getTableByLocator('7Kp9xQ8m2L')
    Store-->>Server: Table 14, Courtyard, Active Session
    Server-->>PWA: Render active theme (e.g. Atelier Etoile Noir)
    Diner->>PWA: Taps "+ Add" on Paneer Tikka -> Chooses "Extra Mint Chutney"
    Diner->>PWA: Taps "Submit Order" (Cart Total: ₹380.00)
    PWA->>Server: POST /api/restaurant/orders (x-session-id, items)
    Server->>Server: Validate items, calculate 5% GST & subtotal
    Server->>Store: addOrder(order) & addKitchenTask(tasks)
    Server->>KDS: EventBus.broadcast('order.created', 'task.created')
    KDS-->>KDS: Web Audio chime sounds, ticket appears on Tandoor pass
    Server-->>PWA: HTTP 201 { success: true, orderId: "ord_xxx" }
    PWA-->>Diner: Transitions to live order tracking screen
```

### Chronological Steps
1. **Starting Screen:** Diner Mobile Companion (`/dine/:locator`).
2. **User Role:** In-Restaurant Dining Guest (`DINER`, Anonymous).
3. **Step 1 (Table Entry):** Patron scans the physical QR code mounted on Table T-14. The URL resolves `locator: '7Kp9xQ8m2L'` via `store.getTableByLocator`. The server generates a unique guest capability token (`cap_[random]`).
4. **Step 2 (Menu Browsing):** The patron browses menu categories (Starters, Mains, Breads, Beverages, Desserts). Dishes display names, photographs, descriptions, dietary badges (VEG, NON_VEG), and base prices.
5. **Step 3 (Item Customization):** For items with modifier groups (e.g. "Kashmiri Murgh Tikka"), clicking `+ Add` slides up the modifier drawer (`#ca-modifier-modal`). The patron selects spice level ("Medium") and accompaniment ("Garlic Naan +₹60"). Price deltas calculate in real time.
6. **Step 4 (Cart Review):** The bottom cart bar slides up (`#diner-cart-bar`). The patron taps `View Order Summary`. The folio computes: Subtotal ₹350.00 + Accompaniment ₹60.00 + 5% GST ₹20.50 = Total ₹430.50 (stored as `43050` minor units).
7. **Step 5 (Order Submission):** The patron clicks `Place Order`. The client sends `POST /api/restaurant/orders` with headers `x-session-id: sess_14` and `Authorization: Bearer cap_[token]`.
8. **Step 6 (Server Validation):** The server verifies item availability, validates the quote, persists the `RestaurantOrder`, spawns individual `KitchenTask` records routed to station queues (`TANDOOR`, `CURRY_LINE`), and emits `order.created` and `task.created` via the SSE EventBus.
9. **Step 7 (Kitchen Notification):** Connected KDS screens play a synthesized Web Audio alert chime. The ticket immediately appears on the Tandoor and Curry Line passes.
10. **Failure Paths:**
    - If an item was 86'd at that branch (`isAvailableAtBranch: false`), the API returns `HTTP 400 ITEM_UNAVAILABLE_AT_BRANCH`. The client displays an inline alert: "Dish is currently sold out."
    - If the table session was closed by the host, the API returns `HTTP 401 REVOKED_CAPABILITY`. The client prompts the guest to rescan the table QR.

---

## Workflow 3: Table Session Management, Folio Auditing & POS Settlement

```mermaid
sequenceDiagram
    autonumber
    actor ServerStaff as Floor Server / POS Cashier
    participant Canvas as Spatial Floor Studio (:4010/operations/floor)
    participant Kernel as HTTP Kernel
    participant Store as RuntimeStore

    ServerStaff->>Canvas: Clicks Table T-14 node on Canvas
    Canvas->>Canvas: Opens Right Inspector Tab 4 (Bill)
    Canvas->>Kernel: GET /api/restaurant/tables/14/bill
    Kernel->>Store: Compute itemized check + 5% GST
    Kernel-->>Canvas: { subtotalMinor: 125000, taxMinor: 6250, totalMinor: 131250 }
    ServerStaff->>Canvas: Selects Payment Method: "CASH"
    ServerStaff->>Canvas: Enters Cash Tendered: ₹1,500.00 (Change Due: ₹187.50)
    ServerStaff->>Canvas: Clicks "Execute Settlement"
    Canvas->>Kernel: POST /api/restaurant/tables/14/settle (paymentMethod: 'CASH', idempotencyKey)
    Kernel->>Kernel: Acquire settlement mutex: activeSettlementLocks['table_settle_14']
    Kernel->>Store: closeSessionAndSettle(14, 'CASH', 'PAID')
    Store->>Store: Update table status -> AVAILABLE, revoke guest tokens, flushSync()
    Kernel->>Kernel: Release settlement mutex
    Kernel-->>Canvas: HTTP 200 { success: true, tableNumber: "T-14", settledAmount: 131250 }
    Canvas-->>ServerStaff: Toast: "Table T-14 Settled & Cleared". Node turns sage green.
```

### Chronological Steps
1. **Starting Screen:** Spatial Floor Studio (`/operations/floor?table=14`).
2. **User Role:** Floor Server / Cashier (`STAFF`, `MANAGER`).
3. **Step 1:** The server clicks Table T-14 on the SVG canvas. The right-hand Table Inspector drawer opens and switches to the `Bill` tab (`#tab-bill`).
4. **Step 2:** The client requests `GET /api/restaurant/tables/14/bill`. The backend aggregates all orders tied to `sessionId: sess_14`, calculates subtotal, 5% GST, discounts, and returns the authoritative balance.
5. **Step 3:** The server selects payment method from the dropdown (`CASH`, `CARD`, `UPI`). When `CASH` is chosen, the `Cash Tendered` input appears. The cashier types `1500`. The change calculator displays `Change Due: ₹187.50`.
6. **Step 4:** The cashier clicks `Execute Settlement`.
7. **Step 5 (Mutex & Idempotency):** The backend acquires an in-memory settlement lock `activeSettlementLocks['table_settle_14']`. Any concurrent settlement attempt on the same table is immediately rejected with `HTTP 409 CONCURRENT_SETTLEMENT_IN_PROGRESS`.
8. **Step 6 (Atomic Persistence):** The server marks all session orders `PAID`, sets table status to `AVAILABLE`, clears `activeSessionId`, revokes guest capability tokens, appends `TABLE_SETTLED` to the domain event log, flushes to disk via atomic file rename, and releases the mutex.
9. **Step 7 (SSE Broadcast):** The server broadcasts `table.status_changed` (`T-14 -> AVAILABLE`). The table node turns sage green across all open floor canvas screens, tables fleet lists, and the manager cockpit.

---

## Workflow 4: Spatial Floor Layout Planning & Table Geometry Mutation

```mermaid
sequenceDiagram
    autonumber
    actor Manager as Floor Manager
    participant Canvas as Spatial Floor Studio (:4010/operations/floor)
    participant Server as HTTP Kernel
    participant Store as RuntimeStore

    Manager->>Canvas: Taps "Layout Design" Mode Toggle
    Canvas->>Canvas: Enables pointer drag, displays 24px snap grid, reveals "+ Add Table"
    Manager->>Canvas: Clicks "+ Add Table"
    Canvas->>Canvas: Spawns new Table T-20 at (100, 100) with capacity 4P
    Manager->>Canvas: Drags T-20 to (360, 240) -> Snaps to 24px grid
    Manager->>Canvas: Right Inspector Tab 5 (Layout) -> Changes shape to "booth", rotates 90 deg
    Manager->>Canvas: Clicks "Save Changes" (#save-layout-btn)
    Canvas->>Server: POST /api/restaurant/floor/save (tables array)
    Server->>Store: saveFloorLayout(tables) & flushSync()
    Server-->>Canvas: HTTP 200 { success: true, count: 18 }
    Canvas-->>Manager: Banner: "Saved". Switch back to Live Service mode.
```

### Chronological Steps
1. **Starting Screen:** Spatial Floor Studio (`/operations/floor`).
2. **User Role:** General Manager / Floor Designer (`MANAGER`, `ADMIN`).
3. **Step 1:** The user clicks `Layout Design` (`#mode-edit-btn`). Live operational actions are disabled and spatial editing tools are activated.
4. **Step 2:** The canvas reveals the 24px snap-to-grid dots, architectural boundary lines, and displays the `+ Add Table` and `Save Changes` buttons in the toolbar.
5. **Step 3:** The user clicks `+ Add Table`. A new table record (`T-[N]`) is staged at coordinate (100, 100) with default dimensions 72x72px and 4 covers.
6. **Step 4:** The user drags the table across the canvas. `pointermove` calculates coordinates with snap formula:
   ```javascript
   const snappedX = Math.round(rawX / 24) * 24;
   const snappedY = Math.round(rawY / 24) * 24;
   ```
7. **Step 5:** The user opens Inspector Tab 5 (`Layout`) to adjust dimensions: Width 120px, Height 80px, Shape `booth`. Clicking `Rotate 90°` cycles the table orientation.
8. **Step 6:** The user clicks `Save Changes`. The client posts the full tables array to `POST /api/restaurant/floor/save`. The server validates coordinates within architectural boundaries (940x620) and atomically commits to disk.

---

## Workflow 5: Kitchen Station Preparation, Item Fulfillment & Expo Pass

```mermaid
sequenceDiagram
    autonumber
    actor Chef as Station Chef (Tandoor)
    actor Expo as Expediter (Expo Pass)
    participant KDS as Kitchen KDS (:4010/kds)
    participant Server as HTTP Kernel
    participant Store as RuntimeStore

    Server->>KDS: SSE Event: 'task.created' (Table T-14: Paneer Tikka x2, Murgh Tikka x1)
    KDS-->>Chef: High-pitch Web Audio chime rings, card appears with copper border (QUEUED)
    Chef->>KDS: Taps 54px tactile button: "START COOKING"
    KDS->>Server: POST /api/restaurant/kds/bump (taskId: 'task_01', action: 'START')
    Server->>Store: updateKitchenTask(status: 'IN_PROGRESS')
    Server-->>KDS: HTTP 200. Border turns blue. SLA timer starts countdown (12 mins).
    Chef->>KDS: Taps checkmark on "Paneer Tikka" -> Strikethrough (1/2 fulfilled)
    KDS->>Server: POST /api/restaurant/kds/fulfill-item (taskId: 'task_01', itemIndex: 0)
    Chef->>KDS: Taps checkmark on "Murgh Tikka" -> Ticket ready (2/2 fulfilled)
    Chef->>KDS: Taps 54px button: "MARK TICKET READY" -> Border turns green (READY)
    Expo->>KDS: Switches to "Expo Command" tab
    KDS-->>Expo: Table T-14 shows all dishes READY. Dispatch button unlocks.
    Expo->>KDS: Taps "DISPATCH TABLE T-14"
    KDS->>Server: POST /api/restaurant/kds/expo-dispatch (tableNumber: 'T-14')
    Server->>Store: bumpKitchenTask(all table tasks) -> status: 'BUMPED'
    Server-->>KDS: Table cleared from Expo pass. Ticket moved to RECALL buffer.
```

### Chronological Steps
1. **Starting Screen:** Kitchen KDS Workstation (`/kds?station=TANDOOR`).
2. **User Role:** Line Chef / Kitchen Expediter (`CHEF`, `STATION`).
3. **Step 1 (Order Arrival):** An order submitted from Table T-14 is received via SSE. The Web Audio synthesizer triggers an 880 Hz two-tone chime. A new ticket card appears with a copper border (`QUEUED`).
4. **Step 2 (Start Cook):** The chef taps the 54px bump button `START COOKING`. The task status transitions to `IN_PROGRESS`. The border turns sky blue and the station SLA countdown begins (Tandoor = 12 minutes).
5. **Step 3 (Item Fulfillment):** When the Paneer Tikka skewers leave the clay oven, the chef taps the checkmark button next to the item. The item receives a strikethrough styling and the progress badge updates to `1/2 items fulfilled`.
6. **Step 4 (Station Completion):** Once all items are checked, the chef taps `MARK TICKET READY`. The ticket turns sage green (`READY`).
7. **Step 5 (Expo Command):** The expediter at the pass views `/kds?station=EXPO`. Table T-14 aggregates items across Tandoor, Curry Line, and Bar. Once all station tasks reach `READY`, the global `DISPATCH TABLE T-14` button unlocks.
8. **Step 6 (Dispatch):** The expediter taps `DISPATCH`. The server bumps all tasks to `BUMPED` and notifies floor staff via SSE `order.status_changed -> SERVED`.
9. **Failure / Recall Path:** If a server returns stating a dish was damaged or sent to the wrong table, the expediter switches to the `Recall Fulfilled` tab and taps `RECALL / REFIRE`. The ticket immediately returns to the active station queue with a flashing priority alert.

---

## Workflow 6: Menu Engineering, Category Taxonomy & Branch 86'ing

```mermaid
sequenceDiagram
    autonumber
    actor ChefMgr as Executive Chef / Beverage Manager
    participant MenuUI as Menu Catalog Workspace (:4010/menu)
    participant Server as HTTP Kernel
    participant Store as RuntimeStore

    ChefMgr->>MenuUI: Clicks "+ Add New Dish"
    MenuUI->>MenuUI: Opens slide-in Item Drawer (#dish-modal-drawer)
    ChefMgr->>MenuUI: Enters: Name, Category ("Starters"), Station ("TANDOOR"), Price (₹450.00)
    ChefMgr->>MenuUI: Sets Prep SLA (14m), checks VEG & GLUTEN_FREE badges
    ChefMgr->>MenuUI: Clicks "+ Add Modifier Group" -> "Spice Level" (Mild, Medium, Hot)
    ChefMgr->>MenuUI: Clicks "Save Dish" (Cmd+Enter)
    MenuUI->>Server: POST /api/restaurant/menu/items (dishPayload)
    Server->>Store: saveMenuItem(item) & flushSync()
    Server-->>MenuUI: HTTP 201 { success: true, item: { ... } }
    MenuUI-->>ChefMgr: Toast: "Dish saved to master catalog". Table re-indexes.
    ChefMgr->>MenuUI: Switches to "Branch Overrides & 86'ing" tab
    ChefMgr->>MenuUI: Toggles 86'd switch on "Amritsari Fish Tikka" for Ludhiana branch
    MenuUI->>Server: POST /api/restaurant/menu/branch-overrides ({ itemId, branchId, isAvailable: false })
    Server->>Store: setBranchMenuOverride(...) & flushSync()
    Server-->>MenuUI: HTTP 200. Badge updates to "86'd / Sold Out".
```

### Chronological Steps
1. **Starting Screen:** Menu Catalog Workspace (`/menu`).
2. **User Role:** Executive Chef / Food & Beverage Manager (`MANAGER`, `ADMIN`).
3. **Step 1:** The user clicks `+ Add New Dish` (`#btn-add-dish`). The item drawer slides in.
4. **Step 2:** Form fields are populated:
   - Name: `Tandoori Malai Broccoli`
   - Category: `Starters`
   - Kitchen Station: `TANDOOR`
   - Base Price: `450` (automatically converted to `45000` paise)
   - Prep SLA: `14` minutes
   - Image URL: Validates live image preview with error fallback.
5. **Step 3:** The user configures modifier groups: Group Name "Marinade Style" with options "Cardamom Cream (₹0)" and "Truffle Infused (+₹120)".
6. **Step 4:** The user submits with `Cmd+Enter`. The server validates payload types, stores the item in `data.menuItems`, flushes to disk, and broadcasts catalog updates.
7. **Step 5 (Branch 86'ing):** The user switches to the `Branch Overrides` tab. A supplier informs the kitchen that Atlantic Salmon is unavailable. The chef toggles the availability switch next to Salmon Tikka for `branch_ldh`.
8. **Step 6 (Instant Customer Lockout):** The server saves the override. Any customer browsing Diner PWA, CraveAtlas, or SwiftBite immediately sees the dish grayed out with a `Sold Out` badge. The `+ Add` button is disabled.

---

## Workflow 7: Staff Credential Provisioning, Station Scoping & Revocation

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Restaurant General Manager
    participant StaffUI as Staff Directory (:4010/staff)
    participant Server as HTTP Kernel
    participant Store as RuntimeStore

    Admin->>StaffUI: Clicks "Provision Staff Member"
    StaffUI->>StaffUI: Opens Provision Dialog (#provision-modal)
    Admin->>StaffUI: Enters: Name ("Rohit Kumar"), Role ("CHEF"), Station ("CURRY_LINE"), PIN ("8492")
    Admin->>StaffUI: Submits Form
    StaffUI->>Server: POST /api/restaurant/staff (name, role, station, pin)
    Server->>Server: Hash PIN: crypto.createHash('sha256').update(pin + salt).digest('hex')
    Server->>Store: Add member to STAFF_DIRECTORY & flushSync()
    Server-->>StaffUI: HTTP 201 { success: true, staffId: "stf_curry_rohit" }
    StaffUI-->>Admin: Toast: "Staff member provisioned with salted SHA-256 PIN".
    Admin->>StaffUI: Later: Clicks "Revoke Credential" on compromised token
    StaffUI->>Server: POST /api/restaurant/auth/revoke ({ token: "orb_stf.xxx", jti: "jti_123" })
    Server->>Store: recordStaffRevocation(token, jti) -> write to .revoked_staff_tokens.json (mode 0600)
    Server-->>StaffUI: HTTP 200 { success: true, revoked: true }
```

### Chronological Steps
1. **Starting Screen:** Staff Directory & RBAC Security (`/staff`).
2. **User Role:** General Manager / Administrator (`ADMIN`, `MANAGER`).
3. **Step 1:** The manager clicks `Provision Staff Member` (`#btn-provision-staff`).
4. **Step 2:** The dialog prompts for staff name, role (`MANAGER`, `SERVER`, `CHEF`, `EXPO`), branch assignment, kitchen station scope (`TANDOOR`, `CURRY_LINE`, `BAR`, `EXPO`, `ALL`), and a 4-digit PIN.
5. **Step 3:** The server salts and hashes the PIN using SHA-256:
   ```typescript
   const salt = 'orbitox_bistro_salt_2026';
   const pinHash = crypto.createHash('sha256').update(pin + salt).digest('hex');
   ```
6. **Step 4:** The member is committed to persistent storage. Ephemeral tokens issued to this chef will strictly contain `station: 'CURRY_LINE'`. If the chef attempts to bump a Tandoor ticket, the server rejects the request with `HTTP 403 STATION_MISMATCH`.
7. **Step 5 (Emergency Revocation):** If a staff token or tablet is compromised, the manager clicks `Revoke Credential`.
8. **Step 6 (Durable Revocation Registry):** The server writes the token and JTI into both `data.revokedStaffTokens` and the secure file `data/.revoked_staff_tokens.json` (`chmod 0600`). Even if the Node process restarts, any subsequent request bearing that token is immediately rejected with `HTTP 401 REVOKED_CAPABILITY`.

---

## Workflow 8: Visual Brand Studio Customization, Preview & Live Publishing

```mermaid
sequenceDiagram
    autonumber
    actor BrandMgr as Brand Manager
    participant Studio as Visual Brand Studio (:4010/studio)
    participant Server as HTTP Kernel
    participant Store as RuntimeStore
    participant Storefront as Diner PWA (:4010/dine/:locator)

    BrandMgr->>Studio: Opens http://localhost:4010/studio
    Studio->>Server: GET /api/restaurant/studio/draft
    Server-->>Studio: Returns active draft sections & design tokens
    BrandMgr->>Studio: Toggles Viewport: "Mobile (390px)" -> Canvas scales to 390px
    BrandMgr->>Studio: Left Panel: Drags "Culinary Highlights" above "Story Chapter"
    BrandMgr->>Studio: Clicks "Save Draft" -> POST /api/restaurant/studio/draft
    Server->>Store: saveTemplateDraft(draft) & flushSync()
    Server-->>Studio: HTTP 200 { success: true, savedAt: "..." }
    BrandMgr->>Studio: Clicks "Publish to Storefront"
    Studio->>Server: POST /api/restaurant/studio/publish
    Server->>Store: Overwrite active tenantBrand sections & increment revision
    Server->>Storefront: Broadcast EventBus: 'resync_required'
    Storefront-->>Storefront: Refreshes customer storefront with published layout
```

### Chronological Steps
1. **Starting Screen:** Visual Brand Studio & Editor (`/studio`).
2. **User Role:** Brand Director / General Manager (`ADMIN`, `MANAGER`).
3. **Step 1:** The user opens `/studio`. The 3-pane authoring canvas loads the current template draft.
4. **Step 2:** The user tests responsive layouts by clicking the viewport segment buttons: `Mobile (390px)`, `Tablet (768px)`, and `Desktop (1200px)`.
5. **Step 3:** The user reorders sections in the left layer tree, dragging `Culinary Signatures` above `Chef Story Chapter`. The center canvas updates immediately.
6. **Step 4:** The user modifies color tokens in the design tokens pane: Primary Accent changes from `#C86B3C` to `#D87B4C`.
7. **Step 5:** The user clicks `Save Draft`. The changes are persisted to `data.templateDraft` without altering the customer-facing storefront.
8. **Step 6:** After reviewing in mobile preview, the user clicks `Publish to Storefront`.
9. **Step 7:** The server promotes the draft to `data.tenantBrand`, increments the template revision, and broadcasts `resync_required` over SSE. All connected customer diner PWAs refresh and reflect the new section hierarchy and color theme.

---

## Workflow 9: White-Label Custom Domain Setup & DNS State Machine

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Platform Administrator
    participant WL as White-Label Studio (:4010/white-label)
    participant Server as HTTP Kernel
    participant DNS as External DNS Resolver

    Admin->>WL: Navigates to "Custom Domains & DNS" tab
    Admin->>WL: Enters Custom Apex Domain: "dine.thepatio-bistro.com"
    Admin->>WL: Clicks "Save Brand Configuration"
    WL->>Server: POST /api/restaurant/branding ({ customDomain: 'dine.thepatio-bistro.com' })
    Server-->>WL: HTTP 200. DNS Instruction Cards appear: CNAME -> ingress.orbitox.io
    Admin->>DNS: Provisions CNAME record in Cloudflare / Route53
    Admin->>WL: Clicks "Verify Domain & DNS" button
    WL->>Server: POST /api/restaurant/branding/verify-domain
    Server->>DNS: Node dns.promises.resolveCname('dine.thepatio-bistro.com')
    DNS-->>Server: Points to ingress.orbitox.io
    Server->>Server: Update domain status -> VERIFIED, SSL status -> ACTIVE
    Server-->>WL: HTTP 200 { verified: true, sslStatus: "ACTIVE" }
    WL-->>Admin: SSL Badge turns sage green: "● Active SSL Certificate".
```

### Chronological Steps
1. **Starting Screen:** White-Label & Custom Domains Studio (`/white-label`).
2. **User Role:** Restaurant Owner / Platform Admin (`ADMIN`).
3. **Step 1:** The admin enters the restaurant's custom hostname: `dine.thepatio-bistro.com`.
4. **Step 2:** The admin saves the configuration. The UI displays DNS instruction cards:
   - Record 1: CNAME `dine` -> `ingress.orbitox.io`
   - Record 2: TXT `_orbitox-challenge` -> `orb-domain-verification-token`
5. **Step 3:** The admin configures the records in their DNS provider (Cloudflare, AWS Route53).
6. **Step 4:** The admin clicks `Verify Domain & DNS`. The server performs real-time DNS resolution (`dns.promises.resolveCname`).
7. **Step 5:** Once verified, the domain status transitions to `VERIFIED` and SSL certificate state transitions to `ACTIVE`.
8. **Failure & Retry Path:** If DNS propagation has not completed, the API returns `HTTP 422 DNS_VERIFICATION_PENDING` with the message: "CNAME record not yet detected. Propagation may take up to 30 minutes." The UI displays a warning banner and retains the retry button.

---

## Workflow 10: CraveAtlas Flagship Discovery & Delivery Checkout

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Remote Customer
    participant Web as CraveAtlas Website (:4010/apps/crave-atlas)
    participant Server as HTTP Kernel
    participant KDS as Kitchen KDS

    Customer->>Web: Opens http://localhost:4010/apps/crave-atlas
    Web-->>Customer: Displays culinary story, signature carousel, branch picker
    Customer->>Web: Clicks "+ Add" on "Paneer Lababdar"
    Customer->>Web: Opens Slide-In Cart Folio -> Selects "Delivery"
    Customer->>Web: Enters: Name ("Priya Sharma"), Phone ("9876543210"), Address ("Flat 402, Urban Estate")
    Customer->>Web: Clicks "Place Order" (Subtotal ₹420 + Delivery ₹40 + Tax ₹21 = ₹481.00)
    Web->>Server: POST /api/commerce/orders (x-idempotency-key: "uuid", customer, items)
    Server->>Server: Validate 10-digit Indian mobile, mask phone, quote fees
    Server->>KDS: Spawn KitchenTask for CURRY_LINE station
    Server-->>Web: HTTP 201 { success: true, orderId: "ord_mkt_xxx", orderToken: "ordtok_xxx" }
    Web-->>Customer: Opens Live Order Tracking Modal (Status: "Order Confirmed & Sent to Kitchen")
```

### Chronological Steps
1. **Starting Screen:** CraveAtlas Flagship (`/apps/crave-atlas`).
2. **User Role:** Web Customer (Anonymous).
3. **Step 1:** The customer browses the signature dish carousel and selects `Paneer Lababdar`.
4. **Step 2:** The customer opens the slide-in cart folio and toggles fulfillment to `Delivery`.
5. **Step 3:** The customer fills in required contact fields:
   - Name: `Priya Sharma` (validated between 2 and 80 characters, no HTML tags).
   - Phone: `9876543210` (validated against Indian mobile regex `/^[6-9]\d{9}$/`).
   - Street Address: `Flat 402, Urban Estate, Ludhiana` (minimum 5 characters).
6. **Step 4:** The client generates a high-entropy UUID for `x-idempotency-key` and submits `POST /api/commerce/orders`.
7. **Step 5 (Server Validation & Quoting):** The server verifies branch catalog availability, calculates delivery fee (₹40.00), tax (5% GST), and formats masked customer credentials (`+91 ******3210`).
8. **Step 6 (Kitchen Insertion):** The server spawns kitchen tasks routed to station `CURRY_LINE` and returns a high-entropy tracking token (`ordtok_[hex24]`).
9. **Step 7 (Live Status Modal):** The web interface opens the live tracking modal. As kitchen chefs bump the order on KDS, the customer screen advances through milestones: `Order Confirmed` -> `Preparing in Kitchen` -> `Ready for Dispatch` -> `Completed`.

---

## Workflow 11: SwiftBite Speed-First 1-Tap Reordering

### Chronological Steps
1. **Starting Screen:** SwiftBite Speed App (`/apps/swift-bite`).
2. **User Role:** Fast-Casual Ordering Customer.
3. **Step 1:** The customer opens SwiftBite. The header highlights the 20-minute delivery SLA from the nearest branch.
4. **Step 2:** The customer views the "Order Again in 1-Tap" past favorites carousel.
5. **Step 3:** Tapping a favorite dish card (e.g. "Dal Makhani") immediately adds it to the cart and transforms the button into a tactile `[- 1 +]` stepper without navigating away.
6. **Step 4:** The customer taps the floating bottom checkout capsule.
7. **Step 5:** With delivery address and phone pre-cached, the customer taps `Place Swift Order`.
8. **Step 6:** The order is committed idempotently and routes to kitchen stations within 300ms.

---

## Workflow 12: PantryRush Hyperlocal Dark-Store Grocery Checkout

### Chronological Steps
1. **Starting Screen:** PantryRush Grocery (`/apps/pantry-rush`).
2. **User Role:** Quick-Commerce Patron.
3. **Step 1:** The customer enters their postal code (`141001`). The dark-store engine confirms serviceability with an estimated 12–15 minute dispatch ETA.
4. **Step 2:** The customer browses grocery SKUs (Dairy, Fresh Vegetables, Pantry Staples).
5. **Step 3:** Each SKU displays real stock quantities. If an item has only 2 units remaining, tapping `+` past 2 is prevented with an inline badge: "Max stock reached".
6. **Step 4:** In the cart, the customer chooses their **Substitution Preference**:
   - `Ask me first` (Default)
   - `Allow store to choose equivalent brand`
   - `Do not substitute (refund item)`
7. **Step 5:** Free delivery engine applies: Orders >= ₹199 receive free delivery; orders below ₹199 add a ₹25 delivery fee.
8. **Step 6:** The customer taps `Place Grocery Order`. The server executes `transactGroceryStock` atomically. If any item ran out of stock concurrently, the transaction rolls back cleanly and returns `HTTP 400 INSUFFICIENT_STOCK`.

---

## Workflow 13: Customer Support Desk & Engineering Incident Resolution

### Chronological Steps
1. **Starting Screen:** Customer Support Desk (`/support`).
2. **User Role:** Operations Manager / Support Specialist (`STAFF`, `MANAGER`).
3. **Step 1:** The user clicks `+ New Case` to report a hardware issue: "KDS ticket printer paper feed jammed during dinner rush".
4. **Step 2:** The ticket is assigned severity `HIGH` and category `HARDWARE_KDS`.
5. **Step 3:** The ticket appears in the priority queue inbox (Pane 1).
6. **Step 4:** The support specialist selects the ticket. Pane 2 opens the incident thread. Pane 3 loads live telemetry: active branch, memory heap, and SSE connection health.
7. **Step 5:** The specialist toggles the composer to `Internal Staff Note` (yellow accent) and enters: "Advised kitchen staff to use touch bump bar while replacement roller is dispatched."
8. **Step 6:** The specialist updates the status dropdown to `RESOLVED`. The ticket badge shifts from amber to sage green.

---

## Workflow 14: Global Command Palette (`Cmd+K`) & Keyboard Acceleration

### Chronological Steps
1. **Starting Screen:** Any operational page within `renderShell`.
2. **User Role:** Any staff member.
3. **Step 1:** The user presses `Cmd+K` (macOS) or `Ctrl+K` (Windows). The backdrop blurs and `#cmdk-modal` centers on screen.
4. **Step 2:** The search input gains focus automatically.
5. **Step 3:** The user types `floor`. The item list filters in real time to show "Spatial Floor Canvas Editor".
6. **Step 4:** The user presses `Enter`. The modal closes and navigates immediately to `/operations/floor`.
7. **Step 5 (KDS Shortcuts):** On the Kitchen KDS screen, the chef uses physical bump bar shortcuts:
   - `Space`: Bumps the oldest focused ticket to the next cooking stage.
   - `Enter`: Toggles the first incomplete item fulfillment checkmark.
   - `R`: Jumps directly to the Recall Fulfilled buffer.
   - `E`: Switches to the Expo Command pass view.
   - `A`: Returns to All Tickets view.

---

## Workflow 15: Real-Time SSE Gateway Synchronization & Resynchronization

### Chronological Steps
1. **Starting Screen:** All operational and customer clients.
2. **Step 1 (Subscription):** On page mount, the browser opens an EventSource connection:
   ```javascript
   const evtSource = new EventSource('/api/restaurant/events');
   ```
3. **Step 2 (Event Dispatch):** Whenever a mutation occurs (order placed, table seated, bill requested, kitchen ticket bumped), `RealtimeEventBus` assigns a strictly monotonic sequence integer:
   ```json
   {
     "id": "evt_1730000000000",
     "sequence": 42,
     "type": "order.created",
     "timestamp": "2026-10-22T19:42:00.000Z",
     "branchId": "branch_ldh",
     "payload": { ... }
   }
   ```
4. **Step 3 (Client Wakeup):** Connected browser tabs receive the event and selectively update DOM components or trigger seamless table refreshes without disrupting user text entry.
5. **Step 4 (Reconnection & Replay):** If network connectivity drops momentarily, the client reconnects passing `Last-Event-ID: 41`. The server replays missed events from the outbox buffer.
6. **Step 5 (Resync Gate):** If the gap exceeds the buffer limit, the server emits `resync_required`. The client automatically re-fetches authoritative baseline state.
