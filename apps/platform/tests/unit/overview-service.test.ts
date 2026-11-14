import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getOverviewSummary,
  getOverviewTelemetry,
  getOverviewAlerts,
  requireOperatorAuthorization,
} from '@/server/overview/overview-service';
import type { OperatorSessionContext } from '@/server/accounts/account-service';

describe('Operator Console Overview Service (Step C1 & Screen A1)', () => {
  const mockOperator: OperatorSessionContext = {
    id: 'session_test_op1',
    operatorId: 'op_test_123',
    email: 'operator@orbitox.io',
    role: 'PLATFORM_OWNER',
    csrfTokenHash: 'mock_csrf_hash',
    reauthenticatedAt: new Date(),
  };

  it('retrieves master cluster overview summary with non-zero metrics', async () => {
    const summary = await getOverviewSummary(mockOperator);
    assert.ok(summary.monthlyArr);
    assert.ok(summary.activeTenants >= 1);
    assert.ok(summary.totalOrganizations >= 1);
    assert.ok(summary.apiCalls24h);
    assert.ok(['healthy', 'degraded', 'warning'].includes(summary.clusterStatus));
    assert.equal(typeof summary.p95LatencyMs, 'number');
    assert.equal(typeof summary.p99LatencyMs, 'number');
  });

  it('retrieves 7-day throughput and latency time-series for charts', async () => {
    const telemetry = await getOverviewTelemetry(mockOperator);
    assert.equal(telemetry.dailyThroughput.length, 7);
    assert.ok(telemetry.dailyThroughput.some((d) => d.isSelected));
    assert.equal(telemetry.latencyTrend.length, 7);
    assert.ok(telemetry.p95LatencyMs > 0);
  });

  it('retrieves audit trail and attention tenants with valid severity mappings', async () => {
    const alerts = await getOverviewAlerts(mockOperator);
    assert.ok(alerts.auditFeed.length > 0);
    assert.ok(alerts.tenantsRequiringAttention.length > 0);
    for (const tenant of alerts.tenantsRequiringAttention) {
      assert.ok(['good', 'warning', 'problem'].includes(tenant.status));
      assert.ok(tenant.badge);
      assert.ok(tenant.domain);
    }
  });

  it('enforces operator authorization', () => {
    assert.throws(() => requireOperatorAuthorization(null), /OPERATOR_UNAUTHORIZED/);
    assert.throws(() => requireOperatorAuthorization({} as any), /OPERATOR_UNAUTHORIZED/);
    assert.doesNotThrow(() => requireOperatorAuthorization(mockOperator));
  });
});
