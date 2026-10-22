# 🗄️ OrbitoX RestaurantOS: Database & Storage Plan (02)

> **Document:** `docs/implementation/02_DATABASE_PLAN.md`  
> **Status:** Production Architecture Baseline  

---

## 1. Schema Migration Strategy

The existing PostgreSQL schema (`orbitox/prisma/schema.prisma`) provides multi-tenant store and studio primitives. We are introducing the **Restaurant Domain Subsystem** without mutating or breaking existing e-commerce or celebration tables.

### 1.1 New Models to Add

```
1.  RestaurantLocation       ── Outlet entity with timezone, currency, operating hours
2.  RestaurantServiceArea    ── Dining area / floor / terrace within a location
3.  RestaurantTable          ── Physical furniture asset with seat count and occupancy
4.  RestaurantQRIdentity     ── Opaque high-entropy locator binding table to URL
5.  RestaurantDiningSession  ── Living session hosting active dining party and tab
6.  SessionParticipant       ── Seated diner (Anonymous, Identified, Staff-Assisted)
7.  SessionJoinRequest       ── Pending request to join an active dining session
8.  RestaurantMenu           ── Scheduled channel menu (Dine-in, Bar, Delivery)
9.  RestaurantCatalogItem    ── Culinary product definition (allergens, base cost, recipe)
10. RestaurantModifierGroup  ── Modifier selections (Spice, Dips, Sides)
11. RestaurantModifier       ── Discrete modifier choices with price deltas
12. RestaurantRecipeBOM      ── Versioned ingredient decomposition
13. RestaurantInventoryStock ── Ingredient on-hand and reserved balances
14. RestaurantPricingQuote   ── Server-validated, hash-locked price quote
15. RestaurantOrder          ── Order increment with 4 domain states
16. RestaurantOrderItem      ── Immutable dish order line item
17. KitchenStation           ── Physical prep station (Curry, Tandoor, Bar, Expo)
18. KitchenPreparationTask   ── Scheduled preparation task with DAG dependencies
19. RestaurantPaymentRecord  ── Tokenized transaction record
20. PlatformIdempotencyRecord── Durable PostgreSQL deduplication store
21. PlatformOutboxMessage    ── Transactional outbox event record
```

---

## 2. Composite Index Matrix

| Table | Composite Index Columns | Performance & Invariant Rationale |
|---|---|---|
| `RestaurantLocation` | `[tenantId, companyId]` | Fast tenant-scoped outlet filtering. |
| `RestaurantTable` | `[locationId, serviceAreaId]` | Fast floor map layout loading. |
| `RestaurantQRIdentity` | `[tokenHash]` (`UNIQUE`) | Sub-millisecond opaque locator resolution. |
| `RestaurantDiningSession` | `[tableId, status]` | Instant lookup of active session for a table. |
| `SessionParticipant` | `[sessionId, type]` | Fast group participant resolution. |
| `SessionJoinRequest` | `[diningSessionId, status]` | Fast polling/subscription for host approvals. |
| `RestaurantOrder` | `[sessionId, createdAt]` | Fast chronological round and order loading. |
| `RestaurantOrderItem` | `[orderId, status]` | Station filtering and void tracking. |
| `KitchenPreparationTask` | `[stationId, status, fireAt]` | **High-velocity KDS queue sorting by fire time.** |
| `PlatformIdempotencyRecord` | `[tenantId, key]` (`UNIQUE`) | Instant durable deduplication hit testing. |
| `PlatformOutboxMessage` | `[status, createdAt]` | Sequential polling index for BullMQ outbox workers. |

---

## 3. PostgreSQL Row-Level Security (RLS) Policies

All restaurant tables enforce PostgreSQL RLS policies to guarantee that even raw SQL queries or IDOR attempts cannot breach tenant or location boundaries:

```sql
ALTER TABLE restaurant_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_dining_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY restaurant_tenant_location_isolation ON restaurant_orders
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)
    AND location_id = current_setting('app.current_location_id', true)
  );
```
