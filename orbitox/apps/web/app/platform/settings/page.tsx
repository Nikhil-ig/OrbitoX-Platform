'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './settings.module.css';

interface SecretItem {
  key: string;
  label: string;
  description: string;
  configured: boolean;
  scope: string;
  required: boolean;
}

interface PlatformSettingsData {
  secrets: SecretItem[];
  platform: {
    dataDir: string;
    version: string;
    nodeEnv: string;
    nodeVersion: string;
    uptimeSeconds: number;
    docsUrl: string;
  };
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function PlatformSettingsPage() {
  const [data, setData] = useState<PlatformSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/system/settings', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((body) => {
        if (body.success && body.data) {
          setData(body.data);
        } else {
          throw new Error(body.error?.message ?? 'Invalid response');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings & Configuration</h1>
        <p className={styles.subtitle}>
          Control plane secrets audit, persistence status, and token rotation procedures.
        </p>
      </header>

      {error && <div className={styles.notice} style={{ color: 'var(--ui-danger)' }}>{error}</div>}

      {/* Section 1: Secrets & Security Audit */}
      <section className={styles.card} aria-labelledby="secrets-heading">
        <div className={styles.cardHeader}>
          <h2 id="secrets-heading" className={styles.cardTitle}>Core Security & Secrets</h2>
        </div>

        <div className={styles.notice}>
          <strong>🔒 Zero-Exposure Verification:</strong> Secret values are strictly confidential.
          The control plane only verifies whether each variable is configured with valid cryptographic strength. Values are never exposed via UI or API.
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Variable</th>
                <th scope="col">Scope</th>
                <th scope="col">Requirement</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--ui-text-muted)' }}>
                    Auditing configured secrets…
                  </td>
                </tr>
              ) : (
                data?.secrets.map((sec) => (
                  <tr key={sec.key}>
                    <td data-label="Variable">
                      <span className={styles.mono}>{sec.key}</span>
                      <div style={{ fontSize: '11px', color: 'var(--ui-text-muted)', marginTop: '2px' }}>
                        {sec.description}
                      </div>
                    </td>
                    <td data-label="Scope">{sec.scope}</td>
                    <td data-label="Requirement">
                      <span style={{ fontSize: '12px', color: sec.required ? 'var(--ui-text-primary)' : 'var(--ui-text-muted)' }}>
                        {sec.required ? 'Required in Prod' : 'Optional'}
                      </span>
                    </td>
                    <td data-label="Status">
                      {sec.configured ? (
                        <span className={`${styles.tag} ${styles.tagConfigured}`}>
                          <span className={`${styles.dot} ${styles.dotOnline}`} />
                          Configured
                        </span>
                      ) : sec.required ? (
                        <span className={`${styles.tag} ${styles.tagMissing}`}>
                          <span className={`${styles.dot} ${styles.dotOffline}`} />
                          Missing
                        </span>
                      ) : (
                        <span className={`${styles.tag} ${styles.tagOptional}`}>
                          <span className={`${styles.dot} ${styles.dotNeutral}`} />
                          Not Set
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Platform Environment & Storage */}
      <section className={styles.card} aria-labelledby="platform-heading">
        <div className={styles.cardHeader}>
          <h2 id="platform-heading" className={styles.cardTitle}>Platform Runtime & Storage</h2>
        </div>

        <div className={styles.grid2}>
          <div className={styles.infoList}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>State Storage Directory</span>
              <span className={`${styles.infoVal} ${styles.mono}`}>{data?.platform.dataDir ?? '—'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Control Plane Version</span>
              <span className={styles.infoVal}>v{data?.platform.version ?? '1.0.0'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Node Environment</span>
              <span className={styles.infoVal} style={{ textTransform: 'capitalize' }}>
                {data?.platform.nodeEnv ?? 'development'}
              </span>
            </div>
          </div>

          <div className={styles.infoList}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Node.js Engine</span>
              <span className={`${styles.infoVal} ${styles.mono}`}>{data?.platform.nodeVersion ?? process.version}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Process Uptime</span>
              <span className={styles.infoVal}>{data ? formatUptime(data.platform.uptimeSeconds) : '—'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Data Persistence Engine</span>
              <span className={styles.infoVal}>PersistentControlStore (File-Backed JSON)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Token Rotation Instructions */}
      <section className={styles.card} aria-labelledby="rotation-heading">
        <div className={styles.cardHeader}>
          <h2 id="rotation-heading" className={styles.cardTitle}>Token Rotation Procedures</h2>
        </div>

        <div className={styles.notice}>
          To maintain zero disruption while rotating secrets, follow these steps sequentially:
        </div>

        <ol className={styles.stepList}>
          <li>
            <strong>Generate a fresh 32-byte secret:</strong>
            <pre className={styles.codeBox}>openssl rand -hex 32</pre>
          </li>
          <li>
            <strong>Rotating <code>ORBITOX_ADMIN_TOKEN</code>:</strong>
            <div>Update <code>ORBITOX_ADMIN_TOKEN</code> in your environment / volume and restart the control plane server. You will be prompted to re-authenticate with the new password.</div>
          </li>
          <li>
            <strong>Rotating <code>ORBITOX_RUNTIME_TOKEN</code> (Client apps):</strong>
            <div>
              1. Update <code>ORBITOX_RUNTIME_TOKEN</code> in your deployment secrets.<br />
              2. Update your connected client apps with the new token.<br />
              3. The client SDK will register with the updated credential on its next heartbeat.
            </div>
          </li>
        </ol>
      </section>

      {/* Section 4: Documentation & Architecture Guides */}
      <section className={styles.card} aria-labelledby="docs-heading">
        <div className={styles.cardHeader}>
          <h2 id="docs-heading" className={styles.cardTitle}>Architecture & Documentation</h2>
        </div>

        <div className={styles.linkGrid}>
          <a
            href="https://github.com/Nikhil-ig/OrbitoX-Platform/blob/main/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkCard}
          >
            <span className={styles.linkTitle}>Platform README ↗</span>
            <span className={styles.linkDesc}>Quick start, core architecture, and commands.</span>
          </a>

          <a
            href="https://github.com/Nikhil-ig/OrbitoX-Platform/blob/main/docs/02_ARCHITECTURE.md"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkCard}
          >
            <span className={styles.linkTitle}>Architecture Guide ↗</span>
            <span className={styles.linkDesc}>Singletons, ServiceContainer, and Facades.</span>
          </a>

          <a
            href="https://github.com/Nikhil-ig/OrbitoX-Platform/blob/main/docs/SECURITY_CLEANUP.md"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkCard}
          >
            <span className={styles.linkTitle}>Security Cleanup ↗</span>
            <span className={styles.linkDesc}>History purging, key rotation checklist.</span>
          </a>

          <a
            href="https://github.com/Nikhil-ig/OrbitoX-Platform/blob/main/docs/12_PRODUCTION_DEPLOYMENT.md"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkCard}
          >
            <span className={styles.linkTitle}>Production Deployment ↗</span>
            <span className={styles.linkDesc}>Docker compose, Redis, and health checks.</span>
          </a>
        </div>
      </section>
    </div>
  );
}
