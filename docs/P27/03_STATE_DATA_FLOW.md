# 🪐 OrbitoX Studio 3.0 — State & Data Flow Audit
**Document ID:** `docs/P27/03_STATE_DATA_FLOW.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Multiple Competing Sources of Truth

The current platform suffers from competing state authorities. Instead of a single unidirectional data flow, state is fractured across five disparate stores and contexts:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       COMPETING STATE SOURCES                               │
│                                                                             │
│  1. URL Query State             (?template=saas-nextgen&scene=hero)         │
│  2. TemplateEditorStore (useRef) (draft.schema, ui.selection, history)      │
│  3. StudioShell React State     (activePageId, mode, viewport, zoom)        │
│  4. CanvasInteractionLayer State (transientDelta, measuredRects, mode)      │
│  5. Browser Local Storage       (orbitox_celebrations_template_schema_*)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Collision Points and Race Conditions

### Collision 1: URL Query State vs. `TemplateEditorStore` Cache
* **Mechanism:** When the user navigates between templates, the Next.js router updates the URL search param `?template=<slug>`.
* **Breakdown:** `TemplateEditorProvider` stores the store instance inside a `useRef` that only initializes once. Because `useRef` retains its reference across re-renders without checking if the slug has changed, the store remains attached to the previous template's schema.
* **Symptom:** Selecting a template in the template drawer appears to do nothing.

### Collision 2: Canvas Transient Delta vs. Store Node Geometry
* **Mechanism:** During dragging and resizing, `CanvasInteractionLayer` maintains `transientDelta` in local React state. At the same time, it fires `requestAnimationFrame` measuring DOM elements.
* **Breakdown:** When `onPointerUp` commits the geometry change via `onUpdateGeometry`, the store updates asynchronously. If another pointer event occurs before the DOM reflows and `measuredRects` updates, the calculation operates on stale coordinate matrices.
* **Symptom:** Elements jump erratically or resize handles snap back to old positions.

### Collision 3: Active Page Selection vs. Active Scene Hierarchy
* **Mechanism:** `StudioShell` maintains `activePageId` in local React state, while `TemplateEditorStore` maintains `selectedSceneId`.
* **Breakdown:** If a multi-page template defines pages with specific `sectionIds`, switching scenes in the canvas or layers panel does not automatically update `activePageId`. Conversely, switching pages does not cleanly clear or validate whether the active scene belongs to the newly selected page.
* **Symptom:** Layer panel shows sections from Page A while canvas renders Page B, or selecting a node crashes when looking up `activeScene`.

---

## 3. History & Undo/Redo Fragmentation

* **Past/Future Stack:** Managed in `TemplateEditorStore` as snapshots of `draft.schema`.
* **Granularity Issue:** Every single micro-action (such as scrubbing a slider or dragging by 1 pixel without proper debounce) creates redundant history entries unless grouped by transactions.
* **Missing Canvas State in History:** Viewport zoom, pan coordinates, active page, and selection state are NOT saved in the history stack. Undoing a change restores node geometry but leaves the selection pointing to a potentially deleted or moved node, causing inspector crashes.
