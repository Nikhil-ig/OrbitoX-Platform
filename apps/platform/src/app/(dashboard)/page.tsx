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
          // Gather projects across all memberships
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

    // Default concept data if no projects configured yet
    return [
      {
        id: 'masala-house',
        name: 'Masala House',
        slug: 'masala-house',
        domain: 'masala.orbitox.io',
        vertical: 'RestaurantOS',
        status: 'Live',
        metricValue: '1,402',
        metricLabel: 'orders this week',
        tags: ['RestaurantOS', '2 branches'],
        avatarBg: '#FB923C',
        avatarChar: 'M',
      },
      {
        id: 'shah-clinic',
        name: 'Shah Family Clinic',
        slug: 'shah-clinic',
        domain: 'clinic.orbitox.io',
        vertical: 'HospitalOS',
        status: 'Live',
        metricValue: '186',
        metricLabel: 'appointments this week',
        tags: ['HospitalOS', '12 staff'],
        avatarBg: '#10B981',
        avatarChar: '⊕',
      },
      {
        id: 'chai-co',
        name: 'Chai & Co.',
        slug: 'chai-co',
        domain: 'chaico.orbitox.io',
        vertical: 'RestaurantOS',
        status: 'Setting up',
        metricValue: 'Step 4 of 6',
        metricLabel: 'creating database roles',
        tags: ['RestaurantOS', 'Step 4 of 6'],
        progress: 65,
        avatarBg: '#8B5CF6',
        avatarChar: '🔒',
      },
    ];
  }, [projects]);

  return (
    <div style={{ backgroundColor: '#F4F5F7', minHeight: '100vh', color: '#0F172A', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* 1. Top Navigation Bar (Matching '2 · Customer dashboard — light.png') */}
      <header style={{ maxWidth: '1440px', margin: '0 auto', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#0F172A' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 800, fontSize: '14px' }}>
            ⬡
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>orbitox</span>
        </Link>

        {/* Center Pill Navigation */}
        <nav style={{ background: '#FFFFFF', borderRadius: '9999px', padding: '4px', display: 'flex', gap: '4px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          {(['Home', 'Tenants', 'Team', 'Billing', 'Data & privacy'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  background: isActive ? '#000000' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#64748B',
                  borderRadius: '9999px',
                  padding: '7px 18px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  border: 'none',
                  cursor: 'pointer',
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
            style={{ width: '36px', height: '36px', borderRadius: '9999px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
          >
            <Search size={16} />
          </button>
          <button
            type="button"
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
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px 40px 60px 40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* 2. Greeting Header with Add Tenant CTA */}
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

        {/* 3. Hero Analytics Row (Orders Chart on Left, Plan on Right) */}
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
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '36px' }}>
              <div>
                <div style={{ fontSize: '48px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  +18%
                </div>
                <div style={{ fontSize: '13px', color: '#64748B', marginTop: '8px' }}>
                  2,914 orders, up from 2,469 last week
                </div>
              </div>

              {/* Pin Chart Bars */}
              <div style={{ display: 'flex', gap: '22px', alignItems: 'flex-end', paddingBottom: '4px' }}>
                {[
                  { day: 'M', height: 70 },
                  { day: 'T', height: 55 },
                  { day: 'W', height: 78 },
                  { day: 'T', height: 86 },
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
          </div>

          {/* Card: Your plan (High-Contrast Black Card) */}
          <div style={{ background: '#0F172A', color: '#FFFFFF', borderRadius: '28px', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                    Your plan
                  </h2>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>
                    {activePlan} · renews 1 December
                  </div>
                </div>
              </div>

              <div style={{ margin: '24px 0' }}>
                <span style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.025em' }}>
                  ₹7,497
                </span>
                <span style={{ fontSize: '14px', color: '#94A3B8', marginLeft: '6px' }}>
                  /month
                </span>
              </div>

              {/* Progress Bars */}
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

            <Link
              href="/onboarding"
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
                textDecoration: 'none',
                marginTop: '28px',
                transition: 'background 120ms ease',
              }}
            >
              <span>Change plan</span>
              <ArrowRight size={14} />
            </Link>
          </div>

        </div>

        {/* 4. Section: Your Tenants */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Your tenants
            </h2>
            <Link href="#all-tenants" style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>
              See all
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {tenantsList.map((tenant) => {
              const targetUrl = tenant.slug.includes('maxora')
                ? `http://${tenant.slug}.localhost:4010`
                : `http://localhost:4010`;

              return (
                <div
                  key={tenant.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    border: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Header: Avatar, Name & Status Pill */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: tenant.avatarBg,
                            color: '#FFFFFF',
                            fontWeight: 800,
                            fontSize: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {tenant.avatarChar}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                            {tenant.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                            {tenant.domain}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          background: tenant.status === 'Live' ? '#000000' : '#FEF3C7',
                          color: tenant.status === 'Live' ? '#FFFFFF' : '#D97706',
                          borderRadius: '9999px',
                          padding: '3px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {tenant.status}
                      </span>
                    </div>

                    {/* Metadata Tags */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
                      {tenant.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            background: '#F1F5F9',
                            color: '#475569',
                            borderRadius: '9999px',
                            padding: '3px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    {/* Metric row */}
                    {tenant.progress ? (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ height: '5px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: `${tenant.progress}%`, height: '100%', background: '#2563EB', borderRadius: '999px' }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
                        <span style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                          {tenant.metricValue}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                          {tenant.metricLabel}
                        </span>
                      </div>
                    )}

                    {/* Action link */}
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
                        marginTop: '6px',
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

        {/* 5. Bottom Row: Invoices (Left) & Your Data (Right) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
          
          {/* Invoices Card */}
          <div style={{ background: '#FFFFFF', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Invoices
              </h2>
              <Link href="#invoices" style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>
                View all
              </Link>
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

          {/* Your Data Card */}
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
                Deletion options
              </button>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
