# Part 22 — Engineering Rules
### *The Laws Every OrbitoX Engineer Must Follow — No Exceptions*

---

## Why Rules?

Architecture documents describe what to build.
Engineering rules describe how to behave while building it.

These rules exist because good intentions are not enough. Every shortcut ever taken in the name of "we'll fix it later" has a cost. These rules are the collective wisdom of every hard lesson learned — codified so we don't relearn them.

**Violation of these rules is a code review block, not a suggestion.**

---

## Section A — Data Rules

### A1. Never Query Another Service's Database

```typescript
// ❌ BLOCK THIS IN CODE REVIEW
const user = await db.query('SELECT * FROM auth.users WHERE id = $1', [userId]);

// ✅ ONLY ACCEPTABLE APPROACH
const user = await userService.findById(userId);
// Or via event: subscribe to auth.user.created → store local projection
```

### A2. Always Include `context_id` in Every Query

```typescript
// ❌ BLOCK — missing context scope
const leads = await leadRepo.findAll();

// ✅ REQUIRED
const leads = await leadRepo.findAll({ contextId: ctx.contextId });
```

### A3. Never Hard-Delete Business Data Without an Audit Entry

```typescript
// ❌ BLOCK — silent delete
await leadRepo.delete(leadId);

// ✅ REQUIRED — soft delete + audit
await leadRepo.softDelete(leadId);
await auditCapability.log({ action: 'crm.lead.deleted', entityId: leadId, ... });
await eventBus.emit({ name: 'crm.lead.deleted', payload: { leadId } });
```

### A4. Never Store PII in Application Logs

```typescript
// ❌ BLOCK — PII in logs
logger.info('User registered', { email: user.email, phone: user.phone });

// ✅ REQUIRED — IDs only in logs
logger.info('User registered', { userId: user.id, contextId: ctx.contextId });
```

### A5. Never Modify Existing Migrations

```
❌ Editing migrations/001_create_leads.sql after it has been applied
✅ Create a new migration: migrations/003_alter_leads_add_score.sql
```

---

## Section B — API Rules

### B1. Always Version APIs

```typescript
// ❌ BLOCK — unversioned API
@Controller('leads')

// ✅ REQUIRED
@Controller('v1/leads')
```

### B2. Never Return Raw Database Errors to Clients

```typescript
// ❌ BLOCK — leaks internals
catch (error) {
  res.status(500).json({ error: error.message });
  // "duplicate key value violates unique constraint "leads_email_context_id_key""
}

// ✅ REQUIRED — generic error + log internally
catch (error) {
  logger.error('Lead creation failed', { error, contextId: ctx.contextId });
  throw new ConflictException('A lead with this email already exists');
}
```

### B3. Always Paginate List Endpoints

```typescript
// ❌ BLOCK — unbounded list
async getLeads(): Promise<Lead[]> {
  return this.leadRepo.findAll();  // could return 100,000 rows
}

// ✅ REQUIRED
async getLeads(@Query() query: PaginationQuery): Promise<PaginatedResult<Lead>> {
  return this.leadRepo.findAll({
    page: query.page ?? 1,
    limit: Math.min(query.limit ?? 20, 100),  // max 100 per page
    contextId: ctx.contextId,
  });
}
```

### B4. Always Validate Input with DTOs

```typescript
// ❌ BLOCK — trusting raw input
async create(@Body() body: any) {
  return this.leadService.create(body);
}

// ✅ REQUIRED
async create(@Body() dto: CreateLeadDto) {
  return this.leadService.create(dto);
}

// DTO with validation
export class CreateLeadDto {
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value.trim())
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsIn(['new', 'contacted', 'qualified', 'lost', 'won'])
  status: string;
}
```

### B5. Always Use the Standard Response Envelope

