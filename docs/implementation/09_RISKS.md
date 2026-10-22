# ⚠️ OrbitoX RestaurantOS: Critical Risks & Mitigation Matrix (09)

> **Document:** `docs/implementation/09_RISKS.md`  
> **Status:** Risk Governance Matrix  

---

## Ranked Risk Catalog

| Rank | Risk Domain | Description & Failure Mode | Inherent Severity | Mitigation in Architecture |
|---|---|---|---|---|
| **1** | **Security / QR Trust** | Attacker takes a photo of Table 14 QR, goes home, and listens to table orders or places prank orders. | **CRITICAL** | **QR Trust v2.2 Contract:** Static QR is only a table locator. Joining requires explicit `JoinRequest` + approval or table PIN. Remote scans return only public menu. |
| **2** | **Multi-Tenancy / Data Leak** | Multi-branch staff member in Ludhiana queries or modifies orders belonging to the Chandigarh branch. | **CRITICAL** | **PostgreSQL RLS + AsyncLocalStorage:** Database policies filter by `tenant_id` and `location_id`. Cross-branch queries return zero rows. |
| **3** | **Concurrency / Stock Oversell** | 50 guests concurrently submit orders for the last 2 portions of a high-value dish. | **HIGH** | **Row-Level Lock & OCC:** `SELECT ... FOR UPDATE` atomic decrement in PostgreSQL. Secondary carts rejected with HTTP 409. |
| **4** | **Payment / Double Charge** | Guest taps "Pay Now", network flickers, guest retries, causing double credit card charge. | **HIGH** | **Durable IdempotencyRecord:** Client supplies UUID `Idempotency-Key`. PostgreSQL guarantees payment intent executed exactly once. |
| **5** | **Edge / Offline Disconnect** | Cloud API connection drops during Friday 8 PM dinner rush; kitchen loses ticket queue. | **HIGH** | **OrbitoX Local Edge Node:** Local LAN daemon runs local KDS queue and printer spooler autonomously over LAN; syncs deltas on reconnect. |
| **6** | **Realtime / Event Leakage** | WebSocket gateway broadcasts order events across all tables, filtering in browser React state. | **HIGH** | **Session-Scoped WebSocket Rooms:** Realtime events emitted only to authenticated sockets matching `sessionId` and `stationId`. |
| **7** | **AI / Scope Escape** | Malicious manager uses AI Copilot prompt injection to extract corporate sales of competing franchise outlets. | **MEDIUM** | **Context Injected Tools:** AI Tool Gateway resolves company and location scope from server context; prompt arguments for company ID are ignored. |
