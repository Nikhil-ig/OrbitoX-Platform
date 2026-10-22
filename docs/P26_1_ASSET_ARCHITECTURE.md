# P26.1 Architectural Specification: Universal Asset Management & Storage Engine

## 1. Architectural Philosophy

Assets are the visual building blocks of any website. In OrbitoX P26.1, **Asset Management** is unified under a single high-performance, content-addressable storage (CAS) architecture. Every asset—whether dropped directly onto the canvas, uploaded via the library, imported from an external zip archive, or referenced by an image replacement workflow—flows through the same service pipeline.

---

## 2. Ingestion Pipeline & Deduplication

```
Raw File Dropped / Uploaded / Pasted
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│ 1. Stream Reading & SHA-256 Content Hashing            │
│    Calculates unique fingerprint: sha256(fileBuffer)   │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ 2. Deduplication Check against Project Asset Store     │
│    If hash exists -> Reuse existing asset ID and URL   │
└────────────────────────┬───────────────────────────────┘
                         │ (If new asset)
                         ▼
┌────────────────────────────────────────────────────────┐
│ 3. Metadata Extraction Engine                          │
│    - Images: Width, Height, Aspect Ratio, Dominant Color│
│    - Videos: Dimensions, Duration, Poster Frame        │
│    - Fonts:  Font Family, Weight, WOFF2 Validation     │
│    - 3D:     Mesh bounds, Animation count, GLB verify  │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ 4. Local IndexedDB Persistence & ObjectURL Generation  │
│    Persists binary blob locally; creates fast URL      │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ 5. Project Asset Catalog Registration                  │
│    Emits `onCreateAsset` event to StudioZero state     │
└────────────────────────────────────────────────────────┘
```

---

## 3. Global Drag-and-Drop Translucent Overlay

When a user drags any file over the browser window:
1. `dragenter` and `dragover` events are captured at the window level (`window.addEventListener('dragover', ...)`).
2. The UI enters **Universal Intake Mode**, displaying a sleek translucent overlay with animated glowing borders:
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│           DROP ASSETS TO ADD TO PROJECT                │
│                                                        │
│     Images • Videos • Fonts • 3D Models • Vectors      │
│                                                        │
│     Release mouse anywhere to begin upload             │
│                                                        │
└────────────────────────────────────────────────────────┘
```
3. If dragged specifically over an existing `image` or `video` node on the canvas, the target node glows with a blue highlight ring and displays: **"Drop to Replace Asset"**.
4. Releasing the file triggers ingestion immediately without displacing existing canvas elements.

---

## 4. Multi-File Batch Queue Specification

Dropping multiple files simultaneously (e.g. 10 photos, 2 fonts, 1 video) triggers the non-blocking **Upload Queue**:
```typescript
export interface UploadQueueItem {
  id: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  progressPercent: number;
  status: 'queued' | 'uploading' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
}

export interface UploadBatchStatus {
  totalCount: number;
  completedCount: number;
  totalBytes: number;
  uploadedBytes: number;
  isComplete: boolean;
}
```
A compact progress pill is displayed in the bottom status bar:
`Uploading 12 assets • 6.4 MB / 14.2 MB • 45%`
Allowing creators to continue authoring while uploads process asynchronously in the background.

---

## 5. Asset Replacement Contract

Replacing an asset across any entry point (`Right-click → Replace Asset`, `Inspector → Replace`, or `In-Place Canvas Drop`):
1. **Preserves Node Geometry**: The container width, height, and layout rules remain unchanged.
2. **Preserves Responsive Overrides**: Tablet and mobile overrides are retained.
3. **Preserves Animation & Interactivity**: Keyframe animations, scroll triggers, and hover states remain bound to the node.
4. **Calculates Object-Fit**: Automatically adjusts `objectFit` (`cover` or `contain`) to avoid visual distortion.
