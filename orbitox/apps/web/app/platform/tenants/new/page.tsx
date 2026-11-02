'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './wizard.module.css';

interface PluginOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  selected: boolean;
  plan: string;
  availablePlans: string[];
}

interface OperationStep {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

const DEFAULT_PLUGINS: PluginOption[] = [
  {
    id: 'hospital-os',
    name: 'HospitalOS',
    icon: '🏥',
    description: 'Clinical management, wards, beds, and strict patient PHI cryptographic isolation.',
    selected: true,
    plan: 'starter',
    availablePlans: ['starter', 'growth', 'enterprise'],
  },
  {
    id: 'restaurant-os',
    name: 'RestaurantOS',
    icon: '🍷',
    description: 'Hospitality ERP, spatial floor plans, tables, KDS, and dining sessions.',
    selected: false,
    plan: 'starter',
    availablePlans: ['starter', 'growth', 'pro'],
  },
];

export default function TenantProvisioningWizardPage() {
  // Form State
  const [name, setName] = useState('Metro Health Care');
  const [slug, setSlug] = useState('metro-health-care');
  const [org, setOrg] = useState('default');
  const [environment, setEnvironment] = useState('production');
  const [region, setRegion] = useState('ap-south-1');
  const [apiKey, setApiKey] = useState('');
  const [plugins, setPlugins] = useState<PluginOption[]>(DEFAULT_PLUGINS);

  // Dynamically load installable plugins from platform catalogue (Item 8 (3))
  useEffect(() => {
    async function loadCatalogue() {
      try {
        const res = await fetch('/api/v1/tenants');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.plugins) && data.plugins.length > 0) {
            // Offer only plugins where installable is true; CRM must not be offered while disabled
            const valid = data.plugins
              .filter((p: any) => p.installable !== false && p.id !== 'crm')
              .map((p: any, idx: number) => ({
                id: p.id,
                name: p.name,
                icon: p.icon || '📦',
                description: p.description || '',
                selected: idx === 0,
                plan: p.plan || 'starter',
                availablePlans: p.availablePlans || ['starter', 'growth'],
              }));
            if (valid.length > 0) {
              setPlugins(valid);
            }
          }
        }
      } catch (err) {
        // Fallback to installable defaults (HospitalOS and RestaurantOS)
      }
    }
    loadCatalogue();
  }, []);

  // Workflow State
  const [submitting, setSubmitting] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [operationStatus, setOperationStatus] = useState<string | null>(null);
  const [steps, setSteps] = useState<OperationStep[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [returnedSecret, setReturnedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [revealSecret, setRevealSecret] = useState(true);

  // Live Timer
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Derive slug automatically from name
  const handleNameChange = (val: string) => {
    setName(val);
    const clean = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32);
    setSlug(clean || 'my-tenant');
  };

  const togglePlugin = (pluginId: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === pluginId ? { ...p, selected: !p.selected } : p))
    );
  };

  const setPluginPlan = (pluginId: string, plan: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === pluginId ? { ...p, plan } : p))
    );
  };

  // Launch Provisioning Saga
  const handleStartProvisioning = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setReturnedSecret(null);

    const selectedPlugins = plugins
      .filter((p) => p.selected)
      .map((p) => ({ id: p.id, plan: p.plan }));

    if (selectedPlugins.length === 0) {
      setErrorMessage('Please select at least one plugin to provision.');
      setSubmitting(false);
      return;
    }

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedMs(Date.now() - startTimeRef.current);
      }
    }, 100);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey.trim()) {
        headers['x-api-key'] = apiKey.trim();
      }

      const res = await fetch('/api/v1/tenants', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          organisation: org.trim() || undefined,
          environment,
          region,
          plugins: selectedPlugins,
        }),
      });

      const data = await res.json();
      if (res.status !== 202) {
        throw new Error(data.message || data.error || `Provisioning failed with status ${res.status}`);
      }

      setOperationId(data.operationId);
      setTenantId(data.tenantId);
      setOperationStatus(data.status || 'PROVISIONING');

      // N2: Captures raw API key secret returned synchronously in 202 response
      if (data.apiKey && data.apiKey.secret) {
        setReturnedSecret(data.apiKey.secret);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate provisioning saga.');
      if (timerRef.current) clearInterval(timerRef.current);
    } finally {
      setSubmitting(false);
    }
  };

  // Poll live progress
  useEffect(() => {
    if (!operationId || operationStatus === 'ACTIVE' || operationStatus === 'FAILED' || operationStatus === 'CANCELLED') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const headers: Record<string, string> = {};
        if (apiKey.trim()) headers['x-api-key'] = apiKey.trim();

        const res = await fetch(`/api/v1/operations/${operationId}`, { headers });
        if (!res.ok) return;

        const op = await res.json();
        setOperationStatus(op.status);
        if (op.steps) setSteps(op.steps);
        if (op.tenantId) setTenantId(op.tenantId);
        if (op.error) setErrorMessage(op.error);

        if (op.status === 'ACTIVE' || op.status === 'FAILED' || op.status === 'CANCELLED') {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch (pollErr) {
        console.warn('Poll error:', pollErr);
      }
    }, 400);

    return () => clearInterval(pollInterval);
  }, [operationId, operationStatus, apiKey]);

  // Action Retry / Cancel
  const handleAction = async (action: 'retry' | 'cancel') => {
    if (!operationId) return;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey.trim()) headers['x-api-key'] = apiKey.trim();

      const res = await fetch(`/api/v1/operations/${operationId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setOperationStatus(data.status);
        if (data.steps) setSteps(data.steps);
        if (action === 'retry') setErrorMessage(null);
      }
    } catch (err: any) {
      alert(`Action ${action} failed: ${err.message}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // Progress Calculation
  const completedStepsCount = steps.filter((s) => s.status === 'COMPLETED').length;
  const totalStepsCount = Math.max(steps.length, 7);
  const progressPercent = Math.min(Math.round((completedStepsCount / totalStepsCount) * 100), 100);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <Link href="/platform/fleet" className={styles.backLink}>
            ← Back to Fleet Console
          </Link>
          <h1 className={styles.title}>
            🪐 Tenant Provisioning Wizard
          </h1>
          <p className={styles.subtitle}>
            Multi-plugin SaaS tenant orchestrator with live saga telemetry, synchronous customer secret delivery, and signed cryptographic isolation.
          </p>
        </div>
      </header>

      {/* STEP 1: CONFIGURATION FORM (Shown when no operation is active) */}
      {!operationId && (
        <form onSubmit={handleStartProvisioning} className={styles.card}>
          <div className={styles.sectionHeader}>
            <span className={styles.stepNumber}>1</span>
            <span>Tenant Identity & Placement</span>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="tenant-name" className={styles.label}>Tenant Name</label>
              <input
                id="tenant-name"
                className={styles.input}
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. City General Hospital"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="tenant-slug" className={styles.label}>Tenant Slug</label>
              <input
                id="tenant-slug"
                className={styles.input}
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g. city-general-hospital"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="org-slug" className={styles.label}>Organisation</label>
              <input
                id="org-slug"
                className={styles.input}
                type="text"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                placeholder="Organization slug or ID"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="env-select" className={styles.label}>Target Environment</label>
              <select
                id="env-select"
                className={styles.select}
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="region-select" className={styles.label}>Deployment Region</label>
              <select
                id="region-select"
                className={styles.select}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                <option value="us-east-1">us-east-1 (N. Virginia)</option>
                <option value="eu-west-1">eu-west-1 (Ireland)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="api-key" className={styles.label}>Customer API Key (Optional)</label>
              <input
                id="api-key"
                className={styles.input}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="orb_live_... (auto-uses current operator if empty)"
              />
            </div>
          </div>

          <div className={styles.sectionHeader} style={{ marginTop: '10px' }}>
            <span className={styles.stepNumber}>2</span>
            <span>Plugin Packages & Plan Tiers</span>
          </div>

          <div className={styles.pluginGrid}>
            {plugins.map((plugin) => (
              <div
                key={plugin.id}
                id={`plugin-card-${plugin.id}`}
                className={`${styles.pluginCard} ${plugin.selected ? styles.pluginCardSelected : ''}`}
                onClick={() => togglePlugin(plugin.id)}
              >
                <div className={styles.pluginCardTop}>
                  <span className={styles.pluginIcon}>{plugin.icon}</span>
                  <input
                    type="checkbox"
                    className={styles.pluginCheckbox}
                    checked={plugin.selected}
                    onChange={() => {}}
                  />
                </div>
                <h3 className={styles.pluginName}>{plugin.name}</h3>
                <p className={styles.pluginDesc}>{plugin.description}</p>
                {plugin.selected && (
                  <div
                    className={styles.planSelector}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label htmlFor={`plan-select-${plugin.id}`} className={styles.label}>Plan Tier:</label>
                    <select
                      id={`plan-select-${plugin.id}`}
                      className={styles.select}
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '11px' }}
                      value={plugin.plan}
                      onChange={(e) => setPluginPlan(plugin.id, e.target.value)}
                    >
                      {plugin.availablePlans.map((plan) => (
                        <option key={plan} value={plan}>{plan.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>

          {errorMessage && (
            <div style={{ color: '#EF4444', fontSize: '13px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              ⚠️ {errorMessage}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              id="provision-tenant-btn"
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={submitting}
            >
              {submitting ? 'Initiating Saga...' : '🚀 Provision Tenant (POST /api/v1/tenants)'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 2 & 3: LIVE SAGA PROGRESS TELEMETRY & COMPLETION */}
      {operationId && (
        <div className={styles.card}>
          <div className={styles.progressHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className={styles.badgeLive}>
                <span className={styles.pulseDot} />
                <span>LIVE SAGA TELEMETRY</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--ui-text-muted)' }}>
                Operation: <code style={{ color: 'var(--ui-text-primary)' }}>{operationId}</code>
              </span>
            </div>
            <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
              Elapsed: <strong>{(elapsedMs / 1000).toFixed(1)}s</strong> (SLA &lt; 60s)
            </div>
          </div>

          {tenantId && (
            <div style={{ fontSize: '12px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '6px' }}>
              Tenant ID: <code style={{ color: '#818CF8' }}>{tenantId}</code>
            </div>
          )}

          {/* Progress Bar */}
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Step Timeline */}
          <div className={styles.stepList}>
            {(steps.length > 0 ? steps : [
              { id: '1', name: 'Input & Organization Validation', status: 'COMPLETED', durationMs: 12 },
              { id: '2', name: 'Tenant Entity & Database Placement', status: 'COMPLETED', durationMs: 45 },
              { id: '3', name: 'Plan Entitlements & Revision Grants', status: 'COMPLETED', durationMs: 18 },
              { id: '4', name: 'Customer API Key Issuance (Synchronous)', status: 'COMPLETED', durationMs: 85 },
              { id: '5', name: 'Plugin Package Installation & Isolation', status: 'RUNNING' },
              { id: '6', name: 'Plugin Lifecycle Hooks Execution (Signed Bridge)', status: 'PENDING' },
              { id: '7', name: 'Final Status Activation & Webhook Dispatch', status: 'PENDING' },
            ] as OperationStep[]).map((step) => {
              const isRunning = step.status === 'RUNNING';
              const isCompleted = step.status === 'COMPLETED';
              const isFailed = step.status === 'FAILED';

              return (
                <div
                  key={step.id}
                  id={`step-item-${step.id}`}
                  className={`${styles.stepItem} ${
                    isRunning ? styles.stepItemRunning : isCompleted ? styles.stepItemCompleted : isFailed ? styles.stepItemFailed : ''
                  }`}
                >
                  <div className={styles.stepLeft}>
                    <div
                      className={`${styles.stepStatusIcon} ${
                        isRunning ? styles.stepStatusRunning : isCompleted ? styles.stepStatusCompleted : isFailed ? styles.stepStatusFailed : styles.stepStatusPending
                      }`}
                    >
                      {isCompleted ? '✓' : isFailed ? '✕' : isRunning ? '◌' : step.id}
                    </div>
                    <div>
                      <div className={styles.stepName}>{step.name}</div>
                      {step.error && (
                        <div style={{ color: '#EF4444', fontSize: '11px', marginTop: '2px' }}>
                          Error: {step.error}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={styles.stepDuration}>
                    {step.durationMs ? `${step.durationMs}ms` : isRunning ? 'Executing...' : 'Pending'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error & Compensation Actions */}
          {errorMessage && operationStatus === 'FAILED' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ color: '#EF4444', fontSize: '13px', background: 'rgba(239, 68, 68, 0.1)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <strong>Provisioning Failure:</strong> {errorMessage}
              </div>
              <div className={styles.btnRow}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => handleAction('retry')}
                >
                  🔄 Retry Step (action=retry)
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={() => handleAction('cancel')}
                >
                  ✕ Compensate & Deprovision (action=cancel)
                </button>
              </div>
            </div>
          )}

          {/* Single-Use Secret Card (Fix N2) */}
          {returnedSecret && (
            <div className={styles.secretCard}>
              <div className={styles.secretHeader}>
                <span>🔐</span>
                <span>CUSTOMER API KEY SECRET (Returned Synchronously in 202)</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#E5E7EB', lineHeight: 1.4 }}>
                This raw secret was returned synchronously in the initial 202 Accepted response. For security, raw secrets are never stored in the database. Copy this secret now:
              </p>
              <div className={styles.secretBox}>
                <span>
                  {revealSecret ? returnedSecret : '••••••••••••••••••••••••••••••••••••••••'}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                    onClick={() => setRevealSecret(!revealSecret)}
                  >
                    {revealSecret ? 'Hide' : 'Reveal'}
                  </button>
                  <button
                    id="copy-secret-btn"
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    style={{ padding: '4px 12px', fontSize: '11px' }}
                    onClick={() => copyToClipboard(returnedSecret)}
                  >
                    {copiedSecret ? '✓ Copied!' : 'Copy Secret'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Summary View */}
          {operationStatus === 'ACTIVE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
              <div style={{ color: '#10B981', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✨</span>
                <span>Tenant Successfully Provisioned and ACTIVE in {(elapsedMs / 1000).toFixed(1)}s!</span>
              </div>
              <div className={styles.btnRow}>
                <Link
                  href="/platform/fleet"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                >
                  🚀 Open Fleet Console
                </Link>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => {
                    setOperationId(null);
                    setReturnedSecret(null);
                    setOperationStatus(null);
                    setSteps([]);
                  }}
                >
                  + Provision Another Tenant
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
