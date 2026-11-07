# Event Bus & Webhook Engine Module

---

## Executive Summary

The platform provides a reactive **Event Bus & Webhook Engine** that dispatches domain events asynchronously. It enables real-time integrations, external system syncs, and event-driven plugin execution across all 5 tiers.

---

## 1. Multi-Tenant Event Dispatcher

Every event emitted by the core system or plugins carries full tenancy context.

```typescript
export interface IDomainEvent<T = any> {
  id: string;                    // Event UUID
  name: string;                  // e.g. "order.completed"
  timestamp: string;             // ISO-8601
  
  // 5-Tier Context
  orgId: string;
  tenantId: string;
  companyId: string;
  actorId?: string;

  data: T;                       // Payload
}
```

---

## 2. Multi-Tenant Webhook Management

Organisations, Tenants, and Companies can register webhooks to receive HTTP POST payloads when specific events occur.

### Webhook Subscription Schema

```json
{
  "id": "sub_wh_001",
  "tier": "COMPANY",
  "company_id": "comp-123",
  "target_url": "https://api.company-client.com/webhooks/orders",
  "secret": "<WEBHOOK_SIGNING_SECRET>", // Used for HMAC Signature
  "events": ["order.completed", "customer.created"],
  "status": "ACTIVE"
}
```

### Security & Signature Verification

Every outbound webhook includes an HMAC-SHA256 signature in the HTTP headers so the client can verify authenticity:

```text
X-Platform-Signature: t=1690000000,v1=9f8a7b6c5d4e...
```

---

## 3. Webhook Delivery & Replay Engine

- **Concurrency & Scaling:** Webhook jobs are dispatched via BullMQ workers with exponential backoff retries (Retries: 5 attempts).
- **Event Replay:** Admins can trigger manual "Event Replays" for any timeframe in cases of client server outages.
- **Circuit Breaker:** If a client webhook endpoint fails consistently for 24 hours, the subscription is automatically toggled to `DEGRADED` and notifies the client admin.