```typescript
// ❌ BLOCK — inconsistent response shape
res.json({ leads: [...] });
res.json({ data: [...], meta: { ... } });
res.json([...]);

// ✅ REQUIRED — use the platform response wrapper
return ApiResponse.success(leads, {
  pagination: { page: 1, limit: 20, total: 142 }
});

// Result:
// {
//   "success": true,
//   "data": [...],
//   "pagination": { "page": 1, "limit": 20, "total": 142 },
//   "requestId": "abc-123",
//   "timestamp": "2026-01-15T09:30:00Z"
// }
```

---

## Section C — Plugin Rules

### C1. Plugins Must Never Import From Other Plugins

```typescript
// ❌ BLOCK — direct plugin coupling
import { LeadService } from '@orbitox/crm/lead.service';

// ✅ REQUIRED — communicate via event bus
@EventSubscriber('crm.lead.converted')
async onLeadConverted(event: PlatformEvent) { ... }

// Or via platform API capability
const lead = await platformApi.get(`/api/v1/crm/leads/${leadId}`);
```

### C2. Plugins Must Declare All Permissions They Use

```json
// manifest.json — every permission used must be declared
{
  "permissions": [
    "crm.leads.create",
    "crm.leads.read",
    "crm.leads.update",
    "crm.leads.delete"
  ]
}
// If a permission is not declared here — it doesn't exist in the RBAC system
```

### C3. Every Plugin Event Must Follow the Naming Convention

```typescript
// ❌ BLOCK
eventBus.emit({ name: 'LeadCreated' });
eventBus.emit({ name: 'lead_created' });
eventBus.emit({ name: 'created' });

// ✅ REQUIRED: {domain}.{entity}.{action}
eventBus.emit({ name: 'crm.lead.created' });
```

### C4. Every Plugin Must Have Tests

```
Minimum coverage required: 80% for backend services
Required test types:
  ✅ Unit tests for all service methods
  ✅ Integration tests for all API routes
  ✅ Tests for all event handlers
  ✅ Migration rollback test (can the migration be reversed?)
```

### C5. Every Plugin Migration Must Be Idempotent

```sql
-- ❌ BLOCK — fails if run twice
CREATE TABLE crm.leads (...);

-- ✅ REQUIRED
CREATE TABLE IF NOT EXISTS crm.leads (...);

-- ❌ BLOCK — fails if column already exists
ALTER TABLE crm.leads ADD COLUMN score INTEGER;

-- ✅ REQUIRED
ALTER TABLE crm.leads
  ADD COLUMN IF NOT EXISTS score INTEGER;
```

---

## Section D — Security Rules

### D1. Never Store Secrets in Code, ENV Files, or ConfigMaps

```typescript
// ❌ BLOCK — secret in code
const STRIPE_KEY = 'sk_live_abc123...';

// ❌ BLOCK — secret in committed .env
STRIPE_KEY=sk_live_abc123  // in .env committed to git

// ✅ REQUIRED
const stripeKey = await secretsService.get('billing/stripe/secret_key');
```

### D2. Always Fail Closed on Permission Checks

```typescript
// ❌ BLOCK — fails open
let allowed = false;
if (user.role === 'admin') allowed = true;
if (user.role === 'manager') allowed = true;
// If role is undefined → allowed stays false → ok but wrong pattern

// ✅ REQUIRED — explicit check, explicit error
const allowed = await policyEngine.check({ userId, permission: 'crm.leads.delete', contextId });
if (!allowed) throw new ForbiddenException('You do not have permission to delete leads');
```

### D3. Always Validate Webhook Signatures

```typescript
// ❌ BLOCK — trusting raw webhook payload
@Post('/webhooks/stripe')
async handleStripeWebhook(@Body() body: any) {
  await this.processPayment(body);
}

// ✅ REQUIRED — verify HMAC before processing
@Post('/webhooks/stripe')
async handleStripeWebhook(
  @Body() rawBody: Buffer,
  @Headers('stripe-signature') signature: string,
) {
  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  await this.processPayment(event);
}
```

### D4. Always Sanitize User Input

