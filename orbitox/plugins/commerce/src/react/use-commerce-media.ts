'use client';

import { useState, useEffect, useCallback } from 'react';
import { StoreMediaItem, MediaFolderType } from '../domain/types/media.types';
import { StockPresetItem } from '../domain/engines/media/media.engine';
import { commerceEngine } from '../domain/commerce.engine';

export function useCommerceMedia(
  storeId: string = 'store_aura_luxury',
  folder?: MediaFolderType,
  tenantId: string = 'tenant_aura_corp'
) {
  const targetStoreId = storeId || 'store_aura_luxury';
  const targetTenantId = tenantId || 'tenant_aura_corp';

  const [mediaItems, setMediaItems] = useState<StoreMediaItem[]>(() =>
    commerceEngine.media.listMediaByStore(targetStoreId, folder)
  );
  const [stockPresets] = useState<StockPresetItem[]>(() =>
    commerceEngine.media.getCuratedStockPresets()
  );
  const [storageUsedBytes, setStorageUsedBytes] = useState<number>(() =>
    commerceEngine.media.getStorageUsageBytes(targetStoreId)
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  const refreshMedia = useCallback(() => {
    const list = commerceEngine.media.listMediaByStore(targetStoreId, folder, searchQuery);
    setMediaItems([...list]);
    setStorageUsedBytes(commerceEngine.media.getStorageUsageBytes(targetStoreId));
  }, [targetStoreId, folder, searchQuery]);

  useEffect(() => {
    refreshMedia();
  }, [refreshMedia]);

  const addMediaFromUrl = (payload: {
    url: string;
    filename?: string;
    folder?: MediaFolderType;
    altText?: string;
  }) => {
    const item = commerceEngine.media.addMediaFromUrl(targetStoreId, targetTenantId, payload);
    refreshMedia();
    return item;
  };

  const importStockPreset = (preset: StockPresetItem, targetFolder: MediaFolderType = 'general') => {
    const item = commerceEngine.media.addMediaFromUrl(targetStoreId, targetTenantId, {
      url: preset.url,
      filename: `${preset.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`,
      folder: targetFolder,
      altText: preset.altText,
      sizeBytes: 1024 * 450,
    });
    refreshMedia();
    return item;
  };

  const updateMedia = (
    mediaId: string,
    updates: { filename?: string; altText?: string; folder?: MediaFolderType }
  ) => {
    const updated = commerceEngine.media.updateMedia(mediaId, updates);
    refreshMedia();
    return updated;
  };

  const deleteMedia = (mediaId: string) => {
    const success = commerceEngine.media.deleteMedia(mediaId);
    refreshMedia();
    return success;
  };

  return {
    mediaItems,
    stockPresets,
    storageUsedBytes,
    searchQuery,
    setSearchQuery,
    addMediaFromUrl,
    importStockPreset,
    updateMedia,
    deleteMedia,
    refreshMedia,
  };
}
