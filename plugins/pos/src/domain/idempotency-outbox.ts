/**
 * 🛡️ OrbitoX Platform - Durable Idempotency & Transactional Outbox Primitives
 * ─────────────────────────────────────────────────────────────
 * INVARIANT: Every state-mutating command (order submission, payment, join approval)
 * must be safely idempotent under network retries and duplicate transmissions.
 *
 * Invariant Rules:
 * 1. Same Idempotency-Key + Same Payload -> Return identical cached response without re-executing.
 * 2. Same Idempotency-Key + Different Payload -> Reject with HTTP 422 Unprocessable Entity.
 * 3. Domain state changes and event emission MUST commit atomically via Transactional Outbox.
 */

import * as crypto from 'crypto';

export type OutboxStatus = 'PENDING' | 'DISPATCHED' | 'FAILED';

export interface PlatformIdempotencyRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly key: string;
  readonly scope: string; // e.g. "POST /api/v1/orders"
  readonly requestHash: string; // SHA-256 of normalized request body
  readonly responseStatus: number;
  readonly responseBody: any;
  readonly expiresAt: string;
  readonly createdAt: string;
}

export interface PlatformOutboxMessage {
  readonly id: string;
  readonly tenantId: string;
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly payload: Record<string, any>;
  readonly status: OutboxStatus;
  readonly retryCount: number;
  readonly lastError?: string;
  readonly createdAt: string;
  readonly dispatchedAt?: string;
}

export type IdempotencyCheckResult =
  | { status: 'NEW' }
  | { status: 'CACHED_HIT'; responseStatus: number; responseBody: any }
  | { status: 'CONFLICT_PAYLOAD_MISMATCH'; error: string };

export class IdempotencyEngine {
  /**
   * Hashes the incoming request payload with SHA-256.
   */
  static hashPayload(payload: any): string {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Evaluates an incoming request against an existing idempotency record.
   */
  static evaluate(
    existingRecord: PlatformIdempotencyRecord | null | undefined,
    currentPayload: any
  ): IdempotencyCheckResult {
    if (!existingRecord) {
      return { status: 'NEW' };
    }

    const currentHash = this.hashPayload(currentPayload);
    if (existingRecord.requestHash !== currentHash) {
      return {
        status: 'CONFLICT_PAYLOAD_MISMATCH',
        error: `Idempotency-Key "${existingRecord.key}" was previously used with a different request payload.`,
      };
    }

    return {
      status: 'CACHED_HIT',
      responseStatus: existingRecord.responseStatus,
      responseBody: existingRecord.responseBody,
    };
  }

  /**
   * Constructs an Idempotency record for durable database persistence.
   */
  static createRecord(params: {
    tenantId: string;
    key: string;
    scope: string;
    payload: any;
    responseStatus: number;
    responseBody: any;
    ttlSeconds?: number;
  }): PlatformIdempotencyRecord {
    const ttl = params.ttlSeconds ?? 86400; // 24-hour default retention
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000).toISOString();

    return {
      id: `idemp_${crypto.randomUUID()}`,
      tenantId: params.tenantId,
      key: params.key,
      scope: params.scope,
      requestHash: this.hashPayload(params.payload),
      responseStatus: params.responseStatus,
      responseBody: params.responseBody,
      expiresAt,
      createdAt: now.toISOString(),
    };
  }
}

export class OutboxEngine {
  /**
   * Prepares a Transactional Outbox event message.
   */
  static createEvent(params: {
    tenantId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: Record<string, any>;
  }): PlatformOutboxMessage {
    return {
      id: `outbox_${crypto.randomUUID()}`,
      tenantId: params.tenantId,
      eventType: params.eventType,
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
      payload: params.payload,
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
  }
}
