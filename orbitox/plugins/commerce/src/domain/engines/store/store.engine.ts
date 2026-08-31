import { Store, CreateStorePayload, UpdateStorePayload } from '../../types/store.types';
import { COMMERCE_THEME_PRESETS } from '../theme/theme.presets';

const STORE_STORAGE_KEY = 'orbitox_commerce_stores';

export class StoreEngine {
  private stores: Map<string, Store> = new Map();

  constructor(initialStores: Store[] = []) {
    for (const store of initialStores) {
      this.stores.set(store.id, store);
    }
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORE_STORAGE_KEY);
      if (raw) {
        const list: Store[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const s of list) {
            this.stores.set(s.id, s);
          }
        }
      }
    } catch (e) {
      console.warn('[StoreEngine] Failed to hydrate stores from localStorage', e);
    }
  }

  private persistToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.from(this.stores.values());
      localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('orbitox:store_updated', { detail: list }));
    } catch (e) {
      console.warn('[StoreEngine] Failed to persist stores to localStorage', e);
    }
  }

  createStore(tenantId: string, payload: CreateStorePayload): Store {
    this.hydrateFromStorage();
    if (!payload.name || !payload.slug) {
      throw new Error('Store creation failed: name and slug are required.');
    }

    const cleanSlug = payload.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    
    // Check if slug already taken
    const existing = Array.from(this.stores.values()).find((s) => s.slug === cleanSlug);
    if (existing) {
      throw new Error(`Store slug '${cleanSlug}' is already taken.`);
    }

    const selectedPresetId = payload.themePresetId || COMMERCE_THEME_PRESETS[0]!.id;
    const now = new Date().toISOString();

    const newStore: Store = {
      id: `store_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      slug: cleanSlug,
      name: payload.name.trim(),
      tagline: payload.tagline?.trim(),
      description: payload.description?.trim(),
      logoUrl: payload.logoUrl,
      status: 'active',
      customDomains: [],
      currentVersion: 1,
      publishedVersion: 1,
      activeThemeId: selectedPresetId,
      settings: {
        currency: payload.currency || 'USD',
        currencySymbol: payload.currency === 'INR' ? '₹' : payload.currency === 'EUR' ? '€' : '$',
        timezone: 'UTC',
        locale: 'en-US',
        taxRatePercent: 0,
        pricesIncludeTax: true,
        allowGuestCheckout: true,
        inventoryTrackingEnabled: true,
        lowStockThreshold: 5,
        defaultShippingFee: 0,
        announcementEnabled: true,
        announcementText: '✨ FREE EXPRESS SHIPPING ON ALL ORDERS OVER $100',
        ...(payload.settings || {}),
      },
      createdAt: now,
      updatedAt: now,
    };

    this.stores.set(newStore.id, newStore);
    this.persistToStorage();
    return newStore;
  }

  getStoreById(storeId: string, tenantId?: string): Store | null {
    this.hydrateFromStorage();
    const store = this.stores.get(storeId);
    if (!store) return null;
    if (tenantId && store.tenantId !== tenantId) return null;
    return store;
  }

  getStoreBySlug(slug: string): Store | null {
    this.hydrateFromStorage();
    const cleanSlug = slug.toLowerCase().trim();
    for (const store of this.stores.values()) {
      if (store.slug === cleanSlug) return store;
    }
    return null;
  }

  resolveStoreByHostname(hostname: string): Store | null {
    this.hydrateFromStorage();
    const cleanHost = hostname.toLowerCase().trim().replace(/:\d+$/, ''); // Strip port
    
    for (const store of this.stores.values()) {
      if (store.primaryDomain && store.primaryDomain.toLowerCase() === cleanHost) {
        return store;
      }
      if (store.customDomains.some((d) => d.toLowerCase() === cleanHost)) {
        return store;
      }
      // Subdomain check e.g. "aura.orbitox.com"
      const subdomain = cleanHost.split('.')[0];
      if (subdomain && store.slug === subdomain) {
        return store;
      }
    }

    return null;
  }

  listStoresByTenant(tenantId: string): Store[] {
    this.hydrateFromStorage();
    return Array.from(this.stores.values()).filter((s) => s.tenantId === tenantId);
  }

  updateStore(storeId: string, payload: UpdateStorePayload, tenantId?: string): Store {
    this.hydrateFromStorage();
    const store = this.getStoreById(storeId, tenantId);
    if (!store) {
      throw new Error(`Store with id '${storeId}' not found.`);
    }

    const updated: Store = {
      ...store,
      name: payload.name !== undefined ? payload.name.trim() : store.name,
      tagline: payload.tagline !== undefined ? payload.tagline?.trim() : store.tagline,
      description: payload.description !== undefined ? payload.description?.trim() : store.description,
      logoUrl: payload.logoUrl !== undefined ? payload.logoUrl : store.logoUrl,
      faviconUrl: payload.faviconUrl !== undefined ? payload.faviconUrl : store.faviconUrl,
      status: payload.status !== undefined ? payload.status : store.status,
      primaryDomain: payload.primaryDomain !== undefined ? payload.primaryDomain : store.primaryDomain,
      activeThemeId: payload.activeThemeId !== undefined ? payload.activeThemeId : store.activeThemeId,
      settings: {
        ...store.settings,
        ...(payload.settings || {}),
      },
      updatedAt: new Date().toISOString(),
    };

    this.stores.set(storeId, updated);
    this.persistToStorage();
    return updated;
  }

  incrementDraftVersion(storeId: string): Store {
    this.hydrateFromStorage();
    const store = this.stores.get(storeId);
    if (!store) throw new Error(`Store '${storeId}' not found`);

    store.currentVersion += 1;
    store.updatedAt = new Date().toISOString();
    this.persistToStorage();
    return store;
  }

  publishStore(storeId: string): { store: Store; publishedVersion: number } {
    this.hydrateFromStorage();
    const store = this.stores.get(storeId);
    if (!store) throw new Error(`Store '${storeId}' not found`);

    store.publishedVersion = store.currentVersion;
    store.updatedAt = new Date().toISOString();
    this.persistToStorage();
    return { store, publishedVersion: store.publishedVersion };
  }
}
