# Task: OrbitoX Studio 3.0 — P27 Total Creative Editor Reconstruction Execution

## Phase 1: Canonical Document & Backend API Integration <!-- id: 100 -->
- [ ] Implement `CanonicalProjectDocument` types and schemas <!-- id: 101 -->
- [ ] Create Next.js API route `/api/studio/projects` (GET list, POST create) <!-- id: 102 -->
- [ ] Create Next.js API route `/api/studio/projects/[id]` (GET, PUT save, DELETE) <!-- id: 103 -->
- [ ] Create Next.js API route `/api/studio/projects/[id]/publish` (POST snapshot & edge publication) <!-- id: 104 -->
- [ ] Create Next.js API route `/api/studio/assets/upload` (POST multipart file ingest) <!-- id: 105 -->

## Phase 2: CSS Architecture & Clean Chrome <!-- id: 200 -->
- [ ] Ensure CSS tokens, Tailwind utilities, and studio CSS rules compile cleanly in `apps/celebrations` <!-- id: 201 -->
- [ ] Purge dead unmounted files (e.g. unmounted 3,300-line `PropertiesPanel.tsx`) and clean dead imports <!-- id: 202 -->
- [ ] Clean up `StudioTopBar.tsx` and status indicators (real telemetry, eliminate fabricated metrics) <!-- id: 203 -->

## Phase 3: Mathematical Canvas Hit-Testing & Direct Manipulation <!-- id: 204 -->
- [ ] Rebuild pointer hit-testing and selection in `CanvasWorkspace.tsx` and `CanvasInteractionLayer.tsx` <!-- id: 301 -->
- [ ] Fix drag owner establishment: clicking anywhere on a selected node moves that node directly (no 5px border trap) <!-- id: 302 -->
- [ ] Eliminate child-to-parent drag interception (clicking a child node never drags parent container) <!-- id: 303 -->
- [ ] Fix section-to-artboard coordinate space alignment: eliminate offset drift for sections below section 1 <!-- id: 304 -->
- [ ] Fix resize engine: preserve auto-layout flex/stack constraints instead of unconditionally forcing `position: absolute` <!-- id: 305 -->

## Phase 4: Section Composer, Reload Persistence & Hierarchical Layers <!-- id: 400 -->
- [ ] Fix `TemplateSchemaService.ts` reload purge: eliminate first-scene mismatch cache invalidation <!-- id: 401 -->
- [ ] Relocate section action handles to canvas gutter (never overlap top content, badges, or navbars) <!-- id: 402 -->
- [ ] Mount real `LayersPanel.tsx` in `StudioShell.tsx` and synchronize 1:1 with canvas selection <!-- id: 403 -->
- [ ] Rebuild right-click Context Menu with hierarchical "Select Layer >" for overlapping objects <!-- id: 404 -->

## Phase 5: Professional Contextual Inspector, Box Model, Radius & Typography <!-- id: 500 -->
- [ ] Rebuild `SectionInspector.tsx` to eliminate empty void: add background, padding, layout, responsive visibility <!-- id: 501 -->
- [ ] Rebuild `BoxModelControl.tsx` with clean value input, independent unit selector, and live style reflection <!-- id: 502 -->
- [ ] Rebuild `CornerRadiusControl.tsx` with 4-corner unlinked editing and visual shape presets <!-- id: 503 -->
- [ ] Fix `TextInspector.tsx` unit parsing and implement dynamic Google Fonts `@font-face` injection <!-- id: 504 -->

## Phase 6: Components & Reactive CMS Data Binding <!-- id: 600 -->
- [ ] Implement Master-to-Instance component update propagation in `TemplateEditorStore.ts` <!-- id: 601 -->
- [ ] Wire `GraphDataBinder.ts` into rendering pipeline so CMS collections reactively update canvas and preview <!-- id: 602 -->

## Phase 7: Universal Visual Ingestion & Template Management <!-- id: 700 -->
- [ ] Rebuild import modal into clean drag-and-drop auto-detection UI (no raw textarea default) <!-- id: 701 -->
- [ ] Rebuild template switching: separate "New from Template", "Add Section", and "Replace Site" with rollback <!-- id: 702 -->

## Phase 8: Published Runtime Parity & E2E Acceptance <!-- id: 800 -->
- [ ] Update `/e/[slug]` runtime to load real published canonical document from database instead of wedding fallback <!-- id: 801 -->
- [ ] Verify Studio == Preview == Published parity across templates and custom sites <!-- id: 802 -->
- [ ] Execute Playwright browser verification suite and capture final screenshots <!-- id: 803 -->
