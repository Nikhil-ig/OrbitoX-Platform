import 'server-only';
import crypto from 'node:crypto';

export interface PlatformWebhookDelivery {
  id: string;
  event: string;
  tenantId: string;
  timestamp: string;
  payload: Record<string, any>;
  url?: string;
  delivered?: boolean;
}

const webhookDeliveries: PlatformWebhookDelivery[] = [];

export async function emitPlatformWebhook(params: {
  event: string;
  tenantId: string;
  payload: Record<string, any>;
}): Promise<PlatformWebhookDelivery> {
  const delivery: PlatformWebhookDelivery = {
    id: `whk_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
    event: params.event,
    tenantId: params.tenantId,
    timestamp: new Date().toISOString(),
    payload: params.payload,
    delivered: false,
  };

  const webhookUrl = process.env.ORBITOX_WEBHOOK_URL;
  if (webhookUrl) {
    delivery.url = webhookUrl;
    try {
      const body = JSON.stringify(delivery);
      const secret = process.env.ORBITOX_WEBHOOK_SECRET || 'orbitox_webhook_default_secret';
      const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-orbitox-event': params.event,
          'x-orbitox-signature': signature,
          'x-orbitox-timestamp': delivery.timestamp,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });
      delivery.delivered = res.ok;
    } catch (err: any) {
      console.warn(`[WebhookEmitter] Failed to deliver webhook to ${webhookUrl}:`, err?.message || err);
      delivery.delivered = false;
    }
  }

  webhookDeliveries.push(delivery);
  return delivery;
}

export function getEmittedWebhooks(filter?: { tenantId?: string; event?: string }): PlatformWebhookDelivery[] {
  return webhookDeliveries.filter((d) => {
    if (filter?.tenantId && d.tenantId !== filter.tenantId) return false;
    if (filter?.event && d.event !== filter.event) return false;
    return true;
  });
}

export function clearEmittedWebhooks(): void {
  webhookDeliveries.length = 0;
}
