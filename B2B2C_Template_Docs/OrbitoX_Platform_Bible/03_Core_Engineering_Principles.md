# Part 03 — Core Engineering Principles
### *The Rules That Never Change, No Matter What We Build*

---

## Why Principles Come Before Architecture

Architecture changes.
Technologies change.
Frameworks change.

Principles don't.

These principles were written before any code was committed. They will outlive every framework upgrade, every cloud migration, and every major refactor. When in doubt about a design decision, come back here first.

---

## Principle 1: Never Hardcode

**Definition:** A hardcoded value is any value that requires a code deployment to change.

### What counts as hardcoded:

```typescript
// ❌ HARDCODED — requires deployment to change
const PLAN_LIMIT = 100;
const ADMIN_EMAIL = 'admin@company.com';
const STRIPE_FEE = 0.029;
const SIDEBAR_ITEMS = ['Dashboard', 'Customers', 'Reports'];
const ROLES = ['admin', 'manager', 'staff'];

// ✅ CORRECT — loaded from configuration
const PLAN_LIMIT = await config.get('billing.planLimits.starter');
const ADMIN_EMAIL = await context.get('notifications.adminEmail');
const STRIPE_FEE = await config.get('billing.stripeFeeRate');
const SIDEBAR_ITEMS = await pluginRegistry.getMenuItems(contextId);
const ROLES = await rbac.getRolesForContext(contextId);
```

### The Hardcoding Checklist

Before shipping any code, verify none of these are hardcoded:

- [ ] Business rule values (limits, rates, thresholds)
- [ ] Menu items or navigation structure
- [ ] Form field definitions
- [ ] Role or permission names
- [ ] Workflow steps
- [ ] Feature availability
- [ ] Theme colors, fonts, logos
- [ ] Report column definitions
- [ ] Dashboard widget layout
- [ ] Integration endpoints
- [ ] Email/notification templates
- [ ] Price values
- [ ] Tax rates
- [ ] Commission structures

---

## Principle 2: Never Duplicate

**Definition:** Any logic that appears in more than one place is a maintenance liability.

### Duplication Anti-Patterns:

```
❌ AuthService in core/auth
❌ AuthService copied into crm-plugin
❌ AuthService copied into inventory-plugin

✅ One AuthService in packages/core/auth
✅ All plugins import from @orbitox/core
```

```
❌ sendEmail() in crm/src/notifications.ts
❌ sendEmail() in school/src/notifications.ts
❌ sendEmail() in hms/src/notifications.ts

✅ One sendEmail() in packages/services/notifications
✅ All plugins call: notificationService.send(...)
```

When you find yourself writing code you've written before:
1. **Stop.**
2. Find where it already exists.
3. Move it to the right shared package.
4. Import and reuse.

---

## Principle 3: Never Couple

**Definition:** Coupling means one module cannot change without breaking another.

### Levels of coupling (worst to best):

```
Level 1 (Worst):  Direct database access across services
                   crm.service reads from auth.users table directly

Level 2 (Bad):    Direct function import from another plugin
                   import { LeadService } from '@orbitox/crm'
                   used inside @orbitox/inventory

Level 3 (Acceptable): API call to another service
                        GET /api/users/{id}

Level 4 (Best):   Event-driven communication
                   UserCreated event → CRM reacts
                   No direct dependency at all
```

### The Coupling Test

Ask of any code you write:

> "If I delete [Plugin X], does [Plugin Y] break?"

If yes → they are coupled. Fix it.

The answer must always be: "No, Plugin Y continues to function, it just won't receive X's events."

---

## Principle 4: Everything Configurable

**The Configuration Hierarchy:**

```
Platform Default Config
        ↓ (overrides)
Organisation Config
        ↓ (overrides)
Tenant Config
        ↓ (overrides)
Context Config
        ↓ (overrides)
User Preference
```

Each level can override the level above. No level can access a peer's config or bypass the hierarchy.

```typescript
// Configuration resolution — always resolved in hierarchy order
async function resolveConfig(key: string, contextId: string): Promise<any> {
  return await configEngine.resolve({
    key,
    contextId,
    // Falls back through the hierarchy automatically
    fallbackChain: ['context', 'tenant', 'organisation', 'platform']
  });
}
```

---

## Principle 5: Everything Replaceable

No implementation should be impossible to swap.

```typescript
// ❌ Tied to Stripe forever
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_KEY);
stripe.paymentIntents.create(...);

// ✅ Replaceable — payment provider is an abstraction
import { PaymentProvider } from '@orbitox/core/billing';
const payment = await paymentProvider.createPayment({
  amount, currency, customerId
});
// Stripe, Razorpay, PayPal, or custom adapter — all behind the interface
```

Every external dependency (email, SMS, payment, AI, storage) must be behind a provider interface. Swapping the provider means changing one config value, not hundreds of service calls.

---

## Principle 6: Everything Observable

**Three questions you must be able to answer at any time:**

1. Is the system healthy? *(System Logs + Metrics)*
2. What did this user do? *(Audit Logs)*
3. Why is this request slow? *(Distributed Traces)*

