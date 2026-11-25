'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw, Plus, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  HeroStat,
  StatStrip,
  LollipopChart,
  ComparisonLineChart,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  ActivityFeed,
  ListRowLink,
  Button,
} from '@orbitox-io/ui';
import type {
  OverviewSummary,
  OverviewTelemetry,
  OverviewAlerts,
} from '@/server/overview/overview-service';

export interface OverviewClientProps {
  initialSummary: OverviewSummary;
  initialTelemetry: OverviewTelemetry;
  initialAlerts: OverviewAlerts;
}

export function OverviewClient({
  initialSummary,
  initialTelemetry,
  initialAlerts,
}: OverviewClientProps) {
  const router = useRouter();
  const [summary, setSummary] = React.useState<OverviewSummary>(initialSummary);
  const [telemetry, setTelemetry] = React.useState<OverviewTelemetry>(initialTelemetry);
  const [alerts, setAlerts] = React.useState<OverviewAlerts>(initialAlerts);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const refreshTelemetry = async () => {
    try {
      setIsRefreshing(true);
      const [sumRes, telRes, altRes] = await Promise.all([
        fetch('/api/v1/platform/overview/summary').then((r) => r.json()),
        fetch('/api/v1/platform/overview/telemetry').then((r) => r.json()),
        fetch('/api/v1/platform/overview/alerts').then((r) => r.json()),
      ]);

      if (sumRes?.success && sumRes.data) setSummary(sumRes.data);
      if (telRes?.success && telRes.data) setTelemetry(telRes.data);
      if (altRes?.success && altRes.data) setAlerts(altRes.data);
    } catch {
      // Retain current state if background refresh fails
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Fleet Operations & Telemetry
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Real-time tenant health, revenue throughput, and provisioning state.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={refreshTelemetry}
            disabled={isRefreshing}
            className="rounded-full flex items-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh telemetry
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push('/console/tenants')}
            className="rounded-full flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Provision new tenant
          </Button>
        </div>
      </div>

      {/* Mobile Operator Phone Summary Band (Concept: Operator console · phone.png) */}
      <section className="sm:hidden space-y-4" aria-label="Mobile operator summary">
        <div className="space-y-1">
          <h2 className="text-3xl font-semibold tracking-tight leading-tight text-[var(--color-text)]">
            {summary.clusterStatus === 'healthy' ? 'Everything is' : 'Cluster needs'}
            <br />
            <span className="text-[var(--color-text-muted)]">
              {summary.clusterStatus === 'healthy' ? 'running fine.' : 'your decision.'}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/console/tenants"
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 block hover:border-[var(--color-primary)]/40 transition-colors"
          >
            <div className="text-2xl font-light tracking-tight text-[var(--color-text)]">
              {summary.activeTenants.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">active tenants</div>
          </Link>
          <Link
            href="/console/billing"
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 block hover:border-[var(--color-primary)]/40 transition-colors"
          >
            <div className="text-2xl font-light tracking-tight text-[var(--color-text)]">
              {summary.monthlyArr}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">monthly ARR</div>
          </Link>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Needs a decision</h3>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-[var(--color-danger)]/20 text-[var(--color-danger)]">
              {Math.max(1, summary.failedJobsCount + alerts.tenantsRequiringAttention.filter((t) => t.status !== 'good').length)}
            </span>
          </div>

          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#3A6BF5] to-[#274ED1] text-white shadow-sm space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-white/15 font-medium">AI drafted</span>
              <span className="text-white/75">Ask OrbitoX</span>
            </div>
            <div className="text-sm font-semibold leading-snug">
              Review grace-period reminders & cluster diagnostics
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/console/ai"
                className="inline-flex items-center justify-center rounded-full bg-white text-slate-900 font-semibold text-xs py-2 px-3"
              >
                Open AI
              </Link>
              <Link
                href="/console/billing"
                className="inline-flex items-center justify-center rounded-full bg-white/15 text-white border border-white/25 font-medium text-xs py-2 px-3"
              >
                Review Billing
              </Link>
            </div>
          </div>

          {summary.failedJobsCount > 0 && (
            <Link
              href="/console/provisioning?status=FAILED"
              className="flex items-center justify-between p-3.5 rounded-2xl border border-[var(--color-danger)]/35 bg-[var(--color-surface)]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-2 w-2 rounded-full bg-[var(--color-danger)] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--color-text)] truncate">
                    {summary.failedJobsCount} failed provisioning job(s)
                  </div>
                  <div className="text-[11px] text-[var(--color-danger)] truncate">
                    Tap to inspect & retry safely
                  </div>
                </div>
              </div>
              <span className="text-xs text-[var(--color-text-muted)] shrink-0">›</span>
            </Link>
          )}
        </div>
      </section>

      {/* Cluster Health Banner if Degraded */}
      {summary.clusterStatus !== 'healthy' && (
        <div className="p-4 rounded-[var(--radius-row)] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-sm font-medium break-words">
              Cluster attention: {summary.failedJobsCount} asynchronous provisioning operation(s) require operator review.
            </div>
          </div>
          <Link
            href="/console/provisioning?status=FAILED"
            className="text-xs font-semibold underline shrink-0 hover:opacity-80 transition-opacity"
          >
            Review provisioning jobs →
          </Link>
        </div>
      )}

      {/* Top Hero Stat & StatStrip */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
        <div className="xl:col-span-3">
          <HeroStat
            label="Monthly Platform ARR"
            value={summary.monthlyArr}
            note={`Across ${summary.activeTenants} active enterprise tenants`}
            delta={summary.arrTrend.value}
            deltaType="positive"
          />
        </div>
        <div className="xl:col-span-9 flex flex-col justify-center min-w-0">
          <StatStrip
            stats={[
              {
                label: 'Active Tenants',
                value: summary.activeTenants.toLocaleString(),
                delta: 'Provisioned',
                deltaType: 'neutral',
              },
              {
                label: 'API Calls (24h)',
                value: summary.apiCalls24h,
                delta: 'Last 24h',
                deltaType: 'neutral',
              },
              {
                label: 'P95 Latency',
                value: `${summary.p95LatencyMs}ms`,
                delta: 'Edge API',
                deltaType: 'positive',
              },
              {
                label: 'Failed Jobs',
                value: summary.failedJobsCount.toString(),
                delta: summary.failedJobsCount > 0 ? 'Action needed' : '0 errors',
                deltaType: summary.failedJobsCount > 0 ? 'negative' : 'positive',
              },
            ]}
          />
        </div>
      </div>

      {/* Charts Grid: Lollipop Daily Velocity & Latency Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LollipopChart
            title="Daily Transaction Throughput"
            description="Cluster-wide processed orders across all active restaurant & HMS tenants"
            data={telemetry.dailyThroughput.map((d) => ({
              label: d.label,
              value: d.value,
              highlighted: d.isSelected,
            }))}
          />

          <ComparisonLineChart
            title="Cluster Latency Telemetry (p95)"
            description="Hourly cluster p95 latency vs prior 24h baseline"
            data={telemetry.latencyTrend}
            currentLabel="Today"
            previousLabel="Yesterday"
            formatValue={(val) => `${val.toFixed(1)}ms`}
          />
        </div>

        {/* System Audit Feed Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>System Audit Trail</span>
                <span className="flex items-center gap-1 text-[11px] font-normal text-[var(--color-success)]">
                  <ShieldCheck className="h-3.5 w-3.5" /> Tamper-evident
                </span>
              </CardTitle>
              <CardDescription>Append-only administrative operations log</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeed items={alerts.auditFeed} />
              <div className="pt-3 border-t border-[var(--color-border)] mt-4">
                <Link
                  href="/console/audit"
                  className="text-xs text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                >
                  <span>View full audit log</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Highlighted Tenants Requiring Attention */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-[var(--color-text-muted)]">
            Tenants Requiring Attention
          </h3>
          <Link
            href="/console/tenants"
            className="text-xs font-medium text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            <span>Open tenants</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="space-y-2">
          {alerts.tenantsRequiringAttention.map((tenant) => {
            const dotMap: Record<'good' | 'warning' | 'problem', 'green' | 'amber' | 'coral'> = {
              good: 'green',
              warning: 'amber',
              problem: 'coral',
            };
            return (
              <ListRowLink
                key={tenant.id}
                href={`/console/tenants/${tenant.id}`}
                title={tenant.name}
                subtitle={`Tenant ID: ${tenant.id} · Domain: ${tenant.domain}`}
                statusDot={dotMap[tenant.status]}
                action={
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]">
                    {tenant.badge}
                  </span>
                }
                highlighted={tenant.highlighted}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

