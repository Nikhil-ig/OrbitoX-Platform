import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import {
  billingEnforcementState,
  decideBillingEvent,
  graceState,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  type BillingSubscriptionSnapshot,
  type RazorpayWebhookEvent,
} from '../lib/phase6-razorpay-billing';

const key = crypto.randomBytes(24).toString('hex');
const policy = { readOnlyAfterDays: 7, suspendAfterDays: 30 };
const t0 = 1_800_000_000;

function row(overrides: Partial<BillingSubscriptionSnapshot> = {}): BillingSubscriptionSnapshot {
  return {
    razorpaySubscriptionId: 'sub_A1',
    status: 'active',
    razorpayPlanId: 'plan_basic',
    currentStart: null,
    currentEnd: t0 + 30 * 86_400,
    graceStartedAt: null,
    lastEventAt: t0 - 10,
    ...overrides,
  };
}

function event(
  type: string,
  createdAt: number,
  overrides: Record<string, unknown> = {},
): RazorpayWebhookEvent {
  return {
    id: 'evt_A1',
    event: type,
    created_at: createdAt,
    payload: {
      subscription: {
        entity: {
          id: 'sub_A1',
          status: type.split('.')[1],
          plan_id: 'plan_basic',
          ...overrides,
        },
      },
    },
  };
}

describe('Phase 6 Razorpay billing signatures', () => {
  it('binds checkout signatures to the stored subscription id', () => {
    const signature = crypto
      .createHmac('sha256', key)
      .update('pay_X1|sub_A1')
      .digest('hex');
    assert.equal(verifyCheckoutSignature({
      razorpayPaymentId: 'pay_X1',
      storedSubscriptionId: 'sub_A1',
      razorpaySignature: signature,
      keySecret: key,
    }), true);
    assert.equal(verifyCheckoutSignature({
      razorpayPaymentId: 'pay_X1',
      storedSubscriptionId: 'sub_B9',
      razorpaySignature: signature,
      keySecret: key,
    }), false);
    assert.equal(verifyCheckoutSignature({
      razorpayPaymentId: 'pay_X1',
      storedSubscriptionId: 'sub_A1',
      razorpaySignature: 'invalid',
      keySecret: key,
    }), false);
  });

  it('verifies the exact raw webhook bytes', () => {
    const body = Buffer.from(JSON.stringify(event('subscription.charged', t0)));
    const signature = crypto.createHmac('sha256', key).update(body).digest('hex');
    assert.equal(verifyWebhookSignature(body, signature, key), true);
    assert.equal(verifyWebhookSignature(Buffer.concat([body, Buffer.from(' ')]), signature, key), false);
    assert.equal(verifyWebhookSignature(body, null, key), false);
  });
});

