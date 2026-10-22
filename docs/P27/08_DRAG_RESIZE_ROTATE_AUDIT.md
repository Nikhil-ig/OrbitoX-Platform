# 🪐 OrbitoX Studio 3.0 — Drag, Resize & Rotate Forensic Audit
**Document ID:** `docs/P27/08_DRAG_RESIZE_ROTATE_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Dragging Architecture Deficiencies (Issue #4)

In `CanvasInteractionLayer.tsx`:
* **Drag Initiation:** Commences on `handleBoxPointerDown` or `handlePointerMove` when delta exceeds 3px.
* **Transient vs. Committed Geometry:** The drag preview applies `transientDelta.x` and `transientDelta.y` to the overlay box style. However, the underlying node inside the artboard does NOT move during the drag unless reparenting is triggered.
* **Flow Container Conflict:** When dragging a node inside a flex/stack container without holding `Alt`, the code attempts to compute a "flow insertion line". However, because `siblingIds` are measured using stale `measuredRects`, the blue insertion indicator flickers between different indices, causing erratic jumps.

---

## 2. Resize Destruction of Auto-Layout (Issue #6)

### The Smoking Gun: Forced `position: 'absolute'`
In `CanvasInteractionLayer.tsx` lines 656–663:
```typescript
onUpdateGeometry(targetId, {
  x: newX,
  y: newY,
  width: newW,
  height: newH,
  position: 'absolute', // <--- FATAL FLAW!
});
```

### Forensic Analysis of the Flaw:
1. When a user resizes ANY element—even a button inside an auto-layout navbar or a card inside a 3-column flex grid—the resize completion handler unconditionally mutates `position: 'absolute'`.
2. This rips the element out of document flow. Its siblings instantly shift to collapse the vacant space.
3. The element's coordinates (`newX, newY`) were calculated relative to the artboard origin rather than its parent container, causing the resized element to fly across the screen to the wrong coordinates.
4. Because the element's position jumped, the selection overlay—which was tracking the old position—remains stuck in place until the next RAF measurement cycle, resulting in the user-reported "stuck overlay on top of element" glitch.

---

## 3. Rotation Dynamics (Issue #16)

* **Rotation Handle:** Rendered 30px above the top-center resize handle (`data-handle="rotate"`).
* **Angle Calculation:** `CanvasCoordinates.computeRotationAngle(sceneP.x, sceneP.y, centerX, centerY)`.
* **Flaws:**
  1. Does not snap to 15°, 45°, or 90° intervals when `Shift` is held.
  2. Rotating an element modifies `transform: rotate(...)` but does not adjust bounding box hit-testing vectors, meaning clicks on the rotated corners miss the element.
  3. Resizing a rotated element causes catastrophic aspect ratio shearing because handle deltas are not projected along the local basis vectors of the node (`cos θ, sin θ`).
