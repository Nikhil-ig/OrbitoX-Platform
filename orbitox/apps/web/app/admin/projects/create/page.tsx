'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProjectCreationWizardPage() {
  const router = useRouter();

  // 6 Streamlined Creation Stages
  const steps = [
    'Choose Template',
    'Project Identity',
    'Runtime & Architecture',
    'Capabilities & Features',
    'Select Plugins',
    'Review & Provision',
  ];

  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [name, setName] = useState('CelebrationsOS');
  const [slug, setSlug] = useState('celebrations-os');
  const [type, setType] = useState<'restaurant-os' | 'celebrations-os' | 'hospital-os' | 'commerce-os' | 'crm-os' | 'custom-os'>('celebrations-os');
  const [templateId, setTemplateId] = useState('template_celebrations_os');
  const [businessModel, setBusinessModel] = useState('D2C');
  const [defaultPort, setDefaultPort] = useState(4020);
  const [enabledPlugins, setEnabledPlugins] = useState<string[]>(['@orbitox/celebrations', '@orbitox/realtime']);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>(['motion_timeline', 'canvas_inspector', '3d_particles']);
  const [selectedPlan, setSelectedPlan] = useState('plan_celebrations_pro');
  const [environment, setEnvironment] = useState('production');
  const [syncInterval, setSyncInterval] = useState(10);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templates = [
    {
      id: 'template_restaurant_os',
      name: 'RestaurantOS',
      type: 'restaurant-os' as const,
      port: 4010,
      desc: 'Culinary runtime with Dine PWA, KDS routing, and spatial floor matrix.',
      plugins: ['@orbitox/pos', '@orbitox/realtime', '@orbitox/billing'],
      features: ['dine_qr', 'dag_prep_scheduler', 'companion_join', 'realtime_kds'],
      plan: 'plan_restaurant_growth',
      model: 'O2O2B2B2C',
    },
    {
      id: 'template_celebrations_os',
      name: 'CelebrationsOS',
      type: 'celebrations-os' as const,
      port: 4020,
      desc: 'Interactive motion studio, audio sync, and spatial celebration cards.',
      plugins: ['@orbitox/celebrations', '@orbitox/realtime'],
      features: ['motion_timeline', 'canvas_inspector', '3d_particles', 'audio_sync'],
      plan: 'plan_celebrations_pro',
      model: 'D2C',
    },
    {
      id: 'template_hospital_os',
      name: 'HospitalOS',
      type: 'hospital-os' as const,
      port: 4030,
      desc: 'Clinical telemetry, emergency triage scoring, and ICU occupancy mesh.',
      plugins: ['@orbitox/hms', '@orbitox/telemetry'],
      features: ['triage_scoring', 'icu_telemetry', 'consultation_mesh'],
      plan: 'plan_hospital_enterprise',
      model: 'HEALTHCARE_NETWORK',
    },
    {
      id: 'template_commerce_os',
      name: 'CommerceOS',
      type: 'commerce-os' as const,
      port: 4040,
      desc: 'Omnichannel storefront, inventory mesh, and zero-trust checkout.',
      plugins: ['@orbitox/commerce', '@orbitox/inventory', '@orbitox/billing'],
      features: ['zero_trust_checkout', 'multi_warehouse', 'dynamic_tax'],
      plan: 'plan_commerce_scale',
      model: 'B2B_SAAS',
    },
    {
      id: 'template_crm_os',
      name: 'CRM OS',
      type: 'crm-os' as const,
      port: 4050,
      desc: 'Predictive lead scoring, pipeline Kanban stages, and guest memory.',
      plugins: ['@orbitox/crm', '@orbitox/billing'],
      features: ['pipeline_stages', 'lead_scoring', 'activity_stream'],
      plan: 'plan_crm_growth',
      model: 'B2B_SAAS',
    },
    {
      id: 'template_blank_os',
      name: 'Blank External OS',
      type: 'custom-os' as const,
      port: 4060,
      desc: 'Zero-dependency decoupled foundation preconfigured with Control Bridge.',
      plugins: ['@orbitox/core'],
      features: ['runtime_bridge', 'health_probes'],
      plan: 'plan_custom_starter',
      model: 'CUSTOM',
    },
  ];

  const handleSelectTemplate = (t: typeof templates[0]) => {
    setTemplateId(t.id);
    setName(t.name);
    setSlug(t.id.replace('template_', '').replace(/_/g, '-'));
    setType(t.type);
    setDefaultPort(t.port);
    setEnabledPlugins(t.plugins);
    setEnabledFeatures(t.features);
    setSelectedPlan(t.plan);
    setBusinessModel(t.model);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/projects/factory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          type,
          templateId,
          businessModel,
          defaultPort,
          enabledPlugins,
          enabledFeatures,
          planReferences: [selectedPlan],
          environmentMetadata: { defaultEnvironment: environment, supportedEnvironments: ['development', 'staging', 'production'] },
          platformController: {
            controlPlaneUrl: 'http://localhost:3005',
            syncIntervalSeconds: syncInterval,
            requireSignedConfig: true,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate external project');
      }

      // Immediately navigate to persistent Project Control Center
      router.push(`/admin/projects/${data.project.id}`);
    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#090C15', color: '#F8FAFC', padding: '40px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Navigation Breadcrumbs */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#64748B' }}>
          <Link href="/admin/projects" style={{ color: '#94A3B8', textDecoration: 'none', fontWeight: 700 }}>
            Projects
          </Link>
          <span>/</span>
          <span style={{ color: '#F8FAFC', fontWeight: 800 }}>Project Factory</span>
        </div>

        {/* Wizard Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.4px', color: '#FFFFFF' }}>
            Create External Project
          </h1>
          <p style={{ fontSize: '14px', color: '#94A3B8', marginTop: '6px' }}>
            Scaffold a decoupled external product runtime governed by the OrbitoX Control Plane.
          </p>
        </div>

        {/* 6 Stage Navigation Indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '36px' }}>
          {steps.map((st, idx) => (
            <div
              key={st}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                background: idx === currentStep ? 'rgba(88, 101, 242, 0.2)' : idx < currentStep ? 'rgba(16, 185, 129, 0.15)' : '#101426',
                border: `1px solid ${idx === currentStep ? '#5865F2' : idx < currentStep ? '#10B981' : 'rgba(255,255,255,0.06)'}`,
                fontSize: '11px',
                fontWeight: 800,
                color: idx === currentStep ? '#818CF8' : idx < currentStep ? '#10B981' : '#64748B',
                textAlign: 'center',
              }}
            >
              {idx + 1}. {st}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ padding: '14px 18px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', borderRadius: '10px', color: '#EF4444', fontSize: '13px', fontWeight: 700, marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {/* STAGE 1: TEMPLATE */}
        {currentStep === 0 && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>1. Choose Project Template</h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px' }}>Select an architectural archetype to initialize capabilities, APIs, and plugins.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {templates.map((t) => {
                const selected = templateId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTemplate(t)}
                    style={{
                      padding: '20px',
                      borderRadius: '12px',
                      background: selected ? 'rgba(88, 101, 242, 0.15)' : '#151A2E',
                      border: `1px solid ${selected ? '#5865F2' : 'rgba(255,255,255,0.06)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800 }}>{t.name}</span>
                      <code style={{ fontSize: '11px', color: '#818CF8' }}>Port :{t.port}</code>
                    </div>
                    <p style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.4 }}>{t.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STAGE 2: IDENTITY */}
        {currentStep === 1 && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>2. Project Identity</h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px' }}>Define the display name, unique repository slug, and commercial vertical.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Project Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '12px', background: '#0B0E1B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Repository Slug (projects/external-os/[slug])</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  style={{ width: '100%', padding: '12px', background: '#0B0E1B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Business Model</label>
                <input
                  type="text"
                  value={businessModel}
                  onChange={(e) => setBusinessModel(e.target.value)}
                  style={{ width: '100%', padding: '12px', background: '#0B0E1B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: RUNTIME & ARCHITECTURE */}
        {currentStep === 2 && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>3. Runtime & Architecture</h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px' }}>Configure standalone port assignment and control plane handshake interval.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Default Local Port</label>
                <input
                  type="number"
                  value={defaultPort}
                  onChange={(e) => setDefaultPort(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '12px', background: '#0B0E1B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Control Plane Sync Interval (Seconds)</label>
                <input
                  type="number"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '12px', background: '#0B0E1B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* STAGE 4: CAPABILITIES & FEATURES */}
        {currentStep === 3 && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>4. Capabilities & Features</h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px' }}>Enable runtime feature flags for desired-state projection.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {['dine_qr', 'dag_prep_scheduler', 'companion_join', 'realtime_kds', 'motion_timeline', 'canvas_inspector', 'triage_scoring', 'icu_telemetry', 'zero_trust_checkout'].map((feat) => {
                const isSelected = enabledFeatures.includes(feat);
                return (
                  <div
                    key={feat}
                    onClick={() => {
                      if (isSelected) setEnabledFeatures(enabledFeatures.filter(f => f !== feat));
                      else setEnabledFeatures([...enabledFeatures, feat]);
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(16, 185, 129, 0.12)' : '#151A2E',
                      border: `1px solid ${isSelected ? '#10B981' : 'rgba(255,255,255,0.06)'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  >
                    <code>{feat}</code>
                    <span style={{ fontSize: '11px', color: isSelected ? '#10B981' : '#64748B' }}>
                      {isSelected ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STAGE 5: PLUGINS */}
        {currentStep === 4 && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>5. Select Platform Plugins</h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px' }}>Provision extensions providing capabilities and registering APIs.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['@orbitox/pos', '@orbitox/realtime', '@orbitox/billing', '@orbitox/celebrations', '@orbitox/hms', '@orbitox/commerce', '@orbitox/crm', '@orbitox/mcp'].map((p) => {
                const isSelected = enabledPlugins.includes(p);
                return (
                  <div
                    key={p}
                    onClick={() => {
                      if (isSelected) setEnabledPlugins(enabledPlugins.filter(pl => pl !== p));
                      else setEnabledPlugins([...enabledPlugins, p]);
                    }}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(88, 101, 242, 0.15)' : '#151A2E',
                      border: `1px solid ${isSelected ? '#5865F2' : 'rgba(255,255,255,0.06)'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <code style={{ fontSize: '13px', color: isSelected ? '#818CF8' : '#94A3B8' }}>{p}</code>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: isSelected ? '#818CF8' : '#64748B' }}>
                      {isSelected ? 'PROVISIONED' : 'OMIT'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STAGE 6: REVIEW & PROVISION */}
        {currentStep === 5 && (
          <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>6. Review & Provision External Project</h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px' }}>Confirm architectural parameters before writing project files to disk.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#151A2E', borderRadius: '6px' }}>
                <span style={{ color: '#94A3B8' }}>Target Directory:</span>
                <code>projects/external-os/{slug}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#151A2E', borderRadius: '6px' }}>
                <span style={{ color: '#94A3B8' }}>Runtime Port:</span>
                <code>{defaultPort}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#151A2E', borderRadius: '6px' }}>
                <span style={{ color: '#94A3B8' }}>Plugins Provisioned:</span>
                <span>{enabledPlugins.join(', ')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#151A2E', borderRadius: '6px' }}>
                <span style={{ color: '#94A3B8' }}>Control Plane URL:</span>
                <code>http://localhost:3005</code>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                width: '100%',
                padding: '14px',
                background: '#5865F2',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {isGenerating ? 'Provisioning Project on Disk...' : 'Provision External Project →'}
            </button>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#94A3B8',
              fontSize: '13px',
              fontWeight: 700,
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              opacity: currentStep === 0 ? 0.4 : 1,
            }}
          >
            ← Previous
          </button>

          {currentStep < 5 && (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              style={{
                padding: '10px 24px',
                background: '#FF7A1A',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Next Step →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
