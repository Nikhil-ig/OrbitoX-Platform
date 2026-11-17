import 'server-only';
import crypto from 'node:crypto';
import { prisma } from '@/server/db/prisma';

export interface PlatformWebhookDelivery {
  id: string;
  event: string;
  tenantId: string;
  timestamp: string;
  payload: Record<string, any>;
  url?: string;
  delivered?: boolean;
}

export interface OutboxDispatchTarget {
  id: string;
  eventType: string;
  tenantId: string;
  payload: Record<string, any>;
  retryCount?: number;
}

const webhookDeliveries: PlatformWebhookDelivery[] = [];

/**
 * Validates and retrieves the authoritative webhook signing secret.
 * Enforces minimum 32 characters when webhooks are configured; fails closed if absent.
 */
export function getAuthoritativeWebhookSecret(): string {
  const secret = process.env.ORBITOX_WEBHOOK_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      'ORBITOX_WEBHOOK_SECRET is required (min 32 characters) when ORBITOX_WEBHOOK_URL is configured.'
    );
  }
  return secret.trim();
}

/**
 * Authoritative dispatcher for persistent outbox messages.
 * Uses persistent outbox id as the delivery and event id for receiver-side deduplication.
 */
export async function dispatchOutboxMessage(
  message: OutboxDispatchTarget
): Promise<PlatformWebhookDelivery> {
  const delivery: PlatformWebhookDelivery = {
    id: message.id,
    event: message.eventType,
    tenantId: message.tenantId,
    timestamp: new Date().toISOString(),
    payload: message.payload,
    delivered: false,
  };

  const webhookUrl = process.env.ORBITOX_WEBHOOK_URL;
  let dispatchError: string | null = null;

  if (webhookUrl) {
    delivery.url = webhookUrl;
    // Fail-closed validation: require valid secret >= 32 chars
    const secret = getAuthoritativeWebhookSecret();
    const body = JSON.stringify(delivery);
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-orbitox-delivery-id': message.id,
          'x-orbitox-event-id': message.id,
          'x-orbitox-event': message.eventType,
          'x-orbitox-signature': signature,
          'x-orbitox-timestamp': delivery.timestamp,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        delivery.delivered = true;
      } else {
        dispatchError = `HTTP ${res.status}: ${res.statusText}`;
      }
    } catch (err: any) {
      dispatchError = err?.message || String(err);
      console.warn(`[WebhookEmitter] Failed to deliver webhook to ${webhookUrl}:`, dispatchError);
    }
  } else {
    // Local / test mode with no remote webhook URL: deliver immediately
    delivery.delivered = true;
  }

  // Update persistent outbox record in PostgreSQL if using Prisma
  if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'prisma' && message.id && !message.id.startsWith('whk_')) {
    try {
      await (prisma as any).$transaction(async (tx: any) => {
        await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${message.tenantId}, true)`;
        if (delivery.delivered) {
          await tx.platformOutboxMessage.update({
            where: { id: message.id },
            data: {
              status: 'DISPATCHED',
              dispatchedAt: new Date(),
            },
          });
        } else {
          const current = await tx.platformOutboxMessage.findUnique({
            where: { id: message.id },
          });
          const nextRetry = (current?.retryCount ?? message.retryCount ?? 0) + 1;
          const nextStatus = nextRetry >= 5 ? 'FAILED' : 'PENDING';
          await tx.platformOutboxMessage.update({
            where: { id: message.id },
            data: {
              status: nextStatus,
              retryCount: nextRetry,
              lastError: dispatchError || 'Webhook delivery failed',
            },
          });
        }
      });
    } catch (err: any) {
      console.warn(`[WebhookEmitter] Failed to persist outbox dispatch state for ${message.id}:`, err?.message || err);
    }
  }

  webhookDeliveries.push(delivery);
  return delivery;
}

/**
 * Crash recovery & sweep worker: dispatches pending outbox messages.
 */
export async function dispatchPendingOutboxMessages(
  options: { limit?: number; tenantId?: string } = {}
): Promise<number> {
  if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'prisma') {
    return 0;
  }
  const limit = options.limit ?? 50;

  try {
    let pendingMessages: any[] = [];
    if (options.tenantId) {
      await (prisma as any).$transaction(async (tx: any) => {
        await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${options.tenantId}, true)`;
        pendingMessages = await tx.platformOutboxMessage.findMany({
          where: {
            tenantId: options.tenantId,
            status: 'PENDING',
            retryCount: { lt: 5 },
          },
          orderBy: { createdAt: 'asc' },
          take: limit,
        });
      });
    } else {
      pendingMessages = await (prisma as any).$queryRaw<any[]>`
        SELECT id, "tenantId", "eventType", "aggregateType", "aggregateId", payload, status, "retryCount", "createdAt"
        FROM "PlatformOutboxMessage"
        WHERE status = 'PENDING' AND "retryCount" < 5
        ORDER BY "createdAt" ASC
        LIMIT ${limit}
      `.catch(() => []);
    }

    let dispatchedCount = 0;
    for (const msg of pendingMessages) {
      const payload = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
      await dispatchOutboxMessage({
        id: msg.id,
        eventType: msg.eventType,
        tenantId: msg.tenantId,
        payload,
        retryCount: msg.retryCount,
      });
      dispatchedCount++;
    }
    return dispatchedCount;
  } catch (err: any) {
    console.error('[WebhookEmitter] dispatchPendingOutboxMessages failed:', err?.message || err);
    return 0;
  }
}

/**
 * Backwards-compatible emission facade.
 */
export async function emitPlatformWebhook(params: {
  event: string;
  tenantId: string;
  payload: Record<string, any>;
  outboxId?: string;
}): Promise<PlatformWebhookDelivery> {
  const outboxId = params.outboxId || `whk_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  return dispatchOutboxMessage({
    id: outboxId,
    eventType: params.event,
    tenantId: params.tenantId,
    payload: params.payload,
  });
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
