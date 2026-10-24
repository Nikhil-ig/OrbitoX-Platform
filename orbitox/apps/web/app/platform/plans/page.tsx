'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './plans.module.css';

interface PlanLimit {
  key: string;
  name: string;
  limit: number;
  enforced: boolean;
  unit: string;
  window?: string;
}

interface PlanAddon {
  id: string;
  name: string;
  priceMinor: string;
  currency: string;
  description: string;
}

interface PlanDefinition {
  id: string;
  name: string;
  tier: string;
  basePriceMinor: string;
  currency: string;
  billingInterval: string;
  features: string[];
  limits: Record<string, PlanLimit>;
  addons: PlanAddon[];
}

interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
}

function formatPrice(minor: string, currency: string, interval: string): string {
  const num = Number(minor) / 100;
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${num.toLocaleString()} / ${interval === 'monthly' ? 'mo' : interval}`;
}

export default function PlansCatalogPage() {
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [planProjectMap, setPlanProjectMap] = useState<Record<string, ProjectSummary[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/platform/plans')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((body) => {
        if (body.success && body.data) {
          setPlans(body.data.plans || []);
          setPlanProjectMap(body.data.planProjectMap || {});
        } else {
          throw new Error(body.error?.message || 'Failed to load plans');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Subscription Plans & Quota Catalog</h1>
          <p className={styles.subtitle}>
            Central platform subscription plans, included features, quota boundaries, and active project subscriptions.
          </p>
        </div>
      </header>

      <div className={styles.notice}>
        <span className={styles.noticeIcon}>ℹ️</span>
        <span>
          Plan definitions and pricing structures are governed centrally by <code>externalProjectEngine.quoteService</code>.
          This catalog view is currently read-only; assign plans to runtimes via project settings or the Project Detail &gt; Billing tab.
        </span>
      </div>

      {loading && <div className={styles.emptyProjects}>Loading subscription plans...</div>}
      {error && <div className={styles.emptyProjects} style={{ color: '#f87171' }}>Error loading plans: {error}</div>}

      <div className={styles.grid}>
        {plans.map((plan) => {
          const referencingProjects = planProjectMap[plan.id] || [];

          return (
            <div key={plan.id} className={styles.planCard}>
              <div className={styles.planHeader}>
                <div>
                  <h2 className={styles.planName}>{plan.name}</h2>
                  <span className={styles.planId}>{plan.id}</span>
                </div>
                <span className={styles.tierBadge}>{plan.tier}</span>
              </div>

              <div className={styles.pricing}>
                <span className={styles.priceAmount}>
                  {formatPrice(plan.basePriceMinor, plan.currency, plan.billingInterval)}
                </span>
              </div>

              <div className={styles.section}>
                <span className={styles.sectionTitle}>Quota Limits</span>
                <div className={styles.limitsList}>
                  {Object.values(plan.limits || {}).map((lim) => (
                    <div key={lim.key} className={styles.limitRow}>
                      <span className={styles.limitLabel}>{lim.name || lim.key}</span>
                      <div className={styles.limitValue}>
                        <span>{lim.limit.toLocaleString()} {lim.unit}</span>
                        <span className={`${styles.enforcedBadge} ${lim.enforced ? styles.enforcedYes : styles.enforcedNo}`}>
                          {lim.enforced ? 'Enforced' : 'Soft'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <span className={styles.sectionTitle}>Included Features</span>
                <div className={styles.featureList}>
                  {plan.features.map((feat) => (
                    <span key={feat} className={styles.featureTag}>
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              {plan.addons && plan.addons.length > 0 && (
                <div className={styles.section}>
                  <span className={styles.sectionTitle}>Available Add-ons</span>
                  <div className={styles.limitsList}>
                    {plan.addons.map((addon) => (
                      <div key={addon.id} className={styles.limitRow}>
                        <span className={styles.limitLabel}>{addon.name}</span>
                        <span className={styles.limitValue} style={{ fontSize: '12px' }}>
                          {formatPrice(addon.priceMinor, addon.currency, 'mo')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.projectsContainer}>
                <span className={styles.sectionTitle}>
                  Subscribed Projects ({referencingProjects.length})
                </span>
                {referencingProjects.length === 0 ? (
                  <span className={styles.emptyProjects}>No projects currently on this plan.</span>
                ) : (
                  <div className={styles.projectTags}>
                    {referencingProjects.map((proj) => (
                      <Link
                        key={proj.id}
                        href={`/platform/projects/${proj.id}`}
                        className={styles.projectLink}
                      >
                        <span>📁 {proj.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
