# ⚡ RestaurantOS 2.x — Realtime Domain Event Map

**Date:** 2026-10-09  
**Pattern:** Outbox Log + Server-Sent Events (SSE) Broadcast  

---

## 1. Domain Event Schema

Every domain event adheres to a strict canonical payload structure:

```typescript
export interface DomainEvent<T = any> {
  id: string;               // UUID / sequence identifier
  sequence: number;         // Monotonically increasing sequence number
  type: string;             // Canonical event type (e.g. 'order.created')
  timestamp: string;        // ISO 8601 UTC timestamp
  producer: string;         // Emitting component (e.g. 'domain:order-service')
  branchId: string;         // Scoped branch
  floorId?: string;         // Scoped floor / service area
  tableNumber?: string;     // Scoped table
  payload: T;               // Strongly typed payload
}
```

---

## 2. Event Registry & Consumers

| Event Type | Producer | Emitted When | Primary Consumers & Impact |
|---|---|---|---|
| `table.updated` | TableService | Capacity, status, or server changed | **Floor Studio** updates node; **Tables Fleet** updates row. |
| `table.status_changed` | TableService | Table transitions between Available/Occupied/Bill | **Operations Command** updates covers; **Floor** changes color. |
| `table.merged` | TableService | Two tables linked into shared party | **Floor Studio** links nodes; **Operations** aggregates tabs. |
| `table.unmerged` | TableService | Merged tables split | **Floor Studio** unlinks nodes. |
| `seat.updated` | SeatService | Seat added, removed, or assigned | **Floor Inspector** updates radial seat ring; **Guests** updates count. |
| `guest.joined` | SessionService | Diner scans QR and joins party | **Guests Workspace** adds guest; **Floor** shows seated guest. |
| `order.created` | OrderService | Diner submits confirmed order | **KDS** receives new ticket; **Operations** updates gross revenue; **Diner** shows order confirmed. |
| `task.started` | KitchenService | Cook presses Start on ticket/item | **Diner PWA** transitions to `COOKING` (simmering / tandoor); **KDS** turns warm. |
| `task.ready` | KitchenService | Dish finishes cooking | **Expo Board** receives item; **Diner PWA** shows ready; **Operations** logs timeline. |
| `task.bumped` | KitchenService | Expo sends complete order to table | **Floor** transitions table to `SERVED`; **Diner** shows served. |
| `service_request.created` | ServiceRequestService| Guest taps "Need something?" | **Operations Attention Queue** receives badge with sound; **Floor** shows alert. |
| `service_request.resolved`| ServiceRequestService| Waiter resolves request | **Operations** removes from queue; **Diner PWA** shows confirmation banner. |
| `bill.requested` | SessionService | Diner taps "Request Bill" | **Operations Attention Queue** flags high-priority bill request; **Floor** turns amber. |
| `session.closed` | SessionService | Bill paid & table cleared | **Floor** marks table `AVAILABLE`; **Diner PWA** revokes session capability. |

---

## 3. Realtime Delivery Architecture

```
[ Domain Mutation ] ──► [ Persistent Outbox Append ] ──► [ Event Bus Pub/Sub ]
                                                                   │
                                                                   ▼
                                                       [ SSE Gateway: /api/restaurant/events ]
                                                                   │
                         ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                         ▼                                         ▼                                         ▼
                 Operations Command                         Kitchen KDS                             Diner Mobile PWA
                 (Mini-map, Queue, Timeline)            (Tickets, All-Day, Expo)                 (Course Progress, Requests)
```
