/**
 * AssetIndexedDBService
 * High-performance browser IndexedDB binary media repository.
 * Bypasses the 5MB browser localStorage quota limitation by storing
 * image/video/audio/3d blobs directly in IndexedDB and generating Blob URLs.
 */

const DB_NAME = 'orbitox_studio_storage';
const DB_VERSION = 1;
const ASSETS_STORE = 'assets';
const SCHEMAS_STORE = 'schemas';

export interface StoredAssetRecord {
  id: string;
  name: string;
  mimeType: string;
  blob: Blob;
  sizeBytes: number;
  width?: number;
  height?: number;
  createdAt: string;
}

class AssetIndexedDBServiceImpl {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private blobUrlRegistry: Map<string, string> = new Map();

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB is not available in this environment'));
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(ASSETS_STORE)) {
          db.createObjectStore(ASSETS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(SCHEMAS_STORE)) {
          db.createObjectStore(SCHEMAS_STORE, { keyPath: 'slug' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Save a binary file or Blob directly into IndexedDB.
   * Returns a lightweight, fast Blob URL (e.g. "blob:http://...")
   */
  async saveAsset(
    id: string,
    blob: Blob,
    meta: { name: string; mimeType: string; width?: number; height?: number }
  ): Promise<string> {
    const db = await this.getDB();

    const record: StoredAssetRecord = {
      id,
      name: meta.name,
      mimeType: meta.mimeType || blob.type || 'application/octet-stream',
      blob,
      sizeBytes: blob.size,
      width: meta.width,
      height: meta.height,
      createdAt: new Date().toISOString(),
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ASSETS_STORE, 'readwrite');
      const store = tx.objectStore(ASSETS_STORE);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Create or reuse object URL
    let blobUrl = this.blobUrlRegistry.get(id);
    if (!blobUrl) {
      blobUrl = URL.createObjectURL(blob);
      this.blobUrlRegistry.set(id, blobUrl);
    }

    return blobUrl;
  }

  /**
   * Retrieve asset Blob by ID.
   */
  async getAssetBlob(id: string): Promise<Blob | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(ASSETS_STORE, 'readonly');
      const store = tx.objectStore(ASSETS_STORE);
      const req = store.get(id);

      req.onsuccess = () => {
        const record = req.result as StoredAssetRecord | undefined;
        resolve(record ? record.blob : null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieve active Blob URL for an asset. If not in memory, reconstructs from Blob.
   */
  async getAssetBlobUrl(id: string): Promise<string | null> {
    if (this.blobUrlRegistry.has(id)) {
      return this.blobUrlRegistry.get(id)!;
    }

    const blob = await this.getAssetBlob(id);
    if (!blob) return null;

    const url = URL.createObjectURL(blob);
    this.blobUrlRegistry.set(id, url);
    return url;
  }

  /**
   * List all stored assets from IndexedDB.
   */
  async getAllAssets(): Promise<StoredAssetRecord[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(ASSETS_STORE, 'readonly');
      const store = tx.objectStore(ASSETS_STORE);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Delete an asset by ID and revoke its Object URL.
   */
  async deleteAsset(id: string): Promise<void> {
    const db = await this.getDB();

    const existingUrl = this.blobUrlRegistry.get(id);
    if (existingUrl) {
      URL.revokeObjectURL(existingUrl);
      this.blobUrlRegistry.delete(id);
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(ASSETS_STORE, 'readwrite');
      const store = tx.objectStore(ASSETS_STORE);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Save complete document schema into IndexedDB (zero 5MB limitation).
   */
  async saveSchema(slug: string, schema: any): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(SCHEMAS_STORE, 'readwrite');
      const store = tx.objectStore(SCHEMAS_STORE);
      const req = store.put({ slug, schema, updatedAt: new Date().toISOString() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieve complete document schema from IndexedDB.
   */
  async getSchema(slug: string): Promise<any | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(SCHEMAS_STORE, 'readonly');
      const store = tx.objectStore(SCHEMAS_STORE);
      const req = store.get(slug);

      req.onsuccess = () => {
        resolve(req.result ? req.result.schema : null);
      };
      req.onerror = () => reject(req.error);
    });
  }
}

export const AssetIndexedDBService = new AssetIndexedDBServiceImpl();
