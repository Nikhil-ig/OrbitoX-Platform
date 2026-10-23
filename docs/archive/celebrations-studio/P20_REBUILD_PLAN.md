# 🪐 OrbitoX Studio — P20 Rebuild Implementation Plan
**Document ID:** `docs/P20_REBUILD_PLAN.md`
**Phase:** P20 — Implementation Roadmap
**Status:** DRAFT — AWAITING USER APPROVAL

---

## Prerequisites: User Must Approve This Plan Before ANY Code Changes

> ZERO CODE MODIFICATION has occurred. This plan is diagnostic + prescriptive only.

---

## Phase 1: Critical Bug Fixes (Zero Architecture Change)
**Goal:** Fix the 4 immediately broken interactions without refactoring the architecture.
**Time Estimate:** 3–5 days
**Risk:** LOW — targeted surgical fixes

| Fix | File | Change |
|---|---|---|
| F1: Canvas drag picks wrong element | CanvasInteractionLayer.tsx | Remove `nid !== nodeId` exclusion. Use nodeId directly from props, not elementsFromPoint. |
| F2: Layers shows only active section | StudioShell.tsx | Pass `schema.scenes` (all scenes) to LayersPanel, not just `activeScene.sceneGraph`. Upgrade LayersPanel to render page-level tree. |
| F3: Corner radius key mismatch | PropertiesPanel.tsx | Change dispatch from `{borderRadius: {all: v}}` to `{border: {radius: {tl: v, tr: v, br: v, bl: v}}}`. |
| F4: Padding/margin double dispatch | PropertiesPanel.tsx | Dispatch ONLY individual sides (paddingTop, paddingRight, etc.), not shorthand. |
| F5: ADD_SCENE silent overwrite | TemplateEditorStore.ts | If scene.id exists, generate a new UUID-based ID instead of replacing. |

### F1 Fix Specification (Bug 01: Wrong Element Drag)

```typescript
// BEFORE (lines 245-256):
const underNodeEl = hitElements.find((el) => {
  const nid = el.getAttribute('data-node-id');
  return Boolean(nid && nid !== nodeId && ...);  // BAD: excludes correct node
});
const targetNodeId = underNodeEl ? underNodeEl.getAttribute('data-node-id')! : nodeId;

// AFTER:
// Simply use the nodeId passed as prop. No elementsFromPoint needed for drag.
// The selection overlay box already correctly identifies the node.
const targetNodeId = nodeId;  // <- the selection box prop is authoritative
```

### F2 Fix Specification (Bug 02: Layers Panel Missing Sections)

```tsx
// BEFORE:
<LayersPanel sceneGraph={activeScene.sceneGraph!} ... />

// AFTER:
<PageTreePanel
  pages={pages}
  scenes={schema.scenes}      // <- ALL scenes
  activeSceneId={activeSceneId}
  selectedNodeId={selectedNodeId}
  onSelectScene={handleSelectScene}
  onSelectNode={handleSelectNode}
  onToggleLock={handleToggleNodeLock}
  onToggleHide={handleToggleNodeVisibility}
  onDuplicateNode={handleDuplicateNode}
  onDeleteNode={handleDeleteNode}
  onRenameNode={handleRenameNode}
  onReorderNode={handleReorderNode}
  onClose={() => setActiveRailTab(null)}
/>
```

---

## Phase 2: Inspector Architecture Split
**Goal:** Break PropertiesPanel.tsx (2,629 lines) into focused contextual inspectors.
**Time Estimate:** 5–7 days
**Risk:** MEDIUM — requires new component tree, careful prop migration

### New Inspector Structure

