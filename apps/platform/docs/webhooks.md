# 🪐 OrbitoX Platform — Webhook Delivery & Reliability Specification

## 1. Overview & Guarantees

OrbitoX Platform implements a transactional outbox pattern to guarantee reliable, durable delivery of domain lifecycle events (e.g., `tenant.ready`, `entitlement.updated`) to external subscribers.

### Guarantees
- **Durable At-Least-Once Delivery**: Events are committed to the persistent database (`PlatformOutboxMessage`) within the same atomic transaction as the state change. A committed event is guaranteed to be delivered to external subscribers at least once.
- **Authoritative Event Uniqueness**: Singleton lifecycle events (such as `tenant.ready`) enforce database-level uniqueness via a partial unique index on `(tenantId, deduplicationKey)`. Duplicate activation transactions return the exact same authoritative outbox record ID.
- **Idempotent Identifiers**: Every delivery attempt for a given outbox record carries the same immutable `id` in both `x-orbitox-delivery-id` and `x-orbitox-event-id` headers. Network retries, recovery sweeps, and worker failovers NEVER generate new event IDs.

---

## 2. HTTP Request Headers & Payload Format

OrbitoX delivers webhooks via HTTP `POST` requests with JSON payloads:

```http
POST /your-webhook-endpoint HTTP/1.1
Host: your-domain.com
Content-Type: application/json
x-orbitox-delivery-id: outbox_018f4a12-897b-7000-8c23-0123456789ab
x-orbitox-event-id: outbox_018f4a12-897b-7000-8c23-0123456789ab
x-orbitox-event: tenant.ready
x-orbitox-timestamp: 2026-11-17T14:00:00.000Z
x-orbitox-signature: 4f3a2b1c... (hex-encoded HMAC-SHA256)

{
  "id": "outbox_018f4a12-897b-7000-8c23-0123456789ab",
  "event": "tenant.ready",
  "tenantId": "org/org_abc123/project/my-saas/environment/production",
  "timestamp": "2026-11-17T14:00:00.000Z",
  "payload": {
    "tenantId": "org/org_abc123/project/my-saas/environment/production",
    "organizationId": "org_abc123",
    "slug": "my-saas",
    "status": "ACTIVE",
    "plugins": [
      { "id": "crm", "plan": "enterprise", "status": "ACTIVE" }
    ],
    "apiKey": "orb_live_..."
  },
  "url": "https://your-domain.com/webhook",
  "delivered": false
}
```

---

## 3. Security & Signature Verification

### 3.1 Fail-Closed Secret Configuration
OrbitoX strictly enforces webhook security:
- `ORBITOX_WEBHOOK_SECRET` must be set when `ORBITOX_WEBHOOK_URL` is configured.
- The secret must be at least 32 characters.
- If the secret is missing or under 32 characters, the dispatch system fails closed immediately with an error, preventing unsigned deliveries.

### 3.2 HMAC-SHA256 Signature Verification
To verify the payload authenticity on the receiver side:
1. Extract the `x-orbitox-signature` and `x-orbitox-timestamp` headers.
2. Read the raw request body as UTF-8 string bytes.
3. Compute the HMAC-SHA256 digest of the exact raw body using your shared secret:
   ```ts
   const expectedSignature = crypto
     .createHmac('sha256', secret)
     .update(rawBody)
     .digest('hex');

   const isValid = crypto.timingSafeEqual(
     Buffer.from(signatureHeader, 'hex'),
     Buffer.from(expectedSignature, 'hex')
   );
   ```

### 3.3 Replay Attack Protection (Timestamp Window)
Verify that the `x-orbitox-timestamp` is within 5 minutes (300 seconds) of the receiver's current wall clock:
```ts
const eventTime = new Date(req.headers['x-orbitox-timestamp']).getTime();
const now = Date.now();
const toleranceMs = 5 * 60 * 1000; // 5 minutes

if (Math.abs(now - eventTime) > toleranceMs) {
  throw new Error('Webhook rejected: timestamp outside tolerance window');
}
```

---

## 4. Receiver Idempotency Requirements

Because distributed delivery guarantees **at-least-once** delivery, receiver applications MUST implement idempotency handling:

1. **Deduplication Store**:
   - Store incoming `x-orbitox-delivery-id` values in a fast deduplication cache (e.g. Redis `SET NX` or PostgreSQL table with primary key).
   - Recommended TTL: **24 hours**.
2. **Idempotent Handling**:
   - If the delivery ID has already been processed within the last 24 hours, respond immediately with HTTP `200 OK` without re-executing side effects (e.g., provisioning emails, billing charges).
3. **Response Timeout**:
   - OrbitoX workers enforce a 5-second HTTP timeout (`AbortSignal.timeout(5000)`).
   - Receiver endpoints must return HTTP 2xx within 5 seconds. Long-running asynchronous tasks must be queued locally after acknowledging receipt.

---

## 5. Worker Concurrency & Retry Architecture

### 5.1 Atomic Multi-Worker Claiming
Outbox sweep workers and saga dispatchers run across multiple server instances. Race conditions are eliminated at the database level:
- Workers claim batches of pending messages using a PostgreSQL Common Table Expression (CTE) with `FOR UPDATE SKIP LOCKED`.
- Two concurrent workers will never claim or process the same message simultaneously.
- Claims have a durable lease duration (`claimExpiresAt`). If a worker crashes or hangs, the lease expires and another worker automatically reclaims the message.

### 5.2 Stale-Worker Fencing
External HTTP deliveries occur **strictly outside** of database transactions to avoid holding connection locks open across network boundaries. When updating the record status to `DISPATCHED` or `FAILED`, the worker executes a compare-and-set query fenced by:
```sql
WHERE "id" = $id AND "claimOwner" = $workerId AND "status" = 'PROCESSING'
```
If a worker was paused (e.g. during GC pause or container freeze) and its claim expired, any subsequent status write is rejected with 0 rows affected, ensuring a stale worker cannot overwrite newer state.

### 5.3 Exponential Backoff & Jitter
When an HTTP delivery fails (network error, timeout, or HTTP 4xx/5xx status), the worker schedules the next delivery attempt with exponential backoff:
$$\text{delay} = \min(300000\text{ ms}, 1000\text{ ms} \times 2^{(\text{retryCount} - 1)}) + \text{random}(0, 250\text{ ms})$$
- The message is updated to `status: 'PENDING'` with `nextAttemptAt = NOW() + delay`.
- Worker claiming sweeps ignore messages where `nextAttemptAt > NOW()`.

### 5.4 Dead-Letter State (`FAILED`) & Manual Replay
- When `retryCount >= maxAttempts` (default: 5 attempts), the message transitions to `status: 'FAILED'` and `lastError` is recorded.
- Dead-lettered messages are excluded from automatic claiming sweeps.
- Operations teams can inspect dead-lettered events and trigger `replayOutboxMessage(id)`. This resets `status: 'PENDING'` and `nextAttemptAt = NOW()` while strictly preserving the original event ID, aggregate ID, tenant ID, and payload.
