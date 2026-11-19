# 🧪 RestaurantOS Test & Chaos Engineering Strategy (12)

> **Contract Reference:** `12_RestaurantOS_Test_and_Chaos_Strategy.md`  
> **Status:** Production Architecture Baseline (v2.1 Hardened)  
> **Package Target:** CI/CD Automation, Chaos Engineering & QA Automation

---

## 1. The 27-Point Production-Readiness Gate Checklist

Before deploying any production instance or certifying an OrbitoX RestaurantOS vertical release, the deployment pipeline must automatically execute and pass all 27 automated chaos and invariant tests:

```
[ ] 01. State Machine: All invalid transition permutations throw explicit DomainExceptions.
[ ] 02. Concurrency: 100 concurrent requests attempting to buy the last 2 stock items result in exactly 2 successes and 98 HTTP 409s.
[ ] 03. Double-Submit: Identical POST /orders with identical Idempotency-Key returns the identical response with zero double-charging.
[ ] 04. Payment Retries: Payment gateway timeouts gracefully recheck status without generating duplicate charges.
[ ] 05. Quote Expiry: Submitting an order with an expired quote (> 120s) triggers re-validation and price refresh.
[ ] 06. Price Change in Checkout: Altering product price while guest has cart open safely rejects stale quote.
[ ] 07. Duplicate Webhook: Re-delivering identical payment webhooks results in exactly one database mutation.
[ ] 08. Outbox Recovery: Simulating worker process termination guarantees zero lost domain events.
[ ] 09. Event Replay: Rebuilding order state from the OrderEvent stream results in 100% bit-for-bit parity.
[ ] 10. Edge Disconnect: Severing WAN connection preserves 100% local KDS, POS, and printing capabilities.
[ ] 11. Edge Reconnect: Restoring WAN smoothly syncs buffered edge orders to cloud without conflict.
[ ] 12. Printer Failure: Unplugging network printer reroutes tickets to backup display and spools remaining jobs.
[ ] 13. KDS Failure: Terminating primary KDS screen redistributes queue to backup display without ticket loss.
[ ] 14. Database Failover: Simulating primary PostgreSQL restart recovers within the RTO target.
[ ] 15. Redis Failover: Redis crash gracefully falls back to direct database reads with rate limits.
[ ] 16. Tenancy Penetration: Manipulating JWT claims or tenant headers fails to leak adjacent tenant data.
[ ] 17. BOLA/BFLA/BOPLA: Attempting to access another table's bill or modify read-only properties returns HTTP 403.
[ ] 18. Guest Capability: Ephemeral QR tokens cannot invoke administrative or manager endpoints.
[ ] 19. Coupon Abuse: Rapid concurrent coupon redemption across 10 devices succeeds exactly once.
[ ] 20. Rate Limiting: Flooding order creation endpoints triggers HTTP 429 after configured velocity threshold.
[ ] 21. AI Tool Boundary: Injected prompt instructing tool to query unauthorized tenant is rejected.
[ ] 22. Schema Migration: Upgrading Experience Studio schema seamlessly migrates legacy published experiences.
[ ] 23. Backup Restoration: Restoring daily database backup verifies complete relational integrity.
[ ] 24. Disaster Recovery: Re-deploying entire stack in alternate cloud region completes within SLA.
[ ] 25. Audit Completeness: Every state mutation records actor, timestamp, causationId, and before/after values.
[ ] 26. Trace Correlation: OpenTelemetry traceId links guest QR scan to final KDS ticket completion.
[ ] 27. Peak Load Simulation: Simulating 500 concurrent tables placing orders maintains sub-second response times.
```

---

## 2. Distributed System Failure Matrix (13 Scenarios)

| Scenario | Detection Mechanism | Immediate Fallback | Data Authority | Recovery / Reconciliation Action |
|---|---|---|---|---|
| **1. Cloud API Unavailable** | Edge heartbeat timeout ($> 5\text{s}$) | Edge Node enters autonomous local LAN mode | Local Edge Node | Buffered edge events replayed to cloud upon reconnect |
| **2. Redis Cache Down** | Health check connection refused | Fall back to direct PostgreSQL reads with rate throttle | PostgreSQL | Reconnect; warm critical cache keys asynchronously |
| **3. PostgreSQL Down** | Connection pool exhaustion error | Read replicas serve menu queries; commands return 503 | Read Replicas (Read-Only) | Failover to standby database; retry queued outbox |
| **4. Edge Node Offline** | Cloud tunnel disconnect alert | Frontline devices switch to cloud API direct endpoints | Cloud Platform | Re-establish mTLS tunnel; run delta sync cursor |
| **5. KDS Screen Offline** | Edge WebSocket ping timeout | Auto-route tickets to backup KDS station or thermal printer | Edge Node Queue | Resend unacknowledged tickets upon KDS reconnection |
| **6. Kitchen Printer Offline** | ESC/POS socket connection dropped | Spool tickets in memory; alert expo screen to reroute | Edge Spooler | Drain spooled buffer immediately upon printer recovery |
| **7. Payment Gateway Timeout** | HTTP 504 after $15\text{s}$ timeout | Recheck payment status via query API; preserve intent | Payment Provider | Poll gateway transaction status before unlocking order |
| **8. Duplicate Webhook** | Webhook deduplication key exists | Acknowledge HTTP 200 immediately without reprocessing | Deduplication Inbox | Discard duplicate message; log duplicate metric |
| **9. Duplicate Order Request** | PostgreSQL `IdempotencyRecord` hit | Return stored original response with HTTP 200 | Idempotency Store | Zero duplicate tickets or inventory reservations created |
| **10. Client Clock Drift** | Clock skew check against server | Reject timestamps; assign server UTC timestamps | Cloud / Edge Server | Client uses monotonic event sequences instead of local time |
| **11. Catalog Publish in Rush** | High order volume lock detected | Queue publish for off-peak or apply versioned release | Catalog Engine | Active dining sessions retain their active `menuVersion` |
| **12. Inventory Stock Race** | Optimistic lock conflict / zero rows | Reject secondary cart with `409 Insufficient Stock` | PostgreSQL Atomic Lock | Inform guest item was just ordered by an adjacent table |
| **13. Policy Engine Down** | Engine evaluation timeout | Fail-closed security rule (deny all privileged access) | Hardcoded Security Core | Log critical security incident; alert DevOps immediately |
