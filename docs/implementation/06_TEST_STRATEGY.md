# 🧪 OrbitoX RestaurantOS: Test & Verification Strategy (06)

> **Document:** `docs/implementation/06_TEST_STRATEGY.md`  
> **Status:** Production Test Automation Baseline  

---

## 1. Testing Pyramid & Automation Framework

Every capability added to RestaurantOS must be backed by automated test coverage before being marked complete:

```
                  ┌──────────────────────┐
                  │      E2E Journey     │  ── Playwright / Supertest Live Journey
                  ├──────────────────────┤
                  │ Security & Chaos Test│  ── 27-Point Readiness Gate & Failure Matrix
                  ├──────────────────────┤
                  │ Concurrency & OCC    │  ── 100-Worker Simultaneous Stock & Double-Submits
                  ├──────────────────────┤
                  │ Integration & RLS    │  ── PostgreSQL RLS & Prisma Repository Isolation
                  ├──────────────────────┤
                  │ Unit & State Machine │  ── Pure Domain Logic & Transition Invariants
                  └──────────────────────┘
```

---

## 2. Core Test Suites

### 2.1 State Machine Invariant Tests
- Verify all illegal transitions (e.g., `Order.commercialState: DRAFT ➔ COMPLETED` without confirmation) throw explicit `DomainException`.
- Verify terminal states (`CANCELLED`, `COMPLETED`, `REFUNDED`) refuse any further mutations.

### 2.2 Concurrency & Double-Submit Tests
- **Race Condition Suite:** 100 parallel worker threads attempting to reserve 2 stock items. Expected result: exactly 2 succeed, 98 receive `409 Conflict`.
- **Durable Idempotency Suite:** 10 parallel HTTP POST calls with the same `Idempotency-Key`. Expected result: exactly 1 database commit, all 10 calls receive the identical 201 response.

### 2.3 QR Trust & Security Penetration Suite (20 Automated Tests)
```
1. QR resolves correct branch
2. QR cannot resolve another tenant
3. QR cannot directly expose active session
4. QR cannot expose participant names before authorization
5. Join creates independent participant
6. Participant A cannot use Participant B capability
7. Guest cannot access another table
8. Guest cannot access another branch
9. Closed session invalidates capability
10. New session rejects old capability
11. Copied QR exposes only public context
12. Join request cannot be replayed
13. Invitation cannot be reused
14. Host approval is atomic
15. Participant removal invalidates membership
16. Shared projection excludes private customer fields
17. Guest cannot mutate another participant's order
18. Guest cannot modify restaurant configuration
19. Guest cannot escalate to staff capability
20. Session epoch invalidates old capabilities
```

---

## 3. The Deterministic End-to-End Demo Journey Test

A fully automated integration test simulating the canonical dining scenario:
1. **Branch Setup:** OrbitoX Bistro (Ludhiana Main Branch) with Table `T-14`.
2. **Guest A (Nikhil):** Scans Table 14 QR, explores public menu, submits join request, receives capability token, orders Butter Chicken + Garlic Naan.
3. **Guest B (Rahul):** Scans the same Table 14 QR, sees table session is active, submits join request, receives approved capability, sees permitted shared items, orders Paneer Tikka.
4. **Kitchen Operations:** KDS receives both tickets, dispatches to Curry and Tandoor stations, calculates fire times, transitions items to `PREPARING` and `READY`.
5. **Realtime Updates:** Both guests receive live WebSocket order status updates simultaneously.
6. **Session Close:** Table 14 bill is settled; staff marks table `CLOSED`. `DiningSession.accessEpoch++` is incremented.
7. **Attacker Verification:** Attacker re-scans Table 14 QR URL from an external network. Verified to receive only public menu; active orders and past guest names return zero data.
