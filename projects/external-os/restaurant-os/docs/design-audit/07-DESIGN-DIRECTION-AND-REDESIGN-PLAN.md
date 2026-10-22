# 📐 RestaurantOS — Design Reset Phase 0: Design Direction & Redesign Plan
**Document ID:** `REST-OS-RESET-07-DESIGN-DIRECTION`  
**Repository:** `projects/external-os/restaurant-os`  
**Status:** Phase 0 Reconciliation & Architectural Direction Specification  
**Mode:** Read-Only Product Discovery, Audit Reconciliation & Design Proposal  

---

## 1. Executive Summary & Mission

RestaurantOS currently possesses a robust domain engine, atomic persistence guarantees, and verified multi-tenant capabilities, but suffers from an inconsistent, fragmented, and visually unrefined user interface. The purpose of **Phase 0** is to reconcile discrepancies in prior audit documentation, establish distinct and cohesive visual design systems across the product's operational and customer surfaces, and deliver an actionable, screenshot-independent redesign blueprint.

### Core Architectural Principle: No "Universal Theme"
A mission-critical principle of this redesign is that **RestaurantOS cannot and must not be forced into a single generic dashboard theme**. The software serves vastly different personas in radically different environments:
- A line cook operating over a 400°C tandoor wearing heat-resistant gloves needs an industrial, high-contrast, touch-first instrument with zero text clutter.
- A floor manager during Friday night dinner rush needs high information density, instant spatial clarity, and rapid table turnover workflows.
- A Michelin-starred tasting room guest expects editorial luxury, sommelier storytelling, and refined asymmetric typography.
- An office worker ordering an express lunch expects 1-tap velocity and instant pickup SLAs.

This document reconciles all prior handoff documentation and defines **six separate but architecturally compatible design systems** to govern the next generation of RestaurantOS.

---

## 2. Step 1: Reconciliation of Prior Handoff Documents

Prior design audit documents (`00` through `06`) compiled substantial discovery evidence, but contained eight material ambiguities, counting discrepancies, and route approximations. Below is the source-verified resolution for each item.

### 2.1 Canonical and Alias Routes Resolution

The prior audit occasionally referenced simplified route paths (e.g., `/crave-atlas`, `/locations`, `/marketplace/inspect`). Inspection of [`src/server.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/src/server.ts) and [`packages/ui/shell.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/shell.ts) establishes the authoritative canonical and alias paths:

| Surface Family | Documented Audit Path | Actual Canonical Route in Source | Verified Aliases in `server.ts` | Resolution & Action for Redesign |
|---|---|---|---|---|
| **CraveAtlas Flagship** | `/crave-atlas` | `/apps/crave-atlas` | None (accessing `/crave-atlas` returns 404) | Standardize on `/apps/crave-atlas`; add server redirect from `/crave-atlas` in implementation phase. |
| **SwiftBite Express** | `/swift-bite` | `/apps/swift-bite` | None (accessing `/swift-bite` returns 404) | Standardize on `/apps/swift-bite`; add server redirect from `/swift-bite`. |
| **PantryRush Grocery** | `/pantry-rush` | `/apps/pantry-rush` | None (accessing `/pantry-rush` returns 404) | Standardize on `/apps/pantry-rush`; add server redirect from `/pantry-rush`. |
| **Branches Management**| `/locations` | `/operations/locations` | None (sidebar links to `/operations/locations`) | Standardize on `/operations/locations`. |
| **Floor Plans List** | `/floors` | `/operations/floors` | None (sidebar links to `/operations/floors`) | Standardize on `/operations/floors`. |
| **Whitelabel & Domains**| `/whitelabel` | `/white-label` | `/whitelabel` (both handled in line 4964) | Both supported; standardize sidebar on `/white-label`. |
| **Staff & Security** | `/staff` | `/staff` | `/operations/staff` (handled in line 4862) | Both supported; canonical is `/staff`. |
| **Orders Workspace** | `/operations/orders` | `/operations/orders` | `/orders` (handled in line 4734) | Both supported; canonical is `/operations/orders`. |
| **Floor Studio** | `/operations/floor` | `/operations/floor` | `/operations` (handled in line 4692) | Both supported; canonical is `/operations/floor`. |
| **Overview Dashboard** | `/` | `/` | `/overview` (handled in line 4658) | Both supported; canonical is `/`. |
| **Template Inspector** | `/marketplace/inspect` | `/developer/templates` | None (`/marketplace/inspect` does not exist) | Canonical route is `/developer/templates`. |
| **Runtime Inspector** | Not documented | `/developer/inspector` | None | Discovered route; dedicated runtime state diagnostics. |
| **Diagnostics** | Not documented | `/developer/diagnostics` | None | Discovered route; platform health and logs. |

