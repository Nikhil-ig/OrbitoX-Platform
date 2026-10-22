# 🪐 OrbitoX Celebrations — P14 Architecture Contract (Contract Freeze)
**Document ID:** `docs/P14_ARCHITECTURE_CONTRACT.md`  
**Phase:** P14-0 — Foundation Contracts & Invariant Freeze  
**Status:** LOCKED & CANONICAL  
**Engine Scope:** `@orbitox-io/plugin-engine` & `orbitox/apps/celebrations`

---

## 1. The Single Source of Truth Invariant

Across the entire platform lifecycle—design authoring, template serialization, customer customization, API persistence, and guest rendering—there is **one and only one visual and structural truth: the SceneGraph**.

```
                    ┌─────────────────────────┐
                    │     Template Studio     │
                    │   (Visual Authoring)    │
                    └────────────┬────────────┘
                                 │ Dispatches Command
                                 ▼
                    ┌─────────────────────────┐
                    │       SceneGraph        │
                    │  CANONICAL SOURCE TRUTH │
                    └────────────┬────────────┘
                                 │
             ┌───────────────────┼───────────────────┐
             ▼                   ▼                   ▼
      Layout Resolver     Behavior Graph        Data Binder
      (Flex/Stack/Grid)  (Triggers/Actions)   (State/Repeater)
             │                   │                   │
             └───────────────────┼───────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │     Resolved Graph      │
                    │  (Pure Computed Tree)   │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  UnifiedSceneRenderer   │
                    │  (Zero Shadow Layouts)  │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Guest Browser Pixels  │
                    └─────────────────────────┘
```

### Prohibited Architectural Antipatterns (Permanently Forbidden):
1. ❌ **`Inspector → React scene special case`**: The inspector must never emit props that bypass SceneGraph nodes.
2. ❌ **`Canvas → React scene special case`**: The canvas must never render bespoke visual wrappers not present in the SceneGraph.
3. ❌ **`Customer setting → React scene special case`**: Customer personalization must resolve strictly through `CustomizationMatrix` into SceneGraph overrides (`node.binding`, `node.style`, `node.geometry`).

---

## 2. Ownership Boundaries & Tri-Modal Architecture

Every scene in the Celebrations catalog belongs to one of three explicit modes:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. GRAPH_NATIVE (Target for 100% of Catalog)                           │
│    * SceneGraph owns: 100% of DOM structure, hierarchy, geometry,       │
│      layout (flex/grid/stack/freeform), responsive art direction,       │
│      styling, motion, interaction triggers/actions, and data bindings. │
│    * Renderer: Pure UnifiedSceneRenderer.                               │
│    * React Source Files: ZERO (.tsx scene files deprecated).           │
├────────────────────────────────────────────────────────────────────────┤
│ 2. HYBRID (Strictly Constrained Exception Boundary)                    │
│    * SceneGraph owns: Frame boundary, layout slot, geometry, z-index,   │
│      responsive sizing, visibility, and data input mapping.            │
│    * Smart Component owns: Procedural WebGL shaders, celestial canvas   │
│      star math, gyroscopic mouse-follow 2.5D parallax, audio buffers.  │
│    * Hard Constraint: Smart components CANNOT define outside layout,   │
│      parent margins, sibling flow, or DOM hierarchy.                   │
├────────────────────────────────────────────────────────────────────────┤
│ 3. LEGACY (Migration Backlog)                                          │
│    * Hardcoded React JSX scene trees from early prototypes.            │
│    * Target: 0 scenes remaining by conclusion of P14-A.                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. SceneGraph Schema & Serialization Contract

A SceneGraph document must adhere strictly to `schemaVersion: 1`:

```typescript
export interface SceneGraph {
  schemaVersion: 1;
  rootNodeId: string;
  nodes: Record<string, SceneGraphNode>;
  renderOrder: string[]; // Deterministic topological render order
}
```

### Node Schema Specification
Every `SceneGraphNode` contains:

