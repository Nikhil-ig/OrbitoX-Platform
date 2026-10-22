# P26.1 Comprehensive Implementation Plan: Universal Creative Intake & Studio Architecture

## 1. Migration Strategy: KEEP, REFACTOR, REPLACE, REMOVE, CREATE

To ensure zero regressions across existing Studio Zero authoring capabilities while delivering the P26.1 creative paradigm, every component is classified according to the following taxonomy:

### 1.1 KEEP (Preserve Intact)
- `SceneGraphEngine.ts`: Core immutability, node tree operations, and cloning.
- `SceneGraphCompiler.ts`: IR compilation to SceneGraph nodes and design tokens.
- `SecuritySanitizer.ts`: Strict SSRF URL validation, script tag sanitization, zip bomb defenses.
- `TemplatePackager.ts`: Ed25519 digital signature signing and verification.
- `DesignUniverses.ts`: 12 visual design universes and color palettes.
- `TypographyStudio.ts`: Curated Google Font pairings and scale definitions.

### 1.2 REFACTOR (Enhance & Modernize)
- `CanvasContextMenu.tsx`: Extend from 4 to 8 contextual menus, add Image replacement, Section reordering, and Layer drill-down breadcrumb (`Select Layer >`).
- `SceneGraphClipboard.ts`: Connect external paste (`text/html`, `<svg>`, image blobs) to `@orbitox-io/importer-core` parser pipeline.
- `PropertiesPanel.tsx`: Embed interactive SVG Box Model diagram and Corner Radius hotspots with presets.
- `StudioShell.tsx`: Wire global window-level drag-and-drop intake, replace destructive template callbacks with non-destructive dialogs, connect Universal Add.
- `AssetsPanel.tsx`: Migrate to centralized `AssetIngestionService` with SHA-256 deduplication.

### 1.3 REPLACE (Supersede with New Architectures)
- `OrbitoXUniversalImportModal.tsx`: Replace developer AST console with 3-step creative intake: **Drop → Understand → Bring it in**.
- `TemplatePanel.tsx`: Replace 320px text card drawer with full **Visual Template Marketplace & Live Interactive Multi-Device Preview**.
- `LibraryDrawer.tsx`: Replace fragmented category drawer with unified **Universal `+ Add` Command Center**.
- `DataPanel.tsx`: Replace local scalar state with structured **CMS Collections & Repeater Binding**.

### 1.4 REMOVE (Deprecate & Eliminate)
- Deprecate single-click destructive template overwrite (`onSelectTemplate={handleReplaceSite}`) without user confirmation.
- Deprecate exposed raw AST format selectors in creator-facing import paths.

### 1.5 CREATE (New Subsystems)
- `OrbitoXCreativeIntakeModal.tsx`: The frictionless 3-step intake experience.
- `GlobalDropzoneOverlay.tsx`: Window-level translucent drop overlay.
- `TemplateMarketplaceModal.tsx`: Rich marketplace with multi-device live previews.
- `UniversalAddCommandCenter.tsx`: The single `+ Add` command hub.
- `AssetIngestionService.ts`: Content-addressable storage, metadata extraction, batch queue.
- `BoxModelControl.tsx`: Interactive Margin / Padding / Content SVG visualizer.
- `CornerRadiusControl.tsx`: Interactive corner anchor diagram with 5 standard presets.
- `DesignSystemExtractor.ts`: CIELAB color clustering and token synthesizer.

---

## 2. File-by-File Implementation Sequence

| Step | Target File | Action | Purpose |
| :---: | :--- | :---: | :--- |
| **1** | `orbitox/packages/importer-core/src/types/ImportIR.ts` | Refactor | Upgrade to Import IR v2.0 (partial fidelity, heuristics, explainability). |
| **2** | `orbitox/packages/importer-core/src/pipeline/DesignSystemExtractor.ts` | Create | Implement CIELAB color clustering and token synthesis. |
| **3** | `orbitox/apps/celebrations/components/template-studio/services/AssetIngestionService.ts` | Create | SHA-256 CAS, IndexedDB persistence, metadata extraction. |
| **4** | `orbitox/apps/celebrations/components/studio-zero/GlobalDropzoneOverlay.tsx` | Create | Window-level drag-and-drop listener and glowing dropzone. |
| **5** | `orbitox/apps/celebrations/components/template-studio/components/OrbitoXCreativeIntakeModal.tsx` | Create | 3-step intake (Drop → Understand → Bring it in). |
| **6** | `orbitox/apps/celebrations/components/studio-zero/TemplateMarketplaceModal.tsx` | Create | Visual marketplace, multi-device live preview, template detail model. |
| **7** | `orbitox/apps/celebrations/components/studio-zero/UniversalAddCommandCenter.tsx` | Create | Unified `+ Add` command center for Elements, Layout, Sections, Assets, AI. |
| **8** | `orbitox/apps/celebrations/components/template-studio/components/context-menu/CanvasContextMenu.tsx` | Refactor | Add Image media actions, Section reordering, ancestor layer breadcrumbs. |
| **9** | `orbitox/apps/celebrations/components/template-studio/engine/SceneGraphClipboard.ts` | Refactor | Smart Paste handling external HTML, SVG, and images. |
| **10** | `orbitox/apps/celebrations/components/studio-zero/inspectors/BoxModelControl.tsx` | Create | Visual interactive Margin/Padding SVG box model. |
| **11** | `orbitox/apps/celebrations/components/studio-zero/inspectors/CornerRadiusControl.tsx` | Create | Visual interactive corner anchor diagram with presets. |
| **12** | `orbitox/apps/celebrations/components/studio-zero/PropertiesPanel.tsx` | Refactor | Integrate BoxModelControl and CornerRadiusControl. |
| **13** | `orbitox/apps/celebrations/components/studio-zero/StudioShell.tsx` | Refactor | Wire global dropzone, Universal Add, Template Marketplace, non-destructive safety. |
| **14** | `tests/e2e/p26-1-creative-intake.spec.ts` | Create | Comprehensive Playwright test suite validating all user journeys. |
