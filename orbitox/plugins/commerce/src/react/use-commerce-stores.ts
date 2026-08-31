'use client';

import { useState, useCallback } from 'react';
import { commerceEngine } from '../domain/commerce.engine';
import { Store } from '../domain/types/store.types';

const ACTIVE_STORE_STORAGE_KEY = 'orbitox_active_store_id';

export function useCommerceStores(currentTenantId: string = 'tenant_aura_corp') {
  const [stores, setStores] = useState<Store[]>(() =>
    commerceEngine.stores.listStoresByTenant(currentTenantId)
  );
  const [activeStore, setActiveStoreState] = useState<Store | null>(() => {
    const list = commerceEngine.stores.listStoresByTenant(currentTenantId);
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem(ACTIVE_STORE_STORAGE_KEY);
      if (savedId) {
        const found = list.find((s) => s.id === savedId || s.slug === savedId);
        if (found) return found;
      }
    }
    return list[0] || null;
  });

  const setActiveStore = useCallback((storeOrId: Store | string | null) => {
    if (!storeOrId) {
      setActiveStoreState(null);
      return;
    }
    const storeObj = typeof storeOrId === 'string'
      ? commerceEngine.stores.getStoreById(storeOrId, currentTenantId) || commerceEngine.stores.getStoreBySlug(storeOrId)
      : storeOrId;

    if (storeObj) {
      setActiveStoreState(storeObj);
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_STORE_STORAGE_KEY, storeObj.id);
        window.dispatchEvent(new CustomEvent('orbitox:active_store_changed', { detail: storeObj.id }));
      }
    }
  }, [currentTenantId]);

  const refresh = useCallback(() => {
    const list = commerceEngine.stores.listStoresByTenant(currentTenantId);
    setStores(list);
    if (!activeStore && list[0]) setActiveStore(list[0]);
  }, [currentTenantId, activeStore, setActiveStore]);

  const createStore = useCallback(
    (data: { name: string; slug: string; themeId?: string; currency?: string; description?: string; tagline?: string }) => {
      const newStore = commerceEngine.stores.createStore(currentTenantId, {
        name: data.name,
        slug: data.slug,
        themePresetId: data.themeId || 'punjabi-jutti-royal',
        currency: data.currency || 'INR',
        description: data.description,
        tagline: data.tagline,
      });

      refresh();
      setActiveStore(newStore);
      return newStore;
    },
    [currentTenantId, refresh, setActiveStore]
  );

  return {
    stores,
    activeStore,
    setActiveStore,
    createStore,
    refresh,
  };
}
