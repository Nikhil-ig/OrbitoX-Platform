# Part 19 — SDK Reference
### *The Developer API for Building on OrbitoX*

---

## SDK Overview

The OrbitoX SDK (`@orbitox/plugin-engine`) provides everything a plugin developer needs to build, register, and interact with the platform.

```bash
# Install in your plugin
pnpm add @orbitox/plugin-engine @orbitox/core @orbitox/types
```

---

## Plugin Base Class

```typescript
import { Plugin, PluginContext, PluginManifest } from '@orbitox/plugin-engine';

export default class MyPlugin extends Plugin {
  // Called once when installed on a context
  async onInstall(ctx: PluginContext): Promise<void> {}

  // Called on every platform startup if plugin is active
  async onActivate(ctx: PluginContext): Promise<void> {}

  // Called before upgrade — prepare for version change
  async onBeforeUpgrade(ctx: PluginContext, fromVersion: string, toVersion: string): Promise<void> {}

  // Called after upgrade — post-migration tasks
  async onAfterUpgrade(ctx: PluginContext, fromVersion: string, toVersion: string): Promise<void> {}

  // Called before uninstall — cleanup
  async onUninstall(ctx: PluginContext): Promise<void> {}

  // Called when plugin is disabled (but not uninstalled)
  async onDeactivate(ctx: PluginContext): Promise<void> {}
}
```

---

## Entity Registration

```typescript
import { MetadataEngine, EntityDefinition } from '@orbitox/plugin-engine';

// Register an entity — generates CRUD API + form + table automatically
await MetadataEngine.registerEntity({
  id: 'lead',
  pluginId: 'crm',
  displayName: 'Lead',
  displayNamePlural: 'Leads',
  icon: 'user-plus',

  fields: [
    { key: 'name',   label: 'Name',   type: 'text',  required: true, searchable: true, showInList: true },
    { key: 'email',  label: 'Email',  type: 'email', searchable: true, showInList: true },
    { key: 'status', label: 'Status', type: 'select', options: [...], filterable: true },
  ],

  permissions: {
    create: 'crm.leads.create',
    read:   'crm.leads.read',
    update: 'crm.leads.update',
    delete: 'crm.leads.delete',
  },

  ui: {
    defaultSort: 'created_at:desc',
    defaultView: 'table',
    searchFields: ['name', 'email'],
  },

  hooks: {
    afterCreate: ['crm.lead.created'],
    afterUpdate: ['crm.lead.updated'],
  },
});
```

---

## Workflow Registration

```typescript
import { WorkflowEngine } from '@orbitox/plugin-engine';

// Register a reusable workflow template
await WorkflowEngine.registerTemplate({
  id: 'crm.lead-won-default',
  name: 'Lead Won — Default Automation',
  description: 'Runs when a lead is marked as Won',
  pluginId: 'crm',
  trigger: {
    type: 'event',
    eventName: 'crm.lead.status_changed',
    conditions: [{ field: 'payload.newStatus', operator: 'eq', value: 'won' }],
  },
  steps: [
    { type: 'action', id: 'notify', actionType: 'send_in_app', config: { title: '🎉 Lead Won!' } },
    { type: 'action', id: 'invoice', actionType: 'billing.create_invoice', config: {} },
  ],
});

// Register a custom action type for use in workflows
WorkflowEngine.registerAction({
  id: 'crm.create_activity',
  displayName: 'Create CRM Activity',
  pluginId: 'crm',
  configSchema: {
    leadId: { type: 'string', required: true },
    type:   { type: 'select', options: ['call', 'email', 'meeting', 'note'] },
    note:   { type: 'text' },
  },
  handler: async (config, ctx) => {
    await leadActivityService.create(config, ctx);
  },
});
```

---

## Widget Registration

```typescript
import { DashboardEngine } from '@orbitox/plugin-engine';

// Register dashboard widgets
DashboardEngine.registerWidgets([
  {
    id: 'crm.leads.count',
    title: 'Total Leads',
    pluginId: 'crm',
    type: 'metric',
    size: '1x1',
    permission: 'crm.leads.read',
    dataSource: '/api/v1/crm/widgets/leads-count',
    refreshInterval: 60,
  },
  {
    id: 'crm.pipeline.chart',
    title: 'Pipeline by Stage',
    pluginId: 'crm',
    type: 'chart',
    chartType: 'bar',
    size: '2x2',
    permission: 'crm.pipeline.read',
    dataSource: '/api/v1/crm/widgets/pipeline-stages',
  },
]);
```

---

## Event Registration

```typescript
import { EventBus } from '@orbitox/core/events';

// Emit an event
await EventBus.emit({
  name: 'crm.lead.created',
  contextId: ctx.contextId,
  source: 'crm-plugin',
  userId: ctx.userId,
  payload: { leadId: lead.id, name: lead.name },
});

// Subscribe to events (in NestJS module)
@EventSubscriber('crm.lead.created')
export class LeadCreatedSubscriber {
  async handle(event: PlatformEvent<LeadCreatedPayload>): Promise<void> {
    // handle the event
  }
}

// Subscribe to multiple events
@EventSubscriber(['crm.lead.created', 'crm.lead.updated'])
export class LeadChangeSubscriber {
  async handle(event: PlatformEvent): Promise<void> {
    // handles both events
  }
}
```

