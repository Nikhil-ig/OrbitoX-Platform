import { useState, useEffect, useCallback } from 'react';
import { StorefrontResolvedPayload } from '../domain/types/storefront.types';
import { commerceEngine } from '../domain/commerce.engine';

export function useCommerceStorefront(slugOrDomain: string = 'aura-luxury', pageSlug: string = '/', previewDraft: boolean = false) {
  const targetSlug = slugOrDomain || 'aura-luxury';

  const [data, setData] = useState<StorefrontResolvedPayload | null>(() => {
    return commerceEngine.storefront.resolveStorefrontSync({
      slugOrDomain: targetSlug,
      pageSlug,
      previewDraft,
    });
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(() => {
    if (!slugOrDomain) return;
    try {
      const payload = commerceEngine.storefront.resolveStorefrontSync({
        slugOrDomain,
        pageSlug,
        previewDraft,
      });
      if (!payload) {
        setError(`Store or page not found for '${slugOrDomain}'`);
      } else {
        setData(payload);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to render storefront');
    }
  }, [slugOrDomain, pageSlug, previewDraft]);

  useEffect(() => {
    resolve();

    if (typeof window === 'undefined') return;

    // Listen for custom events dispatched on same tab
    const handlePublished = () => {
      resolve();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'orbitox_commerce_pages' || e.key === 'orbitox_commerce_stores' || e.key === 'orbitox_commerce_themes') {
        resolve();
      }
    };

    window.addEventListener('orbitox:storefront:published', handlePublished);
    window.addEventListener('orbitox:pages_updated', handlePublished);
    window.addEventListener('storage', handleStorage);

    // Cross-tab Broadcast Channel listener
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('orbitox_commerce_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'STOREFRONT_PUBLISHED' || event.data?.type === 'PAGES_UPDATED') {
          resolve();
        }
      };
    }

    return () => {
      window.removeEventListener('orbitox:storefront:published', handlePublished);
      window.removeEventListener('orbitox:pages_updated', handlePublished);
      window.removeEventListener('storage', handleStorage);
      if (channel) {
        channel.close();
      }
    };
  }, [resolve]);

  return {
    data,
    loading,
    error,
    reload: resolve,
  };
}
