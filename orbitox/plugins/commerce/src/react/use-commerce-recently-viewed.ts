'use client';

import { useState, useEffect, useCallback } from 'react';
import { Product } from '../domain/types/product.types';

export function useCommerceRecentlyViewed(storeSlug: string = 'punjabi-jutti', limit: number = 8) {
  const storageKey = `orbitox_recently_viewed_${storeSlug}`;
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setRecentProducts(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load recently viewed:', e);
    }
  }, [storageKey]);

  const trackProduct = useCallback((product: Product) => {
    setRecentProducts((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const updated = [product, ...filtered].slice(0, limit);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, [storageKey, limit]);

  const clearRecentlyViewed = useCallback(() => {
    setRecentProducts([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {}
  }, [storageKey]);

  return {
    recentProducts,
    trackProduct,
    clearRecentlyViewed,
  };
}
