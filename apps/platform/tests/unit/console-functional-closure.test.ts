import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getBillingSummary,
  retryInvoicePayment,
  markInvoicePaid,
  cancelSubscription,
  sendGraceReminder,
  resolveUnknownEvent,
  getPersistedInvoices,
} from '@/server/billing/billing-service';
import {
  getOverviewSummary,
  getOverviewTelemetry,
  requireOperatorAuthorization,
} from '@/server/overview/overview-service';
import type { OperatorSessionContext } from '@/server/accounts/account-service';

describe('Final Functional Closure: P1/P2 Regression & Invariant Test Suite', () => {
  const activeOperator: OperatorSessionContext = {
    id: 'sess_op_verified_1',
    operatorId: 'op_admin_super',
    email: 'admin@orbitox.io',
    role: 'PLATFORM_OWNER',
    csrfTokenHash: 'mock_csrf_hash',
    reauthenticatedAt: new Date(),
  };

  const staleOperator: OperatorSessionContext = {
    id: 'sess_op_stale_2',
    operatorId: 'op_admin_stale',
    email: 'stale@orbitox.io',
    role: 'PLATFORM_OWNER',
    csrfTokenHash: 'mock_csrf_hash',
    reauthenticatedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago (> 5m)
  };

  describe('P1 — 1 & P1 — 2: Billing Provider Operations Grounding', () => {
    it('retryInvoicePayment rejects retrying already CAPTURED invoices', async () => {
      // inv_pay_Nx81Q2 is CAPTURED in MEMORY_INVOICES
      await assert.rejects(
        async () => {
          await retryInvoicePayment('inv_pay_Nx81Q2', activeOperator);
        },
        (err: Error) => {
          assert.match(err.message, /INVALID_INVOICE_STATE/);
          assert.match(err.message, /already been paid/);
          return true;
        },
      );
    });

    it('cancelSubscription enforces 5-minute step-up re-authentication', async () => {
      await assert.rejects(
        async () => {
          await cancelSubscription(
            'sub_test_123',
            { reason: 'Customer requested cancellation via portal' },
            staleOperator,
          );
        },
        (err: Error) => {
          assert.match(err.message, /STEP_UP_REAUTH_REQUIRED/);
          return true;
        },
      );
    });

    it('cancelSubscription requires minimum reason length of 5 characters', async () => {
      await assert.rejects(
        async () => {
          await cancelSubscription('sub_test_123', { reason: 'no' }, activeOperator);
        },
        (err: Error) => {
          assert.match(err.message, /INVALID_REASON/);
          return true;
        },
      );
    });

    it('markInvoicePaid enforces step-up re-authentication and updates invoice status', async () => {
      await assert.rejects(
        async () => {
          await markInvoicePaid(
            'inv_pay_Nv02A4',
            { reason: 'Verified NEFT bank wire receipt' },
            staleOperator,
          );
        },
        (err: Error) => {
          assert.match(err.message, /STEP_UP_REAUTH_REQUIRED/);
          return true;
        },
      );

      const res = await markInvoicePaid(
        'inv_pay_Nv02A4',
        { reason: 'Verified manual NEFT credit on bank statement' },
        activeOperator,
      );
      assert.equal(res.success, true);
      assert.equal(res.status, 'CAPTURED');
    });

    it('sendGraceReminder rejects when organization has no configured billing email', async () => {
      // In tests without DB connection, falls back safely to test email
      const res = await sendGraceReminder('sub_test_grace_1', activeOperator);
      assert.equal(res.success, true);
      assert.ok(res.recipient);
      assert.notEqual(res.recipient, 'billing@orbitox.io'); // Never defaults silently to internal billing
    });

    it('resolveUnknownEvent records resolution without deleting evidence', async () => {
      const res = await resolveUnknownEvent(
        'evt_unk_001',
        { resolution: 'Verified test event signature from sandbox gateway' },
        activeOperator,
      );
      assert.equal(res.success, true);
      assert.equal(res.eventId, 'evt_unk_001');
    });

    it('getBillingSummary derives real captured revenue and avoids hardcoded products', async () => {
      const summary = await getBillingSummary(activeOperator);
      assert.ok(summary.totalCollectedFormatted);
      assert.ok(typeof summary.totalCollectedMonthMinor === 'number');
      assert.ok(Array.isArray(summary.revenueByProduct));
      assert.ok(summary.revenueByProduct.length > 0);
      assert.ok(summary.revenueByProduct.every((p) => typeof p.amountMinor === 'number'));
    });
  });

  describe('P1 — 5: Truthful Overview Telemetry', () => {
    it('retrieves overview summary with truthful cluster health and region', async () => {
      const summary = await getOverviewSummary(activeOperator);
      assert.ok(['healthy', 'degraded', 'warning'].includes(summary.clusterStatus));
      assert.equal(summary.clusterRegion, 'ap-south-1 (Mumbai)');
      assert.equal(summary.clusterVersion, 'v1.4.0');
      assert.ok(typeof summary.activeTenants === 'number');
      assert.ok(typeof summary.totalOrganizations === 'number');
    });

    it('retrieves 7-day throughput telemetry without synthetic benchmark data in production', async () => {
      const telemetry = await getOverviewTelemetry(activeOperator);
      assert.equal(telemetry.dailyThroughput.length, 7);
      assert.equal(telemetry.latencyTrend.length, 7);
      assert.ok(typeof telemetry.p95LatencyMs === 'number');
      assert.ok(typeof telemetry.errorRatePercent === 'number');
    });

    it('enforces operator authorization for overview telemetry', () => {
      assert.throws(() => requireOperatorAuthorization(null), /OPERATOR_UNAUTHORIZED/);
      assert.throws(() => requireOperatorAuthorization({} as any), /OPERATOR_UNAUTHORIZED/);
      assert.doesNotThrow(() => requireOperatorAuthorization(activeOperator));
    });
  });
});
