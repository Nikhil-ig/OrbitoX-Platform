# 📦 Step 10: No-Code Workflows & Automation Engine (`orbitox.workflows`)

The OrbitoX Workflow Engine lets you define **declarative background automations** that trigger on domain events, time schedules, or webhooks — and automatically execute actions like sending emails, calling APIs, or pushing notifications. No manual wiring needed.

---

## 📦 Workflow Architecture Overview

```mermaid
graph LR
    subgraph Triggers
        T1["⚡ Domain Event\n(order.placed)"]
        T2["⏰ Scheduled Cron\n(daily at 9am)"]
        T3["🔗 Webhook\n(POST /webhooks/payment)"]
    end

    WorkflowEngine["📦 Workflow Engine\n(OrbitoX Kernel)"]

    subgraph Actions
        A1["📧 Send Email"]
        A2["🔔 Push Notification"]
        A3["🌐 Call External API"]
        A4["📊 Update Analytics"]
    end

    T1 --> WorkflowEngine
    T2 --> WorkflowEngine
    T3 --> WorkflowEngine
    WorkflowEngine --> A1
    WorkflowEngine --> A2
    WorkflowEngine --> A3
    WorkflowEngine --> A4
```

---

## 📊 Trigger Types Reference

| Trigger Type | Config Key | When It Fires | Example |
| :--- | :--- | :--- | :--- |
| **Domain Event** | `type: 'event'` | When a matching event is emitted | `eventName: 'order.placed'` |
| **Cron Schedule** | `type: 'schedule'` | On a time-based cron expression | `cron: '0 9 * * *'` (daily at 9am) |
| **Webhook** | `type: 'webhook'` | When an HTTP POST hits the webhook endpoint | `path: '/webhooks/payment-confirmed'` |

---

## 📊 Action Types Reference

| Action Type | Config Key | What It Does | Example |
| :--- | :--- | :--- | :--- |
| **Email Notification** | `type: 'email'` | Sends an email via configured email provider | Send receipt to customer |
| **Push Notification** | `type: 'notification'` | Sends in-app or mobile push notification | Alert manager of large order |
| **External API Call** | `type: 'api_call'` | POSTs data to an external REST endpoint | Update Slack, send to ERP |

---

## 🔄 Workflow Execution Sequence

```mermaid
sequenceDiagram
    participant EventBus as ⚡ Event Bus
    participant WorkflowEngine as 📦 Workflow Engine
    participant Matcher as Trigger Matcher
    participant ActionRunner as Action Executor
    participant Slack as 🌐 External Service

    EventBus->>WorkflowEngine: Event 'order.placed' emitted
    WorkflowEngine->>Matcher: Find workflows with trigger = 'order.placed'
    Matcher-->>WorkflowEngine: Found: 'vip_order_alert', 'kitchen_notify'
    WorkflowEngine->>ActionRunner: Execute 'vip_order_alert' actions
    ActionRunner->>Slack: POST /slack/notify { message: 'VIP Order!' }
    Slack-->>ActionRunner: 200 OK
    ActionRunner-->>WorkflowEngine: Action completed
```

---

## 🛠️ Step-by-Step Workflow Implementation

### Step 10.1: Event-Triggered Notification Workflow

```typescript
import { orbitox } from '@orbitox/runtime';

// Alert the manager when any order over $200 is placed
await orbitox.workflows.define({
  id: 'vip_order_alert',
  displayName: 'VIP Order Manager Alert',
  trigger: {
    type: 'event',
    eventName: 'order.placed',
  },
  conditions: [
    { field: 'payload.total', operator: 'gte', value: 200 }, // Only trigger if total >= $200
  ],
  actions: [
    {
      type: 'notification',
      target: 'manager@restaurant.com',
      message: '🔔 VIP Order Alert: A large order of ${{payload.total}} has been placed at Table {{payload.tableNumber}}!',
    },
  ],
});
```

### Step 10.2: Scheduled Cron Workflow (Daily Report)

```typescript
// Send a daily summary report every morning at 9am
await orbitox.workflows.define({
  id: 'daily_summary_report',
  displayName: 'Daily Revenue Summary Email',
  trigger: {
    type: 'schedule',
    cron: '0 9 * * *', // 9:00 AM every day
  },
  actions: [
    {
      type: 'email',
      to: 'owner@restaurant.com',
      subject: 'Daily Revenue Summary — {{date}}',
      templateId: 'daily_revenue_summary_template',
    },
  ],
});
```

### Step 10.3: Manually Trigger a Workflow

```typescript
// Manually fire a workflow in response to a custom business condition
await orbitox.workflows.trigger(
  'vip_order_alert',
  {
    orderId: 'ord_9901',
    total: 350.00,
    tableNumber: 7,
    customerName: 'Mr. Johnson',
  },
  'branch-downtown'
);
```

### Step 10.4: Combined Workflow — Email + External API

```typescript
// On order completion: send receipt email AND update external inventory system
await orbitox.workflows.define({
  id: 'order_fulfillment_pipeline',
  displayName: 'Order Fulfillment: Email + Inventory Sync',
  trigger: {
    type: 'event',
    eventName: 'order.completed',
  },
  actions: [
    {
      type: 'email',
      to: '{{payload.customerEmail}}',
      subject: 'Your Order #{{payload.orderId}} is Ready!',
      body: 'Thank you for your order. Total charged: ${{payload.total}}.',
    },
    {
      type: 'api_call',
      method: 'POST',
      url: 'https://inventory.internal/api/stock/decrement',
      body: { orderId: '{{payload.orderId}}', items: '{{payload.items}}' },
      headers: { Authorization: 'Bearer {{env.INVENTORY_API_KEY}}' },
    },
  ],
});
```

---

[⬅️ Prev: Feature Flags](./09_FEATURE_FLAGS.md) | [Back to Index](./README.md) | [Next: CLI & Scaffolding ➔](./11_CLI_SCAFFOLDING.md)
