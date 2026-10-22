# 🪐 OrbitoX Studio 3.0 — Asset System Forensic Audit
**Document ID:** `docs/P27/16_ASSET_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Asset Storage & Management Analysis

Assets are currently managed in `AssetsPanel.tsx` and `AssetIndexedDBService.ts`.

### Deficiencies Identified:
1. **No Direct Drag-and-Drop File Upload:**
   Dropping an image from the desktop directly onto the canvas or assets panel is not supported. Users must click an upload button or type an external URL.
2. **IndexedDB Isolation & Volatility:**
   Uploaded assets are stored as Base64 strings or Blobs in browser IndexedDB.
   * If the user switches browsers, clears site data, or opens the app in an incognito window, all uploaded assets vanish.
   * There is no server-backed S3/R2 storage or PostgreSQL record of assets.
3. **Missing Image Optimization & Format Support:**
   No WebP/AVIF generation, no responsive `srcset` output, and no support for video, audio, Lottie, Rive, or 3D GLTF models in the asset browser.
