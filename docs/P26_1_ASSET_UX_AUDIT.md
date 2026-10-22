# P26.1 Forensic Audit: Asset UX & Unified Media Management

## 1. Executive Summary

In the existing OrbitoX Studio Zero architecture, "Asset Management" and "Code/Design Ingestion" are treated as two disconnected product silos:
- **Media Uploads** live inside `AssetsPanel.tsx` using `FileUploadService.ts`.
- **Code & Design Ingestion** lives inside `OrbitoXUniversalImportModal.tsx` using `@orbitox-io/importer-core`.
- **Canvas Drag-and-Drop** does not seamlessly accept arbitrary files (dropping a PNG creates an image, but dropping an SVG or a ZIP either fails or gets handled by browser default behavior).

A world-class creative tool (Figma, Framer, Canva) unifies all external content ingestion under a single, unified pipeline:
> **"Whether dragging a PNG, an MP4, a GLB model, a custom font, an SVG vector, an HTML snippet, or a full Shopify/Figma ZIP archive, the application must enter a universal intake mode, automatically detect content kind, process assets through a single asset service, and present instant visual insertion options."**

---

## 2. Current Implementation Audit

### 2.1 File: `orbitox/apps/celebrations/components/studio-zero/AssetsPanel.tsx`
- **Total Lines**: 671 lines
- **Upload Flow**: Relies on a hidden `<input type="file" ref={fileInputRef} />` triggered by a button in `AssetsPanel.tsx`.
- **Folder Management**: Hardcoded local categories (`all`, `photos`, `graphics`, `backgrounds`, `video`, `audio`, `fonts`, `3d`, `uploads`).
- **Gaps**:
  1. Cannot drag multiple heterogeneous files (e.g. `logo.svg`, `hero.png`, `font.woff2`, `scene.glb`) simultaneously onto the canvas and have them automatically sorted into their respective folders.
  2. No deduplication via cryptographic content hash (uploading the same image twice produces duplicate entries).
  3. No progress indicator for large binary uploads (video/3D).

### 2.2 File: `orbitox/apps/celebrations/components/template-studio/services/FileUploadService.ts`
- Handles basic `readAsDataURL` or mock upload endpoint.
- Lacks local IndexedDB caching for large binary blobs (causing memory bloat on multi-megabyte GLB/MP4 files).
- Lacks automatic metadata extraction:
  - Image dimensions (natural width & height)
  - Color palette extraction (dominant color, vibrance)
  - Audio/Video duration and codecs
  - Font family name extraction from WOFF2/TTF binary headers

### 2.3 Canvas Drag-and-Drop State
- In `CanvasWorkspace.tsx`, drag-and-drop events are bound to library elements (`onDragOver`, `onDrop`), but native OS file drops outside of specific drop targets default to standard browser navigation (risking lost work if the browser opens the dropped file in the current tab).

---

## 3. Disconnected Replace Workflows

A creator frequently needs to replace an image or video asset in-place without disturbing layout dimensions, responsive overrides, borders, or animations.
Currently:
- Replacing an image requires clicking the Image node, opening `PropertiesPanel.tsx`, manually editing the image URL string or clicking "Asset Picker", navigating through the drawer, and clicking an image.
- Right-clicking an image does not provide an immediate `Replace → Asset | Upload | URL` contextual submenu.
- Dragging a new image directly over an existing image node does not trigger an "In-Place Asset Swap" highlight.

---

## 4. Target Architecture for P26.1

### 4.1 The Universal Asset Ingestion Pipeline
All entry points funnel into a single unified `AssetIngestionService`:
1. **Global App Dropzone**: Dragging files anywhere over Studio Zero triggers the translucent drop overlay.
2. **Universal `+ Add` Command Center**: `ADD → Upload` or `ADD → Assets → Browse`.
3. **Canvas In-Place Drop**: Dropping an asset directly onto an existing `image`, `video`, or `frame` node highlights the node and prompts "Replace Asset" or "Insert as Child".
4. **Context Menu**: Right-click `image/video` node → `Replace → Asset Library / Upload from Computer / From URL`.
5. **Inspector Property Slot**: Click thumbnail in Properties Panel → drag new file or choose file.

### 4.2 Asset Processing & Cryptographic Deduplication
Every ingested asset passes through a standardized ingestion pipeline:
```typescript
interface ProcessedAsset {
  id: string; // "ast_" + sha256.substring(0, 16)
  hash: string; // Full SHA-256 hash of file buffer
  name: string;
  mimeType: string;
  sizeBytes: number;
  dimensions?: { width: number; height: number };
  durationSeconds?: number;
  dominantColor?: string;
  extractedFontFamily?: string;
  url: string; // ObjectURL / IndexedDB Blob URI / CDN URL
  status: 'uploading' | 'processing' | 'ready' | 'error';
}
```

### 4.3 Multi-File Batch Queue
Dropping a folder or multiple files (e.g. `website.zip`, `hero.png`, `brand.woff2`) displays a sleek progress pill in the bottom bar:
```
┌────────────────────────────────────────────────────────┐
│  Uploading 3 assets • 2.4 MB / 4.1 MB • 60%  [Cancel]   │
└────────────────────────────────────────────────────────┘
```
Once processed, assets are immediately available in the Project Library without requiring page reloads or modal dismissals.
