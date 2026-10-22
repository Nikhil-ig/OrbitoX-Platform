import { AssetIndexedDBService } from './AssetIndexedDBService';

export interface CASAssetMetadata {
  id: string; // SHA-256 hash prefixed with 'ast_'
  name: string; // Original filename
  mimeType: string; // Normalized MIME type
  sizeBytes: number; // Exact byte size
  dimensions?: {
    width: number;
    height: number;
  };
  durationSeconds?: number; // Video / Audio duration
  fontFamilyName?: string; // WOFF2 / TTF font family
  objectUrl: string; // Ephemeral browser blob URL
  persistedToIndexedDB: boolean;
  uploadedAt: string;
}

export interface AssetIngestionQueueEvent {
  totalFiles: number;
  processedFiles: number;
  currentFileName: string;
  progressPercent: number;
  completedAssets: CASAssetMetadata[];
  errors: Array<{ fileName: string; error: string }>;
}

type IngestionProgressListener = (event: AssetIngestionQueueEvent) => void;

class AssetIngestionServiceImpl {
  private listeners: Set<IngestionProgressListener> = new Set();
  private assetCache: Map<string, CASAssetMetadata> = new Map();

  /**
   * Subscribe to global ingestion progress events
   */
  subscribe(listener: IngestionProgressListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: AssetIngestionQueueEvent) {
    this.listeners.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.error('AssetIngestionService listener error:', err);
      }
    });
  }

  /**
   * Compute SHA-256 hash of an ArrayBuffer or File
   */
  async computeSha256(data: ArrayBuffer): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const digestBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(digestBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback for non-subtle environments
    let hash = 0;
    const bytes = new Uint8Array(data);
    for (let i = 0; i < bytes.length; i++) {
      hash = (hash << 5) - hash + bytes[i]!;
      hash |= 0;
    }
    return `h_${Math.abs(hash).toString(16).padStart(16, '0')}`;
  }

  /**
   * Ingest a single File or Blob through Content-Addressable Storage (CAS)
   */
  async ingestFile(file: File | Blob, customName?: string): Promise<CASAssetMetadata> {
    const buffer = await file.arrayBuffer();
    const sha256 = await this.computeSha256(buffer);
    const assetId = `ast_${sha256.substring(0, 24)}`;

    // Check in-memory cache first
    const cached = this.assetCache.get(assetId);
    if (cached) {
      return cached;
    }

    const name = customName || (file instanceof File ? file.name : `asset_${assetId.substring(4, 12)}`);
    const mimeType = file.type || this.inferMimeFromName(name);

    // Extract dimensional metadata
    let dimensions: { width: number; height: number } | undefined;
    let durationSeconds: number | undefined;
    let fontFamilyName: string | undefined;

    if (mimeType.startsWith('image/')) {
      dimensions = await this.extractImageDimensions(file);
    } else if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
      durationSeconds = await this.extractMediaDuration(file, mimeType.startsWith('video/'));
    } else if (mimeType.includes('font') || name.endsWith('.woff2') || name.endsWith('.ttf')) {
      fontFamilyName = this.extractFontFamily(name);
    }

    // Persist to IndexedDB
    let objectUrl: string;
    try {
      objectUrl = await AssetIndexedDBService.saveAsset(assetId, file, {
        name,
        mimeType,
        width: dimensions?.width,
        height: dimensions?.height,
      });
    } catch {
      objectUrl = URL.createObjectURL(file);
    }

    const metadata: CASAssetMetadata = {
      id: assetId,
      name,
      mimeType,
      sizeBytes: file.size,
      dimensions,
      durationSeconds,
      fontFamilyName,
      objectUrl,
      persistedToIndexedDB: true,
      uploadedAt: new Date().toISOString(),
    };

    this.assetCache.set(assetId, metadata);
    return metadata;
  }

  /**
   * Batch ingest an array of files with progress reporting
   */
  async ingestBatch(files: FileList | File[]): Promise<CASAssetMetadata[]> {
    const fileArray = Array.from(files);
    const totalFiles = fileArray.length;
    const completedAssets: CASAssetMetadata[] = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    for (let i = 0; i < totalFiles; i++) {
      const file = fileArray[i]!;
      const currentFileName = file.name;

      this.notify({
        totalFiles,
        processedFiles: i,
        currentFileName,
        progressPercent: Math.round((i / totalFiles) * 100),
        completedAssets,
        errors,
      });

      try {
        const metadata = await this.ingestFile(file);
        completedAssets.push(metadata);
      } catch (err: any) {
        errors.push({
          fileName: currentFileName,
          error: err?.message || 'Failed to ingest file',
        });
      }
    }

    const finalEvent: AssetIngestionQueueEvent = {
      totalFiles,
      processedFiles: totalFiles,
      currentFileName: 'Complete',
      progressPercent: 100,
      completedAssets,
      errors,
    };
    this.notify(finalEvent);

    return completedAssets;
  }

  // ─────────────────────────────────────────────────────────────
  // METADATA EXTRACTION HELPERS
  // ─────────────────────────────────────────────────────────────

  private async extractImageDimensions(
    file: Blob
  ): Promise<{ width: number; height: number } | undefined> {
    if (typeof window === 'undefined') return undefined;

    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const dims = { width: img.naturalWidth, height: img.naturalHeight };
        URL.revokeObjectURL(url);
        resolve(dims);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(undefined);
      };
      img.src = url;
    });
  }

  private async extractMediaDuration(
    file: Blob,
    isVideo: boolean
  ): Promise<number | undefined> {
    if (typeof window === 'undefined') return undefined;

    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const el = document.createElement(isVideo ? 'video' : 'audio');
      el.preload = 'metadata';
      el.onloadedmetadata = () => {
        const duration = Math.round(el.duration);
        URL.revokeObjectURL(url);
        resolve(duration);
      };
      el.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(undefined);
      };
      el.src = url;
    });
  }

  private extractFontFamily(filename: string): string {
    const clean = filename.replace(/\.(woff2?|ttf|otf|eot)$/i, '');
    return clean.replace(/[-_](regular|bold|italic|medium|semibold|light|thin|black)/i, '').replace(/[-_]/g, ' ');
  }

  private inferMimeFromName(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      case 'svg': return 'image/svg+xml';
      case 'gif': return 'image/gif';
      case 'mp4': return 'video/mp4';
      case 'webm': return 'video/webm';
      case 'mp3': return 'audio/mpeg';
      case 'wav': return 'audio/wav';
      case 'woff2': return 'font/woff2';
      case 'ttf': return 'font/ttf';
      case 'glb': return 'model/gltf-binary';
      case 'gltf': return 'model/gltf+json';
      case 'zip': return 'application/zip';
      case 'html': return 'text/html';
      case 'json': return 'application/json';
      default: return 'application/octet-stream';
    }
  }
}

export const AssetIngestionService = new AssetIngestionServiceImpl();
