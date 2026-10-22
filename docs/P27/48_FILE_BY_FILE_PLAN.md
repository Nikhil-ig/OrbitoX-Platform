# 🪐 OrbitoX Studio 3.0 — File-by-File Implementation Plan
**Document ID:** `docs/P27/48_FILE_BY_FILE_PLAN.md`  
**Status:** IMPLEMENTATION PLANNING (PHASE 0)  

---

## 1. Classification Methodology

Every file in the studio and related packages is categorized into:
* **KEEP:** Genuine working logic with clean invariants.
* **MODIFY:** Targeted fixes for specific logic defects.
* **REFACTOR:** Substantial architectural restructuring.
* **REPLACE:** Deprecating existing broken abstraction and replacing with target architecture.
* **DELETE:** Dead islands, unused shadow files, duplicate engines.
* **CREATE:** New modules required by target architecture.

---

## 2. File-by-File Ledger

| File Path | Action | Rationale | Dependencies | Risk |
| :--- | :--- | :--- | :--- | :--- |
| `apps/celebrations/package.json` | **MODIFY** | Add `tailwindcss`, `@tailwindcss/postcss`, `postcss` | npm dependencies | Low |
| `apps/celebrations/postcss.config.js` | **CREATE** | PostCSS config for Tailwind v4/v3 compilation | PostCSS | Low |
| `apps/celebrations/tailwind.config.js` | **CREATE** | Tailwind configuration with scoped content globs | Tailwind | Low |
| `components/template-studio/panels/PropertiesPanel.tsx` | **DELETE** | 2,819 lines of dead unmounted code | None | Zero |
| `components/studio-zero/LayersPanel.tsx` | **DELETE** | 532 lines of dead unmounted code | None | Zero |
| `components/template-studio/services/TemplateSchemaService.ts` | **REFACTOR** | Remove fatal line 31 purge check; add tenant-scoped localStorage/cloud sync | Storage | Medium |
| `components/template-studio/engine/TemplateEditorController.tsx` | **REFACTOR** | Fix `TemplateEditorProvider` `useRef` caching bug; bind `key={slug}` | Store | High |
| `components/template-studio/components/canvas/CanvasInteractionLayer.tsx` | **REPLACE** | Replace continuous RAF measurement with zero-event selection overlays and handle-only events | Canvas | High |
| `components/studio-zero/inspectors/InspectorHost.tsx` | **REFACTOR** | Clean up tab routing, connect smart controls, apply neutral dark chrome | Inspectors | Medium |
| `components/studio-zero/inspectors/BoxModelControl.tsx` | **REFACTOR** | Replace uncompiled classes with scoped CSS; bind directly to `padding` and `margin` | StyleResolver | Medium |
| `components/studio-zero/inspectors/CornerRadiusControl.tsx` | **REFACTOR** | Unify radius parsing with explicit `px` units and individual corners | StyleResolver | Low |
| `components/studio-zero/CanvasWorkspace.tsx` | **REFACTOR** | Unify hit-testing raycasting, eliminate selection box event stealing | Canvas | High |
| `components/studio-zero/StudioShell.tsx` | **REFACTOR** | Mount unified LayersPanel, connect real performance APIs, fix key props | Shell | High |
| `components/renderer/SceneGraphRenderer.tsx` | **REFACTOR** | Ensure all box model, border radius, and token styles are accurately translated | Adapters | High |
| `components/template-studio/engine/StyleResolver.ts` | **REFACTOR** | Implement 7-tier cascading style priority; fix gradient and color parsing | Tokens | Medium |
| `components/template-studio/components/context-menu/CanvasContextMenu.tsx` | **REFACTOR** | Add empty canvas context menu, submenus, viewport boundary collision checks | Commands | Medium |
| `components/template-studio/engine/SceneGraphClipboard.ts` | **REFACTOR** | Implement multi-MIME clipboard writes (`application/json`, SVG, HTML, text) | Clipboard | Low |
| `components/template-studio/components/OrbitoXUniversalImportModal.tsx` | **REFACTOR** | Transform into visual drag-and-drop intake dropzone with file picker | Importer | Medium |
| `packages/importer-core/src/index.ts` | **KEEP** | Clean exports for AST adapters and compiler | Importer | Low |
| `prisma/schema.prisma` | **MODIFY** | Add `StudioProject`, `StudioPage`, `StudioSection`, `StudioAsset`, `StudioSnapshot` | PostgreSQL | High |
| `apps/celebrations/app/api/studio/projects/route.ts` | **CREATE** | REST endpoint for CRUD of tenant studio projects | Prisma | Medium |
| `apps/celebrations/app/api/studio/assets/route.ts` | **CREATE** | REST endpoint for multipart asset uploads to cloud storage | S3/R2 | Medium |
| `apps/celebrations/app/api/studio/publish/route.ts` | **CREATE** | REST endpoint for immutable deployment snapshots | Prisma | Medium |