---

## Page & Menu Registration

```typescript
import { UIRegistry } from '@orbitox/plugin-engine';

// Pages are registered via manifest.json — but can also be dynamic
UIRegistry.registerPage({
  id: 'crm-custom-report',
  path: '/crm/reports/custom',
  title: 'Custom Lead Report',
  component: 'CustomLeadReportPage',    // must exist in plugin's frontend/pages/
  permission: 'crm.reports.view',
  featureFlag: 'advanced-reports',
});

// Dynamic menu item
UIRegistry.registerMenuItem({
  id: 'crm-custom-menu',
  parentId: 'crm-root',
  label: 'Custom Report',
  path: '/crm/reports/custom',
  icon: 'chart-bar',
  permission: 'crm.reports.view',
  sortOrder: 500,
});
```

---

## Policy Registration

```typescript
import { PolicyEngine } from '@orbitox/core/rbac';

// Register permissions
PolicyEngine.registerPermissions('crm', [
  { id: 'crm.leads.create',  displayName: 'Create Leads',    group: 'Leads' },
  { id: 'crm.leads.read',    displayName: 'View Leads',      group: 'Leads' },
  { id: 'crm.leads.update',  displayName: 'Edit Leads',      group: 'Leads' },
  { id: 'crm.leads.delete',  displayName: 'Delete Leads',    group: 'Leads' },
  { id: 'crm.leads.export',  displayName: 'Export Leads',    group: 'Leads' },
  { id: 'crm.pipeline.read', displayName: 'View Pipeline',   group: 'Pipeline' },
]);

// Register an ABAC policy
PolicyEngine.registerPolicy({
  type: 'abac',
  name: 'Sales reps see only their assigned leads',
  resource: 'crm.lead',
  action: 'read',
  conditions: [
    { attribute: 'entity.assignedTo', operator: 'eq', value: { ref: 'current_user.id' } }
  ],
  applyToRoles: ['crm-staff'],
});

// Register a custom PBAC evaluator
PolicyEngine.registerEvaluator('crm.lead.data-residency', async (ctx, entity) => {
  const residencyCheck = await dataResidencyService.check(ctx.contextId, entity.id);
  return residencyCheck.allowed ? PolicyDecision.ALLOW : PolicyDecision.DENY;
});
```

---

## Capability Usage

```typescript
import {
  AICapability,
  NotificationCapability,
  SearchCapability,
  AuditCapability,
  StorageCapability,
  ReportCapability,
} from '@orbitox/plugin-engine/capabilities';

// These are injected by NestJS DI — all properly typed
@Injectable()
export class LeadService {
  constructor(
    private ai: AICapability,
    private notify: NotificationCapability,
    private search: SearchCapability,
    private audit: AuditCapability,
    private storage: StorageCapability,
    private reports: ReportCapability,
  ) {}
}
```

---

## Context Access

```typescript
import { ContextService, RequestContext } from '@orbitox/core/context';

@Injectable()
export class MyService {
  constructor(private ctx: ContextService) {}

  doSomething(): void {
    const context: RequestContext = this.ctx.current();

    context.contextId       // current context UUID
    context.tenantId        // resolved tenant ID
    context.organisationId  // resolved org ID
    context.userId          // current user ID
    context.permissions     // user's permission list
    context.plugins         // active plugins in this context
    context.features        // feature flags for this context
    context.locale          // 'en-IN', 'ar-SA'
    context.currency        // 'INR', 'USD'
    context.timezone        // 'Asia/Kolkata'
    context.theme           // ThemeConfig
    context.subscription    // { planId, status, expiresAt }
  }
}
```

---

## Cron Job Registration

```typescript
import { Scheduler } from '@orbitox/core/scheduler';

// Defined in manifest.json (preferred) or programmatically
Scheduler.registerJob({
  id: 'crm.leads.stale-check',
  pluginId: 'crm',
  schedule: '0 9 * * *',              // weekdays at 9am UTC
  description: 'Flag leads with no activity in 7 days',
  handler: 'CrmLeadStaleCheckHandler', // class name in backend/
  timeout: 300,                        // max 5 minutes
  overlap: false,                      // skip if previous run still active
});
```

---

## SDK Type Reference

```typescript
// Key types exported from @orbitox/types

export interface RequestContext { ... }
export interface PlatformEvent<T> { ... }
export interface EntityMetadata { ... }
export interface FieldMetadata { ... }
export interface PluginManifest { ... }
export interface WorkflowDefinition { ... }
export interface WorkflowStep { ... }
export interface WidgetDefinition { ... }
export interface ThemeConfig { ... }
export interface FeatureFlag { ... }
export interface PolicyDefinition { ... }
export interface CapabilityConfig { ... }
```

---

*Next: [Part 20 — CLI Reference](./20_CLI_Reference.md)*
