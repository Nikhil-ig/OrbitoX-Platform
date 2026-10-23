# 🪐 OrbitoX Studio 3.0 — Target Asset Pipeline Architecture
**Document ID:** `docs/P27/38_TARGET_ASSET_ARCHITECTURE.md`  
**Status:** TARGET ARCHITECTURE SPECIFICATION (PHASE 0)  

---

## 1. Zero-Friction Ingestion Pipeline (Section 26)

Creators must never have to configure technical asset settings before uploading:
* **Direct Canvas Drop:** Dropping images, SVGs, or videos anywhere onto the canvas automatically:
  1. Creates an asset record in the project asset registry.
  2. Uploads the file to tenant-scoped cloud storage (S3/R2).
  3. Instantiates an Image or Media node at the drop coordinates with natural dimensions.
* **Paste from Clipboard:** Pressing `Cmd+V` with an image in the system clipboard uploads the image and creates a new node automatically.

---

## 2. Asset Vault & Optimization

* **Supported Formats:** PNG, JPG, WebP, AVIF, SVG, MP4, WebM, MP3, Lottie (JSON), Rive (.riv), GLTF/GLB (3D).
* **Automatic Variant Generation:** Large images automatically generate optimized WebP thumbnails and responsive `srcset` resolutions (640w, 1024w, 1920w).
* **Usage Tracing:** Every asset maintains a `usedInNodes: string[]` reference list, preventing accidental deletion of assets actively displayed on the site.
