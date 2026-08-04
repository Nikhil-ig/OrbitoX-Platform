# Part 09 — Data Philosophy
### *How Data Is Owned, Stored, Scoped, Shared, and Kept Consistent*

---

## The Governing Rule

> **Each service or plugin owns exactly one database schema. Nobody else writes to it.**

This single rule prevents the most common class of architectural failures in SaaS platforms:
- Schema coupling between services
- Silent breakage when one team changes a table
- Inability to deploy services independently
- Data isolation failures between tenants

---

## Data Ownership Map

```
packages/core/auth         →  schema: auth
                               owns:  users, sessions, mfa_tokens, oauth_tokens, api_keys

packages/core/context      →  schema: platform
                               owns:  contexts, context_configs, context_domains

packages/core/rbac         →  schema: rbac
                               owns:  roles, permissions, role_assignments, permission_grants

packages/core/billing      →  schema: billing
                               owns:  subscriptions, invoices, payments, plans, coupons

packages/core/storage      →  schema: storage
                               owns:  files, file_versions, file_shares

packages/core/workflow     →  schema: workflow
                               owns:  workflow_definitions, workflow_runs, workflow_steps

packages/core/audit        →  schema: audit
                               owns:  audit_events (append-only, immutable)

plugins/crm                →  schema: crm
                               owns:  leads, customers, pipeline_stages, activities

plugins/inventory          →  schema: inventory
                               owns:  products, stock, warehouses, stock_movements

plugins/hms                →  schema: hms
                               owns:  patients, doctors, appointments, prescriptions

plugins/school             →  schema: school
                               owns:  students, attendance, grades, courses

plugins/restaurant         →  schema: restaurant
                               owns:  menus, orders, tables, reservations

plugins/payroll            →  schema: payroll
                               owns:  employees, salaries, payslips, deductions
```

---

## Context Scoping: `context_id` Everywhere

Every table that holds business data **must** include a `context_id` column.

```sql
-- ✅ CORRECT — data is always context-scoped
CREATE TABLE crm.leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id    UUID NOT NULL REFERENCES platform.contexts(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255),
  status        VARCHAR(50) NOT NULL DEFAULT 'new',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Row-Level Security enforced at the database level
ALTER TABLE crm.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_rls ON crm.leads
  USING (context_id = current_setting('app.current_context_id')::UUID);
```

```typescript
// ✅ CORRECT — repository always uses context from the request
class LeadRepository extends BaseRepository<Lead> {
  async findAll(contextId: string, filters?: LeadFilters): Promise<Lead[]> {
    // context_id is ALWAYS in the WHERE clause — never optional
    return this.db.query(
      `SELECT * FROM crm.leads WHERE context_id = $1 AND status = ANY($2)`,
      [contextId, filters?.status ?? Object.values(LeadStatus)]
    );
  }
}

// ❌ FORBIDDEN — no context scope
class LeadRepository {
  async findAll(): Promise<Lead[]> {
    return this.db.query(`SELECT * FROM crm.leads`); // data leak!
  }
}
```

---

## Data Access Patterns

### Pattern 1: Direct Ownership (Within Plugin)

```
CRM Plugin → crm.leads table
             ✅ Direct SQL queries allowed
```

### Pattern 2: API (Cross-Service Read)

```
CRM Plugin needs user name → GET /api/v1/users/{id}
                             ✅ Call the Auth service API
                             ❌ Never: SELECT * FROM auth.users WHERE id = ?
```

### Pattern 3: Events (Cross-Service Write / Async)

```
User registered in Auth     → Emits: auth.user.created
CRM Plugin subscribes       → Creates a contact record
                             ✅ Decoupled, async
                             ❌ Never: INSERT INTO auth.users (...) — writing to another service
```

### Pattern 4: Read Models / Projections (CQRS)

When a service frequently reads data from another service's domain, maintain a **local read model**:

```typescript
// CRM plugin keeps a local projection of users it needs
// Populated and updated via events — no cross-service DB queries
CREATE TABLE crm.user_projections (
  user_id       UUID PRIMARY KEY,
  context_id    UUID NOT NULL,
  name          VARCHAR(255),
  email         VARCHAR(255),
  role          VARCHAR(100),
  synced_at     TIMESTAMPTZ
);

// Updated when auth events arrive
@EventSubscriber('auth.user.updated')
async onUserUpdated(payload: UserUpdatedPayload) {
  await this.userProjectionRepo.upsert({
    userId: payload.userId,
    name: payload.name,
    email: payload.email,
    syncedAt: new Date(),
  });
}
```

---

## CQRS — Command Query Responsibility Segregation

OrbitoX separates write and read paths for performance and scalability.

