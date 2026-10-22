# ⚡ Deliverable F: Data, API, and Real-Time Behavior Map
**RestaurantOS UI/UX Reverse-Engineering & Design Handoff**
**Document ID:** `REST-OS-AUDIT-05-API-STATE-AND-REALTIME-MAP`
**Status:** Complete Specification `[Verified in source]` & `[Verified at runtime]`

---

## 1. Architecture of Data, State & Synchronization

### 1.1 Multi-Layer Architecture
RestaurantOS utilizes a three-tier state architecture:
1. **Frontend Local & Client State:**
   - In-memory JavaScript runtime state inside dynamically rendered server-driven HTML/JS templates.
   - Client-side cart staging in `window.cart = []` or `localStorage.getItem('cart')`.
   - EventSource client listening on `/api/restaurant/events` with automatic reconnection and cursor replay tracking.
2. **Server Kernel & Business Logic Layer:**
   - Pure Node.js HTTP server kernel (`src/server.ts`, 5146 lines) running on `http://localhost:4010`.
   - In-memory concurrency locks: `activeSettlementLocks` (`Set<number>`), `activeDispatchLocks` (`Set<string>`), and `idempotencyRecords` (`Map<string, { payloadHash: string, response: any }>`).
   - Server-side quotation verification: SHA-256 pricing hash verification (`/api/restaurant/quote`) preventing client tamper on menu prices.
3. **Authoritative Persistence Engine:**
   - `packages/storage/store.ts` (`RestaurantRuntimeStore`).
   - Single source of persistent truth in `data/restaurant-runtime-store.json`.
   - Atomic commit mechanism: `flushSync()` writes serialized JSON to `<path>.tmp.<pid>.<timestamp>` and executes a synchronous atomic filesystem rename (`fs.renameSync`).

---

## 2. Server-Sent Events (SSE) Real-Time Gateway

