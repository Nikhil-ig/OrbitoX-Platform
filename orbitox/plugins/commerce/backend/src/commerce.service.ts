import { Injectable, Logger } from '@nestjs/common';
import { commerceEngine, CommerceEngine } from '@orbitox/commerce';

@Injectable()
export class CommerceService {
  private readonly logger = new Logger(CommerceService.name);
  readonly engine: CommerceEngine = commerceEngine;

  constructor() {
    this.logger.log('CommerceService initialized with headless OrbitoX Commerce Engine');
  }

  getDashboardStats(storeId: string) {
    return this.engine.analytics.getStoreAnalytics(storeId);
  }

  resolveStorefront(slugOrDomain: string, pageSlug: string = '/', previewDraft: boolean = false) {
    return this.engine.storefront.resolveStorefront({ slugOrDomain, pageSlug, previewDraft });
  }
}