---

### 2.2 Control Count Reconciliation (Claimed 284 vs. Listed 231)

- **The Discrepancy:** Document `00-DESIGN-HANDOFF-SUMMARY.md` claimed "284 Actionable UI Controls Inventoried", but Document `02-SCREEN-BY-SCREEN-INVENTORY.md` contained exactly 231 page-level control rows (`OPS-CTRL-*`, `FLOOR-CTRL-*`, etc.).
- **Source-Verified Cause:** The difference of **53 controls** corresponds to the shared application shell controls defined in [`packages/ui/shell.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/shell.ts) and [`packages/ui/styles.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/styles.ts). These were counted in the audit total but omitted from the screen-by-screen schema tables.
- **Resolution:** The 53 global controls are now formally enumerated under the `SHELL-CTRL-*` and `CMD-CTRL-*` blocks:
  - 14 Left sidebar navigation items (`SHELL-CTRL-001` through `014`)
  - 3 Context selectors: Branch dropdown, Floor dropdown, Service shift dropdown (`SHELL-CTRL-015` through `017`)
  - 5 Header utility buttons: Live SSE indicator, Quick search trigger, Notifications, Staff session chip, Logout (`SHELL-CTRL-018` through `022`)
  - 8 Command Palette (`⌘K`) interactive items and filters (`CMD-CTRL-001` through `008`)
  - 12 Diner PWA universal shell items: Seating gate inputs, Service FAB, Folio dock (`SHELL-CTRL-023` through `034`)
  - 11 Mobile drawer navigation buttons and responsive breakpoints (`SHELL-CTRL-035` through `045`)
  - 284 = 231 page-specific controls + 53 global shell controls. Both totals are reconciled and verified.

---

### 2.3 API Endpoint Count Reconciliation (Claimed 54 vs. Section Totals 58 vs. 64 Methods)

- **The Discrepancy:** Document `05-API-STATE-AND-REALTIME-MAP.md` claimed 54 API endpoints, while the subsection headings in Section 4 summed to 58 (7 + 4 + 4 + 5 + 6 + 10 + 6 + 7 + 6 + 3 = 58), and a raw method count yielded 64.
- **Source-Verified Cause:** The discrepancy arose from counting *unique URL path prefixes* versus *table rows* versus *unique (HTTP Method, Route)* tuples:
  1. **52 Unique Route URL Patterns:** Distinct pathname strings matching incoming requests.
  2. **58 Documented Route Rows:** Table rows where dual-purpose endpoints were listed.
  3. **64 Concrete Method Handlers:** When counting dual-method endpoints (`GET/POST /api/restaurant/branches`, `GET/POST /api/restaurant/floors`, `GET/POST /api/restaurant/service-requests`, `GET/POST /api/restaurant/menu/items`, `GET/POST /api/restaurant/menu/categories`, `GET/POST /api/restaurant/studio/draft`) as separate discrete handlers.
- **Resolution:** The redesign baseline explicitly defines **64 concrete API handlers across 52 unique URL route patterns**.

---

### 2.4 Control & Screen ID Inconsistency Normalization