describe('Phase 6 billing event decisions', () => {
  it('ignores notes and uses the server-owned subscription snapshot', () => {
    const withNotes = event('subscription.charged', t0, {
      notes: { tenantId: 'org/attacker', planId: 'enterprise' },
    });
    const result = decideBillingEvent(withNotes, row(), policy);
    assert.equal(result.apply, true);
    assert.equal(result.installation, 'ACTIVE');
    assert.equal(result.planChangeTo, undefined);
  });

  it('ignores unknown subscriptions and mismatched subscription ids', () => {
    assert.equal(decideBillingEvent(event('subscription.activated', t0), undefined, policy).reason, 'UNKNOWN_SUBSCRIPTION');
    assert.equal(
      decideBillingEvent(event('subscription.activated', t0, { id: 'sub_other' }), row(), policy).reason,
      'SUBSCRIPTION_MISMATCH',
    );
  });

  it('ignores unsupported, stale and out-of-order events', () => {
    assert.equal(decideBillingEvent(event('payment.captured', t0), row(), policy).reason, 'IGNORED_EVENT_TYPE');
    assert.equal(decideBillingEvent(event('subscription.pending', t0 - 10), row(), policy).apply, false);
    assert.equal(decideBillingEvent(event('subscription.pending', t0 - 20), row(), policy).apply, false);
  });

  it('starts grace once and advances through ACTIVE, READ_ONLY and SUSPENDED', () => {
    const pending = decideBillingEvent(event('subscription.pending', t0), row(), policy);
    assert.equal(pending.graceStartedAt, t0);
    assert.equal(pending.installation, 'ACTIVE');
    assert.equal(graceState(t0, t0 + 6.9 * 86_400, policy), 'ACTIVE');
    assert.equal(graceState(t0, t0 + 7 * 86_400, policy), 'READ_ONLY');
    assert.equal(graceState(t0, t0 + 30 * 86_400, policy), 'SUSPENDED');
    assert.equal(
      decideBillingEvent(
        event('subscription.pending', t0 + 8 * 86_400),
        row({ graceStartedAt: t0, lastEventAt: t0 }),
        policy,
      ).graceStartedAt,
      t0,
    );
  });

  it('maps all paid, paused, halted, cancellation and completion states', () => {
    for (const type of ['subscription.activated', 'subscription.charged', 'subscription.resumed']) {
      const paid = decideBillingEvent(
        event(type, t0, { current_end: t0 + 90 }),
        row({ graceStartedAt: t0 - 100 }),
        policy,
      );
      assert.equal(paid.installation, 'ACTIVE');
      assert.equal(paid.graceStartedAt, null);
      assert.equal(paid.currentEnd, t0 + 90);
    }
    assert.equal(decideBillingEvent(event('subscription.paused', t0), row(), policy).installation, 'READ_ONLY');
    assert.equal(
      decideBillingEvent(event('subscription.halted', t0), row(), policy).installation,
      'READ_ONLY',
    );
    for (const type of ['subscription.cancelled', 'subscription.completed']) {
      assert.deepEqual(
        decideBillingEvent(event(type, t0, { current_end: t0 + 1_000 }), row(), policy).installation,
        { at: t0 + 1_000, state: 'SUSPENDED' },
      );
      assert.equal(
        decideBillingEvent(event(type, t0, { current_end: t0 - 1 }), row(), policy).installation,
        'SUSPENDED',
      );
    }
    assert.equal(
      decideBillingEvent(event('subscription.authenticated', t0), row(), policy).installation,
      undefined,
    );
  });

  it('takes plan changes from the subscription entity, never notes', () => {
    const result = decideBillingEvent(
      event('subscription.updated', t0, {
        plan_id: 'plan_new',
        notes: { planId: 'plan_forged' },
      }),
      row(),
      policy,
    );
    assert.equal(result.planChangeTo, 'plan_new');
  });

  it('rejects invalid grace policy instead of applying an unsafe transition', () => {
    assert.equal(
      decideBillingEvent(event('subscription.pending', t0), row(), {
        readOnlyAfterDays: 30,
        suspendAfterDays: 7,
      }).reason,
      'INVALID_GRACE_POLICY',
    );
  });

  it('enforces read-only and suspension deadlines at request time', () => {
    const graceStart = t0;
    const pending = { status: 'pending', currentEnd: null, graceStartedAt: graceStart };
    assert.equal(billingEnforcementState(pending, policy, t0 + 6.9 * 86_400), 'ACTIVE');
    assert.equal(billingEnforcementState(pending, policy, t0 + 7 * 86_400), 'READ_ONLY');
    assert.equal(billingEnforcementState(pending, policy, t0 + 30 * 86_400), 'SUSPENDED');
    assert.equal(
      billingEnforcementState({ ...pending, status: 'active' }, policy, t0 + 30 * 86_400),
      'ACTIVE',
    );
    assert.equal(
      billingEnforcementState({ status: 'cancelled', currentEnd: t0 + 10, graceStartedAt: null }, policy, t0),
      'ACTIVE',
    );
    assert.equal(
      billingEnforcementState({ status: 'completed', currentEnd: t0 - 1, graceStartedAt: null }, policy, t0),
      'SUSPENDED',
    );
  });
});
