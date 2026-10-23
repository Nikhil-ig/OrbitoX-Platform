# 🪐 OrbitoX Studio — P20 Deep Forensic Engineering Audit
**Document ID:** `docs/P20_FORENSIC_AUDIT.md`
**Phase:** P20 — Phase 0: Deep Forensic Audit & Rebuild Planning
**Date:** October 3, 2026 (Deepened Pass — Full Source + Browser)
**Auditor:** Combined Principal Architecture, Frontend, Canvas, UX, Motion, and Systems Engineering Team
**Status:** AUDIT COMPLETE — ZERO CODE MODIFIED — AWAITING USER APPROVAL

---

## AUDIT METHOD

Three independent forensic channels:

1. **Full Source Code Read** — Every critical file read line-by-line (CanvasInteractionLayer, StyleResolver, TemplateEditorStore, PropertiesPanel, MotionWorkspace, ThreeDWorkspace, FileUploadService, TemplateSchemaService, StudioShell, TemplateFactory, TemplateContentMigrator)
2. **Browser Live Inspection** — Screenshots captured at localhost:3010/admin/template-studio
3. **Evidence Comparison** — UI screenshots vs source implementation

---

## 1. Executive Summary — The Verdict

| Claim | Reality |
|---|---|
| Canvas selection + dragging works | BROKEN: elementsFromPoint picks the wrong underlying element |
| Layers panel shows full page tree | BROKEN: Only shows active section (~5 nodes) |
| Box model inspector works | BROKEN: Wrong property path dispatched |
| Corner radius works | BROKEN: borderRadius.all dispatched; renderer reads border.radius |
| Inspector is contextual | MISLEADING: Labeled "Page Inspector" regardless of context |
| 3D Workspace uses WebGL | FAKE: HTML5 2D Canvas ctx.ellipse() drawing wireframe rings |
| Motion Timeline drives canvas | DISCONNECTED: Playhead is local React state only |
| Template switching changes website | FAKE: All templates use celebration-only schemas |
| Asset upload creates real files | HAZARDOUS: base64 DataURL in localStorage (5MB quota bomb) |
| Performance score is real | FABRICATED: score = 98 - arithmetic corrections, no real measurement |

---

## 2. Screen Map — Complete UI Region Inventory

From live browser screenshots (template: celestial-odyssey, CloudPulse NextGen SaaS selected):

```
APP ROOT (100vw x 100vh, #0C0D10)
|
+-- TOP BAR (~40px height)
|   +-- OrbitoX logo
|   +-- Project Name: "CloudPulse NextGen SaaS" [editable]
|   +-- Save badge: "Saved"
|   +-- Undo / Redo buttons
|   +-- Mode tabs: [Build] [Style] [Motion] [Prototype] [3D]
|   +-- Viewport: [Desktop] [Tablet] [Mobile]
|   +-- "98% Optimal" badge [FABRICATED]
|   +-- Ask AI button
|   +-- Preview button
|   +-- Share icon
|   +-- Publish button (purple CTA)
|
+-- LEFT ICON RAIL (~30px wide)
|   +-- [+] Add element
|   +-- [grid] Templates
|   +-- [page] Pages
|   +-- [layers] Layers [BROKEN - shows only active section]
|   +-- [image] Assets
|   +-- [component] Components
|   +-- [palette] Styles
|   +-- [database] Data
|   +-- [settings] Settings/Shortcuts
|
+-- LEFT CONTEXTUAL DRAWER (~310px, opens on rail click)
|   Templates drawer shows:
|   +-- "Site Templates" header + "Explore" link
|   +-- Search input
|   +-- Tabs: [All] [Popular] [SaaS] [Portfolio]
|   +-- Category rows: SAAS, BUSINESS, PORTFOLIO, AGENCY, ECOMMERCE,
|       RESTAURANT, HOTEL, WEDDING, CELEBRATION, EVENT,
|       EDITORIAL, EXPERIMENTAL, 3D
|       [ALL ROUTE TO SAME CELEBRATION SCHEMAS]
|
+-- CANVAS SECTION TABS (horizontal, above canvas)
|   "2. The Protagonists  3. Chronicle  4. The Clock  5. Program..."
|   [CELEBRATION NAMES despite "CloudPulse SaaS" template being active]
|
+-- CANVAS (center, fill remaining)
|   +-- 39% zoom frame (1440x900 viewport)
|   +-- SceneGraphRenderer for active section
|   +-- Selection overlay (blue border + handles)
|   +-- Current render shows:
|       "CELESTIAL ODYSSEY"
|       "In the presence of our dearest family & companions"
|       "Aarav Sharma"
|       [WEDDING CONTENT despite SaaS template selected]
|
+-- FLOATING CONTEXT BAR (bottom-center, on node select)
|   [TEXT] [Bold] [Align] [Justify] [Make Beautiful] [Remix] [AI] [Copy] [Delete]
|
+-- BREADCRUMB (bottom-left)
|   "Page > Grand Entrance > Celebration Title"
|
+-- STATUS BAR (bottom-center)
|   "Viewport: 1440 x 900 px  60 FPS  Edge CDN  98% Optimal"
|   [ALL METRICS FABRICATED]
|
+-- ZOOM (bottom-right)
|   "- 39% +" | Fullscreen | Shortcuts
|
+-- RIGHT INSPECTOR (~310px)
    +-- Header: "Celebration Title" [copy] [delete] [Component]
    +-- Tabs: [Essentials] [Design] [Behavior] [Advanced]
    +-- Behavior tab (visible in screenshot):
    |   Parallax Depth Plane slider (-5 to +5)
    |   Depth presets: [Deep BG] [Atmosphere] [Canvas(0)] [Midground] [Foreground] [Float UI]
    |   Entrance Motion Preset dropdown: "Fade Reveal"
    |   Hover Micro-Interaction: "None"
    |   [Ask AI About This Layer] button
    +-- Layers Panel (when open):
        Header: "Layers 5" [ONLY 5 NODES - BROKEN]
        - Hero Root (frame)
          - Hero Background Gradient (frame)
          - Celebration Title (text) [selected]
          - Tagline (text)
          - Partner Names (text)
        MISSING: 10 other sections
```

