import 'server-only';
import crypto from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';
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
  maxAttempts?: number;
}

export interface ClaimedOutboxMessage {
  id: string;
  tenantId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, any>;
  retryCount: number;
  maxAttempts: number;
  claimOwner: string;
  claimExpiresAt: Date;
}

interface MemoryOutboxItem {
  id: string;
  tenantId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'PROCESSING' | 'DISPATCHED' | 'FAILED';
  retryCount: number;
  maxAttempts: number;
  lastError?: string;
  claimOwner?: string;
  claimExpiresAt?: number;
  nextAttemptAt?: number;
  deduplicationKey?: string;
  createdAt: number;
  updatedAt: number;
  dispatchedAt?: string;
}

const memoryOutboxStore = new Map<string, MemoryOutboxItem>();
const webhookDeliveries: PlatformWebhookDelivery[] = [];

export const CUSTOMER_WEBHOOK_EVENT_TYPES = [
  'tenant.ready',
  'entitlement.updated',
  'entitlement.test',
] as const;

export const MCP_AUDIT_OUTBOX_EVENT_TYPES = [
  'mcp.audit.approval_proposed',
  'mcp.audit.execution_intent',
] as const;

export function isCustomerWebhookEventType(eventType: string): boolean {
  return (CUSTOMER_WEBHOOK_EVENT_TYPES as readonly string[]).includes(eventType);
}

export function isMcpAuditOutboxEventType(eventType: string): boolean {
  return (MCP_AUDIT_OUTBOX_EVENT_TYPES as readonly string[]).includes(eventType);
}

let relayClient: PrismaClient | null = null;
function getOutboxDbClient(): PrismaClient {
  const relayUrl = process.env.OUTBOX_RELAY_DATABASE_URL;
  if (relayUrl) {
    if (!relayClient) {
      relayClient = new PrismaClient({ datasources: { db: { url: relayUrl } } });
    }
    return relayClient;
  }
  return prisma;
}

/**
 * Calculates exponential backoff with random jitter.
 * delay = min(maxDelayMs, baseDelayMs * 2^(retryCount - 1)) + random(0, jitterMs)
 */
export function calculateBackoff(
  retryCount: number,
  baseDelayMs = 1000,
  maxDelayMs = 300000,
  jitterMs = 250
): number {
  const exponent = Math.max(0, retryCount - 1);
  const exponential = baseDelayMs * Math.pow(2, exponent);
  const capped = Math.min(maxDelayMs, exponential);
  const jitter = Math.floor(Math.random() * (jitterMs + 1));
  return capped + jitter;
}

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
 * Atomically claims pending or expired-lease outbox messages for a worker.
 * Uses PostgreSQL CTE with FOR UPDATE SKIP LOCKED to prevent duplicate multi-worker claims.
 */
