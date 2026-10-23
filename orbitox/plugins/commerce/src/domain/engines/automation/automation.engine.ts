export type AutomationTrigger =
  | 'order_placed'
  | 'order_paid'
  | 'order_delivered'
  | 'cart_abandoned'
  | 'customer_registered'
  | 'inventory_low'
  | 'price_changed';

export type AutomationConditionType =
  | 'cart_total_greater_than'
  | 'customer_is_vip'
  | 'customer_lifetime_spent_greater_than'
  | 'inventory_less_than'
  | 'order_count_equals'
  | 'always_true';

export type AutomationActionType =
  | 'send_email'
  | 'issue_coupon'
  | 'add_customer_tag'
  | 'create_alert'
  | 'trigger_webhook'
  | 'award_points';

export interface AutomationCondition {
  type: AutomationConditionType;
  value?: any;
}

export interface AutomationAction {
  type: AutomationActionType;
  params: Record<string, any>;
}

export interface AutomationWorkflow {
  id: string;
  storeId: string;
  name: string;
  description: string;
  category: 'recovery' | 'retention' | 'inventory' | 'marketing' | 'operations';
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  enabled: boolean;
  timesTriggered: number;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationExecutionLog {
  id: string;
  workflowId: string;
  workflowName: string;
  storeId: string;
  trigger: AutomationTrigger;
  status: 'success' | 'skipped' | 'failed';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class AutomationEngine {
  private workflows: Map<string, AutomationWorkflow> = new Map();
  private logs: AutomationExecutionLog[] = [];

  constructor() {
    this.seedDefaultWorkflows();
  }

  private seedDefaultWorkflows() {
    const now = new Date().toISOString();
    const defaults: AutomationWorkflow[] = [
      {
        id: 'flow_cart_recovery',
        storeId: 'store_aura_luxury',
        name: '🛒 Abandoned Cart Recovery (10% Off Voucher)',
        description: 'Automatically detects abandoned checkouts and triggers personalized recovery email with coupon RECOVER10.',
        category: 'recovery',
        trigger: 'cart_abandoned',
        conditions: [{ type: 'cart_total_greater_than', value: 50 }],
        actions: [
          { type: 'issue_coupon', params: { code: 'RECOVER10', percentage: 10 } },
          { type: 'send_email', params: { template: 'abandoned_cart_recovery', subject: 'Your items are reserved — enjoy 10% off' } },
        ],
        enabled: true,
        timesTriggered: 18,
        lastTriggeredAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'flow_vip_upgrade',
        storeId: 'store_aura_luxury',
        name: '👑 VIP Patron Auto-Segmentation',
        description: 'Instantly tags customer as VIP Patron and unlocks exclusive lookbooks when lifetime spend crosses $500.',
        category: 'retention',
        trigger: 'order_paid',
        conditions: [{ type: 'customer_lifetime_spent_greater_than', value: 500 }],
        actions: [
          { type: 'add_customer_tag', params: { tag: 'vip' } },
          { type: 'create_alert', params: { title: 'New VIP Patron Upgraded', severity: 'success' } },
        ],
        enabled: true,
        timesTriggered: 7,
        lastTriggeredAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'flow_low_stock_alert',
        storeId: 'store_aura_luxury',
        name: '⚠️ Low Stock & Restock Sentinel',
        description: 'Dispatches real-time inventory restock warning when any SKU falls below 5 remaining units.',
        category: 'inventory',
        trigger: 'inventory_low',
        conditions: [{ type: 'inventory_less_than', value: 5 }],
        actions: [
          { type: 'create_alert', params: { title: 'Low Stock SKU Warning', severity: 'warning' } },
        ],
        enabled: true,
        timesTriggered: 3,
        lastTriggeredAt: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'flow_high_value_concierge',
        storeId: 'store_aura_luxury',
        name: '💎 High-Value Order White-Glove Concierge',
        description: 'Triggers priority concierge packaging and VIP dispatch notifications on orders exceeding $1,000.',
        category: 'operations',
        trigger: 'order_placed',
        conditions: [{ type: 'cart_total_greater_than', value: 1000 }],
        actions: [
          { type: 'create_alert', params: { title: 'High-Value Order Received ($1,000+)', severity: 'success' } },
          { type: 'send_email', params: { template: 'concierge_welcome', subject: 'Your bespoke order has entered preparation' } },
        ],
        enabled: true,
        timesTriggered: 12,
        lastTriggeredAt: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const w of defaults) {
      this.workflows.set(w.id, w);
    }
  }

  listWorkflows(storeId: string): AutomationWorkflow[] {
    return Array.from(this.workflows.values()).filter((w) => w.storeId === storeId);
  }

  getWorkflowById(id: string): AutomationWorkflow | null {
    return this.workflows.get(id) || null;
  }

  createWorkflow(storeId: string, payload: Omit<AutomationWorkflow, 'id' | 'storeId' | 'timesTriggered' | 'createdAt' | 'updatedAt'>): AutomationWorkflow {
    const now = new Date().toISOString();
    const workflow: AutomationWorkflow = {
      id: `flow_${globalThis.crypto.randomUUID()}`,
      storeId,
      timesTriggered: 0,
      createdAt: now,
      updatedAt: now,
      ...payload,
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  updateWorkflow(id: string, updates: Partial<AutomationWorkflow>): AutomationWorkflow {
    const flow = this.workflows.get(id);
    if (!flow) throw new Error(`Workflow '${id}' not found.`);

    const updated = {
      ...flow,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.workflows.set(id, updated);
    return updated;
  }

  toggleWorkflow(id: string, enabled?: boolean): AutomationWorkflow {
    const flow = this.workflows.get(id);
    if (!flow) throw new Error(`Workflow '${id}' not found.`);

    const newState = enabled !== undefined ? enabled : !flow.enabled;
    return this.updateWorkflow(id, { enabled: newState });
  }

  deleteWorkflow(id: string): boolean {
    return this.workflows.delete(id);
  }

  triggerEvent(storeId: string, trigger: AutomationTrigger, payload: Record<string, any>): AutomationExecutionLog[] {
    const activeFlows = this.listWorkflows(storeId).filter((w) => w.enabled && w.trigger === trigger);
    const executionLogs: AutomationExecutionLog[] = [];

    for (const flow of activeFlows) {
      // Evaluate conditions
      let matches = true;
      for (const cond of flow.conditions) {
        if (cond.type === 'cart_total_greater_than' && payload.subtotal < cond.value) {
          matches = false;
          break;
        }
        if (cond.type === 'customer_lifetime_spent_greater_than' && (payload.totalSpent || 0) < cond.value) {
          matches = false;
          break;
        }
        if (cond.type === 'inventory_less_than' && (payload.stock || 0) > cond.value) {
          matches = false;
          break;
        }
      }

      if (matches) {
        flow.timesTriggered += 1;
        flow.lastTriggeredAt = new Date().toISOString();

        const log: AutomationExecutionLog = {
          id: `log_${globalThis.crypto.randomUUID()}`,
          workflowId: flow.id,
          workflowName: flow.name,
          storeId,
          trigger,
          status: 'success',
          message: `Executed ${flow.actions.length} action(s) for trigger '${trigger}'.`,
          timestamp: new Date().toISOString(),
          metadata: payload,
        };

        this.logs.unshift(log);
        executionLogs.push(log);
      }
    }

    return executionLogs;
  }

  getExecutionLogs(storeId: string, limit: number = 20): AutomationExecutionLog[] {
    return this.logs.filter((l) => l.storeId === storeId).slice(0, limit);
  }
}
