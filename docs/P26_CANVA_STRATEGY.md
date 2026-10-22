# 🪐 OrbitoX P26 — Canva Ingestion & De-Flattening Strategy
**Document ID:** `docs/P26_CANVA_STRATEGY.md`  
**Phase:** P26 Phase 0 (Consumer Creative Tool Interoperability)  
**Status:** ARCHITECTURAL SPECIFICATION  
**Author:** Canva-Class UX Architect & Creative Tool Engineer  
**Date:** October 2026  

---

## 1. Executive Summary

Canva is widely used by millions of small businesses, event planners, and creators to design flyers, wedding invitations, presentation decks, and simple landing pages. However, Canva's web exports are notoriously difficult to edit because they output deeply nested absolute `<div>` wrappers, fragmented character spans, and vector clipping masks.

OrbitoX solves this by introducing a dedicated **Canva De-Flattening Engine** that reconstructs semantic structure, merges fragmented text, extracts brand assets, and turns static Canva web exports into fully editable, responsive, and animated OrbitoX projects.

---

## 2. Canva Export Artifact Ingestion Modes

```
               ┌────────────────────────────────────────────────────────┐
               │              CANVA INGESTION CHANNELS                  │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     ┌────────────────────────┐                      ┌────────────────────────┐
     │  Canva HTML/ZIP Export │                      │    Canva Connect API   │
     │  (Self-hosted package) │                      │    (OAuth REST API)    │
     └────────────┬───────────┘                      └────────────┬───────────┘
                  │                                               │
                  ▼                                               ▼
     ┌────────────────────────┐                      ┌────────────────────────┐
     │  DOM & CSS Extractor   │                      │  Design JSON & Assets  │
     └────────────┬───────────┘                      └────────────┬───────────┘
                  │                                               │
                  └───────────────────────┬───────────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │    Canva De-Flattening Engine (AST)   │
                      │  - Text Span Defragmentation          │
                      │  - SVG Mask Normalization             │
                      │  - Semantic Hierarchy Rebuilder       │
                      │  - Layout Inferrer (Flow/Flex)        │
                      └───────────────────┬───────────────────┘
                                          │
                                          ▼
                             Universal Import IR
```

---

## 3. The Text Defragmentation Algorithm

Canva frequently renders single paragraphs as dozens of disjointed `<span>` elements to achieve precise kerning:

```html
<!-- Typical Canva HTML Output -->
<div class="c-text-block" style="position: absolute; top: 120px; left: 80px;">
  <span style="font-family: 'Playfair Display'; font-size: 32px; letter-spacing: 2px;">W</span>
  <span style="font-family: 'Playfair Display'; font-size: 32px; letter-spacing: 1.5px;">elcome to our</span>
  <span style="font-family: 'Playfair Display'; font-size: 32px; letter-spacing: 2px;"> Gala</span>
</div>
```

### Defragmentation Rules:
1. **Span Coalescence:** Sibling spans within the same bounding box sharing identical `font-family`, `font-size`, `font-weight`, and `color` are merged into a single coherent text string (`"Welcome to our Gala"`).
2. **Typography Token Extraction:** The dominant font family and size are promoted to the container's typography definition.
3. **Editable Node Generation:** Emits a single `SceneGraphNode` (`kind: "text"` or `kind: "richtext"`) rather than three separate nodes.

---

## 4. Vector Masks & Graphic Element Reconstruction

Canva uses intricate SVG clipping masks for photos (e.g. arch windows, floral frames, wavy borders):
1. **Mask Extraction:** Extract `<clipPath>` definitions from inline `<svg>` blocks.
2. **Native Mask Node:** Create an OrbitoX node with `kind: "mask"` or apply `style.maskImage: url("data:image/svg+xml;utf8,...")`.
3. **Image Decoupling:** Keep the underlying photo decoupled from the mask geometry so creators can replace the photo in the inspector without destroying the mask shape.

---

## 5. Asset Staging & High-DPI Replacement

Canva web exports often compress images to lower resolutions for fast page loads.
- **Canva Connect API Integration:** If connected via API, query high-resolution asset master files.
- **Local Staging:** Transcode raster images into WebP format and register them into `AssetIndexedDBService`.

*This concludes the Canva Ingestion Strategy. Proceed to `docs/P26_WORDPRESS_STRATEGY.md`.*
