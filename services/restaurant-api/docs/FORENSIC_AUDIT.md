# 🔍 RestaurantOS 2.0 — Forensic Integration Audit
## Deep Architectural Forensics, Data Authority Map & Failure Inventory

**Date:** October 9, 2026  
**Auditor:** Antigravity AI — Senior Principal Systems & Security Engineer  
**Codebase:** OrbitoX Monorepo (`OrbitoX Platform`)  
**Target Runtime:** `projects/external-os/restaurant-os` (Port 4010)  
**Control Plane:** `orbitox/apps/web` (Port 3005)  
**Standard:** Zero Assumptions · Forensic Evidence · Source-Code Ground Truth  

---

## 1. Monorepo & Workspace Architecture Forensics

A complete structural audit of the monorepo was conducted. The workspace is organized as follows:

```
OrbitoX Platform/
├── apps/
│   ├── web/                     # OrbitoX Platform Control Plane (Port 3005)
│   └── ...
├── packages/
│   ├── core/                    # OrbitoX Kernel & Facades
│   ├── plugin-engine/           # Cryptographic Plugin Runtime
│   └── crm/                     # Enterprise CRM Module
├── projects/
│   └── external-os/
│       └── restaurant-os/       # Independent RestaurantOS Product Runtime (Port 4010)
│           ├── apps/
│           ├── data/            # Atomic file-backed store (restaurant-runtime-store.json)
│           ├── packages/
│           │   ├── config/      # Project manifest & control plane integration
│           │   ├── domain/      # Core entities, state machines, recommendations, event-bus
│           │   ├── integrations/# Webhook & edge connectors
│           │   ├── runtime/     # Control bridge client & desired-state manager
│           │   ├── storage/     # Persistent atomic storage engine & outbox log
│           │   └── ui/          # Server-rendered HTML/SVG workspaces & design system
│           ├── prisma/          # Schema definitions
│           └── src/
│               ├── bridge/      # Control Plane sync & HMAC-signed handshake
│               └── server.ts    # Authoritative runtime server on port 4010
└── scripts/                     # Master integration and vertical slice verification suites
```

### Monorepo Boundaries & Ports:
- **Port 3005 (`OrbitoX Platform Control Plane`)**: Governs organizational templates, project registration, plugin configurations, central API catalogs, licensing entitlements, and desired-state revisions.
- **Port 4010 (`RestaurantOS Runtime Plane`)**: Authoritative hospitality runtime engine executing culinary operations, spatial floor management, kitchen display system, mobile diner PWA, and realtime SSE gateway.

---

## 2. Two-Plane Network & URL Boundary Audit

A recursive search for `3005`, `4010`, and `/api/restaurant` was executed across the codebase to ensure operational and control traffic are properly segregated.

| Network Boundary | Host | Target Role | Classification | Forensic Finding |
|---|---|---|---|---|
| **Control Bridge Handshake** | `http://localhost:3005` | Control Plane Sync | **VALID** | `projects/external-os/restaurant-os/packages/runtime/index.ts` syncs signed desired-state config via `/api/v1/projects/:id/bridge`. |
| **Legacy Platform Proxy** | `http://localhost:3005` | Backward Compatibility | **DEPRECATED** | Routes under `apps/web/app/api/restaurant/*` proxy to port 4010 or serve legacy endpoints with `X-Legacy-Proxy: true`. |
| **Runtime Operational APIs** | `http://localhost:4010` | Daily Operations | **VALID & PRIMARY** | All diner orders, quotes, floor mutations, KDS bumps, and SSE streams terminate directly on port 4010. |
| **Control-to-Runtime Commands** | `3005 -> 4010` | Desired State Apply | **VALID** | Platform issues signed commands (e.g. `rotate_qr_locator`) applied by the runtime controller. |

**Audit Verdict:** No illegal operational coupling exists. Operational restaurant traffic does not pass through the Control Plane.

---

## 3. Data Authority & Classification Audit

Every screen and entity was evaluated to discover its actual runtime source of truth:

| Product Surface / Entity | Purported Source | Actual Forensic Source | Classification | Vulnerability / Defect Discovered |
|---|---|---|---|---|
| **Floor Tables & Coordinates** | Spatial Floor Studio | Previously in-memory array | `LOCAL STATE` (Remedied) | Single-table saves collapsed entire fleet from 28 to 1 table. |
| **Table Inspector Orders** | Active Table Orders | Previously hardcoded HTML | `HARDCODED / MOCK` (Remedied) | Displayed static Paneer & Dal regardless of table. |
| **Orders Workspace** | Commerce Lifecycle | Fallback mock array `[ord_101..103]` | `SILENT FALLBACK` (Remedied) | Fell back to mock orders when live list was empty. |
| **Reports & Shift Analytics** | Operational Analytics | Static hardcoded HTML strings | `HARDCODED` (Remedied) | Displayed hardcoded ₹84,200 revenue & 84 covers. |
| **Active Seated Guests** | Hospitality Registry | String ternary checks on names | `PARTIAL MOCK` (Remedied) | Derived visit counts via `name.includes('Nikhil') ? 12 : 2`. |
| **Attention Queue Actions** | Operations Desk | Simulated `alert()` dialog | `DISCONNECTED` (Remedied) | Acknowledge button showed alert without API call. |
| **Kitchen KDS Item Check** | Station Queue | Local CSS class toggle | `UI-ONLY` (Remedied) | Checkbox toggled visually without persisting to backend. |
| **Diner Course Progression** | Customer Journey | Hardcoded progress calculation | `LOCAL DERIVATION` (Remedied) | Fixed 65% cooking stage without SSE event synchronization. |
| **Realtime Updates** | Realtime Gateway | In-memory event array | `NO BROADCAST` (Remedied) | Mutations occurred in memory without SSE push to open windows. |

