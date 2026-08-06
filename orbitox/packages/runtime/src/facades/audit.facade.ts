/**
 * AuditFacade
 * ─────────────────────────────────────────────────────────────
 * Immutable, hash-chained audit trail for every action.
 * Automatically generates IDs, timestamps, and hash chains.
 * 
 * Required for GDPR, SOC2, HIPAA compliance.
 */

import { AuditService } from '@orbitox/core';

export interface AuditEntry {
  action: string;
  entityId: string;
  entityType?: string;
  userId?: string;
  contextId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
}

export class AuditFacade {
  constructor(private readonly svc: AuditService) {}

  /**
   * Log an immutable audit event. Auto-generates ID and timestamp.
   * @example
   * await orbitox.audit.log({ action: 'CREATE', entityType: 'Lead', entityId: 'lead_001', userId: 'user_1' });
   */
  async log(entry: AuditEntry): Promise<void> {
    await this.svc.log({
      action: entry.action,
      entityType: entry.entityType || 'unknown',
      entityId: entry.entityId,
      userId: entry.userId,
      contextId: entry.contextId || 'global',
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      reason: entry.reason,
      ipAddress: entry.ipAddress,
    });
  }

  /**
   * Convenience: log a CREATE event.
   */
  async created(entityType: string, entityId: string, newValue: Record<string, any>, userId?: string, contextId?: string): Promise<void> {
    await this.log({ action: 'CREATE', entityType, entityId, newValue, userId, contextId });
  }

  /**
   * Convenience: log an UPDATE event.
   */
  async updated(entityType: string, entityId: string, oldValue: Record<string, any>, newValue: Record<string, any>, userId?: string, contextId?: string): Promise<void> {
    await this.log({ action: 'UPDATE', entityType, entityId, oldValue, newValue, userId, contextId });
  }

  /**
   * Convenience: log a DELETE event.
   */
  async deleted(entityType: string, entityId: string, oldValue: Record<string, any>, userId?: string, contextId?: string): Promise<void> {
    await this.log({ action: 'DELETE', entityType, entityId, oldValue, userId, contextId });
  }

  /**
   * Convenience: log a VIEW event (for GDPR data access logging).
   */
  async viewed(entityType: string, entityId: string, userId?: string, contextId?: string): Promise<void> {
    await this.log({ action: 'VIEW', entityType, entityId, userId, contextId });
  }
}