```
Write Path (Commands):
  API Request → Validate → Business Logic → Write to PostgreSQL Primary → Emit Event

Read Path (Queries):
  API Request → Read from PostgreSQL Replica (or Redis cache or Search index)
```

```typescript
// Command (write)
@Post('/leads')
async createLead(@Body() dto: CreateLeadDto, @Context() ctx: RequestContext) {
  // Goes to primary PostgreSQL — ensures consistency
  return this.commandBus.execute(new CreateLeadCommand(dto, ctx));
}

// Query (read)
@Get('/leads')
async getLeads(@Query() query: GetLeadsQuery, @Context() ctx: RequestContext) {
  // Can go to read replica, Redis cache, or search index
  return this.queryBus.execute(new GetLeadsQuery(query, ctx));
}
```

---

## Search Index

Every entity that needs to be searchable is indexed in the Search Service.

```typescript
// After creating a lead, index it
await searchCapability.index({
  index: 'crm.leads',
  id: lead.id,
  contextId: ctx.contextId,
  document: {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    createdAt: lead.createdAt,
  },
});

// Search across the index
const results = await searchCapability.search({
  index: 'crm.leads',
  contextId: ctx.contextId,
  query: 'Rajesh Kumar',
  filters: { status: 'new' },
  page: 1,
  limit: 20,
});
```

---

## Cache Strategy

```
L1 Cache: In-memory (per Pod, ~100ms TTL)
  Used for: Context config, permission checks, feature flags

L2 Cache: Redis (shared cluster, ~5min TTL)
  Used for: User sessions, context resolution, API responses

L3: PostgreSQL Read Replica
  Used for: All reads that miss cache
```

### Cache Key Convention

```typescript
const CACHE_KEYS = {
  context: (id: string)        => `context:${id}:config`,
  userPerms: (uid: string, cid: string) => `user:${uid}:ctx:${cid}:permissions`,
  pluginList: (cid: string)    => `context:${cid}:plugins`,
  featureFlags: (cid: string)  => `context:${cid}:features`,
  entitySchema: (eid: string, cid: string) => `entity:${eid}:ctx:${cid}:schema`,
};
```

### Cache Invalidation

```typescript
// On config mutation — invalidate across all pods
await cacheService.invalidatePattern(`context:${contextId}:*`);
// Redis pub/sub broadcasts invalidation to all pods
// Each pod flushes its L1 cache for the affected keys
```

---

## Vector Store (AI)

Each context has an isolated vector namespace for RAG (Retrieval-Augmented Generation).

```
Vector Store (Qdrant / pgvector)
  └── Collection: crm_documents
        ├── Namespace: context-abc/   ← tenant A's documents
        ├── Namespace: context-def/   ← tenant B's documents
        └── Namespace: context-xyz/   ← tenant C's documents
```

```typescript
// Indexing a document for AI retrieval
await aiCapability.embedAndStore({
  contextId: ctx.contextId,
  collection: 'crm_documents',
  document: {
    id: lead.id,
    type: 'lead',
    content: `${lead.name} ${lead.email} ${lead.notes}`,
    metadata: { leadId: lead.id, status: lead.status },
  },
});

// Searching for relevant context before an AI response
const relevantDocs = await aiCapability.retrieve({
  contextId: ctx.contextId,
  collection: 'crm_documents',
  query: 'show me leads interested in enterprise plan',
  topK: 5,
});
```

---

## Data Lifecycle

```
Create    → Write to PostgreSQL primary
            → Index in search
            → Store embedding in vector store (if AI-enabled)
            → Emit Created event

Update    → Write to PostgreSQL primary
            → Invalidate cache
            → Update search index
            → Update vector store
            → Emit Updated event
            → Write immutable audit log entry

Delete    → Soft delete (is_deleted = true) — default
            → Remove from search index
            → Emit Deleted event
            → Write immutable audit log entry
            → Hard delete only on explicit compliance request
              (GDPR Right to Erasure)

Archive   → Move to archive table / cold storage after retention period
            → Remove from active indexes
            → Keep in audit log (forever)

Export    → Pull from read replica
            → Format via Report/Export capability
            → Stream to S3 / CDN
```

---

## Migration Rules

```
✅ Always use forward-only migrations
✅ Always timestamp migration files: 2026_01_15_add_lead_source.sql
✅ Always include a rollback plan in comments
✅ Never modify existing migrations — only add new ones
✅ Always test migrations on a staging clone of production data
✅ Plugin migrations run in isolation — never touch another plugin's schema

❌ Never rename a column in production without a multi-step migration
❌ Never drop a column — deprecate it first, remove in next major version
❌ Never alter a column type without a data migration strategy
```

---

*Next: [Part 10 — Event Bus](./10_Event_Bus.md)*
