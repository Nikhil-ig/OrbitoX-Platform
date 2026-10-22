# 🔍 Deliverable G & H: UX Defects, Implementation Gaps & Responsive Audit
**RestaurantOS UI/UX Reverse-Engineering & Design Handoff**
**Document ID:** `REST-OS-AUDIT-06-UX-DEFECTS-AND-GAPS`
**Status:** Complete Specification `[Verified in source]` & `[Verified at runtime]`

---

## 1. Executive Summary

This document consolidates:
1. **Deliverable G (Responsive & Interaction Audit):** A rigorous analysis of how RestaurantOS surfaces behave across four standardized viewports (Mobile 390px, Tablet 768px, Desktop 1440px, Wide Desktop / KDS Wall 1920px), detailing implemented responsive adaptations versus design deficiencies.
2. **Deliverable H (Defects & Implementation-Gap Register):** An evidence-backed catalog of UI/UX defects, disconnected controls, accessibility shortcomings, missing states, and the 3 preserved Phase 6C technical audit risks.

---

## 2. Deliverable G: Responsive & Interaction Behavior

### 2.1 Viewport Breakpoint Matrix

| Surface / Screen Family | Mobile (390 px) | Tablet (768 px) | Desktop (1440 px) | Ultra-Wide / Wall (1920 px) |
|---|---|---|---|---|
| **App Shell & Navigation** | Sidebar hidden (`width: 0`); hamburger button opens off-canvas slide drawer. Header title truncated. | Sidebar collapses to 64px compact icon rail or remains collapsible. | Fixed 240px left sidebar with full label typography and status pills. | Fixed 240px sidebar with max-width content bounding container (1600px). |
| **Floor Plan Canvas** (`/operations/floor`) | Canvas overflows horizontally; view requires pinch-zoom or horizontal panning. Table inspector opens as full-screen modal. | 2-column view: canvas 65% width, inspector 35% width. Table dragging functional. | Full visual floor map with right-docked 380px inspector panel and zoom controls. | Expansive floor view with complete table metrics visible without scrolling. |
| **Kitchen Display System** (`/kds`) | Single-column vertical ticket feed. Top station filter becomes horizontal scrolling pill strip. | 2-column ticket grid. Station tabs remain visible. Bump buttons scale to 48px. | 3 to 4 column grid partitioned into station columns (`TANDOOR`, `CURRY`, `BAR`, `EXPO`). | 5 to 6 column ultra-high-density station grid optimized for kitchen wall displays. |
| **Operational Orders** (`/operations/orders`) | Data table transforms into vertically stacked card list. Search and filter inputs stack. | Data table with horizontal scroll bar; columns `ID`, `Table`, `Status`, `Total` prioritized. | Full 7-column data table with side-by-side active order detail slide-over. | Full table with persistent right-hand order ledger and timeline inspector. |
| **Menu Catalog & Studio** (`/menu`, `/studio`) | Forms stack into single column. Modifier builder opens as full-screen bottom sheet. | 2-column form layout. Preview canvas renders below editor. | Split-screen: Left 50% form controls, Right 50% live interactive storefront preview. | Wide split-screen with multi-viewport preview toggles (Mobile / Tablet / Desktop). |
| **Diner PWA** (`/dine/:locator`) | Full-width mobile experience. Sticky bottom cart bar. Customizer opens as bottom sheet. | Centered container (`max-width: 680px`). Bottom bar remains floating. | Split-screen (in Haute theme) or centered editorial feed (`max-width: 880px`). | Centered luxury canvas with ambient background photography and wine pairings. |
| **CraveAtlas** (`/crave-atlas`) | 1-column dish grid. Carousel touch-swipeable. Floating cart capsule at bottom. | 2-column dish grid. Carousel shows prev/next arrows and touch gestures. | 3-column dish grid. Persistent right order folio dock. | 4-column dish grid with luxury editorial layout bounds. |
| **SwiftBite** (`/swift-bite`) | Ultra-dense single column list. Sticky bottom 1-tap checkout bar. | 2-column express grid. Sticky bottom bar expands into modal sheet. | 3-column grid with right-docked order summary and past orders drawer. | 3-column grid with desktop centered kiosk mode. |
| **PantryRush** (`/pantry-rush`) | 2-column supermarket shelf. Free delivery bar sticky below header. | 3-column shelf grid. Filter sidebar on left. | 4-column shelf grid with category sidebar and right cart drawer. | 5-column supermarket aisle shelf with high-density inventory cards. |

