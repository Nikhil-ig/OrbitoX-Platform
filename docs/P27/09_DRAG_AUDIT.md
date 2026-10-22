# Drag & Move Interaction Audit
**Document ID:** `docs/P27/09_DRAG_AUDIT.md`

## 1. Element Drag vs Section Drag
- Element drag moves nodes within their layout coordinate system.
- Section drag reorders blocks vertically along the continuous page stack.

## 2. Flaws
- In freeform mode, dragging previously forced integer rounding collisions.
- Pointer capture was not released cleanly on drag cancellation or window blur.
