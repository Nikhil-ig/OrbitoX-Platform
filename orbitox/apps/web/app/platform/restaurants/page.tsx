'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import styles from './restaurants.module.css';

interface RestaurantTenant {
  id: string;
  slug: string;
  name: string;
  planId: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  subdomainUrl?: string;
  customDomain?: string;
  createdAt: string;
  branches?: any[];
  tableCount?: number;
  ordersProcessed?: number;
}

export default function RestaurantTenantsPage() {
  const [tenants, setTenants] = useState<RestaurantTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Wizard Modal State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<{ checking: boolean; available?: boolean; error?: string }>({
    checking: false,
  });
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [templateId, setTemplateId] = useState('tmpl_starter_bistro');
  const [primaryColor, setPrimaryColor] = useState('#C86B3C');
  const [planId, setPlanId] = useState('plan_growth');

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/platform/restaurants');
      const data = await res.json();
      if (data.items) {
        setTenants(data.items);
      } else {
        setTenants([]);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load restaurant tenants.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Real-time Slug Check Debouncer
  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugStatus({ checking: false, available: undefined });
      return;
    }

    setSlugStatus({ checking: true });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/platform/restaurants/check-slug?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        setSlugStatus({ checking: false, available: data.available, error: data.error });
      } catch (e) {
        setSlugStatus({ checking: false, available: true });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [slug]);

  // Auto-generate slug from restaurant name if slug hasn't been manually edited
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 24)) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 24);
      setSlug(autoSlug);
    }
  };

  const handleCreateTenant = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/platform/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: name,
          slug,
          ownerName,
          ownerEmail,
          templateId,
          primaryColor,
          planId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create restaurant tenant.');
      }

      setCreatedResult(data.tenant);
      fetchTenants();
    } catch (err: any) {
      alert(`Provisioning failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: 'suspend' | 'resume') => {
    try {
      const res = await fetch(`/api/v1/platform/restaurants/${id}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Action ${action} failed`);
      }
      fetchTenants();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Filtered tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch =
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || t.status?.toUpperCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tenants, searchTerm, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter((t) => t.status === 'active').length;
    const trial = tenants.filter((t) => t.status === 'trial').length;
    const suspended = tenants.filter((t) => t.status === 'suspended').length;
    return { total, active, trial, suspended };
  }, [tenants]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Restaurant Fleet</h1>
          <p className={styles.subtitle}>
            Multi-tenant control console for independent hospitality brands, custom domains, and quotas.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => {
              setWizardOpen(true);
              setStep(1);
              setCreatedResult(null);
            }}
          >
            + Create Restaurant
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Total Restaurants</div>
          <div className={styles.cardValue}>{metrics.total}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Active Deployments</div>
          <div className={`${styles.cardValue} ${styles.good}`}>{metrics.active}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>In Trial Evaluation</div>
          <div className={styles.cardValue}>{metrics.trial}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Suspended Entities</div>
          <div className={`${styles.cardValue} ${metrics.suspended > 0 ? styles.bad : ''}`}>
            {metrics.suspended}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={styles.filtersBar}>
        <input
          type="text"
          placeholder="Search restaurants by name, slug, or ID..."
          className={styles.input}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="TRIAL">Trial</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Tenants Table */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--ui-text-muted)' }}>
            Loading restaurant fleet telemetry...
          </div>
        ) : filteredTenants.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--ui-text-muted)' }}>
            No restaurant tenants found matching your filter. Click "+ Create Restaurant" to launch one!
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Restaurant</th>
                <th className={styles.th}>Domain / Subdomain</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Plan Tier</th>
                <th className={styles.th}>Created</th>
                <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((t) => {
                const isSuspended = t.status === 'suspended';
                const subdomain = `${t.slug}.orbitox.live`;

                return (
                  <tr key={t.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.tenantName}>
                        <span>🪐</span>
                        <div>
                          <div>{t.name}</div>
                          <div className={styles.tenantSlug}>{t.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <a
                        href={`http://${subdomain}`}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.domainLink}
                      >
                        {t.customDomain || subdomain} ↗
                      </a>
                    </td>
                    <td className={styles.td}>
                      <span
                        className={`${styles.pill} ${
                          t.status === 'active'
                            ? styles.pillActive
                            : t.status === 'trial'
                            ? styles.pillTrial
                            : t.status === 'suspended'
                            ? styles.pillSuspended
                            : styles.pillCancelled
                        }`}
                      >
                        ● {t.status}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
                        {t.planId.replace(/^plan_/, '')}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span style={{ fontSize: '12px', color: 'var(--ui-text-muted)' }}>
                        {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className={styles.td} style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Link href={`/platform/restaurants/${t.id}`} className={styles.btn}>
                          Console
                        </Link>
                        {isSuspended ? (
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnSuccess}`}
                            onClick={() => handleAction(t.id, 'resume')}
                          >
                            Resume
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnDanger}`}
                            onClick={() => handleAction(t.id, 'suspend')}
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 3-STEP NEW RESTAURANT WIZARD MODAL ── */}
      {wizardOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            {/* Header */}
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Launch New Restaurant</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setWizardOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Stepper */}
            {!createdResult && (
              <div className={styles.stepIndicator}>
                <div className={`${styles.stepItem} ${step === 1 ? styles.stepItemActive : step > 1 ? styles.stepItemDone : ''}`}>
                  <span>1. Basics</span>
                </div>
                <div style={{ color: 'var(--ui-text-dim)' }}>→</div>
                <div className={`${styles.stepItem} ${step === 2 ? styles.stepItemActive : step > 2 ? styles.stepItemDone : ''}`}>
                  <span>2. Look & Template</span>
                </div>
                <div style={{ color: 'var(--ui-text-dim)' }}>→</div>
                <div className={`${styles.stepItem} ${step === 3 ? styles.stepItemActive : ''}`}>
                  <span>3. Plan & Provision</span>
                </div>
              </div>
            )}

            {/* Success View */}
            {createdResult ? (
              <div style={{ padding: '36px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                <h3 style={{ fontSize: '20px', margin: '0 0 8px', color: 'var(--ui-text-primary)' }}>
                  Restaurant Successfully Provisioned!
                </h3>
                <p style={{ color: 'var(--ui-text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 24px' }}>
                  <strong>{createdResult.name}</strong> is live with dedicated isolation. Send this single-use onboarding invite link to the owner to set their secure PIN:
                </p>

                <div
                  style={{
                    background: 'var(--ui-bg-input)',
                    border: '1px solid var(--ui-border-default)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    wordBreak: 'break-all',
                    maxWidth: '540px',
                    margin: '0 auto 16px',
                    color: 'var(--ui-accent-primary, #C86B3C)',
                  }}
                >
                  {createdResult.inviteUrl}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => {
                      navigator.clipboard.writeText(createdResult.inviteUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? '✓ Copied!' : 'Copy Owner Invite Link'}
                  </button>
                  <a
                    href={createdResult.subdomainUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.btn}
                  >
                    Visit Storefront ↗
                  </a>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => setWizardOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Wizard Steps Form & Preview */
              <>
                <div className={styles.modalBody}>
                  {/* Form Left Column */}
                  <div className={styles.formSection}>
                    {step === 1 && (
                      <>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Restaurant Legal Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Copper Chimney Bistro"
                            className={styles.formInput}
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.label}>Platform Subdomain Slug</label>
                          <input
                            type="text"
                            placeholder="e.g. copper-chimney"
                            className={styles.formInput}
                            value={slug}
                            onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
                          />
                          <div style={{ fontSize: '11px', marginTop: '4px' }}>
                            {slugStatus.checking ? (
                              <span style={{ color: 'var(--ui-text-dim)' }}>Checking availability...</span>
                            ) : slugStatus.available === true ? (
                              <span style={{ color: 'var(--ui-success, #10B981)' }}>✓ {slug}.orbitox.live is available</span>
                            ) : slugStatus.error ? (
                              <span style={{ color: 'var(--ui-danger, #EF4444)' }}>✕ {slugStatus.error}</span>
                            ) : null}
                          </div>
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.label}>Owner Full Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Chef Sanjeev Kapoor"
                            className={styles.formInput}
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.label}>Owner Email Address</label>
                          <input
                            type="email"
                            placeholder="e.g. owner@bistro.com"
                            className={styles.formInput}
                            value={ownerEmail}
                            onChange={(e) => setOwnerEmail(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {step === 2 && (
                      <>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Starter Industry Template</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                              { id: 'tmpl_starter_bistro', name: 'Modern Bistro & Grill', desc: '4 course menus, dining room floor, table ordering' },
                              { id: 'tmpl_quick_service', name: 'Quick Service Cafe', desc: 'Fast counter pickup, espresso bar, grab-and-go catalog' },
                              { id: 'tmpl_cafe_bakery', name: 'Bakery & Patisserie', desc: 'Artisanal breads, daily bakes, tea pairing menus' },
                            ].map((tmpl) => (
                              <div
                                key={tmpl.id}
                                className={`${styles.templateCard} ${templateId === tmpl.id ? styles.templateCardSelected : ''}`}
                                onClick={() => setTemplateId(tmpl.id)}
                              >
                                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ui-text-primary)' }}>
                                  {tmpl.name}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--ui-text-muted)' }}>
                                  {tmpl.desc}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.label}>Brand Accent Color</label>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              style={{ width: '40px', height: '36px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                            />
                            <input
                              type="text"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className={styles.formInput}
                              style={{ width: '120px' }}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {step === 3 && (
                      <>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Subscription Tier & Quotas</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                              { id: 'plan_starter', name: 'Starter Bistro', price: '₹2,999/mo', desc: 'Up to 10 tables, 500 orders/mo, 1 physical branch' },
                              { id: 'plan_growth', name: 'Culinary Growth', price: '₹7,999/mo', desc: 'Up to 30 tables, 2,500 orders/mo, custom domain & KDS' },
                              { id: 'plan_enterprise', name: 'Enterprise Fleet', price: '₹19,999/mo', desc: 'Unlimited tables & volume, multi-branch, SLA support' },
                            ].map((p) => (
                              <div
                                key={p.id}
                                className={`${styles.templateCard} ${planId === p.id ? styles.templateCardSelected : ''}`}
                                onClick={() => setPlanId(p.id)}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ui-text-primary)' }}>{p.name}</span>
                                  <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--ui-accent-primary, #C86B3C)' }}>{p.price}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--ui-text-muted)' }}>{p.desc}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', fontSize: '12px', color: 'var(--ui-text-secondary)' }}>
                          🔒 <strong>Zero Pilot Leakage:</strong> This restaurant starts with zero demo dishes, clean floors, and single-use owner token.
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Column: Live Storefront Preview Card */}
                  <div className={styles.previewCard}>
                    <div className={styles.previewHeader}>Live Storefront Preview</div>
                    <div
                      className={styles.previewHero}
                      style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #151719 100%)` }}
                    >
                      <div style={{ fontSize: '28px', marginBottom: '4px' }}>🍷</div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{name || 'Restaurant Name'}</div>
                      <div style={{ fontSize: '10px', opacity: 0.8, fontFamily: 'monospace' }}>
                        {slug ? `${slug}.orbitox.live` : 'slug.orbitox.live'}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ui-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div><strong>Template:</strong> {templateId.replace('tmpl_', '').replace(/_/g, ' ')}</div>
                      <div><strong>Owner:</strong> {ownerName || '—'}</div>
                      <div><strong>Plan:</strong> {planId.replace('plan_', '').toUpperCase()}</div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className={styles.modalFooter}>
                  {step > 1 ? (
                    <button
                      type="button"
                      className={styles.btn}
                      onClick={() => setStep(step - 1)}
                    >
                      Back
                    </button>
                  ) : <div />}

                  {step < 3 ? (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      disabled={step === 1 && (!name || !slug || !ownerName || !ownerEmail || slugStatus.available === false)}
                      onClick={() => setStep(step + 1)}
                    >
                      Next Step →
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      disabled={submitting}
                      onClick={handleCreateTenant}
                    >
                      {submitting ? 'Provisioning...' : 'Complete & Provision Restaurant'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
