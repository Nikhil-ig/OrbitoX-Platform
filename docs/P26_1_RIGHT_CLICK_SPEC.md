# P26.1 Technical Specification: Universal Right-Click Menu & Navigation Engine

## 1. System Overview

The **Right-Click Context Menu Engine** in OrbitoX Studio Zero is a foundational navigation and manipulation subsystem. It ensures that any interactive surface on the canvas or layer tree immediately reveals relevant, contextual actions without requiring creators to hunt through sidebars or submenus.

---

## 2. The 8 Contextual Target Menus

### 2.1 Target 1: Empty Canvas Background
Triggered when right-clicking on empty canvas background (no nodes intersected):
- `Paste Here (⌘V)`: Pastes clipboard subtree at current mouse scene coordinates.
- `Paste Special (⇧⌘V)`: Opens sub-options (Paste at Origin, Paste Style).
- `Add >`:
  - `Element >`: Text, Image, Video, Button, Icon, Vector Shape.
  - `Layout >`: Frame (Auto Layout), Stack (H/V), Grid, Container.
  - `Section >`: Hero, Features, Pricing, Testimonials, FAQ, CTA, Footer.
  - `Component >`: My Components, Team Components, OrbitoX Curated.
  - `3D Scene`: Celestial Sphere, Particle Field, Interactive Model.
- `Create Section Here`: Inserts a full-width blank section at click position.
- `Create Frame`: Inserts an auto-layout frame at mouse coordinates.
- `Select All (⌘A)`: Selects all top-level sections on active page.
- `Zoom to Fit (⇧1)`: Re-centers canvas zoom and pan.
- `Grid & Guides >`: Toggle Snap to Grid, Toggle Smart Guides, Rulers.
- `Import into Project (⌘I)`: Activates Universal Creative Intake.

### 2.2 Target 2: Single Element (Text, Button, Icon, Shape)
- `Copy (⌘C)` / `Cut (⌘X)` / `Duplicate (⌘D)` / `Delete (⌫)`
- `Select Layer >`: Breadcrumb list of ancestors (`Child → Parent Frame → Section`).
- `Arrange >`: Bring to Front (`⌘]`), Bring Forward (`]`), Send Backward (`[`), Send to Back (`⌘[`).
- `Align >`: Left, Center, Right, Top, Middle, Bottom.
- `Create Master Component (⌥⌘K)`: Converts element to reusable master.
- `Lock (⌘L)` / `Hide (⌘H)`
- `Add Motion Preset`: Fade, Slide Up, Scale, Parallax.
- `Add Interaction`: Hover scale, Click action, Scroll trigger.
- `Copy Style (⌥⌘C)` / `Paste Style (⌥⌘V)`
- `Export Element (⇧⌘E)`: PNG, SVG, PDF, JSX snippet.

### 2.3 Target 3: Image & Media Element
All options from Target 2, plus specialized media actions:
- `Replace Asset >`:
  - `From Asset Library…`: Opens curated asset picker.
  - `Upload from Computer…`: File chooser input.
  - `From Image URL…`: Quick text prompt for external image link.
- `Fit & Fill >`:
  - `Cover (Fill Frame)`: CSS `object-fit: cover`.
  - `Contain (Letterbox)`: CSS `object-fit: contain`.
  - `Natural Size`: Resets width/height to natural pixel dimensions.
- `Crop Image`: Activates interactive visual cropping overlay on canvas.
- `AI Enhancement >`:
  - `Remove Background`: Isolates subject.
  - `Super-Resolution (2x/4x)`: AI neural upscaling.
  - `Generate Variant`: Creates alternative scene styling.

### 2.4 Target 4: Layout Container / Frame (Stack, Grid)
- `Add Child Element >`: Quick insertion into frame's auto-layout flow.
- `Change Layout Flow >`:
  - `Horizontal Stack (Row)`
  - `Vertical Stack (Column)`
  - `Grid (2 / 3 / 4 Columns)`
  - `Absolute Positioning`
- `Auto-Tidy Children`: Normalizes spacing and alignment across child nodes.
- `Convert to Section`: Elevates frame to a top-level page section.

### 2.5 Target 5: Section
- `Rename Section`: Inline label editing.
- `Duplicate Section (⌘D)`: Creates clone immediately below.
- `Move Order >`:
  - `Move Up (⌥↑)`
  - `Move Down (⌥↓)`
  - `Move to Top (⇧⌥↑)`
  - `Move to Bottom (⇧⌥↓)`
- `Insert Above >`: Inserts blank section or template section above.
- `Insert Below >`: Inserts blank section or template section below.
- `Save as Reusable Section`: Saves to Library catalog.
- `Motion & Scroll Effects`: Parallax speed, Sticky scroll, Section transitions.
- `Responsive Layout`: Desktop / Tablet / Mobile specific visibility.
- `Delete Section (⌫)`

### 2.6 Target 6: Component (Master ❖ vs Instance ◇)
- **If Master Component (❖)**:
  - `Edit Master Definition`: Focuses master component isolated canvas.
  - `Create Instance`: Inserts a child instance onto canvas.
  - `Component Properties`: Configures prop schema (text, image, color).
- **If Component Instance (◇)**:
  - `Go to Master Component`: Pan canvas to master definition.
  - `Push Changes to Master`: Merges local modifications back to master.
  - `Reset to Master`: Discards localized overrides.
  - `Detach Component Instance`: Breaks link, converting back to native frame.

### 2.7 Target 7: Multi-Selection
- `Group into Frame (⌥⌘G)`: Wraps selected elements in a new auto-layout frame.
- `Align >`: Left, Center H, Right, Top, Middle V, Bottom.
- `Distribute Spacing >`:
  - `Distribute Horizontally`: Equalizes horizontal gap.
  - `Distribute Vertically`: Equalizes vertical gap.
- `Animate Together`: Staggered entrance animation applied to all selected items.
- `Copy Combined Properties` / `Paste Properties`
- `Export Selection (⇧⌘E)`

### 2.8 Target 8: Layer Tree Item (in Layers/Pages panel)
- Direct parity with Canvas targets, plus:
  - `Collapse All Children` / `Expand All Children`
  - `Rename Layer`
  - `Focus in Viewport` (smoothly pans and zooms canvas to center node).

---

## 3. Hierarchical Layer Drill-Down ("Select Layer >")

When an element has parent containers, the context menu renders a dynamic breadcrumb submenu:
```typescript
interface LayerHierarchyBreadcrumb {
  id: string;
  name: string;
  kind: SceneNodeKind;
  isComponent: boolean;
  depth: number;
}
```
Example: Right-clicking the text `"Get Started"` inside a button shows:
```
Select Layer ▶
  ├─ 🔤 Heading: "Get Started" (Active Selection)
  ├─ ❖ Primary Button (Parent Frame)
  ├─ 📦 Hero CTA Container (Ancestor Frame)
  └─ 📑 Hero Section (Top-Level Section)
```
Clicking any item in the breadcrumb immediately switches the active canvas selection to that ancestor node.
