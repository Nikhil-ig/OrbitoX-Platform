# 🪐 OrbitoX Studio 3.0 — Implementation Roadmap
**Document ID:** `docs/P27/56_IMPLEMENTATION_ROADMAP.md`  
**Status:** IMPLEMENTATION PLANNING (PHASE 0)  

---

## 1. Six-Phase Implementation Master Roadmap

Execution proceeds sequentially through six structured phases, each with strict entry and exit criteria:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ORBITOX STUDIO 3.0 ROADMAP                         │
│                                                                             │
│  PHASE 1: Toolchain, Build Pipeline & Canonical Document Foundation         │
│           - Install Tailwind & PostCSS in apps/celebrations                 │
│           - Implement One Project Document model                            │
│           - Fix TemplateEditorProvider store caching & reload purge bug     │
│                                                                             │
│  PHASE 2: Direct Canvas Manipulation & Hit-Testing Engine                   │
│           - Eliminate ghost dragging with zero-event selection overlays     │
│           - Replace 60fps RAF DOM polling with ResizeObserver / affine math │
│           - 8-handle resize honoring auto-layout (no forced absolute pos)   │
│                                                                             │
│  PHASE 3: Contextual Inspector, Box Model & Design System Cascade           │
│           - Unify active InspectorHost with neutral dark chrome             │
│           - Interactive Box Model scrubbers & Corner Radius controls        │
│           - Dynamic Google Fonts injection & 7-tier cascading styles        │
│                                                                             │
│  PHASE 4: Section Composing, Add Center & Visual Template Browser           │
│           - Non-destructive section insertion & drag-reordering             │
│           - Full-screen visual template browser with multi-device preview   │
│           - Unified Add Center (Elements, Layouts, Sections, Components)    │
│                                                                             │
│  PHASE 5: Universal Intake Dropzone & Zero-Friction Asset Vault             │
│           - Canvas file dropzone (HTML, ZIP, Figma Tokens, SVG, Images)     │
│           - Multi-MIME clipboard serialization & Paste Special pipeline     │
│           - S3/R2 asset vault with automatic WebP generation                │
│                                                                             │
│  PHASE 6: Multi-Tenant Backend, Publishing Invariant & Final Acceptance     │
│           - Prisma database persistence models & REST APIs                  │
│           - Immutable published deployment snapshots                        │
│           - 10 Real Creator Journeys verified with Playwright E2E           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase Entry & Exit Criteria

* **Phase 1 Exit Criteria:**
  Tailwind classes compile in browser (`hasTailwindFlex: true`), template switching responds instantly, reloading after section reorder preserves user edits.
* **Phase 2 Exit Criteria:**
  Clicking child elements never drags background frames, resizing auto-layout elements preserves flow, 0 layout thrashing warnings in Chrome DevTools.
* **Phase 3 Exit Criteria:**
  Box model and radius controls visibly mutate rendered DOM pixels, Google Fonts load without FOUT, changing theme tokens updates all canvas nodes.
* **Phase 4 Exit Criteria:**
  Inserting and reordering sections preserves existing node IDs, visual template preview modal interactive across Desktop/Tablet/Mobile.
* **Phase 5 Exit Criteria:**
  Dragging an image from desktop onto canvas uploads and places image in < 1 second; copy/paste between studio and external apps functions flawlessly.
* **Phase 6 Exit Criteria:**
  Studio document saves to PostgreSQL, published URL matches studio pixels with 0 drift, all 10 Creator Journeys pass without workarounds.
