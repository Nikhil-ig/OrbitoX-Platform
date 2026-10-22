# 🪐 OrbitoX Studio 3.0 — Selection & Hit-Testing Forensic Audit
**Document ID:** `docs/P27/07_SELECTION_HIT_TEST_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Reproduction of "Ghost Dragging" (Issue #5)

### Reported Behavior:
"I click on a child element (e.g. CTA Button or Title text inside a Section), but the background Section moves instead."

### Forensic Code Trace:
In `CanvasInteractionLayer.tsx` lines 1140–1162:
```tsx
<div
  id="canvas-active-selection-box"
  style={{
    position: 'absolute',
    left: activeX,
    top: activeY,
    width: activeW,
    height: activeH,
    border: '1.5px solid rgba(223, 186, 107, 0.95)',
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.5)',
    pointerEvents: 'auto',
    cursor: 'move',
    zIndex: 35,
    transform: `rotate(${activeRot}deg)`,
    transformOrigin: 'center center',
    userSelect: 'none',
  }}
  onPointerDown={(e) => handleBoxPointerDown(e, nodeId)}
  ...
>
```

### Exact Mechanism of Failure:
1. When a container (such as `node_hero_root`, width: 1267px, height: 737px) is selected, `div#canvas-active-selection-box` is rendered directly over the entire container.
2. The selection box has `pointerEvents: 'auto'` and `zIndex: 35`.
3. Because the selection box spans the entire 1267px × 737px region, it forms a visual and physical barrier in the DOM.
4. When the user attempts to click on a button or headline situated at (x: 400, y: 300) inside that container, the browser hits `div#canvas-active-selection-box` FIRST.
5. The pointer event is consumed by `handleBoxPointerDown(e, nodeId)`. The target element underneath NEVER receives `pointerdown` or `click`.
6. Moving the mouse immediately initiates a drag operation on the parent container `node_hero_root`!

---

## 2. Inconsistent Deep Selection & Escape Unwinding (Section 13)

### Current Implementation:
In `SceneGraphRenderer.tsx` lines 47–63:
* Deep selection requires pressing `Cmd` or `Ctrl` while clicking.
* Normal clicks walk upward through parent containers using a while loop:
  `while (curr && curr.parentId && curr.parentId !== sceneGraph.rootNodeId) { ... targetNodeId = parent.id; }`
* This means clicking ANY element inside a component instance or group ALWAYS selects the outermost parent group on the first click.
* However, double-clicking only handles text editing (`InlineEditOverlay`). There is NO double-click mechanism to drill down into children of groups or component instances!
* Furthermore, pressing `Escape` currently deselects all nodes (`controller.clearSelection()`) instead of popping selection one level up to the parent container (`Text -> Button -> Stack -> Frame -> Section`).

---

## 3. Mathematical Hit-Testing Directive (Target Architecture)

To eliminate ghost dragging and selection stealing completely:
1. **Zero-Event Selection Outlines:** The bounding box overlay must have `pointerEvents: 'none'`. Only explicit transform handles (8 corner/edge squares and rotation stem) may receive pointer events.
2. **Deterministic Topmost Raycasting:** When clicking the canvas, hit testing must evaluate the spatial scene graph from topmost `zIndex` down to root, selecting the deepest leaf node unless locked or hidden.
3. **Hierarchy Traversal on Escape:** `Escape` must strictly pop selection to `node.parentId`.
