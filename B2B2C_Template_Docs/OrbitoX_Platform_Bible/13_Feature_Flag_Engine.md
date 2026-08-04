# Part 13 — Feature Flag Engine
### *Enable, Disable, and Experiment With Features Without Deploying Code*

---

## Why Feature Flags?

Feature flags decouple **deployment** from **release**.

Without feature flags:

```
1. Write feature code
2. Deploy to production
3. Everyone sees the feature immediately
4. If it breaks → full rollback → all users affected
```

With feature flags:

```
1. Write feature code behind a flag
2. Deploy to production (flag is OFF by default)
3. Enable for internal testers → verify
4. Enable for 10% of users → verify at scale
5. Enable for specific beta tenants → gather feedback
6. Enable globally when confident
7. If it breaks → flip flag OFF → zero downtime rollback
```

---

## Feature Flag Dimensions

OrbitoX feature flags can be scoped across multiple dimensions:

```
Platform-level   →  on/off for all contexts
Organisation     →  on/off for a specific organisation
Tenant           →  on/off for a specific tenant
Context          →  on/off for any specific context
Subscription     →  on/off based on the plan the tenant is on
Country          →  on/off by context's billing country
Environment      →  on/off by environment (dev/staging/production)
User             →  on/off for a specific user (beta testers)
Percentage       →  on for X% of contexts (gradual rollout)
Date range       →  on between specific dates (seasonal features)
```

---

## Flag Definition Schema

```typescript
interface FeatureFlag {
  id: string;                        // 'ai-assistant', 'bulk-export', 'new-dashboard'
  displayName: string;               // 'AI Assistant Copilot'
  description: string;
  pluginId?: string;                 // which plugin owns this flag (null = platform)
  category: 'feature' | 'experiment' | 'ops' | 'beta';

  defaultValue: boolean;             // global default

  overrides: FlagOverride[];         // ordered list of override rules
}

interface FlagOverride {
  id: string;
  priority: number;                  // higher = evaluated first
  effect: boolean;                   // true = enabled, false = disabled

  conditions: FlagCondition[];       // ALL must match for this override to apply
}

interface FlagCondition {
  dimension: FlagDimension;
  operator: 'eq' | 'in' | 'lte' | 'gte' | 'contains';
  value: string | string[] | number | boolean;
}

type FlagDimension =
  | 'context_id'
  | 'organisation_id'
  | 'tenant_id'
  | 'plan_id'
  | 'country'
  | 'environment'
  | 'user_id'
  | 'percentage'           // value = 0-100, applies to X% of contexts
  | 'date_before'
  | 'date_after';
```

---

## Example Flag Configurations

### Beta Feature — Only for Specific Tenants

```json
{
  "id": "ai-assistant",
  "displayName": "AI Assistant Copilot",
  "defaultValue": false,
  "overrides": [
    {
      "priority": 100,
      "effect": true,
      "conditions": [
        { "dimension": "tenant_id", "operator": "in",
          "value": ["tenant-abc", "tenant-xyz", "tenant-beta"] }
      ]
    }
  ]
}
```

### Plan-Gated Feature — Only on Enterprise Plan

```json
{
  "id": "bulk-export",
  "displayName": "Bulk Data Export",
  "defaultValue": false,
  "overrides": [
    {
      "priority": 100,
      "effect": true,
      "conditions": [
        { "dimension": "plan_id", "operator": "in",
          "value": ["plan-professional", "plan-enterprise"] }
      ]
    }
  ]
}
```

### Gradual Rollout — 20% of Contexts

```json
{
  "id": "new-dashboard-v2",
  "displayName": "New Dashboard (V2)",
  "defaultValue": false,
  "overrides": [
    {
      "priority": 90,
      "effect": true,
      "conditions": [
        { "dimension": "percentage", "operator": "lte", "value": 20 }
      ]
    }
  ]
}
```

### Seasonal Feature — Enabled Only in December

```json
{
  "id": "year-end-report",
  "displayName": "Year-End Report Generator",
  "defaultValue": false,
  "overrides": [
    {
      "priority": 100,
      "effect": true,
      "conditions": [
        { "dimension": "date_after",  "operator": "gte", "value": "2026-12-01" },
        { "dimension": "date_before", "operator": "lte", "value": "2026-12-31" }
      ]
    }
  ]
}
```

### Country-Specific Feature