---

### 2.2 Implemented Responsive Transformations vs. Existing Gaps

#### Implemented Responsive Features `[Verified in source]`
1. **Diner Mobile Bottom Sheet (`.sheet-overlay` & `.sheet-content`):**
   - On viewports `<640px`, modifier customization modals anchor to the bottom of the viewport with `border-radius: 20px 20px 0 0` and `max-height: 88vh`, accommodating virtual keyboards.
2. **Mobile Floating Cart Dock:**
   - In CraveAtlas, SwiftBite, and Diner PWA, a sticky bottom order bar enters smoothly with `transform: translateY(0)` once cart item count is greater than zero, ensuring 1-tap checkout visibility.
3. **CraveAtlas WAI-ARIA Carousel:**
   - Adapts from swipeable touch scroll-snap (`overflow-x: auto; scroll-snap-type: x mandatory`) on mobile to prev/next desktop arrow controls on viewports `>1024px`.

#### Responsive Deficiencies & Gaps `[Verified at runtime]`
1. **Floor Plan Canvas Touch Dragging Defect:**
   - Canvas table repositioning relies exclusively on mouse events (`mousedown`, `mousemove`, `mouseup`). On iPad and touch tablets, touch dragging triggers browser viewport panning and pull-to-refresh rather than table movement.
2. **Table Header Truncation on Operations Floor:**
   - On viewports `<768px`, the operations header containing the branch selector, floor selector, and service area selector wraps awkwardly into 3 rows, pushing the floor canvas below the fold.
3. **Horizontal Table Overflow in Staff & Reports:**
   - The Staff management table (`/staff`) and Reports breakdown table (`/reports`) maintain fixed min-widths without horizontal scrolling indicators, resulting in the rightmost action buttons ("Revoke", "Edit") being clipped off-screen on mobile devices.

---

## 3. Deliverable H: Defects & Implementation-Gap Register

### 3.1 UX Defects & Functional Gaps

```
Defect Schema:
- Issue ID: Stable identifier (UX-DEF-XXX / TECH-DEF-XXX)
- Screen & Control: Screen ID and Control ID
- Expected Behavior: What the user reasonably expects
- Observed Behavior: Source evidence of what actually happens
- Root Cause: Underlying code reason
- User Impact: Operational or UX consequence
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- Dependencies: Related modules
- Suggested Fix Direction: High-level architectural remediation
```

---

#### `UX-DEF-001`: Disconnected Quick Action Buttons on Overview Dashboard
- **Screen & Control:** Screen `SCR-OPS-OVERVIEW-001` / Controls `OPS-CTRL-005` ("Open Shift"), `OPS-CTRL-006` ("Table Seating"), `OPS-CTRL-007` ("Kitchen Station View"), `OPS-CTRL-008` ("Live Order Ledger").
- **Expected Behavior:** Clicking "Open Shift" triggers shift opening modal; "Table Seating" navigates directly to `/operations/floor`; "Kitchen Station View" navigates to `/kds`.
- **Observed Behavior:** Buttons are static HTML elements with empty `href="#"` or inert JavaScript `void(0)` handlers. Clicking produces no navigation or state change. `[Verified in source: packages/ui/pages/overview.ts]`.
- **Root Cause:** Placeholder mockup handlers never wired to server routes or client router.
- **User Impact:** Manager or server arriving on dashboard encounters dead controls, forcing manual sidebar traversal.
- **Severity:** HIGH.
- **Dependencies:** `packages/ui/pages/overview.ts`, Shell Router.
- **Suggested Fix Direction:** Replace inert anchors with explicit navigation links to `/operations/floor`, `/kds`, and `/operations/orders`.

