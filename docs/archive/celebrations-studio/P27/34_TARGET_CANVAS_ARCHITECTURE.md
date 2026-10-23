# 🪐 OrbitoX Studio 3.0 — Target Canvas Architecture
**Document ID:** `docs/P27/34_TARGET_CANVAS_ARCHITECTURE.md`  
**Status:** TARGET ARCHITECTURE SPECIFICATION (PHASE 0)  

---

## 1. Zero-Event Selection Overlays & Hit-Testing

To eliminate ghost dragging, selection overlays are completely decoupled from click interception:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DECOUPLED CANVAS LAYERS                               │
│                                                                             │
│  [Top Layer]    Transform Handle Layer (zIndex: 40)                         │
│                 - 8 Resize Handles (6px squares)                            │
│                 - 1 Rotation Stem & Pill                                    │
│                 - pointerEvents: 'auto' ONLY on handles!                    │
│                                                                             │
│  [Middle Layer] Selection Outline Box (zIndex: 35)                          │
│                 - 1.5px Accent Border & Dashed Multi-Boxes                  │
│                 - pointerEvents: 'none' (CLICKS PASS THROUGH!)              │
│                                                                             │
│  [Bottom Layer] Rendered Document DOM Nodes (zIndex: 1 - 30)                │
│                 - Real buttons, headings, images, frames                   │
│                 - pointerEvents: 'auto'                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Deterministic Spatial Raycasting

1. When `pointerdown` occurs on the canvas, the coordinate `(x, y)` is unprojected into canvas coordinates.
2. The hit-test algorithm evaluates candidate nodes in reverse render order (highest `zIndex` / deepest leaf first).
3. If an element is clicked, it becomes selected immediately.
4. If the element is already selected, dragging immediately moves that element (not its parent).
5. If `Shift` is held, multi-select is toggled.
6. Hitting `Escape` walks the selection upward to `node.parentId`.
