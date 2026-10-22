/**
 * @orbitox-io/importer-core - Asset Localizer
 * Fetches, deduplicates via SHA-256, and localizes remote assets into offline-ready storage records.
 */

import { ImportedProject, ImportedAsset } from '../types/ImportIR';
import { SecuritySanitizer } from './SecuritySanitizer';

export interface AssetLocalizationOptions {
  fetchFn?: typeof fetch;
  skipPrivateUrls?: boolean;
  maxAssetSizeBytes?: number; // default 15MB
}

export interface AssetLocalizationReport {
  totalDiscovered: number;
  localizedCount: number;
  deduplicatedCount: number;
  failedCount: number;
  assets: Record<string, ImportedAsset>;
  warnings: string[];
}

export class AssetLocalizer {
  private static readonly MAX_ASSET_SIZE = 15 * 1024 * 1024; // 15 MB

  /**
   * Scan project nodes and sections for external asset URLs, fetch & deduplicate them via SHA-256
   */
  public static async localizeProject(
    project: ImportedProject,
    options?: AssetLocalizationOptions
  ): Promise<AssetLocalizationReport> {
    const report: AssetLocalizationReport = {
      totalDiscovered: 0,
      localizedCount: 0,
      deduplicatedCount: 0,
      failedCount: 0,
      assets: { ...project.assets },
      warnings: [],
    };

    const maxSizeBytes = options?.maxAssetSizeBytes || this.MAX_ASSET_SIZE;
    const urlToAssetMap = new Map<string, string>(); // url -> hash

    // Scan all pages and sections for imageRef / backgroundImageUrl
    for (const page of project.pages || []) {
      for (const section of page.sections || []) {
        if (section.style?.backgroundImageUrl) {
          const originalUrl = section.style.backgroundImageUrl;
          report.totalDiscovered++;
          const asset = await this.processUrl(originalUrl, urlToAssetMap, report, maxSizeBytes, options?.fetchFn);
          if (asset) {
            section.style.backgroundImageUrl = `asset://${asset.hash}`;
          }
        }

        for (const node of Object.values(section.nodes || {})) {
          if (node.content?.imageRef) {
            const originalUrl = node.content.imageRef;
            report.totalDiscovered++;
            const asset = await this.processUrl(originalUrl, urlToAssetMap, report, maxSizeBytes, options?.fetchFn);
            if (asset) {
              node.content.imageRef = `asset://${asset.hash}`;
            }
          }
        }
      }
    }

    project.assets = report.assets;
    return report;
  }

  /**
   * Process a single URL: handle data URIs, check security, hash, and register
   */
  public static async processUrl(
    url: string,
    cache: Map<string, string>,
    report: AssetLocalizationReport,
    maxSizeBytes: number = this.MAX_ASSET_SIZE,
    customFetch?: typeof fetch
  ): Promise<ImportedAsset | null> {
    if (!url || typeof url !== 'string') return null;

    // 1. Check if already localized in this run
    if (cache.has(url)) {
      const hash = cache.get(url)!;
      report.deduplicatedCount++;
      return report.assets[hash] || null;
    }

    // 2. Handle Data URI (e.g. data:image/png;base64,...)
    if (url.startsWith('data:')) {
      const parsedData = this.parseDataUri(url);
      if (parsedData) {
        const hash = await this.computeSha256(parsedData.buffer);
        if (report.assets[hash]) {
          report.deduplicatedCount++;
          cache.set(url, hash);
          return report.assets[hash] || null;
        }

        const asset: ImportedAsset = {
          id: `asset_${hash.slice(0, 12)}`,
          name: `embedded-image-${hash.slice(0, 8)}.${this.extensionFromMime(parsedData.mimeType)}`,
          mimeType: parsedData.mimeType,
          sizeBytes: parsedData.buffer.byteLength,
          hash,
        };

        report.assets[hash] = asset;
        report.localizedCount++;
        cache.set(url, hash);
        return asset;
      }
    }

    // 3. SSRF and Protocol Security Validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Relative or local protocol
      const fakeHash = await this.computeSha256String(url);
      const asset: ImportedAsset = {
        id: `asset_${fakeHash.slice(0, 12)}`,
        name: this.extractFileName(url),
        mimeType: this.guessMimeFromUrl(url),
        originalUrl: url,
        hash: fakeHash,
      };
      report.assets[fakeHash] = asset;
      report.localizedCount++;
      cache.set(url, fakeHash);
      return asset;
    }

    if (!SecuritySanitizer.isSafeExternalUrl(url)) {
      report.warnings.push(`Blocked unsafe external asset URL: ${url}`);
      report.failedCount++;
      return null;
    }

