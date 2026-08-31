'use client';

import { useState, useEffect, useCallback } from 'react';
import { Product } from '../domain/types/product.types';

export interface WishlistItem {
  productId: string;
  product: Product;
  addedAt: string;
}

export function useCommerceWishlist(storeSlug: string = 'punjabi-jutti') {
  const storageKey = `orbitox_wishlist_${storeSlug}`;
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load wishlist:', e);
    }
    setIsInitialized(true);
  }, [storageKey]);

  // Save to localStorage & broadcast event
  const saveItems = useCallback((newItems: WishlistItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newItems));
      window.dispatchEvent(new CustomEvent('orbitox:wishlist_changed', { detail: { storeSlug, count: newItems.length } }));
    } catch (e) {
      console.error('Failed to save wishlist:', e);
    }
  }, [storageKey, storeSlug]);

  const toggleWishlist = useCallback((product: Product) => {
    setItems((prev) => {
      const exists = prev.some((item) => item.productId === product.id);
      let updated: WishlistItem[];
      if (exists) {
        updated = prev.filter((item) => item.productId !== product.id);
      } else {
        updated = [...prev, { productId: product.id, product, addedAt: new Date().toISOString() }];
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('orbitox:wishlist_changed', { detail: { storeSlug, count: updated.length } }));
      } catch (e) {}
      return updated;
    });
  }, [storageKey, storeSlug]);

  const isInWishlist = useCallback((productId: string) => {
    return items.some((item) => item.productId === productId);
  }, [items]);

  const removeItem = useCallback((productId: string) => {
    const updated = items.filter((item) => item.productId !== productId);
    saveItems(updated);
  }, [items, saveItems]);

  const clearWishlist = useCallback(() => {
    saveItems([]);
  }, [saveItems]);

  return {
    items,
    count: items.length,
    isInitialized,
    toggleWishlist,
    isInWishlist,
    removeItem,
    clearWishlist,
  };
}