---

## 4. Master Failure Inventory (P0 to P3)

### Priority P0 — Critical Systemic Defects
- **DEF-01: The "1 TABLES" Fleet Collapse (Root Cause Confirmed)**:
  - *Location*: [`src/server.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/src/server.ts) at `/api/restaurant/floor/save`.
  - *Root Cause*: The route executed `floorTables = body.tables`. When Step 8 of integration tests sent a single-table payload (`[{ id: 14, ... }]`), all other 27 tables were permanently deleted from memory.
  - *Correction*: Implemented safe in-place mutations in `RestaurantRuntimeStore.saveFloorTables()`: single-table payloads update *only* that record; multi-table payloads scope strictly to the target floor and branch.
- **DEF-02: Volatile In-Memory Storage**:
  - *Location*: Server runtime global variables.
  - *Root Cause*: Process restarts or crashes wiped all dining sessions, active bills, table assignments, and kitchen queues.
  - *Correction*: Implemented persistent atomic file-backed JSON database (`packages/storage/store.ts`) saving to `data/restaurant-runtime-store.json`.

### Priority P1 — Core Workflow & Integration Failures
- **DEF-03: Silent Mock Fallbacks in Orders & Reports**:
  - *Location*: `packages/ui/pages/orders.ts` and `reports.ts`.
  - *Root Cause*: Code contained `displayOrders = orders.length > 0 ? orders : MOCK_ORDERS` and hardcoded static figures.
  - *Correction*: Completely eradicated mock arrays. Orders renders live data or a clean empty-state UI; Reports computes gross revenue, covers, average ticket, and station throughput dynamically from the store.
- **DEF-04: Disconnected Kitchen Item Checklist**:
  - *Location*: `packages/ui/pages/kds.ts` (`toggleItemFulfill`).
  - *Root Cause*: Clicking the `✓` item button toggled CSS classes on the DOM without sending a network mutation.
  - *Correction*: Updated `toggleItemFulfill` to invoke `fulfillItem(taskId)` via `POST /api/restaurant/kds/item-fulfill`, which updates the task, marks it `READY` if all items are fulfilled, and emits `task.item_fulfilled`.
- **DEF-05: Missing Cross-Screen Realtime Push**:
  - *Location*: Multi-window state propagation.
  - *Root Cause*: Changes made by a Diner or Cook did not notify open Operations or Floor Studio windows.
  - *Correction*: Integrated `RealtimeEventBus` streaming Server-Sent Events (SSE) at `GET /api/restaurant/events` with automatic client reconnection and heartbeat keep-alive.

### Priority P2 — Operational Ergonomics & Canvas Manipulation
- **DEF-06: Non-Actionable Table Inspector Capacity & Seats**:
  - *Location*: `packages/ui/pages/floor.ts`.
  - *Root Cause*: Table capacity on the Overview tab was static text without an edit button. Adding or removing seats mutated local arrays without calling dedicated REST endpoints.
  - *Correction*: Added `[Edit ✎]` button calling `PATCH /api/restaurant/tables/:id` with automatic seat array synchronization; converted seat addition and deletion to call `POST/DELETE /api/restaurant/tables/:id/seats`.
- **DEF-07: Unchecked Service Request Acknowledgment**:
  - *Location*: `packages/ui/pages/overview.ts`.
  - *Root Cause*: Acknowledge button executed `alert('Service request acknowledged!')`.
  - *Correction*: Wired to `POST /api/restaurant/service-requests/:id/resolve`, clearing the item and broadcasting `service_request.resolved`.

### Priority P3 — Diagnostic Visibility & Intelligence
- **DEF-08: Absence of Runtime State Graph Inspector**:
  - *Location*: Developer tooling.
  - *Root Cause*: Operators had no way to verify whether a visible change was backed by the database or just local React/DOM state.
  - *Correction*: Implemented Developer Runtime Inspector (`/developer/inspector`) featuring the ASCII Interaction Debugger panel and live multi-surface mutation triggers.

---

## 5. Architectural Remediation Roadmap

The remediation proceeded through the following strict engineering phases:
1. **Phase 1: Storage Layer** — Build atomic, persistent JSON store with rollback safety.
2. **Phase 2: Event Outbox** — Implement monotonically sequenced domain outbox and SSE gateway.
3. **Phase 3: Context Enforcement** — Server-validated context hierarchy (`Branch -> Floor -> Table -> Session -> Guest`).
4. **Phase 4: Vertical Slice CRUD** — Dedicated REST endpoints for Table, Seat, Guest, KDS, and Service Request mutations.
5. **Phase 5: Silent Fallback Eradication** — Strip all mock fixtures and hardcoded HTML from UI templates.
6. **Phase 6: Multi-Screen Realtime Synchronization** — Wire SSE listeners into Floor, KDS, Operations, and Diner PWA.
7. **Phase 7: Diagnostic Tooling & Automated Verification** — Deploy Developer Inspector and run 26-step automated vertical slice proof.