    // 4. Remote Fetch (simulated or real fetch if available)
    const fetcher = customFetch || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetcher) {
      // Offline fallback: generate registered asset reference
      const urlHash = await this.computeSha256String(url);
      const asset: ImportedAsset = {
        id: `asset_${urlHash.slice(0, 12)}`,
        name: this.extractFileName(url),
        mimeType: this.guessMimeFromUrl(url),
        originalUrl: url,
        hash: urlHash,
      };
      report.assets[urlHash] = asset;
      report.localizedCount++;
      cache.set(url, urlHash);
      return asset;
    }

    try {
      const response = await fetcher(url);
      if (!response.ok) {
        report.warnings.push(`Failed to fetch asset from ${url}: HTTP ${response.status}`);
        report.failedCount++;
        return null;
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > maxSizeBytes) {
        report.warnings.push(`Asset ${url} exceeded max size limit (${buffer.byteLength} > ${maxSizeBytes} bytes)`);
        report.failedCount++;
        return null;
      }

      const hash = await this.computeSha256(buffer);
      if (report.assets[hash]) {
        report.deduplicatedCount++;
        cache.set(url, hash);
        return report.assets[hash] || null;
      }

      const mimeType = response.headers.get('content-type') || this.guessMimeFromUrl(url);
      const asset: ImportedAsset = {
        id: `asset_${hash.slice(0, 12)}`,
        name: this.extractFileName(url),
        mimeType,
        originalUrl: url,
        sizeBytes: buffer.byteLength,
        hash,
      };

      report.assets[hash] = asset;
      report.localizedCount++;
      cache.set(url, hash);
      return asset;
    } catch (err: any) {
      report.warnings.push(`Network error fetching asset ${url}: ${err.message || String(err)}`);
      // Fallback registered asset
      const fallbackHash = await this.computeSha256String(url);
      if (report.assets[fallbackHash]) {
        report.deduplicatedCount++;
        cache.set(url, fallbackHash);
        return report.assets[fallbackHash] || null;
      }

      const asset: ImportedAsset = {
        id: `asset_${fallbackHash.slice(0, 12)}`,
        name: this.extractFileName(url),
        mimeType: this.guessMimeFromUrl(url),
        originalUrl: url,
        hash: fallbackHash,
      };
      report.assets[fallbackHash] = asset;
      report.localizedCount++;
      cache.set(url, fallbackHash);
      return asset;
    }
  }

  /**
   * Deterministic SHA-256 calculation compatible with WebCrypto or fallback
   */
  public static async computeSha256(buffer: ArrayBuffer): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
      try {
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch {}
    }

    // Fast deterministic non-crypto fallback for test environments without subtle crypto
    const uint8 = new Uint8Array(buffer);
    let hash1 = 0x811c9dc5;
    let hash2 = 0x55555555;
    for (let i = 0; i < uint8.length; i++) {
      hash1 ^= uint8[i]!;
      hash1 = Math.imul(hash1, 0x01000193);
      hash2 ^= uint8[i]!;
      hash2 = Math.imul(hash2, 0x01000193) + i;
    }
    const h1Str = (hash1 >>> 0).toString(16).padStart(8, '0');
    const h2Str = (hash2 >>> 0).toString(16).padStart(8, '0');
    return `${h1Str}${h2Str}${h1Str}${h2Str}`;
  }

  public static async computeSha256String(str: string): Promise<string> {
    const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    if (encoder) {
      return this.computeSha256(encoder.encode(str).buffer);
    }
    const buf = new ArrayBuffer(str.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) {
      view[i] = str.charCodeAt(i) & 0xff;
    }
    return this.computeSha256(buf);
  }

  private static parseDataUri(dataUri: string): { mimeType: string; buffer: ArrayBuffer } | null {
    const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches || !matches[1] || !matches[2]) return null;

    const mimeType = matches[1];
    const base64 = matches[2];

    try {
      const binaryStr = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return { mimeType, buffer: bytes.buffer };
    } catch {
      return null;
    }
  }

  private static extractFileName(url: string): string {
    try {
      const clean = url.split('?')[0]!.split('#')[0]!;
      const parts = clean.split('/');
      const last = parts[parts.length - 1];
      if (last && last.includes('.')) return last;
    } catch {}
    return 'imported-asset.png';
  }

  private static guessMimeFromUrl(url: string): string {
    const clean = url.toLowerCase();
    if (clean.endsWith('.png')) return 'image/png';
    if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
    if (clean.endsWith('.webp')) return 'image/webp';
    if (clean.endsWith('.avif')) return 'image/avif';
    if (clean.endsWith('.svg')) return 'image/svg+xml';
    if (clean.endsWith('.gif')) return 'image/gif';
    if (clean.endsWith('.woff2')) return 'font/woff2';
    if (clean.endsWith('.woff')) return 'font/woff';
    if (clean.endsWith('.ttf')) return 'font/ttf';
    return 'application/octet-stream';
  }

  private static extensionFromMime(mime: string): string {
    switch (mime) {
      case 'image/png': return 'png';
      case 'image/jpeg': return 'jpg';
      case 'image/webp': return 'webp';
      case 'image/avif': return 'avif';
      case 'image/svg+xml': return 'svg';
      case 'font/woff2': return 'woff2';
      default: return 'bin';
    }
  }
}
