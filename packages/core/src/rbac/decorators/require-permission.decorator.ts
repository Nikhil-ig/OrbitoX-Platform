import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'orbitox:require_permission';

/**
 * Decorator to enforce RBAC/ABAC/PBAC policies on a route
 * @param permission The required permission key (e.g., 'crm.leads.create')
 */
export const RequirePermission = (permission: string) => SetMetadata(PERMISSION_KEY, permission);
