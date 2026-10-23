# Runtime Architecture Audit
**Document ID:** `docs/P27/02_RUNTIME_ARCHITECTURE.md`

## 1. Execution Pipeline
1. URL params parsed (`?template=saas-nextgen`).
2. `TemplateEditorProvider` initializes `TemplateEditorStore` with `BLUEPRINT_CATALOG[slug]`.
3. `StudioShell` mounts `StudioTopBar`, `StudioRail`, `CanvasWorkspace`, and `InspectorHost`.
4. `CanvasWorkspace` renders active scene nodes through `BasicNodeAdapters`.
5. `CanvasInteractionLayer` renders selection bounding box, handles, and drag affordances.

## 2. Runtime Bottlenecks
- **Unthrottled 60 FPS RAF Loop:** `CanvasInteractionLayer` polls DOM element bounding rects inside `requestAnimationFrame`, causing continuous layout thrashing.
- **Stale Store Cache:** `TemplateEditorProvider` uses a singleton ref pattern without invalidation triggers.