---

#### `UX-DEF-002`: Floor Plan Canvas Table Dragging Broken on Touch Displays
- **Screen & Control:** Screen `SCR-OPS-FLOOR-001` / Control `FLOOR-CTRL-008` ("Canvas Table Node Drag Handle").
- **Expected Behavior:** Table node can be dragged across the floor layout using touch gestures on an iPad or tablet.
- **Observed Behavior:** Touching and dragging a table triggers native browser page scroll; table remains static. `[Verified in source: packages/ui/pages/floor.ts]`.
- **Root Cause:** Event listeners are registered only for `mousedown`, `mousemove`, and `mouseup`. Touch event listeners (`touchstart`, `touchmove`, `touchend`) with `e.preventDefault()` are absent.
- **User Impact:** Restaurant managers cannot reposition tables on floor manager tablets without attaching a mouse.
- **Severity:** HIGH.
- **Dependencies:** `packages/ui/pages/floor.ts`.
- **Suggested Fix Direction:** Add passive-false touch event listeners mapping `e.touches[0].clientX` to canvas coordinates and set `touch-action: none` on the canvas container.

---

#### `UX-DEF-003`: Missing Unsaved Changes Dirty Warning on Menu Item Form
- **Screen & Control:** Screen `SCR-MENU-001` / Controls `MENU-CTRL-003` to `MENU-CTRL-009` ("Menu Item Form Fields").
- **Expected Behavior:** If a user edits dish pricing or ingredients and clicks a sidebar navigation item, a confirmation dialog warns: "You have unsaved changes. Discard changes?"
- **Observed Behavior:** Sidebar link navigates immediately; all staged form edits and newly added modifier rows are instantly lost without warning. `[Verified at runtime]`.
- **Root Cause:** No `beforeunload` or client-side navigation dirty-state guard implemented in app shell.
- **User Impact:** Menu creators frequently lose multi-item modifier configurations upon accidental navigation clicks.
- **Severity:** MEDIUM.
- **Dependencies:** `packages/ui/shell.ts`, `packages/ui/pages/menu.ts`.
- **Suggested Fix Direction:** Maintain a `window.isFormDirty` flag and bind `window.onbeforeunload` and sidebar click interceptors when dirty.

---

#### `UX-DEF-004`: Support Ticket Filter State Lost on Page Reload
- **Screen & Control:** Screen `SCR-SUPPORT-001` / Control `SUP-CTRL-002` ("Category & Severity Filter Pills").
- **Expected Behavior:** Filtering by "URGENT_INCIDENT" persists across browser refresh or deep-linking.
- **Observed Behavior:** Filter state is purely client-side DOM toggle; reloading `/support` resets filters to "ALL". `[Verified in source: packages/ui/pages/support.ts]`.
- **Root Cause:** Filters do not synchronize with URL search parameters (`?category=...&severity=...`).
- **User Impact:** Support staff triaging critical incidents lose their filtered queue whenever the page refreshes via SSE event.
- **Severity:** LOW.
- **Dependencies:** `packages/ui/pages/support.ts`.
- **Suggested Fix Direction:** Sync active filter pills to `history.replaceState` and initialize filters from `new URLSearchParams(location.search)`.

---

#### `UX-DEF-005`: Mobile Modal Sheets Lack Swipe-to-Dismiss Gesture Physics
- **Screen & Control:** Screen `SCR-DINER-001` / Control `DIN-CTRL-008` ("Modifier Sheet Close / Backdrop").
- **Expected Behavior:** Mobile bottom sheets can be swiped downward to dismiss, matching native iOS/Android sheet ergonomics.
- **Observed Behavior:** Swiping down scrolls the sheet content; closing requires tapping the small "X" button or the dark backdrop. `[Verified at runtime]`.
- **Root Cause:** Missing gesture touch drag handler and velocity physics on `.sheet-content`.
- **User Impact:** Suboptimal mobile usability for guests customizing complex dishes.
- **Severity:** LOW.
- **Dependencies:** `packages/ui/pages/diner.ts`.
- **Suggested Fix Direction:** Implement a touch velocity threshold on the top drag handle to trigger dismiss.

