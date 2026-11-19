import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogOptions {
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  impersonatedBy?: string;
  contextId: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  reason?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  
  // In memory mock to store previous hash for chaining
  private lastHash: string = '';

  /**
   * Appends a new audit record to the immutable ledger
   */
  async log(options: AuditLogOptions): Promise<void> {
    const id = uuidv4();
    const occurredAt = new Date();
    const previousHash = this.lastHash;
    
    // Determine changed fields
    const changedFields = this.computeChangedFields(options.oldValue, options.newValue);

    // Create the row representation for hashing
    const rowContent = JSON.stringify({
      id,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      userId: options.userId,
      contextId: options.contextId,
      oldValue: options.oldValue,
      newValue: options.newValue,
      reason: options.reason,
      occurredAt: occurredAt.toISOString(),
      previousHash,
    });

    const rowHash = crypto.createHash('sha256').update(rowContent).digest('hex');
    this.lastHash = rowHash;

    // In a real implementation:
    // INSERT INTO audit.events (...) VALUES (...)
    
    this.logger.debug(`Audit log created: ${options.action} on ${options.entityType} ${options.entityId}`);
    this.logs.push({
      id,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      userId: options.userId,
      contextId: options.contextId,
      oldValue: options.oldValue,
      newValue: options.newValue,
      reason: options.reason,
      ipAddress: options.ipAddress,
      occurredAt,
      previousHash,
      rowHash,
    });
  }

  private logs: any[] = [];

  query(filter: { contextId?: string; entityType?: string; entityId?: string; userId?: string; action?: string }): any[] {
    return this.logs.filter(log => {
      if (filter.contextId && log.contextId !== filter.contextId) return false;
      if (filter.entityType && log.entityType !== filter.entityType) return false;
      if (filter.entityId && log.entityId !== filter.entityId) return false;
      if (filter.userId && log.userId !== filter.userId) return false;
      if (filter.action && log.action !== filter.action) return false;
      return true;
    });
  }

  verifyChain(): { valid: boolean; totalEntries: number; brokenAtIndex?: number } {
    let prevHash = '';
    for (let i = 0; i < this.logs.length; i++) {
      const log = this.logs[i];
      if (log.previousHash !== prevHash) {
        return { valid: false, totalEntries: this.logs.length, brokenAtIndex: i };
      }
      const rowContent = JSON.stringify({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        userId: log.userId,
        contextId: log.contextId,
        oldValue: log.oldValue,
        newValue: log.newValue,
        reason: log.reason,
        occurredAt: log.occurredAt.toISOString(),
        previousHash: log.previousHash,
      });
      const expectedHash = crypto.createHash('sha256').update(rowContent).digest('hex');
      if (log.rowHash !== expectedHash) {
        return { valid: false, totalEntries: this.logs.length, brokenAtIndex: i };
      }
      prevHash = log.rowHash;
    }
    return { valid: true, totalEntries: this.logs.length };
  }

  private computeChangedFields(oldVal?: Record<string, any>, newVal?: Record<string, any>): string[] {
    if (!oldVal || !newVal) return [];
    
    const changed = [];
    const allKeys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);
    
    for (const key of allKeys) {
      // Very basic deep comparison for MVP
      if (JSON.stringify(oldVal[key]) !== JSON.stringify(newVal[key])) {
        changed.push(key);
      }
    }
    
    return changed;
  }
}
