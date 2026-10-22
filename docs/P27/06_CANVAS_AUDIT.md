# Canvas Architecture Audit
**Document ID:** `docs/P27/06_CANVAS_AUDIT.md`

## 1. Canvas Viewport Structure
The canvas uses CSS transform zoom (`scale(zoom)`) and smooth pan offsets. Continuous page mode stacks sections vertically with an insertion affordance between them.

## 2. Flaws
- Zoom scale distorts native mouse coordinates; screen-to-canvas coordinate math must normalize for zoom factor and viewport bounding client rect.