```
Every request → OpenTelemetry trace
Every mutation → Audit log entry
Every error → Alert with full context
Every business event → Business event log
Every failed login → Security event log
```

No silent failures.
No untraced requests.
No mutations without audit.

---

## Principle 7: Everything Versioned

```typescript
// APIs — always versioned
GET /api/v1/users
GET /api/v2/users  // New version with breaking changes

// Plugins — always versioned
{
  "id": "crm",
  "version": "1.2.3",
  "minimumPlatformVersion": "2.0.0"
}

// Database schemas — always migrated, never mutated
// migrations/
//   2026_01_01_create_leads.ts
//   2026_01_15_add_lead_source_column.ts
//   2026_02_01_rename_status_to_stage.ts
```

**Rules:**
- Migrations run forward only
- Breaking API changes require a new version
- Plugin versions follow semantic versioning (MAJOR.MINOR.PATCH)
- Platform APIs support at least 2 major versions simultaneously
- Old versions are deprecated with 90-day notice, never deleted silently

---

## Principle 8: API is the Only Interface

No service reads from another service's database.

```
CRM needs user profile data:
  ❌ Never: db.query('SELECT * FROM auth.users WHERE id = ?')
  ✅ Always: await userService.findById(userId)
           // or: GET /api/v1/users/{id}

Inventory needs to know if a tenant is on paid plan:
  ❌ Never: db.query('SELECT plan FROM billing.subscriptions WHERE tenant_id = ?')
  ✅ Always: await billingService.getSubscription(tenantId)
           // or: GET /api/v1/billing/subscriptions/{tenantId}
```

This is not optional. This is what makes the platform independently deployable and scalable.

---

## Principle 9: Context is Everything

Every request carries a context. Every data operation is scoped to a context.

```typescript
// ❌ Global query — leaks data across tenants
const leads = await leadRepo.findAll();

// ✅ Context-scoped — enforced at repository level
const leads = await leadRepo.findAll({
  contextId: request.context.id
});
```

Context is resolved once at the API gateway level and propagated through the entire request lifecycle.

```typescript
// Context object available everywhere
interface RequestContext {
  contextId: string;
  contextType: string;
  userId: string;
  tenantId: string;
  organisationId: string;
  permissions: string[];
  plugins: string[];
  locale: string;
  theme: ThemeConfig;
  subscription: SubscriptionInfo;
  features: FeatureFlags;
}
```

---

## Principle 10: Fail Closed

When in doubt, deny.

```typescript
// ❌ Fail open — grants access when uncertain
if (user.role === 'admin') {
  return true; // might return true for undefined roles too
}

// ✅ Fail closed — denies access unless explicitly granted
const hasPermission = await rbac.check({
  userId,
  permission: 'leads.delete',
  contextId
});

if (!hasPermission) {
  throw new ForbiddenException('leads.delete permission required');
}
```

```
Missing JWT → 401 Unauthorized
Missing context headers → 400 Bad Request
Insufficient permission → 403 Forbidden
Plugin not installed → 404 Not Found (never 200 with empty data)
Unknown entity type → 400 Bad Request (never silently ignore)
```

---

## Principle 11: Data Has an Owner

Each service or plugin owns exactly one database schema.
No other service writes to it.

```
packages/core/auth       →  owns: auth schema
                              tables: users, sessions, mfa_tokens, api_keys

packages/core/billing    →  owns: billing schema
                              tables: subscriptions, invoices, payments

plugins/crm              →  owns: crm schema
                              tables: leads, customers, pipelines, activities

plugins/inventory        →  owns: inventory schema
                              tables: products, stock, warehouses, movements
```

If you find yourself writing a migration that adds a column to another plugin's table:
**Stop. You are violating data ownership. Find another approach.**

The correct approaches are:
1. Add an event subscription and store the data in your own table
2. Call the owning service's API to modify its data
3. Extend via the metadata/dynamic fields engine

---

## Principle 12: Zero Trust

Trust no one by default — not even internal services.

```
External request → Verify JWT
Internal service call → Verify service token (mTLS or shared secret)
Database connection → Connection string from secrets manager, never env files
Third-party webhook → Verify HMAC signature
File upload → Scan for malware, validate MIME type
```

```typescript
// Every internal API call carries a service identity
const response = await httpClient.get('/api/v1/users/123', {
  headers: {
    'Authorization': `Bearer ${serviceToken}`,
    'X-Service-Name': 'crm-plugin',
    'X-Request-ID': requestId,
    'X-Context-ID': contextId,
  }
});
```

---

## The Principle Violation Detection Checklist

Run this checklist in every code review:

| Check | ❌ Violation | ✅ Correct |
|-------|-------------|-----------|
| Values | Hardcoded in source | Loaded from config/DB |
| Business logic | In platform core | In plugins only |
| Data access | Cross-service DB query | Via API or events |
| Dependencies | Plugin imports plugin | Via event bus |
| Context | Missing context scope | Always context-scoped |
| Auth | Fail open | Fail closed |
| Observability | Silent operations | Always logged/traced |
| Versioning | Breaking change in-place | New API version |

---

*Next: [Part 04 — Universal Context Engine](./04_Universal_Context_Engine.md)*
