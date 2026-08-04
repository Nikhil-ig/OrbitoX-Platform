# Part 14 — Observability
### *Five Independent Data Streams — Because Not Every Log Is the Same*

---

## The Five Log Streams

Most platforms have one log. One place where everything goes.

```
[INFO] User logged in
[ERROR] Database connection failed
[INFO] Lead created
[WARN] Rate limit exceeded
[INFO] Invoice approved
```

This creates a problem. When a compliance auditor asks: *"Who deleted this invoice and when?"* — you are searching through terabytes of mixed logs.

OrbitoX separates observability into **five independent, first-class data streams**, each with its own storage, retention, and consumer:

| Stream | Purpose | Storage | Retention |
|--------|---------|---------|-----------|
| **System Logs** | Infrastructure health | Loki | 30 days |
| **Application Logs** | Developer troubleshooting | Loki | 90 days |
| **Audit Logs** | Compliance & accountability | Immutable DB | 7 years |
| **Business Event Logs** | Analytics & workflows | TimeSeries DB | 2 years |
| **Security Logs** | Threat detection | SIEM | 1 year |

---

## Stream 1: System Logs

**Who cares:** DevOps / SRE
**Purpose:** Infrastructure health, resource usage, pod lifecycle

```
Pod started
Container restarted (OOMKilled)
CPU usage > 90% for 5 minutes
Disk at 85% capacity
PostgreSQL replica lag > 30s
Redis memory > 80%
Load balancer health check failed
Network latency spike detected
```

### Stack
- **Collector:** Node Exporter, cAdvisor
- **Storage:** Prometheus (metrics) + Loki (logs)
- **Visualization:** Grafana dashboards
- **Alerts:** Alertmanager → PagerDuty / Slack

### Key Metrics

```yaml
# SLO: P99 latency < 200ms
orbitox_request_duration_p99 < 0.2

# SLO: Error rate < 0.1%
orbitox_request_error_rate < 0.001

# SLO: Availability > 99.99%
orbitox_uptime_ratio > 0.9999

# Database
pg_replica_lag_seconds < 30
pg_connections_active < 0.8 * pg_connections_max

# Redis
redis_memory_used_ratio < 0.8
redis_connected_clients < 5000
```

---

## Stream 2: Application Logs

**Who cares:** Developers / Engineering
**Purpose:** Debugging, exception tracking, request tracing

```
[INFO]  POST /api/v1/crm/leads 201 (145ms) req=abc123 ctx=tenant-xyz
[ERROR] ValidationError: email must be a valid email address
        at LeadService.create (lead.service.ts:47)
        req=abc123 ctx=tenant-xyz userId=user-456
[INFO]  Plugin crm loaded successfully (duration: 234ms)
[WARN]  BullMQ queue depth > 1000 — job processing may be delayed
```

### Structured Log Format

```typescript
// Every application log must be structured (JSON), never plain text
logger.info('Lead created', {
  // Context (always included)
  requestId: ctx.requestId,
  contextId: ctx.contextId,
  userId: ctx.userId,
  service: 'crm-plugin',
  operation: 'createLead',

  // Domain data
  leadId: lead.id,
  duration: Date.now() - startTime,

  // No PII in application logs
  // email: lead.email ← NEVER — PII must not appear in app logs
});

logger.error('Database query failed', {
  requestId: ctx.requestId,
  contextId: ctx.contextId,
  operation: 'findLeads',
  error: {
    message: error.message,
    code: error.code,
    stack: error.stack,          // stack trace only in non-production
  },
  query: sanitizedQuery,         // never log raw user input
});
```

### PII Rules for Application Logs

```
❌ Never log: email addresses, phone numbers, names, addresses,
              payment details, national IDs, health data, passwords
✅ Log instead: entity IDs, context IDs, action types, durations
```

### Stack

- **Collection:** Pino (NestJS) → Loki (via Promtail / Fluent Bit)
- **Search:** Grafana Loki query interface
- **Error tracking:** Sentry (for exception aggregation)
- **Tracing:** OpenTelemetry → Grafana Tempo / Jaeger

---

## Stream 3: Audit Logs (Immutable)

