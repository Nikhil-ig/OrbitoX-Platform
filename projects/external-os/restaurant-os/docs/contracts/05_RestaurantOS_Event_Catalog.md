# 📜 RestaurantOS Event Catalog Specification (05)

> **Contract Reference:** `05_RestaurantOS_Event_Catalog.md`  
> **Status:** Production Architecture Baseline (v2.1 Hardened)  
> **Package Target:** `@orbitox-io/event-bus`, `@orbitox-io/restaurant-order`

---

## 1. Universal Domain Event Envelope

Every event produced across OrbitoX RestaurantOS adheres to a standardized, schema-versioned envelope. Ordering is guaranteed by monotonic per-aggregate sequence numbers.

```typescript
export interface DomainEventEnvelope<T = Record<string, unknown>> {
  readonly eventId: string;            // UUIDv7 (time-ordered)
  readonly sequenceNumber: bigint;     // Monotonically increasing counter per aggregate
  readonly aggregateId: string;        // ID of the mutated aggregate root
  readonly aggregateType: string;      // "Order" | "DiningSession" | "InventoryBalance"
  readonly aggregateVersion: number;   // Version of the aggregate following this event
  readonly eventType: string;          // e.g., "OrderConfirmed"
  readonly schemaVersion: number;      // e.g., 1 or 2
  readonly causationId: string;        // Command ID or preceding Event ID that triggered this
  readonly correlationId: string;      // Trace identifier across distributed components
  readonly origin: 'CLOUD' | 'EDGE';   // Authoritative source node
  readonly actor: {
    readonly actorType: 'GUEST' | 'CAPTAIN' | 'CHEF' | 'CASHIER' | 'MANAGER' | 'SYSTEM' | 'AI_AGENT';
    readonly actorId: string;
    readonly tenantId: string;
    readonly locationId: string;
    readonly deviceId?: string;
  };
  readonly occurredAt: string;         // ISO-8601 UTC
  readonly payload: T;                 // Strongly typed payload
}
```

---

## 2. Core Domain Event Definitions

### 2.1 Order Lifecycle Events

| Event Type | Schema Version | Payload Summary |
|---|---|---|
| `OrderCreated` | `1` | `{ sessionId, orderNumber, roundNumber, source, fulfillmentType }` |
| `OrderSubmitted` | `1` | `{ quoteId, inputHash, resultHash, totalMinor, lineItemsCount }` |
| `OrderConfirmed` | `2` | `{ businessSnapshotJson, confirmedAt, preparationPlanId }` |
| `OrderItemVoided` | `1` | `{ orderItemId, reasonCode, employeeId, stockDisposed }` |
| `OrderCancelled` | `1` | `{ reasonCode, cancelledBy, refundRequired }` |
| `OrderCompleted` | `1` | `{ completedAt, finalDurationMinutes }` |

#### Payload Schema: `OrderConfirmed` (v2)
```json
{
  "orderId": "ord_9f8231",
  "sessionId": "sess_81023",
  "confirmedAt": "2026-10-07T14:32:01.000Z",
  "quoteId": "quote_4412",
  "businessSnapshot": {
    "catalogVersion": "cat_v14",
    "menuVersion": "menu_dinner_v8",
    "priceVersion": "prc_2026_q4",
    "taxVersion": "tax_gst_in_v2",
    "recipeVersions": {
      "prod_butter_chicken": "rec_bc_v3",
      "prod_garlic_naan": "rec_gn_v1"
    }
  },
  "lineItems": [
    {
      "orderItemId": "item_01",
      "productId": "prod_butter_chicken",
      "quantity": 1,
      "unitPriceMinor": 42000,
      "recipeVersionId": "rec_bc_v3"
    }
  ]
}
```

---

### 2.2 Kitchen & Production Events

| Event Type | Schema Version | Payload Summary |
|---|---|---|
| `KitchenTicketDispatched` | `1` | `{ ticketId, stationId, fireAt, itemsCount }` |
| `PreparationTaskStarted` | `1` | `{ taskId, stationId, employeeId, startedAt }` |
| `PreparationTaskCompleted` | `1` | `{ taskId, stationId, completedAt, actualDurationMin }` |
| `OrderExpoReady` | `1` | `{ orderId, expoStationId, readyAt }` |
| `OrderServed` | `1` | `{ orderId, tableId, runnerId, servedAt }` |

---

### 2.3 Inventory Reservation Events

| Event Type | Schema Version | Payload Summary |
|---|---|---|
| `StockReserved` | `1` | `{ reservationId, locationId, ingredientId, quantityGrams, orderId }` |
| `StockConsumed` | `1` | `{ reservationId, ingredientId, consumedGrams, ticketId }` |
| `StockReleased` | `1` | `{ reservationId, ingredientId, releasedGrams, reason }` |
| `StockWasted` | `1` | `{ locationId, ingredientId, wastedGrams, reasonCode, actorId }` |

---

## 3. Schema Evolution & Replay Guarantees

1. **Additive Evolution:** New fields added to event payloads must be optional (`?`). Consumers must tolerate unknown fields.
2. **Schema Version Bumping:** If an existing property's semantic meaning or format changes (e.g., currency represented in floating string changing to `amountMinor: bigint`), the `schemaVersion` must increment to `2`, and consumers must register multi-version handlers:
   ```typescript
   export class OrderConfirmedConsumer {
     handleV1(event: DomainEventEnvelope<OrderConfirmedV1Payload>) { /* ... */ }
     handleV2(event: DomainEventEnvelope<OrderConfirmedV2Payload>) { /* ... */ }
   }
   ```
3. **Determinism in Event Replay:** When replaying the event stream to reconstruct aggregate state or populate read-model projections, events are applied strictly in order of ascending `sequenceNumber`.
