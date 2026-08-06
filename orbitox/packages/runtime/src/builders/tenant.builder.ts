import { ContextFacade } from '../facades/context.facade';
import { BillingFacade } from '../facades/billing.facade';
import { FeaturesFacade } from '../facades/features.facade';
import { PlatformContextType, Context } from '@orbitox/core';

export class TenantBuilder {
  private _parentId?: string;
  private _type: PlatformContextType = 'tenant';
  private _ownerId: string = 'system';
  private _locale?: string;
  private _currency?: string;
  private _timezone?: string;
  private _settings: Record<string, any> = {};
  
  private _planId?: string;
  private _featuresToEnable: string[] = [];
  private _featuresToDisable: string[] = [];

  constructor(
    private readonly slug: string,
    private readonly displayName: string,
    private readonly contextFacade: ContextFacade,
    private readonly billingFacade: BillingFacade,
    private readonly featuresFacade: FeaturesFacade
  ) {}

  parent(parentId: string): this {
    this._parentId = parentId;
    return this;
  }

  type(type: PlatformContextType): this {
    this._type = type;
    return this;
  }

  owner(ownerId: string): this {
    this._ownerId = ownerId;
    return this;
  }

  locale(locale: string): this {
    this._locale = locale;
    return this;
  }

  currency(currency: string): this {
    this._currency = currency;
    return this;
  }

  timezone(timezone: string): this {
    this._timezone = timezone;
    return this;
  }

  settings(settings: Record<string, any>): this {
    this._settings = { ...this._settings, ...settings };
    return this;
  }

  subscribe(planId: string): this {
    this._planId = planId;
    return this;
  }

  enableFeature(featureId: string): this {
    this._featuresToEnable.push(featureId);
    return this;
  }

  disableFeature(featureId: string): this {
    this._featuresToDisable.push(featureId);
    return this;
  }

  async create(): Promise<Context> {
    const ctx = this.contextFacade.create({
      slug: this.slug,
      displayName: this.displayName,
      type: this._type,
      parentId: this._parentId,
      ownerId: this._ownerId,
      locale: this._locale,
      currency: this._currency,
      timezone: this._timezone,
      settings: this._settings,
    });

    if (this._planId) {
      await this.billingFacade.subscribeContext({
        contextId: ctx.id,
        planId: this._planId,
      });
    }

    for (const featureId of this._featuresToEnable) {
      await this.featuresFacade.setOverride(featureId, ctx.id, true);
    }

    for (const featureId of this._featuresToDisable) {
      await this.featuresFacade.setOverride(featureId, ctx.id, false);
    }

    return ctx;
  }

  get(): Context | undefined {
    return this.contextFacade.get(this.slug, this._parentId);
  }

  async update(): Promise<Context> {
    const existing = this.get();
    if (!existing) throw new Error(`Cannot update: Tenant '${this.slug}' does not exist under specified parent scope.`);

    const ctx = this.contextFacade.update(existing.id, {
      displayName: this.displayName,
      type: this._type,
      ownerId: this._ownerId,
      locale: this._locale,
      currency: this._currency,
      timezone: this._timezone,
      settings: this._settings,
    }, this._parentId);

    if (this._planId) {
      await this.billingFacade.subscribeContext({
        contextId: ctx.id,
        planId: this._planId,
      });
    }

    for (const featureId of this._featuresToEnable) {
      await this.featuresFacade.setOverride(featureId, ctx.id, true);
    }

    for (const featureId of this._featuresToDisable) {
      await this.featuresFacade.setOverride(featureId, ctx.id, false);
    }

    return ctx;
  }

  delete(): boolean {
    const existing = this.get();
    if (!existing) return false;
    return this.contextFacade.delete(existing.id, this._parentId);
  }
}
