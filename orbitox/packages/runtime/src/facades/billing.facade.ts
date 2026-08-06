/**
 * BillingFacade
 * ─────────────────────────────────────────────────────────────
 * Subscription and plan management for multi-tenant SaaS.
 * Backed by PlanService + SubscriptionService (Stripe-ready).
 */

import { PlanService } from '@orbitox/core';
import { PlanBuilder } from '../builders/plan.builder';

export class BillingFacade {
  constructor(private readonly planSvc: PlanService) {}

  /**
   * Use the fluent builder to create a billing plan easily.
   */
  buildPlan(name: string): PlanBuilder {
    return new PlanBuilder(name, this);
  }

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

  private subscriptions: Map<string, { contextId: string; planId: string; status: string }> = new Map();



  /**
   * Update a billing plan.
   */
  async updatePlan(planId: string, data: Partial<any>): Promise<any> {
    return this.planSvc.updatePlan(planId, data);
  }

  /**
   * Delete a billing plan.
   */
  async deletePlan(planId: string): Promise<boolean> {
    return this.planSvc.deletePlan(planId);
  }

  /**
   * Subscribe a context node (tenant/branch) to a billing plan.
   */
  async subscribeContext(options: { contextId: string; planId: string; paymentMethodId?: string }): Promise<any> {
    const sub = {
      contextId: options.contextId,
      planId: options.planId,
      status: 'active',
      subscribedAt: new Date().toISOString(),
    };
    this.subscriptions.set(options.contextId, sub);
    return sub;
  }

  /**
   * Check if a context node has access to a specific feature via its plan subscription.
   */
  async hasEntitlement(contextId: string, featureId: string): Promise<boolean> {
    const sub = this.subscriptions.get(contextId);
    if (!sub) return false;
    const plan = await this.getPlan(sub.planId);
    if (!plan || !plan.features) return false;
    return plan.features.includes(featureId);
  }

  /**
   * Verify if a context has sufficient quota remaining for a given metric.
   */
  async checkQuota(contextId: string, metric: string, currentUsage: number): Promise<{ allowed: boolean; limit: number; remaining: number }> {
    const sub = this.subscriptions.get(contextId);
    if (!sub) return { allowed: false, limit: 0, remaining: 0 };
    const plan = await this.getPlan(sub.planId);
    if (!plan || !plan.limits) return { allowed: true, limit: -1, remaining: -1 };
    
    const limit = plan.limits[metric] ?? -1;
    if (limit === -1) return { allowed: true, limit: -1, remaining: -1 };
    
    const remaining = Math.max(0, limit - currentUsage);
    return { allowed: currentUsage < limit, limit, remaining };
  }
}