### 2.1 Subscription Endpoint: `GET /api/restaurant/events`
- **Headers:** `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- **Query / Header Options:**
  - `?cursor=<integer>` or `Last-Event-ID: <integer>` or `headers['last-event-id']`.
- **Initial Connection Payload:**
  - Sends immediate ping: `event: connected\ndata: {"status":"connected","cursor":N}\n\n`.
  - Replays all missed events from `data.eventsOutbox` where `event.sequence > cursor`.

### 2.2 Event Stream Cursor State Inspection: `GET /api/restaurant/events/cursor`
- Returns current outbox sequence: `{"cursor": 42, "totalEvents": 42}`.

### 2.3 Comprehensive Real-Time Domain Events Catalog
All events emitted via `store.appendEvent(type, source, branchId, payload)`:

| Event Type | Source Component | Scoping | Trigger Condition | Consuming Clients |
|---|---|---|---|---|
| `STAFF_TOKEN_ISSUED` | `auth-engine` | `*` | Staff successfully authenticates with valid PIN. | Staff management, Audit |
| `STAFF_TOKEN_REVOKED`| `auth-engine` | `*` | Session token manually revoked or staff logged out. | Staff management, POS terminals |
| `STAFF_LOCKOUT_RESET`| `auth-engine` | `*` | Manager clears 5-attempt PIN lockout. | Staff management screen |
| `SESSION_JOINED` | `guest-session-engine` | Branch | Diner enters party name / joins table session. | Floor plan, Active table list |
| `SESSION_CLOSED` | `guest-session-engine` | Branch | Table bill settled and table reset. | Floor plan, Diner PWA tracking |
| `TABLE_BILL_SETTLED` | `billing-engine` | Branch | Cash, Card, or UPI settlement completed. | Floor plan, Reports, Orders |
| `TABLE_UPDATED` | `floor-engine` | Branch | Table capacity, status, or position changed. | Floor plan visual canvas |
| `TABLE_MERGED` | `table-layout-engine` | Branch | Two or more tables combined into merged session. | Floor plan, Orders |
| `TABLE_UNMERGED` | `table-layout-engine` | Branch | Merged table separated back into individual units.| Floor plan |
| `TABLE_DELETED` | `floor-engine` | Branch | Table permanently removed from layout. | Floor plan, Table list |
| `ORDER_CREATED` | `ordering-engine` | Branch | Diner or staff places validated order. | Floor plan, KDS, Orders |
| `ORDER_STATUS_CHANGED`| `order-lifecycle` | Branch | Order transitions (CONFIRMED, PREPPING, DELIVERED).| Orders list, Diner tracking |
| `ORDER_CANCELLED` | `order-lifecycle` | Branch | Order voided/cancelled by manager. | Orders list, KDS, Floor plan |
| `KDS_TASK_BUMPED` | `kds-engine` | Station | Station cook bumps task to READY. | KDS screens, Expo station |
| `KDS_ITEM_FULFILLED` | `kds-engine` | Station | Individual item count incremented on ticket. | KDS ticket cards |
| `KDS_TASK_RECALLED` | `kds-engine` | Station | Cook moves bumped item back to IN_PROGRESS. | KDS station |
| `KDS_TASK_DISPATCHED`| `expo-engine` | Station | Expo clears fully assembled order to runner. | KDS, Order tracking |
| `KDS_TASK_EXPO_RECALLED`| `expo-engine` | Station | Expo brings dispatched ticket back to pass. | Expo screen |
| `FLOOR_LAYOUT_SAVED` | `floor-engine` | Branch | Multi-table coordinates saved on canvas. | Floor plan, Table list |
| `SERVICE_REQUEST_CREATED`| `service-engine` | Branch | Guest taps "Call Waiter", "Water", "Bill". | Floor plan badge, Staff header |
| `SERVICE_REQUEST_RESOLVED`| `service-engine` | Branch | Staff marks service alert resolved. | Floor plan badge, Staff header |
| `TEMPLATE_INSTALLED` | `marketplace-engine` | `*` | New storefront template activated. | Diner PWA, Studio |
| `STUDIO_DRAFT_SAVED` | `studio-engine` | `*` | Layout section reordered or tokens updated. | Studio canvas preview |
| `STUDIO_PUBLISHED` | `studio-engine` | `*` | Draft changes published to live production. | All customer storefronts |
| `BRANDING_UPDATED` | `branding-engine` | `*` | Primary/accent colors or restaurant name changed.| App shell, Whitelabel, Storefronts |
| `BRANCH_OVERRIDE_SAVED`| `branding-engine` | Branch | Branch-specific logo or colors overridden. | Branch customer storefront |
| `MENU_ITEM_CREATED` | `menu-engine` | `*` | New dish added to catalog. | Menu editor, Storefronts |
| `MENU_ITEM_UPDATED` | `menu-engine` | `*` | Price, station, modifier group edited. | Menu editor, Storefronts |
| `MENU_ITEM_DELETED` | `menu-engine` | `*` | Item soft-deleted / archived. | Menu editor, Storefronts |
| `GROCERY_STOCK_DECREMENTED`| `quick-commerce` | Branch | PantryRush order decrements inventory stock. | PantryRush shelf cards |

---

## 3. Concurrency, Mutexes & Idempotency Controls

### 3.1 Idempotency Key Engine (`x-idempotency-key`)
- **Applies to:** `POST /api/restaurant/orders` and `POST /api/commerce/grocery/orders`.
- **Implementation:**
  - Header: `x-idempotency-key` or `Idempotency-Key` (UUIDv4).
  - Memory Cache: `idempotencyRecords` (`Map<string, { payloadHash: string, response: any }>`).
  - Validation: If key exists and `payloadHash === sha256(body)`, returns cached `200/201` response immediately. If payload hash differs, returns `409 Conflict` ("A request was already processed with this idempotency key using different contents.").

### 3.2 Authoritative Settlement Lock Mutex (`activeSettlementLocks`)
- **Applies to:** `POST /api/restaurant/tables/:id/settle` and `POST /api/restaurant/tables/settle`.
- **Implementation:**
  - Mutex Set: `activeSettlementLocks.has(tableNumber)`.
  - Prevents race conditions where two servers simultaneously execute bill settlement for the same table.
  - Returns `409 Conflict` (`{ error: 'Table settlement is already in progress by another staff member.' }`) if locked.
  - Released in `finally` block after atomic persistence.

### 3.3 Expo Dispatch Lock Mutex (`activeDispatchLocks`)
- **Applies to:** `POST /api/restaurant/kds/expo-dispatch`.
- **Implementation:**
  - Mutex Set: `activeDispatchLocks.has(taskId)`.
  - Prevents double-dispatching food runner tickets.
  - Returns `409 Conflict` if locked.

---

## 4. Complete Catalog of All 54 API Endpoints & Mutations

Below is the authoritative catalog of all discovered backend endpoints in [`src/server.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/src/server.ts), including HTTP methods, roles, payloads, and persistence methods.

