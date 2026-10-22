# 🔍 RestaurantOS 2.x — Forensic Integration Audit

**Date:** 2026-10-09  
**Auditor:** OrbitoX Platform Engineering & Antigravity Agent  
**Subject:** External-OS RestaurantOS (`projects/external-os/restaurant-os`)  
**Scope:** Two-Plane Architecture, Data Authority, Context Hierarchy, Persistence, and Cross-Screen State Propagation  

---

## 1. Executive Summary

A deep forensic inspection was conducted on the RestaurantOS codebase across the runtime (`projects/external-os/restaurant-os`, port `4010`) and the control plane (`orbitox/apps/web`, port `3005`). 

While the user interfaces had received substantial visual and layout upgrades (Operations Command, Spatial Floor Studio, Toast-style KDS, and Luxury Diner PWA), the underlying runtime was operating with significant architectural disconnects:

1. **In-Memory Volatility & Destructive Overwrites**: Runtime state was stored exclusively in Node.js process variables (`branches`, `floors`, `floorTables`, `kitchenTasks`, etc.) without a persistent disk backing. When integration test scripts or users saved single-table payloads to `/api/restaurant/floor/save`, in-memory collections were destructively mutated, collapsing the visible floor from 28 tables down to 1 table.
2. **Silent Mock Fallbacks & Hardcoded Strings**: Several UI pages fell back silently to static mock fixtures when data was empty (e.g. `orders.ts` seeded mock orders `ord_101..ord_103`; `reports.ts` displayed hardcoded ₹84,200 revenue; `guests.ts` used ternary operators on string names for visit counts; and `floor.ts` rendered hardcoded HTML orders inside the table inspector tab).
3. **No Realtime Event Bus or Outbox**: Mutations executed on one surface (such as a Diner placing an order or a cook bumping a task) updated server memory, but there was no Server-Sent Events (SSE) or WebSocket gateway pushing domain events out to other open clients.
4. **Absence of Server-Side Context Hierarchy Validation**: Branch and floor query parameters (`?branch=...&floor=...`) were accepted without server authorization or validation verifying that a floor actually belongs to the specified branch, or that a table belongs to the floor.
5. **Partial CRUD APIs**: Key operational workflows (table capacity editing, seat creation/deletion, guest assignment, service request resolution, and session closing) lacked dedicated REST mutation contracts.

---

## 2. Two-Plane URL & Network Boundary Audit

| Port | Service | Role | Canonical Path | Audit Finding |
|---|---|---|---|---|
| **3005** | OrbitoX Platform | Authoritative Control Plane | `/admin/projects/*`, `/api/v1/projects/*` | **VALID**: Governs templates, plugins, API registries, licensing, and desired-state revisions. Legacy `/api/restaurant/*` routes exist solely as backward-compatibility proxies with deprecation headers (`X-Legacy-Proxy: true`). |
| **4010** | RestaurantOS Runtime | Independent Product Runtime Plane | `/`, `/operations/*`, `/kds`, `/dine/*`, `/api/restaurant/*` | **VALID**: Executes culinary operations, spatial floor management, kitchen display system, and diner mobile PWA. All operational traffic must terminate here. |

### Hardcoded URL Grep Analysis:
- `http://localhost:3005`: Referenced in `orbitox.project.json` (`controlPlaneUrl`), `src/bridge/control-bridge.ts`, `packages/config/index.ts`, and header navigation links pointing back to the Control Plane. No illegal runtime coupling detected.
- `http://localhost:4010`: Correctly defined as default runtime port across `server.ts`, `runtime/index.ts`, and project manifests.

---

## 3. Data Authority & State Classification Audit

| Screen / Entity | Purported Source | Actual Forensic Source | Classification | Vulnerability / Defect |
|---|---|---|---|---|
| **Branches** | Multi-branch registry | In-memory `branches` array | `LOCAL STATE (In-Memory)` | Lost on server restart; no persistence. |
| **Floors & Layouts** | Service area manager | In-memory `floors` array | `LOCAL STATE (In-Memory)` | Layout switching only mutated memory. |
| **Tables & Geometry** | Spatial Floor Studio | In-memory `floorTables` array | `LOCAL STATE (In-Memory)` | Single-table saves caused total fleet erasure. |
| **Table Inspector Orders** | Active Table Orders | Hardcoded HTML in `floor.ts` | `HARDCODED / MOCK` | Displayed fake Paneer & Dal orders regardless of table. |
| **Active Guests** | Seated guest registry | Filter on seats + Ternary checks | `PARTIAL MOCK` | Hardcoded `s.guestName?.includes('Nikhil') ? 12 : 2`. |
| **Orders Workspace** | Order state machine | In-memory + fallback array | `SILENT FALLBACK` | Fell back to 3 mock orders if empty. |
| **KDS Queue** | Preparation DAG tasks | In-memory `kitchenTasks` array | `LOCAL STATE (In-Memory)` | No SSE broadcast to other screens. |
| **Diner Live Stage** | Customer projection | Derived from task station | `LOCAL STATE (In-Memory)` | Diner had no live socket/SSE subscription. |
| **Service Requests** | Waiter attention center | In-memory `serviceRequests` array | `LOCAL STATE (In-Memory)` | No resolution mutation or staff assignment. |
| **Reports & Analytics** | Shift performance analytics | Hardcoded static HTML string | `HARDCODED` | Static ₹84,200 revenue, 84 covers, 11.4 min prep. |

---

## 4. Remediation Architecture & Target Invariants

To elevate RestaurantOS from an attractive prototype into a true operating system, the following architectural layers are being implemented:

1. **Persistent Atomic JSON Storage Engine (`packages/storage/store.ts`)**:
   - File-backed atomic persistence (`data/restaurant-runtime-store.json`) with rollback safety.
   - Preserves branches, floors, layouts, tables, seats, guests, sessions, orders, tasks, service requests, and domain events.
   - Safe in-place record mutations: updating table 14 updates *only* table 14 without erasing the floor.
2. **Event Bus & Outbox Realtime SSE Gateway (`packages/domain/event-bus.ts`)**:
   - Outbox log appended on every domain mutation.
   - Live Server-Sent Events stream at `GET /api/restaurant/events`.
   - UI clients (Operations, Floor, KDS, Diner) react dynamically to domain events.
3. **Canonical Hierarchy & Authorization Validation**:
   - `RestaurantRuntimeContext` validated server-side for every request (`restaurantId -> branchId -> floorId -> tableId -> sessionId -> guestId`).
4. **Complete Vertical Slice CRUD APIs**:
   - Dedicated REST contracts for table geometry, seats, guests, service requests, and KDS actions.
5. **Zero Silent Fallbacks**:
   - Eradicate `apiData ?? MOCK_DATA` patterns. Empty states render genuine empty state UIs.
6. **Live Developer Runtime Inspector (`/developer/inspector`)**:
   - Dedicated inspection panel displaying real-time DB status, context hierarchy, event logs, and mutation testing.

---

## 5. Verification Protocol

Acceptance requires passing a 26-step continuous vertical slice test covering branch CRUD, floor layout switching, table spatial manipulation, seat synchronization, guest transfer, multi-table merging, diner ordering, KDS item-level fulfillment, live SSE propagation, service request resolution, and session closing.
