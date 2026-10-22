'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectControlCenterPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { projectId } = resolvedParams;

  // Active Tab State
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'config'
    | 'plugins'
    | 'features'
    | 'apis'
    | 'plans'
    | 'quotes'
    | 'environments'
    | 'runtime'
    | 'commands'
    | 'health'
    | 'audit'
    | 'security'
    | 'mcp'
  >('overview');

  // Live Data from Control Plane APIs
  const [manifest, setManifest] = useState<any>(null);
  const [apis, setApis] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [entitlements, setEntitlements] = useState<Record<string, any>>({});
  const [plugins, setPlugins] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [commands, setCommands] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [environments, setEnvironments] = useState<any[]>([]);

  // Desired State / Revision Workspace State
  const [desiredRevisionNumber, setDesiredRevisionNumber] = useState(1);
  const [activeRevisionNumber, setActiveRevisionNumber] = useState(1);
  const [syncStatus, setSyncStatus] = useState<'IN_SYNC' | 'OUT_OF_SYNC' | 'RECONCILING'>('IN_SYNC');
  const [draftFeatures, setDraftFeatures] = useState<Record<string, boolean>>({});
  const [draftCustomConfig, setDraftCustomConfig] = useState<string>('{}');

  // Modals & Inspectors
  const [selectedPlugin, setSelectedPlugin] = useState<any>(null);
  const [selectedApi, setSelectedApi] = useState<any>(null);
  const [selectedCommandAction, setSelectedCommandAction] = useState('rotate_qr_locator');
  const [commandParam, setCommandParam] = useState('T-14');

  // Quote Playground State
  const [quotePlanId, setQuotePlanId] = useState('plan_restaurant_growth');
  const [quoteDiscount, setQuoteDiscount] = useState(10);
  const [computedQuote, setComputedQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Status & Feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const loadAllData = async () => {
    try {
      // 1. Manifest
      const resManifest = await fetch(`/api/v1/projects/${projectId}/manifest`);
      if (resManifest.ok) {
        const d = await resManifest.json();
        setManifest(d.manifest);
      }

      // 2. APIs
      const resApis = await fetch(`/api/v1/projects/${projectId}/apis`);
      if (resApis.ok) {
        const d = await resApis.json();
        setApis(d.apis || []);
      }

      // 3. Plans
      const resPlans = await fetch(`/api/v1/projects/${projectId}/plans`);
      if (resPlans.ok) {
        const d = await resPlans.json();
        setPlans(d.availablePlans || []);
      }

      // 4. Features & Entitlements
      const resFeatures = await fetch(`/api/v1/projects/${projectId}/features`);
      if (resFeatures.ok) {
        const d = await resFeatures.json();
        setFeatures(d.features || {});
        setDraftFeatures(d.features || {});
        setEntitlements(d.entitlements || {});
      }

      // 5. Revisions
      const resRev = await fetch(`/api/v1/projects/${projectId}/revisions`);
      if (resRev.ok) {
        const d = await resRev.json();
        setRevisions(d.revisions || []);
        setDesiredRevisionNumber(d.desiredRevisionNumber || 1);
        setActiveRevisionNumber(d.activeRevisionNumber || 1);
        setSyncStatus(d.syncStatus || 'IN_SYNC');
        if (d.desiredState?.customConfig) {
          setDraftCustomConfig(JSON.stringify(d.desiredState.customConfig, null, 2));
        }
      }

      // 6. Plugins
      const resPlug = await fetch(`/api/v1/projects/${projectId}/plugins`);
      if (resPlug.ok) {
        const d = await resPlug.json();
        setPlugins(d.plugins || []);
      }

      // 7. Commands
      const resCmd = await fetch(`/api/v1/projects/${projectId}/commands`);
      if (resCmd.ok) {
        const d = await resCmd.json();
        setCommands(d.commands || []);
      }

      // 8. Health
      const resH = await fetch(`/api/v1/projects/${projectId}/health`);
      if (resH.ok) {
        const d = await resH.json();
        setHealthData(d);
      }

      // 9. Audits
      const resAud = await fetch(`/api/v1/projects/${projectId}/audit`);
      if (resAud.ok) {
        const d = await resAud.json();
        setAudits(d.audits || []);
      }

      // 10. Environments
      const resEnv = await fetch(`/api/v1/projects/${projectId}/environments`);
      if (resEnv.ok) {
        const d = await resEnv.json();
        setEnvironments(d.environments || []);
      }
    } catch (err) {
      console.error('Error fetching project control data:', err);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  // Apply Changes / Create Revision
  const handleApplyDesiredState = async () => {
    try {
      let customConfigObj = {};
      try {
        customConfigObj = JSON.parse(draftCustomConfig);
      } catch {
        showFeedback('Invalid JSON format in custom config editor', 'error');
        return;
      }

      const desiredState = {
        features: draftFeatures,
        entitlements,
        apiPolicies: {
          'restaurant.quote': { rateLimit: 300, allowedScopes: ['pos.quote', 'diner.public'] },
          'restaurant.orders': { rateLimit: 120, allowedScopes: ['pos.orders.write', 'diner.order'] },
        },
        customConfig: customConfigObj,
      };

      const res = await fetch(`/api/v1/projects/${projectId}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPLY', desiredState }),
      });

      if (!res.ok) throw new Error('Failed to apply configuration revision');
      const json = await res.json();
      showFeedback(`Revision #${json.revision.revisionNumber} applied successfully! Projected to runtime.`);
      loadAllData();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  // Rollback to Revision
  const handleRollback = async (revisionId: string) => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ROLLBACK', revisionId }),
      });
      if (!res.ok) throw new Error('Failed to execute rollback');
      showFeedback(`Successfully rolled back state to revision ${revisionId}`);
      loadAllData();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  // Issue Controlled Command
  const handleIssueCommand = async () => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ISSUE',
          commandAction: selectedCommandAction,
          parameters: { target: commandParam },
        }),
      });
      if (!res.ok) throw new Error('Failed to issue command');
      showFeedback(`Authorized command [${selectedCommandAction}] issued to runtime!`);
      loadAllData();
    } catch (err: any) {
      showFeedback(err.message, 'error');
    }
  };

  // Toggle Feature Flag
  const handleToggleFeature = (key: string) => {
    setDraftFeatures((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Compute Quote
  const handleComputeQuote = async () => {
    setQuoteLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/quotes/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: quotePlanId,
          customDiscountPercent: quoteDiscount,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setComputedQuote(d.quote);
      }
    } finally {
      setQuoteLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#090C15', color: '#F8FAFC', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ─── Command Center Top Bar ─── */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(12, 16, 28, 0.95)',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/admin/projects"
            style={{
              color: '#94A3B8',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ← Projects
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                {manifest?.name || 'External OS Project'}
              </span>
              <code style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', color: '#94A3B8' }}>
                {manifest?.slug || projectId}
              </code>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px', fontSize: '11px', color: '#64748B' }}>
              <span>Type: <strong>{manifest?.type || 'standalone'}</strong></span>
              <span>•</span>
              <span>Port: <strong>{manifest?.runtime?.defaultPort || 4010}</strong></span>
              <span>•</span>
              <span>Env: <strong style={{ color: '#818CF8' }}>Production</strong></span>
            </div>
          </div>
        </div>

        {/* Sync Status Badge & Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              background: syncStatus === 'IN_SYNC' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${syncStatus === 'IN_SYNC' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              color: syncStatus === 'IN_SYNC' ? '#10B981' : '#F59E0B',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: syncStatus === 'IN_SYNC' ? '#10B981' : '#F59E0B',
                boxShadow: `0 0 6px ${syncStatus === 'IN_SYNC' ? '#10B981' : '#F59E0B'}`,
              }}
            />
            <span>{syncStatus === 'IN_SYNC' ? `IN SYNC (Rev #${activeRevisionNumber})` : `OUT OF SYNC (Rev #${desiredRevisionNumber})`}</span>
          </div>

          <button
            onClick={handleApplyDesiredState}
            style={{
              padding: '8px 16px',
              background: '#5865F2',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Apply Desired State
          </button>

          <a
            href="http://localhost:4010"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 122, 26, 0.15)',
              border: '1px solid rgba(255, 122, 26, 0.4)',
              color: '#FF9533',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            Open Runtime (:4010) ↗
          </a>
        </div>
      </header>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          style={{
            padding: '10px 32px',
            background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            borderBottom: `1px solid ${feedbackMsg.type === 'success' ? '#10B981' : '#EF4444'}`,
            color: feedbackMsg.type === 'success' ? '#10B981' : '#EF4444',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          {feedbackMsg.text}
        </div>
      )}

      {/* ─── Navigation Tabs Bar (Resource Workspace) ─── */}
      <div
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: '#0B0E1B',
          padding: '0 32px',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'config', label: 'Configuration & Revisions' },
          { id: 'plugins', label: 'Plugins' },
          { id: 'features', label: 'Features & Limits' },
          { id: 'apis', label: 'Central API Registry' },
          { id: 'plans', label: 'Plans & Pricing' },
          { id: 'quotes', label: 'Central Quotes' },
          { id: 'environments', label: 'Environments' },
          { id: 'runtime', label: 'Runtime Fleet' },
          { id: 'commands', label: 'Commands' },
          { id: 'health', label: 'Health' },
          { id: 'audit', label: 'Audit Trail' },
          { id: 'security', label: 'Security & Zero-Trust' },
          { id: 'mcp', label: 'AI & MCP' },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '14px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid #FF7A1A' : '2px solid transparent',
                color: active ? '#FFFFFF' : '#94A3B8',
                fontSize: '13px',
                fontWeight: active ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Workspace Tab Body ─── */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#111528', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Target Architecture</div>
                <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '6px', color: '#FFFFFF' }}>Independent Runtime</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Decoupled product under <code>projects/external-os/{manifest?.slug}</code></div>
              </div>

              <div style={{ background: '#111528', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Active Revision</div>
                <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '6px', color: '#38BDF8' }}>Rev #{activeRevisionNumber} (Applied)</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Desired revision: #{desiredRevisionNumber}</div>
              </div>

              <div style={{ background: '#111528', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Runtime Process</div>
                <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '6px', color: '#10B981' }}>PID {healthData?.runtime?.pid || process.pid} · Online</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Memory: {healthData?.runtime?.memoryMb || 32} MB · Port {manifest?.runtime?.defaultPort || 4010}</div>
              </div>

              <div style={{ background: '#111528', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Central APIs Tracked</div>
                <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '6px', color: '#FF7A1A' }}>{apis.length} Registered APIs</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Includes <code>restaurant.quote</code>, <code>restaurant.kds</code></div>
              </div>
            </div>

            {/* Runtime Applications Launchpad */}
            <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Independent Product Runtime Launchpad</div>
              <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>
                The OrbitoX Platform governs project configuration, while the end-user applications execute independently on port {manifest?.runtime?.defaultPort || 4010}.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <a
                  href={`http://localhost:${manifest?.runtime?.defaultPort || 4010}/dine/7Kp9xQ8m2L`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#151A2E',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '20px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>📱 Diner Mobile PWA</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '14px' }}>Interactive guest discovery, seating capabilities, cart, and prep tracking.</div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#FF7A1A' }}>Launch Table T-14 PWA ↗</span>
                </a>

                <a
                  href={`http://localhost:${manifest?.runtime?.defaultPort || 4010}/kds`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#151A2E',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '20px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>👨‍🍳 Kitchen Display (KDS)</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '14px' }}>Station ticket queues with real transitions (Queued, In Prep, Ready, Bumped).</div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#FF7A1A' }}>Open Touch KDS ↗</span>
                </a>

                <a
                  href={`http://localhost:${manifest?.runtime?.defaultPort || 4010}/operations`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#151A2E',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '20px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>🗺️ Spatial Floor Operations</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '14px' }}>Spatial SVG floor map. Draggable tables, real-time occupancy, persistent layout.</div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#FF7A1A' }}>Open Floor Canvas ↗</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONFIGURATION & REVISIONS */}
        {activeTab === 'config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              {/* Desired State Editor */}
              <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 800 }}>Desired-State Configuration Editor</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>Authoritative state projected down to the external runtime.</div>
                  </div>
                  <button
                    onClick={handleApplyDesiredState}
                    style={{
                      padding: '8px 16px',
                      background: '#FF7A1A',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Apply & Create Revision
                  </button>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#818CF8', display: 'block', marginBottom: '8px' }}>
                    Feature Flags (Projected into Runtime)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {Object.keys(draftFeatures).map((k) => (
                      <div
                        key={k}
                        onClick={() => handleToggleFeature(k)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: draftFeatures[k] ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${draftFeatures[k] ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '13px',
                          fontWeight: 700,
                        }}
                      >
                        <code>{k}</code>
                        <span style={{ fontSize: '11px', color: draftFeatures[k] ? '#10B981' : '#64748B' }}>
                          {draftFeatures[k] ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#818CF8', display: 'block', marginBottom: '8px' }}>
                    Custom Config JSON (Tax Rates, Brand, Policies)
                  </label>
                  <textarea
                    rows={8}
                    value={draftCustomConfig}
                    onChange={(e) => setDraftCustomConfig(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#070912',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#F8FAFC',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>

              {/* Revision History */}
              <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Revision History & Audit</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px' }}>Immutable ledger of configuration releases and rollbacks.</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {revisions.map((rev) => (
                    <div
                      key={rev.revisionId}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        background: '#151A2E',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800, fontSize: '14px' }}>Rev #{rev.revisionNumber}</span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: rev.status === 'APPLIED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 122, 26, 0.2)',
                              color: rev.status === 'APPLIED' ? '#10B981' : '#FF9533',
                            }}
                          >
                            {rev.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                          {rev.diff?.summary || 'Configuration update'} • {new Date(rev.createdAt).toLocaleTimeString()}
                        </div>
                      </div>

                      {rev.revisionNumber !== activeRevisionNumber && (
                        <button
                          onClick={() => handleRollback(rev.revisionId)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            color: '#94A3B8',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Rollback
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PLUGINS */}
        {activeTab === 'plugins' && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Platform Plugin Registry</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '20px' }}>Installed extensions providing capabilities and registering external APIs.</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {plugins.map((plugin) => (
                <div
                  key={plugin.id}
                  style={{
                    background: '#151A2E',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>{plugin.name}</div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: plugin.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                          color: plugin.enabled ? '#10B981' : '#64748B',
                        }}
                      >
                        {plugin.enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                    <code style={{ fontSize: '11px', color: '#818CF8' }}>{plugin.id} v{plugin.version}</code>
                    <div style={{ fontSize: '12px', color: '#94A3B8', margin: '10px 0', lineHeight: 1.4 }}>
                      {plugin.description}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                      {plugin.capabilities?.map((c: string) => (
                        <span key={c} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', color: '#CBD5E1' }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPlugin(plugin)}
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(88, 101, 242, 0.15)',
                      border: '1px solid rgba(88, 101, 242, 0.3)',
                      color: '#818CF8',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Configure Plugin Schema →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: FEATURES & LIMITS */}
        {activeTab === 'features' && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800 }}>Feature Flags & Usage Limits</div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Platform-controlled operational toggles and quotas.</div>
              </div>
              <button
                onClick={handleApplyDesiredState}
                style={{
                  padding: '8px 16px',
                  background: '#5865F2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Save & Apply to Runtime
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {Object.keys(draftFeatures).map((f) => (
                <div
                  key={f}
                  onClick={() => handleToggleFeature(f)}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    background: draftFeatures[f] ? 'rgba(16, 185, 129, 0.1)' : '#151A2E',
                    border: `1px solid ${draftFeatures[f] ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800 }}>{f}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Synchronized with bridge</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: draftFeatures[f] ? '#10B981' : '#64748B' }}>
                    {draftFeatures[f] ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>Entitlement Quotas</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {Object.keys(entitlements).map((ek) => {
                const item = entitlements[ek];
                return (
                  <div key={ek} style={{ padding: '16px', background: '#151A2E', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800 }}>
                      <span style={{ textTransform: 'capitalize' }}>{ek}</span>
                      <span style={{ color: '#FF7A1A' }}>{item.used} / {item.limit}</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', marginTop: '10px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (item.used / item.limit) * 100)}%`, height: '100%', background: '#FF7A1A' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: CENTRAL API REGISTRY */}
        {activeTab === 'apis' && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Central API Registry</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '20px' }}>Authoritative registry of contract routes exposed by this project.</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {apis.map((api) => (
                <div
                  key={api.name}
                  onClick={() => setSelectedApi(api)}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    background: '#151A2E',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 900,
                        background: api.method === 'POST' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: api.method === 'POST' ? '#38BDF8' : '#10B981',
                      }}
                    >
                      {api.method}
                    </span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>{api.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}><code>{api.route}</code></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '12px', color: '#94A3B8' }}>
                    <span>Limit: {api.rateLimitPerMin || 300}/min</span>
                    <span>Auth: {api.requiresAuth ? 'Required' : 'Public'}</span>
                    <span style={{ color: '#10B981', fontWeight: 800 }}>● Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: PLANS & PRICING */}
        {activeTab === 'plans' && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Commercial Plans & Tiers</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '20px' }}>Platform-owned subscription models referenced by this external product.</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
              {plans.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: '#151A2E',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '16px', fontWeight: 900 }}>{p.name}</span>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#5865F2', color: '#fff' }}>
                        {p.tier}
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#FF7A1A', margin: '14px 0 6px 0' }}>
                      ₹{(parseInt(p.basePriceMinor || '0') / 100).toFixed(2)}
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}> / month</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px' }}>
                      Includes {p.features?.length || 0} features & quotas.
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setQuotePlanId(p.id);
                      setActiveTab('quotes');
                    }}
                    style={{
                      padding: '8px',
                      background: 'rgba(255, 122, 26, 0.1)',
                      border: '1px solid rgba(255, 122, 26, 0.3)',
                      color: '#FF7A1A',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Simulate Quote with this Plan →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: CENTRAL QUOTES */}
        {activeTab === 'quotes' && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Central Quote Engine Calculator</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '24px' }}>Deterministic quote calculator using platform pricing rules and integer minor units.</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ background: '#151A2E', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Target Plan</label>
                  <select
                    value={quotePlanId}
                    onChange={(e) => setQuotePlanId(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#0B0E1B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (Tier: {p.tier})</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Discount Percent: {quoteDiscount}%</label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={quoteDiscount}
                    onChange={(e) => setQuoteDiscount(parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <button
                  onClick={handleComputeQuote}
                  disabled={quoteLoading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#FF7A1A',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {quoteLoading ? 'Computing Deterministic Quote...' : 'Compute Central Quote'}
                </button>
              </div>

              {/* Quote Breakdown Output */}
              <div style={{ background: '#151A2E', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>Computed Quote Output</div>
                {computedQuote ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Quote ID:</span>
                      <code>{computedQuote.quoteId}</code>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Base Amount:</span>
                      <span>₹{(parseInt(computedQuote.baseAmountMinor) / 100).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Discount:</span>
                      <span style={{ color: '#10B981' }}>-₹{(parseInt(computedQuote.discountMinor) / 100).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>GST (5%):</span>
                      <span>₹{(parseInt(computedQuote.taxMinor) / 100).toFixed(2)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '16px' }}>
                      <span>Total:</span>
                      <span style={{ color: '#FF7A1A' }}>₹{(parseInt(computedQuote.totalMinor) / 100).toFixed(2)}</span>
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748B' }}>
                      SHA-256 Result Hash: <code>{computedQuote.resultHash?.substring(0, 24)}...</code>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#64748B', fontSize: '13px' }}>Click &quot;Compute Central Quote&quot; to test quote rules.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: ENVIRONMENTS */}
        {activeTab === 'environments' && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Isolated Deployment Environments</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '20px' }}>Local, staging, and production configurations with secret management.</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {environments.map((env) => (
                <div key={env.id} style={{ background: '#151A2E', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, textTransform: 'capitalize' }}>{env.name}</span>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                      {env.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#818CF8', marginBottom: '12px' }}><code>{env.url}</code></div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                    Variables: {Object.keys(env.variables || {}).length} configured
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: RUNTIME FLEET & DIAGNOSTICS */}
        {activeTab === 'runtime' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800 }}>Runtime Fleet Diagnostics</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>Live process telemetry, control handshake session, and memory footprint.</div>
                </div>
                <a
                  href={`http://localhost:${manifest?.runtime?.defaultPort || 4010}/developer/diagnostics`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#FF7A1A',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Open External Diagnostics Page ↗
                </a>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '16px', background: '#151A2E', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>PROCESS PID</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>{healthData?.runtime?.pid || process.pid}</div>
                </div>

                <div style={{ padding: '16px', background: '#151A2E', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>HEAP USAGE</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>{healthData?.runtime?.memoryMb || 34} MB</div>
                </div>

                <div style={{ padding: '16px', background: '#151A2E', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>UPTIME</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>{healthData?.runtime?.uptimeSeconds || 120}s</div>
                </div>

                <div style={{ padding: '16px', background: '#151A2E', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>DESIRED / APPLIED REV</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', color: '#38BDF8' }}>
                    #{desiredRevisionNumber} / #{activeRevisionNumber}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: COMMANDS */}
        {activeTab === 'commands' && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Authorized Runtime Commands</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '20px' }}>Issue authenticated operational directives directly to the external runtime.</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
              <div style={{ background: '#151A2E', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Action</label>
                  <select
                    value={selectedCommandAction}
                    onChange={(e) => setSelectedCommandAction(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#0B0E1B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                  >
                    <option value="rotate_qr_locator">Rotate Table QR Locator (rotate_qr_locator)</option>
                    <option value="run_health_check">Run Health Check Probe (run_health_check)</option>
                    <option value="refresh_cache">Clear & Refresh Cache (refresh_cache)</option>
                    <option value="reconcile_plugins">Force Reconcile Plugins (reconcile_plugins)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Target / Parameter</label>
                  <input
                    type="text"
                    value={commandParam}
                    onChange={(e) => setCommandParam(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#0B0E1B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                  />
                </div>

                <button
                  onClick={handleIssueCommand}
                  style={{
                    padding: '12px 24px',
                    background: '#FF7A1A',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Dispatch Command to Runtime →
                </button>
              </div>

              {/* Command Ledger */}
              <div style={{ background: '#151A2E', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>Recent Command Executions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {commands.map((cmd) => (
                    <div key={cmd.commandId} style={{ padding: '10px', background: '#0B0E1B', borderRadius: '6px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                        <span>{cmd.action}</span>
                        <span style={{ color: cmd.status === 'COMPLETED' ? '#10B981' : '#FF9533' }}>{cmd.status}</span>
                      </div>
                      <div style={{ color: '#64748B', fontSize: '11px', marginTop: '2px' }}>
                        ID: <code>{cmd.commandId}</code> • {new Date(cmd.issuedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 11: HEALTH */}
        {activeTab === 'health' && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Subsystem Telemetry & Health</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '20px' }}>Deep health verification across bridge, crypto signer, quote engine, and API routes.</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {Object.keys(healthData?.subsystems || {}).map((k) => {
                const sub = healthData.subsystems[k];
                return (
                  <div key={k} style={{ padding: '18px', background: '#151A2E', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 800 }}>{k}</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981', marginTop: '6px' }}>● {sub.status}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                      Latency: {sub.latencyMs || 2}ms
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 12: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Platform Audit Trail</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '20px' }}>Cryptographically tamper-evident event log.</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {audits.map((a) => (
                <div key={a.id} style={{ padding: '12px 16px', background: '#151A2E', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <div>
                    <span style={{ fontWeight: 800, color: '#FFFFFF' }}>{a.action}</span>
                    <span style={{ color: '#64748B', marginLeft: '10px' }}>Actor: <code>{a.actor}</code></span>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <span style={{ color: a.status === 'SUCCESS' ? '#10B981' : '#EF4444', fontWeight: 800 }}>{a.status}</span>
                    <span style={{ color: '#64748B' }}>{new Date(a.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 13: SECURITY & ZERO-TRUST */}
        {activeTab === 'security' && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Zero-Trust Cryptographic Security</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '20px' }}>HMAC-SHA256 signature keys, capability tokens, and replay prevention.</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ padding: '14px', background: '#151A2E', borderRadius: '8px' }}>
                <span style={{ color: '#94A3B8' }}>Signing Algorithm:</span> <strong>HMAC-SHA256</strong>
              </div>
              <div style={{ padding: '14px', background: '#151A2E', borderRadius: '8px' }}>
                <span style={{ color: '#94A3B8' }}>Capability Epoch Duration:</span> <strong>14,400 seconds (4 Hours)</strong>
              </div>
              <div style={{ padding: '14px', background: '#151A2E', borderRadius: '8px' }}>
                <span style={{ color: '#94A3B8' }}>Replay Prevention:</span> <strong>Idempotency Token Required on Writes</strong>
              </div>
            </div>
          </div>
        )}

        {/* TAB 14: AI & MCP */}
        {activeTab === 'mcp' && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Model Context Protocol (MCP) Governance</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '20px' }}>Exposed AI tools and operational authorization levels.</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { name: 'restaurant.get_kitchen_load', level: 1, desc: 'Query active station queue tasks and SLA countdowns' },
                { name: 'restaurant.get_sales', level: 1, desc: 'Read shift revenue and fulfillment stats' },
                { name: 'restaurant.toggle_item_availability', level: 2, desc: 'Mark out-of-stock menu items' },
                { name: 'restaurant.bump_task', level: 2, desc: 'Transition culinary ticket status' },
              ].map((tool) => (
                <div key={tool.name} style={{ padding: '14px', background: '#151A2E', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <code style={{ fontSize: '13px', color: '#FF7A1A' }}>{tool.name}</code>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{tool.desc}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 8px', borderRadius: '4px', background: 'rgba(88, 101, 242, 0.2)', color: '#818CF8' }}>
                    Level {tool.level} ({tool.level === 1 ? 'Read' : 'Mutate'})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Plugin Configuration Drawer Modal */}
      {selectedPlugin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '450px', background: '#101426', height: '100%', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '18px', fontWeight: 900 }}>Configure {selectedPlugin.name}</span>
                <button onClick={() => setSelectedPlugin(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '18px', cursor: 'pointer' }}>✕</button>
              </div>
              <code style={{ fontSize: '12px', color: '#818CF8', display: 'block', marginBottom: '16px' }}>{selectedPlugin.id}</code>
              <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px' }}>{selectedPlugin.description}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>Enable Plugin</span>
                  <input
                    type="checkbox"
                    checked={selectedPlugin.enabled}
                    onChange={(e) => setSelectedPlugin({ ...selectedPlugin, enabled: e.target.checked })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Plugin Configuration JSON</label>
                  <textarea
                    rows={6}
                    value={JSON.stringify(selectedPlugin.configuration || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        setSelectedPlugin({ ...selectedPlugin, configuration: JSON.parse(e.target.value) });
                      } catch {}
                    }}
                    style={{ width: '100%', background: '#070912', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#fff', fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                await fetch(`/api/v1/projects/${projectId}/plugins`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    pluginId: selectedPlugin.id,
                    enabled: selectedPlugin.enabled,
                    configuration: selectedPlugin.configuration,
                  }),
                });
                setSelectedPlugin(null);
                showFeedback(`Plugin ${selectedPlugin.id} configuration updated!`);
                loadAllData();
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: '#FF7A1A',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Save Plugin Configuration
            </button>
          </div>
        </div>
      )}

      {/* API Inspector Drawer Modal */}
      {selectedApi && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '450px', background: '#101426', height: '100%', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '18px', fontWeight: 900 }}>API Inspector</span>
                <button onClick={() => setSelectedApi(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '18px', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ fontSize: '16px', fontWeight: 800, color: '#38BDF8', marginBottom: '4px' }}>{selectedApi.name}</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '20px' }}><code>{selectedApi.method} {selectedApi.route}</code></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Version:</span>
                  <span>{selectedApi.version}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Rate Limit:</span>
                  <span>{selectedApi.rateLimitPerMin || 300} req/min</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Authentication:</span>
                  <span>{selectedApi.requiresAuth ? 'Required' : 'Public'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Scopes:</span>
                  <code>{selectedApi.scopes?.join(', ') || 'none'}</code>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedApi(null)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1F263E',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
