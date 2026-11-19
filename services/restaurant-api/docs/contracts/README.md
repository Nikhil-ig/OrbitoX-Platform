# 🪐 OrbitoX RestaurantOS v2.1: Master Engineering Specification & Contracts Library

> **The Definitive Production Engineering Contract Suite**  
> **Classification:** Internal Engineering Standard · OrbitoX Vertical Core  
> **Status:** Production Architecture Baseline (v2.1 Hardened & Provable)  
> **Applicability:** Backend Engineers · Frontend Engineers · AI Coding Agents · Plugin Developers  

---

## 📑 Master Navigation Index

This directory contains the authoritative, frozen engineering contracts for **OrbitoX RestaurantOS v2.1**. All software components, APIs, database migrations, state machines, and AI agents within the `external-restaurant-os` repository must conform strictly to these specifications.

| Specification Document | Summary & Scope |
|---|---|
| **[02_RestaurantOS_Master_Blueprint.md](02_RestaurantOS_Master_Blueprint.md)** | Master architectural overview, 6 connected planes, 10 core primitives, 11 specialized engines, and the 6-phase roadmap. |
| **[03_RestaurantOS_Domain_Model.md](03_RestaurantOS_Domain_Model.md)** | Domain aggregates, entity models, minor-unit `Money` value objects, deterministic `PricingQuote`, and immutable `BusinessSnapshot`. |
| **[04_RestaurantOS_State_Machines.md](04_RestaurantOS_State_Machines.md)** | Four authoritative order state machines, `DiningSession` lifecycle, `InventoryReservation` machine, and customer visibility projection. |
| **[05_RestaurantOS_Event_Catalog.md](05_RestaurantOS_Event_Catalog.md)** | Monotonic domain event streams, schema versioning (v1/v2), `ActorContext` envelopes, and causation/correlation chains. |
| **[06_RestaurantOS_API_Contracts.md](06_RestaurantOS_API_Contracts.md)** | Strict CQRS separation: Command endpoints with durable idempotency vs. Query endpoints with tenant-scoped projections. |
| **[07_RestaurantOS_Security_Model.md](07_RestaurantOS_Security_Model.md)** | OWASP API Top 10 defense: BOLA, BFLA, BOPLA, ephemeral `GuestCapability` tokens, and PostgreSQL Row-Level Security (RLS). |
| **[08_RestaurantOS_Concurrency_and_Idempotency.md](08_RestaurantOS_Concurrency_and_Idempotency.md)** | Optimistic concurrency control (`version`), PostgreSQL `IdempotencyRecord` store, Redis fast-path, and atomic inventory locks. |
| **[09_RestaurantOS_Edge_and_Offline.md](09_RestaurantOS_Edge_and_Offline.md)** | Hardened Edge Node architecture, mTLS tunnel, cloud vs. edge authority matrix, conflict resolution rules, and offline capability matrix. |
| **[10_RestaurantOS_Integration_Contracts.md](10_RestaurantOS_Integration_Contracts.md)** | Stateful aggregator connectors (Swiggy/Zomato), Transactional Outbox + Deduplicating Inbox patterns, and Hardware Abstraction Layer (HAL). |
| **[11_RestaurantOS_AI_MCP_Governance.md](11_RestaurantOS_AI_MCP_Governance.md)** | Tool-First AI Gateway, context-injected tenancy isolation, 5 formal action levels, and the standard OrbitoX Restaurant MCP specification. |
| **[12_RestaurantOS_Test_and_Chaos_Strategy.md](12_RestaurantOS_Test_and_Chaos_Strategy.md)** | The 27-Point Production-Readiness Gate Checklist and the 13-scenario distributed system Failure Matrix. |
| **[13_RestaurantOS_QR_Trust_and_Guest_Privacy.md](13_RestaurantOS_QR_Trust_and_Guest_Privacy.md)** | **[NEW v2.2]** QR Trust, Dining Session Membership & Guest Privacy Contract (Door vs. Room vs. Key model, `accessEpoch`, WebCrypto binding). |

---

## 🏛️ The Conceptual Engineering Hierarchy

```
1. ORBITOX PLATFORM PRIMITIVES  ── Tenancy (RLS/ALS) · RS256 Identity · Policy · CryptoSigner · EventBus
2. DOMAIN PRIMITIVES           ── Location · Table · DiningSession · Participant · CatalogItem · Order · Task
3. DOMAIN AGGREGATES           ── DiningSessionAggregate · OrderAggregate · InventoryBalanceAggregate
4. DOMAIN SERVICES             ── OrderOrchestrationService · KdsSchedulerService · StockLedgerService
5. SPECIALIZED ENGINES         ── Pricing · Tax · Availability · Recommendation · Capacity · Incident · Outbox
6. WORKFLOWS & STATE MACHINES  ── CommercialWorkflow · FulfillmentWorkflow · PaymentWorkflow · SessionWorkflow
7. CHANNELS & EXPERIENCES      ── Guest Mobile PWA · Captain Tablet · Kitchen KDS · Counter POS · Studio
8. INTEGRATION HUB & EDGE MESH ── OrbitoX Edge Node (mTLS) · Aggregators · Hardware HAL (Printers/Cash Drawers)
```