```json
{
  "id": "gst-invoicing",
  "displayName": "GST Invoice Generator",
  "defaultValue": false,
  "overrides": [
    {
      "priority": 100,
      "effect": true,
      "conditions": [
        { "dimension": "country", "operator": "eq", "value": "IN" }
      ]
    }
  ]
}
```

---

## Using Feature Flags in Code

### Backend

```typescript
@Injectable()
export class ReportService {
  constructor(private readonly flags: FeatureFlagService) {}

  async exportReport(ctx: RequestContext) {
    const canBulkExport = await this.flags.isEnabled('bulk-export', ctx.contextId);

    if (!canBulkExport) {
      throw new ForbiddenException(
        'Bulk export is not available on your current plan. Upgrade to Professional.'
      );
    }

    // ... proceed with bulk export
  }
}
```

### Frontend

```tsx
function DashboardPage() {
  const { isEnabled, isLoading } = useFeatureFlag('new-dashboard-v2');

  if (isLoading) return <DashboardSkeleton />;

  return isEnabled ? <DashboardV2 /> : <DashboardV1 />;
}

// Or with a gate component
function ExportButton() {
  return (
    <FeatureGate
      flag="bulk-export"
      fallback={<UpgradePrompt feature="Bulk Export" />}
    >
      <Button onClick={handleExport}>Export All</Button>
    </FeatureGate>
  );
}
```

---

## Feature Flag Evaluation (Cached)

```typescript
async function evaluateFlag(flagId: string, contextId: string): Promise<boolean> {
  // L1: Check in-memory cache (TTL: 60 seconds)
  const cached = memCache.get(`flag:${flagId}:${contextId}`);
  if (cached !== undefined) return cached;

  // L2: Check Redis (TTL: 5 minutes)
  const redisCached = await redis.get(`flag:${flagId}:${contextId}`);
  if (redisCached !== null) {
    memCache.set(`flag:${flagId}:${contextId}`, redisCached === 'true', 60);
    return redisCached === 'true';
  }

  // L3: Evaluate from DB
  const flag = await flagRepo.findById(flagId);
  const context = await contextService.findById(contextId);
  const result = evaluateOverrides(flag, context);

  // Cache it
  await redis.setex(`flag:${flagId}:${contextId}`, 300, result.toString());
  memCache.set(`flag:${flagId}:${contextId}`, result, 60);

  return result;
}
```

When a flag is modified in the Admin panel:
```
Flag updated → Redis pub/sub → All pods flush L1 cache for that flag
```

---

## Feature Flag Admin Panel

Admins can manage all flags without touching code:

```
Platform Admin → Feature Flags → [flag name]
  ├── View current enabled state per context
  ├── Toggle on/off globally
  ├── Add override for specific context
  ├── Add override for plan
  ├── Set percentage rollout
  ├── Set date range
  └── View flag change history (audit log)
```

---

## Flags × Menus × Routes

Feature flags integrate with the Dynamic UI Engine:

```json
{
  "id": "crm-ai-page",
  "label": "AI Insights",
  "path": "/crm/ai-insights",
  "permission": "crm.ai.read",
  "featureFlag": "ai-assistant"
}
```

If `ai-assistant` flag is disabled for this context → menu item is hidden → route returns 404. No code change needed.

---

## Platform Flag Registry

| Flag ID | Description | Default | Gating |
|---------|-------------|---------|--------|
| `ai-assistant` | AI Copilot in all plugins | false | Plan: Enterprise |
| `bulk-export` | Bulk data export to CSV/Excel | false | Plan: Professional+ |
| `advanced-workflows` | Workflow engine with branches | false | Plan: Professional+ |
| `white-label` | Custom branding + domain | false | Plan: Enterprise |
| `multi-currency` | Invoice in multiple currencies | false | Plan: Enterprise |
| `api-access` | Developer API access | true | All paid plans |
| `audit-log` | Full audit trail | true | All plans |
| `sso` | Single Sign-On | false | Plan: Enterprise |
| `two-factor` | MFA enforcement | false | All plans (optional) |
| `custom-roles` | Create custom RBAC roles | false | Plan: Professional+ |
| `webhook-outbound` | Outbound webhooks | false | Plan: Professional+ |
| `custom-domains` | Custom domain mapping | false | Plan: Enterprise |

---

*Next: [Part 14 — Observability](./14_Observability.md)*