export async function claimPendingOutboxMessages(options: {
  workerId: string;
  limit?: number;
  claimTtlSeconds?: number;
  tenantId?: string;
}): Promise<ClaimedOutboxMessage[]> {
  const limit = Math.max(1, options.limit ?? 50);
  const ttlSeconds = Math.max(1, options.claimTtlSeconds ?? 30);
  const now = Date.now();

  if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
    const claimed: ClaimedOutboxMessage[] = [];
    for (const item of memoryOutboxStore.values()) {
      if (!isCustomerWebhookEventType(item.eventType)) continue;
      if (options.tenantId && item.tenantId !== options.tenantId) continue;
      const isPending = item.status === 'PENDING';
      const isExpired = item.status === 'PROCESSING' && (!item.claimExpiresAt || item.claimExpiresAt < now);
      const isRunnable = isPending || isExpired;
      const isTimeEligible = !item.nextAttemptAt || item.nextAttemptAt <= now;
      const hasRetriesLeft = item.retryCount < item.maxAttempts;

      if (isRunnable && isTimeEligible && hasRetriesLeft) {
        item.status = 'PROCESSING';
        item.claimOwner = options.workerId;
        item.claimExpiresAt = now + ttlSeconds * 1000;
        item.updatedAt = now;
        claimed.push({
          id: item.id,
          tenantId: item.tenantId,
          eventType: item.eventType,
          aggregateType: item.aggregateType,
          aggregateId: item.aggregateId,
          payload: item.payload,
          retryCount: item.retryCount,
          maxAttempts: item.maxAttempts,
          claimOwner: options.workerId,
          claimExpiresAt: new Date(item.claimExpiresAt),
        });
        if (claimed.length >= limit) break;
      }
    }
    return claimed;
  }

  const client = getOutboxDbClient();

  try {
    const claimQuery = async (executor: any) => {
      if (options.tenantId) {
        await executor.$queryRaw`SELECT set_config('app.current_tenant_id', ${options.tenantId}, true)`;
      }

      const rows = await executor.$queryRaw<Array<{
        id: string;
        tenantId: string;
        eventType: string;
        aggregateType: string;
        aggregateId: string;
        payload: any;
        status: string;
        retryCount: number;
        maxAttempts: number;
        claimOwner: string;
        claimExpiresAt: Date;
      }>>`
        WITH claimable AS (
          SELECT "id"
          FROM "PlatformOutboxMessage"
          WHERE ("status" = 'PENDING' OR ("status" = 'PROCESSING' AND "claimExpiresAt" < NOW()))
            AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= NOW())
            AND "retryCount" < "maxAttempts"
            AND "eventType" = ANY(${[...CUSTOMER_WEBHOOK_EVENT_TYPES]}::text[])
            ${options.tenantId ? Prisma.sql`AND "tenantId" = ${options.tenantId}` : Prisma.empty}
          ORDER BY "createdAt" ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE "PlatformOutboxMessage" m
        SET "status" = 'PROCESSING',
            "claimOwner" = ${options.workerId},
            "claimExpiresAt" = NOW() + (${ttlSeconds} * INTERVAL '1 second'),
            "updatedAt" = NOW()
        FROM claimable c
        WHERE m."id" = c."id"
        RETURNING m."id", m."tenantId", m."eventType", m."aggregateType", m."aggregateId", m."payload", m."status", m."retryCount", m."maxAttempts", m."claimOwner", m."claimExpiresAt"
      `;

      return (rows || []).map((r: any) => ({
        id: r.id,
        tenantId: r.tenantId,
        eventType: r.eventType,
        aggregateType: r.aggregateType,
        aggregateId: r.aggregateId,
        payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
        retryCount: r.retryCount,
        maxAttempts: r.maxAttempts,
        claimOwner: r.claimOwner,
        claimExpiresAt: new Date(r.claimExpiresAt),
      }));
    };

    if (options.tenantId) {
      return await (prisma as any).$transaction(claimQuery);
    }
    return await claimQuery(client);
  } catch (err: any) {
    console.error('[WebhookEmitter] claimPendingOutboxMessages failed:', err?.message || err);
    return [];
  }
}

/**
 * Dispatches a previously claimed outbox message.
 * Executes external HTTP delivery OUTSIDE of database transactions.
 * Fences final DB state transition with (claimOwner = workerId AND status = 'PROCESSING').
 */
