# Part 12 — Policy Engine
### *Authorization Beyond RBAC — Centralizing All Business Rules*

---

## Why RBAC Alone Is Not Enough

RBAC (Role-Based Access Control) answers one question:

> **"Does this role have this permission?"**

That covers: *Can Alice read leads?*

But enterprise systems need to answer far harder questions:

| Question | RBAC Can Answer? |
|----------|-----------------|
| Can Alice read leads? | ✅ Yes — role has `crm.leads.read` |
| Can Alice read **only leads assigned to her**? | ❌ No — data-level rule |
| Can Alice approve invoices **only below ₹50,000**? | ❌ No — value-based rule |
| Can Alice delete records **only if she created them**? | ❌ No — ownership rule |
| Can a manager approve leaves **only for their own team**? | ❌ No — hierarchy rule |
| Is this hospital **HIPAA compliant** — is the user allowed to see patient data? | ❌ No — regulatory rule |
| Can a franchise owner see another franchise's revenue? | ❌ No — visibility rule |

The Policy Engine answers all of these.

---

## Policy Model

The Policy Engine supports four policy types:

```
RBAC    — Role-Based Access Control    (who can do what)
ABAC    — Attribute-Based Access Control (conditions on entity attributes)
PBAC    — Policy-Based Access Control  (complex business rules as policies)
Approval — Multi-step approval workflows before an action completes
```

---

## 1. RBAC — Roles and Permissions

```typescript
// Role definition — stored in database, not hardcoded
{
  id: 'crm-manager',
  contextId: 'tenant-123',
  displayName: 'CRM Manager',
  permissions: [
    'crm.leads.create',
    'crm.leads.read',
    'crm.leads.update',
    'crm.leads.delete',
    'crm.leads.export',
    'crm.customers.read',
    'crm.pipeline.manage',
  ],
  inheritsFrom: ['crm-staff'],    // inherits all staff permissions + above
}

// Role assignment — context-scoped
{
  userId: 'user-abc',
  roleId: 'crm-manager',
  contextId: 'tenant-123',       // role only applies in this context
  grantedBy: 'user-admin',
  expiresAt: null,               // null = never expires
}
```

---

## 2. ABAC — Attribute-Based Policies

ABAC policies add conditions based on the attributes of the entity being accessed.

```typescript
interface ABACPolicy {
  id: string;
  name: string;                  // 'Sales reps can only see their own leads'
  contextId: string;
  pluginId: string;

  resource: string;              // 'crm.lead'
  action: 'read' | 'create' | 'update' | 'delete';

  conditions: PolicyCondition[];
  effect: 'allow' | 'deny';
}

interface PolicyCondition {
  attribute: string;             // 'entity.assignedTo' | 'entity.contextId' | 'entity.createdBy'
  operator: 'eq' | 'neq' | 'in' | 'notIn' | 'lte' | 'gte' | 'startsWith';
  value: PolicyValue;
}

type PolicyValue =
  | string
  | number
  | boolean
  | { ref: 'current_user.id' }
  | { ref: 'current_user.contextId' }
  | { ref: 'current_context.id' };
```

### Example ABAC Policies

```json
[
  {
    "id": "policy-sales-rep-leads",
    "name": "Sales reps can only read their own leads",
    "resource": "crm.lead",
    "action": "read",
    "conditions": [
      {
        "attribute": "entity.assignedTo",
        "operator": "eq",
        "value": { "ref": "current_user.id" }
      }
    ],
    "effect": "allow"
  },
  {
    "id": "policy-invoice-limit",
    "name": "Managers can only approve invoices below ₹50,000",
    "resource": "billing.invoice",
    "action": "approve",
    "conditions": [
      {
        "attribute": "entity.amount",
        "operator": "lte",
        "value": 50000
      }
    ],
    "effect": "allow"
  },
  {
    "id": "policy-own-records-delete",
    "name": "Users can only delete records they created",
    "resource": "crm.lead",
    "action": "delete",
    "conditions": [
      {
        "attribute": "entity.createdBy",
        "operator": "eq",
        "value": { "ref": "current_user.id" }
      }
    ],
    "effect": "allow"
  }
]
```

---

## 3. PBAC — Business Rule Policies

For more complex scenarios, policies can call custom evaluator functions:

