# 🌐 RestaurantOS API Contracts Specification (06)

> **Contract Reference:** `06_RestaurantOS_API_Contracts.md`  
> **Status:** Production Architecture Baseline (v2.1 Hardened)  
> **Package Target:** `@orbitox-io/restaurant-order`, `@orbitox-io/restaurant-dining`

---

## 1. Strict CQRS Separation (Commands vs. Queries)

To maximize performance, security, and concurrency guarantees, APIs are divided into **State-Mutating Commands** and **Read-Only Queries**:

```
COMMANDS (State Mutating) ➔ Require Auth, Capabilities, Idempotency-Key, Optimistic Version, Atomic TX
QUERIES (Read-Only)      ➔ Cached, Projected, RLS-Filtered, Zero State Mutation
```

---

## 2. Command Endpoints Specification

### 2.1 `POST /api/v1/sessions/:sessionId/quote`
Generates a deterministic, price-locked `PricingQuote` valid for 120 seconds.

- **Headers:** `Idempotency-Key`, `Authorization`
- **Request Body:**
  ```json
  {
    "participantId": "part_guest_01",
    "lineItems": [
      {
        "productId": "prod_butter_chicken",
        "quantity": 1,
        "selectedModifierIds": ["mod_spice_medium", "mod_extra_butter"]
      }
    ]
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "quoteId": "quote_88192a",
      "sessionId": "sess_81023",
      "catalogVersion": "cat_v14",
      "menuVersion": "menu_dinner_v8",
      "inputHash": "a1b2c3d4...",
      "resultHash": "e5f6g7h8...",
      "lineItems": [
        {
          "productId": "prod_butter_chicken",
          "unitPriceMinor": "42000",
          "subtotalMinor": "42000"
        }
      ],
      "discountAmountMinor": "0",
      "taxAmountMinor": "2100",
      "totalMinor": "44100",
      "expiresAt": "2026-10-07T14:34:01.000Z"
    }
  }
  ```

---

### 2.2 `POST /api/v1/orders`
Submits an immutable order against a pre-validated `PricingQuote`.

- **Headers:** `Idempotency-Key: <UUID>`, `Authorization`
- **Request Body:**
  ```json
  {
    "sessionId": "sess_81023",
    "quoteId": "quote_88192a",
    "inputHash": "a1b2c3d4...",
    "resultHash": "e5f6g7h8...",
    "source": "QR_TABLE",
    "fulfillmentType": "DINE_IN"
  }
  ```
- **Error Codes:**
  - `409 CONFLICT` (`QUOTE_EXPIRED`): The 120-second validity window has expired.
  - `409 CONFLICT` (`HASH_MISMATCH`): Underlying catalog prices or tax rules changed; refresh cart.
  - `409 CONFLICT` (`INSUFFICIENT_STOCK`): Ingredient stock reservation failed.

---

### 2.3 `POST /api/v1/orders/:orderId/items/:itemId/void`
Voids a confirmed order item with a mandatory manager reason code and stock disposition.

- **Headers:** `Idempotency-Key: <UUID>`, `Authorization: Bearer <ManagerToken>`
- **Request Body:**
  ```json
  {
    "expectedVersion": 4,
    "reasonCode": "GUEST_CHANGED_MIND",
    "stockDisposition": "RETURN_TO_INVENTORY",
    "managerPin": "9812"
  }
  ```

---

## 3. Query Endpoints Specification

### 3.1 `GET /api/v1/orders/:orderId/visibility`
Computes the ephemeral, customer-friendly status projection without leaking internal kitchen complexities.

- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "orderNumber": "#4821",
      "visibilityState": "CHEF_PREPARING",
      "friendlyMessage": "Chef Vikram is simmering your Butter Chicken.",
      "estimatedReadyInMinutes": 8,
      "itemsProgress": [
        { "name": "Butter Chicken", "status": "COOKING" },
        { "name": "Garlic Naan", "status": "QUEUED" }
      ]
    }
  }
  ```

---

### 3.2 `GET /api/v1/kds/stations/:stationId/queue`
Fetches real-time touch-optimized tickets scheduled for a specific workstation (e.g., Tandoor Station).

- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "stationId": "stn_tandoor_01",
      "stationName": "Tandoor Station",
      "activeTasks": [
        {
          "taskId": "task_1102",
          "orderNumber": "#4821",
          "tableLabel": "T-14",
          "itemName": "Garlic Naan",
          "quantity": 2,
          "targetFireAt": "2026-10-07T14:38:00.000Z",
          "slaMinutes": 6,
          "isDelayed": false
        }
      ]
    }
  }
  ```

---

### 3.3 `GET /api/v1/public/qr/:locator` (v2.2 QR Discovery)
Resolves an opaque high-entropy QR locator to public table discovery context. **Never exposes active session orders, payments, or customer data.**

- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "tableDiscoveryContext": {
        "restaurantName": "Bella Casa",
        "branchName": "Ludhiana",
        "serviceAreaName": "Main Dining",
        "tableLabel": "T-14",
        "brandLogoUrl": "https://cdn.bellacasa.it/logo.png",
        "isSessionActive": true,
        "joinPolicy": "OPEN_JOIN",
        "publicMenuUrl": "/api/v1/guest/menu"
      }
    }
  }
  ```

---

### 3.4 `POST /api/v1/guest/join-requests` (v2.2 DiningSession Join)
Submits a request to join an active dining session. Depending on restaurant policy (`OPEN_JOIN`, `HOST_APPROVAL`, `STAFF_APPROVAL`), auto-issues or queues for approval.

- **Request Body:**
  ```json
  {
    "locator": "7Kp9xQ8m2L",
    "requestedDisplayName": "Nikhil",
    "devicePublicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..."
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "status": "APPROVED",
      "participantId": "part_99182",
      "sessionEpoch": 14,
      "guestCapability": {
        "scopes": [
          "guest.menu.read",
          "guest.session.read",
          "guest.session.shared_orders.read",
          "guest.cart.create",
          "guest.order.create",
          "guest.bill.read"
        ],
        "expiresAt": "2026-10-07T16:32:00.000Z"
      }
    }
  }
  ```

---

### 3.5 `GET /api/v1/guest/session/shared-order` (v2.2 Sanitized SharedOrderProjection)
Fetches the sanitized shared table items for active participants. Never leaks raw customer IDs, phone numbers, staff notes, or payment instruments.

- **Headers:** `Authorization: Bearer <GuestCapabilityToken>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "sess_81023",
      "tabTotalMinor": "44100",
      "sharedItems": [
        {
          "itemId": "item_01",
          "displayName": "Butter Chicken",
          "quantity": 1,
          "participantDisplayName": "Nikhil",
          "preparationStatus": "COOKING",
          "customerVisibilityState": "CHEF_PREPARING",
          "estimatedReadyAt": "2026-10-07T14:42:00.000Z",
          "orderedAt": "2026-10-07T14:32:01.000Z"
        },
        {
          "itemId": "item_02",
          "displayName": "Paneer Tikka",
          "quantity": 1,
          "participantDisplayName": "Rahul",
          "preparationStatus": "READY",
          "customerVisibilityState": "READY_TO_SERVE",
          "orderedAt": "2026-10-07T14:30:15.000Z"
        }
      ]
    }
  }
  ```

---

## 4. Standard Response & Error Envelopes

### Universal Success Envelope
```json
{
  "success": true,
  "data": {},
  "metadata": {
    "traceId": "trace_9f81a7b",
    "timestamp": "2026-10-07T14:32:00.000Z"
  }
}
```

### Universal Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "ERR_CONCURRENCY_CONFLICT",
    "message": "Resource was modified by another transaction. Please retry.",
    "details": { "expectedVersion": 3, "actualVersion": 4 },
    "retryable": true
  },
  "metadata": {
    "traceId": "trace_9f81a7b",
    "timestamp": "2026-10-07T14:32:00.000Z"
  }
}
```