---

#### `UX-DEF-006`: KDS Background Tab Audio Alert Throttle
- **Screen & Control:** Screen `SCR-KDS-001` / Control `KDS-CTRL-004` ("Audio Chime Alert").
- **Expected Behavior:** When a new high-priority order arrives while the KDS tab is in the background, a loud kitchen chime rings.
- **Observed Behavior:** Audio chime fails to play on modern browsers when tab is backgrounded due to browser autoplay policy restrictions. `[Verified at runtime]`.
- **Root Cause:** Audio context is not explicitly unlocked on the initial staff station selection click.
- **User Impact:** Cooks miss newly fired orders when using multi-monitor setups or background browser tabs.
- **Severity:** MEDIUM.
- **Dependencies:** `packages/ui/pages/kds.ts`.
- **Suggested Fix Direction:** Unlock Web Audio `AudioContext` on first user click in station modal and keep context active.

---

#### `UX-DEF-007`: Studio Section Drag Lacks Visual Drop Indicator
- **Screen & Control:** Screen `SCR-STUDIO-001` / Control `STU-CTRL-004` ("Section Reorder Drag Handle").
- **Expected Behavior:** Dragging a template section shows a highlighted horizontal insertion line between sections.
- **Observed Behavior:** Dragging moves the element opacity, but the target drop position is invisible until release. `[Verified in source: packages/ui/pages/studio.ts]`.
- **Root Cause:** Missing CSS drop indicator class (`.drag-over-indicator`) during `dragover` events.
- **User Impact:** Studio designers struggle to place sections accurately in multi-section landing pages.
- **Severity:** LOW.
- **Dependencies:** `packages/ui/pages/studio.ts`.
- **Suggested Fix Direction:** Add `.drag-over-above` and `.drag-over-below` borders on drag target hover.

---

#### `UX-DEF-008`: Infinite Toast Notification Stacking Under High Kitchen Load
- **Screen & Control:** Screen `SCR-KDS-001` & App Shell / Control `KDS-CTRL-010` ("Toast Notification Bar").
- **Expected Behavior:** Toasts stack cleanly with a maximum limit of 3, auto-dismissing older toasts.
- **Observed Behavior:** During a heavy rush with multiple station bumps, toasts stack continuously down the screen, covering bump action buttons. `[Verified at runtime]`.
- **Root Cause:** Toast dispatcher appends directly to DOM without bounding container limit.
- **User Impact:** Expo cook's screen becomes obscured by informational toasts during peak service.
- **Severity:** MEDIUM.
- **Dependencies:** `packages/ui/shell.ts`.
- **Suggested Fix Direction:** Enforce `maxToasts = 3` and remove `children[0]` when limit is exceeded.

---

### 3.2 Preserved Technical Audit Observations (Phase 6C)

As required by the mission constraints, the following three critical technical risks identified during the Phase 6C audit are documented here as preserved architectural findings:

---

#### `TECH-DEF-001`: Incomplete Session-Property Rollback on Flush Failure
- **Component & Location:** `packages/storage/store.ts` — `RestaurantRuntimeStore.closeSession()`.
- **Expected Behavior:** In the event of an injected disk write failure (`SIMULATED_DISK_WRITE_FAILURE: EACCES`) during `flushSync()`, all mutated memory state on the guest session and table must be rolled back completely to its exact pre-transaction state.
- **Observed Behavior:** While `table.status` and `order.status` are successfully restored to `OCCUPIED` and `PLACED`, certain sub-properties on `session` (specifically `session.closedAt`, `session.settlementRecord`, and `session.paymentStatus`) are mutated directly in-place prior to flush. If `flushSync()` fails, these sub-properties remain populated in server memory even though the disk write failed. `[Verified in source: packages/storage/store.ts & scripts/test-phase6c-stage-a.js]`.
- **Root Cause:** Mutating session object reference directly instead of staging changes on a deep clone.
- **User Impact:** If disk write fails during table settlement, in-memory reporting displays the table session as settled while disk storage and other cluster nodes still consider it open, creating phantom settlement desynchronization.
- **Severity:** HIGH (Data Integrity Risk).
- **Suggested Fix Direction:** Deep clone `session` before mutation and restore reference in catch block:
  ```typescript
  const sessionBackup = JSON.parse(JSON.stringify(session));
  // In catch: Object.assign(session, sessionBackup);
  ```