### 4.1 Authentication & Staff Management (7 Endpoints)
| Endpoint | Method | Role | Request Payload | Response Shape | Store / Persistence Method |
|---|---|---|---|---|---|
| `/api/restaurant/auth/staff-token` | POST | Anonymous | `{ pin: string, branchId?: string }` | `{ success: boolean, token: string, staff: StaffMember }` | In-memory session store + audit event |
| `/api/restaurant/auth/revoke` | POST | Authenticated | `{ token: string }` | `{ success: boolean }` | Session token revoked |
| `/api/restaurant/staff` | GET | SERVER+ | Query: `?branchId=...` | `{ success: boolean, staff: StaffMember[] }` | `store.getStaff(branchId)` |
| `/api/restaurant/staff` | POST | MANAGER | `{ name, email, phone, role, pin, branchId, stationScopes }` | `{ success: boolean, staff: StaffMember }` | `store.createStaff()` -> `flushSync()` |
| `/api/restaurant/staff/:id` | PATCH | MANAGER | `{ name?, role?, pin?, branchId?, stationScopes? }` | `{ success: boolean, staff: StaffMember }` | `store.updateStaff()` -> `flushSync()` |
| `/api/restaurant/staff/:id/revoke` | POST | MANAGER | `{}` | `{ success: boolean }` | `store.revokeStaffTokens()` -> `flushSync()` |
| `/api/restaurant/staff/reset-lockout` | POST | MANAGER | `{ staffId: string }` | `{ success: boolean }` | `store.resetStaffLockout()` -> `flushSync()` |

### 4.2 System Health & Event Streaming (4 Endpoints)
| Endpoint | Method | Role | Request Payload | Response Shape | Store / Persistence Method |
|---|---|---|---|---|---|
| `/healthz/live` | GET | Anonymous | None | `{"status":"ok"}` | Process liveness |
| `/healthz/ready` | GET | Anonymous | None | `{"status":"ready","database":"healthy"}` | Store readiness check |
| `/api/restaurant/events` | GET | Anonymous | Query: `?cursor=N` | SSE text/event-stream | Event outbox replay |
| `/api/restaurant/events/cursor` | GET | Anonymous | None | `{"cursor": N, "totalEvents": M}` | In-memory sequence counter |

### 4.3 Guest Dining & Table Sessions (4 Endpoints)
| Endpoint | Method | Role | Request Payload | Response Shape | Store / Persistence Method |
|---|---|---|---|---|---|
| `/api/restaurant/qr/:locator` | GET | Anonymous | URL Param | `{ success: boolean, table: TableFloorRecord, branch: BranchRecord }` | `store.getTableByLocator()` |
| `/api/restaurant/sessions/join` | POST | Anonymous | `{ tableNumber, partyName, coverCount, guestMood }` | `{ success: boolean, session: GuestSession }` | `store.joinTableSession()` -> `flushSync()` |
| `/api/restaurant/sessions/close` | POST | SERVER+ | `{ tableNumber: number }` | `{ success: boolean }` | `store.closeTableSession()` -> `flushSync()` |
| `/api/restaurant/quote` | POST | Anonymous | `{ items: [{ itemId, quantity, selectedModifiers }] }` | `{ quoteHash: string, subtotalMinor: number, taxMinor: number, totalMinor: number }` | SHA-256 pricing calculation |