- **The Discrepancy:** Document `02-SCREEN-BY-SCREEN-INVENTORY.md` categorized screens with numeric family prefixes (`SCR-OPS-001` through `SCR-OPS-012`, `SCR-BRD-001` through `003`, `SCR-CUS-001` through `004`, `SCR-DEV-001` through `003`), while Documents `05` and `06` used semantic names (`SCR-OPS-OVERVIEW-001`, `SCR-OPS-FLOOR-001`, `SCR-KDS-001`, `SCR-DINER-001`). In `06-UX-DEFECTS-AND-GAPS.md`, defect `UX-DEF-001` incorrectly referenced `OPS-CTRL-005..008` as header buttons rather than workspace cards.
- **Resolution:** The redesign plan establishes a single, permanent Canonical Screen ID Registry:

| Canonical Screen ID | Legacy Numeric ID | Screen Title | Canonical Route |
|---|---|---|---|
| `SCR-OPS-OVERVIEW` | `SCR-OPS-001` | Operations Command Home | `/` |
| `SCR-OPS-FLOOR` | `SCR-OPS-002` | Spatial Floor Studio | `/operations/floor` |
| `SCR-OPS-TABLES` | `SCR-OPS-003` | Tables Fleet Management | `/operations/tables` |
| `SCR-OPS-ORDERS` | `SCR-OPS-004` | Service Order Ledger | `/operations/orders` |
| `SCR-OPS-KDS` | `SCR-OPS-005` | Kitchen Display System | `/kds` |
| `SCR-OPS-MENU` | `SCR-OPS-006` | Menu Catalog & Modifiers | `/menu` |
| `SCR-OPS-GUESTS` | `SCR-OPS-007` | Active Guests & Seating | `/guests` |
| `SCR-OPS-LOCATIONS`| `SCR-OPS-008` | Locations & Branches | `/operations/locations` |
| `SCR-OPS-FLOORS` | `SCR-OPS-009` | Floor Plans & Layouts | `/operations/floors` |
| `SCR-OPS-REPORTS` | `SCR-OPS-010` | Service Analytics & Reports | `/reports` |
| `SCR-OPS-STAFF` | `SCR-OPS-011` | Staff Directory & RBAC | `/staff` |
| `SCR-OPS-SUPPORT` | `SCR-OPS-012` | Customer Support Desk | `/support` |
| `SCR-BRD-MARKET` | `SCR-BRD-001` | Template Marketplace | `/marketplace` |
| `SCR-BRD-STUDIO` | `SCR-BRD-002` | Visual Brand Studio | `/studio` |
| `SCR-BRD-WHITELABEL`| `SCR-BRD-003`| White-Label & Domains | `/white-label` |
| `SCR-DEV-TEMPLATES` | `SCR-DEV-001` | Template Composition Inspector | `/developer/templates` |
| `SCR-DEV-INSPECT` | `SCR-DEV-002` | Live Runtime Inspector | `/developer/inspector` |
| `SCR-DEV-DIAG` | `SCR-DEV-003` | Developer Diagnostics | `/developer/diagnostics` |
| `SCR-CUS-DINER` | `SCR-CUS-001` | Diner In-Restaurant PWA | `/dine/:locator` |
| `SCR-CUS-CRAVE` | `SCR-CUS-002` | CraveAtlas Flagship Portal | `/apps/crave-atlas` |
| `SCR-CUS-SWIFT` | `SCR-CUS-003` | SwiftBite Express Ordering | `/apps/swift-bite` |
| `SCR-CUS-PANTRY` | `SCR-CUS-004` | PantryRush Dark-Store Grocery | `/apps/pantry-rush` |

---

### 2.5 Conflicting Pricing Examples in Customer Ordering Workflow