---

## 3. Complete Control Inventory

### Top Bar
| Control | Status | Evidence |
|---|---|---|
| Project Name input | WORKING | Calls controller.updateScene() |
| Save status badge | WORKING | Reflects state.persistence.status |
| Undo | WORKING | controller.undo() -> TemplateEditorHistory |
| Redo | WORKING | controller.redo() -> TemplateEditorHistory |
| Build/Style/Motion/Prototype/3D tabs | PARTIAL | Tabs switch; Motion/3D disconnected |
| Desktop/Tablet/Mobile viewport | WORKING | controller.setDevice() |
| 98% Optimal badge | FABRICATED | score=98 hardcoded arithmetic |
| Ask AI | PARTIAL | Opens modal; no real AI API |
| Preview | PARTIAL | Opens modal; renders current schema |
| Publish | PARTIAL | Opens modal; actual CDN deploy unconfirmed |

### Canvas Controls
| Control | Status | Evidence |
|---|---|---|
| Click to select | BROKEN | elementsFromPoint picks underlying element |
| Drag to move | BROKEN | Wrong element dragged |
| Resize handles | PARTIAL | Correct logic but depends on broken selection |
| Rotate handle | PARTIAL | Same dependency |
| Double-click inline edit | PARTIAL | InlineEditOverlay shown; may work if correct node |
| Zoom | WORKING | CSS scale applied correctly |
| Pan | PARTIAL | Scroll exists; true pinch-pan unconfirmed |
| Escape deselect | WORKING | controller.clearSelection() |
| Delete key | WORKING | SG_DELETE_NODE |
| Arrow nudge | WORKING | SG_UPDATE_GEOMETRY with dx/dy |
| Cmd+D duplicate | WORKING | SG_DUPLICATE_NODE |

### Layers Panel
| Control | Status | Evidence |
|---|---|---|
| Expand/collapse | WORKING | collapsedNodes Set |
| Search | WORKING | Filters by name |
| Select node | WORKING | onSelectNode() |
| Eye toggle | WORKING | SG_HIDE_NODE |
| Lock toggle | WORKING | SG_LOCK_NODE |
| Rename | WORKING | SG_UPDATE_NODE_PROPERTY |
| Reorder | WORKING | SG_REORDER_NODE |
| Duplicate | WORKING | SG_DUPLICATE_NODE |
| Delete | WORKING | SG_DELETE_NODE |
| Full page tree | BROKEN | Only activeScene.sceneGraph passed (1 section) |

### Right Inspector — Essentials Tab
| Control | Status | Evidence |
|---|---|---|
| Width input | PARTIAL | Writes geometry; units inconsistent |
| Height input | PARTIAL | Same |
| X/Y position | PARTIAL | Only works for absolute positioned nodes |
| Rotation | WORKING | Geometry patch dispatched |
| Opacity | WORKING | geometry.opacity read by renderer |
| Corner radius slider | BROKEN | Dispatches borderRadius.all; renderer reads border.radius |
| Individual radius corners | BROKEN | Same key mismatch |
| Padding (4 sides) | BROKEN | Both shorthand+longhand dispatched simultaneously |
| Margin (4 sides) | BROKEN | Same; no flex/grid/absolute context awareness |
| Z-Index | PARTIAL | Dispatched correctly; renderer reads geometry.zIndex |

