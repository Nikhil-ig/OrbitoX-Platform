import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'orbitox:audit_action';

export interface AuditActionMetadata {
  action: string;
  entityType: string;
}

/**
 * Marks a controller endpoint or service method to automatically capture an audit trail.
 * Typically requires an Interceptor to process this metadata and call AuditService.
 */
export const Auditable = (action: string, entityType: string) => 
  SetMetadata(AUDIT_ACTION_KEY, { action, entityType } as AuditActionMetadata);