```typescript
// ❌ BLOCK — raw user input into HTML
const html = `<div>${user.bio}</div>`;

// ✅ REQUIRED
const html = `<div>${sanitize(user.bio)}</div>`;

// ❌ BLOCK — raw user input into SQL (even with ORMs, be careful with raw queries)
db.query(`SELECT * FROM leads WHERE name LIKE '%${search}%'`);

// ✅ REQUIRED — parameterized always
db.query(`SELECT * FROM leads WHERE name ILIKE $1`, [`%${search}%`]);
```

---

## Section E — Observability Rules

### E1. Every Mutation Produces an Audit Log Entry

```
CREATE → audit entry
UPDATE → audit entry (with before/after values)
DELETE → audit entry
EXPORT → audit entry
PERMISSION CHANGE → audit entry
LOGIN → audit entry
API KEY CREATED/REVOKED → audit entry
```

### E2. Every Request Must Include a Trace

```typescript
// Automatically handled by OpenTelemetry middleware — but ensure it's wired up
// Every handler/service must propagate the trace context (never create a new one mid-request)
```

### E3. Every New Service Must Ship With Dashboards

When you add a new service or plugin, the following must be created before the PR is merged:

- Grafana dashboard with: request rate, error rate, latency P95/P99
- At least 1 alert rule: error rate > 1% for 5 minutes
- Health check endpoint: `GET /health`

---

## Section F — Code Quality Rules

### F1. No `any` in TypeScript

```typescript
// ❌ BLOCK
function processLead(lead: any) { ... }
const result: any = await api.get(...);

// ✅ REQUIRED
function processLead(lead: Lead) { ... }
const result: LeadApiResponse = await api.get<LeadApiResponse>(...);
```

### F2. No Magic Numbers or Strings

```typescript
// ❌ BLOCK
if (lead.score > 7) { ... }
setTimeout(fn, 86400000);

// ✅ REQUIRED
const HIGH_LEAD_SCORE_THRESHOLD = config.get('crm.leadScoreThreshold') ?? 7;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
if (lead.score > HIGH_LEAD_SCORE_THRESHOLD) { ... }
setTimeout(fn, ONE_DAY_MS);
```

### F3. Every Public Function Must Have a JSDoc Comment

```typescript
// ❌ BLOCK — no documentation
async convertLead(leadId: string): Promise<Customer> { ... }

// ✅ REQUIRED
/**
 * Converts a qualified lead into a customer.
 * Emits: crm.lead.converted
 * Requires: crm.leads.update + crm.customers.create permissions
 *
 * @param leadId - UUID of the lead to convert
 * @param ctx - current request context
 * @throws {NotFoundException} if lead not found
 * @throws {ConflictException} if lead already converted
 */
async convertLead(leadId: string, ctx: RequestContext): Promise<Customer> { ... }
```

---

## The Engineering Rules Checklist (Code Review Gate)

Every PR must pass this checklist before merge:

### Data
- [ ] No cross-service database queries
- [ ] All queries include `context_id`
- [ ] Soft deletes with audit entries
- [ ] No PII in application logs
- [ ] Migrations are idempotent

### API
- [ ] All routes are versioned (`v1/`, `v2/`)
- [ ] All list routes are paginated
- [ ] All inputs validated with DTOs
- [ ] All responses use standard envelope
- [ ] No raw database errors returned to client

### Plugin
- [ ] No imports from other plugins
- [ ] All permissions declared in manifest
- [ ] Events follow naming convention
- [ ] Tests present and passing (>80% coverage)

### Security
- [ ] No secrets in code or committed env files
- [ ] Fail-closed permission checks
- [ ] Webhook signatures validated
- [ ] User input sanitized

### Observability
- [ ] Mutations produce audit log entries
- [ ] New service has Grafana dashboard
- [ ] New service has at least one alert rule

### Code Quality
- [ ] No `any` types
- [ ] No magic numbers or strings
- [ ] Public functions documented

---

*This completes the 22-part OrbitoX Platform Bible.*

*Return to: [README — Master Index](./README.md)*