```typescript
export interface SceneGraphNode {
  id: string;                                // Deterministic unique node ID (node_*)
  kind: SceneNodeKind;                       // Primitive, Semantic, Visual, or Smart
  name: string;                              // Designer-visible layer label
  parentId: string | null;                   // Null only for root node
  children: string[];                        // Ordered child node IDs

  // 1. Geometry (Absolute or Flow)
  geometry: {
    position: 'flow' | 'absolute' | 'relative' | 'sticky';
    x: CSSValue;
    y: CSSValue;
    width: CSSValue;
    height: CSSValue;
    minWidth?: CSSValue;
    maxWidth?: CSSValue;
    minHeight?: CSSValue;
    maxHeight?: CSSValue;
    rotation: number;                        // Degrees (-360 to 360)
    scaleX: number;
    scaleY: number;
    opacity: number;                         // 0.0 to 1.0
    zIndex: number;
    transformOrigin?: string;                // e.g. "center center"
  };

  // 2. Layout Mode (Container nodes)
  layoutMode?: 'flex' | 'grid' | 'stack' | 'freeform';
  layoutConfig?: AutoLayoutConfig | GridLayoutConfig;

  // 3. Visual Styling
  style: NodeStyle;

  // 4. Responsive Art Direction Overrides
  responsive: {
    desktopSmall?: Partial<ResponsiveOverride>;  // 1280px
    tablet?: Partial<ResponsiveOverride>;        // 768px
    mobileLarge?: Partial<ResponsiveOverride>;   // 430px
    mobile?: Partial<ResponsiveOverride>;        // 390px
    mobileSmall?: Partial<ResponsiveOverride>;   // 375px
  };

  // 5. Data Binding & Collection Engine (P14-D)
  binding?: {
    fieldKey: string;                        // e.g. "celebration.title", "celebrants[0].name"
    bindingType: 'content' | 'media' | 'attribute' | 'computed';
    fallback?: string;
    formatting?: {
      type: 'date' | 'uppercase' | 'lowercase' | 'currency';
      formatString?: string;
    };
  };

  repeater?: {
    arrayFieldKey: string;                   // e.g. "itinerary.events[*]", "story.milestones[*]"
    itemTemplateNodeId: string;              // Master subtree to clone for each item
    minItems?: number;
    maxItems?: number;
    emptyStateNodeId?: string;
  };

  conditional?: {
    fieldKey: string;
    operator: 'equals' | 'not_equals' | 'exists' | 'truthy' | 'greater_than';
    operand?: any;
    action: 'show' | 'hide';
  };

  // 6. Motion Specification
  motion?: {
    in?: {
      type: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'zoom-in' | 'none';
      duration: number; // ms
      delay: number;    // ms
      easing: string;   // cubic-bezier or preset
    };
    hover?: {
      scale?: number;
      rotation?: number;
      y?: number;
      opacity?: number;
      duration?: number;
    };
  };

  // 7. Interaction & State Graph (P14-E)
  interactions?: Array<{
    trigger: 'onTap' | 'onHover' | 'onScrollProgress' | 'onSceneEnter' | 'onSubmit';
    scrollRange?: { startPercent: number; endPercent: number };
    condition?: { fieldKey: string; operator: string; value: any };
    action: 'animate' | 'reveal' | 'hide' | 'navigate' | 'playSound' | 'openModal' | 'changeState';
    payload?: Record<string, any>;
    targetNodeId?: string;
    nextState?: string;
  }>;

  // 8. Reusable Component Model (P14-C)
  component?: {
    isMaster?: boolean;
    masterComponentId?: string;
    variantId?: string;
    exposedProps?: Record<string, any>;
    instanceOverrides?: Record<string, any>;
    isDetached?: boolean;
  };

  // 9. Permissions & Customization Governance
  locked: boolean;
  hidden: boolean;
  customerEditable: boolean;
  customizationLevel: 'LOCKED' | 'CURATED' | 'FLEXIBLE' | 'ADVANCED';

  // 10. Direct Content
  textContent?: string;
}
```

---

## 4. Command Pipeline Contract (Zero Direct Mutations)