**Who cares:** Compliance, Finance, Legal, Customers
**Purpose:** Unalterable record of who did what to which record and when

### Critical Properties

```
Immutable    — once written, never modified or deleted
Complete     — every mutation creates an audit entry
Tamper-proof — append-only table with hash chaining
Exportable   — compliance reports on demand
Searchable   — by user, entity, action, date range
```

### Audit Log Schema

```sql
CREATE TABLE audit.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What happened
  action          VARCHAR(200) NOT NULL,  -- 'crm.lead.deleted'
  entity_type     VARCHAR(100) NOT NULL,  -- 'lead'
  entity_id       UUID NOT NULL,

  -- Who did it
  user_id         UUID,                   -- null = system action
  user_email      VARCHAR(255),           -- snapshot at time of action
  user_name       VARCHAR(255),           -- snapshot at time of action
  impersonated_by UUID,                   -- if admin was impersonating

  -- Where
  context_id      UUID NOT NULL,
  ip_address      INET,
  user_agent      TEXT,
  request_id      UUID,

  -- Before & After
  old_value       JSONB,                  -- state before action
  new_value       JSONB,                  -- state after action
  changed_fields  TEXT[],                 -- which fields changed

  -- Why
  reason          TEXT,                   -- user-provided reason (for sensitive actions)

  -- When
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Integrity
  previous_hash   VARCHAR(64),            -- SHA256 of previous row
  row_hash        VARCHAR(64)             -- SHA256 of this row's content
) PARTITION BY RANGE (occurred_at);

-- CRITICAL: No UPDATE or DELETE permissions on this table
-- Only INSERT is allowed — enforced at PostgreSQL role level
REVOKE UPDATE ON audit.events FROM app_user;
REVOKE DELETE ON audit.events FROM app_user;
```

### Mandatory Audit Actions

```typescript
// These actions MUST always produce an audit entry:
const MANDATORY_AUDIT_ACTIONS = [
  'user.created', 'user.deleted', 'user.password_changed',
  'user.role_changed', 'user.impersonated',
  'lead.deleted', 'customer.deleted',
  'invoice.created', 'invoice.approved', 'invoice.deleted',
  'payment.processed', 'payment.refunded',
  'subscription.changed', 'subscription.cancelled',
  'plugin.installed', 'plugin.uninstalled',
  'context.suspended', 'context.deleted',
  'export.performed',                    // data export
  'settings.changed',                    // any configuration change
  'api_key.created', 'api_key.revoked',
  'permission.granted', 'permission.revoked',
  'role.created', 'role.deleted',
];
```

---

## Stream 4: Business Event Logs

**Who cares:** Product, Analytics, Workflow Engine
**Purpose:** Understanding business activity patterns — not debugging

```
Lead Created          context=tenant-xyz  source=website  assigned_to=user-abc
Lead Converted        context=tenant-xyz  value=₹50,000
Invoice Paid          context=tenant-xyz  amount=₹50,000
Customer Registered   context=tenant-xyz  plan=trial
Subscription Renewed  context=tenant-xyz  mrr_impact=+₹5,000
Workflow Triggered    context=tenant-xyz  workflow=lead-won  steps=6
```

### Difference from Application Logs

| Application Logs | Business Event Logs |
|-----------------|---------------------|
| For developers | For product/analytics team |
| Contains error details | Contains business facts |
| Short retention (90 days) | Longer retention (2 years) |
| Technical context | Business context |
| Stored in Loki | Stored in TimeSeries DB or data warehouse |

### Implementation

```typescript
// Business events are published via the Event Bus AND stored as a log stream
@EventSubscriber('*')                    // capture all events
export class BusinessEventLogger {
  async handle(event: PlatformEvent): Promise<void> {
    // Only store business-meaningful events (not system/infra events)
    if (!isBusinessEvent(event.name)) return;

    await this.analyticsStore.append({
      eventName: event.name,
      contextId: event.contextId,
      tenantId: event.tenantId,
      userId: event.userId,
      payload: sanitize(event.payload), // strip PII before storing
      occurredAt: event.occurredAt,
    });
  }
}
```

