# 🚀 RestaurantOS — Design Reset Phase 0: Design Acceptance & Implementation Sequence
**Document ID:** `REST-OS-RESET-10-IMPLEMENTATION-SEQUENCE`  
**Repository:** `projects/external-os/restaurant-os`  
**Status:** Sequenced Implementation Plan & Mandatory Approval Gate  
**Execution Mode:** Proposal Only — Awaiting User Approval  

---

## 1. Executive Implementation Strategy

The RestaurantOS visual and operational redesign is structured into **seven incremental, regression-guarded milestones**. Work is strictly phased to ensure that:
1. Shared foundational design tokens, shell navigation, and layout grids are standardized first.
2. High-impact operational workflows (Floor, Orders, KDS) are stabilized before storefront theme refactoring.
3. Functional defect repairs (`UX-DEF-001` through `UX-DEF-008`) are clearly distinguished from purely visual restyling.
4. Backend persistence guarantees, SHA-256 pricing quotes, concurrency mutexes, and zero-ghost-event invariants remain 100% intact throughout.

---

## 2. Seven-Stage Sequenced Implementation Milestones

---

### Milestone 1: Design Foundation, Typography & Shell Normalization
- **Objective:** Establish the cohesive visual foundation, CSS variables, typography imports, and universal application shell.
- **Scope:**
  - Update [`packages/ui/tokens.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/tokens.ts) and [`packages/ui/styles.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/styles.ts) with standardized typography scales, high-contrast dark charcoal layers, and accessible button/badge states.
  - Refactor [`packages/ui/shell.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/shell.ts) to support the 220px collapsible sidebar, live SSE status pill, breadcrumbs, and command palette (`⌘K`).
  - Implement server route aliases/redirects in [`src/server.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/src/server.ts) (`/crave-atlas` ➔ `/apps/crave-atlas`, `/swift-bite` ➔ `/apps/swift-bite`, `/pantry-rush` ➔ `/apps/pantry-rush`, `/locations` ➔ `/operations/locations`).
- **Dependencies:** None.
- **Impacted Routes:** Global (all screens wrapped by `renderShell`).
- **Regression Risks:** Broken navigation query parameters (`?branch=...&floor=...&service=...`).
- **Acceptance Tests:**
  - [ ] App shell loads on all 22 screens with zero console errors.
  - [ ] Hitting legacy alias `/crave-atlas` cleanly renders the CraveAtlas flagship page.
  - [ ] `⌘K` opens Command Palette with arrow-key navigation and instant Enter navigation.

---

### Milestone 2: High-Impact Operations Core (Floor, Tables, Orders, Overview)
- **Objective:** Redesign the mission-critical dining room floor and cashier workflows.
- **Scope:**
  - Redesign Operations Overview (`/`), Spatial Floor Studio (`/operations/floor`), Tables Fleet (`/operations/tables`), and Order Ledger (`/operations/orders`).
  - **Defect Fix `UX-DEF-001`:** Reconnect Overview quick action buttons (`OPS-CTRL-005..008`) to canonical routes.
  - **Defect Fix `UX-DEF-002`:** Implement passive-false touch event listeners (`touchstart`, `touchmove`, `touchend`) on the floor canvas to enable iPad/tablet table dragging.
  - Polish the 380px right-docked table inspector with split billing and cash change calculator.
- **Dependencies:** Milestone 1.
- **Impacted Routes:** `/`, `/operations/floor`, `/operations/tables`, `/operations/orders`.
- **API / State Constraints:** Must acquire `activeSettlementLocks` on table settlement; must broadcast `table.updated` and `session.closed` via SSE.
- **Acceptance Tests:**
  - [ ] Table dragging works smoothly on both iPad touchscreens and desktop mouse pointers.
  - [ ] Table bill settlement locks table during transaction, records cash change, and turns table green (`AVAILABLE`) across all connected clients via SSE.
  - [ ] Overview quick action cards navigate immediately to target screens.

---

