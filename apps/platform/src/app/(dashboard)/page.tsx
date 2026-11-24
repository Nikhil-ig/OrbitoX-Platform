'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Search,
  Bell,
  Plus,
  ExternalLink,
  Shield,
  Download,
  Building2,
  UtensilsCrossed,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  CreditCard,
  Lock,
  FileText,
  Check,
} from 'lucide-react';

interface ProjectRecord {
  id: string;
  name: string;
  slug: string;
  vertical?: string;
  createdAt?: string;
}

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  domain: string;
  vertical: 'RestaurantOS' | 'HospitalOS';
  status: 'Live' | 'Setting up';
  metricValue: string;
  metricLabel: string;
  tags: string[];
  progress?: number;
  avatarBg: string;
  avatarChar: string;
}

export default function CustomerDashboardPage() {
  const [userName, setUserName] = React.useState('Priya');
  const [userInitials, setUserInitials] = React.useState('PS');
  const [orgName, setOrgName] = React.useState('Maxora Hospitality Group');
  const [projects, setProjects] = React.useState<ProjectRecord[]>([]);
  const [activePlan, setActivePlan] = React.useState('Growth');
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'Home' | 'Tenants' | 'Team' | 'Billing' | 'Data & privacy'>('Home');
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load Authoritative State from session and projects API
  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const meRes = await fetch('/api/v1/customer/auth/me');
        if (!meRes.ok) return;
        const meData = await meRes.json();

        if (meData?.user?.name) {
          setUserName(meData.user.name.split(' ')[0]);
          const parts = meData.user.name.split(' ');
          const inits = parts.length >= 2 
            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() 
            : parts[0].slice(0, 2).toUpperCase();
          setUserInitials(inits);
        }

        if (Array.isArray(meData?.memberships) && meData.memberships.length > 0) {
          const allProjects: ProjectRecord[] = [];
          for (const m of meData.memberships) {
            if (!m?.organizationId) continue;
            try {
              const tenantsRes = await fetch(`/api/v1/customer/organizations/${encodeURIComponent(m.organizationId)}/tenants`);
              if (tenantsRes.ok) {
                const tenantsData = await tenantsRes.json();
                if (Array.isArray(tenantsData.projects)) {
                  allProjects.push(...tenantsData.projects);
                }
                if (tenantsData?.organization?.name) {
                  setOrgName(tenantsData.organization.name);
                }
              }
            } catch { }
          }
          if (isMounted) {
            setProjects(allProjects);
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        if (isMounted) setHasLoaded(true);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, []);

  // Build dynamic tenant fleet
  const tenantsList: TenantItem[] = React.useMemo(() => {
    if (projects.length > 0) {
      return projects.map((p, idx) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        domain: `${p.slug}.localhost:4010`,
        vertical: 'RestaurantOS',
        status: 'Live',
        metricValue: '1,402',
        metricLabel: 'orders this week',
        tags: ['RestaurantOS', '1 branch'],
        avatarBg: idx === 0 ? '#FB923C' : '#3B82F6',
        avatarChar: p.name.charAt(0).toUpperCase() || 'M',
      }));
    }
    return [
      {
        id: 'proj_maxora_resto',
        name: 'Maxora Resto',
        slug: 'maxora-resto',
        domain: 'maxora-resto.localhost:4010',
        vertical: 'RestaurantOS',
        status: 'Live',
        metricValue: '1,402',
        metricLabel: 'orders this week',
        tags: ['RestaurantOS', '1 branch'],
        avatarBg: '#FB923C',
        avatarChar: 'M',
      },
    ];
  }, [projects]);

  const navTabs = ['Home', 'Tenants', 'Team', 'Billing', 'Data & privacy'] as const;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', fontFamily: 'inherit' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, background: '#0F172A', color: '#FFFFFF', padding: '12px 20px', borderRadius: '14px', fontSize: '13px', fontWeight: 600, boxShadow: '0 8px 30px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Navigation Bar */}
      <header
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 40px',
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        {/* Brand & Organization Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#000000',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px',
              letterSpacing: '-0.02em',
            }}
          >
            🪐
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 800, fontSize: '16px', color: '#0F172A', letterSpacing: '-0.01em' }}>
              OrbitoX
            </span>
            <span style={{ color: '#CBD5E1' }}>/</span>
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#64748B' }}>
              {orgName}
            </span>
          </div>
        </div>

        {/* Center Pill Nav Tabs */}
        <nav
          style={{
            display: 'flex',
            background: '#F1F5F9',
            borderRadius: '9999px',
            padding: '3px',
            gap: '2px',
          }}
        >
          {navTabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  background: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#0F172A' : '#64748B',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  borderRadius: '9999px',
                  padding: '7px 18px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 120ms ease',
                }}
              >
                {tab}
              </button>
            );
          })}
        </nav>

        {/* Right Utility Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => showToast('Command palette: Press ⌘K on any operating screen')}
            style={{ width: '36px', height: '36px', borderRadius: '9999px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
          >
            <Search size={16} />
          </button>
          <button
            type="button"
            onClick={() => showToast('No unread notifications')}
            style={{ width: '36px', height: '36px', borderRadius: '9999px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
          >
            <Bell size={16} />
          </button>
          <div style={{ width: '36px', height: '36px', borderRadius: '9999px', background: '#FEE2E2', color: '#DC2626', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {userInitials}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 40px 60px 40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* TAB 1: HOME */}
        {activeTab === 'Home' && (
          <>
            {/* Greeting Header with Add Tenant CTA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 style={{ fontSize: '38px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em', margin: '0 0 6px 0', lineHeight: 1.15 }}>
                  Hello, {userName}
                </h1>
                <div style={{ fontSize: '14px', color: '#64748B', fontWeight: 500 }}>
                  {orgName} · {tenantsList.length} {tenantsList.length === 1 ? 'tenant' : 'tenants'} · {activePlan} plan
                </div>
              </div>

              <Link
                href="/onboarding"
                style={{
                  background: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '9999px',
                  padding: '11px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                  transition: 'all 140ms ease',
                }}
              >
                <Plus size={16} />
                <span>Add a tenant</span>
              </Link>
            </div>

            {/* Hero Analytics Row (Orders Chart on Left, Plan on Right) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', alignItems: 'stretch' }}>
              {/* Card: Orders this week */}
              <div style={{ background: '#FFFFFF', borderRadius: '28px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '9999px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A' }}>
                      <TrendingUp size={15} />
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Orders this week
                    </h2>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B', marginLeft: '38px' }}>
                    Across your restaurants, from RestaurantOS.
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', margin: '20px 0 0 38px' }}>
                    <span style={{ fontSize: '42px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em' }}>
                      2,847
                    </span>
                    <span style={{ color: '#059669', fontSize: '13px', fontWeight: 700, background: '#ECFDF5', padding: '3px 8px', borderRadius: '9999px' }}>
                      +14% vs last week
                    </span>
                  </div>
                </div>

                {/* Lollipop Bar Chart (M to S) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '32px', paddingLeft: '38px', paddingRight: '20px', height: '140px' }}>
                  {[
                    { day: 'M', height: 45 },
                    { day: 'T', height: 60 },
                    { day: 'W', height: 75 },
                    { day: 'T', height: 70 },
                    { day: 'F', height: 95 },
                    { day: 'S', height: 110, peak: '612' },
                    { day: 'S', height: 82 },
                  ].map((col) => (
                    <div key={col.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      {col.peak && (
                        <span style={{ background: '#000000', color: '#FFFFFF', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '9999px', marginBottom: '-2px' }}>
                          {col.peak}
                        </span>
                      )}
                      <div style={{ width: '6px', height: `${col.height}px`, background: '#E2E8F0', borderRadius: '999px', position: 'relative' }}>
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '10px',
                            height: '10px',
                            borderRadius: '999px',
                            background: col.peak ? '#000000' : '#3B82F6',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: col.peak ? '#0F172A' : '#64748B' }}>
                        {col.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card: Your plan */}
              <div style={{ background: '#0F172A', color: '#FFFFFF', borderRadius: '28px', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                    Your plan
                  </h2>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>
                    {activePlan} · renews 1 December
                  </div>

                  <div style={{ margin: '24px 0' }}>
                    <span style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.025em' }}>
                      ₹7,497
                    </span>
                    <span style={{ fontSize: '14px', color: '#94A3B8', marginLeft: '6px' }}>
                      /month
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>
                        <span>Tenants</span>
                        <span>{tenantsList.length} of 5</span>
                      </div>
                      <div style={{ height: '6px', background: '#334155', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${(tenantsList.length / 5) * 100}%`, height: '100%', background: '#3B82F6', borderRadius: '999px' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>
                        <span>Staff seats</span>
                        <span>38 of 50</span>
                      </div>
                      <div style={{ height: '6px', background: '#334155', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: '76%', height: '100%', background: '#3B82F6', borderRadius: '999px' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('Billing')}
                  style={{
                    background: '#FFFFFF',
                    color: '#0F172A',
                    borderRadius: '9999px',
                    padding: '12px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '28px',
                    transition: 'background 120ms ease',
                  }}
                >
                  <span>Manage subscription</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Section: Your Tenants Preview */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Your tenants
                </h2>
                <button 
                  type="button" 
                  onClick={() => setActiveTab('Tenants')} 
                  style={{ background: 'transparent', border: 'none', fontSize: '13px', fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}
                >
                  See all ({tenantsList.length})
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {tenantsList.map((tenant) => {
                  const targetUrl = `http://${tenant.slug}.localhost:4010`;
                  return (
                    <div
                      key={tenant.id}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '24px',
                        border: '1px solid rgba(0,0,0,0.06)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                        padding: '24px 28px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '190px',
                        transition: 'transform 120ms ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: tenant.avatarBg, color: '#FFFFFF', fontWeight: 800, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {tenant.avatarChar}
                            </div>
                            <div>
                              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                                {tenant.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                                {tenant.domain}
                              </div>
                            </div>
                          </div>
                          <span style={{ background: '#ECFDF5', color: '#059669', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            ● {tenant.status}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
                          <span style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                            {tenant.metricValue}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>
                            {tenant.metricLabel}
                          </span>
                        </div>

                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#2563EB',
                            textDecoration: 'none',
                          }}
                        >
                          <span>Open RestaurantOS</span>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Row: Invoices (Left) & Your Data (Right) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
              <div style={{ background: '#FFFFFF', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Invoices
                  </h2>
                  <button type="button" onClick={() => setActiveTab('Billing')} style={{ background: 'transparent', border: 'none', fontSize: '13px', fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}>
                    View all
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', paddingBottom: '10px', borderBottom: '1px solid #F1F5F9' }}>
                    <span>Invoice</span>
                    <span>Period</span>
                    <span>Status</span>
                    <span style={{ textAlign: 'right' }}>Amount</span>
                  </div>

                  {[
                    { id: 'ORB-2611-0042', period: 'November 2026', status: 'Paid', amount: '₹7,497' },
                    { id: 'ORB-2610-0039', period: 'October 2026', status: 'Paid', amount: '₹7,497' },
                  ].map((inv) => (
                    <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                      <span style={{ fontWeight: 600, color: '#2563EB' }}>{inv.id}</span>
                      <span style={{ color: '#64748B' }}>{inv.period}</span>
                      <div>
                        <span style={{ background: '#ECFDF5', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px' }}>
                          {inv.status}
                        </span>
                      </div>
                      <span style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>{inv.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#FFFFFF', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px' }}>⬡</span>
                    <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Your data
                    </h2>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                    Download everything we hold for your organization, or schedule its deletion with a signed certificate.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => showToast('Full GDPR / DPDP data export generated and emailed to your account')}
                    style={{
                      background: '#000000',
                      color: '#FFFFFF',
                      borderRadius: '9999px',
                      padding: '9px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Request export
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('Data & privacy')}
                    style={{
                      background: '#FFFFFF',
                      color: '#0F172A',
                      borderRadius: '9999px',
                      padding: '9px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: '1px solid #E2E8F0',
                      cursor: 'pointer',
                    }}
                  >
                    Data rights
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: TENANTS FLEET */}
        {activeTab === 'Tenants' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 4px 0' }}>Tenants Fleet</h1>
                <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
                  Manage individual restaurant operating runtimes, domains, and staff seats across your brand.
                </p>
              </div>
              <Link
                href="/onboarding"
                style={{
                  background: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '9999px',
                  padding: '10px 22px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={16} />
                <span>Create New Tenant</span>
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              {tenantsList.map((tenant) => {
                const targetUrl = `http://${tenant.slug}.localhost:4010`;
                return (
                  <div
                    key={tenant.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '24px',
                      border: '1px solid rgba(0,0,0,0.06)',
                      padding: '28px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '20px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: tenant.avatarBg, color: '#FFFFFF', fontWeight: 800, fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {tenant.avatarChar}
                          </div>
                          <div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{tenant.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{tenant.domain}</div>
                          </div>
                        </div>
                        <span style={{ background: '#ECFDF5', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px' }}>
                          ● Active Runtime
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                        <span style={{ background: '#F1F5F9', color: '#475569', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px' }}>
                          30 Tables
                        </span>
                        <span style={{ background: '#F1F5F9', color: '#475569', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px' }}>
                          1 Floor
                        </span>
                        <span style={{ background: '#F1F5F9', color: '#475569', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px' }}>
                          KDS OLED
                        </span>
                        <span style={{ background: '#F1F5F9', color: '#475569', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px' }}>
                          Optical QR
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>Port: 4010</span>
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#0F172A',
                          color: '#FFFFFF',
                          borderRadius: '9999px',
                          padding: '8px 18px',
                          fontSize: '12px',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>Launch Cockpit</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: TEAM */}
        {activeTab === 'Team' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 4px 0' }}>Team & Access</h1>
                <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
                  Invite team members, assign administrative roles, and configure multi-tenant management.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const email = prompt('Enter email address to invite:');
                  if (email && email.trim()) {
                    showToast('Invitation sent to ' + email.trim());
                  }
                }}
                style={{
                  background: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '9999px',
                  padding: '10px 22px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={16} />
                <span>Invite Member</span>
              </button>
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.06)', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F1F5F9', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
                    <th style={{ padding: '14px 12px' }}>Member</th>
                    <th style={{ padding: '14px 12px' }}>Email</th>
                    <th style={{ padding: '14px 12px' }}>Role</th>
                    <th style={{ padding: '14px 12px' }}>Status</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Priya Shah', email: 'priya@maxorahospitality.com', role: 'Organization Owner', status: 'Active', initials: 'PS', bg: '#0F172A' },
                    { name: 'Rahul Kapoor', email: 'rahul.k@maxorahospitality.com', role: 'General Manager', status: 'Active', initials: 'RK', bg: '#FB923C' },
                    { name: 'Sameer Sen', email: 'sameer@maxorahospitality.com', role: 'Operations Lead', status: 'Active', initials: 'SS', bg: '#3B82F6' },
                    { name: 'Ananya Roy', email: 'ananya.roy@orbitox.io', role: 'Billing Admin', status: 'Invited', initials: 'AR', bg: '#A855F7' },
                  ].map((m) => (
                    <tr key={m.email} style={{ borderBottom: '1px solid #F8FAFC' }}>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '9999px', background: m.bg, color: '#FFFFFF', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {m.initials}
                          </div>
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>{m.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px', color: '#64748B' }}>{m.email}</td>
                      <td style={{ padding: '16px 12px' }}>
                        <span style={{ background: '#F1F5F9', color: '#0F172A', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px', fontSize: '11px' }}>
                          {m.role}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <span style={{ background: m.status === 'Active' ? '#ECFDF5' : '#FEF3C7', color: m.status === 'Active' ? '#059669' : '#D97706', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', fontSize: '11px' }}>
                          {m.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => showToast('Permission settings opened for ' + m.name)}
                          style={{ background: '#F1F5F9', border: 'none', borderRadius: '9999px', padding: '5px 14px', fontSize: '12px', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: BILLING */}
        {activeTab === 'Billing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 4px 0' }}>Subscription & Invoicing</h1>
              <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
                Manage your commercial plan, billing contact, GST invoicing details, and payment tenders.
              </p>
            </div>

            {/* Plan Details Card */}
            <div style={{ background: '#0F172A', color: '#FFFFFF', borderRadius: '28px', padding: '32px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '32px', alignItems: 'center' }}>
              <div>
                <span style={{ background: '#3B82F6', color: '#FFFFFF', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', textTransform: 'uppercase' }}>
                  Current Plan
                </span>
                <div style={{ fontSize: '36px', fontWeight: 800, marginTop: '8px' }}>
                  Growth Commercial Plan
                </div>
                <div style={{ fontSize: '14px', color: '#94A3B8', marginTop: '4px' }}>
                  Billed monthly at ₹7,497/mo (Next billing date: 1 December 2026)
                </div>

                <div style={{ display: 'flex', gap: '20px', marginTop: '24px' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 800 }}>1 of 5</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>Tenants Used</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 800 }}>38 of 50</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>Staff Seats</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 800 }}>Unlimited</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>Optical QR Codes</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Payment Method</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginTop: '6px' }}>
                  UPI AutoPay · HDFC Bank
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                  mandate_cmwulhx93000si0bhb53gk7dr
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Payment tender update dialog opened')}
                  style={{
                    background: '#FFFFFF',
                    color: '#0F172A',
                    borderRadius: '9999px',
                    padding: '8px 18px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '16px',
                  }}
                >
                  Change payment method
                </button>
              </div>
            </div>

            {/* Invoices List */}
            <div style={{ background: '#FFFFFF', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.06)', padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px 0' }}>Invoice History</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F1F5F9', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
                    <th style={{ padding: '12px 14px' }}>Invoice ID</th>
                    <th style={{ padding: '12px 14px' }}>Billing Period</th>
                    <th style={{ padding: '12px 14px' }}>GSTIN Verified</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                    <th style={{ padding: '12px 14px' }}>Amount</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 'ORB-2611-0042', period: 'Nov 1, 2026 – Nov 30, 2026', gstin: '29AABCU9603R1ZM', status: 'PAID', amount: '₹7,497' },
                    { id: 'ORB-2610-0039', period: 'Oct 1, 2026 – Oct 31, 2026', gstin: '29AABCU9603R1ZM', status: 'PAID', amount: '₹7,497' },
                    { id: 'ORB-2609-0014', period: 'Sep 1, 2026 – Sep 30, 2026', gstin: '29AABCU9603R1ZM', status: 'PAID', amount: '₹7,497' },
                  ].map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                      <td style={{ padding: '14px', fontWeight: 700, color: '#2563EB' }}>{row.id}</td>
                      <td style={{ padding: '14px', color: '#64748B' }}>{row.period}</td>
                      <td style={{ padding: '14px', color: '#0F172A', fontFamily: 'monospace' }}>{row.gstin}</td>
                      <td style={{ padding: '14px' }}>
                        <span style={{ background: '#ECFDF5', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px' }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px', fontWeight: 700, color: '#0F172A' }}>{row.amount}</td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => showToast('Downloading invoice tax receipt ' + row.id)}
                          style={{ background: 'transparent', border: 'none', color: '#2563EB', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                          PDF ↗
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: DATA & PRIVACY */}
        {activeTab === 'Data & privacy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 4px 0' }}>Data Sovereignty & Privacy</h1>
              <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
                Exercise complete control over your customer records, order receipts, and cryptographic audit proofs.
              </p>
            </div>

            {/* Cryptographic Proof Card */}
            <div style={{ background: '#FFFFFF', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.06)', padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Shield size={20} color="#059669" />
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Merkle Audit Tree Verification</h2>
              </div>
              <p style={{ color: '#64748B', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                Every settlement, menu update, and staff action is cryptographically hashed with SHA-256 and chained into your tenant's tamper-evident Merkle log.
              </p>
              <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '14px', marginTop: '16px', fontFamily: 'monospace', fontSize: '12px', color: '#0F172A', wordBreak: 'break-all', border: '1px solid #E2E8F0' }}>
                Current Root: 355972c9c31a04b6acfd37f8dceb2244db7335d4113b2f88c83d8f1cb1145143
              </div>
            </div>

            {/* Export and Deletion Action Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: '#FFFFFF', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.06)', padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>Full Organization Data Export</h3>
                  <p style={{ color: '#64748B', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                    Includes order histories, kitchen dockets, guest capability logs, and tax ledger records in JSON format.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Full tenant export generated successfully!')}
                  style={{
                    background: '#000000',
                    color: '#FFFFFF',
                    borderRadius: '9999px',
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '20px',
                    alignSelf: 'flex-start',
                  }}
                >
                  Download Data Archive (.zip)
                </button>
              </div>

              <div style={{ background: '#FFFFFF', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.06)', padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>Cryptographic Erasure Certificate</h3>
                  <p style={{ color: '#64748B', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                    Permanently delete diner session logs and obtain a cryptographically signed deletion proof under DPDP 2023.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Request signed cryptographic erasure certificate for stale diner sessions?')) {
                      showToast('Erasure certificate issued and logged to audit trail.');
                    }
                  }}
                  style={{
                    background: '#FFFFFF',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                    borderRadius: '9999px',
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '20px',
                    alignSelf: 'flex-start',
                  }}
                >
                  Issue Erasure Certificate
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