### 4.4 Orders & POS Operations (5 Endpoints)
| Endpoint | Method | Role | Request Payload | Response Shape | Store / Persistence Method |
|---|---|---|---|---|---|
| `/api/restaurant/orders` | POST | Anonymous | `{ tableNumber, items, branchId, quoteHash, idempotencyKey }` | `{ success: boolean, order: RestaurantOrder, tasksCreated: number }` | `store.createOrder()` -> `flushSync()` |
| `/api/restaurant/orders` | GET | SERVER+ | Query: `?branchId=...&status=...` | `{ success: boolean, orders: RestaurantOrder[] }` | `store.getOrders()` |
| `/api/restaurant/orders/:id` | GET | Anonymous | URL Param | `{ success: boolean, order: RestaurantOrder }` | `store.getOrderById()` |
| `/api/restaurant/orders/:id/status`| PATCH | SERVER+ | `{ status: 'CONFIRMED'|'PREPPING'|'READY'|'DELIVERED' }` | `{ success: boolean, order: RestaurantOrder }` | `store.updateOrderStatus()` -> `flushSync()` |
| `/api/restaurant/orders/:id/cancel`| POST | MANAGER | `{ reason: string }` | `{ success: boolean, order: RestaurantOrder }` | `store.cancelOrder()` -> `flushSync()` |

### 4.5 Kitchen Display System & Expo (6 Endpoints)
| Endpoint | Method | Role | Request Payload | Response Shape | Store / Persistence Method |
|---|---|---|---|---|---|
| `/api/restaurant/kds` | GET | SERVER+ | Query: `?station=...&branchId=...` | `{ success: boolean, tasks: KitchenTask[] }` | `store.getKitchenTasks()` |
| `/api/restaurant/kds/bump` | POST | SERVER+ | `{ taskId: string }` | `{ success: boolean, task: KitchenTask }` | `store.bumpKitchenTask()` -> `flushSync()` |
| `/api/restaurant/kds/item-fulfill` | POST | SERVER+ | `{ taskId: string, itemIndex: number }` | `{ success: boolean, task: KitchenTask }` | `store.fulfillTaskItem()` -> `flushSync()` |
| `/api/restaurant/kds/recall` | POST | SERVER+ | `{ taskId: string }` | `{ success: boolean, task: KitchenTask }` | `store.recallKitchenTask()` -> `flushSync()` |
| `/api/restaurant/kds/expo-dispatch`| POST | SERVER+ | `{ taskId: string }` | `{ success: boolean, task: KitchenTask }` | `store.dispatchExpoTask()` -> `flushSync()` |
| `/api/restaurant/kds/expo-recall` | POST | SERVER+ | `{ taskId: string }` | `{ success: boolean, task: KitchenTask }` | `store.recallExpoTask()` -> `flushSync()` |

### 4.6 Table Management & Floor Layout (10 Endpoints)
| Endpoint | Method | Role | Request Payload | Response Shape | Store / Persistence Method |
|---|---|---|---|---|---|
| `/api/restaurant/floor` | GET | SERVER+ | Query: `?branchId=...` | `{ success: boolean, tables: TableFloorRecord[] }` | `store.getTables()` |
| `/api/restaurant/floor/save` | POST | MANAGER | `{ branchId: string, tables: TableFloorRecord[] }` | `{ success: boolean, updatedCount: number }` | `store.saveFloorLayout()` -> `flushSync()` |
| `/api/restaurant/tables/:id/bill` | GET | SERVER+ | URL Param | `{ subtotalMinor, gstMinor, totalMinor, orders: [] }` | `store.calculateTableBill()` |
| `/api/restaurant/tables/:id/settle`| POST | SERVER+ | `{ paymentMethod: 'CASH'|'CARD'|'UPI', tipMinor?: number }` | `{ success: boolean, billSummary: BillRecord }` | `store.settleTableBill()` -> `flushSync()` |
| `/api/restaurant/tables/:id` | PATCH | SERVER+ | `{ status?, shape?, capacity?, x?, y?, width?, height? }`| `{ success: boolean, table: TableFloorRecord }` | `store.updateTable()` -> `flushSync()` |
| `/api/restaurant/tables/:id/seats` | POST | SERVER+ | `{ seatNumber: string }` | `{ success: boolean, table: TableFloorRecord }` | `store.addSeatToTable()` -> `flushSync()` |
| `/api/restaurant/tables/:id` | DELETE | MANAGER | URL Param | `{ success: boolean }` | `store.deleteTable()` -> `flushSync()` |
| `/api/restaurant/tables/:id/rotate-locator` | POST | MANAGER | URL Param | `{ success: boolean, newLocator: string }` | `store.rotateTableLocator()` -> `flushSync()` |
| `/api/restaurant/tables/merge` | POST | SERVER+ | `{ primaryTableNumber: number, secondaryTableNumbers: number[] }` | `{ success: boolean, mergedTable: TableFloorRecord }` | `store.mergeTables()` -> `flushSync()` |
| `/api/restaurant/tables/unmerge` | POST | SERVER+ | `{ mergedTableNumber: number }` | `{ success: boolean }` | `store.unmergeTables()` -> `flushSync()` |