export async function dispatchClaimedMessage(
  message: ClaimedOutboxMessage,
  options: { workerId?: string; timeoutMs?: number; baseDelayMs?: number; jitterMs?: number } = {}
): Promise<PlatformWebhookDelivery> {
  const workerId = options.workerId || message.claimOwner;
  const timeoutMs = options.timeoutMs ?? 5000;

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

  if (!isCustomerWebhookEventType(message.eventType)) {
    throw new Error(
      `OUTBOX_CHANNEL_VIOLATION: Event type "${message.eventType}" is internal and cannot be dispatched to customer webhooks.`,
    );
  }

  if (webhookUrl) {
    delivery.url = webhookUrl;
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
        signal: AbortSignal.timeout(timeoutMs),
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

  // Handle in-memory repository
  if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
    const mem = memoryOutboxStore.get(message.id);
    if (mem && mem.claimOwner === workerId && mem.status === 'PROCESSING') {
      if (delivery.delivered) {
        mem.status = 'DISPATCHED';
        mem.dispatchedAt = new Date().toISOString();
        mem.claimOwner = undefined;
        mem.claimExpiresAt = undefined;
      } else {
        const nextRetry = mem.retryCount + 1;
        const isDeadLetter = nextRetry >= mem.maxAttempts;
        const delayMs = calculateBackoff(nextRetry, options.baseDelayMs, 300000, options.jitterMs);
        mem.status = isDeadLetter ? 'FAILED' : 'PENDING';
        mem.retryCount = nextRetry;
        mem.lastError = dispatchError || 'Webhook delivery failed';
        mem.nextAttemptAt = isDeadLetter ? undefined : Date.now() + delayMs;
        mem.claimOwner = undefined;
        mem.claimExpiresAt = undefined;
      }
      mem.updatedAt = Date.now();
    }
    webhookDeliveries.push(delivery);
    return delivery;
  }

  // PostgreSQL Mode: Fenced Database State Transition
  const client = getOutboxDbClient();
  try {
    const updateQuery = async (executor: any) => {
      if (message.tenantId) {
        await executor.$queryRaw`SELECT set_config('app.current_tenant_id', ${message.tenantId}, true)`;
      }

      if (delivery.delivered) {
        const updated = await executor.$queryRaw<Array<{ id: string }>>`
          UPDATE "PlatformOutboxMessage"
          SET "status" = 'DISPATCHED',
              "dispatchedAt" = NOW(),
              "claimOwner" = NULL,
              "claimExpiresAt" = NULL,
              "updatedAt" = NOW()
          WHERE "id" = ${message.id}
            AND "claimOwner" = ${workerId}
            AND "status" = 'PROCESSING'
          RETURNING "id"
        `;
        if (!updated || updated.length === 0) {
          console.warn(`[WebhookEmitter] Fenced out stale worker ${workerId} on delivery success for ${message.id}`);
        }
      } else {
        const nextRetry = (message.retryCount ?? 0) + 1;
        const maxAttempts = message.maxAttempts ?? 5;
        const isDeadLetter = nextRetry >= maxAttempts;
        const delayMs = calculateBackoff(nextRetry, options.baseDelayMs, 300000, options.jitterMs);

        const updated = await executor.$queryRaw<Array<{ id: string }>>`
          UPDATE "PlatformOutboxMessage"
          SET "status" = ${isDeadLetter ? 'FAILED' : 'PENDING'}::"OutboxStatus",
              "retryCount" = ${nextRetry},
              "lastError" = ${dispatchError || 'Webhook delivery failed'},
              "nextAttemptAt" = ${isDeadLetter ? null : Prisma.sql`NOW() + (${delayMs} * INTERVAL '1 millisecond')`},
              "claimOwner" = NULL,
              "claimExpiresAt" = NULL,
              "updatedAt" = NOW()
          WHERE "id" = ${message.id}
            AND "claimOwner" = ${workerId}
            AND "status" = 'PROCESSING'
          RETURNING "id"
        `;
        if (!updated || updated.length === 0) {
          console.warn(`[WebhookEmitter] Fenced out stale worker ${workerId} on delivery failure for ${message.id}`);
        }
      }
    };

    if (message.tenantId) {
      await (prisma as any).$transaction(updateQuery);
    } else {
      await updateQuery(client);
    }
  } catch (err: any) {
    console.warn(`[WebhookEmitter] Failed to persist outbox dispatch state for ${message.id}:`, err?.message || err);
  }

  webhookDeliveries.push(delivery);
  return delivery;
}

/**
 * Authoritative dispatcher for persistent outbox messages.
 * Atomically claims the message first if not already claimed, performs HTTP delivery outside DB tx,
 * and executes fenced status updates.
 */