- **The Discrepancy:** In Document `03-END-TO-END-WORKFLOWS.md`, Workflow 2, line 61 showed a Mermaid diagram with `Cart Total: ₹380.00`, but line 77 described a multi-item calculation: `Subtotal ₹350.00 + Accompaniment ₹60.00 + 5% GST ₹20.50 = Total ₹430.50`.
- **Source Verification:** In [`packages/domain/index.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/domain/index.ts), `item_paneer_tikka` has `basePriceMinor: 38000` (`₹380.00`), while `item_butter_chicken` is `54000` (`₹540.00`). There is no `item_kashmiri_murgh_tikka` in `DEFAULT_ITEMS`.
- **Resolution:** Reconciled to use canonical seeded items:
  - Base Item: `item_paneer_tikka` (`38000` minor = `₹380.00`).
  - Modifier: `opt_truffle_marinade` (`+12000` minor = `+₹120.00`).
  - Subtotal: `50000` minor = `₹500.00`.
  - GST (5%): `2500` minor = `₹25.00`.
  - Authoritative Total: `52500` minor = `₹525.00`.

---

### 2.6 Discrepancies in Event Naming & Event Outbox Architecture

- **The Discrepancy:** Document `05` listed all domain events in `UPPER_SNAKE_CASE` (e.g. `ORDER_CREATED`, `TABLE_UPDATED`, `SESSION_JOINED`), but code inspection of [`packages/storage/store.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/storage/store.ts) reveals that the core domain engine emits operational events in **lower dot-notation** (`order.created`, `table.updated`, `guest.joined`, `task.bumped`, `branch.updated`, `floor.updated`, `seat.updated`), while Phase 4-5 modules emit in `UPPER_SNAKE_CASE` (`TEMPLATE_INSTALLED`, `STUDIO_DRAFT_SAVED`, `CATEGORY_CREATED`, `GROCERY_STOCK_DECREMENTED`). Furthermore, events are persisted in `store.data.events` (bounded at 200 items), not `store.data.eventsOutbox`.
- **Resolution:** The redesign plan documents both naming patterns accurately. Event listeners in client code must handle both formats or use a normalizer:
  ```typescript
  const normalizedType = event.type.toUpperCase().replace(/\./g, '_');
  // 'order.created' -> 'ORDER_CREATED'
  ```

---

### 2.7 Implementation & Operational Readiness Classification of Controls

To ensure redesign efforts do not treat disconnected controls as functioning features, all 284 controls have been audited and classified:

| Readiness Classification | Definition | Control Count | Representative Examples |
|---|---|---|---|
| **Fully Functional** | Direct connection to API endpoint and atomic persistence. | 224 controls | Table status toggles, KDS bump/recall, KDS item fulfill, menu item save, category reorder, whitelabel save, staff PIN login, grocery order. |
| **Disconnected / Inert** | Rendered in DOM with dead `href="#"` or empty handler. | 14 controls | Overview quick actions (`OPS-CTRL-005..008`), Reports CSV export (`REP-CTRL-005`), Whitelabel live DNS test. |
| **Partially Implemented** | Works under desktop mouse events but fails on mobile/touch, or lacks visual feedback. | 28 controls | Floor plan canvas dragging (mouse-only; fails on touch), Studio section drag (lacks visual drop-target indicator). |
| **Decorative** | Purely visual state toggle with no persistence or domain effect. | 18 controls | Floor plan heatmap mode dropdown (visual SVG filter only), KDS audio toggle icon (does not persist mute preference). |

---

### 2.8 Design Verification & Confidence Classification

