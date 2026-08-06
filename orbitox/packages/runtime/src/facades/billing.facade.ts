/**
 * BillingFacade
 * ─────────────────────────────────────────────────────────────
 * Subscription and plan management for multi-tenant SaaS.
 * Backed by PlanService + SubscriptionService (Stripe-ready).
 */

import { PlanService } from '@orbitox/core';

export class BillingFacade {
  constructor(private readonly planSvc: PlanService) {}

  /**
   * Create a billing plan.
   * @example
   * await orbitox.billing.createPlan({
   *   name: 'Professional',
   *   price: 99,
   *   currency: 'USD',
   *   interval: 'month',
   *   features: ['CRM', 'Analytics', 'AI Assistant'],
   *   limits: { users: 25, leads: 10000 }
   * });
   */
  async createPlan(options: {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    interval?: 'month' | 'year';
    features?: string[];
    limits?: Record<string, number>;
  }, contextId: string = 'global'): Promise<any> {
    return this.planSvc.createPlan(contextId, {
      name: options.name,
      description: options.description || options.name,
      price: options.price,
      currency: options.currency || 'USD',
      interval: options.interval || 'month',
      features: options.features || [],
      limits: options.limits || {},
    });
  }

  /**
   * Get a plan by ID.
   */
  async getPlan(planId: string): Promise<any> {
    return this.planSvc.getPlan(planId);
  }

  /**
   * List all active plans for a context.
   */
  async listPlans(contextId: string = 'global'): Promise<any[]> {
    return this.planSvc.listActivePlans(contextId);
  }
}
