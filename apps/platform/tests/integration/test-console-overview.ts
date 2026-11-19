import assert from 'node:assert/strict';
import {
  getOverviewSummary,
  getOverviewTelemetry,
  getOverviewAlerts,
  requireOperatorAuthorization,
  type OverviewSummary,
  type OverviewTelemetry,
  type OverviewAlerts,
} from '@/server/overview/overview-service';
import type { OperatorSessionContext } from '@/server/accounts/account-service';

async function run() {
  console.log('--- Step C1: Testing Console Overview Server Service (A1) ---');

  const mockOperator: OperatorSessionContext = {
    id: 'session_test_op1',
    operatorId: 'op_test_123',
    email: 'operator@orbitox.io',
    role: 'PLATFORM_OWNER',
    csrfTokenHash: 'mock_csrf_hash',
    reauthenticatedAt: new Date(),
  };

  // 1. Direct Server Action / Service Execution (Rule 4.11 MCP-ready)
  const summary: OverviewSummary = await getOverviewSummary(mockOperator);
  assert.ok(summary.monthlyArr, 'Expected monthlyArr to be populated');
  assert.ok(summary.activeTenants >= 1, 'Expected activeTenants to be >= 1');
  assert.ok(summary.totalOrganizations >= 1, 'Expected totalOrganizations to be >= 1');
  assert.equal(typeof summary.p95LatencyMs, 'number');
  assert.equal(typeof summary.p99LatencyMs, 'number');
  assert.ok(['healthy', 'degraded', 'warning'].includes(summary.clusterStatus));
  console.log('PASS  getOverviewSummary() returned valid master cluster telemetry');

  const telemetry: OverviewTelemetry = await getOverviewTelemetry(mockOperator);
  assert.ok(Array.isArray(telemetry.dailyThroughput), 'Expected dailyThroughput array');
  assert.equal(telemetry.dailyThroughput.length, 7, 'Expected 7-day throughput telemetry');
  assert.ok(Array.isArray(telemetry.latencyTrend), 'Expected latencyTrend array');
  assert.equal(telemetry.latencyTrend.length, 7, 'Expected 7-interval latency trend');
  assert.ok(telemetry.dailyThroughput.some((d) => d.isSelected), 'Expected selected current day in throughput');
  console.log('PASS  getOverviewTelemetry() returned valid time-series data');

  const alerts: OverviewAlerts = await getOverviewAlerts(mockOperator);
  assert.ok(Array.isArray(alerts.auditFeed), 'Expected auditFeed array');
  assert.ok(alerts.auditFeed.length > 0, 'Expected non-empty auditFeed');
  assert.ok(Array.isArray(alerts.tenantsRequiringAttention), 'Expected tenantsRequiringAttention array');
  assert.ok(alerts.tenantsRequiringAttention.length > 0, 'Expected highlighted tenants');
  assert.ok(alerts.tenantsRequiringAttention.some((t) => t.highlighted), 'Expected at least one highlighted tenant');
  console.log('PASS  getOverviewAlerts() returned valid audit feed and attention tenants');

  // 2. Authorization Guard Verification
  assert.throws(
    () => requireOperatorAuthorization(null),
    /OPERATOR_UNAUTHORIZED/,
    'Expected requireOperatorAuthorization(null) to throw OPERATOR_UNAUTHORIZED',
  );
  assert.throws(
    () => requireOperatorAuthorization({} as any),
    /OPERATOR_UNAUTHORIZED/,
    'Expected requireOperatorAuthorization({}) to throw OPERATOR_UNAUTHORIZED',
  );
  assert.doesNotThrow(
    () => requireOperatorAuthorization(mockOperator),
    'Expected valid operator to pass authorization check',
  );
  console.log('PASS  requireOperatorAuthorization() enforces operator identity');

  console.log('\n--- Step C1: All Console Overview Service Tests Passed ---');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