### Motion Controls
| Control | Status | Evidence |
|---|---|---|
| Timeline playhead | DISCONNECTED | currentTime local state only; no canvas driver |
| Play/Pause | PARTIAL | RAF loop; canvas unchanged |
| Track display | COSMETIC | Static boxes; not wired to keyframes |
| Keyframe markers | COSMETIC | No setKeyframe/getKeyframe operations |
| Spring physics sliders | PARTIAL | Writes node.motion.in.spring; may affect CSS animation |
| Cubic bezier handles | PARTIAL | Writes bezier back to node; affects CSS easing |
| Duration slider | DISCONNECTED | Local state only; node not updated |

### Template Controls
| Control | Status | Evidence |
|---|---|---|
| Template category list | WORKING | Opens categories |
| Template card click | FAKE | Routes to celebration factory methods |
| Replace Site | FAKE | createModernTemplate() returns wedding scenes |
| Add Template Section | PARTIAL | Adds section but wedding-themed content |
| Apply Theme Only | WORKING | applyTheme() correctly injects design tokens |

### Asset Controls
| Control | Status | Evidence |
|---|---|---|
| Asset search | WORKING | Filters defaultAssets |
| Category filter | WORKING | Filters by category |
| Upload button | HAZARDOUS | base64 DataURL -> localStorage (quota bomb) |
| Asset thumbnail | WORKING | img src renders correctly |
| Drag to canvas | PARTIAL | onInsertNode() called; scene targeting uncertain |
| Asset Delete | PARTIAL | controller.deleteAsset() |

---

## 4. Exact Bug Forensics with Source Evidence

### BUG 01: Wrong Element Moves on Drag

File: CanvasInteractionLayer.tsx, Lines 245-256

```typescript
const handleBoxPointerDown = (e, nodeId) => {
  // nodeId = "node_celebration_title_2" (CORRECT - from selection overlay)
  
  const hitElements = document.elementsFromPoint(e.clientX, e.clientY);
  const underNodeEl = hitElements.find((el) => {
    const nid = el.getAttribute('data-node-id');
    return Boolean(nid && nid !== nodeId &&  // <- SKIPS THE SELECTED NODE
      !el.id.startsWith('canvas-selection-'));
  });

  const targetNodeId = underNodeEl
    ? underNodeEl.getAttribute('data-node-id')!  // <- PICKS BACKGROUND ELEMENT
    : nodeId;
};
```

Root Cause: nid !== nodeId explicitly excludes the correctly-identified node, then picks the first underlying element (background frame). The drag session then mutates the background, leaving the title frozen.

Live Evidence: Screenshot shows "Celebration Title" selected. After drag, Hero Background Gradient top changes from 0px to 114px while title remains at 288px.

### BUG 02: Layers Shows Only Active Section

File: StudioShell.tsx, Lines 984-996

```tsx
{activeRailTab === 'layers' && (
  <LayersPanel
    sceneGraph={activeScene.sceneGraph!}  // <- ONLY 1 SECTION'S SCENEGRAPH
    ...
  />
)}
```

Root Cause: activeScene = one TemplateSceneDefinition. With 11 sections on the page, only 5 nodes from the first section appear.

Live Evidence: Screenshot shows "Layers 5" header. Only Hero Root, Hero Background Gradient, Celebration Title, Tagline, Partner Names visible.

### BUG 03 & 04: Corner Radius and Box Model

Inspector path (PropertiesPanel):
Dispatches: { borderRadius: { all: '24px' } }

Renderer path (StyleResolver.ts, lines 188-198):
```typescript
if (style.border) {
  if (typeof style.border.radius === 'object') {
    css.borderRadius = style.border.radius.tl + ...;
  }
}
// NEVER reads style.borderRadius - property inspector writes
```

Padding conflict: handlePaddingChange() dispatches BOTH paddingTop: '10px' AND padding: '10px 0 0 0' simultaneously. Shorthand overrides longhands on re-render.

### BUG 05: Inspector Wrong Context Label

File: PropertiesPanel.tsx, Lines 111-144

