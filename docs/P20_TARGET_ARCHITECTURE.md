# 🪐 OrbitoX Studio — P20 Target Architecture
**Document ID:** `docs/P20_TARGET_ARCHITECTURE.md`
**Phase:** P20 — Phase 0 Planning
**Status:** DRAFT — AWAITING USER APPROVAL

---

## The Fundamental Design Principle

> **The canvas is the editor. The inspector is the canvas's reflection. The store is the single source of truth.**

Every architectural decision flows from this principle.

---

## Layer Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  STUDIO SHELL (React, 100vw x 100vh)                                         │
│  - Pure orchestration layer. No state. No logic. Wires components together.  │
├────────────────────────────────────────────────────────────────────────────┤
│  DOCUMENT STORE (Zustand / Context)                                           │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │  DOCUMENT STATE │  │  SELECTION STATE │  │  UI STATE (ephemeral)        │ │
│  │  - TemplateSchema│  │  - selectedNodeIds│  │  - zoom, activeRailTab      │ │
│  │  - pages[]      │  │  - activeSceneId  │  │  - isPreviewOpen            │ │
│  │  - scenes[]     │  │  - hoveredNodeId  │  │  - mode (build/style/motion)│ │
│  │  - designTokens │  │  - clipboard      │  │  - activeDevice             │ │
│  └─────────────────┘  └──────────────────┘  └──────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  HISTORY (Command Stack)  past[] | present | future[]                   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│  CANVAS ENGINE (CanvasWorkspace + SelectionOverlay + InteractionLayer)       │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  SCENE GRAPH RENDERER                                                 │    │
│  │  Input: scenes[], selectedNodeIds, zoom, viewport                     │    │
│  │  Output: DOM tree with data-node-id, data-scene-id attributes         │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  SCENE GRAPH HIT TESTER (pure SceneGraph, no DOM queries)             │    │
│  │  - hitTest(x, y, scenes, zoom) -> { nodeId, sceneId }                 │    │
│  │  - Uses SceneGraph bounding box tree, not document.elementsFromPoint   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  SELECTION OVERLAY (Canvas coordinate space, not DOM)                 │    │
│  │  - Renders selection handles, resize grips, rotation handle           │    │
│  │  - Input: selectedNode bounding boxes in canvas space                 │    │
│  │  - Pointer events ONLY on handles (not canvas background)             │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  INTERACTION STATE MACHINE                                            │    │
│  │  States: idle -> hover -> pressing -> dragging -> resize -> rotate    │    │
│  │  - On pointerdown: hitTest -> identify target -> transition state     │    │
│  │  - On pointermove: compute delta -> dispatch transient update         │    │
│  │  - On pointerup: commit transaction to history                        │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
├────────────────────────────────────────────────────────────────────────────┤
│  LAYERS PANEL (PageTreePanel)                                                │
│  - Input: ALL scenes (not just activeScene)                                   │
│  - Renders full page tree: Page -> Section (multiple) -> Nodes                │
│  - Click section row -> setActiveScene(); click node -> selectNode()          │
├────────────────────────────────────────────────────────────────────────────┤
│  INSPECTOR SYSTEM (Contextual - not monolithic)                              │
│  Renders ONE of: [PageInspector | SectionInspector | TextInspector |         │
│                   FrameInspector | ImageInspector | ButtonInspector |         │
│                   FormInspector | MediaInspector | ThreeDInspector]           │
│  All inspectors share:                                                        │
│  - StyleSchema: canonical property paths (border.radius.tl NOT borderRadius)  │
│  - Breakpoint picker + override badge                                          │
│  - Dispatch through same controller API                                        │
├────────────────────────────────────────────────────────────────────────────┤
│  TEMPLATE SYSTEM                                                              │
│  ┌──────────────────────────┐  ┌────────────────────────────────────────┐    │
│  │  TEMPLATE BLUEPRINTS     │  │  PROJECT INSTANCE                      │    │
│  │  - Immutable seed schemas│  │  - Mutable copy of blueprint           │    │
│  │  - Per vertical:         │  │  - Persisted to IndexedDB (not LSstorage)│   │
│  │    SaaS, Agency, Wedding,│  │  - Owns customer content               │    │
│  │    Restaurant, Portfolio │  │  - Separate from template definition   │    │
│  └──────────────────────────┘  └────────────────────────────────────────┘    │
│  ContentMigrator: Generic content map (headline, subhead, ctaText, brand)     │
├────────────────────────────────────────────────────────────────────────────┤
│  ASSET SYSTEM                                                                 │
│  - Upload -> Blob URL (object URL, no base64)                                 │
│  - IndexedDB for offline cache                                                 │
│  - S3/CDN for cloud assets (eventual)                                          │
│  - No base64 in schema JSON. No localStorage for images.                      │
├────────────────────────────────────────────────────────────────────────────┤
│  MOTION SYSTEM                                                                │
│  - MotionTimeline: keyframes[] stored in node.motion.keyframes                │
│  - Timeline scrubber -> drives GSAP or Web Animations API on canvas           │
│  - NOT local React state. Connected to canvas.                                │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## StyleSchema — The Single Source of Property Truth