```typescript
interface PBACPolicy {
  id: string;
  name: string;
  pluginId: string;
  evaluator: string;             // name of registered evaluator function
  priority: number;              // higher = evaluated first
}

// Registered by the HMS plugin
policyEngine.registerEvaluator('hms.patient.hipaa-check', async (ctx, entity) => {
  // Only users with active HIPAA training can access patient data
  const hasTraining = await hipaaTrainingService.isCompliant(ctx.userId);
  return hasTraining ? PolicyDecision.ALLOW : PolicyDecision.DENY;
});

// Registered by the Franchise plugin
policyEngine.registerEvaluator('franchise.cross-context-visibility', async (ctx, entity) => {
  // Franchise owners can only see data in their own franchise subtree
  const isDescendant = await contextEngine.isDescendant(entity.contextId, ctx.contextId);
  return isDescendant ? PolicyDecision.ALLOW : PolicyDecision.DENY;
});
```

---

## 4. Approval Policies

Some actions require human approval before they execute.

```typescript
interface ApprovalPolicy {
  id: string;
  name: string;                  // 'Large Invoice Approval'
  resource: string;              // 'billing.invoice'
  action: string;                // 'create'

  triggerConditions: PolicyCondition[];  // when this approval kicks in

  approvalFlow: ApprovalStep[];
}

interface ApprovalStep {
  order: number;
  approverType: 'role' | 'user' | 'manager';
  approverRef: string;           // role ID, user ID, or 'direct_manager'
  requiredCount: number;         // how many approvers at this step
  timeoutHours: number;          // auto-escalate after this time
  onTimeout: 'escalate' | 'auto-approve' | 'auto-reject';
}
```

### Example: Large Invoice Approval

```json
{
  "id": "approval-large-invoice",
  "name": "Invoices above ₹100,000 require CFO approval",
  "resource": "billing.invoice",
  "action": "create",
  "triggerConditions": [
    { "attribute": "input.amount", "operator": "gte", "value": 100000 }
  ],
  "approvalFlow": [
    {
      "order": 1,
      "approverType": "manager",
      "approverRef": "direct_manager",
      "requiredCount": 1,
      "timeoutHours": 24,
      "onTimeout": "escalate"
    },
    {
      "order": 2,
      "approverType": "role",
      "approverRef": "cfo",
      "requiredCount": 1,
      "timeoutHours": 48,
      "onTimeout": "auto-reject"
    }
  ]
}
```

---

## Policy Evaluation Order

```
Request arrives
      ↓
1. JWT verified (Auth layer)
      ↓
2. Context resolved
      ↓
3. RBAC check — does the role have the permission key?
   → DENY immediately if no
      ↓
4. ABAC check — do entity attributes match conditions?
   → DENY immediately if condition fails
      ↓
5. PBAC check — do custom evaluators allow?
   → DENY immediately if any evaluator returns DENY
      ↓
6. Approval check — is approval required?
   → If yes: pause action, create approval request
      ↓
7. ALLOW — proceed with action
```

**Fail-closed:** Unless every layer explicitly allows, access is denied.

---

## Visibility Policies (Data Scope)

Visibility policies control which records a user can see in list queries, not just whether they can perform an action.

```typescript
// Visibility policy is applied automatically at the repository layer
class LeadRepository {
  async findAll(ctx: RequestContext, filters: LeadFilters): Promise<Lead[]> {
    // Policy engine returns additional WHERE clauses
    const visibilityClause = await policyEngine.getVisibilityClause(
      ctx,
      'crm.lead',
      'read'
    );

    // visibilityClause might be:
    // { assignedTo: ctx.userId } — for sales rep ABAC policy
    // {} — for manager (sees all)

    return this.db.findAll({
      ...filters,
      ...visibilityClause,
      contextId: ctx.contextId,
    });
  }
}
```

---

## Policy Storage Schema

```sql
CREATE TABLE rbac.policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id      UUID,                -- null = platform-wide policy
  plugin_id       VARCHAR(100),
  type            VARCHAR(20) NOT NULL, -- 'rbac', 'abac', 'pbac', 'approval'
  name            VARCHAR(255) NOT NULL,
  resource        VARCHAR(200),
  action          VARCHAR(100),
  definition      JSONB NOT NULL,
  priority        INTEGER DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rbac.approval_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id       UUID NOT NULL REFERENCES rbac.policies(id),
  context_id      UUID NOT NULL,
  requested_by    UUID NOT NULL,
  resource        VARCHAR(200) NOT NULL,
  action          VARCHAR(100) NOT NULL,
  payload         JSONB NOT NULL,       -- the original action payload
  current_step    INTEGER DEFAULT 1,
  status          VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'expired'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);
```

---

*Next: [Part 13 — Feature Flag Engine](./13_Feature_Flag_Engine.md)*