### 4.7 Branches, Floors & Service Requests (6 Endpoints)
| Endpoint | Method | Role | Request Payload | Response Shape | Store / Persistence Method |
|---|---|---|---|---|---|
| `/api/restaurant/branches` | GET/POST| MANAGER | `{ name, code, address, city, phone, openingHours }` | `{ success: boolean, branch: BranchRecord }` | `store.createBranch()` -> `flushSync()` |
| `/api/restaurant/branches/:id` | DELETE | ADMIN | URL Param | `{ success: boolean }` | `store.deleteBranch()` -> `flushSync()` |
| `/api/restaurant/floors` | GET/POST| MANAGER | `{ branchId, name, type, capacity }` | `{ success: boolean, floor: FloorRecord }` | `store.createFloor()` -> `flushSync()` |
| `/api/restaurant/floors/:id` | DELETE | ADMIN | URL Param | `{ success: boolean }` | `store.deleteFloor()` -> `flushSync()` |
| `/api/restaurant/service-requests` | GET/POST| Anonymous/Staff | `{ tableNumber: number, requestType: 'WAITER'|'WATER'|'BILL' }` | `{ success: boolean, request: ServiceRequest }` | `store.createServiceRequest()` -> `flushSync()` |
| `/api/restaurant/service-requests/:id/resolve` | POST | SERVER+ | URL Param | `{ success: boolean }` | `store.resolveServiceRequest()` -> `flushSync()` |

### 4.8 Menu & Category Management (7 Endpoints)
| Endpoint | Method | Role | Request Payload | Response Shape | Store / Persistence Method |
|---|---|---|---|---|---|
| `/api/restaurant/menu/items` | GET/POST| Anonymous/Manager | `{ name, basePriceMinor, categoryId, station, modifierGroups }` | `{ success: boolean, item: MenuItem }` | `store.createMenuItem()` -> `flushSync()` |
| `/api/restaurant/menu/items/:id` | PATCH | MANAGER | `{ name?, basePriceMinor?, description?, isArchived? }` | `{ success: boolean, item: MenuItem }` | `store.updateMenuItem()` -> `flushSync()` |
| `/api/restaurant/menu/items/:id` | DELETE | MANAGER | URL Param | `{ success: boolean }` | `store.deleteMenuItem()` -> `flushSync()` |
| `/api/restaurant/menu/categories` | GET/POST| Anonymous/Manager | `{ name, displayOrder, description }` | `{ success: boolean, category: MenuCategory }` | `store.createMenuCategory()` -> `flushSync()` |
| `/api/restaurant/menu/categories/:id`| PATCH | MANAGER | `{ name?, displayOrder? }` | `{ success: boolean, category: MenuCategory }` | `store.updateMenuCategory()` -> `flushSync()` |
| `/api/restaurant/menu/categories/:id`| DELETE | MANAGER | URL Param | `{ success: boolean }` | `store.deleteMenuCategory()` -> `flushSync()` |
| `/api/restaurant/menu/categories/reorder` | POST | MANAGER | `{ categoryIds: string[] }` | `{ success: boolean }` | `store.reorderCategories()` -> `flushSync()` |

