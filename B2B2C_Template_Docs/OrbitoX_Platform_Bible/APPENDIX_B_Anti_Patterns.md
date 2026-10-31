# Appendix B — Anti-Patterns & What Never to Do
### *Every Mistake Codified So You Never Make It*

---

## What Is an Anti-Pattern?

An anti-pattern is a common solution to a recurring problem that seems reasonable at first but causes serious damage over time.

These are not theoretical. Every anti-pattern listed here has been seen in real production systems. Every one of them was introduced by a well-meaning developer trying to get something done quickly.

**The cost of these shortcuts is paid by the team that inherits the codebase.**

---

## Category 1: Data Anti-Patterns

### ❌ The Cross-Service Database Query

```typescript
// Plugin: CRM queries Auth's database directly
const user = await db.query(`
  SELECT id, name, email, role
  FROM auth.users
  WHERE id = $1
`, [userId]);
```

**Why it seems fine:** It's just a SELECT. No harm.

**Why it's catastrophic:**
- The Auth team renames `auth.users` to `auth.identities` → CRM silently breaks in production
- Auth schema is now an API contract that can never change
- Auth can never be extracted to its own service
- The two services are now permanently coupled at the schema level
- A schema migration in Auth requires coordinating with every service that reads its tables

**The fix:** `GET /api/v1/users/{id}` or subscribe to `auth.user.updated` events.

---

### ❌ The Missing context_id

```typescript
// Looks fine. Returns quickly. Works in local tests.
async getLeads(): Promise<Lead[]> {
  return this.db.query(`SELECT * FROM crm.leads`);
}
```

**Why it's catastrophic:**
- Returns leads from ALL tenants to ANY tenant that calls this endpoint
- This is a data breach at scale
- GDPR violation: one customer sees another customer's data
- Discovered in production: catastrophic reputational and legal damage

**The fix:** Always. `context_id`. In. Every. Query. No exceptions.

---

### ❌ Hard Deletion Without Audit

```typescript
await db.query(`DELETE FROM crm.leads WHERE id = $1`, [leadId]);
```

**Why it's catastrophic:**
- User complains: "My lead was deleted — who did it?"
- Answer: "We don't know."
- Compliance audit asks: "Show us all data operations from Q3"
- Answer: "We can't."
- Finance asks: "Why does the invoice show ₹0 — did someone edit the amount?"
- Answer: "We can't tell."

**The fix:** Soft delete + audit log. Always. No exceptions.

---

### ❌ Modifying an Applied Migration

```sql
-- Developer edits migrations/001_create_leads.sql after it was applied:
ALTER TABLE crm.leads ADD COLUMN score INTEGER;  -- added to existing migration file
```

**Why it's catastrophic:**
- This migration has already run on staging and production
- It will never run again
- New developer clones repo, runs migrations — gets a different schema than production
- "Works on my machine" becomes a permanent condition
- Schema drift between environments grows silently until production deploy breaks

**The fix:** Always create a new migration file. Never touch an applied one.

---

## Category 2: Architecture Anti-Patterns

### ❌ Business Logic in the Platform Kernel

```typescript
// In packages/core/context/context.service.ts
async createContext(dto: CreateContextDto) {
  const ctx = await this.contextRepo.create(dto);

  // 🚨 CRM-specific logic in the platform kernel
  await this.crm.createDefaultPipeline(ctx.id);
  await this.crm.createDefaultLeadStatuses(ctx.id);
}
```

**Why it's catastrophic:**
- The platform core now depends on the CRM plugin
- You cannot deploy the platform without the CRM
- You cannot build a school system without carrying CRM code
- The kernel is no longer domain-agnostic — it's "CRM with extras"
- Every new SaaS inherits CRM setup logic, even if CRM is not installed

**The fix:** CRM plugin subscribes to `platform.context.created` event and handles its own setup.

---

### ❌ Direct Plugin-to-Plugin Import

```typescript
// In plugins/inventory/backend/src/order.service.ts
import { InvoiceService } from '../../billing/backend/src/invoice.service';
// or
import { LeadService } from '@orbitox/crm';

const invoice = await this.invoiceService.createFromOrder(order);
```

**Why it's catastrophic:**
- Inventory cannot deploy without Billing
- Billing cannot change its API without breaking Inventory
- If either plugin is uninstalled, the other crashes
- The plugin boundary is meaningless — they are a monolith

**The fix:** Inventory emits `inventory.order.completed` → Billing subscribes and creates the invoice.

---

### ❌ Hardcoded Feature Gates

```typescript
// In the UI
function DashboardPage() {
  if (tenantId === 'big-client-abc' || tenantId === 'enterprise-xyz') {
    return <AdvancedDashboard />;
  }
  return <StandardDashboard />;
}
```

**Why it's catastrophic:**
- When "big-client-abc" churns, their ID remains in the code forever
- Every new enterprise client requires a code change and deployment
- QA must re-test the dashboard every time any enterprise client changes
- The feature cannot be gradually rolled out — it's all-or-nothing per hardcoded ID

**The fix:** Feature Flag Engine. `isEnabled('advanced-dashboard', contextId)`.

---

### ❌ Returning Unbounded Lists

```typescript
// "It only has 10 records now..."
async getLeads(): Promise<Lead[]> {
  return db.query(`SELECT * FROM crm.leads WHERE context_id = $1`, [contextId]);
}
```

**Why it's catastrophic:**
- The customer grows. 10 leads becomes 10,000. Becomes 100,000.
- One API call fetches 100,000 rows, serializes them, sends them across the network
- The API times out. Memory spikes. The pod crashes. All tenants are affected.
- The fix is now urgent, in production, under pressure.

