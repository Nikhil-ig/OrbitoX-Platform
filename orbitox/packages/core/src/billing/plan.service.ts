import { Injectable, NotFoundException } from '@nestjs/common';
import { Plan } from '@orbitox/types';
import { v4 as uuidv4 } from 'uuid';

export interface CreatePlanDto {
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: Record<string, number>;
  stripeProductId?: string;
  stripePriceId?: string;
}

@Injectable()
export class PlanService {
  private plans = new Map<string, Plan>();

  async createPlan(contextId: string, data: CreatePlanDto): Promise<Plan> {
    const id = uuidv4();
    const plan: Plan = {
      id,
      contextId,
      name: data.name,
      description: data.description,
      price: data.price,
      currency: data.currency,
      interval: data.interval,
      features: data.features,
      limits: data.limits,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Additional implementation for DB + Stripe mappings
    this.plans.set(id, plan);
    return plan;
  }

  async getPlan(planId: string): Promise<Plan> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`);
    }
    return plan;
  }

  async listActivePlans(contextId: string): Promise<Plan[]> {
    return Array.from(this.plans.values()).filter(p => p.isActive && (p.contextId === contextId || !p.contextId));
  }

  async updatePlan(planId: string, data: Partial<CreatePlanDto>): Promise<Plan> {
    const plan = await this.getPlan(planId);
    const updated = {
      ...plan,
      ...data,
      updatedAt: new Date()
    };
    
    // Deep merge limits
    if (data.limits) {
      updated.limits = { ...plan.limits, ...data.limits };
    }
    
    this.plans.set(planId, updated);
    return updated;
  }

  async deletePlan(planId: string): Promise<boolean> {
    const plan = await this.getPlan(planId);
    // Soft delete
    plan.isActive = false;
    plan.updatedAt = new Date();
    this.plans.set(planId, plan);
    return true; // Soft delete success
  }
}
