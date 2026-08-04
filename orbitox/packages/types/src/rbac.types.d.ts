/**
 * @module @orbitox/types/rbac
 * Types for Role-Based and Policy-Based Access Control
 */
import { BaseEntity } from './common.types';
export interface Permission {
    key: string;
    description: string;
    pluginId: string;
}
export interface Role extends BaseEntity {
    name: string;
    description: string;
    isSystem: boolean;
    permissions: string[];
}
/**
 * Parameters for evaluating an access control policy.
 */
export interface PermissionCheck {
    userId: string;
    permission: string;
    contextId: string;
    resourceId?: string;
    attributes?: Record<string, unknown>;
}
//# sourceMappingURL=rbac.types.d.ts.map