---

## Stream 5: Security Logs

**Who cares:** Security team, SOC, Incident response
**Purpose:** Detecting and investigating security incidents

```
FAILED_LOGIN      email=unknown@email.com  ip=1.2.3.4  attempts=5
PERMISSION_DENIED userId=user-abc  resource=billing.invoices  ip=1.2.3.4
RATE_LIMIT_HIT    ip=5.6.7.8  endpoint=/api/v1/auth/login  count=100/min
API_KEY_MISUSE    keyId=key-xyz  ip=external  suspicious=true
ROLE_ESCALATION   userId=user-abc  oldRole=staff  newRole=admin  changedBy=?
SUSPICIOUS_EXPORT userId=user-abc  rows=50000  at=3am
MFA_BYPASS_ATTEMPT userId=user-abc  method=backup_code  ip=new_location
NEW_DEVICE_LOGIN  userId=user-abc  device=new  ip=new_country
```

### Automated Alerts

```typescript
// Security rules evaluated in real-time
const SECURITY_RULES = [
  {
    name: 'Brute force login attempt',
    trigger: 'auth.login.failed',
    condition: 'count > 5 within 5 minutes from same IP',
    action: 'alert + temporary IP block',
  },
  {
    name: 'Unusual export volume',
    trigger: 'export.performed',
    condition: 'rows > 10000 OR time between 11pm-6am',
    action: 'alert security team',
  },
  {
    name: 'Admin role granted to new user',
    trigger: 'user.role_changed',
    condition: 'newRole contains admin|superadmin',
    action: 'alert security team + require MFA confirmation',
  },
  {
    name: 'API key used from new country',
    trigger: 'api_key.used',
    condition: 'country !== last_seen_country',
    action: 'alert key owner',
  },
];
```

---

## Observability Stack

```
┌──────────────────────────────────────────────────────────┐
│                   COLLECTION LAYER                       │
│                                                          │
│  OpenTelemetry SDK (all services)                        │
│    → Traces (spans)                                      │
│    → Metrics (counters, histograms)                      │
│    → Logs (structured JSON)                              │
│                                                          │
│  Promtail / Fluent Bit (log shipping from pods)          │
│  Node Exporter / cAdvisor (system metrics)               │
└──────────────────────────────┬───────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────┐
│                   STORAGE LAYER                          │
│                                                          │
│  Prometheus (metrics, 15-day retention)                  │
│  Loki (logs, 90-day retention)                           │
│  Grafana Tempo / Jaeger (traces, 7-day retention)        │
│  PostgreSQL audit.events (audit logs, 7 years)           │
│  ClickHouse / BigQuery (business events, 2 years)        │
│  ElasticSearch / Wazuh (security events, 1 year)         │
└──────────────────────────────┬───────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────┐
│                VISUALIZATION & ALERTING                  │
│                                                          │
│  Grafana (all dashboards)                                │
│  Alertmanager → PagerDuty / Slack / Email                │
│  Sentry (exception tracking)                             │
│  Custom Audit UI (for compliance reports)                │
└──────────────────────────────────────────────────────────┘
```

---

## Distributed Tracing

Every request generates a trace. Every trace has spans. Every span has context.

```
Trace: POST /api/v1/crm/leads (req=abc123) — 145ms total

  ├── Span: context-resolver              2ms
  ├── Span: auth.verifyJWT                5ms
  ├── Span: rbac.checkPermission          3ms
  ├── Span: LeadService.create           80ms
  │     ├── Span: LeadRepository.insert  45ms
  │     │     └── db.query pg-primary    40ms
  │     ├── Span: searchCapability.index  20ms
  │     └── Span: eventBus.emit           2ms
  └── Span: serialization                 1ms
```

The trace ID (`req=abc123`) is propagated through:
- HTTP headers: `traceparent`, `X-Request-ID`
- All log entries: `requestId: abc123`
- All audit entries: `request_id: abc123`
- All event envelopes: `requestId: abc123`

One trace ID connects every log, every audit entry, and every event from a single request.

---

*Next: [Part 15 — AI Architecture](./15_AI_Architecture.md)*
