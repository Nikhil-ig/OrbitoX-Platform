import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyCheckoutSignature, verifyWebhookSignature, decide, graceState, sweepGrace, SubscriptionRow } from '../src/razorpay-billing';
import { newToken, hashToken, buildLink, uniformResponse } from '../src/account-tokens';

const KEY = crypto.randomBytes(24).toString('hex');
const P = { readOnlyAfterDays: 7, suspendAfterDays: 30 };
const T0 = 1_800_000_000;
const row = (o: Partial<SubscriptionRow> = {}): SubscriptionRow => ({
  razorpaySubscriptionId: 'sub_A1', tenantId: 'org/o1/project/p1/environment/e1', pluginId: '@orbitox/hms',
  razorpayPlanId: 'plan_HmsStart1', status: 'active', currentEnd: T0 + 30 * 86400, graceStartedAt: null, lastEventAt: T0 - 10, ...o });
const ev = (type: string, created: number, sub: any = {}) => ({
  event: type, created_at: created,
  payload: { subscription: { entity: { id: 'sub_A1', status: type.split('.')[1], plan_id: 'plan_HmsStart1',
    notes: { tenantId: 'org/attacker/project/x/environment/y', planId: 'hms-enterprise' }, ...sub } } } });

describe('checkout + webhook signatures', () => {
  it('checkout signature uses OUR stored subscription id', () => {
    const sig = crypto.createHmac('sha256', KEY).update('pay_X1|sub_A1').digest('hex');
    assert.equal(verifyCheckoutSignature({ razorpayPaymentId: 'pay_X1', storedSubscriptionId: 'sub_A1', razorpaySignature: sig, keySecret: KEY }), true);
    assert.equal(verifyCheckoutSignature({ razorpayPaymentId: 'pay_X1', storedSubscriptionId: 'sub_B9', razorpaySignature: sig, keySecret: KEY }), false, 'signature for another subscription');
    assert.equal(verifyCheckoutSignature({ razorpayPaymentId: 'pay_X2', storedSubscriptionId: 'sub_A1', razorpaySignature: sig, keySecret: KEY }), false);
    assert.equal(verifyCheckoutSignature({ razorpayPaymentId: 'pay_X1', storedSubscriptionId: 'sub_A1', razorpaySignature: sig, keySecret: '' }), false, 'no secret = refuse');
    assert.equal(verifyCheckoutSignature({ razorpayPaymentId: 'pay_X1', storedSubscriptionId: 'sub_A1', razorpaySignature: 'zz', keySecret: KEY }), false);
  });
  it('webhook signature over the raw body; any byte change fails', () => {
    const body = JSON.stringify(ev('subscription.charged', T0));
    const sig = crypto.createHmac('sha256', KEY).update(body).digest('hex');
    assert.equal(verifyWebhookSignature(body, sig, KEY), true);
    assert.equal(verifyWebhookSignature(body + ' ', sig, KEY), false);
    assert.equal(verifyWebhookSignature(body, sig, ''), false);
    assert.equal(verifyWebhookSignature(body, null, KEY), false);
  });
});

