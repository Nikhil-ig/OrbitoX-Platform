import type { AbacPolicyRule, WorkflowDefinition } from '@orbitox-io/core';

export interface BillingFacadeContract {
  createPlan(
    options: {
      name: string;
      description?: string;
      price: number;
      currency?: string;
      interval?: 'month' | 'year';
      features?: string[];
      limits?: Record<string, number>;
    },
    contextId?: string,
  ): Promise<any>;
  listPlans(contextId?: string): Promise<any[]>;
  updatePlan(planId: string, data: Partial<any>): Promise<any>;
  deletePlan(planId: string): Promise<boolean>;
}

export interface SecurityFacadeContract {
  addAbacPolicy(rule: AbacPolicyRule): void;
  getAbacPolicy(id: string): AbacPolicyRule | undefined;
  updateAbacPolicy(id: string, updates: Partial<AbacPolicyRule>): void;
  deleteAbacPolicy(id: string): void;
}

export interface WorkflowsFacadeContract {
  define(definition: WorkflowDefinition): Promise<void>;
  get(id: string): Promise<WorkflowDefinition>;
  update(id: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition>;
  delete(id: string): Promise<boolean>;
}
