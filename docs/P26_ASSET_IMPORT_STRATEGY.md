# 🪐 OrbitoX P26 — Asset & Font Ingestion Pipeline Strategy
**Document ID:** `docs/P26_ASSET_IMPORT_STRATEGY.md`  
**Phase:** P26 Phase 0 (Asset Pipeline Architecture)  
**Status:** ARCHITECTURAL SPECIFICATION  
**Author:** Asset Pipeline Architect & Performance Engineer  
**Date:** October 2026  

---

## 1. Executive Summary & Core Mandate

When importing projects from external sources (Figma, Shopify, WordPress, websites, ZIP packages), assets (images, SVGs, custom fonts, audio, video) represent the largest payload volume and the highest risk for broken links, CORS failures, and quota exhaustion.

The **Asset & Font Ingestion Pipeline** guarantees:
1. **Zero Broken Remote References:** Remote URLs are fetched, verified, deduplicated via SHA-256, and staged locally in IndexedDB before syncing to multi-tenant cloud storage.
2. **True Vector Editability:** SVGs are not merely treated as static `<img>` tags; they are parsed into editable vector geometry.
3. **Automated Typography Resolution:** Imported fonts are resolved against Google Fonts or embedded via dynamic `@font-face` stylesheets with visual fallbacks.

---

## 2. Ingestion Pipeline Architecture

```
┌─────────────────────────────────┐
│     Discovered Asset URL / Blob │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│    CORS Proxy & Fetch Worker    │ ──► Stream chunks, handle rate limits
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│      SHA-256 Content Hash       │ ──► Deduplicate against existing asset registry
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│    Asset Type Router & Worker   │
└──────┬──────────────┬───────────┘
       │              │
       ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Raster Image │ │ SVG Vector   │ │ Custom Font  │
│ WebP/AVIF    │ │ SVGO Clean   │ │ WOFF2 / TTF  │
│ Transcode    │ │ Path Extract │ │ @font-face   │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────┐
│      AssetIndexedDBService (Client Storage)    │
│            Local Blob URL Generation           │
└───────────────────────┬────────────────────────┘
                        │
                        ▼ (Background / On Publish)
┌────────────────────────────────────────────────┐
│      Multi-Tenant Cloud CDN (S3 / R2 Bucket)   │
└────────────────────────────────────────────────┘
```

---

## 3. Font Ingestion & Typography Reconciliation

When an imported project specifies a font family (e.g. `Cinzel`, `Playfair Display`, `Outfit`, `Clash Display`):

```typescript
export class FontIngestionService {
  /**
   * Resolves an imported font family against Google Fonts or stages custom webfont
   */
  static async resolveFont(fontFamily: string, weights: number[] = [400, 700]): Promise<FontResolutionResult> {
    const cleanName = fontFamily.replace(/['"]/g, '').trim();

    // 1. Check if font is available on Google Fonts
    const isGoogleFont = await this.checkGoogleFontsDirectory(cleanName);
    if (isGoogleFont) {
      const linkHref = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(cleanName)}:wght@${weights.join(';')}&display=swap`;
      this.injectFontStylesheet(cleanName, linkHref);
      return { resolved: true, source: 'google_fonts', family: cleanName };
    }

    // 2. Check if font is a universal system font
    if (this.isSystemFont(cleanName)) {
      return { resolved: true, source: 'system', family: cleanName };
    }

    // 3. Fallback to closest aesthetic category (serif / sans-serif / display / monospace)
    const fallback = this.getAestheticFallback(cleanName);
    return {
      resolved: false,
      source: 'fallback',
      family: fallback,
      originalFamily: cleanName,
      warning: `Font '${cleanName}' not found. Substituted with '${fallback}'.`
    };
  }
}
```

---

## 4. SVG Vector Ingestion & Path Conversion

To prevent imported SVGs from behaving as un-editable bitmaps:
1. **SVGO Sanitization:** Strip dangerous `<script>` tags, metadata comments, and unneeded attributes.
2. **Path Decomposition:** Extract `<path d="...">`, `<circle>`, `<rect>` elements.
3. **Editable SceneNode:** Create a `SceneGraphNode` (`kind: "shape"`, `shapeType: "vector"`) where creators can change fill colors, stroke widths, and hover states directly from the OrbitoX Inspector.

---

## 5. Storage Quotas & Performance Safeguards

1. **Client Storage:** Uses `AssetIndexedDBService` with automatic quota checks (`navigator.storage.estimate()`).
2. **Payload Size Guard:** Individual images exceeding 15MB are downscaled client-side via `OffscreenCanvas` before persistence.
3. **Lazy Hydration:** Blobs are converted to lightweight `blob:http://...` URLs on demand to keep initial template hydration under 50ms.

*This concludes the Asset Ingestion Strategy. Proceed to `docs/P26_RIGHT_CLICK_UX.md`.*
