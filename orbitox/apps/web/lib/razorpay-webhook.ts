import * as crypto from 'crypto';

export interface WebhookEventRecord {
  eventId: string;
  processedAt: string;
  payload: any;
}

export const webhookLedger = new Map<string, WebhookEventRecord>();

export function verifyRazorpaySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}