**The fix:** Always paginate. Default limit: 20. Maximum limit: 100. No exceptions.

---

## Category 3: Security Anti-Patterns

### ❌ Secrets in Environment Variables Committed to Git

```bash
# .env file committed to the repo
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@prod-db.company.com:5432/orbitox
STRIPE_SECRET_KEY=<STRIPE_SECRET_KEY>
JWT_PRIVATE_KEY=<RSA_PRIVATE_KEY>
OPENAI_API_KEY=<OPENAI_API_KEY>
```

**Why it's catastrophic:**
- One developer's laptop compromise → all production secrets leaked
- Git history cannot be fully purged — the secret is permanent in the commit graph
- Anyone with repo access (contractors, interns, ex-employees) has production credentials
- No audit trail of who accessed the secrets or when they were rotated

**The fix:** All secrets go into AWS KMS / Secrets Manager or HashiCorp Vault. `.env` files are gitignored. `.env.example` contains keys with blank values only.

---

### ❌ Fail-Open Authorization

```typescript
// "I'll fix the authorization properly later"
async deleteLead(leadId: string, userId: string) {
  const lead = await this.leadRepo.findById(leadId);

  // Missing permission check — anyone authenticated can delete any lead
  await this.leadRepo.delete(leadId);
}
```

**Why it's catastrophic:**
- A junior staff member calls `DELETE /api/v1/leads/123` from Postman
- The lead — belonging to a different context — is silently deleted
- No one notices until the customer complains weeks later
- No audit trail because the delete was also not audited

**The fix:** Every mutation handler requires an explicit permission check. Fail closed.

---

### ❌ Trusting the Client's context_id

```typescript
// Frontend sends: { contextId: 'tenant-admin-xyz', leadId: '123' }
// The API trusts this without verifying

async getLead(@Body() body: { contextId: string, leadId: string }) {
  return this.leadRepo.findById(body.leadId, body.contextId);
  // An attacker sends contextId: 'competitor-tenant'
  // They get competitor's lead data
}
```

**Why it's catastrophic:**
- Any user can change the `contextId` in their request and access another tenant's data
- Insecure Direct Object Reference (IDOR) — OWASP Top 10 #1

**The fix:** `contextId` is ALWAYS resolved from the JWT or domain, never from the request body. The request context is injected by the middleware, not trusted from the client.

---

## Category 4: Code Quality Anti-Patterns

### ❌ God Service

```typescript
// CrmService does everything
@Injectable()
export class CrmService {
  createLead() {}
  updateLead() {}
  deleteLead() {}
  createCustomer() {}
  updateCustomer() {}
  createPipeline() {}
  addDealToPipeline() {}
  generateReport() {}
  sendNotification() {}
  calculateCommission() {}
  syncToExternalCRM() {}
  // ... 50 more methods
}
```

**Why it's catastrophic:**
- Impossible to unit test (everything is in one class)
- Impossible to deploy parts independently
- One developer's change breaks another's feature
- Understanding the codebase takes weeks

**The fix:** One service per entity or domain concept. `LeadService`, `CustomerService`, `PipelineService`, `DealService`. Each focused, small, testable.

---

### ❌ Any Type Abuse

```typescript
// "It's just a prototype"
async processWebhook(payload: any): Promise<any> {
  const data: any = payload.data;
  const result: any = await this.service.process(data);
  return result;
}
```

**Why it's catastrophic:**
- TypeScript's type safety is completely bypassed
- Refactoring is dangerous — nothing catches mismatches at compile time
- Runtime errors appear in production that would have been caught at compile time
- New developers have no idea what shape `payload` is expected to have

**The fix:** Define types for everything. `StripeWebhookPayload`, `ProcessedWebhookResult`. Enforce `no-explicit-any` in ESLint.

---

### ❌ Magic Strings and Numbers

```typescript
// From a real codebase — nobody knows what 86400000 is
if (Date.now() - user.lastLogin > 86400000) {
  sendReminderEmail(user);
}

if (lead.status === 'WON') { ... }      // Is this 'won' or 'Won' or 'WON'?
if (plan.id === 'plan_enterprise_v2') { ... }  // What if the plan ID changes?
```

**The fix:**

```typescript
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const INACTIVE_USER_THRESHOLD_MS = config.get('auth.inactiveUserThresholdMs') ?? ONE_DAY_MS;

enum LeadStatus {
  NEW = 'new', CONTACTED = 'contacted', WON = 'won', LOST = 'lost'
}

const ENTERPRISE_PLAN_IDS = config.get('billing.enterprisePlanIds') as string[];
```

---

## The Anti-Pattern Gut Check

Before committing any code, ask:

1. **Am I querying another service's database?** → Stop. Use the API.
2. **Is `context_id` in every query?** → Verify. Always.
3. **Is any deletion without an audit entry?** → Stop. Add audit.
4. **Am I importing from another plugin?** → Stop. Use events.
5. **Is any value hardcoded that could change per tenant?** → Stop. Make it config.
6. **Is any list query missing pagination?** → Stop. Add pagination.
7. **Is any permission check missing?** → Stop. Add it and fail closed.
8. **Is any secret in source code or a committed file?** → Stop. Move to vault.
9. **Is there an `any` type?** → Stop. Define the type.
10. **Am I putting business logic in the platform kernel?** → Stop. Move it to a plugin.

If any answer is "yes" → the code is not ready to merge.

---

*Return to: [README — Master Index](./README.md)*
