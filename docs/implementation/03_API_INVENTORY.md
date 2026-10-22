# 📡 OrbitoX RestaurantOS: Complete API Inventory (03)

> **Document:** `docs/implementation/03_API_INVENTORY.md`  
> **Status:** Canonical Production API Registry  

---

## 1. Public & QR Discovery APIs

| Domain | Method & Endpoint | Auth Required | Scopes Required | Idempotency | Purpose |
|---|---|---|---|---|---|
| **QR** | `GET /api/v1/public/qr/:locator` | Public | None | No | Resolves opaque QR locator to `TableDiscoveryContext`. Zero private session data. |
| **Guest** | `POST /api/v1/guest/scans` | Public | None | Yes | Logs scan telemetry and returns public restaurant branding. |
| **Menu** | `GET /api/v1/guest/menu` | Public | None | No | Fetches active channel menu with dynamic availability rules. |

---

## 2. Dining Session & Membership APIs

| Domain | Method & Endpoint | Auth Required | Scopes Required | Idempotency | Purpose |
|---|---|---|---|---|---|
| **Session** | `POST /api/v1/guest/join-requests` | Public | None | Yes | Creates a `JoinRequest` to enter Table 14's active session. |
| **Session** | `GET /api/v1/guest/join-requests/:id` | Public | None | No | Polls status of submitted join request (`APPROVED`/`PENDING`). |
| **Session** | `POST /api/v1/guest/join-requests/:id/approve` | Host / Staff | `session.join.approve` | Yes | Host diner or floor captain approves a pending diner. |
| **Session** | `POST /api/v1/guest/capabilities/exchange`| Approved Diner| None (Exchange Code)| Yes | Exchanges approved request for an ephemeral `GuestCapability` token. |
| **Session** | `GET /api/v1/guest/session` | Guest Token | `guest.session.read` | No | Fetches active session metadata, table label, and participant list. |
| **Session** | `GET /api/v1/guest/session/shared-order` | Guest Token | `guest.session.shared_orders.read` | No | Fetches sanitized `SharedOrderProjection` of table items. |
| **Session** | `POST /api/v1/guest/leave` | Guest Token | `guest.leave` | Yes | Marks participant as left; revokes their individual capability. |

---

## 3. Quoting, Ordering & Payment APIs

| Domain | Method & Endpoint | Auth Required | Scopes Required | Idempotency | Purpose |
|---|---|---|---|---|---|
| **Pricing** | `POST /api/v1/sessions/:id/quote` | Guest Token | `guest.cart.create` | Yes | Generates a 120s hash-locked `PricingQuote` with taxes/discounts. |
| **Order** | `POST /api/v1/orders` | Guest Token | `guest.order.create` | **Yes (Strict)**| Submits an immutable order against a pre-validated `PricingQuote`. |
| **Order** | `GET /api/v1/orders/:id/visibility` | Guest Token | `guest.order.read_own` | No | Derives customer-facing progress projection (`CHEF_PREPARING`). |
| **Order** | `POST /api/v1/orders/:id/confirm` | Staff Token | `orders.confirm` | **Yes (Strict)**| Confirms submitted order and auto-dispatches KDS tasks. |
| **Order** | `POST /api/v1/orders/:id/items/:itemId/void`| Manager Token | `orders.void` | **Yes (Strict)**| Voids a confirmed item with mandatory reason code & PIN. |
| **Payment** | `POST /api/v1/payments/intent` | Guest Token | `guest.payment.create` | **Yes (Strict)**| Initializes tokenized gateway payment intent (Razorpay/Stripe). |
| **Payment** | `POST /api/v1/payments/capture` | Staff / Webhook| `payments.capture` | **Yes (Strict)**| Captures authorized payment tranche against the session bill. |

---

## 4. Kitchen Operations & KDS APIs

| Domain | Method & Endpoint | Auth Required | Scopes Required | Idempotency | Purpose |
|---|---|---|---|---|---|
| **KDS** | `GET /api/v1/kds/stations/:id/queue` | Kitchen Staff | `kds.station.read` | No | Returns touch-optimized queue sorted by target fire time. |
| **KDS** | `POST /api/v1/kds/tasks/:id/start` | Kitchen Staff | `kds.task.update` | Yes | Transitions preparation task from `QUEUED` to `PREPARING`. |
| **KDS** | `POST /api/v1/kds/tasks/:id/ready` | Kitchen Staff | `kds.task.update` | Yes | Marks item task as `READY` for expo station pickup. |
| **KDS** | `POST /api/v1/kds/expo/orders/:id/serve`| Expo / Runner | `kds.expo.serve` | Yes | Marks entire order as `SERVED` at physical table. |
