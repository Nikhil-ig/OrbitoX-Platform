export interface UserContext {
  userId: string;
  roles: string[];
  department?: string;
  tenantId: string;
}

export interface ResourceContext {
  resourceType: string;
  resourceId: string;
  ownerId?: string;
  assignedTo?: string;
  tenantId: string;
  attributes?: Record<string, any>;
}

export interface AbacPolicyRule {
  id: string;
  resourceType: string;
  action: 'create' | 'read' | 'update' | 'delete' | '*';
  condition: (user: UserContext, resource: ResourceContext) => boolean;
}

export class AbacEvaluator {
  private static policies: AbacPolicyRule[] = [
    {
      id: 'default-owner-or-assigned',
      resourceType: '*',
      action: '*',
      condition: (user, resource) => {
        if (user.tenantId !== resource.tenantId) return false;
        if (user.roles.includes('admin') || user.roles.includes('owner')) return true;
        if (resource.ownerId && resource.ownerId === user.userId) return true;
        if (resource.assignedTo && resource.assignedTo === user.userId) return true;
        return false;
      }
    }
  ];

  static registerPolicy(rule: AbacPolicyRule): void {
    this.policies.push(rule);
  }

  static canAccess(user: UserContext, resource: ResourceContext, action: 'create' | 'read' | 'update' | 'delete'): boolean {
    if (user.tenantId !== resource.tenantId) {
      return false; // Cross-tenant security isolation
    }

    const applicablePolicies = this.policies.filter(
      (p) => (p.resourceType === '*' || p.resourceType === resource.resourceType) &&
             (p.action === '*' || p.action === action)
    );

    return applicablePolicies.some((p) => p.condition(user, resource));
  }
}
