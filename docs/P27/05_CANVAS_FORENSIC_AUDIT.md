# 🪐 OrbitoX Studio 3.0 — Canvas Forensic Audit
**Document ID:** `docs/P27/05_CANVAS_FORENSIC_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Canvas Geometry & Coordinate Transformation

The canvas architecture is split between `CanvasWorkspace.tsx` (viewport, pan, zoom container) and `CanvasInteractionLayer.tsx` (bounding boxes, transform handles, smart guides).

### Coordinate Systems in Flight:
1. **Viewport / Client Coordinates (`clientX, clientY`):** Raw pointer event coordinates relative to the browser window.
2. **Canvas Screen Coordinates:** Coordinates relative to the `#sz-canvas-workspace` container, accounting for pan offsets (`pan.x, pan.y`) and zoom scale (`zoom`).
3. **Artboard Scene Coordinates:** Coordinates relative to the section/scene container.
4. **Node Local Coordinates:** Coordinates relative to the node's parent container (crucial for auto-layout and flex stacks).

---

## 2. Fatal Forensic Flaw: The 60 FPS RAF Layout Thrashing Loop

In `CanvasInteractionLayer.tsx` lines 120–158:
```typescript
let animId: number;
const measureAll = () => {
  const artboard = artboardEl();
  if (!artboard) return;

  const newRects: Record<string, SceneRect> = {};
  let changed = false;

  const sectionContainer = containerRef.current?.parentElement;
  for (const id of Object.keys(sceneGraph.nodes)) {
    const el = sectionContainer?.querySelector(`[data-node-id="${id}"]`)
      || document.querySelector(`[data-node-id="${id}"]`)
      || document.getElementById(id);
    if (el) {
      const rect = CanvasCoordinates.measureNode(el as HTMLElement, artboard, zoom);
      // Compares previous rect with new rect
      if (Math.abs(current.x - rect.x) > 0.5 ...) changed = true;
      newRects[id] = rect;
    }
  }

  if (changed) {
    setMeasuredRects(newRects);
  }
  animId = requestAnimationFrame(measureAll);
};

measureAll();
return () => cancelAnimationFrame(animId);
```

### Analysis of the Failure:
1. **Continuous Unthrottled Querying:** On EVERY single display frame (16.6ms), `document.querySelector` is executed for every node in the scene graph.
2. **Forced Synchronous Layout (Layout Thrashing):** `CanvasCoordinates.measureNode` invokes `el.getBoundingClientRect()`, forcing the browser layout engine to recalculate layout geometry immediately.
3. **Infinite Re-render Cascades:** If any dimension differs by more than 0.5px, `setMeasuredRects(newRects)` triggers a React state update. Because `measuredRects` is listed in the `useEffect` dependency array, the effect cleans up and restarts on every measurement change!
4. **Impact:** High CPU usage, battery drain, dropped animation frames, and jittery drag previews.

---

## 3. Spatial Decoupling Architecture Defect

In professional canvas engines (Figma, Framer), interaction layers do not poll the DOM continuously. Instead:
* The scene graph maintains an authoritative 2D affine transformation matrix for every node.
* Selection overlays project directly from the mathematical model.
* DOM measurements are only performed on demand (e.g. after text editing changes node dimensions) using `ResizeObserver`.
