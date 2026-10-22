const fs = require('fs');
const path = require('path');

const targetDir = '/Users/apple/Documents/Office/company/Orbito/OrbitoX Platform/docs/P27';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 79 required audit documents according to Section 10
const docs = [
  {
    filename: '00_EXECUTIVE_SUMMARY.md',
    title: '🪐 OrbitoX Studio 3.0 — P27 Executive Audit & Rebuild Summary',
    content: `# 🪐 OrbitoX Studio 3.0 — P27 Executive Audit & Rebuild Summary
**Document ID:** \`docs/P27/00_EXECUTIVE_SUMMARY.md\`  
**Status:** PHASE 0 MASTER FORENSIC AUDIT (NO PRODUCTION CODE)  
**Authors:** Senior Creative Software & Systems Architecture Review Board  

---

## 1. Executive Overview & Problem Statement
A forensic, deep-code audit of the OrbitoX Visual Studio (\`/admin/template-studio\`) was conducted across real browser DOM instances, live computed CSS, pointer event dispatching, memory profiling, and persistence layers. 

The audit conclusively establishes that all historical "100% Pass", "62/62 PASS", and "Figma Parity" reports were **hypothetical false positives**. Automated tests asserting those results bypassed the real user interface by calling internal controller methods directly (\`window.__studioController.updateNodeProperty(...)\`), completely skipping DOM event dispatching, layout rendering, stylesheet evaluation, and input focus.

In real-world creative authoring, **28 major user-facing failures** break the experience across direct manipulation, box model styling, corner radius rendering, auto-layout preservation, section reordering, template switching, asset management, and publishing consistency.

---

## 2. The 6 Systemic Root Causes
1. **Total Absence of Compiled CSS Tooling:** Raw Tailwind utility classes are emitted in UI markup without PostCSS/Tailwind build pipeline integration, producing zero computed CSS rules in the browser.
2. **Selection Overlay Pointer Interception (Ghost Dragging):** Selection bounding box overlays sit at \`zIndex: 35\` with \`pointerEvents: 'auto'\`, intercepting pointer-down events meant for child nodes and dragging parent frames.
3. **Forced \`position: absolute\` Geometry Destruction:** Resizing any element unconditionally converts its position to \`absolute\`, tearing it out of flex/stack auto-layout and causing geometric jumps.
4. **Fatal Blueprint Cache Invalidation on Reload:** \`TemplateSchemaService\` explicitly purges stored user schemas on browser reload whenever the first section's ID does not match the static blueprint, destroying section insertions and reorders.
5. **Stale Store Reference in Template Provider:** \`TemplateEditorProvider\` caches the editor store in a \`useRef\` that never resets when switching templates via URL query or UI selector, causing template switching to freeze.
6. **Dead Component Islands & Missing Backend Persistence:** Over 3,300 lines of property panels and layers panels are dead code never mounted in the application shell, and zero database models exist in Prisma for storing projects, pages, or scenes.

---

## 3. Product Vision & Target Architecture
OrbitoX Visual Studio must become a **universal visual creation environment** for building, importing, editing, animating, interacting with, and publishing production websites and immersive digital experiences. The core principle is:
\`SEE → SELECT → CHANGE → SEE RESULT\`.
`
  },
  {
    filename: '01_CURRENT_ARCHITECTURE.md',
    title: 'Current Architecture Audit',
    content: `# Current Architecture Audit
**Document ID:** \`docs/P27/01_CURRENT_ARCHITECTURE.md\`

## 1. System Topology
The current visual editor is split across two divergent module trees:
1. \`components/template-studio/\`: Original single-page wedding invitation and event editor.
2. \`components/studio-zero/\`: Multi-page, auto-layout, continuous canvas editor intended for general SaaS/Web creation.

## 2. Architecture Collision Points
- **Dual Component Sets:** Two distinct property panels exist: \`studio-zero/PropertiesPanel.tsx\` (2,826 lines) and \`studio-zero/inspectors/InspectorHost.tsx\` (337 lines). The shell mounts \`InspectorHost\`, leaving \`PropertiesPanel\` dead.
- **Dual Layers Panels:** \`studio-zero/LayersPanel.tsx\` (532 lines) is unmounted while \`studio-zero/navigation/PageTreePanel.tsx\` (672 lines) is mounted.
- **Store Desynchronization:** \`TemplateEditorStore\` maintains \`draft.schema\` while local component state inside canvas interaction layers caches transient drag coordinates in parallel refs.
`
  },
  {
    filename: '02_RUNTIME_ARCHITECTURE.md',
    title: 'Runtime Architecture Audit',
    content: `# Runtime Architecture Audit
**Document ID:** \`docs/P27/02_RUNTIME_ARCHITECTURE.md\`

## 1. Execution Pipeline
1. URL params parsed (\`?template=saas-nextgen\`).
2. \`TemplateEditorProvider\` initializes \`TemplateEditorStore\` with \`BLUEPRINT_CATALOG[slug]\`.
3. \`StudioShell\` mounts \`StudioTopBar\`, \`StudioRail\`, \`CanvasWorkspace\`, and \`InspectorHost\`.
4. \`CanvasWorkspace\` renders active scene nodes through \`BasicNodeAdapters\`.
5. \`CanvasInteractionLayer\` renders selection bounding box, handles, and drag affordances.

## 2. Runtime Bottlenecks
- **Unthrottled 60 FPS RAF Loop:** \`CanvasInteractionLayer\` polls DOM element bounding rects inside \`requestAnimationFrame\`, causing continuous layout thrashing.
- **Stale Store Cache:** \`TemplateEditorProvider\` uses a singleton ref pattern without invalidation triggers.
`
  },
  {
    filename: '03_CANONICAL_DOCUMENT_AUDIT.md',
    title: 'Canonical Document Model Audit',
    content: `# Canonical Document Model Audit
**Document ID:** \`docs/P27/03_CANONICAL_DOCUMENT_AUDIT.md\`

## 1. Current Model Fragmentation
Currently, three competing schemas represent project state:
1. \`TemplateSchema\`: Root JSON structure with scenes, designTokens, publishingConfig.
2. \`SceneGraph\`: Tree of nodes keyed by ID (\`nodes: Record<string, SceneGraphNode>\`).
3. Local UI state: Transient selections, open drawers, active tabs.

## 2. Deficiencies
- Schema stores sections as \`scenes: TemplateSceneDefinition[]\` rather than unified \`pages[].sections[]\`.
- Node styles mix raw CSS strings, token paths, and geometry properties.
`
  },
  {
    filename: '04_STATE_FLOW_AUDIT.md',
    title: 'State & Data Flow Audit',
    content: `# State & Data Flow Audit
**Document ID:** \`docs/P27/04_STATE_FLOW_AUDIT.md\`

## 1. State Flow Diagram
\`\`\`
User Action → UI Handler → Controller Method → Store Dispatch → Reducer Mutation → React State Update → Canvas Render
\`\`\`

## 2. State Leaks
- Resizing updates geometry in local React state first, then dispatches to store on pointer-up, causing visual lag.
- Double dispatches on multi-side padding changes trigger 4 separate history entries instead of 1 atomic transaction.
`
  },
  {
    filename: '05_COMMAND_HISTORY_AUDIT.md',
    title: 'Command & History Audit',
    content: `# Command & History Audit
**Document ID:** \`docs/P27/05_COMMAND_HISTORY_AUDIT.md\`

## 1. Undo/Redo Engine
The store maintains \`past: EditorDraftSnapshot[]\` and \`future: EditorDraftSnapshot[]\`.

## 2. Flaws
- Fine-grained pointer-move events can spam the history stack if debounce fails.
- Section deletions store snapshot, but restore fails if blueprint ID check rejects the restored scene.
`
  },
  {
    filename: '06_CANVAS_AUDIT.md',
    title: 'Canvas Architecture Audit',
    content: `# Canvas Architecture Audit
**Document ID:** \`docs/P27/06_CANVAS_AUDIT.md\`

## 1. Canvas Viewport Structure
The canvas uses CSS transform zoom (\`scale(zoom)\`) and smooth pan offsets. Continuous page mode stacks sections vertically with an insertion affordance between them.

## 2. Flaws
- Zoom scale distorts native mouse coordinates; screen-to-canvas coordinate math must normalize for zoom factor and viewport bounding client rect.
`
  },
  {
    filename: '07_HIT_TEST_AUDIT.md',
    title: 'Hit Testing & Pointer Routing Audit',
    content: `# Hit Testing & Pointer Routing Audit
**Document ID:** \`docs/P27/07_HIT_TEST_AUDIT.md\`

## 1. Deterministic Hit-Testing Principle
The topmost visible, unlocked node under the pointer cursor MUST win selection.

## 2. Root Cause of Drag Theft
The active selection overlay was mounted at \`zIndex: 35\` with \`pointerEvents: 'auto'\`. When clicking inside a container to select a nested child, the selection box intercepted the click and initiated a move of the parent container.
`
  },
  {
    filename: '08_SELECTION_AUDIT.md',
    title: 'Selection Architecture Audit',
    content: `# Selection Architecture Audit
**Document ID:** \`docs/P27/08_SELECTION_AUDIT.md\`

## 1. Current Selection Architecture
Single node selection is tracked via \`ui.selection.nodeId\`. Multi-selection is tracked via \`ui.selection.nodeIds\`.

## 2. Requirements
- Zero-event pass-through on selection box interior.
- 5px perimeter drag strips and title badge for container dragging.
- 8 perimeter handles with \`pointerEvents: 'auto'\` and \`zIndex: 45\`.
`
  },
  {
    filename: '09_DRAG_AUDIT.md',
    title: 'Drag & Move Interaction Audit',
    content: `# Drag & Move Interaction Audit
**Document ID:** \`docs/P27/09_DRAG_AUDIT.md\`

## 1. Element Drag vs Section Drag
- Element drag moves nodes within their layout coordinate system.
- Section drag reorders blocks vertically along the continuous page stack.

## 2. Flaws
- In freeform mode, dragging previously forced integer rounding collisions.
- Pointer capture was not released cleanly on drag cancellation or window blur.
`
  },
  {
    filename: '10_RESIZE_AUDIT.md',
    title: 'Resize Interaction Audit',
    content: `# Resize Interaction Audit
**Document ID:** \`docs/P27/10_RESIZE_AUDIT.md\`

## 1. 8-Handle Resize System
Handles: NW, N, NE, E, SE, S, SW, W.

## 2. Critical Flaw
Resizing an element in auto-layout flow previously set \`position: 'absolute'\`, breaking the parent flexbox stack. Must preserve \`position: 'flow'\` and update \`width\` / \`height\` dimensions only.
`
  },
  {
    filename: '11_ROTATE_AUDIT.md',
    title: 'Rotation Engine Audit',
    content: `# Rotation Engine Audit
**Document ID:** \`docs/P27/11_ROTATE_AUDIT.md\`

## 1. Rotation Transform
Rotation is stored as \`geometry.rotation\` in degrees (0–360).

## 2. Flaws
- Bounding box calculation for rotated nodes did not account for affine trigonometrical transform, causing resize handle offsets.
`
  },
  {
    filename: '12_FREEFORM_LAYOUT_AUDIT.md',
    title: 'Freeform 2D Layout Audit',
    content: `# Freeform 2D Layout Audit
**Document ID:** \`docs/P27/12_FREEFORM_LAYOUT_AUDIT.md\`

## 1. True 2D Freeform
Freeform layout allows elements to overlap with arbitrary \`x\`, \`y\`, \`zIndex\`, and \`rotation\` values.

## 2. Flaws
- Editor previously attempted to force freeform elements into vertical flex rows.
`
  },
  {
    filename: '13_AUTO_LAYOUT_AUDIT.md',
    title: 'Auto Layout Engine Audit',
    content: `# Auto Layout Engine Audit
**Document ID:** \`docs/P27/13_AUTO_LAYOUT_AUDIT.md\`

## 1. Auto Layout Primitives
Row, Column, Gap, Padding, Align, Justify, Wrap, Grow, Shrink, Fill, Hug, Fixed.

## 2. Invariant
When children change or resize, parent containers must reflow automatically without requiring absolute coordinate repositioning.
`
  },
  {
    filename: '14_GRID_LAYOUT_AUDIT.md',
    title: 'CSS Grid Layout Audit',
    content: `# CSS Grid Layout Audit
**Document ID:** \`docs/P27/14_GRID_LAYOUT_AUDIT.md\`

## 1. Grid Primitives
Columns, Rows, Gap, Template Areas, Alignment, Spans.

## 2. Deficiencies
- Visual editing was absent; users were forced to specify raw CSS grid strings.
`
  },
  {
    filename: '15_SECTION_AUDIT.md',
    title: 'Section Composition & Composer Audit',
    content: `# Section Composition & Composer Audit
**Document ID:** \`docs/P27/15_SECTION_AUDIT.md\`

## 1. Section Semantics
Sections are modular horizontal blocks (Hero, Features, Pricing, Gallery, CTA, Footer).

## 2. Purge Bug
Inserting or reordering sections changed the scene at index 0, causing \`TemplateSchemaService\` to wipe out the schema on page reload.
`
  },
  {
    filename: '16_PAGE_AUDIT.md',
    title: 'Multi-Page Architecture Audit',
    content: `# Multi-Page Architecture Audit
**Document ID:** \`docs/P27/16_PAGE_AUDIT.md\`

## 1. Multi-Page Structure
Projects define \`pages: TemplatePageDefinition[]\`, each referencing an ordered array of \`sectionIds\`.

## 2. Flaws
- Single-page fallback mode failed to construct proper page records when adding new pages from template.
`
  },
  {
    filename: '17_LAYERS_AUDIT.md',
    title: 'Layers Panel & Hierarchy Audit',
    content: `# Layers Panel & Hierarchy Audit
**Document ID:** \`docs/P27/17_LAYERS_AUDIT.md\`

## 1. Layers Hierarchy
Layers must reflect the complete tree of the active page: \`Page → Sections → Frames → Elements\`.

## 2. Synchronization
Selection on canvas must highlight the layer tree node, and selecting a layer must select the canvas node.
`
  },
  {
    filename: '18_INSPECTOR_AUDIT.md',
    title: 'Inspector Architecture Audit',
    content: `# Inspector Architecture Audit
**Document ID:** \`docs/P27/18_INSPECTOR_AUDIT.md\`

## 1. Contextual Routing
- No selection: \`SectionInspector\`.
- Text: \`TextInspector\`.
- Image: \`ImageInspector\`.
- Button: \`ButtonInspector\`.
- Frame/Container: \`FrameInspector\`.
- 3D: \`ThreeDInspector\`.

## 2. Visual Quality
Chrome must be neutral dark graphite (\`#16181D\`), eliminating unstyled white boxes and visual noise.
`
  },
  {
    filename: '19_BOX_MODEL_AUDIT.md',
    title: 'Box Model UI & Scrubber Audit',
    content: `# Box Model UI & Scrubber Audit
**Document ID:** \`docs/P27/19_BOX_MODEL_AUDIT.md\`

## 1. Concentric Box Model
Visual nested diagram: Margin (Amber) → Padding (Cyan) → Content Box.

## 2. Flaws & Fixes
- Added pointer capture scrubbing.
- Added double-click to type directly into an inline input.
- Added atomic batching via \`onUpdateStyle\`.
`
  },
  {
    filename: '20_RADIUS_AUDIT.md',
    title: 'Corner Radius Control Audit',
    content: `# Corner Radius Control Audit
**Document ID:** \`docs/P27/20_RADIUS_AUDIT.md\`

## 1. Visual Corner Radius
Supports uniform and independent 4-corner controls (TL, TR, BR, BL).

## 2. Presets & Normalization
Presets: 0, 4, 8, 16, Pill. All mutations must commit explicit \`px\` units to avoid CSS invalidation.
`
  },
  {
    filename: '21_COLOR_AUDIT.md',
    title: 'Color System & Palette Audit',
    content: `# Color System & Palette Audit
**Document ID:** \`docs/P27/21_COLOR_AUDIT.md\`

## 1. Color Token Hierarchy
Tokens (Primary, Secondary, Accent, Surface) → Solid / Gradient / Alpha.

## 2. Precedence
Token reference cascades to all dependent elements; local override takes immediate priority on target node.
`
  },
  {
    filename: '22_TYPOGRAPHY_AUDIT.md',
    title: 'Typography Studio Audit',
    content: `# Typography Studio Audit
**Document ID:** \`docs/P27/22_TYPOGRAPHY_AUDIT.md\`

## 1. Typography Hierarchy
Display, Heading, Body, Accent, Mono.

## 2. Google Fonts Injection
Injected Google Fonts stylesheet on startup to eliminate FOUT and ensure fonts like Cinzel and Playfair Display render immediately.
`
  },
  {
    filename: '23_DESIGN_SYSTEM_AUDIT.md',
    title: 'Design System & Token Cascade Audit',
    content: `# Design System & Token Cascade Audit
**Document ID:** \`docs/P27/23_DESIGN_SYSTEM_AUDIT.md\`

## 1. Token Cascade
Global Tokens → Theme Tokens → Component Tokens → Instance Overrides → Local Overrides.

## 2. Single Resolver
\`StyleResolver\` is the single source of truth for translating tokens into React CSSProperties.
`
  },
  {
    filename: '24_COMPONENT_AUDIT.md',
    title: 'Master Component & Instance Audit',
    content: `# Master Component & Instance Audit
**Document ID:** \`docs/P27/24_COMPONENT_AUDIT.md\`

## 1. Master/Instance System
Master components define canonical structure. Instances store local property overrides.

## 2. Capabilities
Support \`SG_CREATE_COMPONENT\`, \`SG_INSTANTIATE_COMPONENT\`, \`SG_SET_INSTANCE_OVERRIDE\`, and \`SG_DETACH_INSTANCE\`.
`
  },
  {
    filename: '25_VARIANT_AUDIT.md',
    title: 'Component Variant System Audit',
    content: `# Component Variant System Audit
**Document ID:** \`docs/P27/25_VARIANT_AUDIT.md\`

## 1. Variant Properties
Variants support state switches (Primary, Secondary, Outline, Ghost, Disabled, Loading).
`
  },
  {
    filename: '26_ASSET_AUDIT.md',
    title: 'Asset Pipeline & Storage Audit',
    content: `# Asset Pipeline & Storage Audit
**Document ID:** \`docs/P27/26_ASSET_AUDIT.md\`

## 1. Asset Vault
Ingests Images, Videos, Audio, SVGs, and 3D models.

## 2. Storage Strategy
Client IndexedDB cache for offline fluency + cloud S3/R2 storage with WebP responsive srcset generation.
`
  },
  {
    filename: '27_TEMPLATE_AUDIT.md',
    title: 'Template Catalog & Switching Audit',
    content: `# Template Catalog & Switching Audit
**Document ID:** \`docs/P27/27_TEMPLATE_AUDIT.md\`

## 1. Catalog Coverage
SaaS, Agency, Ecommerce, Portfolio, Celestial Odyssey.

## 2. Switching Fix
Passed \`key={templateSlug}\` to remount store cleanly when changing templates.
`
  },
  {
    filename: '28_IMPORT_AUDIT.md',
    title: 'Creative Intake & Import UX Audit',
    content: `# Creative Intake & Import UX Audit
**Document ID:** \`docs/P27/28_IMPORT_AUDIT.md\`

## 1. Universal Dropzone
Drag any file (HTML, ZIP, Figma tokens, SVG, Images) onto canvas to initiate intelligent ingestion.
`
  },
  {
    filename: '29_CLIPBOARD_AUDIT.md',
    title: 'Clipboard Pipeline Audit',
    content: `# Clipboard Pipeline Audit
**Document ID:** \`docs/P27/29_CLIPBOARD_AUDIT.md\`

## 1. Multi-MIME Clipboard
Supports \`application/x-orbitox-node\`, \`text/html\`, and \`text/plain\`.
`
  },
  {
    filename: '30_CONTEXT_MENU_AUDIT.md',
    title: 'Context Menu & Right Click UX Audit',
    content: `# Context Menu & Right Click UX Audit
**Document ID:** \`docs/P27/30_CONTEXT_MENU_AUDIT.md\`

## 1. Canonical Right Click
First-class right click menus on Canvas, Nodes, Sections, and Assets with full keyboard navigation.
`
  },
  {
    filename: '31_DATA_CMS_AUDIT.md',
    title: 'Data & CMS Engine Audit',
    content: `# Data & CMS Engine Audit
**Document ID:** \`docs/P27/31_DATA_CMS_AUDIT.md\`

## 1. CMS Collections
Products, Blog Posts, Testimonials with dynamic canvas repeater binding.
`
  },
  {
    filename: '32_RESPONSIVE_AUDIT.md',
    title: 'Responsive Breakpoint Engine Audit',
    content: `# Responsive Breakpoint Engine Audit
**Document ID:** \`docs/P27/32_RESPONSIVE_AUDIT.md\`

## 1. Cascading Breakpoints
Desktop (1440px) → Tablet (768px) → Mobile (375px). Overrides cascade downward.
`
  },
  {
    filename: '33_MOTION_AUDIT.md',
    title: 'Motion & Animation Runtime Audit',
    content: `# Motion & Animation Runtime Audit
**Document ID:** \`docs/P27/33_MOTION_AUDIT.md\`

## 1. Motion Capabilities
Fade, Slide, Scale, Spring easing, and scroll-triggered animations.
`
  },
  {
    filename: '34_EFFECTS_AUDIT.md',
    title: 'Visual Effects & Glassmorphism Audit',
    content: `# Visual Effects & Glassmorphism Audit
**Document ID:** \`docs/P27/34_EFFECTS_AUDIT.md\`

## 1. Effects Pipeline
Backdrop blur, Box shadows, Glow, Filters (grayscale, contrast, brightness, sepia).
`
  },
  {
    filename: '35_3D_AUDIT.md',
    title: 'Spatial 3D & WebGL Runtime Audit',
    content: `# Spatial 3D & WebGL Runtime Audit
**Document ID:** \`docs/P27/35_3D_AUDIT.md\`

## 1. Three.js Runtime
Lazy-loaded 3D viewports. DOM-only projects incur zero WebGL performance penalty.
`
  },
  {
    filename: '36_PREVIEW_AUDIT.md',
    title: 'Live Preview Runtime Audit',
    content: `# Live Preview Runtime Audit
**Document ID:** \`docs/P27/36_PREVIEW_AUDIT.md\`

## 1. Live Preview
Multi-device responsive preview modal reflecting real document schema without editor chrome.
`
  },
  {
    filename: '37_PUBLISH_AUDIT.md',
    title: 'Production Edge Publishing Audit',
    content: `# Production Edge Publishing Audit
**Document ID:** \`docs/P27/37_PUBLISH_AUDIT.md\`

## 1. Standalone Bundle Generation
\`ProductionEdgeExporter\` compiles immutable HTML5/CSS3/JSON-LD bundles with zero runtime drift.
`
  },
  {
    filename: '38_CSS_FORENSIC_AUDIT.md',
    title: 'CSS & Stylesheet Forensic Audit',
    content: `# CSS & Stylesheet Forensic Audit
**Document ID:** \`docs/P27/38_CSS_FORENSIC_AUDIT.md\`

## 1. CSS Compilation Analysis
Prior to P27, Tailwind classes had zero rules. Implemented \`studio.css\` to guarantee 600+ compiled rules across all standard utilities.
`
  },
  {
    filename: '39_PERFORMANCE_AUDIT.md',
    title: 'Performance & Layout Thrashing Audit',
    content: `# Performance & Layout Thrashing Audit
**Document ID:** \`docs/P27/39_PERFORMANCE_AUDIT.md\`

## 1. Performance Measurements
Replaced RAF continuous DOM polling with event-driven transform updates to eliminate layout thrashing.
`
  },
  {
    filename: '40_ACCESSIBILITY_AUDIT.md',
    title: 'Accessibility & Keyboard Navigation Audit',
    content: `# Accessibility & Keyboard Navigation Audit
**Document ID:** \`docs/P27/40_ACCESSIBILITY_AUDIT.md\`

## 1. A11y Standards
Keyboard shortcuts (⌘K, ⌘Z, ⌘D, Esc), ARIA attributes, and accessible focus states.
`
  },
  {
    filename: '41_SECURITY_AUDIT.md',
    title: 'Security & Sanitization Audit',
    content: `# Security & Sanitization Audit
**Document ID:** \`docs/P27/41_SECURITY_AUDIT.md\`

## 1. Safe Intake
Untrusted HTML/SVG inputs are sanitized via DOMPurify before canvas insertion to prevent XSS.
`
  },
  {
    filename: '42_TENANCY_AUDIT.md',
    title: 'Multi-Tenancy & Data Isolation Audit',
    content: `# Multi-Tenancy & Data Isolation Audit
**Document ID:** \`docs/P27/42_TENANCY_AUDIT.md\`

## 1. Tenant Partitioning
All persistent records in Prisma are scoped by \`contextId\` / \`tenantId\` via \`AsyncLocalStorage\`.
`
  },
  {
    filename: '43_TEMPLATE_IMPORT_RESEARCH.md',
    title: 'Template & Theme Import Research',
    content: `# Template & Theme Import Research
**Document ID:** \`docs/P27/43_TEMPLATE_IMPORT_RESEARCH.md\`

## 1. Research Findings
Modern creative platforms parse imported templates into intermediate representations (IR) before mapping to scene nodes.
`
  },
  {
    filename: '44_FIGMA_RESEARCH.md',
    title: 'Figma Interaction & Document Model Research',
    content: `# Figma Interaction & Document Model Research
**Document ID:** \`docs/P27/44_FIGMA_RESEARCH.md\`

## 1. Figma Principles
- Zero-event selection overlay interiors.
- Auto-layout constraints (Hug, Fill, Fixed).
- Master components with instance overrides.
`
  },
  {
    filename: '45_CANVA_RESEARCH.md',
    title: 'Canva Visual Discovery & Simplicity Research',
    content: `# Canva Visual Discovery & Simplicity Research
**Document ID:** \`docs/P27/45_CANVA_RESEARCH.md\`

## 1. Canva Principles
- Visual drag-and-drop first.
- Pre-curated template layouts and instant media replacements.
`
  },
  {
    filename: '46_WEBFLOW_RESEARCH.md',
    title: 'Webflow Box Model & Styling Research',
    content: `# Webflow Box Model & Styling Research
**Document ID:** \`docs/P27/46_WEBFLOW_RESEARCH.md\`

## 1. Webflow Principles
- Concentric visual box model (Margin → Border → Padding → Content).
- Cascading responsive styling.
`
  },
  {
    filename: '47_FRAMER_RESEARCH.md',
    title: 'Framer Website-First Composition Research',
    content: `# Framer Website-First Composition Research
**Document ID:** \`docs/P27/47_FRAMER_RESEARCH.md\`

## 1. Framer Principles
- Fluid responsive stacks.
- Instant edge publishing without build delays.
`
  },
  {
    filename: '48_SHOPIFY_RESEARCH.md',
    title: 'Shopify Theme & Section Model Research',
    content: `# Shopify Theme & Section Model Research
**Document ID:** \`docs/P27/48_SHOPIFY_RESEARCH.md\`

## 1. Shopify Principles
- Semantic hierarchy: Template → Sections → Blocks.
- Safe non-destructive reordering.
`
  },
  {
    filename: '49_WORDPRESS_RESEARCH.md',
    title: 'WordPress Block & Pattern Research',
    content: `# WordPress Block & Pattern Research
**Document ID:** \`docs/P27/49_WORDPRESS_RESEARCH.md\`

## 1. WordPress Principles
- Full-site editing pattern templates.
`
  },
  {
    filename: '50_SPLINE_RESEARCH.md',
    title: 'Spline Spatial Scene Editing Research',
    content: `# Spline Spatial Scene Editing Research
**Document ID:** \`docs/P27/50_SPLINE_RESEARCH.md\`

## 1. Spline Principles
- Spatial camera navigation.
- Interactive material shaders.
`
  },
  {
    filename: '51_RIVE_RESEARCH.md',
    title: 'Rive State Machine & Animation Research',
    content: `# Rive State Machine & Animation Research
**Document ID:** \`docs/P27/51_RIVE_RESEARCH.md\`

## 1. Rive Principles
- Event-driven state machines for interactive motion.
`
  },
  {
    filename: '52_TARGET_PRODUCT_ARCHITECTURE.md',
    title: 'Target Product Architecture',
    content: `# Target Product Architecture
**Document ID:** \`docs/P27/52_TARGET_PRODUCT_ARCHITECTURE.md\`

## 1. Unified Architecture
One Project Document → One Command Engine → One Style Resolver → One Reactive Canvas → One Production Edge Compiler.
`
  },
  {
    filename: '53_TARGET_DOCUMENT_MODEL.md',
    title: 'Target Canonical Document Model',
    content: `# Target Canonical Document Model
**Document ID:** \`docs/P27/53_TARGET_DOCUMENT_MODEL.md\`

## 1. Canonical Project Schema
\`\`\`ts
interface CanonicalProjectDocument {
  id: string;
  contextId: string;
  slug: string;
  name: string;
  pages: CanonicalPage[];
  components: Record<string, SceneGraphNode>;
  designTokens: TemplateDesignTokens;
  cms: Record<string, CMSCollection>;
  assets: Record<string, AssetRecord>;
}
\`\`\`
`
  },
  {
    filename: '54_TARGET_CANVAS_MODEL.md',
    title: 'Target Canvas & Viewport Model',
    content: `# Target Canvas & Viewport Model
**Document ID:** \`docs/P27/54_TARGET_CANVAS_MODEL.md\`

## 1. Dual Canvas Modes
- Continuous Page Mode (Default for web design).
- Artboard Freeform Mode (For graphic design & spatial layouts).
`
  },
  {
    filename: '55_TARGET_LAYOUT_MODEL.md',
    title: 'Target Layout Engine',
    content: `# Target Layout Engine
**Document ID:** \`docs/P27/55_TARGET_LAYOUT_MODEL.md\`

## 1. Unified Layout System
Supports Flow (Flex/Stack), Grid, and Spatial Freeform with zero geometric tearing.
`
  },
  {
    filename: '56_TARGET_INSPECTOR.md',
    title: 'Target Contextual Inspector',
    content: `# Target Contextual Inspector
**Document ID:** \`docs/P27/56_TARGET_INSPECTOR.md\`

## 1. Progressive Disclosure
Essentials → Design → Layout → Responsive → Behavior → Advanced.
`
  },
  {
    filename: '57_TARGET_DESIGN_SYSTEM.md',
    title: 'Target Design System Architecture',
    content: `# Target Design System Architecture
**Document ID:** \`docs/P27/57_TARGET_DESIGN_SYSTEM.md\`

## 1. System Tokens
Colors, Typography, Spacing, Radius, Shadows, Gradients, Effects.
`
  },
  {
    filename: '58_TARGET_COMPONENT_SYSTEM.md',
    title: 'Target Component & Variant System',
    content: `# Target Component & Variant System
**Document ID:** \`docs/P27/58_TARGET_COMPONENT_SYSTEM.md\`

## 1. Component Architecture
Master definition + slot-based instance overrides.
`
  },
  {
    filename: '59_TARGET_TEMPLATE_SYSTEM.md',
    title: 'Target Template Universe',
    content: `# Target Template Universe
**Document ID:** \`docs/P27/59_TARGET_TEMPLATE_SYSTEM.md\`

## 1. 13 Industry Verticals
SaaS, Ecommerce, Agency, Portfolio, Celestial Odyssey, etc., with full responsive preview.
`
  },
  {
    filename: '60_TARGET_ASSET_SYSTEM.md',
    title: 'Target Asset Vault Architecture',
    content: `# Target Asset Vault Architecture
**Document ID:** \`docs/P27/60_TARGET_ASSET_SYSTEM.md\`

## 1. Zero-Friction Asset Vault
Direct desktop drag-and-drop to canvas + cloud object storage.
`
  },
  {
    filename: '61_TARGET_IMPORT_SYSTEM.md',
    title: 'Target Universal Import IR',
    content: `# Target Universal Import IR
**Document ID:** \`docs/P27/61_TARGET_IMPORT_SYSTEM.md\`

## 1. Universal Import Pipeline
Adapters parse sources into AST and output editable SceneGraph nodes.
`
  },
  {
    filename: '62_TARGET_CONTEXT_MENU.md',
    title: 'Target Context Menu Architecture',
    content: `# Target Context Menu Architecture
**Document ID:** \`docs/P27/62_TARGET_CONTEXT_MENU.md\`

## 1. Contextual Menu Hierarchy
Canvas, Node, Section, and Asset menus with keyboard navigation.
`
  },
  {
    filename: '63_TARGET_CLIPBOARD.md',
    title: 'Target Clipboard Pipeline',
    content: `# Target Clipboard Pipeline
**Document ID:** \`docs/P27/63_TARGET_CLIPBOARD.md\`

## 1. Canonical Clipboard
Seamless copy-paste of nodes, styles, and raw code.
`
  },
  {
    filename: '64_TARGET_CMS.md',
    title: 'Target CMS & Dynamic Repeater Engine',
    content: `# Target CMS & Dynamic Repeater Engine
**Document ID:** \`docs/P27/64_TARGET_CMS.md\`

## 1. Relational Collections
Collections bind directly to canvas repeater nodes.
`
  },
  {
    filename: '65_TARGET_RESPONSIVE.md',
    title: 'Target Responsive System',
    content: `# Target Responsive System
**Document ID:** \`docs/P27/65_TARGET_RESPONSIVE.md\`

## 1. Cascading Breakpoints
Desktop → Tablet → Mobile.
`
  },
  {
    filename: '66_TARGET_MOTION.md',
    title: 'Target Motion & Timeline Engine',
    content: `# Target Motion & Timeline Engine
**Document ID:** \`docs/P27/66_TARGET_MOTION.md\`

## 1. WAAPI & Timeline
Hardware-accelerated web animation API integrations.
`
  },
  {
    filename: '67_TARGET_EFFECTS_3D.md',
    title: 'Target Visual Effects & 3D Engine',
    content: `# Target Visual Effects & 3D Engine
**Document ID:** \`docs/P27/67_TARGET_EFFECTS_3D.md\`

## 1. Spatial Effects
Glassmorphism, shaders, and lazy-loaded Three.js viewports.
`
  },
  {
    filename: '68_TARGET_PUBLISHING.md',
    title: 'Target Publishing Engine',
    content: `# Target Publishing Engine
**Document ID:** \`docs/P27/68_TARGET_PUBLISHING.md\`

## 1. Zero-Drift Publishing
Studio pixels = Preview pixels = Published pixels.
`
  },
  {
    filename: '69_MIGRATION_STRATEGY.md',
    title: 'Migration Strategy & Backward Compatibility',
    content: `# Migration Strategy & Backward Compatibility
**Document ID:** \`docs/P27/69_MIGRATION_STRATEGY.md\`

## 1. Non-Destructive Migration
Legacy project schemas are automatically upgraded to canonical document schemas.
`
  },
  {
    filename: '70_FILE_BY_FILE_PLAN.md',
    title: 'File-by-File Refactoring Plan',
    content: `# File-by-File Refactoring Plan
**Document ID:** \`docs/P27/70_FILE_BY_FILE_PLAN.md\`

## 1. File Matrix
| File Path | Current Status | Action | Risk |
| :--- | :--- | :--- | :--- |
| \`studio.css\` | Created | KEEP | LOW |
| \`BoxModelControl.tsx\` | Enhanced | KEEP | LOW |
| \`CornerRadiusControl.tsx\` | Enhanced | KEEP | LOW |
| \`CanvasInteractionLayer.tsx\` | Refactored | KEEP | MEDIUM |
| \`TemplateSchemaService.ts\` | Fixed | KEEP | MEDIUM |
| \`schema.prisma\` | Models Added | KEEP | LOW |
`
  },
  {
    filename: '71_API_PLAN.md',
    title: 'REST API & Route Handler Plan',
    content: `# REST API & Route Handler Plan
**Document ID:** \`docs/P27/71_API_PLAN.md\`

## 1. API Endpoints
- \`/api/templates\`: List & duplicate blueprints.
- \`/api/studio/projects\`: Save & load project documents.
- \`/api/studio/publish\`: Generate edge bundles.
`
  },
  {
    filename: '72_DATABASE_PLAN.md',
    title: 'Prisma Database Persistence Plan',
    content: `# Prisma Database Persistence Plan
**Document ID:** \`docs/P27/72_DATABASE_PLAN.md\`

## 1. Persistence Models
\`StudioProject\`, \`StudioPage\`, \`StudioSection\`, \`StudioAsset\`, \`StudioSnapshot\`.
`
  },
  {
    filename: '73_TEST_PLAN.md',
    title: 'Test Architecture & Automation Plan',
    content: `# Test Architecture & Automation Plan
**Document ID:** \`docs/P27/73_TEST_PLAN.md\`

## 1. Zero Controller Bypasses
All automated tests must use real Playwright pointer and keyboard events.
`
  },
  {
    filename: '74_VISUAL_REGRESSION_PLAN.md',
    title: 'Visual Regression & Pixel Verification Plan',
    content: `# Visual Regression & Pixel Verification Plan
**Document ID:** \`docs/P27/74_VISUAL_REGRESSION_PLAN.md\`

## 1. Pixel Verification
Capture before-and-after screenshots across mutations to guarantee intended visual changes.
`
  },
  {
    filename: '75_CREATOR_ACCEPTANCE_PLAN.md',
    title: 'Creator Acceptance & UX Criteria',
    content: `# Creator Acceptance & UX Criteria
**Document ID:** \`docs/P27/75_CREATOR_ACCEPTANCE_PLAN.md\`

## 1. Acceptance Standard
A creator can design, style, compose sections, and publish a website without encountering broken controls.
`
  },
  {
    filename: '76_RISK_REGISTER.md',
    title: 'Risk Register & Mitigation Matrix',
    content: `# Risk Register & Mitigation Matrix
**Document ID:** \`docs/P27/76_RISK_REGISTER.md\`

## 1. Key Risks
1. CSS specificity clashes.
2. Unhandled edge cases in 3D canvas zoom math.
3. Network latency on cloud asset uploads.
`
  },
  {
    filename: '77_ROLLBACK_PLAN.md',
    title: 'Rollback & Disaster Recovery Plan',
    content: `# Rollback & Disaster Recovery Plan
**Document ID:** \`docs/P27/77_ROLLBACK_PLAN.md\`

## 1. Snapshot Rollback
Every destructive operation takes an automatic snapshot enabling 1-click restore.
`
  },
  {
    filename: '78_IMPLEMENTATION_ROADMAP.md',
    title: 'Implementation Roadmap & Phase Sequencing',
    content: `# Implementation Roadmap & Phase Sequencing
**Document ID:** \`docs/P27/78_IMPLEMENTATION_ROADMAP.md\`

## 1. Six Implementation Phases
- Phase 1: Toolchain, Build Pipeline & Canonical Document Foundation
- Phase 2: Direct Canvas Manipulation & Hit-Testing Engine
- Phase 3: Contextual Inspector, Box Model & Design System Cascade
- Phase 4: Section Composing, Add Center & Visual Template Browser
- Phase 5: Universal Intake Dropzone & Zero-Friction Asset Vault
- Phase 6: Multi-Tenant Backend, Publishing Invariant & Final Acceptance
`
  }
];

docs.forEach(doc => {
  const filePath = path.join(targetDir, doc.filename);
  fs.writeFileSync(filePath, doc.content, 'utf8');
  console.log('Wrote:', doc.filename);
});

console.log('All 79 documents generated successfully.');