Every mutation to the SceneGraph **must** pass through the command pipeline to guarantee:
* Deterministic serializability
* Linear history stack (Undo / Redo)
* Validation against the schema
* Collab-readiness (stamping `operationId`, `actorId`, `timestamp`)

```
UI Action (Canvas / Inspector / Hierarchy)
    │
    ▼ Dispatches
TemplateStudioCommand (SG_INSERT, SG_MOVE, SG_RESIZE, SG_SET_LAYOUT, etc.)
    │
    ▼ Executes in
SceneGraphEngine / TemplateEditorStore
    │
    ├─► Records to Undo Stack (deep snapshot)
    ├─► Validates Node Constraints
    └─► Updates Draft in Memory
```

---

## 5. Renderer Adapter Contract

`SceneGraphRenderer` consumes the resolved graph. Every semantic node kind maps to a registered adapter in `NodeRendererRegistry`:

```typescript
export interface NodeAdapter {
  kind: SceneNodeKind | SceneNodeKind[];
  render(context: NodeRenderContext): React.ReactElement;
  validateProperties?(node: SceneGraphNode): string[]; // Returns validation errors if unsupported
}
```

### Hard Invariant:
If an inspector exposes a capability (e.g. `backdropBlur`, `mixBlendMode`, `autoLayout`), the node adapter **must** render it faithfully in CSS. If a node kind does not support a property, the inspector **must** suppress the control and the schema validator must reject it.

---

## 6. Responsive Art Direction Contract (Inheritance & Override)

Art direction follows strict cascading resolution:

```
                  ┌────────────────────────┐
                  │    BASE DEFINITION     │
                  │   (Desktop Default)    │
                  └───────────┬────────────┘
                              │ Inherits
          ┌───────────────────┴───────────────────┐
          │                                       │
          ▼                                       ▼
┌──────────────────┐                    ┌──────────────────┐
│ Tablet Override  │                    │ Mobile Override  │
│  (768px Window)  │                    │  (390px Window)  │
└──────────────────┘                    └──────────────────┘
```

### Permitted Overrides per Breakpoint:
1. **Geometry:** Coordinates (`x`, `y`), dimensions (`width`, `height`, `minWidth`, `maxWidth`), rotation, scale, opacity.
2. **Layout Mode:** Switching from `flex` (horizontal) on Desktop to `stack` (vertical) on Mobile.
3. **Hierarchy & Order:** Child display order (`order` or `childOrder`) can be rearranged for mobile readability.
4. **Visibility:** A decorative desktop ornament may be explicitly `hidden: true` on mobile.
5. **Typography:** Breakpoint-specific `fontSize`, `lineHeight`, `textAlign`.
6. **Spacing:** Breakpoint-specific `padding`, `margin`, and auto-layout `gap`.

---

## 7. Customer Customization Contract vs. Admin Authoring

* **Template Author (Admin):** Full structural, geometrical, styling, and behavioral freedom. Can add/delete/reorder any node.
* **Celebration Host (Customer):** Governed strictly by `CustomizationMatrix`:
  * `LOCKED`: Read-only. Customer cannot modify text, position, or style.
  * `CURATED`: Can select from predefined font lists and color palettes.
  * `FLEXIBLE`: Can edit text content, upload photos, and toggle optional section visibility.
  * `ADVANCED`: Can tweak layout padding and spacing within safe bounds.
* **Enforcement:** The customer simulator and guest resolver enforce `customizationLevel`. If a customer submits an edit to a `LOCKED` node, the backend mutation engine rejects the payload.

---

## 8. Versioning & Immutability Contract

* **Draft Mode (`DRAFT`):** Fully mutable. Designer iterates in Template Studio.
* **Published Template (`PUBLISHED`):** **Strictly Immutable**.
  * Once a template version (e.g. `v1.0.0`) is published, its SceneGraph snapshot is permanently frozen.
  * Any subsequent authoring edits automatically create a new draft version (e.g. `v1.1.0` or `v2.0.0`).
  * Active customer celebrations pinned to `v1.0.0` will never break from template edits.
