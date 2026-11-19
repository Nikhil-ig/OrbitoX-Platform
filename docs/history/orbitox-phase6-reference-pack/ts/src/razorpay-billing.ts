/**
 * Razorpay subscription billing (reference). Pure decision logic + signature checks.
 *
 * Trust model:
 *  - Tenant, plugin and plan come from OUR BillingSubscription row (created by our server
 *    before checkout) and our BillingPlanMap. Event `notes` are never trusted for these.
 *  - Checkout success is verified with HMAC-SHA256(payment_id + "|" + OUR stored subscription_id,
 *    key_secret). Webhooks are verified with HMAC-SHA256(raw body, webhook_secret).
 *  - Events can arrive late or out of order: apply only if event.created_at > lastEventAt.
 */
import crypto from 'node:crypto';

const hexEq = (a: string, b: string) => {
  const x = Buffer.from(a, 'hex'), y = Buffer.from(b, 'hex');
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
};

export function verifyCheckoutSignature(p: {
  razorpayPaymentId: string; storedSubscriptionId: string; razorpaySignature: string; keySecret: string;
}): boolean {
  if (!p.keySecret || !/^pay_[A-Za-z0-9]+$/.test(p.razorpayPaymentId) || !/^sub_[A-Za-z0-9]+$/.test(p.storedSubscriptionId)) return false;
  if (!/^[0-9a-f]{64}$/.test(p.razorpaySignature)) return false;
  const expected = crypto.createHmac('sha256', p.keySecret).update(`${p.razorpayPaymentId}|${p.storedSubscriptionId}`).digest('hex');
  return hexEq(expected, p.razorpaySignature);
}

export function verifyWebhookSignature(rawBody: Buffer | string, signature: string | null, webhookSecret: string): boolean {
  if (!webhookSecret || !signature || !/^[0-9a-f]{64}$/.test(signature)) return false;
  return hexEq(crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex'), signature);
}

export type InstallState = 'ACTIVE' | 'READ_ONLY' | 'SUSPENDED';
export interface SubscriptionRow {
  razorpaySubscriptionId: string; tenantId: string; pluginId: string; razorpayPlanId: string;
  status: string; currentEnd: number | null; graceStartedAt: number | null; lastEventAt: number;
}
export interface GracePolicy { readOnlyAfterDays: number; suspendAfterDays: number; }   // e.g. 7 / 30

export interface Decision {
  apply: boolean;                      // false = stale/duplicate/irrelevant event
  reason: string;
  subscriptionStatus?: string;
  graceStartedAt?: number | null;      // unix seconds
  currentEnd?: number | null;
  planChangeTo?: string;               // new razorpayPlanId (must exist in BillingPlanMap)
  installation?: InstallState | { at: number; state: InstallState };   // immediate, or scheduled
}

const RELEVANT = new Set(['subscription.authenticated', 'subscription.activated', 'subscription.charged', 'subscription.pending',
  'subscription.halted', 'subscription.cancelled', 'subscription.completed', 'subscription.paused', 'subscription.resumed',
  'subscription.updated']);

/**
 * Decide what one webhook event means. `row` is OUR record; `event` is the parsed, signature-verified body.
 * Never reads tenant/plugin/plan from notes.
 */
export function decide(event: any, row: SubscriptionRow | undefined, policy: GracePolicy): Decision {
  const type: string = event?.event;
  const sub = event?.payload?.subscription?.entity;
  const createdAt: number = Number(event?.created_at);
  if (!RELEVANT.has(type)) return { apply: false, reason: 'IGNORED_EVENT_TYPE' };
  if (!sub?.id) return { apply: false, reason: 'NO_SUBSCRIPTION_ENTITY' };
  if (!row) return { apply: false, reason: 'UNKNOWN_SUBSCRIPTION' };        // not created by us: record + alert, never act
  if (sub.id !== row.razorpaySubscriptionId) return { apply: false, reason: 'SUBSCRIPTION_MISMATCH' };
  if (!Number.isInteger(createdAt) || createdAt <= row.lastEventAt) return { apply: false, reason: 'STALE_OR_DUPLICATE' };

  const base: Decision = { apply: true, reason: type, subscriptionStatus: String(sub.status ?? row.status),
    currentEnd: Number.isInteger(sub.current_end) ? sub.current_end : row.currentEnd };
  if (sub.plan_id && sub.plan_id !== row.razorpayPlanId) base.planChangeTo = sub.plan_id;   // caller must map via BillingPlanMap

  switch (type) {
    case 'subscription.authenticated':                    // mandate set up; not paid for a period yet
      return { ...base };
    case 'subscription.activated':
    case 'subscription.charged':
    case 'subscription.resumed':
      return { ...base, graceStartedAt: null, installation: 'ACTIVE' };
    case 'subscription.pending': {                        // a renewal charge failed; Razorpay retries
      const start = row.graceStartedAt ?? createdAt;
      return { ...base, graceStartedAt: start, installation: graceState(start, createdAt, policy) };
    }
    case 'subscription.halted': {                         // all retries failed
      const start = row.graceStartedAt ?? createdAt;
      const s = graceState(start, createdAt, policy);
      return { ...base, graceStartedAt: start, installation: s === 'ACTIVE' ? 'READ_ONLY' : s };
    }
    case 'subscription.paused':
      return { ...base, installation: 'READ_ONLY' };
    case 'subscription.cancelled':
    case 'subscription.completed': {                      // keep access until the paid period ends
      const end = base.currentEnd;
      return { ...base, installation: end && end > createdAt ? { at: end, state: 'SUSPENDED' } : 'SUSPENDED' };
    }
    default:
      return { ...base };                                 // subscription.updated: status mirror only
  }
}

export function graceState(graceStart: number, now: number, p: GracePolicy): InstallState {
  const days = (now - graceStart) / 86400;
  if (days >= p.suspendAfterDays) return 'SUSPENDED';
  if (days >= p.readOnlyAfterDays) return 'READ_ONLY';
  return 'ACTIVE';
}

/** Daily job: grace state must advance even if Razorpay sends nothing more. */
export function sweepGrace(rows: SubscriptionRow[], now: number, p: GracePolicy) {
  return rows.filter((r) => r.graceStartedAt != null)
    .map((r) => ({ subscriptionId: r.razorpaySubscriptionId, tenantId: r.tenantId, pluginId: r.pluginId,
                   state: graceState(r.graceStartedAt!, now, p) }))
    .filter((x) => x.state !== 'ACTIVE');
}
