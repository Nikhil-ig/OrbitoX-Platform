# 🗺️ RestaurantOS 2.x — Canonical Domain Map

**Date:** 2026-10-09  
**Architecture:** Hierarchical Zero-Trust Multi-Branch Domain Model  

---

## 1. Domain Entity Hierarchy

```
Organization (OrbitoX Bistro Group)
  │
  ▼
Restaurant (OrbitoX Bistro)
  │
  ├── Branch [Ludhiana Main | Chandigarh Sector 17 | Delhi Connaught Place]
  │     │
  │     ├── Service Areas / Floors [Main Courtyard | Bar Lounge | Private Dining | Rooftop Terrace]
  │     │     │
  │     │     ├── Service Layouts [Dinner Layout | Lunch Rush | Private Event]
  │     │     │
  │     │     └── Dining Tables [T-01 .. T-16, B-01, B-02, P-01, R-01, R-02]
  │     │           │
  │     │           ├── Physical Geometry [x, y, width, height, rotation, shape]
  │     │           ├── Seats [S1, S2, S3, S4, ...]
  │     │           │     └── Seated Guest [GuestRecord: displayName, role, preferences, dietary]
  │     │           │
  │     │           ├── QR Locator [7Kp9xQ8m2L (Rotatable)]
  │     │           │
  │     │           └── Dining Session [DiningSession: sessionId, host, participants, activeTab]
  │     │                 │
  │     │                 ├── Guest Capabilities [Cryptographic Ephemeral Tokens]
  │     │                 ├── Orders [Commercial, Fulfillment, Payment, Kitchen States]
  │     │                 │     ├── Order Items [menuItemId, quantity, seatId, modifiers]
  │     │                 │     └── Preparation Tasks [DAG Tasks routed to Kitchen Stations]
  │     │                 │
  │     │                 ├── Service Requests [WATER | CUTLERY | NAPKINS | SERVER | BILL]
  │     │                 │
  │     │                 └── Table Bill & Check Splits [by guest, equal split, full table]
  │     │
  │     └── Kitchen Stations [TANDOOR | CURRY_LINE | BAR | EXPO | DESSERT]
  │           ├── Kitchen Tasks Queue
  │           ├── Fire Queue (DAG timing: targetServeAt - prepDuration)
  │           ├── All Day Production Aggregations (Items & Raw Ingredients)
  │           └── Expo Assembly Pass
  │
  └── Central Culinary Catalog
        ├── Categories [Starters | Mains | Breads | Beverages | Desserts]
        ├── Menu Items [Pricing, Modifiers, Station Routing, Allergens, Dietary Flags]
        └── Menu Intelligence Engine [Audit flags for descriptions, photos, margins]
```

---

## 2. Canonical Runtime Context Model

Every request, query, and command evaluates against a validated `RestaurantRuntimeContext`:

```typescript
export interface RestaurantRuntimeContext {
  restaurantId: string;
  restaurantName: string;
  branchId: string;
  branchName: string;
  floorId: string;
  floorName: string;
  serviceId: 'LUNCH' | 'DINNER' | 'LATE_NIGHT';
  serviceName: string;
  layoutId?: string;
  environment: 'local' | 'development' | 'staging' | 'production';
  userId?: string;
  role: 'OWNER' | 'MANAGER' | 'FLOOR_MANAGER' | 'SERVER' | 'CHEF' | 'EXPO' | 'CASHIER' | 'GUEST';
}
```

### Server Validation Invariants:
1. `branchId` must resolve to an active `BranchRecord`.
2. `floorId` must belong to the resolved `branchId`. If invalid or omitted, defaults to the branch's primary floor.
3. `tableId` must belong to the resolved `floorId` and `branchId`.
4. `sessionId` must match the table's `activeSessionId`.
5. `guestId` must belong to the active `sessionId`.
6. Unauthenticated requests (e.g. diner QR scan) can only read public table discovery and menu without leaking session IDs or participant names.

---

## 3. Order & Task State Machine

```
              ┌─────────────── Commercial State ───────────────┐
              │                                                │
[CART] ──► [QUOTE] ──► [CONFIRMED] ──────────► [SERVED] ──► [PAID]
                           │                      ▲
                           ▼                      │
              ┌────── Kitchen / Task State ──────┐│
              │                                  ││
              │  [QUEUED]                        ││
              │     │                            ││
              │     ▼ (Chef start)               ││
              │  [IN_PROGRESS] (Cooking)         ││
              │     │                            ││
              │     ▼ (Item ready)               ││
              │  [READY]                         ││
              │     │                            ││
              │     ▼ (Expo dispatch)            ││
              │  [BUMPED] ───────────────────────┘│
              │                                   │
              └───────────────────────────────────┘
```
