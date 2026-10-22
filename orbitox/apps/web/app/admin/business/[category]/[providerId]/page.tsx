'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useAdmin } from '../../../data/admin-context';
import { BUSINESS_CATEGORIES, getProviderDnsInfo, getProviderLiveRecords } from '../../../data/mock-data';
import { ApiKeyModal } from '../../../components/api-key-modal';
import { SleekSlider } from '../../../components/sleek-slider';
import { DonutGauge } from '../../../components/donut-gauge';
import { DynamicIcon } from '../../../components/dynamic-icon';
import {
  MapPinIcon,
  CheckIcon,
  BanIcon,
  RocketIcon,
  HospitalIcon,
  BedIcon,
  UsersIcon,
  RadioIcon,
  ShoppingBagIcon,
  GlobeIcon,
  PackageIcon,
  BriefcaseIcon,
  ZapIcon,
  ClipboardListIcon,
  ExternalLinkIcon,
  ChevronLeftIcon,
  UtensilsIcon,
  GraduationCapIcon,
  StoreIcon,
  ArrowRightIcon,
  KeyIcon,
  CopyIcon,
  CreditCardIcon,
} from '../../../components/icons';

interface PageProps {
  params: Promise<{ category: string; providerId: string }>;
}

export default function ProviderDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { category: categorySlug, providerId } = resolvedParams;

  const {
    providers,
    services,
    toggleProviderStatus,
    updateProvider,
    apiKeys,
    toggleApiKeyStatus,
    telemetryLogs,
    addTelemetryLog,
    showToast,
  } = useAdmin();

  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  // Custom domain edit state
  const [domainInput, setDomainInput] = useState('');
  const [isEditingDomain, setIsEditingDomain] = useState(false);
  const [isRunningDnsTest, setIsRunningDnsTest] = useState(false);
  const [dnsTestPassed, setDnsTestPassed] = useState<boolean | null>(null);

  // Quota tune state
  const category = BUSINESS_CATEGORIES.find((c) => c.slug === categorySlug);
  const providerList = providers[categorySlug] || [];
  const provider = providerList.find((p) => p.id === providerId);

  const [editCallsQuota, setEditCallsQuota] = useState<number>(provider?.apiCallQuota || 3000000);
  const [editStorageQuota, setEditStorageQuota] = useState<number>(provider?.storageQuotaGb || 800);
  const [editPlan, setEditPlan] = useState<string>(provider?.plan || 'Enterprise Tier 1');

  // Log filter
  const [logFilter, setLogFilter] = useState<'ALL' | 'SECURITY' | 'AUDIT' | 'INFO'>('ALL');

  if (!provider || !category) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 900 }}>Tenant Provider Not Found</h2>
        <p style={{ color: '#9AA7C2', fontSize: '14px', marginTop: '6px' }}>
          The requested provider id &ldquo;{providerId}&rdquo; could not be resolved in vertical &ldquo;{categorySlug}&rdquo;.
        </p>
        <Link
          href={`/admin/business/${categorySlug}`}
          className="pill-interactive pill-interactive-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '20px', textDecoration: 'none' }}
        >
          <ChevronLeftIcon size={16} />
          <span>Return to Provider Directory</span>
        </Link>
      </div>
    );
  }

  const isBlocked = provider.status === 'blocked';
  const dnsInfo = getProviderDnsInfo(provider);
  const liveRecords = getProviderLiveRecords(provider);

  // Filter telemetry logs
  const tenantLogs = telemetryLogs.filter(
    (l) => (!l.tenantId || l.tenantId === provider.id) && (logFilter === 'ALL' || l.level === logFilter)
  );

  // Toggle microservice engine
  const handleToggleService = (serviceId: string) => {
    const isCurrentlyEnabled = provider.enabledServices.includes(serviceId);
    let nextList: string[];
    if (isCurrentlyEnabled) {
      nextList = provider.enabledServices.filter((id) => id !== serviceId);
      showToast(`Deactivated engine [${serviceId.toUpperCase()}] for ${provider.name}`);
    } else {
      nextList = [...provider.enabledServices, serviceId];
      showToast(`Activated engine [${serviceId.toUpperCase()}] for ${provider.name}`);
    }
    updateProvider(categorySlug, provider.id, { enabledServices: nextList });
    addTelemetryLog({
      level: 'AUDIT',
      facade: 'AuditFacade',
      tenantId: provider.id,
      categorySlug,
      message: `Engine [${serviceId.toUpperCase()}] status toggled to ${!isCurrentlyEnabled} by SuperAdmin`,
    });
  };

  // Run DNS Edge diagnostics
  const handleRunDnsTest = () => {
    setIsRunningDnsTest(true);
    setDnsTestPassed(null);
    showToast(`Pinging edge DNS node for ${provider.customDomain}...`);

    setTimeout(() => {
      setIsRunningDnsTest(false);
      setDnsTestPassed(true);
      showToast(`DNS Edge verification passed: 14ms latency, SSL certificate active`);
      addTelemetryLog({
        level: 'SECURITY',
        facade: 'SecurityFacade',
        tenantId: provider.id,
        categorySlug,
        message: `Edge DNS audit OK for ${provider.customDomain} (TLS 1.3 ChaCha20-Poly1305 active)`,
      });
    }, 1200);
  };

  // Save Quotas
  const handleSaveQuotas = () => {
    updateProvider(categorySlug, provider.id, {
      apiCallQuota: editCallsQuota,
      storageQuotaGb: editStorageQuota,
      plan: editPlan,
    });
    showToast(`Resource quota bounds successfully updated for ${provider.name}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {/* ─── Breadcrumb Navigation ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#9AA7C2' }}>
          <Link href="/admin" style={{ color: '#9AA7C2', textDecoration: 'none', fontWeight: 600 }}>
            Admin
          </Link>
          <span>/</span>
          <Link href="/admin/business" style={{ color: '#9AA7C2', textDecoration: 'none', fontWeight: 600 }}>
            Business Verticals
          </Link>
          <span>/</span>
          <Link href={`/admin/business/${categorySlug}`} style={{ color: '#9AA7C2', textDecoration: 'none', fontWeight: 600 }}>
            {category.title}
          </Link>
          <span>/</span>
          <span style={{ color: '#FFFFFF', fontWeight: 800 }}>{provider.name}</span>
        </div>

        <Link
          href={`/admin/business/${categorySlug}`}
          className="pill-interactive"
          style={{ textDecoration: 'none', padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ChevronLeftIcon size={14} />
          <span>Back to {category.title.split(' ')[0]} Providers</span>
        </Link>
      </div>

      {/* ─── Hero Provider Card (Luxury Squircle 32px Radius) ─── */}
      <div
        className="squircle-card"
        style={{
          padding: '32px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          borderRadius: '32px',
        }}
      >
        {/* Ambient colored corner glow */}
        <div
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: '260px',
            height: '260px',
            background: category.color,
            opacity: 0.16,
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        {/* Provider Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '22px',
              background: 'rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              color: category.color,
            }}
          >
            <DynamicIcon name={categorySlug} size={36} color={category.color} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
                {provider.name}
              </h1>

              {/* Status Pill Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 14px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  background: isBlocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: isBlocked ? '#EF4444' : '#10B981',
                  border: `1px solid ${isBlocked ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: isBlocked ? '#EF4444' : '#10B981',
                    boxShadow: `0 0 8px ${isBlocked ? '#EF4444' : '#10B981'}`,
                  }}
                />
                <span>{provider.status}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '13px', color: '#A3AED0' }}>
              <span style={{ color: '#818CF8', fontWeight: 800 }}>{provider.plan}</span>
              <span>•</span>
              <span>{provider.legalEntity}</span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPinIcon size={13} color="#FF7A1A" />
                <span>{provider.city}, {provider.country}</span>
              </span>
            </div>

            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#7B87A8', fontStyle: 'italic' }}>
              &ldquo;{provider.tagline}&rdquo;
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => toggleProviderStatus(categorySlug, provider.id)}
            style={{
              padding: '11px 22px',
              borderRadius: '999px',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              border: isBlocked ? '1px solid #10B981' : '1px solid rgba(239, 68, 68, 0.4)',
              background: isBlocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.1)',
              color: isBlocked ? '#10B981' : '#EF4444',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isBlocked ? (
              <>
                <CheckIcon size={14} color="#10B981" />
                <span>Activate Tenant</span>
              </>
            ) : (
              <>
                <BanIcon size={14} color="#EF4444" />
                <span>Block Tenant</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsKeyModalOpen(true)}
            className="pill-interactive pill-interactive-orange"
            style={{ padding: '11px 24px', fontSize: '12.5px' }}
          >
            <span>+ Issue Tenant Key</span>
          </button>
        </div>
      </div>

      {/* ─── 1-Click Application Launch Dock ─── */}
      <div
        className="squircle-card"
        style={{
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          background: '#1B213D',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <RocketIcon size={18} color="#FF7A1A" />
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.2px' }}>
            LAUNCH RUNNING APPLICATION CONSOLE:
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {categorySlug === 'hospitals' && (
            <>
              <Link
                href="/hms"
                className="pill-interactive pill-interactive-primary"
                style={{ textDecoration: 'none', padding: '9px 18px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '7px' }}
              >
                <HospitalIcon size={16} color="#FFFFFF" />
                <span>Hospital OS Command Center</span>
                <ExternalLinkIcon size={13} color="#FFFFFF" />
              </Link>
              <Link
                href="/hms/beds"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <BedIcon size={14} color="#A3AED0" />
                <span>Ward Matrix</span>
              </Link>
              <Link
                href="/hms/patients"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <UsersIcon size={14} color="#A3AED0" />
                <span>Patients EHR</span>
              </Link>
              <Link
                href="/hms/telemetry"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RadioIcon size={14} color="#A3AED0" />
                <span>IoT Telemetry</span>
              </Link>
              <Link
                href="/hms/pharmacy"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PackageIcon size={14} color="#A3AED0" />
                <span>Pharmacy</span>
              </Link>
              <Link
                href="/hms/billing"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CreditCardIcon size={14} color="#A3AED0" />
                <span>Medical Billing</span>
              </Link>
            </>
          )}

          {categorySlug === 'ecommerce' && (
            <>
              <Link
                href="/commerce"
                className="pill-interactive pill-interactive-primary"
                style={{ textDecoration: 'none', padding: '9px 18px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '7px' }}
              >
                <ShoppingBagIcon size={16} color="#FFFFFF" />
                <span>Commerce Studio</span>
                <ExternalLinkIcon size={13} color="#FFFFFF" />
              </Link>
              <Link
                href={`/store/${provider.id}`}
                className="pill-interactive pill-interactive-orange"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <GlobeIcon size={14} color="#FFFFFF" />
                <span>Live Storefront ({provider.id})</span>
                <ExternalLinkIcon size={12} color="#FFFFFF" />
              </Link>
              <Link
                href="/commerce/store/builder"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <DynamicIcon name="builder" size={14} color="#A3AED0" />
                <span>Store Builder</span>
              </Link>
              <Link
                href="/commerce/orders"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PackageIcon size={14} color="#A3AED0" />
                <span>Orders</span>
              </Link>
              <Link
                href="/commerce/products"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ShoppingBagIcon size={14} color="#A3AED0" />
                <span>Products & SKUs</span>
              </Link>
              <Link
                href="/commerce/customers"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <UsersIcon size={14} color="#A3AED0" />
                <span>Customers</span>
              </Link>
            </>
          )}

          {categorySlug === 'restaurants' && (
            <>
              <Link
                href="/admin/services/restaurant"
                className="pill-interactive pill-interactive-primary"
                style={{ textDecoration: 'none', padding: '9px 18px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '7px' }}
              >
                <UtensilsIcon size={16} color="#FFFFFF" />
                <span>Kitchen & KDS Engine</span>
                <ExternalLinkIcon size={13} color="#FFFFFF" />
              </Link>
              <Link
                href="/commerce/orders"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PackageIcon size={14} color="#A3AED0" />
                <span>Table Tickets & Orders</span>
              </Link>
              <Link
                href="/inventory/items"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PackageIcon size={14} color="#A3AED0" />
                <span>Kitchen Stock</span>
              </Link>
              <Link
                href="/finance/invoices"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CreditCardIcon size={14} color="#A3AED0" />
                <span>Dining Invoices</span>
              </Link>
            </>
          )}

          {categorySlug === 'education' && (
            <>
              <Link
                href="/admin/services/school"
                className="pill-interactive pill-interactive-primary"
                style={{ textDecoration: 'none', padding: '9px 18px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '7px' }}
              >
                <GraduationCapIcon size={16} color="#FFFFFF" />
                <span>Campus & School OS</span>
                <ExternalLinkIcon size={13} color="#FFFFFF" />
              </Link>
              <Link
                href="/crm/leads"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <BriefcaseIcon size={14} color="#A3AED0" />
                <span>Student Admissions</span>
              </Link>
              <Link
                href="/finance/invoices"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CreditCardIcon size={14} color="#A3AED0" />
                <span>Tuition Billing</span>
              </Link>
            </>
          )}

          {categorySlug === 'retail' && (
            <>
              <Link
                href="/admin/services/pos"
                className="pill-interactive pill-interactive-primary"
                style={{ textDecoration: 'none', padding: '9px 18px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '7px' }}
              >
                <StoreIcon size={16} color="#FFFFFF" />
                <span>Omnichannel POS Register</span>
                <ExternalLinkIcon size={13} color="#FFFFFF" />
              </Link>
              <Link
                href="/inventory/items"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PackageIcon size={14} color="#A3AED0" />
                <span>Barcodes & Inventory</span>
              </Link>
              <Link
                href="/commerce/orders"
                className="pill-interactive"
                style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PackageIcon size={14} color="#A3AED0" />
                <span>Register Sales</span>
              </Link>
            </>
          )}

          {/* Cross-Cutting Service Integrations */}
          {provider.enabledServices.includes('crm') && categorySlug !== 'education' && (
            <Link
              href="/crm/leads"
              className="pill-interactive"
              style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <BriefcaseIcon size={14} color="#A3AED0" />
              <span>CRM Leads</span>
            </Link>
          )}
          {provider.enabledServices.includes('inventory') && categorySlug !== 'ecommerce' && categorySlug !== 'restaurants' && categorySlug !== 'retail' && (
            <Link
              href="/inventory/items"
              className="pill-interactive"
              style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PackageIcon size={14} color="#A3AED0" />
              <span>Inventory</span>
            </Link>
          )}
          {provider.enabledServices.includes('finance') && categorySlug !== 'hospitals' && categorySlug !== 'restaurants' && categorySlug !== 'education' && (
            <Link
              href="/finance/invoices"
              className="pill-interactive"
              style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CreditCardIcon size={14} color="#A3AED0" />
              <span>Finance Ledger</span>
            </Link>
          )}
          {provider.enabledServices.includes('hrms') && (
            <Link
              href="/hrms/employees"
              className="pill-interactive"
              style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <UsersIcon size={14} color="#A3AED0" />
              <span>Staff & HRMS</span>
            </Link>
          )}
        </div>
      </div>

      {/* ─── Main 2-Column Visual Control Grid (Matching Image 1 Composition) ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
          gap: '24px',
        }}
      >
        {/* ─── Left Column: Sliders & Operational Stream ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card A: Set Quotas (Ref 1: Set credit limit widget) */}
          <div className="squircle-card squircle-card-indigo" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#818CF8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Elastic Throughput Bounds
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 900, color: '#FFFFFF' }}>
                  Resource Quotas & Scale Tiers
                </h3>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '999px',
                  background: 'rgba(88, 101, 242, 0.15)',
                  color: '#818CF8',
                }}
              >
                {provider.plan}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Slider 1: Monthly API Volume */}
              <SleekSlider
                label="Monthly API Volume Boundary"
                value={editCallsQuota}
                min={500000}
                max={20000000}
                step={500000}
                unit=" calls"
                variant="indigo"
                onChange={(val) => setEditCallsQuota(val)}
              />

              {/* Slider 2: Encrypted Storage */}
              <SleekSlider
                label="Encrypted Database Storage Capacity"
                value={editStorageQuota}
                min={100}
                max={5000}
                step={50}
                unit=" GB"
                variant="orange"
                onChange={(val) => setEditStorageQuota(val)}
              />

              {/* Plan Tier Select & Save Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    borderRadius: '999px',
                    background: '#0E1222',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="Enterprise Dedicated">Enterprise Dedicated (Uncapped)</option>
                  <option value="Enterprise Tier 1">Enterprise Tier 1 (SLA 99.99%)</option>
                  <option value="Enterprise Tier 2">Enterprise Tier 2</option>
                  <option value="Growth Pro">Growth Pro</option>
                  <option value="Starter Biz">Starter Biz</option>
                </select>

                <button
                  type="button"
                  onClick={handleSaveQuotas}
                  className="pill-interactive pill-interactive-orange"
                  style={{ padding: '11px 22px', fontSize: '12.5px' }}
                >
                  <span>Save Quota Bounds →</span>
                </button>
              </div>

              {/* Interconnected Link to Global Quotas Equalizer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
                <Link
                  href="/admin/quotas"
                  style={{
                    fontSize: '12px',
                    color: '#818CF8',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Inspect in Global Quotas & Rate-Limit Equalizer</span>
                  <ArrowRightIcon size={12} />
                </Link>
              </div>
            </div>
          </div>

          {/* Card B: Live Operational Records (Ref 1: Transaction history widget) */}
          <div className="squircle-card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#9AA7C2', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Live Operational Stream
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 900, color: '#FFFFFF' }}>
                  Recent Entity Activity
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: '#62708C', fontWeight: 700 }}>
                Direct from tenant database
              </span>
            </div>

            {/* List of entity records */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {liveRecords.slice(0, 4).map((rec, idx) => {
                const isHero = idx === 0;
                return (
                  <div
                    key={rec.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderRadius: '20px',
                      background: isHero ? '#5865F2' : '#1A213A',
                      color: '#FFFFFF',
                      boxShadow: isHero ? '0 8px 24px rgba(88, 101, 242, 0.45)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '14px',
                          background: isHero ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isHero ? <ZapIcon size={18} color="#FFFFFF" /> : <ClipboardListIcon size={18} color="#5865F2" />}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800 }}>{rec.title}</div>
                        <div style={{ fontSize: '11px', color: isHero ? 'rgba(255, 255, 255, 0.8)' : '#A3AED0', marginTop: '2px' }}>
                          {rec.details}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          padding: '5px 12px',
                          borderRadius: '999px',
                          background: isHero ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)',
                          color: isHero ? '#5865F2' : '#818CF8',
                          fontSize: '11px',
                          fontWeight: 800,
                        }}
                      >
                        {rec.badge}
                      </div>
                      <span style={{ fontSize: '11px', color: isHero ? '#FFFFFF' : '#7B87A8', fontWeight: 600 }}>
                        {rec.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Right Column: DNS Diagnostics & Enabled Engines ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card C: DNS Edge Diagnostics (Ref 1: Market comparison Donut) */}
          <div className="squircle-card squircle-card-indigo" style={{ padding: '28px' }}>
            <DonutGauge
              title="Edge Infrastructure Health"
              totalValue="99.9%"
              subLabel="Edge Availability"
              segments={[
                { label: 'Uptime', value: 85, color: '#5865F2' },
                { label: 'TLS 1.3', value: 65, color: '#38BDF8' },
                { label: 'DNS Anycast', value: 45, color: '#FF7A1A' },
              ]}
              size={130}
            />

            {/* Domain info row */}
            <div
              style={{
                marginTop: '22px',
                padding: '14px 18px',
                borderRadius: '16px',
                background: '#1B213D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#A3AED0', fontWeight: 700, letterSpacing: '0.4px' }}>CUSTOM FQDN DOMAIN</div>
                <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#38BDF8', fontWeight: 700, marginTop: '2px' }}>
                  https://{provider.customDomain}
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#10B981',
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '3px 10px',
                  borderRadius: '999px',
                }}
              >
                SSL OK
              </span>
            </div>

            {/* Test Edge Ping Action */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleRunDnsTest}
                className="pill-interactive pill-interactive-primary"
                style={{ width: '100%', padding: '10px 18px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <ZapIcon size={14} color="#FFFFFF" />
                <span>{isRunningDnsTest ? 'Running Edge Diagnostics...' : 'Run Edge DNS Diagnostic'}</span>
              </button>

              <Link
                href="/admin/system"
                style={{
                  fontSize: '11.5px',
                  color: '#38BDF8',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                }}
              >
                <span>Verify Zero-Trust Crypto Sandbox & Signatures</span>
                <ArrowRightIcon size={12} />
              </Link>
            </div>
          </div>

          {/* Card D: Microservice Capability Matrix */}
          <div className="squircle-card" style={{ padding: '28px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#A3AED0', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Zero-Trust Capabilities
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 900, color: '#FFFFFF' }}>
                  Enabled Engines
                </h3>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#FF7A1A' }}>
                {provider.enabledServices.length} Active
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {services.map((svc) => {
                const isEnabled = provider.enabledServices.includes(svc.id);
                return (
                  <div
                    key={svc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      background: '#1B213D',
                    }}
                  >
                    <Link
                      href={`/admin/services/${svc.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        textDecoration: 'none',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <DynamicIcon name={svc.id} size={18} color="#818CF8" />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{svc.name}</span>
                          <ExternalLinkIcon size={11} color="#818CF8" />
                        </div>
                        <div style={{ fontSize: '10.5px', fontFamily: 'monospace', color: '#7B87A8' }}>
                          {svc.packageName}
                        </div>
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleToggleService(svc.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: 'none',
                        background: isEnabled ? '#5865F2' : 'rgba(255, 255, 255, 0.08)',
                        color: isEnabled ? '#FFFFFF' : '#9AA7C2',
                        boxShadow: isEnabled ? '0 2px 10px rgba(88, 101, 242, 0.4)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isEnabled ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Link
                href="/admin/services"
                style={{
                  fontSize: '12px',
                  color: '#FF7A1A',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Inspect Microservices Engine Registry (All Plugins)</span>
                <ArrowRightIcon size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tenant Bound Cryptographic API Keys Card ─── */}
      {(() => {
        const tenantApiKeys = apiKeys.filter((k) => k.providerId === provider.id);
        return (
          <div className="squircle-card squircle-card-orange" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#FF7A1A', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Cryptographic Credentials
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 900, color: '#FFFFFF' }}>
                  Tenant Bound API Keys ({tenantApiKeys.length})
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Link
                  href="/admin/api-keys"
                  style={{
                    fontSize: '12px',
                    color: '#A3AED0',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Manage in API Key Center</span>
                  <ArrowRightIcon size={12} />
                </Link>

                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(true)}
                  className="pill-interactive pill-interactive-orange"
                  style={{ padding: '8px 18px', fontSize: '12px' }}
                >
                  <span>+ Issue Key for {provider.name}</span>
                </button>
              </div>
            </div>

            {tenantApiKeys.length === 0 ? (
              <div
                style={{
                  background: '#0E1222',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                }}
              >
                <KeyIcon size={24} color="#7B87A8" />
                <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '13.5px', marginTop: '8px' }}>
                  No API Keys Bound to {provider.name}
                </div>
                <p style={{ color: '#7B87A8', fontSize: '12px', margin: '4px 0 14px 0' }}>
                  Provision zero-trust cryptographic tokens scoped to this tenant and their active microservices.
                </p>
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(true)}
                  className="pill-interactive pill-interactive-orange"
                  style={{ padding: '8px 18px', fontSize: '12px' }}
                >
                  <span>Issue Initial API Key</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tenantApiKeys.map((key) => {
                  const isKeyBlocked = key.status === 'blocked';
                  const isKeyRevoked = key.status === 'revoked';
                  return (
                    <div
                      key={key.id}
                      style={{
                        background: '#171D36',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '13.5px' }}>{key.name}</span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: 'rgba(88, 101, 242, 0.15)',
                              color: '#818CF8',
                              border: '1px solid rgba(88, 101, 242, 0.3)',
                            }}
                          >
                            {key.environment}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12px' }}>
                          <span style={{ fontFamily: 'monospace', color: '#38BDF8', fontWeight: 600 }}>{key.maskedKey}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                navigator.clipboard.writeText(key.maskedKey);
                                showToast('Copied key prefix to clipboard');
                              }
                            }}
                            title="Copy key prefix"
                            style={{ background: 'none', border: 'none', color: '#818CF8', cursor: 'pointer', padding: '2px' }}
                          >
                            <CopyIcon size={12} color="#818CF8" />
                          </button>
                          <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                          <Link
                            href={`/admin/services/${key.serviceId}`}
                            style={{ color: '#FF7A1A', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            <span>{key.serviceName}</span>
                            <ExternalLinkIcon size={10} />
                          </Link>
                          <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                          <span style={{ color: '#7B87A8', fontSize: '11px' }}>{key.rateLimitPerMin} req/min</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: key.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: key.status === 'active' ? '#10B981' : '#EF4444',
                            border: `1px solid ${key.status === 'active' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          }}
                        >
                          {key.status}
                        </span>
                        {!isKeyRevoked && (
                          <button
                            type="button"
                            onClick={() => toggleApiKeyStatus(key.id)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: isKeyBlocked ? '1px solid #10B981' : '1px solid rgba(239, 68, 68, 0.35)',
                              background: isKeyBlocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                              color: isKeyBlocked ? '#10B981' : '#EF4444',
                            }}
                          >
                            {isKeyBlocked ? 'Activate' : 'Block'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── Bottom Cryptographic Telemetry Terminal ─── */}
      <div className="squircle-card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#818CF8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Append-Only Security Audit
            </span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 900, color: '#FFFFFF' }}>
              Tenant Telemetry & Cryptographic Logs
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {(['ALL', 'SECURITY', 'AUDIT', 'INFO'] as const).map((filter) => {
              const active = logFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setLogFilter(filter)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    background: active ? '#5865F2' : '#1A213A',
                    color: active ? '#FFFFFF' : '#9AA7C2',
                  }}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Log stream box */}
        <div
          style={{
            background: '#0A0D18',
            borderRadius: '18px',
            padding: '16px 20px',
            fontFamily: 'monospace',
            fontSize: '12px',
            maxHeight: '200px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {tenantLogs.length === 0 ? (
            <div style={{ color: '#62708C', textAlign: 'center', padding: '20px' }}>No audit events logged yet.</div>
          ) : (
            tenantLogs.map((log, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                <span style={{ color: '#62708C', flexShrink: 0 }}>[{log.timestamp}]</span>
                <span
                  style={{
                    color:
                      log.level === 'SECURITY'
                        ? '#EF4444'
                        : log.level === 'AUDIT'
                        ? '#F59E0B'
                        : '#38BDF8',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  [{log.level}]
                </span>
                <span style={{ color: '#E2E8F0' }}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Global API Key Generator Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        defaultProviderId={provider.id}
      />
    </div>
  );
}
