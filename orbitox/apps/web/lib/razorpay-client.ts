import crypto from 'node:crypto';

export interface RazorpaySubscription {
  id: string;
  status: string;
  plan_id: string;
  current_start?: number;
  current_end?: number;
  cancel_at_cycle_end?: boolean;
}

export interface RazorpayInvoice {
  id: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  status: string;
  short_url?: string;
  issued_at?: number;
  paid_at?: number;
}

export interface RazorpayPayment {
  id: string;
  invoice_id?: string;
  amount: number;
  currency: string;
  status: string;
  created_at?: number;
}

export function getRazorpayPublicKeyId(): string {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  if (!keyId || !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId)) {
    throw new Error('RAZORPAY_KEY_ID is not configured with a valid Razorpay key id.');
  }
  return keyId;
}

export function verifyCheckoutSignature(input: {
  razorpayPaymentId: string;
  storedSubscriptionId: string;
  razorpaySignature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (
    !secret ||
    !/^pay_[A-Za-z0-9]+$/.test(input.razorpayPaymentId) ||
    !/^sub_[A-Za-z0-9]+$/.test(input.storedSubscriptionId) ||
    !/^[0-9a-f]{64}$/.test(input.razorpaySignature)
  ) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${input.razorpayPaymentId}|${input.storedSubscriptionId}`)
    .digest();
  const actual = Buffer.from(input.razorpaySignature, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export async function createRazorpaySubscription(input: {
  razorpayPlanId: string;
  idempotencyKey: string;
  notes: Record<string, string>;
}): Promise<RazorpaySubscription> {
  const response = await razorpayRequest<RazorpaySubscription>('/subscriptions', {
    method: 'POST',
    idempotencyKey: input.idempotencyKey,
    body: {
      plan_id: input.razorpayPlanId,
      total_count: 120,
      quantity: 1,
      customer_notify: 1,
      notes: input.notes,
    },
  });
  if (!/^sub_[A-Za-z0-9]+$/.test(response.id) || response.plan_id !== input.razorpayPlanId) {
    throw new Error('Razorpay returned an invalid subscription response.');
  }
  return response;
}

export async function cancelRazorpaySubscription(
  subscriptionId: string,
  idempotencyKey: string,
): Promise<RazorpaySubscription> {
  return razorpayRequest<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: 'POST',
    idempotencyKey,
    body: { cancel_at_cycle_end: 1 },
  });
}

export async function updateRazorpaySubscription(input: {
  subscriptionId: string;
  razorpayPlanId: string;
  idempotencyKey: string;
}): Promise<RazorpaySubscription> {
  return razorpayRequest<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(input.subscriptionId)}`, {
    method: 'PATCH',
    idempotencyKey: input.idempotencyKey,
    body: {
      plan_id: input.razorpayPlanId,
      schedule_change_at: 'now',
      customer_notify: 1,
    },
  });
}

export async function changePlan(
  subscription: Pick<RazorpaySubscription, 'id'>,
  newPlanId: string,
  idempotencyKey: string,
): Promise<RazorpaySubscription> {
  return updateRazorpaySubscription({
    subscriptionId: subscription.id,
    razorpayPlanId: newPlanId,
    idempotencyKey,
  });
}

export async function listRazorpayInvoices(subscriptionId: string): Promise<RazorpayInvoice[]> {
  const body = await razorpayRequest<{ items: RazorpayInvoice[] }>(
    `/invoices?subscription_id=${encodeURIComponent(subscriptionId)}&count=100`,
  );
  return Array.isArray(body.items) ? body.items : [];
}

export async function listRazorpayPayments(subscriptionId: string): Promise<RazorpayPayment[]> {
  const body = await razorpayRequest<{ items: RazorpayPayment[] }>(
    `/payments?subscription_id=${encodeURIComponent(subscriptionId)}&count=100`,
  );
  return Array.isArray(body.items) ? body.items : [];
}

async function razorpayRequest<T>(
  path: string,
  input: {
    method?: 'GET' | 'POST' | 'PATCH';
    body?: Record<string, unknown>;
    idempotencyKey?: string;
  } = {},
): Promise<T> {
  const keyId = getRazorpayPublicKeyId();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keySecret) throw new Error('RAZORPAY_KEY_SECRET is not configured.');
  const headers: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
    Accept: 'application/json',
  };
  if (input.body) headers['Content-Type'] = 'application/json';
  if (input.idempotencyKey) headers['X-Idempotency-Key'] = input.idempotencyKey;

  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: input.method || 'GET',
    headers,
    ...(input.body ? { body: JSON.stringify(input.body) } : {}),
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const description = isRecord(body) && isRecord(body.error) &&
      typeof body.error.description === 'string'
      ? body.error.description
      : 'Razorpay request failed.';
    throw new Error(`Razorpay request failed with status ${response.status}: ${description}`);
  }
  if (!isRecord(body)) throw new Error('Razorpay returned an invalid response body.');
  return body as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
