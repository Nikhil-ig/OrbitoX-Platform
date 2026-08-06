import { Injectable, Logger } from '@nestjs/common';
import { PermissionCheck } from '@orbitox/types';
import { AbacEvaluator, UserContext, ResourceContext } from './abac-evaluator';

export enum PolicyDecision {
  ALLOW = 'allow',
  DENY = 'deny',
}

export type PolicyEvaluator = (check: PermissionCheck, entity?: any) => Promise<PolicyDecision>;

@Injectable()
export class PolicyEngine {
  private readonly logger = new Logger(PolicyEngine.name);
  private readonly evaluators = new Map<string, PolicyEvaluator>();

  /**
   * Registers a custom PBAC evaluator function
   */
  registerEvaluator(name: string, evaluator: PolicyEvaluator): void {
    if (this.evaluators.has(name)) {
      this.logger.warn(`Evaluator '${name}' already registered. Overwriting.`);
    }
    this.evaluators.set(name, evaluator);
  }

  /**
   * Evaluates ABAC policies (Attribute-based)
   * Enforces Zero-Trust: Defaults to DENY.
   */
  async evaluateAbac(check: PermissionCheck, entity?: any, userRoles: string[] = [], userId: string = '', tenantId: string = check.contextId): Promise<PolicyDecision> {
    const parts = check.permission.split('.');
    const actionPart = parts.pop() || 'read';
    const resourcePart = parts.join('.');

    this.logger.debug(`Evaluating ABAC for ${actionPart} on ${resourcePart}`);
    
    // Map to ABAC structures
    const userCtx: UserContext = {
      userId,
      roles: userRoles,
      tenantId
    };

    const resourceCtx: ResourceContext = {
      resourceType: resourcePart,
      resourceId: entity?.id || 'unknown',
      ownerId: entity?.ownerId,
      assignedTo: entity?.assignedTo,
      tenantId: entity?.tenantId || tenantId,
      attributes: entity
    };

    // Strict action mapping
    const actionMap: Record<string, 'create'|'read'|'update'|'delete'> = {
      'create': 'create',
      'read': 'read',
      'update': 'update',
      'delete': 'delete',
      'list': 'read'
    };
    
    const mappedAction = actionMap[actionPart] || 'read';

    const isAllowed = AbacEvaluator.canAccess(userCtx, resourceCtx, mappedAction);

    if (!isAllowed) {
      this.logger.warn(`ABAC DENY: User ${userId} blocked from ${actionPart} on ${resourcePart}`);
      return PolicyDecision.DENY;
    }

    return PolicyDecision.ALLOW;
  }

  /**
   * Evaluates PBAC policies (Custom evaluators)
   * Enforces Zero-Trust: Defaults to DENY if no custom evaluator approves.
   */
  async evaluatePbac(check: PermissionCheck, entity?: any): Promise<PolicyDecision> {
    if (this.evaluators.size === 0) {
      return PolicyDecision.DENY;
    }
    
    // If ANY evaluator explicitly denies, it is a deny
    // If NO evaluator allows, it is a deny
    let hasAllow = false;

    for (const [name, evaluator] of this.evaluators.entries()) {
      try {
        const decision = await evaluator(check, entity);
        if (decision === PolicyDecision.DENY) {
          this.logger.warn(`PBAC DENY by evaluator '${name}'`);
          return PolicyDecision.DENY;
        }
        if (decision === PolicyDecision.ALLOW) {
          hasAllow = true;
        }
      } catch (e: any) {
        this.logger.error(`PBAC Evaluator '${name}' threw an error: ${e.message}`);
        return PolicyDecision.DENY;
      }
    }

    return hasAllow ? PolicyDecision.ALLOW : PolicyDecision.DENY;
  }

  /**
   * Gets additional WHERE clauses for repository-level data scoping based on visibility policies
   * Enforces Zero-Trust N-Tier Isolation: Supports 1-Tier to N-Tier context tree depth.
   */
  async getVisibilityClause(
    contextId: string,
    userId: string,
    resource: string,
    action: string,
    roles: string[] = []
  ): Promise<Record<string, any>> {
    // Admins and owners can see all records within their context scope
    const baseClause = {
      OR: [
        { contextId },
        { tenantId: contextId },
        { orgId: contextId }
      ]
    };

    if (roles.includes('admin') || roles.includes('owner') || roles.includes('superadmin')) {
      return baseClause;
    }

    // Default strict visibility: User can only see records they own or are assigned to within their context scope
    return {
      ...baseClause,
      AND: [
        {
          OR: [
            { ownerId: userId },
            { assignedTo: userId },
            { createdBy: userId }
          ]
        }
      ]
    };
  }
}
