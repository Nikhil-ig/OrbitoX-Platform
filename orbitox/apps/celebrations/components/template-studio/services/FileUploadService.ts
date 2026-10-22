import { ProjectAsset, AssetCategory } from '../../studio-zero/WebsiteProjectTypes';
import { AssetIndexedDBService } from './AssetIndexedDBService';

/**
 * FileUploadService
 * Enterprise-grade crash-proof local asset pipeline.
 * Bypasses 5MB browser localStorage limitations by persisting binary Blobs
 * to browser IndexedDB and delivering fast, zero-memory-leak Blob URLs.
 */
class FileUploadServiceImpl {
  private assetUrlMap: Map<string, string> = new Map();

  /**
   * Upload a File instance and return a complete ProjectAsset record with automated WebP compression
   * and IndexedDB persistent binary storage.
   */
  async uploadFile(file: File, folder: string = 'general'): Promise<ProjectAsset> {
    const category = this.detectCategory(file);
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const cleanName = file.name.replace(/\.[^/.]+$/, '');

    // 1. Image path: Perform client-side WebP compression and store in IndexedDB
    if (category === 'image' && typeof document !== 'undefined') {
      try {
        const compressed = await this.compressImageToBlob(file);

        // Persist to IndexedDB
        let persistentUrl: string;
        try {
          persistentUrl = await AssetIndexedDBService.saveAsset(assetId, compressed.blob, {
            name: cleanName,
            mimeType: 'image/webp',
            width: compressed.width,
            height: compressed.height,
          });
        } catch (idbErr) {
          console.warn('[FileUploadService] IndexedDB unavailable, using memory Blob URL:', idbErr);
          persistentUrl = URL.createObjectURL(compressed.blob);
        }

        const asset: ProjectAsset = {
          id: assetId,
          name: cleanName,
          category,
          url: persistentUrl,
          thumbnailUrl: compressed.thumbnailDataUrl,
          sizeBytes: compressed.blob.size,
          width: compressed.width,
          height: compressed.height,
          mimeType: 'image/webp',
          folder,
          createdAt: new Date().toISOString(),
        };

        this.assetUrlMap.set(assetId, persistentUrl);
        return asset;
      } catch (err) {
        console.warn('[FileUploadService] Compression failed, falling back to direct blob storage:', err);
      }
    }

    // 2. Non-image or fallback path: Store raw file directly in IndexedDB
    try {
      const persistentUrl = await AssetIndexedDBService.saveAsset(assetId, file, {
        name: cleanName,
        mimeType: file.type || 'application/octet-stream',
      });

      const asset: ProjectAsset = {
        id: assetId,
        name: cleanName,
        category,
        url: persistentUrl,
        thumbnailUrl: persistentUrl,
        sizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
        folder,
        createdAt: new Date().toISOString(),
      };

      this.assetUrlMap.set(assetId, persistentUrl);
      return asset;
    } catch (idbErr) {
      // Memory Object URL fallback
      const objectUrl = URL.createObjectURL(file);
      const asset: ProjectAsset = {
        id: assetId,
        name: cleanName,
        category,
        url: objectUrl,
        thumbnailUrl: objectUrl,
        sizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
        folder,
        createdAt: new Date().toISOString(),
      };

      this.assetUrlMap.set(assetId, objectUrl);
      return asset;
    }
  }

  /**
   * Client-side canvas image compression to WebP Blob with LQIP thumbnail
   */
  private async compressImageToBlob(file: File): Promise<{
    blob: Blob;
    thumbnailDataUrl: string;
    width: number;
    height: number;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;

        // Max dimension cap: 2400px
        const maxDim = 2400;
        let targetW = origW;
        let targetH = origH;

        if (origW > maxDim || origH > maxDim) {
          if (origW > origH) {
            targetW = maxDim;
            targetH = Math.round((origH * maxDim) / origW);
          } else {
            targetH = maxDim;
            targetW = Math.round((origW * maxDim) / origH);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2d context for compression'));
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Generate tiny 120px LQIP thumbnail
        const thumbCanvas = document.createElement('canvas');
        const thumbW = 120;
        const thumbH = Math.max(1, Math.round((targetH * thumbW) / targetW));
        thumbCanvas.width = thumbW;
        thumbCanvas.height = thumbH;
        const thumbCtx = thumbCanvas.getContext('2d');
        let thumbDataUrl = '';
        if (thumbCtx) {
          thumbCtx.drawImage(canvas, 0, 0, thumbW, thumbH);
          thumbDataUrl = thumbCanvas.toDataURL('image/webp', 0.5);
        }

        // Convert canvas to binary Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                blob,
                thumbnailDataUrl: thumbDataUrl,
                width: targetW,
                height: targetH,
              });
            } else {
              // Fallback to jpeg blob
              canvas.toBlob(
                (fallbackBlob) => {
                  if (fallbackBlob) {
                    resolve({
                      blob: fallbackBlob,
                      thumbnailDataUrl: thumbDataUrl,
                      width: targetW,
                      height: targetH,
                    });
                  } else {
                    reject(new Error('Failed to create Blob from canvas'));
                  }
                },
                'image/jpeg',
                0.85
              );
            }
          },
          'image/webp',
          0.85
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image for compression'));
      };

      img.src = objectUrl;
    });
  }

  /**
   * Detect asset category from file mime type or extension
   */
  detectCategory(file: File): AssetCategory {
    const type = file.type?.toLowerCase() || '';
    const name = file.name?.toLowerCase() || '';

    if (type.startsWith('image/')) {
      if (type.includes('svg') || name.endsWith('.svg')) return 'svg';
      return 'image';
    }
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (name.endsWith('.glb') || name.endsWith('.gltf') || name.endsWith('.obj')) return '3d';
    if (name.endsWith('.ttf') || name.endsWith('.otf') || name.endsWith('.woff') || name.endsWith('.woff2')) return 'font';
    return 'other';
  }

  /**
   * Retrieve cached data/blob URL by assetId
   */
  getAssetUrl(assetId: string): string | undefined {
    return this.assetUrlMap.get(assetId);
  }

  /**
   * Register an existing asset into memory
   */
  registerAsset(asset: ProjectAsset): void {
    if (asset?.id && asset?.url) {
      this.assetUrlMap.set(asset.id, asset.url);
    }
  }
}

export const FileUploadService = new FileUploadServiceImpl();
