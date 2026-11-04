import crypto from 'node:crypto';

export type InstallationState = 'ACTIVE' | 'READ_ONLY' | 'SUSPENDED';

export interface BillingSubscriptionSnapshot {
  razorpaySubscriptionId: string;
  status: string;
  razorpayPlanId: string;
  currentStart: number | null;
  currentEnd: number | null;
  graceStartedAt: number | null;
  lastEventAt: number;
}

export interface GracePolicy {
  readOnlyAfterDays: number;
  suspendAfterDays: number;
}

export interface BillingEnforcementSnapshot {
  status: string;
  currentEnd: number | null;
  graceStartedAt: number | null;
}

export interface BillingDecision {
  apply: boolean;
  reason: string;
  subscriptionStatus?: string;
  graceStartedAt?: number | null;
  currentStart?: number | null;
  currentEnd?: number | null;
  planChangeTo?: string;
  installation?: InstallationState | { at: number; state: InstallationState };
}

interface RazorpaySubscriptionEntity {
  id?: string;
  status?: string;
  plan_id?: string;
  current_start?: number;
  current_end?: number;
}

export interface RazorpayWebhookEvent {
  id?: string;
  event?: string;
  created_at?: number;
  payload?: {
    subscription?: { entity?: RazorpaySubscriptionEntity };
    payment?: { entity?: { id?: string; subscription_id?: string } };
  };
}

const relevantEvents = new Set([
  'subscription.authenticated',
  'subscription.activated',
  'subscription.charged',
  'subscription.pending',
  'subscription.halted',
  'subscription.cancelled',
  'subscription.completed',
  'subscription.paused',
  'subscription.resumed',
  'subscription.updated',
]);

export function verifyCheckoutSignature(input: {
  razorpayPaymentId: string;
  storedSubscriptionId: string;
  razorpaySignature: string;
  keySecret: string;
}): boolean {
  if (
    !input.keySecret ||
    !/^pay_[A-Za-z0-9]+$/.test(input.razorpayPaymentId) ||
    !/^sub_[A-Za-z0-9]+$/.test(input.storedSubscriptionId) ||
    !/^[0-9a-f]{64}$/.test(input.razorpaySignature)
  ) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', input.keySecret)
    .update(`${input.razorpayPaymentId}|${input.storedSubscriptionId}`)
    .digest();
  return timingSafeHexEqual(expected, input.razorpaySignature);
}

export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string | null,
  secret: string,
): boolean {
  if (!secret || !signature || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  return timingSafeHexEqual(expected, signature);
}

export function decideBillingEvent(
  event: RazorpayWebhookEvent,
  row: BillingSubscriptionSnapshot | undefined,
  policy: GracePolicy,
): BillingDecision {
  const type = event.event;
  const sub = event.payload?.subscription?.entity;
  const createdAt = Number(event.created_at);
  if (!type || !relevantEvents.has(type)) return { apply: false, reason: 'IGNORED_EVENT_TYPE' };
  if (!sub?.id) return { apply: false, reason: 'NO_SUBSCRIPTION_ENTITY' };
  if (!row) return { apply: false, reason: 'UNKNOWN_SUBSCRIPTION' };
  if (sub.id !== row.razorpaySubscriptionId) return { apply: false, reason: 'SUBSCRIPTION_MISMATCH' };
  if (!Number.isSafeInteger(createdAt) || createdAt <= row.lastEventAt) {
    return { apply: false, reason: 'STALE_OR_DUPLICATE' };
  }
  if (
    !Number.isFinite(policy.readOnlyAfterDays) ||
    !Number.isFinite(policy.suspendAfterDays) ||
    policy.readOnlyAfterDays < 0 ||
    policy.suspendAfterDays < policy.readOnlyAfterDays
  ) {
    return { apply: false, reason: 'INVALID_GRACE_POLICY' };
  }

  const decision: BillingDecision = {
    apply: true,
    reason: type,
    subscriptionStatus: typeof sub.status === 'string' ? sub.status : row.status,
    currentStart: Number.isSafeInteger(sub.current_start) ? sub.current_start! : row.currentStart,
    currentEnd: Number.isSafeInteger(sub.current_end) ? sub.current_end! : row.currentEnd,
  };
  if (sub.plan_id && sub.plan_id !== row.razorpayPlanId) decision.planChangeTo = sub.plan_id;

  switch (type) {
    case 'subscription.activated':
    case 'subscription.charged':
    case 'subscription.resumed':
      return { ...decision, graceStartedAt: null, installation: 'ACTIVE' };
    case 'subscription.pending': {
      const start = row.graceStartedAt ?? createdAt;
      return {
        ...decision,
        graceStartedAt: start,
        installation: graceState(start, createdAt, policy),
      };
    }
    case 'subscription.halted': {
      const start = row.graceStartedAt ?? createdAt;
      const state = graceState(start, createdAt, policy);
      return {
        ...decision,
        graceStartedAt: start,
        installation: state === 'ACTIVE' ? 'READ_ONLY' : state,
      };
    }
    case 'subscription.paused':
      return { ...decision, installation: 'READ_ONLY' };
    case 'subscription.cancelled':
    case 'subscription.completed': {
      const currentEnd = decision.currentEnd;
      return {
        ...decision,
        installation: currentEnd && currentEnd > createdAt
          ? { at: currentEnd, state: 'SUSPENDED' }
          : 'SUSPENDED',
      };
    }
    default:
      return decision;
  }
}

export function graceState(
  graceStart: number,
  now: number,
  policy: GracePolicy,
): InstallationState {
  const elapsedDays = (now - graceStart) / 86_400;
  if (elapsedDays >= policy.suspendAfterDays) return 'SUSPENDED';
  if (elapsedDays >= policy.readOnlyAfterDays) return 'READ_ONLY';
  return 'ACTIVE';
}

export function billingEnforcementState(
  subscription: BillingEnforcementSnapshot,
  policy: GracePolicy,
  now: number,
): InstallationState {
  const status = subscription.status.toLowerCase();
  if (status === 'active' || status === 'authenticated') return 'ACTIVE';
  if (status === 'cancelled' || status === 'completed') {
    return subscription.currentEnd !== null && subscription.currentEnd <= now
      ? 'SUSPENDED'
      : 'ACTIVE';
  }
  if (status === 'paused') return 'READ_ONLY';
  if (status === 'halted') {
    if (subscription.graceStartedAt === null) return 'READ_ONLY';
    const state = graceState(subscription.graceStartedAt, now, policy);
    return state === 'ACTIVE' ? 'READ_ONLY' : state;
  }
  if (status === 'pending') {
    return subscription.graceStartedAt === null
      ? 'SUSPENDED'
      : graceState(subscription.graceStartedAt, now, policy);
  }
  return 'SUSPENDED';
}

function timingSafeHexEqual(expected: Buffer, actualHex: string): boolean {
  const actual = Buffer.from(actualHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(expected, actual);
}
