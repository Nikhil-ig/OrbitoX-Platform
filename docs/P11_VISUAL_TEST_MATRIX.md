# OrbitoX Celebrations — P11 Visual Test Matrix
**Document ID:** `docs/P11_VISUAL_TEST_MATRIX.md`  
**Phase:** P11 — Static Template Migration + Graph-Native Render Truth  
**Target:** Visual Regression & Multi-Viewport Parity  

---

## 1. Multi-Device Viewport Matrix

All migrated `GRAPH_NATIVE` scenes (`The Astral Souls`, `The Constellation of Our Story`, and `Celestial Alignment Countdown`) are tested across 9 standard viewports:

| Category | Viewport (W × H) | Target Device Profile | Layout Resolution Mode | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile Compact** | 360 × 800 | Android Standard (Samsung Galaxy S21) | Mobile Breakpoint (`mobile`) | **PASS** |
| **Mobile Reference**| 390 × 844 | iPhone 14 / 15 Standard | Mobile Breakpoint (`mobile`) | **PASS** |
| **Mobile Large** | 430 × 932 | iPhone 15 Pro Max | Mobile Breakpoint (`mobile`) | **PASS** |
| **Tablet Portrait**| 768 × 1024 | iPad Mini / Classic Portrait | Tablet Breakpoint (`tablet`) | **PASS** |
| **Tablet Air** | 820 × 1180 | iPad Air 10.9" | Tablet Breakpoint (`tablet`) | **PASS** |
| **Tablet Pro** | 1024 × 1366 | iPad Pro 12.9" Portrait | Tablet Breakpoint (`tablet`) | **PASS** |
| **Desktop Laptop** | 1280 × 800 | MacBook Air 13" Standard | Desktop Breakpoint (`desktop`) | **PASS** |
| **Desktop HD** | 1440 × 900 | MacBook Pro / Studio Display Standard | Desktop Breakpoint (`desktop`) | **PASS** |
| **Desktop Full HD**| 1920 × 1080 | 1080p Desktop Monitor | Desktop Breakpoint (`desktop`) | **PASS** |

---

## 2. Editor Visual Truth & Direct Manipulation Matrix

Every property supported by the inspector and canvas interaction layer is tested through the complete pipeline:
`SELECT` → `EDIT / DRAG` → `COMMAND` → `STORE DRAFT` → `RESOLVER` → `SCENE GRAPH RENDERER` → `PIXEL VERIFICATION`.

| Operation | Target Element | Action / Mutation | Expected Pixel Change | Graph Verification | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Move (Position)** | `smart_portrait_a` | X: 10% → 320px, Y: 10% → 140px | Portrait shifts visibly across the artboard | Node `geometry.x` & `geometry.y` updated | **PASS** |
| **Move (Position)** | `smart_portrait_b` | X: 50% → 420px, Y: 20% → 80px | Second portrait shifts visibly | Node `geometry.x` & `geometry.y` updated | **PASS** |
| **Resize** | `smart_portrait_a` | Width: 300px → 380px, Height: 400px → 520px | Card container expands with aspect crop | Node `geometry.width` & `height` updated | **PASS** |
| **Rotate** | `smart_portrait_b` | Rotation: 3° → -8° | Card tilts with counter-clockwise rotation | `transform: rotate(-8deg)` applied to DOM | **PASS** |
| **Scale** | `name_a` (Heading) | Scale: 1.0 → 1.15 | Typography scales proportionally | `scale(1.15, 1.15)` applied to DOM | **PASS** |
| **Z-Index Layering**| `smart_portrait_a` | Z-Index: 2 → 0 (under `smart_portrait_b`) | Portrait A stacks underneath Portrait B | DOM `z-index: 0` updated | **PASS** |
| **Overlap** | Portraits A & B | Positions dragged to overlapping coordinates | Cards overlap cleanly with drop shadows | CSS composite layout correct | **PASS** |
| **Title Position** | `eyebrow` & `name_a` | Flow / Margin top: 0 → 3rem | Text group moves downward | Style margin/position updated | **PASS** |
| **Title Typography**| `name_a` | Font size: 4rem → 5rem, Weight: 700 → 400 | Text visibly enlarges with lighter weight | CSS font styles updated | **PASS** |
| **Media Crop** | `smart_portrait_a` | Crop focal point: {x: 50, y: 35} → {x: 20, y: 80}| Image shifts focal center inside frame | Object position updated | **PASS** |
| **Responsive Override**| `portrait_group` | Mobile position: Flow, Width: 100% | Single column stacked layout on mobile | `node.responsive.mobile` applied | **PASS** |
| **Add Node** | Canvas | Add Text node "A Celestial Union" | New text element rendered on canvas | Node added to graph & renderOrder | **PASS** |
| **Duplicate Node** | Decorative shape | Duplicate node | Clone rendered with offset | New unique nodeId generated | **PASS** |
| **Delete Node** | Decorative element | Delete node | Element removed from canvas & order | Node purged from graph (undoable) | **PASS** |
| **Reorder Layers** | Render Order | Move `name_b` above `name_a` | Render order swapped in DOM tree | `sceneGraph.renderOrder` updated | **PASS** |

---

## 3. Visual Parity Verification

Visual parity between Legacy Static JSX and Graph-Native SceneGraph output was evaluated on:
1. **The Astral Souls**: Composition matches golden baseline. Dual portraits, typography hierarchy, vows grid, and cosmic dust background are visually equivalent.
2. **The Constellation of Our Story**: Starlit milestone galaxy with interactive nodes and chapter dialogue retains exact aesthetic styling.
3. **Celestial Alignment Countdown**: Astronomical astrolabe rotating rings, time remaining dials, and RSVP link match baseline dimensions and typography tokens.
