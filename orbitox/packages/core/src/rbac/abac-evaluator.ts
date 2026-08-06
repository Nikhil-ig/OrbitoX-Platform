import jsonLogic from 'json-logic-js';

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
  rule: any; // JSON Logic rule
}

export class AbacEvaluator {
  private static policies: AbacPolicyRule[] = [
    {
      id: 'default-owner-or-assigned',
      resourceType: '*',
      action: '*',
      rule: {
        "or": [
          { "in": ["admin", { "var": "user.roles" }] },
          { "in": ["owner", { "var": "user.roles" }] },
          { "==": [{ "var": "resource.ownerId" }, { "var": "user.userId" }] },
          { "==": [{ "var": "resource.assignedTo" }, { "var": "user.userId" }] }
        ]
      }
    }
  ];

  static registerPolicy(rule: AbacPolicyRule): void {
    this.policies.push(rule);
  }

  static getPolicy(id: string): AbacPolicyRule | undefined {
    return this.policies.find(p => p.id === id);
  }

  static updatePolicy(id: string, updates: Partial<AbacPolicyRule>): void {
    const idx = this.policies.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.policies[idx] = { ...this.policies[idx], ...updates } as AbacPolicyRule;
    }
  }

  static deletePolicy(id: string): void {
    const idx = this.policies.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.policies.splice(idx, 1);
    }
  }

  static canAccess(user: UserContext, resource: ResourceContext, action: 'create' | 'read' | 'update' | 'delete'): boolean {
    if (user.tenantId !== resource.tenantId) {
      return false; // Cross-tenant security isolation
    }

    const applicablePolicies = this.policies.filter(
      (p) => (p.resourceType === '*' || p.resourceType === resource.resourceType) &&
             (p.action === '*' || p.action === action)
    );

    const contextData = { user, resource };

    return applicablePolicies.some((p) => {
      try {
        return jsonLogic.apply(p.rule, contextData);
      } catch (e) {
        return false;
      }
    });
  }
}
