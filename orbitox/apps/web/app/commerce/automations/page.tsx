'use client';

import React, { useState } from 'react';
import {
  commerceEngine,
  AutomationWorkflow,
  AutomationExecutionLog,
  AutomationTrigger,
  AutomationConditionType,
  AutomationActionType,
} from '@orbitox/commerce';

export default function CommerceAutomationsPage() {
  const storeId = 'store_aura_luxury';

  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>(() =>
    commerceEngine.automations.listWorkflows(storeId)
  );

  const [logs, setLogs] = useState<AutomationExecutionLog[]>(() =>
    commerceEngine.automations.getExecutionLogs(storeId)
  );

  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<AutomationWorkflow | null>(null);
  const [testSimulating, setTestSimulating] = useState<boolean>(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  // New Workflow Form State
  const [newName, setNewName] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newCategory, setNewCategory] = useState<AutomationWorkflow['category']>('recovery');
  const [newTrigger, setNewTrigger] = useState<AutomationTrigger>('cart_abandoned');
  const [newConditionType, setNewConditionType] = useState<AutomationConditionType>('cart_total_greater_than');
  const [newConditionVal, setNewConditionVal] = useState<number>(100);
  const [newActionType, setNewActionType] = useState<AutomationActionType>('issue_coupon');

  const refreshState = () => {
    setWorkflows([...commerceEngine.automations.listWorkflows(storeId)]);
    setLogs([...commerceEngine.automations.getExecutionLogs(storeId)]);
  };

  const handleToggle = (id: string, current: boolean) => {
    commerceEngine.automations.toggleWorkflow(id, !current);
    refreshState();
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    commerceEngine.automations.createWorkflow(storeId, {
      name: newName.trim(),
      description: newDesc.trim() || 'Custom automated workflow.',
      category: newCategory,
      trigger: newTrigger,
      conditions: [{ type: newConditionType, value: newConditionVal }],
      actions: [{ type: newActionType, params: { test: true } }],
      enabled: true,
    });

    refreshState();
    setCreateModalOpen(false);
    setNewName('');
    setNewDesc('');
  };

  const handleRunSimulation = (trigger: AutomationTrigger = 'cart_abandoned') => {
    setTestSimulating(true);
    setTimeout(() => {
      const results = commerceEngine.automations.triggerEvent(storeId, trigger, {
        subtotal: 180.0,
        totalSpent: 650.0,
        stock: 3,
        customerName: 'Victoria S.',
        customerEmail: 'victoria.s@luxury.com',
      });

      // Also log to ActivityEngine
      commerceEngine.activity.logEvent({
        storeId,
        type: 'automation_triggered',
        title: `Automation Executed: ${trigger}`,
        description: `Automated rule fired and processed ${results.length} action(s).`,
        icon: '⚡',
        severity: 'success',
      });

      refreshState();
      setTestSimulating(false);
      setSimMessage(`⚡ Automation simulation fired: ${results.length} workflow action(s) executed successfully!`);
      setTimeout(() => setSimMessage(null), 4000);
    }, 400);
  };

  const totalRuns = workflows.reduce((acc, w) => acc + w.timesTriggered, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: '#FFF' }}>
      {/* ─── Header ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🤖</span>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Autonomous Commerce Workflows
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', margin: '6px 0 0 0' }}>
            Self-driving automation rules for abandoned cart recovery, VIP tier upgrades, low stock alerts, and personalized retention.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => handleRunSimulation('cart_abandoned')}
            disabled={testSimulating}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid #8B5CF6',
              color: '#C084FC',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>⚡</span>
            <span>{testSimulating ? 'Simulating...' : 'Test Run Trigger'}</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #D4AF37, #F3E5AB)',
              color: '#000',
              fontWeight: 800,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(212, 175, 55, 0.35)',
            }}
          >
            + Create Workflow
          </button>
        </div>
      </div>

      {simMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10B981',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          {simMessage}
        </div>
      )}

      {/* ─── Metric KPI Cards ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ padding: '18px 20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700, textTransform: 'uppercase' }}>
            Active Workflows
          </span>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#10B981' }}>
            {workflows.filter((w) => w.enabled).length} / {workflows.length}
          </div>
        </div>

        <div style={{ padding: '18px 20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700, textTransform: 'uppercase' }}>
            Automated Executions
          </span>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#D4AF37' }}>
            {totalRuns}
          </div>
        </div>

        <div style={{ padding: '18px 20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700, textTransform: 'uppercase' }}>
            Recovered Revenue
          </span>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#38BDF8' }}>
            $1,840.00
          </div>
        </div>

        <div style={{ padding: '18px 20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700, textTransform: 'uppercase' }}>
            Time Saved per Week
          </span>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#A855F7' }}>
            14.5 hrs
          </div>
        </div>
      </div>

      {/* ─── Active Automation Pipelines ────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Configured Automation Pipelines</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {workflows.map((flow) => {
            return (
              <div
                key={flow.id}
                style={{
                  padding: '18px 20px',
                  borderRadius: '12px',
                  background: flow.enabled ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                  border: flow.enabled ? '1px solid rgba(212, 175, 55, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '20px',
                }}
              >
                {/* Left: Info & Diagram */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: flow.enabled ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)' }}>
                      {flow.name}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(212, 175, 55, 0.15)',
                        color: '#D4AF37',
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}
                    >
                      {flow.category}
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)', margin: 0 }}>
                    {flow.description}
                  </p>

                  {/* Flow Pills Diagram */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', fontSize: '11px', fontWeight: 700 }}>
                      ⚡ When: {flow.trigger.replace('_', ' ')}
                    </div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '12px' }}>→</span>
                    <div style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.2)', color: '#C084FC', fontSize: '11px', fontWeight: 700 }}>
                      🔍 If: {flow.conditions[0]?.type.replace(/_/g, ' ')}
                    </div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '12px' }}>→</span>
                    <div style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', fontSize: '11px', fontWeight: 700 }}>
                      🚀 Then: {flow.actions.map((a) => a.type.replace(/_/g, ' ')).join(', ')}
                    </div>
                  </div>
                </div>

                {/* Right: Trigger Counts & Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#D4AF37' }}>
                      {flow.timesTriggered} runs
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                      {flow.lastTriggeredAt ? `Last: ${new Date(flow.lastTriggeredAt).toLocaleTimeString()}` : 'Never'}
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={flow.enabled}
                    onChange={() => handleToggle(flow.id, flow.enabled)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Real-Time Execution Audit Log ──────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Real-Time Execution Stream</h3>

        <div
          style={{
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
          }}
        >
          {logs.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.5)' }}>Workflow</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.5)' }}>Trigger</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.5)' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.5)' }}>Execution Message</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.5)' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{log.workflowName}</td>
                    <td style={{ padding: '10px 14px', color: '#60A5FA' }}>{log.trigger}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontWeight: 800, fontSize: '10px' }}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'rgba(255, 255, 255, 0.7)' }}>{log.message}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.4)' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)' }}>
              No automation executions recorded yet. Click "Test Run Trigger" above to fire a live simulation.
            </div>
          )}
        </div>
      </div>

      {/* ─── Create Workflow Modal ─────────────────────────────── */}
      {createModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
          onClick={() => setCreateModalOpen(false)}
        >
          <form
            onSubmit={handleCreateSubmit}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '520px',
              maxWidth: '100%',
              background: '#161618',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #D4AF37',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.9)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>Create Autonomous Workflow</h3>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Define reactive rules for your storefront</span>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                Workflow Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. VIP Concierge Alert over $500"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                  Event Trigger
                </label>
                <select
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value as any)}
                  style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px' }}
                >
                  <option value="cart_abandoned">🛒 Cart Abandoned</option>
                  <option value="order_paid">💳 Order Paid</option>
                  <option value="order_placed">📦 Order Placed</option>
                  <option value="inventory_low">⚠️ Inventory Low</option>
                  <option value="customer_registered">👤 Customer Registered</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px' }}
                >
                  <option value="recovery">Recovery</option>
                  <option value="retention">Retention</option>
                  <option value="inventory">Inventory</option>
                  <option value="marketing">Marketing</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                  Condition
                </label>
                <select
                  value={newConditionType}
                  onChange={(e) => setNewConditionType(e.target.value as any)}
                  style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px' }}
                >
                  <option value="cart_total_greater_than">Cart Value ≥ $</option>
                  <option value="customer_lifetime_spent_greater_than">Customer Lifetime Spent ≥ $</option>
                  <option value="inventory_less_than">Stock Units ≤</option>
                  <option value="always_true">Always True</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                  Threshold Value
                </label>
                <input
                  type="number"
                  value={newConditionVal}
                  onChange={(e) => setNewConditionVal(Number(e.target.value))}
                  style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                Automated Action
              </label>
              <select
                value={newActionType}
                onChange={(e) => setNewActionType(e.target.value as any)}
                style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px' }}
              >
                <option value="issue_coupon">🏷️ Issue Personalized Discount Voucher</option>
                <option value="send_email">📧 Dispatch Personalized Email</option>
                <option value="add_customer_tag">👑 Add VIP Customer Tag</option>
                <option value="create_alert">🔔 Trigger Dashboard Notification</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', background: 'transparent', border: '1px solid #444', color: '#FFF', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ flex: 2, padding: '10px', borderRadius: '6px', background: 'linear-gradient(135deg, #D4AF37, #F3E5AB)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                Deploy Workflow
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
