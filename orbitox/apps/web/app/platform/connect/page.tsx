'use client';

import React, { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import styles from './connect.module.css';

export default function ConnectProjectPage() {
  const [name, setName] = useState('My Connected App');
  const [slug, setSlug] = useState('my-connected-app');
  const [projectId, setProjectId] = useState('proj_my_app_01');
  const [port, setPort] = useState('4000');

  // Token & backend URL from server
  const [runtimeToken, setRuntimeToken] = useState('');
  const [backendUrl, setBackendUrl] = useState('http://localhost:3005');
  const [revealToken, setRevealToken] = useState(false);

  // Copy feedbacks
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Live connection status
  const [isConnected, setIsConnected] = useState(false);
  const [connectedProject, setConnectedProject] = useState<any>(null);

  // Generate random project ID on mount
  useEffect(() => {
    const rand = Math.random().toString(36).substring(2, 7);
    const initialSlug = 'my-app';
    setSlug(initialSlug);
    setProjectId(`proj_${initialSlug}_${rand}`);

    // Fetch runtime token from server
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

  const handleNameChange = (val: string) => {
    setName(val);
    const derivedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(derivedSlug);
    const rand = projectId.split('_').pop() || '01';
    setProjectId(`proj_${derivedSlug || 'app'}_${rand}`);
  };

  const handleSlugChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(clean);
    const rand = projectId.split('_').pop() || '01';
    setProjectId(`proj_${clean || 'app'}_${rand}`);
  };

  // Poll for arrival of the project's first heartbeat
  useEffect(() => {
    if (isConnected || !projectId) return;

    const checkHeartbeat = async () => {
      try {
        const res = await fetch(`/api/v1/fleet?q=${projectId}`, { cache: 'no-store' });
        const body = await res.json();
        if (body.success && Array.isArray(body.data?.projects)) {
          const found = body.data.projects.find((p: any) => p.id === projectId);
          if (found && (found.connection === 'ONLINE' || found.connection === 'STALE')) {
            setIsConnected(true);
            setConnectedProject(found);
          }
        }
      } catch {}
    };

    const interval = setInterval(checkHeartbeat, 2000);
    return () => clearInterval(interval);
  }, [projectId, isConnected]);

  const envLines = `ORBITOX_BACKEND_URL=${backendUrl}
ORBITOX_RUNTIME_TOKEN=${revealToken ? runtimeToken || 'your-runtime-token' : '••••••••••••••••••••••••••••••••'}`;

  const rawEnvLines = `ORBITOX_BACKEND_URL=${backendUrl}
ORBITOX_RUNTIME_TOKEN=${runtimeToken || 'your-runtime-token'}`;

  const codeSnippet = `import { ControlClient } from '@orbitox/external-runtime-sdk';

const orbitox = new ControlClient({
  manifest: {
    projectId: '${projectId}',
    slug: '${slug}',
    name: '${name}',
    version: '1.0.0',
    type: 'custom-os',
    runtime: {
      type: 'standalone',
      entrypoint: 'src/server.ts',
      defaultPort: ${port || '4000'},
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
  runtimePort: ${port || '4000'},
  onCommandReceived: async (cmd) => {
    console.log('[OrbitoX Command]', cmd.action);
    return { success: true, result: { executed: cmd.action, at: new Date().toISOString() } };
  },
});

// Registers with the control plane and starts automatic heartbeats.
// On initial registration, the control plane issues a project-scoped key
// which the SDK automatically stores and uses for all subsequent operations.
await orbitox.registerRuntime();`;

  const copyEnv = () => {
    navigator.clipboard.writeText(rawEnvLines);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Connect a Project</h1>
        <p className={styles.subtitle}>
          Add the OrbitoX SDK to any application and see it live in your control plane within seconds.
        </p>
      </header>

      {/* Step 1: Project Identity */}
      <section className={styles.stepCard} aria-labelledby="step1-heading">
        <div className={styles.stepHeader}>
          <span className={styles.stepNumber}>1</span>
          <h2 id="step1-heading" className={styles.stepTitle}>Project Identity</h2>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label className={styles.label} htmlFor="proj-name">Application Name</label>
            <input
              id="proj-name"
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Acme API Gateway"
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.label} htmlFor="proj-slug">Project Slug</label>
            <input
              id="proj-slug"
              className={styles.input}
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="e.g. acme-api-gateway"
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.label} htmlFor="proj-id">Generated Project ID</label>
            <input
              id="proj-id"
              className={styles.input}
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.label} htmlFor="proj-port">Default Runtime Port</label>
            <input
              id="proj-port"
              className={styles.input}
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="4000"
            />
          </div>
        </div>
      </section>

      {/* Step 2: Install SDK & Configure Environment */}
      <section className={styles.stepCard} aria-labelledby="step2-heading">
        <div className={styles.stepHeader}>
          <span className={styles.stepNumber}>2</span>
          <h2 id="step2-heading" className={styles.stepTitle}>Install SDK & Configure Environment</h2>
        </div>

        <div className={styles.codeWrap}>
          <div className={styles.codeHeader}>
            <span>Terminal</span>
            <button
              type="button"
              className={styles.btn}
              onClick={() => navigator.clipboard.writeText('pnpm add @orbitox/external-runtime-sdk')}
            >
              Copy
            </button>
          </div>
          <pre className={styles.codeBox}>pnpm add @orbitox/external-runtime-sdk</pre>
        </div>

        <div className={styles.codeWrap}>
          <div className={styles.codeHeader}>
            <span>.env</span>
            <div className={styles.codeActions}>
              <button
                type="button"
                className={styles.btn}
                onClick={() => setRevealToken(!revealToken)}
              >
                {revealToken ? 'Mask Token' : 'Reveal Token'}
              </button>
              <button type="button" className={styles.btn} onClick={copyEnv}>
                {copiedEnv ? '✓ Copied' : 'Copy .env'}
              </button>
            </div>
          </div>
          <pre className={styles.codeBox}>{envLines}</pre>
        </div>
      </section>

      {/* Step 3: Register Runtime */}
      <section className={styles.stepCard} aria-labelledby="step3-heading">
        <div className={styles.stepHeader}>
          <span className={styles.stepNumber}>3</span>
          <h2 id="step3-heading" className={styles.stepTitle}>Bootstrap & Register</h2>
        </div>

        <div className={styles.codeWrap}>
          <div className={styles.codeHeader}>
            <span>src/orbitox-connect.ts</span>
            <button type="button" className={styles.btn} onClick={copyCode}>
              {copiedCode ? '✓ Copied' : 'Copy Code'}
            </button>
          </div>
          <pre className={styles.codeBox}>{codeSnippet}</pre>
        </div>
      </section>

      {/* Step 4: Live Connection Status */}
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
              {isConnected ? `🎉 Connected! ${name} is live.` : 'Waiting for first heartbeat…'}
            </h3>
            <p className={styles.listenerDesc}>
              {isConnected
                ? `Runtime reported online from ${connectedProject?.runtime?.url || 'client'}. Automatic command loop active.`
                : `Listening for registration on ${projectId}. Launch your application to verify.`}
            </p>
          </div>
        </div>

        {isConnected && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href={`/platform/projects/${projectId}`} className={`${styles.btn} ${styles.btnPrimary}`}>
              View Project Detail →
            </Link>
            <Link href={`/platform/fleet?q=${slug}`} className={styles.btn}>
              Open in Fleet
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
