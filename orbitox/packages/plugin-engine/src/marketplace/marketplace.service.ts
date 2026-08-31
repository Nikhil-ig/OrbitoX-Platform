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
      id: 'crm',
      packageName: '@orbitox/crm',
      displayName: 'CRM — Leads & Customers',
      description: 'Headless sales pipeline, lead scoring, deal conversion, and customer management.',
      category: 'sales',
      author: 'OrbitoX Platform Team',
      latestVersion: '1.0.0',
      rating: 4.9,
      installs: 1420,
      manifest: {
        id: 'crm',
        name: '@orbitox/crm',
        version: '1.0.0',
        displayName: 'CRM',
        description: 'CRM plugin',
        category: 'sales',
        author: 'OrbitoX',
      },
    });

    this.publishListing({
      id: 'inventory',
      packageName: '@orbitox/inventory',
      displayName: 'Inventory & Stock Logistics',
      description: 'Multi-warehouse stock levels, reorder thresholds, SKU tracking, and inventory adjustments.',
      category: 'logistics',
      author: 'OrbitoX Platform Team',
      latestVersion: '1.0.0',
      rating: 4.8,
      installs: 980,
      manifest: {
        id: 'inventory',
        name: '@orbitox/inventory',
        version: '1.0.0',
        displayName: 'Inventory',
        description: 'Inventory logistics plugin',
        category: 'logistics',
        author: 'OrbitoX',
      },
    });

    this.publishListing({
      id: 'hrms',
      packageName: '@orbitox/hrms',
      displayName: 'HRMS — Employee Management',
      description: 'Headless employee profiles, onboarding workflows, leave tracking, and department organization.',
      category: 'hr',
      author: 'OrbitoX Platform Team',
      latestVersion: '1.0.0',
      rating: 4.7,
      installs: 620,
      manifest: {
        id: 'hrms',
        name: '@orbitox/hrms',
        version: '1.0.0',
        displayName: 'HRMS',
        description: 'HRMS employee management plugin',
        category: 'hr',
        author: 'OrbitoX',
      },
    });

    this.publishListing({
      id: 'hms',
      packageName: '@orbitox/hms',
      displayName: 'HMS — Healthcare & Patient Care',
      description: 'Patient medical records, MRN generator, triage flow state machines, and appointments.',
      category: 'healthcare',
      author: 'OrbitoX Platform Team',
      latestVersion: '1.0.0',
      rating: 4.9,
      installs: 410,
      manifest: {
        id: 'hms',
        name: '@orbitox/hms',
        version: '1.0.0',
        displayName: 'HMS',
        description: 'HMS healthcare management plugin',
        category: 'healthcare',
        author: 'OrbitoX',
      },
    });

    this.publishListing({
      id: 'finance',
      packageName: '@orbitox/finance',
      displayName: 'Finance & Invoicing Engine',
      description: 'Headless ledger accounting, tax calculation engine, invoice status machine, and billing logs.',
      category: 'finance',
      author: 'OrbitoX Platform Team',
      latestVersion: '1.0.0',
      rating: 4.95,
      installs: 1150,
      manifest: {
        id: 'finance',
        name: '@orbitox/finance',
        version: '1.0.0',
        displayName: 'Finance',
        description: 'Finance and accounting plugin',
        category: 'finance',
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