---

#### `TECH-DEF-002`: Overwritten Pre-Existing Idempotency Record on Error Rollback
- **Component & Location:** `packages/storage/store.ts` — `RestaurantRuntimeStore.closeSession()`.
- **Expected Behavior:** When an idempotent transaction fails during disk persistence, the store's error handler should only delete the idempotency key if it was newly created during that specific transaction. If a pre-existing idempotency record existed, it must be restored to its pre-transaction state.
- **Observed Behavior:** The rollback handler unconditionally calls:
  ```typescript
  if (options?.idempotencyKey) {
    this.deleteIdempotencyRecord(options.idempotencyKey);
  }
  ```
  If a client attempted a retry that hit a persistence error, the original valid idempotency record is permanently deleted from memory. `[Verified in source: packages/storage/store.ts]`.
- **Root Cause:** Lack of pre-mutation inspection of whether the key existed prior to the current execution.
- **User Impact:** A network retry that fails disk write will erase the original idempotency record, allowing subsequent requests to bypass duplicate-submission protections.
- **Severity:** HIGH (Idempotency Guarantee Violation).
- **Suggested Fix Direction:** Cache `const existingRecord = this.getIdempotencyRecord(key)` before mutation, and restore `existingRecord` in catch block instead of blanket deletion.

---

#### `TECH-DEF-003`: Credential Exposure Through URL Query Parameter Exemptions
- **Component & Location:** `src/server.ts` — Authentication Middleware.
- **Expected Behavior:** Sensitive authentication credentials (session tokens, bearer tokens, staff PINs) must be transmitted exclusively via secure HTTP request headers (`Authorization: Bearer <token>` or `x-staff-token: <token>`) or HttpOnly cookies.
- **Observed Behavior:** To facilitate browser `EventSource` connections and iframe previews, `src/server.ts` explicitly permits authentication via URL query parameters:
  ```typescript
  const token = (parsedUrl.query.token as string) || (headers['authorization']?.replace('Bearer ', ''));
  ```
  `[Verified in source: src/server.ts lines 430-460]`.
- **Root Cause:** Native browser `EventSource` API does not support custom HTTP request headers without polyfills.
- **User Impact:** Staff authentication tokens are recorded in plain text in browser histories, proxy access logs, reverse proxy logs, and `Referer` headers when external links are clicked.
- **Severity:** MEDIUM (Security & Compliance Risk).
- **Suggested Fix Direction:** Implement short-lived, single-use ticket exchange tokens for SSE connections (`POST /api/restaurant/auth/ticket` returning a 60-second nonce) or migrate to a token-over-cookie architecture.

---

## 4. Verification & Confidence Statement

- **Responsive Behavior:** `[Verified in source]` (`packages/ui/styles.ts`, `packages/ui/pages/diner.ts`) and `[Verified at runtime]` using headless browser inspection at 390px, 768px, and 1440px viewports.
- **UX Defects (`UX-DEF-001` through `UX-DEF-008`):** `[Verified in source]` and cross-referenced with active DOM element bindings.
- **Phase 6C Technical Risks (`TECH-DEF-001` through `TECH-DEF-003`):** `[Verified by test]` (`scripts/test-phase6c-stage-a.js`) and direct code inspection in `packages/storage/store.ts`.
