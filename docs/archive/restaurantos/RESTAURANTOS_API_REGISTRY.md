# 📋 RestaurantOS 2.x — Authoritative API Registry

**Date:** 2026-10-09  
**Runtime Host:** `http://localhost:4010`  
**Control Plane Host:** `http://localhost:3005` (Governance / Revisions / Desired State)  

---

## 1. Core Runtime Domain REST APIs

| Method | Endpoint | Description | Request Body / Query | Response Structure |
|---|---|---|---|---|
| `GET` | `/api/restaurant/branches` | List all operational branches | `—` | `{ success: true, data: BranchRecord[] }` |
| `POST` | `/api/restaurant/branches` | Create or update branch record | `{ id?, name, code, city, ... }` | `{ success: true, data: BranchRecord }` |
| `GET` | `/api/restaurant/floors` | List floors (filtered by branch) | `?branchId=...` | `{ success: true, data: FloorRecord[] }` |
| `POST` | `/api/restaurant/floors` | Create, rename, or switch layout | `{ action: 'SWITCH_LAYOUT' \| 'RENAME' \| 'CREATE', ... }` | `{ success: true, floor: FloorRecord }` |
| `GET` | `/api/restaurant/floor` | Get spatial tables for active context | `?branchId=...&floorId=...` | `{ success: true, tables: TableFloorRecord[] }` |
| `POST` | `/api/restaurant/floor/save` | Persist table geometry (safe in-place) | `{ tables: TableFloorRecord[] }` | `{ success: true, message: string }` |
| `PATCH` | `/api/restaurant/tables/:id` | Update table capacity, server, status | `{ capacity?, status?, serverName? }` | `{ success: true, table: TableFloorRecord }` |
| `POST` | `/api/restaurant/tables/:id/seats` | Add new seat to table | `{ label? }` | `{ success: true, seat: SeatRecord }` |
| `DELETE` | `/api/restaurant/tables/:id/seats/:seatId`| Remove seat from table | `—` | `{ success: true, message: string }` |
| `POST` | `/api/restaurant/seats/:seatId/guest` | Assign or update seated guest | `{ name, preferences?, dietary? }` | `{ success: true, seat: SeatRecord, guest: GuestRecord }` |
| `POST` | `/api/restaurant/tables/merge` | Merge two tables into linked party | `{ tableId1, tableId2 }` | `{ success: true, message: string }` |
| `POST` | `/api/restaurant/tables/unmerge` | Split merged table back to individual | `{ tableId }` | `{ success: true, message: string }` |
| `GET` | `/api/restaurant/qr/:locator` | Zero-trust public table discovery | `—` | `{ success: true, data: { tableId, tableNumber, capacity, locator } }` |
| `GET` | `/api/restaurant/menu` | Public culinary menu catalog | `—` | `{ success: true, data: MenuItem[] }` |
| `POST` | `/api/restaurant/sessions/join` | Join dining session & get capability | `{ tableNumber, seatingType, guestName }` | `{ success: true, data: { sessionId, capabilityToken, tableNumber } }` |
| `POST` | `/api/restaurant/sessions/close` | Close table session & revoke tokens | `{ tableNumber, sessionId }` | `{ success: true, message: string }` |
| `POST` | `/api/restaurant/quote` | Deterministic pricing quote | `{ items: [{ id, quantity }] }` | `{ success: true, data: { quoteId, totalMinor, inputHash, resultHash } }` |
| `POST` | `/api/restaurant/orders` | Idempotent order submission | `{ tableNumber, sessionId, items }` | `{ success: true, data: { orderId, status, totalMinor } }` |
| `GET` | `/api/restaurant/kds` | Kitchen tasks stream / list | `?station=...` | `{ success: true, data: KitchenTask[] }` |
| `POST` | `/api/restaurant/kds/bump` | Transition kitchen task status | `{ taskId, newStatus? }` | `{ success: true, data: KitchenTask }` |
| `POST` | `/api/restaurant/kds/item-fulfill` | Fulfill single item in ticket | `{ taskId, itemIndex }` | `{ success: true, data: KitchenTask }` |
| `POST` | `/api/restaurant/kds/recall` | Recall recently bumped ticket | `{ taskId }` | `{ success: true, data: KitchenTask }` |
| `GET` | `/api/restaurant/service-requests` | List waiter service requests | `?branchId=...&status=...` | `{ success: true, data: ServiceRequest[] }` |
| `POST` | `/api/restaurant/service-requests` | Guest requests service | `{ tableNumber, type, note? }` | `{ success: true, data: ServiceRequest }` |
| `POST` | `/api/restaurant/service-requests/:id/resolve` | Staff resolves service request | `—` | `{ success: true, data: ServiceRequest }` |
| `GET` | `/api/restaurant/events` | **Server-Sent Events (SSE) Stream** | `—` | `event: ...\ndata: JSON\n\n` |
| `GET` | `/health` | Runtime health & control bridge sync | `—` | `{ status: 'HEALTHY', port: 4010, uptimeSeconds, ... }` |

---

## 2. Server-Sent Events (SSE) Gateway Specification

- **Endpoint**: `GET /api/restaurant/events`
- **Headers**:
  ```http
  Content-Type: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive
  ```
- **Heartbeat**: Every 15 seconds (`: ping\n\n`).
- **Client Auto-Reconnect**: Standard browser `EventSource` with automated retry on disconnect.
