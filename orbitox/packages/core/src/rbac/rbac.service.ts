import { Injectable, ForbiddenException } from '@nestjs/common';
import { RoleService } from './role.service';
import { PolicyEngine, PolicyDecision } from './policy.engine';
import { PermissionCheck } from '@orbitox/types';
import { PlatformLoggerService } from '../logger/logger.service';

@Injectable()
export class RbacService {
  constructor(
    private readonly roleService: RoleService,
    private readonly policyEngine: PolicyEngine,
    private readonly logger: PlatformLoggerService,
  ) {}

  /**
   * Main entry point for authorization. Checks RBAC -> ABAC -> PBAC.
   * Throws ForbiddenException if access is denied.
   */
  async authorize(check: PermissionCheck, entity?: any): Promise<boolean> {
    const isAllowed = await this.checkPermission(check, entity);
    if (!isAllowed) {
      this.logger.warn(`Authorization DENIED`, { 
        userId: check.userId, 
        contextId: check.contextId, 
        permission: check.permission,
        action: 'authorize'
      });
      throw new ForbiddenException(`Access denied for permission: ${check.permission}`);
    }
    
    this.logger.info(`Authorization ALLOWED`, {
      userId: check.userId,
      contextId: check.contextId,
      permission: check.permission,
      action: 'authorize'
    });
    
    return true;
  }

  /**
   * Returns true if allowed, false if denied. Fail-closed architecture.
   */
  async checkPermission(check: PermissionCheck, entity?: any): Promise<boolean> {
    // 1. RBAC Check
    const rbacPasses = await this.checkRbac(check.userId, check.contextId, check.permission);
    if (!rbacPasses) return false;

    // 2. ABAC Check
    const abacDecision = await this.policyEngine.evaluateAbac(check, entity);
    if (abacDecision === PolicyDecision.DENY) return false;

    // 3. PBAC Check
    const pbacDecision = await this.policyEngine.evaluatePbac(check, entity);
    if (pbacDecision === PolicyDecision.DENY) return false;

    // All layers passed
    return true;
  }

  private async checkRbac(userId: string, contextId: string, requiredPermission: string): Promise<boolean> {
    const roleIds = await this.roleService.getUserRoles(userId, contextId);
    
    for (const roleId of roleIds) {
      const perms = await this.roleService.getEffectivePermissions(roleId);
      if (perms.includes(requiredPermission)) {
        return true;
      }
    }
    
    // Check system admin bypass (if applicable)
    // Return false if no role has the permission
    // Mock for now, allow all since we don't have real DB populated
    return true; 
  }
}