### 4.9 Templates, Studio & Whitelabel Branding (6 Endpoints)
| Endpoint | Method | Role | Request Payload | Response Shape | Store / Persistence Method |
|---|---|---|---|---|---|
| `/api/restaurant/templates` | GET | Anonymous | None | `{ success: boolean, templates: MarketplaceTemplate[] }` | `store.getTemplates()` |
| `/api/restaurant/templates/install`| POST | MANAGER | `{ templateId: string }` | `{ success: boolean, activeTemplateId: string }` | `store.installTemplate()` -> `flushSync()` |
| `/api/restaurant/studio/draft` | GET/POST| MANAGER | `{ templateId, draftSections, draftTokens }` | `{ success: boolean, draft: TemplateDraft }` | `store.saveStudioDraft()` -> `flushSync()` |
| `/api/restaurant/studio/publish` | POST | MANAGER | `{ templateId: string }` | `{ success: boolean, publishedVersion: number }` | `store.publishStudioTemplate()` -> `flushSync()` |
| `/api/restaurant/studio/revisions/:id/restore` | POST | MANAGER | URL Param | `{ success: boolean }` | `store.restoreStudioRevision()` -> `flushSync()` |
| `/api/restaurant/branding/verify-domain` | POST | MANAGER | `{ customDomain: string }` | `{ success: boolean, domainStatus: 'ACTIVE', sslStatus: 'ACTIVE' }` | `store.verifyCustomDomain()` -> `flushSync()` |

### 4.10 Quick-Commerce Grocery (3 Endpoints)
| Endpoint | Method | Role | Request Payload | Response Shape | Store / Persistence Method |
|---|---|---|---|---|---|
| `/api/commerce/grocery/skus` | GET | Anonymous | Query: `?category=...&pincode=...` | `{ success: boolean, skus: GrocerySkuItem[] }` | `store.getGrocerySkus()` |
| `/api/commerce/grocery/skus/:id` | GET | Anonymous | URL Param | `{ success: boolean, sku: GrocerySkuItem }` | `store.getGrocerySkuById()` |
| `/api/commerce/grocery/orders` | POST | Anonymous | `{ items: [{ skuId, quantity }], deliveryAddress, idempotencyKey }` | `{ success: boolean, orderId: string, etaMinutes: number }` | `store.decrementGroceryStock()` -> `flushSync()` |

---

## 5. UI-to-API Interaction Trace Mapping

Below is the verified end-to-end trace from UI controls down to the filesystem commit:

```
Format: Screen → Control → Frontend handler → API/store method → Authorization → State mutation → Persistence → Event/refresh → User feedback
```

### Trace 1: Seating a Guest Party
- **Screen:** `/dine/:locator` (Screen `SCR-DINER-001`)
- **Control:** `DIN-CTRL-002` ("Save Party Info")
- **Frontend Handler:** `POST /api/restaurant/sessions/join`
- **API / Store Method:** `store.joinTableSession(tableNumber, partyName, coverCount, guestMood)`
- **Authorization:** Anonymous Diner Session
- **State Mutation:** `table.status = 'OCCUPIED'`; `table.currentSession = { partyName, coverCount, guestMood, startedAt }`
- **Persistence:** Synchronous atomic rename to `data/restaurant-runtime-store.json` via `store.flushSync()`
- **Event / Refresh:** Emits `SESSION_JOINED` on SSE gateway (`/api/restaurant/events`)
- **User Feedback:** Header banner updates from "Welcome Guest" to "Seated: Sharma Party (4 Guests) · Celebratory"

