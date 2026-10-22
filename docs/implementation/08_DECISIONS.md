# ⚖️ OrbitoX RestaurantOS: Architectural Decision Records (ADRs) (08)

> **Document:** `docs/implementation/08_DECISIONS.md`  
> **Status:** Canonical Decision Registry  

---

### ADR-001: Separation of QRIdentity from DiningSession
- **Context:** Printed table QR codes are physically permanent and affixed to furniture, whereas dining parties are temporary.
- **Decision:** Model `QRIdentity` as persistent and opaque (`/q/:locator`), `DiningSession` as temporary, and `GuestCapability` as ephemeral. `SCAN ≠ JOIN`.
- **Consequences:** Completely eliminates the remote photo-of-QR attack scenario where an attacker scans a copied QR from home.

---

### ADR-002: Four Authoritative States + One Derived Projection for Orders
- **Context:** A single `order.status` field causes contradictions when payments fail while food is cooking.
- **Decision:** Persist four independent domain states: `CommercialState`, `FulfillmentState`, `PaymentState`, `KitchenState`. Derive `CustomerVisibilityState` on-the-fly via a projection function.
- **Consequences:** Guarantees zero state drift between kitchen execution and guest UI.

---

### ADR-003: Integer Minor-Unit Currency (`Money`)
- **Context:** Floating-point currency calculations introduce rounding anomalies across tax and payment splits.
- **Decision:** Represent all financial fields as 64-bit integer minor currency units (`amountMinor: bigint`).
- **Consequences:** 100% deterministic accounting and tax calculations across all currencies.

---

### ADR-004: Tool-First AI Execution Context Isolation
- **Context:** Prompt injection attacks can manipulate LLMs into querying unauthorized tenants or locations.
- **Decision:** AI agents never receive database credentials. Tools resolve `tenantId` and `locationId` strictly from server-side `AsyncLocalStorage`, never from LLM prompt inputs.
- **Consequences:** Renders multi-tenant boundary escapes mathematically impossible via prompt injection.