### Milestone 3: Industrial Touch KDS & Expeditor Pass
- **Objective:** Redesign the Kitchen Display System into an ultra-high-contrast execution instrument.
- **Scope:**
  - Refactor [`packages/ui/pages/kds.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/kds.ts) into full-screen flex view with station columns (`TANDOOR`, `CURRY`, `BAR`, `EXPO`).
  - Enlarge bump buttons to 54px hit targets with instant optimistic DOM strikethrough.
  - **Defect Fix `UX-DEF-006`:** Unlock Web Audio `AudioContext` on initial user interaction so audio alerts ring reliably in background tabs.
  - **Defect Fix `UX-DEF-008`:** Enforce toast notification max limit of 3 with auto-dismissal.
- **Dependencies:** Milestone 1.
- **Impacted Routes:** `/kds`.
- **API / State Constraints:** Bumping tasks must call `POST /api/restaurant/kds/bump` and advance order status.
- **Acceptance Tests:**
  - [ ] Tapping `[ BUMP COMPLETE ]` advances task to Expo column in under 100ms.
  - [ ] Audio alert plays when a new ticket is injected, even if browser tab is backgrounded.
  - [ ] Rapid bumps do not cause infinite toast stacking.

---

### Milestone 4: Catalog, Menu & CRM Management
- **Objective:** Redesign menu engineering, guest CRM, multi-branch management, and analytics reporting.
- **Scope:**
  - Redesign Menu Catalog (`/menu`), Active Guests (`/guests`), Locations (`/operations/locations`), Floors (`/operations/floors`), Reports (`/reports`), Staff (`/staff`), and Support (`/support`).
  - **Defect Fix `UX-DEF-003`:** Implement `window.isFormDirty` guard on menu forms to warn before navigating away from unsaved modifier changes.
  - **Defect Fix `UX-DEF-004`:** Synchronize support ticket filter pills with URL query parameters (`/support?status=...`).
- **Dependencies:** Milestone 1.
- **Impacted Routes:** `/menu`, `/guests`, `/operations/locations`, `/operations/floors`, `/reports`, `/staff`, `/support`.
- **Acceptance Tests:**
  - [ ] Unsaved changes warning modal appears if user edits dish price and clicks sidebar link.
  - [ ] Support filter selections persist across browser refresh.
  - [ ] Report revenue totals reconcile exactly with `store.data.bills` integer sums.

---

### Milestone 5: Six Atmospheric Customer Diner Themes
- **Objective:** Implement the six structurally distinct in-restaurant dining experiences in the Diner PWA.
- **Scope:**
  - Refactor [`packages/ui/pages/diner.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/diner.ts) to render independent layout architectures:
    1. *Atelier Étoile Noir (`tmpl_haute_gastronomy`):* 50/50 Asymmetric split with fixed left editorial canvas.
    2. *Fjord & Form Botanical (`tmpl_nordic_minimal`):* Centered archival journal with harvest coordinates.
    3. *Roastery 1984 Vitrine (`tmpl_artisan_coffee`):* Tactile counter vitrine with aroma dial and cup size pills.
    4. *Neon Yokocho (`tmpl_neon_street`):* High-energy night market with spice flame meters and receipt tray.
    5. *Osteria Rustica (`tmpl_trattoria_bella`):* Classical course-paced feasting with DOP seals.
    6. *Shokunin Ramen (`tmpl_tokyo_izakaya`):* Shoji screen grid with 4-step craft ramen order slip.
  - **Defect Fix `UX-DEF-005`:** Add downward swipe-to-dismiss gesture physics on `.sheet-content` modifier drawers.
- **Dependencies:** Milestone 1.
- **Impacted Routes:** `/dine/:locator`.
- **API / State Constraints:** Every order placement must verify SHA-256 pricing hash via `/api/restaurant/quote`.
- **Acceptance Tests:**
  - [ ] All six themes render structurally unique layouts, verified at 390px, 768px, and 1440px viewports.
  - [ ] Modifier drawer dismisses smoothly on downward swipe gesture on mobile touch screens.
  - [ ] Submitting orders dispatches tasks to KDS with correct station and course tagging.

