/**
 * SecurityFacade
 * ─────────────────────────────────────────────────────────────
 * Zero-Trust RBAC → ABAC → PBAC enforcement in one simple API.
 * 
 * In 'open' mode (default): all permissions are granted.
 * In 'strict' mode: full 3-layer evaluation required.
 * 
 * Register custom PBAC evaluators to extend behaviour:
 *   orbitox.security.addPolicy('ip-restrict', async (check) => { ... });
 */

import { RbacService, PolicyEngine, PolicyDecision, AbacPolicyRule, AbacEvaluator, PiiService } from '@orbitox/core';
import { PolicyBuilder } from '../builders/policy.builder';

export class SecurityFacade {
  constructor(
    private readonly rbac: RbacService,
    private readonly policyEngine: PolicyEngine,
    private readonly mode: 'open' | 'strict',
    private readonly piiService: PiiService,
  ) {}

  /**
   * Use the fluent builder to create a security policy easily.
   */
  policy(id: string): PolicyBuilder {
    return new PolicyBuilder(id, this);
  }

  /**
   * Deeply sanitizes an object by masking PII fields (emails, phones, credit cards, secrets).
   * Used for logging and displaying data safely.
   */
  sanitizePii(data: any): any {
    return this.piiService.sanitize(data);
  }

  /**
   * Authorize a user. Throws OrbitoXForbiddenError on denial.
   * Use this in API routes where you want hard enforcement.
   */
  async authorize(userId: string, permission: string, contextId: string = 'global'): Promise<void> {
    const allowed = await this.check(userId, permission, contextId);
    if (!allowed) {
      throw new Error(`[OrbitoX Security] Access denied: '${userId}' lacks permission '${permission}' in context '${contextId}'`);
    }
  }

  /**
   * Softly check a permission. Returns boolean, never throws.
   * Use this for conditional UI rendering or feature availability.
   */
  async check(userId: string, permission: string, contextId: string = 'global'): Promise<boolean> {
    // In open mode: always allow. Perfect for prototyping.
    if (this.mode === 'open') return true;
    return this.rbac.checkPermission({ userId, permission, contextId });
  }

  /**
   * Check multiple permissions at once. Returns a map of permission → boolean.
   * @example
   * const perms = await orbitox.security.checkMany('user_1', ['leads.create', 'leads.delete']);
   */
  async checkMany(userId: string, permissions: string[], contextId: string = 'global'): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    await Promise.all(
      permissions.map(async (p) => {
        results[p] = await this.check(userId, p, contextId);
      })
    );
    return results;
  }

  /**
   * Register a custom ABAC policy rule (JSON Logic).
   * @example
   * orbitox.security.addAbacPolicy({
   *   id: 'own-records-only',
   *   resourceType: 'lead',
   *   action: 'delete',
   *   rule: { "==": [{ "var": "resource.ownerId" }, { "var": "user.userId" }] }
   * });
   */
  addAbacPolicy(rule: AbacPolicyRule): void {
    AbacEvaluator.registerPolicy(rule);
  }

  /**
   * Get a custom ABAC policy rule.
   */
  getAbacPolicy(id: string): AbacPolicyRule | undefined {
    return AbacEvaluator.getPolicy(id);
  }

  /**
   * Update a custom ABAC policy rule.
   */
  updateAbacPolicy(id: string, updates: Partial<AbacPolicyRule>): void {
    AbacEvaluator.updatePolicy(id, updates);
  }

  /**
   * Delete a custom ABAC policy rule.
   */
  deleteAbacPolicy(id: string): void {
    AbacEvaluator.deletePolicy(id);
  }

  /**
   * Register a custom PBAC evaluator function.
   * @example
   * orbitox.security.addPolicy('ip-restrict', async (check) => {
   *   if (blockedIps.includes(check.ip)) return PolicyDecision.DENY;
   *   return PolicyDecision.ALLOW;
   * });
   */
  addPolicy(name: string, evaluator: (check: any) => Promise<PolicyDecision>): void {
    this.policyEngine.registerEvaluator(name, evaluator);
  }

  /**
   * Get a data visibility clause (WHERE conditions) for a repository query.
   * Respects roles: admins see all, others see only their own/assigned records.
   */
  async getVisibilityClause(contextId: string, userId: string, resource: string): Promise<Record<string, any>> {
    if (this.mode === 'open') return { contextId };
    return this.policyEngine.getVisibilityClause(contextId, userId, resource, 'read');
  }

  /**
   * Immutable Hierarchy Write Protection:
   * Strips hierarchy context IDs (contextId, tenantId, orgId, companyId, branchId, parentId)
   * on UPDATE payloads to prevent cross-tenant privilege escalation or context spoofing.
   */
  sanitizeWritePayload(payload: any, isUpdate: boolean = true): any {
    if (!payload || typeof payload !== 'object') return payload;
    const sanitized = { ...payload };

    if (isUpdate) {
      const immutableFields = ['contextId', 'tenantId', 'orgId', 'organisationId', 'companyId', 'branchId', 'parentId', 'rootId'];
      for (const field of immutableFields) {
        delete sanitized[field];
      }
    }

    return sanitized;
  }

  /**
   * IDOR Attack Prevention:
   * Enforces strict boundary checks. If targetContextId is outside the userContextId hierarchy,
   * throws a 404 Not Found exception (instead of 403) to prevent resource probing scanning.
   */
  enforceContextBoundary(userContextId: string, targetContextId: string): void {
    if (userContextId === 'platform_root' || userContextId === 'global') return;
    if (userContextId !== targetContextId) {
      const error: any = new Error(`Resource not found`);
      error.status = 404;
      error.statusCode = 404;
      throw error;
    }
  }
}