describe('webhook decisions', () => {
  it('never trusts notes: tenant/plan come from our row; notes naming another tenant/plan change nothing', () => {
    const d = decide(ev('subscription.charged', T0), row(), P);
    assert.equal(d.apply, true); assert.equal(d.installation, 'ACTIVE'); assert.equal(d.planChangeTo, undefined);
  });
  it('unknown subscription (not created by us) is never acted on', () => {
    assert.deepEqual(decide(ev('subscription.activated', T0), undefined, P), { apply: false, reason: 'UNKNOWN_SUBSCRIPTION' });
  });
  it('stale or duplicate events are ignored (out-of-order delivery)', () => {
    assert.equal(decide(ev('subscription.pending', T0 - 10), row(), P).reason, 'STALE_OR_DUPLICATE');
    assert.equal(decide(ev('subscription.pending', T0 - 20), row(), P).apply, false);
  });
  it('pending starts grace; stays ACTIVE until day 7, READ_ONLY to day 30, then SUSPENDED', () => {
    const d = decide(ev('subscription.pending', T0), row(), P);
    assert.equal(d.graceStartedAt, T0); assert.equal(d.installation, 'ACTIVE');
    assert.equal(graceState(T0, T0 + 6.9 * 86400, P), 'ACTIVE');
    assert.equal(graceState(T0, T0 + 7 * 86400, P), 'READ_ONLY');
    assert.equal(graceState(T0, T0 + 30 * 86400, P), 'SUSPENDED');
  });
  it('repeated pending keeps the ORIGINAL grace start (retries cannot extend grace)', () => {
    const d = decide(ev('subscription.pending', T0 + 5 * 86400), row({ graceStartedAt: T0, lastEventAt: T0 }), P);
    assert.equal(d.graceStartedAt, T0);
  });
  it('halted is at least READ_ONLY; payment clears grace', () => {
    assert.equal(decide(ev('subscription.halted', T0 + 86400), row({ graceStartedAt: T0, lastEventAt: T0 }), P).installation, 'READ_ONLY');
    const paid = decide(ev('subscription.charged', T0 + 2 * 86400), row({ graceStartedAt: T0, lastEventAt: T0 + 86400 }), P);
    assert.equal(paid.graceStartedAt, null); assert.equal(paid.installation, 'ACTIVE');
  });
  it('cancel keeps access until the paid period ends, then suspends', () => {
    const d = decide(ev('subscription.cancelled', T0, { current_end: T0 + 10 * 86400 }), row(), P);
    assert.deepEqual(d.installation, { at: T0 + 10 * 86400, state: 'SUSPENDED' });
    const late = decide(ev('subscription.cancelled', T0, { current_end: T0 - 1 }), row(), P);
    assert.equal(late.installation, 'SUSPENDED');
  });
  it('plan change is surfaced from the subscription entity (to be mapped via BillingPlanMap), not from notes', () => {
    const d = decide(ev('subscription.updated', T0, { plan_id: 'plan_HmsPro01' }), row(), P);
    assert.equal(d.planChangeTo, 'plan_HmsPro01');
  });
  it('daily sweep advances grace without new events', () => {
    const out = sweepGrace([row({ graceStartedAt: T0 }), row({ razorpaySubscriptionId: 'sub_B', graceStartedAt: null })], T0 + 31 * 86400, P);
    assert.deepEqual(out.map((x) => x.state), ['SUSPENDED']);
  });
  it('irrelevant event types are ignored', () => {
    assert.equal(decide({ event: 'payment.captured', created_at: T0, payload: {} }, row(), P).reason, 'IGNORED_EVENT_TYPE');
  });
});

describe('account tokens', () => {
  it('256-bit, hashed, purpose TTLs', () => {
    const t = newToken('RESET_PASSWORD', 0);
    assert.equal(Buffer.from(t.token, 'base64url').length, 32);
    assert.equal(t.tokenHash, hashToken(t.token));
    assert.equal(t.expiresAt.getTime(), 30 * 60 * 1000);
    assert.notEqual(newToken('INVITE').token, newToken('INVITE').token);
    assert.throws(() => hashToken('short'));
  });
  it('links use https and keep the token in the fragment', () => {
    const l = buildLink('https://app.orbitox.io', '/reset', 'A'.repeat(43));
    assert.match(l, /^https:\/\/app\.orbitox\.io\/reset#token=A{43}$/);
    assert.throws(() => buildLink('http://evil.example', '/reset', 'A'.repeat(43)));
  });
  it('uniform response hides whether the email exists', () => {
    assert.deepEqual(uniformResponse(), uniformResponse());
    assert.equal(uniformResponse().status, 202);
  });
});
