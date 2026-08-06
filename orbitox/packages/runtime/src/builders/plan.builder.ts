import { BillingFacade } from '../facades/billing.facade';

export class PlanBuilder {
  private _description?: string;
  private _price: number = 0;
  private _currency: string = 'USD';
  private _interval: 'month' | 'year' = 'month';
  private _features: string[] = [];
  private _limits: Record<string, number> = {};

  constructor(
    private readonly name: string,
    private readonly billingFacade: BillingFacade
  ) {}

  description(desc: string): this {
    this._description = desc;
    return this;
  }

  price(amount: number, currency: string = 'USD', interval: 'month' | 'year' = 'month'): this {
    this._price = amount;
    this._currency = currency;
    this._interval = interval;
    return this;
  }

  includeFeatures(...features: string[]): this {
    this._features.push(...features);
    return this;
  }

  limit(metric: string, value: number): this {
    this._limits[metric] = value;
    return this;
  }

  async publish(contextId: string = 'global'): Promise<any> {
    return this.billingFacade.createPlan({
      name: this.name,
      description: this._description,
      price: this._price,
      currency: this._currency,
      interval: this._interval,
      features: this._features,
      limits: this._limits,
    }, contextId);
  }

  async get(): Promise<any> {
    const plans = await this.billingFacade.listPlans();
    return plans.find(p => p.name === this.name);
  }

  async update(): Promise<any> {
    const existing = await this.get();
    if (!existing) throw new Error(`Plan '${this.name}' does not exist.`);

    return this.billingFacade.updatePlan(existing.id, {
      description: this._description || existing.description,
      price: this._price > 0 ? this._price : existing.price,
      currency: this._currency || existing.currency,
      interval: this._interval || existing.interval,
      features: this._features.length > 0 ? this._features : existing.features,
      limits: Object.keys(this._limits).length > 0 ? this._limits : existing.limits,
    });
  }

  async delete(): Promise<boolean> {
    const existing = await this.get();
    if (!existing) return false;
    return this.billingFacade.deletePlan(existing.id);
  }
}