```
studio-zero/inspectors/
  index.ts                    <- selector function: selectInspector(kind) -> Component
  PageInspector.tsx           <- no selection; page-level properties
  SectionInspector.tsx        <- section selected; name, anchor, transition, parallax
  TextInspector.tsx           <- text/richtext nodes
  FrameInspector.tsx          <- frame, stack, grid nodes
  ImageInspector.tsx          <- image nodes
  ButtonInspector.tsx         <- button nodes
  FormInspector.tsx           <- rsvpform, contact form nodes
  MediaInspector.tsx          <- video, audio nodes
  ThreeDInspector.tsx         <- interactive_object, threed nodes
  shared/
    GeometrySection.tsx       <- W, H, X, Y, Rotation, Opacity (shared by all)
    BoxModelSection.tsx       <- Padding, Margin, Border, Radius (shared by frame/button)
    TypographySection.tsx     <- Font, Size, Weight, Color, LineHeight (text/button)
    MotionSection.tsx         <- Entrance, Parallax, Hover (shared by all)
    ResponsiveSection.tsx     <- Breakpoint controls (shared by all)
```

### StyleSchema Canonical Path Enforcement

```typescript
// StyleSchema.ts — the canonical property tree
// All inspectors write this. StyleResolver reads this. No translation.
interface NodeStyle {
  background?: BackgroundValue;
  border?: {
    width?: string;
    style?: string;
    color?: ColorValue;
    radius?: { tl?: string; tr?: string; br?: string; bl?: string; };
  };
  padding?: { top?: string; right?: string; bottom?: string; left?: string; };
  margin?: { top?: string; right?: string; bottom?: string; left?: string; };
  typography?: TypographyValue;
  shadow?: ShadowValue;
  opacity?: number;
  effects?: EffectsValue;
}
```

---

## Phase 3: Canvas Interaction Layer Rebuild
**Goal:** Replace DOM-based hit testing with pure SceneGraph hit testing.
**Time Estimate:** 7–10 days
**Risk:** HIGH — core canvas architecture change

### SceneGraphHitTester

```typescript
// New file: engine/SceneGraphHitTester.ts
export class SceneGraphHitTester {
  static hitTest(
    canvasX: number,
    canvasY: number,
    scenes: TemplateSceneDefinition[],
    zoom: number
  ): { nodeId: string; sceneId: string } | null {
    for (const scene of [...scenes].reverse()) {
      const result = this.walkSceneGraph(scene, canvasX, canvasY, zoom);
      if (result) return { nodeId: result, sceneId: scene.id };
    }
    return null;
  }
  
  private static walkSceneGraph(...): string | null { ... }
  private static computeBBox(node, scene, zoom): BBox { ... }
  private static pointInBBox(x, y, bbox): boolean { ... }
}
```

### Interaction State Machine

States: `idle | hover | pressing | selecting | dragging | resizing | rotating | multiselect-box`

Transitions:
- idle + pointerdown on canvas -> pressing (start hit test)
- pressing + hit found + pointermove > threshold -> dragging
- pressing + no hit + pointermove -> selecting (rubber band)
- dragging + pointerup -> COMMIT_TRANSACTION -> idle
- idle + scroll wheel -> zoom (no state change)

---

## Phase 4: Template System Rebuild
**Goal:** Make template switching actually work. Separate blueprint from project.
**Time Estimate:** 7–10 days
**Risk:** MEDIUM

### Template Blueprint Catalog

```typescript
// blueprints/SaasBlueprintFactory.ts
export const SaasBlueprint: TemplateBlueprintFactory = {
  id: 'saas',
  name: 'SaaS Product',
  category: 'saas',
  createScene(sectionType): TemplateSceneDefinition { ... }
};

// blueprints/WeddingBlueprintFactory.ts  
export const WeddingBlueprint: TemplateBlueprintFactory = {
  id: 'wedding',
  name: 'Wedding Celebration',
  category: 'wedding',
  ...
};
```

### Generic Content Migration

