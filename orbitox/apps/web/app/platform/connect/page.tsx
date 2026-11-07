'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './connect.module.css';

interface ProvisionedData {
  projectId: string;
  slug: string;
  name: string;
  template: string;
  plan: string;
  plugins: string[];
  features: string[];
  cliCommand: string;
  envBlock: string;
  scopedKey: string;
  controlPlaneUrl: string;
  port: number;
}

function ConnectProjectContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'manual' ? 'manual' : 'template';

  const [mode, setMode] = useState<'template' | 'manual'>(initialMode);

  // Template Provisioning State
  const [selectedTemplate, setSelectedTemplate] = useState<'restaurant' | 'crm' | 'blank'>('restaurant');
  const [templateName, setTemplateName] = useState('My Artisan Bistro');
  const [templateSlug, setTemplateSlug] = useState('my-artisan-bistro');
  const [selectedPlan, setSelectedPlan] = useState('plan_restaurant_growth');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisioned, setProvisioned] = useState<ProvisionedData | null>(null);
  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedEnvBlock, setCopiedEnvBlock] = useState(false);

  // Manual Connection State
  const [manualName, setManualName] = useState('My Connected App');
  const [manualSlug, setManualSlug] = useState('my-connected-app');
  const [manualProjectId, setManualProjectId] = useState('proj_my_app_01');
  const [manualPort, setManualPort] = useState('4000');
  const [runtimeToken, setRuntimeToken] = useState('');
  const [backendUrl, setBackendUrl] = useState('http://localhost:3005');
  const [revealToken, setRevealToken] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Live Heartbeat listener state
  const activeProjectId = provisioned ? provisioned.projectId : manualProjectId;
  const [isConnected, setIsConnected] = useState(false);
  const [connectedProject, setConnectedProject] = useState<any>(null);

  // Fetch control plane runtime token on mount
  useEffect(() => {
    fetch('/api/v1/system/runtime-token')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          if (res.data.runtimeToken) setRuntimeToken(res.data.runtimeToken);
          if (res.data.backendUrl) setBackendUrl(res.data.backendUrl);
        }
      })
      .catch(() => {});
  }, []);

  const handleTemplateNameChange = (val: string) => {
    setTemplateName(val);
    const derived = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setTemplateSlug(derived || 'my-saas');
  };

  const handleCreateFromTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProvisioning(true);
    setProvisionError(null);
    try {
      const res = await fetch('/api/v1/projects/template-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          slug: templateSlug,
          template: selectedTemplate,
          plan: selectedPlan,
          controlPlaneUrl: backendUrl,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create project from template');
      }
      setProvisioned(data.data);
    } catch (err: any) {
      setProvisionError(err.message || 'Error creating project');
    } finally {
      setIsProvisioning(false);
    }
  };

  // Poll for arrival of project's first heartbeat
  useEffect(() => {
    if (isConnected || !activeProjectId) return;

    const checkHeartbeat = async () => {
      try {
        const res = await fetch(`/api/v1/fleet?q=${activeProjectId}`, { cache: 'no-store' });
        const body = await res.json();
        if (body.success && Array.isArray(body.data?.projects)) {
          const found = body.data.projects.find((p: any) => p.id === activeProjectId);
          if (found && (found.connection === 'ONLINE' || found.connection === 'STALE')) {
            setIsConnected(true);
            setConnectedProject(found);
          }
        }
      } catch {}
    };

    const interval = setInterval(checkHeartbeat, 2000);
    return () => clearInterval(interval);
  }, [activeProjectId, isConnected]);

  const copyCliCommand = () => {
    if (!provisioned) return;
    navigator.clipboard.writeText(provisioned.cliCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const copyEnvBlock = () => {
    if (!provisioned) return;
    navigator.clipboard.writeText(provisioned.envBlock);
    setCopiedEnvBlock(true);
    setTimeout(() => setCopiedEnvBlock(false), 2000);
  };

  const rawEnvLines = `ORBITOX_BACKEND_URL=${backendUrl}\nORBITOX_RUNTIME_TOKEN=${runtimeToken || 'your-runtime-token'}`;
  const envLines = `ORBITOX_BACKEND_URL=${backendUrl}\nORBITOX_RUNTIME_TOKEN=${
    revealToken ? runtimeToken || 'your-runtime-token' : '••••••••••••••••••••••••••••••••'
  }`;

  const codeSnippet = `import { ControlClient } from '@orbitox/external-runtime-sdk';

const orbitox = new ControlClient({
  manifest: {
    projectId: '${manualProjectId}',
    slug: '${manualSlug}',
    name: '${manualName}',
    version: '1.0.0',
    type: 'custom-os',
    runtime: {
      type: 'standalone',
      entrypoint: 'src/server.ts',
      defaultPort: ${manualPort || '4000'},
      healthEndpoint: '/health',
    },
    enabledPlugins: [],
    enabledFeatures: [],
    apis: [],
    planReferences: [],
    environmentMetadata: { defaultEnvironment: 'local', supportedEnvironments: ['local'] },
    platformController: {
      controlPlaneUrl: process.env.ORBITOX_BACKEND_URL,
      syncIntervalSeconds: 5,
      requireSignedConfig: false,
    },
    capabilities: ['REALTIME_TELEMETRY_V1', 'REMOTE_COMMANDS_V1'],
  },
  controlPlaneUrl: process.env.ORBITOX_BACKEND_URL,
  apiKey: process.env.ORBITOX_RUNTIME_TOKEN,
  runtimePort: ${manualPort || '4000'},
});

await orbitox.registerRuntime();`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Project Factory & Connection</h1>
        <p className={styles.subtitle}>
          Scaffold new composed SaaS applications with authoritative plugins or connect existing external runtimes.
        </p>
      </header>

      {/* Mode Switcher Tabs */}
      <div className={styles.tabsBar} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'template'}
          className={`${styles.tabBtn} ${mode === 'template' ? styles.tabBtnActive : ''}`}
          onClick={() => setMode('template')}
        >
          🚀 Create Project from Template
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'manual'}
          className={`${styles.tabBtn} ${mode === 'manual' ? styles.tabBtnActive : ''}`}
          onClick={() => setMode('manual')}
        >
          🔌 Connect Existing Application
        </button>
      </div>

      {/* MODE 1: CREATE PROJECT FROM TEMPLATE */}
      {mode === 'template' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {!provisioned ? (
            <form onSubmit={handleCreateFromTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Step 1: Template Selection */}
              <section className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepNumber}>1</span>
                  <h2 className={styles.stepTitle}>Select Domain Template</h2>
                </div>

                <div className={styles.templateCards}>
                  {/* Restaurant OS */}
                  <div
                    className={`${styles.templateCard} ${selectedTemplate === 'restaurant' ? styles.templateCardActive : ''}`}
                    onClick={() => {
                      setSelectedTemplate('restaurant');
                      setSelectedPlan('plan_restaurant_growth');
                    }}
                  >
                    <div className={styles.templateIcon}>🍽️</div>
                    <h3 className={styles.templateTitle}>Restaurant & Bistro OS</h3>
                    <p className={styles.templateDesc}>
                      Composes <code>@orbitox/pos</code>: deterministic GST quote engine, idempotent order lifecycle, synchronized kitchen preparation DAG, and QR dining sessions.
                    </p>
                    <span className={styles.templateBadge}>Plugin: @orbitox/pos</span>
                  </div>

                  {/* CRM OS */}
                  <div
                    className={`${styles.templateCard} ${selectedTemplate === 'crm' ? styles.templateCardActive : ''}`}
                    onClick={() => {
                      setSelectedTemplate('crm');
                      setSelectedPlan('plan_crm_growth');
                    }}
                  >
                    <div className={styles.templateIcon}>💼</div>
                    <h3 className={styles.templateTitle}>Enterprise CRM & Deals OS</h3>
                    <p className={styles.templateDesc}>
                      Composes <code>@orbitox/crm</code>: predictive lead scoring, opportunity pipeline stages, durable status state machines, and multi-tenant rep isolation.
                    </p>
                    <span className={styles.templateBadge}>Plugin: @orbitox/crm</span>
                  </div>

                  {/* Blank Custom OS */}
                  <div
                    className={`${styles.templateCard} ${selectedTemplate === 'blank' ? styles.templateCardActive : ''}`}
                    onClick={() => {
                      setSelectedTemplate('blank');
                      setSelectedPlan('plan_custom_starter');
                    }}
                  >
                    <div className={styles.templateIcon}>📦</div>
                    <h3 className={styles.templateTitle}>Custom Foundation OS</h3>
                    <p className={styles.templateDesc}>
                      Composes <code>@orbitox/core</code>: barebones zero-trust multi-tenancy, custom domain router, and platform telemetry client.
                    </p>
                    <span className={styles.templateBadge}>Plugin: @orbitox/core</span>
                  </div>
                </div>
              </section>

              {/* Step 2: Application Spec */}
              <section className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepNumber}>2</span>
                  <h2 className={styles.stepTitle}>Application Identity & Plan</h2>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label className={styles.label} htmlFor="tmpl-name">Application Name</label>
                    <input
                      id="tmpl-name"
                      className={styles.input}
                      type="text"
                      value={templateName}
                      onChange={(e) => handleTemplateNameChange(e.target.value)}
                      placeholder="e.g. Sunset Bistro"
                      required
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label} htmlFor="tmpl-slug">Project Slug</label>
                    <input
                      id="tmpl-slug"
                      className={styles.input}
                      type="text"
                      value={templateSlug}
                      onChange={(e) => setTemplateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="e.g. sunset-bistro"
                      required
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label} htmlFor="tmpl-plan">Initial Quota Plan</label>
                    <select
                      id="tmpl-plan"
                      className={styles.input}
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                    >
                      {selectedTemplate === 'crm' ? (
                        <>
                          <option value="plan_crm_starter">CRM Starter (1,000 monthly leads)</option>
                          <option value="plan_crm_growth">CRM Growth (5,000 monthly leads)</option>
                          <option value="plan_crm_enterprise">CRM Enterprise (50,000 monthly leads)</option>
                        </>
                      ) : (
                        <>
                          <option value="plan_restaurant_starter">Restaurant Starter (2,500 orders/mo, 20 tables)</option>
                          <option value="plan_restaurant_growth">Restaurant Growth (10,000 orders/mo, 100 tables)</option>
                          <option value="plan_restaurant_enterprise">Restaurant Enterprise (Unlimited orders)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {provisionError && (
                  <div className={styles.secretWarning} style={{ color: 'var(--ui-danger)', borderColor: 'var(--ui-danger)' }}>
                    ❌ {provisionError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="submit"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    disabled={isProvisioning || !templateName.trim()}
                  >
                    {isProvisioning ? 'Provisioning Project…' : '⚡ Create Project from Template'}
                  </button>
                </div>
              </section>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Provisioning Success Banner */}
              <div className={styles.secretWarning}>
                <span>🔒</span>
                <span>
                  <strong>One-Time Scoped Key Issued:</strong> Save the <code>ORBITOX_API_KEY</code> and environment block below now. For cryptographic zero-trust security, secrets are never shown twice.
                </span>
              </div>

              {/* Step 1: Run CLI Scaffold Command */}
              <section className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepNumber}>1</span>
                  <h2 className={styles.stepTitle}>Scaffold Composed SaaS Application</h2>
                </div>
                <p className={styles.subtitle}>
                  Run this command in your terminal to generate the fully wired application:
                </p>

                <div className={styles.codeWrap}>
                  <div className={styles.codeHeader}>
                    <span>Terminal</span>
                    <button type="button" className={styles.btn} onClick={copyCliCommand}>
                      {copiedCli ? '✓ Copied' : 'Copy Command'}
                    </button>
                  </div>
                  <pre className={styles.codeBox}>{provisioned.cliCommand}</pre>
                </div>
              </section>

              {/* Step 2: Configure Generated .env */}
              <section className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepNumber}>2</span>
                  <h2 className={styles.stepTitle}>Set Scoped Environment Block</h2>
                </div>
                <p className={styles.subtitle}>
                  Place these variables into your new application's <code>.env</code> file:
                </p>

                <div className={styles.codeWrap}>
                  <div className={styles.codeHeader}>
                    <span>.env</span>
                    <button type="button" className={styles.btn} onClick={copyEnvBlock}>
                      {copiedEnvBlock ? '✓ Copied' : 'Copy .env'}
                    </button>
                  </div>
                  <pre className={styles.codeBox}>{provisioned.envBlock}</pre>
                </div>
              </section>

              {/* Step 3: View In Fleet & Quotas */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => {
                    setProvisioned(null);
                    setTemplateName('My Next SaaS');
                    setTemplateSlug('my-next-saas');
                  }}
                >
                  + Create Another Project
                </button>
                <Link
                  href={`/platform/projects/${provisioned.projectId}`}
                  className={`${styles.btn} ${styles.btnPrimary}`}
                >
                  Open Project Detail & Quotas →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: MANUAL SDK WIRING */}
      {mode === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Identity */}
          <section className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>1</span>
              <h2 className={styles.stepTitle}>Manual Project Identity</h2>
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="man-name">App Name</label>
                <input
                  id="man-name"
                  className={styles.input}
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="man-slug">Slug</label>
                <input
                  id="man-slug"
                  className={styles.input}
                  type="text"
                  value={manualSlug}
                  onChange={(e) => setManualSlug(e.target.value)}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="man-port">Port</label>
                <input
                  id="man-port"
                  className={styles.input}
                  type="number"
                  value={manualPort}
                  onChange={(e) => setManualPort(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Install SDK & env */}
          <section className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>2</span>
              <h2 className={styles.stepTitle}>Install SDK & Config</h2>
            </div>
            <div className={styles.codeWrap}>
              <div className={styles.codeHeader}>
                <span>Terminal</span>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => navigator.clipboard.writeText('npm install @orbitox/external-runtime-sdk')}
                >
                  Copy
                </button>
              </div>
              <pre className={styles.codeBox}>npm install @orbitox/external-runtime-sdk</pre>
            </div>

            <div className={styles.codeWrap}>
              <div className={styles.codeHeader}>
                <span>.env</span>
                <div className={styles.codeActions}>
                  <button type="button" className={styles.btn} onClick={() => setRevealToken(!revealToken)}>
                    {revealToken ? 'Mask Token' : 'Reveal Token'}
                  </button>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => {
                      navigator.clipboard.writeText(rawEnvLines);
                      setCopiedEnv(true);
                      setTimeout(() => setCopiedEnv(false), 2000);
                    }}
                  >
                    {copiedEnv ? '✓ Copied' : 'Copy .env'}
                  </button>
                </div>
              </div>
              <pre className={styles.codeBox}>{envLines}</pre>
            </div>
          </section>

          {/* Bootstrap */}
          <section className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>3</span>
              <h2 className={styles.stepTitle}>Bootstrap & Register</h2>
            </div>
            <div className={styles.codeWrap}>
              <div className={styles.codeHeader}>
                <span>src/orbitox-connect.ts</span>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => {
                    navigator.clipboard.writeText(codeSnippet);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                >
                  {copiedCode ? '✓ Copied' : 'Copy Code'}
                </button>
              </div>
              <pre className={styles.codeBox}>{codeSnippet}</pre>
            </div>
          </section>
        </div>
      )}

      {/* Real-Time Pulse Listener */}
      <section
        className={`${styles.listenerCard} ${isConnected ? styles.listenerConnected : ''}`}
        aria-live="polite"
      >
        <div className={styles.listenerLeft}>
          <div className={styles.pulseBox}>
            {!isConnected && <span className={styles.pulseRing} />}
            <span className={`${styles.pulseDot} ${isConnected ? styles.pulseConnected : ''}`} />
          </div>

          <div className={styles.listenerInfo}>
            <h3 className={styles.listenerTitle}>
              {isConnected
                ? `🎉 Connected! ${connectedProject?.name || activeProjectId} is reporting live.`
                : 'Waiting for application heartbeat…'}
            </h3>
            <p className={styles.listenerDesc}>
              {isConnected
                ? `Runtime reported online at ${connectedProject?.runtime?.url || 'http://localhost:4050'}. Automatic telemetry & command loop active.`
                : `Listening for registration and telemetry from ${activeProjectId}. Launch your application to establish live connection.`}
            </p>
          </div>
        </div>

        {isConnected && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href={`/platform/projects/${activeProjectId}`} className={`${styles.btn} ${styles.btnPrimary}`}>
              View Project Detail →
            </Link>
            <Link href="/platform/fleet" className={styles.btn}>
              Open in Fleet
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ConnectProjectPage() {
  return (
    <Suspense fallback={<div className={styles.page}>Loading Project Factory…</div>}>
      <ConnectProjectContent />
    </Suspense>
  );
}