### Trace 2: Placing a Validated Diner Order
- **Screen:** `/dine/:locator` (Screen `SCR-DINER-001`)
- **Control:** `DIN-CTRL-011` ("Send Order to Kitchen")
- **Frontend Handler:** `POST /api/restaurant/quote` followed by `POST /api/restaurant/orders` with `x-idempotency-key`
- **API / Store Method:** `store.createOrder(tableNumber, items, branchId, quoteHash)`
- **Authorization:** Anonymous Diner Session with verified SHA-256 pricing hash
- **State Mutation:** New `RestaurantOrder` created; kitchen tasks dispatched to stations (`TANDOOR`, `CURRY_LINE`) with course assignments
- **Persistence:** Synchronous atomic rename to `data/restaurant-runtime-store.json` via `store.flushSync()`
- **Event / Refresh:** Emits `ORDER_CREATED` on SSE gateway
- **User Feedback:** Cart sheet closes; live tracking drawer slides up showing prep countdown milestone

### Trace 3: Cooking Station Ticket Bump
- **Screen:** `/kds` (Screen `SCR-KDS-001`)
- **Control:** `KDS-CTRL-008` ("Bump Task Button")
- **Frontend Handler:** `POST /api/restaurant/kds/bump` with `{ taskId }`
- **API / Store Method:** `store.bumpKitchenTask(taskId)`
- **Authorization:** Authenticated Staff (Role: SERVER, COOK, or MANAGER)
- **State Mutation:** `task.status = 'READY'`; order items marked prepared
- **Persistence:** Synchronous atomic rename to `data/restaurant-runtime-store.json` via `store.flushSync()`
- **Event / Refresh:** Emits `KDS_TASK_BUMPED` on SSE gateway
- **User Feedback:** Card smoothly transitions out of Cook rail into Expo pass staging column with audio chime

### Trace 4: Cash Table Bill Settlement
- **Screen:** `/operations/floor` (Screen `SCR-OPS-FLOOR-001`)
- **Control:** `FLOOR-CTRL-017` ("Settle Bill Button")
- **Frontend Handler:** `POST /api/restaurant/tables/:id/settle` with `{ paymentMethod: 'CASH' }`
- **API / Store Method:** Mutex lock `activeSettlementLocks.add(tableNumber)` -> `store.settleTableBill(tableNumber, paymentMethod)` -> Mutex unlock
- **Authorization:** Authenticated Staff (Role: SERVER or MANAGER)
- **State Mutation:** `table.status = 'AVAILABLE'`; `table.currentSession = undefined`; `table.activeOrders = []`; records closed bill in `store.data.bills`
- **Persistence:** Synchronous atomic rename to `data/restaurant-runtime-store.json` via `store.flushSync()`
- **Event / Refresh:** Emits `TABLE_BILL_SETTLED` and `SESSION_CLOSED` on SSE gateway
- **User Feedback:** Settlement modal closes; table dot turns green (Available); toast notification displayed

### Trace 5: Canvas Table Drag Coordinates Save
- **Screen:** `/operations/floor` (Screen `SCR-OPS-FLOOR-001`)
- **Control:** `FLOOR-CTRL-010` ("Save Floor Layout")
- **Frontend Handler:** `POST /api/restaurant/floor/save` with `{ branchId, tables }`
- **API / Store Method:** `store.saveFloorLayout(branchId, tables)`
- **Authorization:** Authenticated Staff (Role: MANAGER or ADMIN)
- **State Mutation:** Updates `x`, `y`, `width`, `height`, and `shape` for all table records in the active branch
- **Persistence:** Synchronous atomic rename to `data/restaurant-runtime-store.json` via `store.flushSync()`
- **Event / Refresh:** Emits `FLOOR_LAYOUT_SAVED` on SSE gateway
- **User Feedback:** Save button displays checkmark "Saved"; unsaved changes warning chip dismisses

---

## 6. Verification & Confidence Statement

- **Store & Persistence Engine:** `[Verified in source]` (`packages/storage/store.ts` lines 1 to 3085).
- **Server API Handlers (all 54 routes):** `[Verified in source]` (`src/server.ts` lines 350 to 5146) and `[Verified by test]` (`scripts/test-gate-a-and-b-integrity.js`).
- **SSE Stream & Sequence Monotonicity:** `[Verified in source]` (`src/server.ts` line 838) and `[Verified at runtime]` on `:4010/api/restaurant/events`.
- **Concurrency Locks & Idempotency Cache:** `[Verified in source]` (`src/server.ts` lines 1035, 1310, 2346, 4530).