```typescript
// engine/ContentMap.ts — generic, not celebration-specific
interface GenericContentMap {
  brand: { name?: string; tagline?: string; logoUrl?: string; };
  hero: { headline?: string; subhead?: string; ctaText?: string; ctaUrl?: string; };
  about: { body?: string; };
  gallery: { images?: string[]; };
  contact: { email?: string; phone?: string; address?: string; };
  // celebration-specific is a SUBSET:
  celebration?: {
    name1?: string; name2?: string; date?: string; venue?: string;
  };
}
```

---

## Phase 5: Asset System — IndexedDB
**Goal:** Replace base64 localStorage with blob URL + IndexedDB.
**Time Estimate:** 3–5 days
**Risk:** LOW — isolated service change

### New AssetStore

```typescript
// services/AssetStore.ts
export class AssetStore {
  async uploadFile(file: File): Promise<AssetRecord> {
    const id = generateId();
    const blob = await compressIfImage(file);  // Canvas compression -> Blob
    
    // Store blob in IndexedDB (NOT base64, NOT localStorage)
    await this.db.put('assets', id, blob);
    
    // Return blobUrl for immediate use
    const blobUrl = URL.createObjectURL(blob);
    return { id, blobUrl, name: file.name, size: blob.size };
    // Schema stores ONLY {assetId: id}, not the URL or base64
  }
  
  async getUrl(assetId: string): Promise<string> {
    const blob = await this.db.get('assets', assetId);
    return URL.createObjectURL(blob);
  }
}
```

---

## Phase 6: Motion System — Connect to Canvas
**Goal:** Make the motion timeline actually drive canvas animations.
**Time Estimate:** 5–7 days
**Risk:** MEDIUM

### GSAP-Connected Timeline

```typescript
// engine/MotionController.ts
import gsap from 'gsap';

export class MotionController {
  private timeline: gsap.core.Timeline;
  
  buildTimeline(selectedNode: SceneGraphNode, canvasElement: HTMLElement): void {
    this.timeline = gsap.timeline({ paused: true });
    // Build from node.motion.keyframes
    selectedNode.motion?.keyframes?.forEach(kf => {
      this.timeline.to(canvasElement, { ...kf.css }, kf.time);
    });
  }
  
  setCurrentTime(t: number): void {
    this.timeline.seek(t, false);  // Actually moves canvas
  }
}
```

---

## Phase 7: 3D Workspace — Real WebGL
**Goal:** Replace ctx.ellipse() fake with real Three.js scene.
**Time Estimate:** 3–5 days
**Risk:** LOW — isolated new component

```tsx
// studio-zero/ThreeDWorkspace.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF } from '@react-three/drei';

export function ThreeDWorkspace() {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <OrbitControls />
      <Environment preset="studio" />
      <Suspense fallback={null}>
        <PBRObject type={objectType} roughness={roughness} metalness={metalness} />
      </Suspense>
    </Canvas>
  );
}
```

---

## Phased Timeline

| Phase | Description | Days | Risk |
|---|---|---|---|
| 1 | Critical bug fixes (drag, layers, radius, padding, ADD_SCENE) | 3–5 | LOW |
| 2 | Inspector split (11 contextual inspectors) | 5–7 | MEDIUM |
| 3 | Canvas hit test + interaction state machine rebuild | 7–10 | HIGH |
| 4 | Template system (blueprint vs project, generic content) | 7–10 | MEDIUM |
| 5 | Asset system (IndexedDB, Blob URLs) | 3–5 | LOW |
| 6 | Motion timeline (GSAP connected) | 5–7 | MEDIUM |
| 7 | 3D workspace (Three.js / R3F) | 3–5 | LOW |
| **Total** | | **33–49 days** | |

---

## Implementation Rules

1. No code written until user explicitly approves this plan
2. Each phase completes with passing tests before next phase begins  
3. All fixes maintain backward compatibility with existing TemplateSchema JSON
4. OrbitoX AGENTS.md rules apply throughout (scoped packages, zero-trust, Ed25519 signatures)
5. No shortcuts — every broken system gets a proper fix, not a patch