```typescript
// The canonical schema. Both inspector AND renderer use this.
interface NodeStyle {
  background?: BackgroundValue;
  border?: {
    width?: string;
    style?: CSSBorderStyle;
    color?: ColorValue;
    radius?: {
      tl?: string; tr?: string; br?: string; bl?: string;
      all?: string;  // shorthand that sets all four
    };
  };
  padding?: {
    top?: string; right?: string; bottom?: string; left?: string;
  };
  margin?: {
    top?: string; right?: string; bottom?: string; left?: string;
  };
  typography?: TypographyValue;
  shadow?: ShadowValue;
  opacity?: number;
  effects?: EffectsValue;
}
```

TypeScript enforces the schema path. Inspector writes `style.border.radius.all`. StyleResolver reads `style.border.radius`. No mismatch is possible.

---

## Hit Testing — The Correct Algorithm

```typescript
// NEW: Pure SceneGraph hit test (no DOM queries)
function hitTest(
  x: number, y: number,  // canvas coordinates (viewport-relative, unscaled)
  scenes: TemplateSceneDefinition[],
  zoom: number
): { nodeId: string; sceneId: string } | null {
  // Walk scenes in reverse render order (topmost first)
  for (const scene of [...scenes].reverse()) {
    const { nodes, rootNodeId } = scene.sceneGraph;
    
    // Walk the tree depth-first, topmost z-order first
    const result = walkNodes(nodes, rootNodeId, (node) => {
      if (node.hidden || node.locked) return false;
      const bbox = computeNodeBBox(node, scene, zoom);
      return pointInBox(x, y, bbox);
    });
    
    if (result) return { nodeId: result.id, sceneId: scene.id };
  }
  return null;
}
```

No `document.elementsFromPoint()`. No DOM traversal. Pure SceneGraph math.

---

## State Separation

```typescript
// DOCUMENT state (persisted to IndexedDB)
interface DocumentState {
  schema: TemplateSchema;
  assets: AssetRecord[];
}

// EDITOR state (ephemeral, lives only during session)
interface EditorState {
  selection: {
    activeSceneId: string;
    selectedNodeIds: string[];
    hoveredNodeId: string | null;
    clipboard: SceneGraphNode | null;
  };
  viewport: DeviceBreakpoint;
  zoom: number;
  mode: StudioMode;
  activeRailTab: RailTab | null;
  // ...modals, panels etc.
}

// These NEVER mix. Document state is the source of truth.
// Editor state is derived from Document state.
```

---

## Layers Panel — Full Page Tree

```tsx
// PageTreePanel.tsx — receives ALL scenes, not just active
<PageTreePanel
  pages={schema.pages}
  scenes={schema.scenes}           // <- ALL SECTIONS
  activeSceneId={activeSceneId}
  selectedNodeId={selectedNodeId}
  onSelectScene={setActiveScene}
  onSelectNode={selectNode}
/>
```

Renders a two-level tree:
```
[Page] Home
  [Section] Grand Entrance       <- click activates, shows nodes below
    [Frame] Hero Root
      [Frame] Hero Background Gradient
      [Text]  Celebration Title  <- selected
      [Text]  Tagline
      [Text]  Partner Names
  [Section] The Protagonists
  [Section] Chronicle
  ... all sections visible
```

---

## Template System — Blueprint vs Project

```typescript
// Blueprints are IMMUTABLE factory functions
// They exist only in code, never in storage
const SaasBlueprintFactory = {
  createHero(title: string): TemplateSceneDefinition,
  createFeatures(): TemplateSceneDefinition,
  createPricing(): TemplateSceneDefinition,
  createCTA(): TemplateSceneDefinition,
};

// Content schema is GENERIC, not celebration-specific
interface ProjectContentMap {
  brand: { name?: string; logoUrl?: string; };
  headline: { primary?: string; sub?: string; };
  cta: { text?: string; url?: string; };
  gallery: { images?: string[]; };
  // NOT: celebrants, rsvp, wishes
}
```

---

## Asset System — IndexedDB, not localStorage

```typescript
// AssetStore.ts
const db = openIndexedDB('orbitox_assets', 1);

async function storeAsset(file: File): Promise<AssetRecord> {
  const objectUrl = URL.createObjectURL(file);  // <- Blob URL, not base64
  const id = generateId();
  
  // Store binary in IndexedDB (not base64 string)
  await db.put('assets', { id, blob: file, name: file.name, mimeType: file.type });
  
  return { id, blobUrl: objectUrl, name: file.name };
  // Schema stores ONLY the id reference, not the URL
}
```

---

## Motion System — Connected to Canvas

```typescript
// MotionController.ts
class MotionController {
  private gsapTimeline: gsap.core.Timeline;

  setCurrentTime(timeSeconds: number): void {
    this.gsapTimeline.seek(timeSeconds, false);  // <- ACTUALLY DRIVES CANVAS
  }

  play(): void { this.gsapTimeline.play(); }
  pause(): void { this.gsapTimeline.pause(); }
}
```

The scrubber's `onChange` calls `motionController.setCurrentTime()`. The canvas updates.

---

## 3D System — Real WebGL

ThreeDWorkspace uses Three.js + React Three Fiber:
```typescript
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

// Real PBR rendering. Real orbit controls. Real WebGL.
// NOT: ctx.ellipse() loops
```
