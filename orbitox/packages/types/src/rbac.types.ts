/**
 * @module @orbitox/types/rbac
 * Types for Role-Based and Policy-Based Access Control
 */

import { BaseEntity } from './common.types';

export interface Permission {
  key: string;         // e.g., 'crm.leads.create'
  description: string;
  pluginId: string;    // e.g., 'crm'
}

export interface Role extends BaseEntity {
  name: string;        // e.g., 'Sales Manager'
  description: string;
  isSystem: boolean;   // System roles cannot be deleted
  permissions: string[]; // List of permission keys
}

/**
 * Parameters for evaluating an access control policy.
 */
export interface PermissionCheck {
  userId: string;
  permission: string;
  contextId: string;
  resourceId?: string; // Optional: for resource-level checks
  attributes?: Record<string, unknown>; // For ABAC rules
}
