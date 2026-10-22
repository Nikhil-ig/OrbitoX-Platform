'use client';

import React, { useState } from 'react';
import { useAdmin } from '../data/admin-context';
import {
  PLAN_TIER_PRESETS,
  ClientProject,
  BusinessModelType,
} from '../data/mock-data';
import {
  RocketIcon,
  CheckIcon,
  CopyIcon,
  KeyIcon,
  CpuIcon,
  SlidersIcon,
  GlobeIcon,
  ShieldCheckIcon,
  PackageIcon,
  ShoppingBagIcon,
  UtensilsIcon,
  HospitalIcon,
  BriefcaseIcon,
  StoreIcon,
  GraduationCapIcon,
  ZapIcon,
} from './icons';

interface ProjectProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultModel?: BusinessModelType;
}

export function ProjectProvisionModal({ isOpen, onClose, defaultModel = 'O2O2B2B2C' }: ProjectProvisionModalProps) {
  const { addProject, showToast } = useAdmin();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [businessModel, setBusinessModel] = useState<BusinessModelType>(defaultModel);
  const [customDomain, setCustomDomain] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [technicalLead, setTechnicalLead] = useState('');

  // Step 2 Plan & Quotas
  const [plan, setPlan] = useState<'starter' | 'growth' | 'pro' | 'enterprise' | 'hyperscale'>('hyperscale');
  const [callQuota, setCallQuota] = useState<number>(100000000);
  const [rateLimit, setRateLimit] = useState<number>(10000);
  const [storageQuota, setStorageQuota] = useState<number>(10000);

  // Step 3 Packages
  const [selectedServices, setSelectedServices] = useState<string[]>([
    'restaurant',
    'pos',
    'commerce',
    'crm',
    'finance',
    'inventory',
  ]);

  // Step 4 Result
  const [createdProject, setCreatedProject] = useState<ClientProject | null>(null);
  const [createdApiKey, setCreatedApiKey] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [kitTab, setKitTab] = useState<'bootstrapper' | 'curl'>('bootstrapper');

  if (!isOpen) return null;

  const handleSelectPlan = (tier: 'starter' | 'growth' | 'pro' | 'enterprise' | 'hyperscale') => {
    setPlan(tier);
    const preset = PLAN_TIER_PRESETS[tier];
    if (preset) {
      setCallQuota(preset.defaultCallQuota);
      setRateLimit(preset.defaultRateLimitPerMin);
      setStorageQuota(preset.defaultStorageQuotaGb);
    }
  };

  const handleToggleService = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter((s) => s !== serviceId));
      }
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  const handleApplyModelPreset = (model: BusinessModelType) => {
    setBusinessModel(model);
    if (model === 'O2O2B2B2C') {
      setSelectedServices(['restaurant', 'pos', 'commerce', 'crm', 'finance', 'inventory']);
      handleSelectPlan('hyperscale');
    } else if (model === 'HEALTHCARE_NETWORK') {
      setSelectedServices(['hms', 'inventory', 'crm', 'hrms', 'finance']);
      handleSelectPlan('enterprise');
    } else if (model === 'D2C') {
      setSelectedServices(['commerce', 'inventory', 'pos', 'crm']);
      handleSelectPlan('pro');
    } else if (model === 'B2B2C') {
      setSelectedServices(['school', 'finance', 'hrms', 'crm']);
      handleSelectPlan('growth');
    } else if (model === 'FRANCHISE_RETAIL') {
      setSelectedServices(['pos', 'inventory', 'finance', 'commerce']);
      handleSelectPlan('enterprise');
    }
  };

  const handleProvision = () => {
    if (!name.trim()) {
      showToast('Please enter a Project Name');
      return;
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const projectId = `proj-${slug || Date.now()}`;
    const keyId = `key-${Date.now()}`;
    const randomHex = Array.from({ length: 24 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const keyPrefix = `orb_live_${slug.slice(0, 8)}_`;
    const fullKey = `${keyPrefix}${randomHex}`;
    const maskedKey = `${keyPrefix}${randomHex.slice(0, 4)}********************${randomHex.slice(-4)}`;

    const preset = PLAN_TIER_PRESETS[plan] || PLAN_TIER_PRESETS.growth!;

    const modelLabels: Record<string, string> = {
      O2O2B2B2C: 'O2O2B2B2C (Kitchen-to-Merchant-to-Consumer)',
      B2B2C: 'B2B2C Multi-Vendor Platform',
      B2B_SaaS: 'Enterprise B2B SaaS',
      D2C: 'Omnichannel D2C & Luxury Commerce',
      HEALTHCARE_NETWORK: 'B2B Enterprise Healthcare Network',
      FRANCHISE_RETAIL: 'Franchise POS & Retail Matrix',
    };

    const newProject: ClientProject = {
      id: projectId,
      name: name.trim(),
      slug,
      organization: organization.trim() || name.trim(),
      businessModel,
      businessModelLabel: modelLabels[businessModel] || businessModel,
      description: description.trim() || `Enterprise ${businessModel} ecosystem running on OrbitoX OS.`,
      plan,
      planLabel: preset.name,
      status: 'active',
      customDomain: customDomain.trim() || `api.${slug}.io`,
      primaryApiKeyId: keyId,
      primaryApiKeyPrefix: keyPrefix,
      enabledServices: selectedServices,
      monthlyApiCalls: 0,
      apiCallQuota: callQuota,
      rateLimitPerMin: rateLimit,
      storageUsedGb: 0,
      storageQuotaGb: storageQuota,
      features: preset.highlightFeatures,
      contactEmail: contactEmail.trim() || `admin@${slug}.io`,
      technicalLead: technicalLead.trim() || 'Lead Systems Architect',
      createdAt: new Date().toISOString().slice(0, 10),
      lastActiveAt: 'Just now',
      recentLatencyMs: 12,
    };

    const initialKey = {
      id: keyId,
      name: `${name.trim()} Primary Production Credential`,
      keyPrefix,
      maskedKey,
      rawKey: fullKey,
      serviceId: 'all',
      serviceName: 'All Subscribed Engines',
      providerId: projectId,
      providerName: name.trim(),
      environment: 'production' as const,
      scopes: ['*'],
      createdAt: new Date().toISOString().slice(0, 10),
      lastUsedAt: 'Never',
      status: 'active' as const,
      rateLimitPerMin: rateLimit,
      requestsLast30Days: 0,
    };

    addProject(newProject, initialKey);
    setCreatedProject(newProject);
    setCreatedApiKey(initialKey);
    setStep(4);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    showToast('Copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const AVAILABLE_PACKAGES = [
    { id: 'restaurant', name: 'Restaurant & Kitchen OS', pkg: '@orbitox/restaurant', icon: <UtensilsIcon size={16} />, color: '#F59E0B' },
    { id: 'pos', name: 'Omnichannel POS Register', pkg: '@orbitox/pos', icon: <StoreIcon size={16} />, color: '#14B8A6' },
    { id: 'commerce', name: 'Commerce & Store Engine', pkg: '@orbitox/commerce', icon: <ShoppingBagIcon size={16} />, color: '#A855F7' },
    { id: 'crm', name: 'CRM & Sales Pipeline', pkg: '@orbitox/crm', icon: <BriefcaseIcon size={16} />, color: '#3B82F6' },
    { id: 'finance', name: 'Finance & Ledger Engine', pkg: '@orbitox/finance', icon: <ZapIcon size={16} />, color: '#10B981' },
    { id: 'inventory', name: 'Inventory & Logistics', pkg: '@orbitox/inventory', icon: <PackageIcon size={16} />, color: '#EC4899' },
    { id: 'hms', name: 'Hospital Management (HMS)', pkg: '@orbitox/hms', icon: <HospitalIcon size={16} />, color: '#EF4444' },
    { id: 'hrms', name: 'HRMS & Workforce Suite', pkg: '@orbitox/hrms', icon: <CpuIcon size={16} />, color: '#8B5CF6' },
    { id: 'school', name: 'School & Campus OS', pkg: '@orbitox/school', icon: <GraduationCapIcon size={16} />, color: '#6366F1' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 7, 15, 0.82)',
        backdropFilter: 'blur(20px)',
        padding: '24px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          background: 'linear-gradient(180deg, #13182E 0%, #0D1122 100%)',
          borderRadius: '28px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.7), 0 0 40px rgba(88, 101, 242, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #5865F2 0%, #FF7A1A 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <RocketIcon size={22} color="#FFFFFF" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0, letterSpacing: '-0.3px', color: '#FFFFFF' }}>
                Provision Client Project & Ecosystem
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#9AA7C2' }}>
                Zero-code plugin assembly, dynamic quotas & instant Ed25519 API key issuance
              </p>
            </div>
          </div>

          {/* Stepper Dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                style={{
                  width: step === s ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: step === s ? '#5865F2' : step > s ? '#10B981' : 'rgba(255, 255, 255, 0.15)',
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '32px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* STEP 1: Project Identity & Model */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.3px' }}>
                  SELECT BUSINESS ARCHITECTURE MODEL
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'O2O2B2B2C', label: 'O2O2B2B2C Network', desc: 'Online-to-Offline, Merchant Kitchens, POS, Consumers', color: '#FF7A1A' },
                    { id: 'HEALTHCARE_NETWORK', label: 'Healthcare Network', desc: 'Hospitals, Emergency Triage, EHR & Wards', color: '#EC4899' },
                    { id: 'D2C', label: 'Omnichannel D2C', desc: 'Luxury Storefronts, Cart & Global Checkout', color: '#A855F7' },
                    { id: 'B2B_SaaS', label: 'Enterprise B2B SaaS', desc: 'Multi-Tenant Workspaces, CRM & Ledgers', color: '#3B82F6' },
                    { id: 'B2B2C', label: 'B2B2C Multi-Campus', desc: 'Academies, Tuition, LMS & Student Rosters', color: '#6366F1' },
                    { id: 'FRANCHISE_RETAIL', label: 'Franchise POS Matrix', desc: 'Multi-Store Cash Drawers & Barcode Sync', color: '#14B8A6' },
                  ].map((m) => {
                    const isSelected = businessModel === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleApplyModelPreset(m.id as BusinessModelType)}
                        style={{
                          padding: '14px',
                          borderRadius: '16px',
                          background: isSelected ? 'rgba(88, 101, 242, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                          border: isSelected ? `1px solid ${m.color}` : '1px solid rgba(255, 255, 255, 0.06)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? '#FFFFFF' : '#D1D5DB' }}>
                            {m.label}
                          </span>
                          {isSelected && <CheckIcon size={14} color={m.color} />}
                        </div>
                        <span style={{ fontSize: '11px', color: '#9AA7C2', lineHeight: '1.4' }}>
                          {m.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#A3AED0' }}>PROJECT / BRAND NAME *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. OmniDeliver Global, Apex Care"
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#A3AED0' }}>LEGAL ENTITY / ORG</label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. OmniLogistics Inc."
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#A3AED0' }}>CUSTOM ROUTING DOMAIN</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '0 14px' }}>
                    <GlobeIcon size={14} color="#9AA7C2" />
                    <input
                      type="text"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="e.g. api.omnideliver.global"
                      style={{
                        padding: '12px 10px',
                        background: 'transparent',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        outline: 'none',
                        width: '100%',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#A3AED0' }}>TECHNICAL CONTACT EMAIL</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="e.g. platform@omnideliver.global"
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Plan Tier & Quota Limits */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.3px' }}>
                  SELECT PLAN TIER PRESET
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                  {(['starter', 'growth', 'pro', 'enterprise', 'hyperscale'] as const).map((t) => {
                    const preset = PLAN_TIER_PRESETS[t];
                    if (!preset) return null;
                    const isSelected = plan === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelectPlan(t)}
                        style={{
                          padding: '14px 10px',
                          borderRadius: '16px',
                          background: isSelected ? 'rgba(88, 101, 242, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          border: isSelected ? '1px solid #5865F2' : '1px solid rgba(255, 255, 255, 0.06)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          textAlign: 'center',
                        }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 800, color: isSelected ? '#FFFFFF' : '#D1D5DB' }}>
                          {preset.name}
                        </span>
                        <span style={{ fontSize: '11px', color: '#5865F2', fontWeight: 700 }}>
                          {preset.monthlyFee}
                        </span>
                        <span style={{ fontSize: '10px', color: '#9AA7C2' }}>
                          {(preset.defaultCallQuota / 1000000).toFixed(preset.defaultCallQuota < 1000000 ? 2 : 0)}M calls
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Live Sliders */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#D1D5DB' }}>
                      Monthly API Call Quota
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#5865F2' }}>
                      {(callQuota / 1000000).toFixed(callQuota < 1000000 ? 2 : 1)} Million calls / cycle
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100000"
                    max="100000000"
                    step="500000"
                    value={callQuota}
                    onChange={(e) => setCallQuota(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#5865F2', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#7B87A8', marginTop: '4px' }}>
                    <span>100K Sandbox</span>
                    <span>5M Scale</span>
                    <span>25M Dedicated</span>
                    <span>100M HyperScale</span>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#D1D5DB' }}>
                      Sliding-Window Rate Limit
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#10B981' }}>
                      {rateLimit.toLocaleString()} requests / min
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="15000"
                    step="100"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#10B981', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#7B87A8', marginTop: '4px' }}>
                    <span>120 req/m</span>
                    <span>1,800 req/m</span>
                    <span>5,000 req/m</span>
                    <span>15,000 req/m Peak</span>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#D1D5DB' }}>
                      Encrypted Cloud Storage
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#FF7A1A' }}>
                      {storageQuota >= 1000 ? `${(storageQuota / 1000).toFixed(1)} TB` : `${storageQuota} GB`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="10000"
                    step="50"
                    value={storageQuota}
                    onChange={(e) => setStorageQuota(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#FF7A1A', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Zero-Code Plug-and-Play Packages */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                    Select Subscribed Microservice Engines
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9AA7C2' }}>
                    Clients inherit fully implemented engines instantly. No backend code written from scratch.
                  </p>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#5865F2' }}>
                  {selectedServices.length} packages active
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {AVAILABLE_PACKAGES.map((pkg) => {
                  const isChecked = selectedServices.includes(pkg.id);
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => handleToggleService(pkg.id)}
                      style={{
                        padding: '16px',
                        borderRadius: '18px',
                        background: isChecked ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                        border: isChecked ? `1px solid ${pkg.color}` : '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: `rgba(${pkg.color === '#FF7A1A' ? '255, 122, 26' : '88, 101, 242'}, 0.15)`,
                            color: pkg.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {pkg.icon}
                        </div>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            background: isChecked ? pkg.color : 'rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                          }}
                        >
                          {isChecked && <CheckIcon size={12} />}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>{pkg.name}</div>
                        <div style={{ fontSize: '11px', color: '#9AA7C2', fontFamily: 'monospace', marginTop: '2px' }}>
                          {pkg.pkg}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Generated Onboarding Kit & API Key */}
          {step === 4 && createdProject && createdApiKey && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '18px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                  }}
                >
                  <CheckIcon size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#10B981', margin: 0 }}>
                    Project & API Successfully Provisioned!
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#A7F3D0' }}>
                    {createdProject.name} is now live with {createdProject.enabledServices.length} pre-built engines.
                  </p>
                </div>
              </div>

              {/* API Key Display Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#A3AED0' }}>
                  PRIMARY ED25519 API KEY (SAVE THIS KEY SECURELY)
                </label>
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: '#FF7A1A',
                  }}
                >
                  <span>{createdApiKey.rawKey}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdApiKey.rawKey)}
                    className="pill-interactive"
                    style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isCopied ? <CheckIcon size={12} color="#10B981" /> : <CopyIcon size={12} color="#FFFFFF" />}
                    <span>{isCopied ? 'Copied' : 'Copy Key'}</span>
                  </button>
                </div>
              </div>

              {/* Integration Code Tabs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setKitTab('bootstrapper')}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: kitTab === 'bootstrapper' ? '1px solid #5865F2' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: kitTab === 'bootstrapper' ? 'rgba(88, 101, 242, 0.2)' : 'transparent',
                        color: kitTab === 'bootstrapper' ? '#FFFFFF' : '#9AA7C2',
                      }}
                    >
                      1-Line Bootstrapper
                    </button>
                    <button
                      type="button"
                      onClick={() => setKitTab('curl')}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: kitTab === 'curl' ? '1px solid #FF7A1A' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: kitTab === 'curl' ? 'rgba(255, 122, 26, 0.15)' : 'transparent',
                        color: kitTab === 'curl' ? '#FF7A1A' : '#9AA7C2',
                      }}
                    >
                      cURL API Request
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const primary = createdProject.enabledServices[0] || 'commerce';
                      const path =
                        primary === 'restaurant'
                          ? '/api/v1/restaurant/orders'
                          : primary === 'pos'
                          ? '/api/v1/pos/terminals'
                          : primary === 'commerce'
                          ? '/api/v1/commerce/products'
                          : primary === 'crm'
                          ? '/api/v1/crm/leads'
                          : primary === 'finance'
                          ? '/api/v1/finance/ledger'
                          : primary === 'inventory'
                          ? '/api/v1/inventory/items'
                          : primary === 'hms'
                          ? '/api/v1/hms/patients'
                          : primary === 'hrms'
                          ? '/api/v1/hrms/employees'
                          : '/api/v1/school/students';

                      const codeToCopy =
                        kitTab === 'bootstrapper'
                          ? `import { createOrbitoX } from '@orbitox-io/plugin-engine';\n${createdProject.enabledServices.map((s) => `import ${s} from '@orbitox-io/${s}';`).join('\n')}\n\nconst app = await createOrbitoX({\n  license: '${createdApiKey.rawKey}',\n  domain: '${createdProject.customDomain}',\n  plugins: [${createdProject.enabledServices.join(', ')}],\n});`
                          : `curl -X GET "http://localhost:3005${path}" \\\n  -H "x-api-key: ${createdApiKey.rawKey}" \\\n  -H "x-tenant-id: ${createdProject.slug}"`;
                      copyToClipboard(codeToCopy);
                    }}
                    style={{ background: 'none', border: 'none', color: '#5865F2', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Copy Snippet
                  </button>
                </div>

                <div
                  style={{
                    background: '#090D1A',
                    borderRadius: '14px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '16px',
                    fontFamily: 'monospace',
                    fontSize: '11.5px',
                    color: '#D1D5DB',
                    lineHeight: '1.6',
                    overflowX: 'auto',
                  }}
                >
                  {kitTab === 'bootstrapper' ? (
                    <>
                      <span style={{ color: '#6B7280' }}>// Ready-to-run client integration (Zero code written from scratch)</span><br />
                      <span style={{ color: '#EC4899' }}>import</span> {'{ createOrbitoX }'} <span style={{ color: '#EC4899' }}>from</span> <span style={{ color: '#10B981' }}>&apos;@orbitox-io/plugin-engine&apos;</span>;<br />
                      {createdProject.enabledServices.map((s) => (
                        <span key={s}>
                          <span style={{ color: '#EC4899' }}>import</span> {s} <span style={{ color: '#EC4899' }}>from</span> <span style={{ color: '#10B981' }}>&apos;@orbitox-io/{s}&apos;</span>;<br />
                        </span>
                      ))}
                      <br />
                      <span style={{ color: '#3B82F6' }}>const</span> app = <span style={{ color: '#EC4899' }}>await</span> createOrbitoX({'{'}<br />
                      &nbsp;&nbsp;license: <span style={{ color: '#FF7A1A' }}>&apos;{createdApiKey.rawKey}&apos;</span>,<br />
                      &nbsp;&nbsp;domain: <span style={{ color: '#10B981' }}>&apos;{createdProject.customDomain}&apos;</span>,<br />
                      &nbsp;&nbsp;plugins: [{createdProject.enabledServices.join(', ')}],<br />
                      {'}'});<br />
                    </>
                  ) : (
                    <>
                      <span style={{ color: '#6B7280' }}># Query primary subscribed microservice via zero-trust edge gateway</span><br />
                      <span style={{ color: '#F59E0B' }}>curl</span> -X GET &quot;http://localhost:3005{
                        createdProject.enabledServices[0] === 'restaurant'
                          ? '/api/v1/restaurant/orders'
                          : createdProject.enabledServices[0] === 'pos'
                          ? '/api/v1/pos/terminals'
                          : createdProject.enabledServices[0] === 'commerce'
                          ? '/api/v1/commerce/products'
                          : createdProject.enabledServices[0] === 'crm'
                          ? '/api/v1/crm/leads'
                          : createdProject.enabledServices[0] === 'finance'
                          ? '/api/v1/finance/ledger'
                          : createdProject.enabledServices[0] === 'inventory'
                          ? '/api/v1/inventory/items'
                          : createdProject.enabledServices[0] === 'hms'
                          ? '/api/v1/hms/patients'
                          : createdProject.enabledServices[0] === 'hrms'
                          ? '/api/v1/hrms/employees'
                          : '/api/v1/school/students'
                      }&quot; \<br />
                      &nbsp;&nbsp;-H &quot;x-api-key: {createdApiKey.rawKey}&quot; \<br />
                      &nbsp;&nbsp;-H &quot;x-tenant-id: {createdProject.slug}&quot;
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: '20px 32px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          {step === 4 ? (
            <button
              type="button"
              onClick={onClose}
              className="pill-interactive pill-interactive-primary"
              style={{ width: '100%', padding: '12px 24px', fontSize: '13px', justifyContent: 'center' }}
            >
              <span>Done & Open Projects Cockpit</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  if (step > 1) setStep((prev) => (prev - 1) as any);
                  else onClose();
                }}
                className="pill-interactive"
                style={{ padding: '10px 20px', fontSize: '12.5px' }}
              >
                <span>{step === 1 ? 'Cancel' : 'Previous Step'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (step === 1) {
                    if (!name.trim()) {
                      showToast('Please enter a Project Name');
                      return;
                    }
                    setStep(2);
                  } else if (step === 2) {
                    setStep(3);
                  } else if (step === 3) {
                    handleProvision();
                  }
                }}
                className="pill-interactive pill-interactive-orange"
                style={{ padding: '10px 24px', fontSize: '12.5px' }}
              >
                <span>{step === 3 ? 'Provision Project & Generate Key' : 'Next Step ->'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