---

### Milestone 6: Standalone Commerce Applications (CraveAtlas, SwiftBite, PantryRush)
- **Objective:** Redesign the three external customer storefronts into modern, high-conversion web apps.
- **Scope:**
  - Redesign CraveAtlas (`/apps/crave-atlas`): WAI-ARIA accessible signature carousel, branch switcher, and slide-in order folio.
  - Redesign SwiftBite (`/apps/swift-bite`): Past favorites 1-tap reorder rail, inline `[- 1 +]` card steppers, and 1-tap checkout.
  - Redesign PantryRush (`/apps/pantry-rush`): 4-column supermarket shelf grid, inventory stock limiters, and out-of-stock substitution preference modal.
- **Dependencies:** Milestone 1.
- **Impacted Routes:** `/apps/crave-atlas`, `/apps/swift-bite`, `/apps/pantry-rush`.
- **Acceptance Tests:**
  - [ ] PantryRush increments are strictly capped at `sku.stockQuantity`.
  - [ ] SwiftBite uncustomized dishes convert directly to steppers without opening bottom sheets.
  - [ ] CraveAtlas carousel responds to touch swipes on mobile and arrow keys on desktop.

---

### Milestone 7: Visual Brand Studio & Marketplace
- **Objective:** Complete the visual site builder and white-label management suite.
- **Scope:**
  - Redesign Visual Studio (`/studio`), Template Marketplace (`/marketplace`), Whitelabel (`/white-label`), and Developer Inspectors (`/developer/*`).
  - **Defect Fix `UX-DEF-007`:** Implement visible drop-target indicator guidelines (`.drag-over-above`, `.drag-over-below`) during Studio section reordering.
  - Polish the 3-device canvas viewport switcher (Mobile 390px / Tablet 768px / Desktop 1200px).
- **Dependencies:** Milestones 1 & 5.
- **Impacted Routes:** `/studio`, `/marketplace`, `/white-label`, `/developer/templates`, `/developer/inspector`, `/developer/diagnostics`.
- **Acceptance Tests:**
  - [ ] Reordering Studio sections displays insertion guideline and immediately updates live canvas preview.
  - [ ] Publishing a template bumps version and saves immutable revision record.

---

## 3. Mandatory Approval Gate & Open Decisions

Before implementing any source or CSS code changes, the following technical and design decisions are submitted for user review:

### Key Design Decisions Proposed
1. **Design System Partitioning:** Adopt the six specialized design systems (Operational, KDS, Studio, Diner Themes, Standalone Commerce, and Administrative) rather than forcing a single universal theme across the repository.
2. **Canonical Route Standard:** Standardize customer commerce apps on `/apps/crave-atlas`, `/apps/swift-bite`, and `/apps/pantry-rush`, adding automatic server redirects from root paths (`/crave-atlas`, `/swift-bite`, `/pantry-rush`).
3. **Event Naming Normalization:** Maintain both dot-notation (`order.created`) and upper-snake-case (`ORDER_CREATED`) in client listeners via an automated event normalizer.
4. **Touch Ergonomics First:** Prioritize touch event fixes on floor canvas dragging and KDS bump bars so tablets and touch displays function natively without requiring mouse peripherals.

### Documented Open Questions for User Approval
1. *Storefront Default Theme:* Should `tmpl_haute_gastronomy` (Atelier Étoile Noir) remain the default seeded theme for new restaurant tenants, or should `tmpl_artisan_coffee` (Roastery 1984) be the primary default for higher versatility?
2. *OrbitoX Control Plane Navigation:* Should the control plane integration bridge on the top right header link directly to `http://localhost:3005` or remain an internal contextual switcher?

---

## 4. Formal Approval Status

- **Proposed Implementation Sequence:** Milestones 1 through 7.
- **First Implementation Action:** Milestone 1 (Design Foundation, Tokens, and Shell Normalization).
- **Current Execution State:** **STOPPED & AWAITING USER APPROVAL.**
- **Source Code Changed:** ZERO lines modified. Ready for Phase 1 execution upon approval.
