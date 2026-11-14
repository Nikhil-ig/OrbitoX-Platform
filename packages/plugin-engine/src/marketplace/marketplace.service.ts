import { Injectable, Logger } from '@nestjs/common';
import { PluginManifest } from '../metadata/types';

export interface MarketplaceItem {
  id: string;
  packageName: string;
  displayName: string;
  description: string;
  category: string;
  author: string;
  latestVersion: string;
  rating: number;
  installs: number;
  manifest: PluginManifest;
}

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);
  private readonly listings = new Map<string, MarketplaceItem>();

  constructor() {
    this.publishListing({
      id: 'hms',
      packageName: '@orbitox/hms',
      displayName: 'HMS — Healthcare & Patient Care',
      description: 'Patient medical records, MRN generator, triage flow state machines, and appointments.',
      category: 'healthcare',
      author: 'OrbitoX Platform Team',
      latestVersion: '2.4.0',
      rating: 4.9,
      installs: 410,
      manifest: {
        id: 'hms',
        name: '@orbitox/hms',
        version: '2.4.0',
        displayName: 'HMS',
        description: 'HMS healthcare management plugin',
        category: 'healthcare',
        author: 'OrbitoX',
      },
    });

    this.publishListing({
      id: 'restaurant',
      packageName: '@orbitox/restaurant',
      displayName: 'RestaurantOS — Dining & Kitchen',
      description: 'Multi-tenant restaurant ordering, QR table sessions, kitchen display queues, and billing.',
      category: 'hospitality',
      author: 'OrbitoX Platform Team',
      latestVersion: '2.2.0',
      rating: 4.9,
      installs: 680,
      manifest: {
        id: 'restaurant',
        name: '@orbitox/restaurant',
        version: '2.2.0',
        displayName: 'RestaurantOS',
        description: 'Hospitality & kitchen orchestration plugin',
        category: 'hospitality',
        author: 'OrbitoX',
      },
    });
  }

  publishListing(item: MarketplaceItem): void {
    this.listings.set(item.id, item);
    this.logger.log(`Published marketplace listing: ${item.displayName} (${item.packageName})`);
  }

  getListings(category?: string): MarketplaceItem[] {
    const all = Array.from(this.listings.values());
    if (category) {
      return all.filter((item) => item.category === category);
    }
    return all;
  }

  getListing(pluginId: string): MarketplaceItem | undefined {
    return this.listings.get(pluginId);
  }
}