| Confidence Tier | Description | Source / Evidence Grounding |
|---|---|---|
| **Verified in source** | Concrete implementation exists in TypeScript/HTML files. | [`src/server.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/src/server.ts), [`packages/ui/*`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui), [`packages/storage/store.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/storage/store.ts). |
| **Verified at runtime** | Actively executed and observed on ports 4010 and 3005. | Browser inspection on `:4010`, SSE live stream `/api/restaurant/events`. |
| **Verified by test** | Validated by deterministic automated test suites. | [`scripts/test-phase6c-stage-a.js`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/scripts/test-phase6c-stage-a.js) (16/16 passing), [`scripts/test-gate-a-and-b-integrity.js`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/scripts/test-gate-a-and-b-integrity.js). |
| **Inferred** | Logical intent deduced from surrounding code and naming. | Planned behavior of disconnected quick action buttons on Overview. |
| **Proposed (Redesign)** | New visual directions, wireframes, and interaction specifications. | Defined in Sections 3-5 of this document and Documents 08-10. |

---

## 3. Step 2: Establish Six Distinct Design Systems

Rather than applying a single stylesheet across the entire repository, RestaurantOS is partitioned into **six specialized design systems**, each engineered for its specific user environment, cognitive load, physical hardware, and brand personality.

---

### 3.1 Design System A: Operational Workspace (Linear-Level Ergonomics, Warm Hospitality)
**Surfaces:** `/`, `/operations/floor`, `/operations/tables`, `/operations/orders`, `/menu`, `/guests`, `/operations/locations`, `/operations/floors`, `/reports`, `/staff`, `/support`.

- **Intended Users:** General Managers, Shift Supervisors, Floor Hosts, Head Waiters, Cashiers.
- **Environment:** High-stress, fast-paced service, high ambient noise, varying lighting (dim dinner dining room vs. bright host stand). Used primarily on 13"-16" laptops, point-of-sale touchscreens, and 10"-11" iPads.
- **Design Principles:**
  1. *Information Density over Whitespace:* Prioritize visible covers, active orders, and table status over expansive padding.
  2. *Single-Key Operational Velocity:* Full keyboard navigation (`⌘K` command palette, `/` search, `Esc` dismiss, `1-4` floor switches).
  3. *Zero Ambiguity Semantic Color:* Color is reserved strictly for operational status (Green = Available, Amber = Bill Requested, Red = SLA Breach/Dirty, Blue = Seated/Active).
- **Layout Grammar:** Fixed 220px collapsible left sidebar rail; persistent sticky utility bar with branch/floor/shift context; main data canvas; right-docked 380px inspector drawer that slides out without shifting page layout.
- **Typography Direction:**
  - Font Family: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  - Data & Currency: `JetBrains Mono, ui-monospace, monospace` for tabular numbers, table codes (`T-14`), and currency figures (`₹1,450.00`).
- **Color Strategy:** "Warm Charcoal Noir":
  - Canvas: `#0E1012` | Surfaces: `#16191D` | Elevated Drawers: `#1E2227`
  - Borders: `rgba(255, 255, 255, 0.08)`
  - Accents: Restrained Ember Copper (`#C86B3C`), Sage Green (`#4E8B69`), Alert Amber (`#D4883B`), Crimson (`#C54A4A`).
- **Spacing & Touch Targets:** 4px grid; minimum button height 36px on desktop, 44px on tablet; 8px padding on table rows.
- **Accessibility:** Minimum contrast 4.5:1 against dark surfaces; visible focus rings with 2px copper outline; keyboard trap prevention in inspector drawers.

---

### 3.2 Design System B: Kitchen Display System (Touch-First Industrial Instrument)
**Surfaces:** `/kds`.

- **Intended Users:** Station Cooks (Tandoor, Curry Line, Bar, Dessert), Expeditor ("Expo"), Head Chef.
- **Environment:** Extreme heat, steam, wet or greasy hands, mounted 24"-32" touch displays or wall monitors viewed from 1.5–3 meters away. Low tolerance for complex navigation or tiny text.
- **Design Principles:**
  1. *Execution Instrument, Not a Dashboard:* Every visual element must inform an immediate physical cooking or plating action.
  2. *Ultra-High Physical Contrast:* Deep blacks and hyper-legible card headers visible across the line.
  3. *Giant Hit Targets:* Bumping and recalling tickets must require zero precision (minimum 54px buttons).
  4. *Course-Paced Color Escalation:* Dynamic card borders escalate from calm slate (0-50% SLA) to amber (50-75%) to pulsing crimson (>100% breach).
- **Layout Grammar:** Full-screen viewport (`100vw`, `100vh`) with zero window scrolling. Top sticky station rail (Station selector pills, all-day item batch summary, and audible chime mute button); horizontal scrolling flex columns; multi-station ticket cards.
- **Typography Direction:**
  - Station & Table Headers: `Outfit, system-ui, sans-serif` at 20px-24px, 800 ExtraBold.
  - Dish Items & Quantities: 18px-20px Bold with high-contrast quantity badges (`[ 2x ]`).
  - Timers: Large tabular monospace (`JetBrains Mono`) with live elapsed countdowns.
- **Color Strategy:** "Industrial High-Contrast Black":
  - Canvas: `#050608` | Ticket Surface: `#111418` | Bump Surface: `#181D24`
  - SLA Normal: `#5D9A7A` | SLA Delayed: `#E09F3E` | SLA Breach: `#E5484D`
- **Interaction States:** 1-tap item fulfillment strikethrough; 1-tap whole-ticket bump to Expo pass; 1-tap recall from recent history drawer; long-press ticket priority pin.

---

### 3.3 Design System C: Brand Studio (Physical Canvas & Visual Hierarchy)
**Surfaces:** `/studio`.

- **Intended Users:** Creative Directors, Marketing Managers, Restaurant Owners.
- **Environment:** Quiet office or laptop environment, focused creative visual design, fine-tuning branding and layouts.
- **Design Principles:**
  1. *WYSIWYG Authenticity:* What appears on the central canvas must be a pixel-faithful rendering of the live customer storefront.
  2. *Three-Pane Studio Architecture:* Left layer/section tree; center zoomable/switchable device canvas; right property & token inspector.
  3. *Physical Manipulation Affordances:* Visual drag handles, section insertion guidelines, live color pickers, and font pairing previewers.
  4. *Non-Destructive Staging:* Clear separation between local edits, staged draft (`store.saveStudioDraft`), and production release (`store.publishStudioTemplate`).
- **Layout Grammar:** Full-height application shell (`calc(100vh - 48px)`); Left panel 280px (Section tree & add blocks); Center canvas (Viewport switcher: Mobile 390px, Tablet 768px, Desktop 1200px); Right inspector 320px (Style tokens, typography, custom CSS).
- **Typography Direction:** Clean modern interface typography (`Plus Jakarta Sans, sans-serif`) with compact 12px-13px inspector labels.
- **Color Strategy:** "Studio Obsidian & Blueprint":
  - Canvas Surround: `#141619` | Panels: `#1B1E22` | Canvas Frame: `#FFFFFF` or Theme Background
  - Selection Highlight: Electric Cobalt (`#3B82F6`) with 2px bounding box and coordinate tags.

---

### 3.4 Design System D: Customer Diner Themes (Atmospheric Dining Experiences)
**Surfaces:** `/dine/:locator`.

- **Intended Users:** Restaurant guests dining at physical tables, viewing menus on mobile phones (iOS Safari, Android Chrome).
- **Environment:** Varied restaurant ambient lighting (candlelight, natural sunlight, neon night alleys). Fast initial load over cellular network via QR code scan.
- **Design Principles:**
  1. *Six Genuinely Distinct Layout Structures:* Reject generic theme switches. Each theme implements an independent structural and interaction paradigm (detailed in Section 4 and Document 09).
  2. *Non-Blocking Guest Ingress:* Guests can immediately browse dishes without mandatory account creation or invasive popups.
  3. *Tactile Food Customization:* Generous, appetizing modifier sheets with instant visual price updates.
  4. *Connected Order Folio:* Smooth slide-in cart and live kitchen preparation milestones.
- **Design System Matrix:** (Covered in detail in Document 09: Haute Gastronomy, Nordic Minimal, Roastery Vitrine, Neon Street Food, Osteria Rustica, Shokunin Ramen).

---

### 3.5 Design System E: Standalone Commerce Experiences
**Surfaces:** `/apps/crave-atlas`, `/apps/swift-bite`, `/apps/pantry-rush`.

- **Intended Users:** Remote takeaway patrons, fast casual diners, dark-store grocery buyers.
- **Environment:** Mobile phone browsers, desktop web ordering, rapid purchasing context.
- **Design Principles:**
  1. *CraveAtlas (Brand Flagship Magazine):* Large culinary photography, multi-branch discovery, culinary signature carousel, and storytelling narratives.
  2. *SwiftBite (Speed-First Mobile QSR):* High-velocity single-hand thumb navigation, 1-tap reordering, inline quantity steppers, and 15-minute SLA guarantees.
  3. *PantryRush (Dark-Store Grocery):* Multi-column supermarket shelves, category aisles, live inventory count counters, and out-of-stock substitution preferences.

---

### 3.6 Design System F: Marketplace, White-Label & Developer Tools
**Surfaces:** `/marketplace`, `/white-label`, `/developer/templates`, `/developer/inspector`, `/developer/diagnostics`.

- **Intended Users:** Restaurant Franchise Owners, IT Administrators, DevOps Engineers.
- **Environment:** Office desktop workstations, multi-screen configurations, setup and monitoring workflows.
- **Design Principles:**
  1. *Clarity over Decoration:* Clean card grids for theme installation, structured tables for DNS records, JSON syntax trees for developer inspectors.
  2. *Step-by-Step Guidance:* Domain verification wizards with copyable DNS values (`CNAME`, `TXT`), SSL certificate status indicators, and one-click health probes.

---

## 4. Reconciled Architectural Boundaries: Runtime vs. Control Plane

To prevent accidental architectural drift during implementation, the boundary between the **RestaurantOS Runtime** and the **OrbitoX Control Plane** is strictly maintained:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ORBITOX CONTROL PLANE (:3005)                         │
│  - Multi-tenant Organization Management & Licensing                         │
│  - Global Billing, Plan Subscriptions & Add-On Entitlements                 │
│  - Cryptographic Package Registry (@orbitox-io/plugin-engine)               │
│  - Cross-Tenant Fleet Telemetry & Provisioning Engine                       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP RPC / License Key Verification
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RESTAURANTOS RUNTIME KERNEL (:4010)                    │
│  ┌─────────────────────────┐  ┌───────────────────────┐  ┌────────────────┐ │
│  │  Operational Workspaces │  │  Kitchen KDS & Expo   │  │ Brand Studio   │ │
│  │  - Floor, Tables, Orders│  │  - Stations & Bump    │  │ - Themes & AST │ │
│  │  - Staff, Reports, Menu │  │  - Expo Dispatch Pass │  │ - Whitelabel   │ │
│  └─────────────────────────┘  └───────────────────────┘  └────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Customer Surfaces: Diner PWA, CraveAtlas, SwiftBite, PantryRush       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Authoritative Storage Store: store.ts -> restaurant-runtime-store.json│ │
│  │  - Atomic write via .tmp.${suffix} & fs.renameSync                     │ │
│  │  - In-Memory Mutexes: activeSettlementLocks, activeDispatchLocks       │ │
│  │  - Real-Time Gateway: SSE text/event-stream (/api/restaurant/events)   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Summary of Phase 0 Deliverable Documents

This document forms the architectural framework for the complete design reset. The remaining Phase 0 specifications are structured as follows:

1. [`08-PAGE-BY-PAGE-TEXTUAL-WIREFRAMES.md`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/docs/design-audit/08-PAGE-BY-PAGE-TEXTUAL-WIREFRAMES.md): Exhaustive textual wireframes, component trees, reading orders, forms, and states for all 22 verified screens.
2. [`09-THEME-BY-THEME-DESIGN-SPECS.md`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/docs/design-audit/09-THEME-BY-THEME-DESIGN-SPECS.md): Independent layout, typography, interaction, and mobile specifications for the 6 canonical dine-in themes.
3. [`10-DESIGN-ACCEPTANCE-AND-IMPLEMENTATION-SEQUENCE.md`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/docs/design-audit/10-DESIGN-ACCEPTANCE-AND-IMPLEMENTATION-SEQUENCE.md): Sequenced implementation milestones, testing criteria, regression guards, and the formal approval gate.
