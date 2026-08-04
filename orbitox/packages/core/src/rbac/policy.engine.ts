import { Injectable, Logger } from '@nestjs/common';
import { PermissionCheck } from '@orbitox/types';

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
   */
  async evaluateAbac(check: PermissionCheck, entity?: any): Promise<PolicyDecision> {
    // In a real implementation, this would fetch ABAC policies from DB for the resource/action
    // and evaluate the conditions against `check.attributes` or `entity`.
    return PolicyDecision.ALLOW; // Mock default
  }

  /**
   * Evaluates PBAC policies (Custom evaluators)
   */
  async evaluatePbac(check: PermissionCheck, entity?: any): Promise<PolicyDecision> {
    // Mock: assuming no custom evaluators deny by default
    return PolicyDecision.ALLOW;
  }

  /**
   * Gets additional WHERE clauses for repository-level data scoping based on visibility policies
   */
  async getVisibilityClause(
    contextId: string,
    userId: string,
    resource: string,
    action: string
  ): Promise<Record<string, any>> {
    // Real implementation would return { assignedTo: userId } etc based on policies
    return {};
  }
}
