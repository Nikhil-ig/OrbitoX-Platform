import { useState, useEffect, useCallback } from 'react';
import { Store, CreateStorePayload, UpdateStorePayload } from '../domain/types/store.types';
import { commerceEngine } from '../domain/commerce.engine';

const ACTIVE_STORE_STORAGE_KEY = 'orbitox_active_store_id';

export function useCommerceStore(storeIdOrSlug?: string, tenantId: string = 'tenant_aura_corp') {
  const [store, setStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshStores = useCallback(() => {
    setLoading(true);
    const list = commerceEngine.stores.listStoresByTenant(tenantId);
    setStores(list);

    const savedActiveId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_STORE_STORAGE_KEY) : null;
    const targetLookup = storeIdOrSlug || savedActiveId;

    if (targetLookup) {
      let matched = commerceEngine.stores.getStoreById(targetLookup, tenantId);
      if (!matched) {
        matched = commerceEngine.stores.getStoreBySlug(targetLookup);
      }
      setStore(matched || list[0] || null);
    } else {
      setStore(list[0] || null);
    }
    setLoading(false);
  }, [storeIdOrSlug, tenantId]);

  useEffect(() => {
    refreshStores();

    if (typeof window === 'undefined') return;

    const handleActiveChanged = (e: any) => {
      const newId = e.detail;
      const matched = commerceEngine.stores.getStoreById(newId, tenantId) || commerceEngine.stores.getStoreBySlug(newId);
      if (matched) {
        setStore(matched);
      } else {
        refreshStores();
      }
    };

    window.addEventListener('orbitox:active_store_changed', handleActiveChanged);
    window.addEventListener('orbitox:store_updated', refreshStores);

    return () => {
      window.removeEventListener('orbitox:active_store_changed', handleActiveChanged);
      window.removeEventListener('orbitox:store_updated', refreshStores);
    };
  }, [refreshStores, tenantId]);

  const createStore = (payload: CreateStorePayload) => {
    const created = commerceEngine.stores.createStore(tenantId, payload);
    refreshStores();
    return created;
  };

  const updateStore = (updates: UpdateStorePayload) => {
    if (!store) throw new Error('No active store selected');
    const updated = commerceEngine.stores.updateStore(store.id, updates, tenantId);
    setStore(updated);
    refreshStores();
    return updated;
  };

  const publishStore = () => {
    if (!store) throw new Error('No active store selected');
    const result = commerceEngine.stores.publishStore(store.id);
    setStore(result.store);
    refreshStores();
    return result;
  };

  return {
    store,
    stores,
    loading,
    createStore,
    updateStore,
    publishStore,
    refreshStores,
  };
}