```tsx
if (!selectedNode) {
  return (
    <aside>
      <span>Page Inspector</span>  // <- MISLABELED "PAGE" BUT EDITS SECTION
      <label>Section Name</label>  // <- EDITS activeScene (ONE SECTION)
    </aside>
  );
}
```

Root Cause: No true PageInspector, SectionInspector, LayoutInspector, or kind-specific inspectors exist. Monolithic 2,629-line component with hardcoded conditionals.

### BUG 06: Template Switch Does Not Change Website

File: StudioShell.tsx, Lines 830-856

All 5 template categories route to wedding factory methods:
- celestial -> createCelestialTemplate() [wedding]
- editorial/portfolio -> createEditorialTemplate() [wedding]
- agency/saas -> createModernTemplate() [wedding]
- ecommerce -> createGlasshouseTemplate() [wedding]
- restaurant/hotel -> createAmalfiTemplate() [wedding]

Live Evidence: Canvas shows "CELESTIAL ODYSSEY" and "Aarav Sharma" after selecting "CloudPulse NextGen SaaS". Section tabs show Grand Entrance, The Protagonists, Chronicle, The Clock.

TemplateContentMigrator.ts ProjectContentMap interface defines:
- celebrants.name1/name2
- rsvp.title
- wishes.title
(No generic headline, subhead, ctaText, brandName)

### BUG 07: ADD_SCENE Destroys Existing Sections

File: TemplateEditorStore.ts, Lines 487-501

```typescript
case 'ADD_SCENE': {
  const exists = draft.scenes.some((s) => s.id === command.scene.id);
  if (exists) {
    return {
      scenes: draft.scenes.map((s) =>
        s.id === command.scene.id ? command.scene : s  // <- SILENT OVERWRITE
      ),
    };
  }
}
```

WebSectionLibrary generates deterministic IDs (scene_hero, scene_navbar). Adding a "Hero" when one exists silently destroys the user's edited hero.

### BUG 08: 3D Workspace is Fake HTML5 2D Canvas

File: ThreeDWorkspace.tsx, Lines 36-38

```typescript
const ctx = canvas.getContext('2d');  // <- 2D NOT WEBGL
```

Lines 86-97 use ctx.ellipse() with Math.cos(angleX) loops. No Three.js, no WebGL, no PBR materials, no real 3D rendering.

### BUG 09: Motion Timeline is Disconnected

File: MotionWorkspace.tsx, Lines 77-97

```typescript
setCurrentTime(elapsed);  // <- LOCAL STATE ONLY
// Nothing connects this to canvas transforms, GSAP, or CSS animations
```

The play button animates a number. The canvas does not respond.

### BUG 10: Asset Upload Still base64 + localStorage

FileUploadService.ts: reader.readAsDataURL(file) -> base64 DataURL
TemplateSchemaService.ts: localStorage.setItem(key, JSON.stringify(schema))

One 1920x1080 JPEG = ~500KB -> base64 = ~670KB. 
2 images = ~1.3MB. 7 images = QuotaExceededError -> permanent draft loss.

### BUG 11: Performance Score Fabricated

StudioShell.tsx:
```typescript
let score = 98;
if (nodesCount > 200) score -= 10;
if (imgKb > 5000) score -= 8;
```

No PerformanceObserver. No LCP/CLS/INP. "98% Optimal" badge is arithmetic, not measurement.

---

## 5. Architecture Problems

### 5.1 State Architecture
- Dual schema storage: URL param + localStorage + React useMemo + store state
- No separation of UI state from canonical document
- activeScene.id used as sceneId for all node mutations regardless of which section node actually belongs to

### 5.2 Canvas Architecture  
- SceneGraph + DOM are dual sources of truth
- No pointer capture (setPointerCapture not called during drag)
- Transient delta may not commit if pointer released outside viewport

### 5.3 Inspector Architecture
- Monolithic 2,629-line PropertiesPanel - unmaintainable
- Wrong property key schema: inspector writes borderRadius.all; renderer reads border.radius
- No true contextual inspector types (Page, Section, Layout, Text, Image, Button, 3D)

### 5.4 Template Architecture
- Template = Project: TemplateSchema IS both the blueprint and the user's editable project
- No immutable blueprint system
- TemplateContentMigrator is celebration-domain-only

### 5.5 Missing Systems
- No real CMS/data binding system
- No component master/variant visual editor
- No verified publishing pipeline
- No real typography/font loading system
- No real parallax runtime (CSS variable --scroll-y set but no scroll listener confirmed)

---

## 6. Confirmed: No Production Code Modified

No files edited. No patches applied. No APIs changed. No database modified.
All findings are diagnostic only. Await explicit user approval before Phase 1.