export async function dispatchOutboxMessage(
  message: OutboxDispatchTarget,
  options: { workerId?: string; timeoutMs?: number; baseDelayMs?: number; jitterMs?: number } = {}
): Promise<PlatformWebhookDelivery> {
  const workerId = options.workerId || `direct_${crypto.randomUUID().slice(0, 8)}`;

  // If in JSON mode
  if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
    let mem = memoryOutboxStore.get(message.id);
    if (!mem) {
      mem = {
        id: message.id,
        tenantId: message.tenantId,
        eventType: message.eventType,
        aggregateType: 'TENANT',
        aggregateId: message.tenantId,
        payload: message.payload,
        status: 'PENDING',
        retryCount: message.retryCount ?? 0,
        maxAttempts: message.maxAttempts ?? 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      memoryOutboxStore.set(message.id, mem);
    }

    if (mem.status === 'DISPATCHED') {
      const delivery: PlatformWebhookDelivery = {
        id: message.id,
        event: message.eventType,
        tenantId: message.tenantId,
        timestamp: new Date().toISOString(),
        payload: message.payload,
        delivered: true,
      };
      webhookDeliveries.push(delivery);
      return delivery;
    }

    mem.status = 'PROCESSING';
    mem.claimOwner = workerId;
    mem.claimExpiresAt = Date.now() + 30000;
    mem.updatedAt = Date.now();

    return dispatchClaimedMessage(
      {
        id: mem.id,
        tenantId: mem.tenantId,
        eventType: mem.eventType,
        aggregateType: mem.aggregateType,
        aggregateId: mem.aggregateId,
        payload: mem.payload,
        retryCount: mem.retryCount,
        maxAttempts: mem.maxAttempts,
        claimOwner: workerId,
        claimExpiresAt: new Date(mem.claimExpiresAt),
      },
      { ...options, workerId }
    );
  }

  // If persistent outbox record in PostgreSQL
  if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'prisma' && message.id && !message.id.startsWith('whk_')) {
    const client = getOutboxDbClient();

    try {
      const claimDirectQuery = async (executor: any) => {
        if (message.tenantId) {
          await executor.$queryRaw`SELECT set_config('app.current_tenant_id', ${message.tenantId}, true)`;
        }

        const claimedRows = await executor.$queryRaw<Array<{
          id: string;
          tenantId: string;
          eventType: string;
          aggregateType: string;
          aggregateId: string;
          payload: any;
          status: string;
          retryCount: number;
          maxAttempts: number;
          claimOwner: string;
          claimExpiresAt: Date;
        }>>`
          UPDATE "PlatformOutboxMessage"
          SET "status" = 'PROCESSING',
              "claimOwner" = ${workerId},
              "claimExpiresAt" = NOW() + (30 * INTERVAL '1 second'),
              "updatedAt" = NOW()
          WHERE "id" = ${message.id}
            AND ("status" = 'PENDING' OR ("status" = 'PROCESSING' AND "claimExpiresAt" < NOW()))
          RETURNING "id", "tenantId", "eventType", "aggregateType", "aggregateId", "payload", "status", "retryCount", "maxAttempts", "claimOwner", "claimExpiresAt"
        `;

        return claimedRows;
      };

      const claimedRows = message.tenantId
        ? await (prisma as any).$transaction(claimDirectQuery)
        : await claimDirectQuery(client);

      if (claimedRows && claimedRows.length > 0) {
        const row = claimedRows[0];
        return dispatchClaimedMessage(
          {
            id: row.id,
            tenantId: row.tenantId,
            eventType: row.eventType,
            aggregateType: row.aggregateType,
            aggregateId: row.aggregateId,
            payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
            retryCount: row.retryCount,
            maxAttempts: row.maxAttempts,
            claimOwner: workerId,
            claimExpiresAt: new Date(row.claimExpiresAt),
          },
          { ...options, workerId }
        );
      }

      // Check if message was already delivered
      const existing = await (prisma as any).$transaction(async (tx: any) => {
        if (message.tenantId) {
          await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${message.tenantId}, true)`;
        }
        return tx.platformOutboxMessage.findUnique({ where: { id: message.id } });
      });

      if (existing?.status === 'DISPATCHED') {
        const delivery: PlatformWebhookDelivery = {
          id: message.id,
          event: message.eventType,
          tenantId: message.tenantId,
          timestamp: existing.dispatchedAt ? existing.dispatchedAt.toISOString() : new Date().toISOString(),
          payload: message.payload,
          delivered: true,
        };
        webhookDeliveries.push(delivery);
        return delivery;
      }
    } catch (err: any) {
      console.warn(`[WebhookEmitter] direct claim failed for ${message.id}:`, err?.message || err);
    }
  }

  // Fallback for ephemeral messages (e.g. whk_*) or unpersisted deliveries
  const delivery: PlatformWebhookDelivery = {
    id: message.id,
    event: message.eventType,
    tenantId: message.tenantId,
    timestamp: new Date().toISOString(),
    payload: message.payload,
    delivered: false,
  };

  const webhookUrl = process.env.ORBITOX_WEBHOOK_URL;
  if (webhookUrl) {
    delivery.url = webhookUrl;
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
        signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
      });
      if (res.ok) {
        delivery.delivered = true;
      }
    } catch (err: any) {
      console.warn(`[WebhookEmitter] Fallback delivery failed to ${webhookUrl}:`, err?.message || err);
    }
  } else {
    delivery.delivered = true;
  }

  webhookDeliveries.push(delivery);
  return delivery;
}

/**
 * Multi-worker safe outbox dispatcher & sweep worker.
 * Uses atomic claiming to prevent race conditions across parallel workers.
 */
export async function dispatchPendingOutboxMessages(
  options: {
    limit?: number;
    tenantId?: string;
    workerId?: string;
    claimTtlSeconds?: number;
    baseDelayMs?: number;
    jitterMs?: number;
  } = {}
): Promise<number> {
  const workerId = options.workerId || `worker_sweep_${crypto.randomUUID().slice(0, 8)}`;
  const claimedMessages = await claimPendingOutboxMessages({
    workerId,
    limit: options.limit ?? 50,
    claimTtlSeconds: options.claimTtlSeconds ?? 30,
    tenantId: options.tenantId,
  });

  let dispatchedCount = 0;
  for (const msg of claimedMessages) {
    await dispatchClaimedMessage(msg, {
      workerId,
      baseDelayMs: options.baseDelayMs,
      jitterMs: options.jitterMs,
    });
    dispatchedCount++;
  }
  return dispatchedCount;
}

/**
 * Resets a dead-lettered (FAILED) or stuck message back to PENDING for manual operational replay.
 * Strictly preserves the original message ID, tenant ID, event type, and payload.
 */
export async function replayOutboxMessage(
  id: string,
  options: { tenantId?: string; force?: boolean } = {}
): Promise<boolean> {
  if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
    const mem = memoryOutboxStore.get(id);
    if (!mem) return false;
    if (!options.force && mem.status !== 'FAILED') return false;
    mem.status = 'PENDING';
    mem.retryCount = 0;
    mem.lastError = undefined;
    mem.claimOwner = undefined;
    mem.claimExpiresAt = undefined;
    mem.nextAttemptAt = Date.now();
    mem.updatedAt = Date.now();
    return true;
  }

  const client = getOutboxDbClient();
  try {
    const replayQuery = async (executor: any) => {
      if (options.tenantId) {
        await executor.$queryRaw`SELECT set_config('app.current_tenant_id', ${options.tenantId}, true)`;
      }

      const rows = await executor.$queryRaw<Array<{ id: string }>>`
        UPDATE "PlatformOutboxMessage"
        SET "status" = 'PENDING',
            "retryCount" = 0,
            "lastError" = NULL,
            "claimOwner" = NULL,
            "claimExpiresAt" = NULL,
            "nextAttemptAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "id" = ${id}
          AND (${Boolean(options.force)} = true OR "status" = 'FAILED')
        RETURNING "id"
      `;

      return Array.isArray(rows) && rows.length > 0;
    };

    if (options.tenantId) {
      return await (prisma as any).$transaction(replayQuery);
    }
    return await replayQuery(client);
  } catch (err: any) {
    console.error(`[WebhookEmitter] replayOutboxMessage failed for ${id}:`, err?.message || err);
    return false;
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

/**
 * Dedicated internal audit outbox consumer for mcp.audit.* events.
 * Claims pending internal MCP audit outbox rows and ensures idempotent PlatformAuditEvent writes
 * without routing internal events to external customer webhooks.
 */
export async function processMcpAuditOutboxBatch(
  options: {
    limit?: number;
    workerId?: string;
    claimTtlSeconds?: number;
    baseDelayMs?: number;
    jitterMs?: number;
    recordAudit?: (input: any) => Promise<string>;
  } = {}
): Promise<{ claimed: number; dispatched: number; retried: number; failed: number }> {
  const workerId = options.workerId || `mcp_audit_worker_${crypto.randomUUID().slice(0, 8)}`;
  const limit = Math.max(1, options.limit ?? 50);
  const ttlSeconds = Math.max(1, options.claimTtlSeconds ?? 30);
  const recordAudit =
    options.recordAudit ??
    (await import('@/server/db/platform-repository')).platformRepository.recordPlatformAdminAudit;

  const result = { claimed: 0, dispatched: 0, retried: 0, failed: 0 };

  if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
    const now = Date.now();
    for (const item of memoryOutboxStore.values()) {
      if (!isMcpAuditOutboxEventType(item.eventType)) continue;
      const isRunnable =
        item.status === 'PENDING' ||
        (item.status === 'PROCESSING' && (!item.claimExpiresAt || item.claimExpiresAt < now));
      const isTimeEligible = !item.nextAttemptAt || item.nextAttemptAt <= now;
      if (!isRunnable || !isTimeEligible || item.retryCount >= item.maxAttempts) continue;

      item.status = 'PROCESSING';
      item.claimOwner = workerId;
      item.claimExpiresAt = now + ttlSeconds * 1000;
      result.claimed += 1;
      try {
        await persistInternalMcpAuditMessage(item, recordAudit);
        item.status = 'DISPATCHED';
        item.dispatchedAt = new Date().toISOString();
        item.claimOwner = undefined;
        item.claimExpiresAt = undefined;
        result.dispatched += 1;
      } catch (err: any) {
        const nextRetry = item.retryCount + 1;
        const isDead = nextRetry >= item.maxAttempts;
        item.status = isDead ? 'FAILED' : 'PENDING';
        item.retryCount = nextRetry;
        item.lastError = err?.message || 'Internal audit relay failed';
        item.nextAttemptAt = isDead
          ? undefined
          : Date.now() + calculateBackoff(nextRetry, options.baseDelayMs, 300000, options.jitterMs);
        item.claimOwner = undefined;
        item.claimExpiresAt = undefined;
        if (isDead) result.failed += 1;
        else result.retried += 1;
      }
      if (result.claimed >= limit) break;
    }
    return result;
  }

  const client = getOutboxDbClient();
  const claimedRows = await client.$queryRaw<Array<{
    id: string;
    tenantId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: any;
    retryCount: number;
    maxAttempts: number;
  }>>`
    WITH claimable AS (
      SELECT "id"
      FROM "PlatformOutboxMessage"
      WHERE ("status" = 'PENDING' OR ("status" = 'PROCESSING' AND "claimExpiresAt" < NOW()))
        AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= NOW())
        AND "retryCount" < "maxAttempts"
        AND "eventType" = ANY(${[...MCP_AUDIT_OUTBOX_EVENT_TYPES]}::text[])
      ORDER BY "createdAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "PlatformOutboxMessage" m
    SET "status" = 'PROCESSING',
        "claimOwner" = ${workerId},
        "claimExpiresAt" = NOW() + (${ttlSeconds} * INTERVAL '1 second'),
        "updatedAt" = NOW()
    FROM claimable c
    WHERE m."id" = c."id"
    RETURNING m."id", m."tenantId", m."eventType", m."aggregateType", m."aggregateId", m."payload", m."retryCount", m."maxAttempts"
  `;

  result.claimed = claimedRows.length;
  for (const row of claimedRows) {
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {});
    try {
      await persistInternalMcpAuditMessage({ ...row, payload }, recordAudit);
      await client.$queryRaw`
        UPDATE "PlatformOutboxMessage"
        SET "status" = 'DISPATCHED',
            "dispatchedAt" = NOW(),
            "claimOwner" = NULL,
            "claimExpiresAt" = NULL,
            "updatedAt" = NOW()
        WHERE "id" = ${row.id}
          AND "claimOwner" = ${workerId}
          AND "status" = 'PROCESSING'
      `;
      result.dispatched += 1;
    } catch (err: any) {
      const nextRetry = (row.retryCount ?? 0) + 1;
      const isDead = nextRetry >= (row.maxAttempts ?? 5);
      const delayMs = calculateBackoff(nextRetry, options.baseDelayMs, 300000, options.jitterMs);
      await client.$queryRaw`
        UPDATE "PlatformOutboxMessage"
        SET "status" = ${isDead ? 'FAILED' : 'PENDING'}::"OutboxStatus",
            "retryCount" = ${nextRetry},
            "lastError" = ${err?.message || 'Internal audit relay failed'},
            "nextAttemptAt" = ${isDead ? null : Prisma.sql`NOW() + (${delayMs} * INTERVAL '1 millisecond')`},
            "claimOwner" = NULL,
            "claimExpiresAt" = NULL,
            "updatedAt" = NOW()
        WHERE "id" = ${row.id}
          AND "claimOwner" = ${workerId}
          AND "status" = 'PROCESSING'
      `;
      if (isDead) result.failed += 1;
      else result.retried += 1;
    }
  }
  return result;
}

async function persistInternalMcpAuditMessage(
  msg: { id: string; tenantId: string; eventType: string; aggregateType: string; aggregateId: string; payload: Record<string, any> },
  recordAudit: (input: any) => Promise<string>,
): Promise<void> {
  const payload = msg.payload || {};
  const stage = msg.eventType === 'mcp.audit.approval_proposed' ? 'proposed' : 'intent';
  const deterministicId =
    typeof payload.deterministicAuditId === 'string' && payload.deterministicAuditId
      ? payload.deterministicAuditId
      : `audit_mcp_${crypto.createHash('sha256').update(`${msg.aggregateId}:${stage}`).digest('hex').slice(0, 28)}`;
  const match = /^org\/([^/]+)\/project\/([^/]+)\/environment\/([^/]+)$/.exec(msg.tenantId);

  await recordAudit({
    deterministicId,
    action: msg.eventType === 'mcp.audit.approval_proposed' ? 'MCP_APPROVAL_PROPOSED' : 'MCP_APPROVAL_EXECUTION_INTENT',
    entityType: msg.aggregateType || 'MCP_GOVERNANCE',
    entityId: msg.aggregateId,
    actorId: payload.approvedById || payload.requestedById || 'system:mcp-outbox',
    organizationId: match && match[1] !== 'platform' ? match[1] : undefined,
    projectId: match && match[2] !== 'operations' ? match[2] : undefined,
    environmentId: match ? match[3] : undefined,
    requestId: payload.executionId || payload.approvalId || msg.aggregateId,
    reason: `Durable MCP internal audit outbox event (${msg.eventType})`,
    metadata: { ...payload, outboxMessageId: msg.id },
  });
}

export function clearEmittedWebhooks(): void {
  webhookDeliveries.length = 0;
}

export function clearMemoryOutboxStore(): void {
  memoryOutboxStore.clear();
}
