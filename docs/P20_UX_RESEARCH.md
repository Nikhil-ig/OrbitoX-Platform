# 🪐 OrbitoX Studio — P20 UX Research & Creative Tool Benchmarks
**Document ID:** `docs/P20_UX_RESEARCH.md`  
**Phase:** P20 — Phase 0: Forensic Audit & Rebuild Planning  
**Date:** October 3, 2026  
**Auditor:** Principal Product Designer & Creative Systems Team  
**Status:** **RESEARCH COMPLETE (AWAITING USER APPROVAL)**

---

## 1. Research Objective & Philosophical Benchmark

To build a world-class creative environment, OrbitoX Studio must not copy the surface UI of existing tools. Instead, we extract the core interaction mechanics, mental models, and architectural invariants from industry leaders:

$$\text{Figma (Precision & Structure)} + \text{Canva (Velocity & Clarity)} + \text{Webflow (CSS Box Model & Timeline)} + \text{Framer (Adaptive Web Publishing)} + \text{Spline (Spatial Computing)}$$

---

## 2. Deep Dive: Figma & Figma Sites

### 2.1 Mental Model: Infinite Canvas & Canonical Layer Hierarchy
- **Canvas Coordinates**: A single zoomable/pannable infinite artboard coordinate space ($x, y, \text{scale}$). All transform operations (drag, resize, rotate) compute deltas in unzoomed canvas space before snapping.
- **Unified Hit-Testing Invariant**: A click always selects the deepest leaf element under the pointer unless the user is clicking an active selection box. Clicking a selection box initiates a drag session on the selected node, never re-resolving to underlying siblings or parents.
- **Nested Selection Hierarchy**:
  - Click 1: Selects top-level section/component.
  - Double-Click / Cmd+Click: Drills directly down to deepest nested leaf node.
  - Escape: Climbs to parent container.
- **Layers Hierarchy**: The Layers panel always mirrors the active document/page in its entirety. It never filters out unselected sections or fragments the tree.

### 2.2 Figma Sites Responsive Cascade
- **Primary vs. Secondary Breakpoints**: Changes made at the Desktop (primary) breakpoint automatically cascade down to Tablet and Mobile.
- **Localized Overrides**: When a property is edited on Mobile (secondary), it creates a localized override record (`overrides[mobile][property]`).
- **Inheritance Visual Indicators**: In the inspector, properties display visual badges:
  - Blue/Accent: Localized override active.
  - Ghosted/Muted: Inherited from primary breakpoint.
  - Reset Action: Clicking the badge clears the override and re-links to primary.

---

## 3. Deep Dive: Canva

### 3.1 Mental Model: Velocity, Non-Technical Language, & Visual Browsing
- **Non-Technical Property Labels**:
  - Replaces "CSS Flex Direction: row" with "Align Horizontal".
  - Replaces "CSS Overflow: hidden" with "Crop to Frame".
  - Replaces "Z-Index: 999" with "Position: Forward / Backward".
- **Template Discovery & Instantiation**:
  - Browsing is visual, category-driven, and instantaneous.
  - Applying a template presents clear, unambiguous choices:
    1. *Create New Project from Template*
    2. *Replace Entire Site (with draft snapshot backup)*
    3. *Add Template Page / Section*
    4. *Apply Styles / Theme Only*
- **Asset Pipeline**:
  - Drag-and-drop file upload to anywhere on the canvas or asset rail.
  - Immediate visual thumbnail feedback with non-blocking background optimization.
  - Dragging an asset onto a frame or image node replaces its source without changing geometry.

---

## 4. Deep Dive: Webflow

### 4.1 Mental Model: True CSS Box Model & Structural Semantics
- **Visual Box Model**:
  - Renders a concentric 2D diagram representing `Margin (outer)`, `Border (stroke)`, `Padding (inner)`, and `Content (core)`.
  - Supports click-and-drag scrubbing on each individual edge (`top`, `right`, `bottom`, `left`).
  - Supports linked values (lock icon) to adjust all 4 edges simultaneously.
- **Layout Modalities**:
  - *Freeform (Absolute)*: Element positioned by $x, y$ coordinates. Margin acts as offset.
  - *Stack / Flexbox*: Elements arranged in rows/columns. Gap controls inter-item spacing. Padding controls container inset.
  - *Grid*: Elements placed in rows and columns with explicit grid tracks (`fr`, `px`, `%`).
- **GSAP-Class Timeline Interactions**:
  - Animation actions are arranged on an interactive multi-track visual timeline.
  - Keyframes represent discrete property values at timestamps.
  - Scrubbing the playhead directly updates canvas elements in real time.

---

## 5. Deep Dive: Framer

### 5.1 Mental Model: Adaptive Web Architecture & Publishing Parity
- **Components & Variants**:
  - Master Component: Single canonical definition.
  - Instance: Reference to master with explicit slot overrides (text, image, color).
  - Detach Instance: Instantly flattens the instance into standard editable nodes with zero parent link.
- **Zero Mismatch Publishing**:
  - The live published site uses the exact same layout engine and component tree as the canvas.
  - No legacy fallbacks or mock renderers; what is designed is compiled directly into static/server-rendered HTML.

---

## 6. Deep Dive: Spline & 3D Spatial Computing

### 6.1 Mental Model: Spatial Scene Graph with Capability Isolation
- **True WebGL Runtime**:
  - Uses Three.js / WebGL with hardware-accelerated shaders, perspective camera, ambient/directional lighting, and mesh primitives.
- **Capability Isolation (Zero DOM Overhead)**:
  - 95% of websites do not require 3D.
  - The 3D runtime and WebGL canvas are loaded **strictly on demand**.
  - A standard DOM website never instantiates a WebGL context or downloads heavy 3D bundles unless a 3D element exists on the page.

---

## 7. Comparative UX Synthesis Table

| Feature Area | Figma Standard | Webflow Standard | Canva Standard | Proposed OrbitoX Studio Target |
|---|---|---|---|---|
| **Canvas Selection** | Deep selection + Cmd-click | Box model outline + breadcrumbs | Bounding box + quick action bar | **Deep selection + Bounding box + Floating Context Bar** |
| **Layers Tree** | Complete active page tree | Full DOM tree with tags | Simplified page/element list | **Full Active Page Tree (Sections ➔ Stacks ➔ Leaf Nodes)** |
| **Box Model** | Numeric padding/gap | Visual 4-sided diagram | Padding slider | **Visual 4-Sided Interactive Diagram + Direct numeric inputs** |
| **Corner Radius** | Linked / 4-corner inputs | 4-corner radius inputs | Slider | **Linked / 4-Corner Inputs (TL, TR, BR, BL) with Presets** |
| **Responsive** | Cascading breakpoints | Desktop-first cascade | Auto-resize | **Desktop-First Primary Cascade with Localized Overrides** |
| **Motion** | Smart Animate presets | Multi-track GSAP timeline | Page transitions | **Integrated Visual Timeline with Keyframes & Spring Physics** |
| **Templates** | Library components | Site clones & templates | Visual template swapper | **Atomic Template Instantiation (New / Replace / Add Section / Theme)** |
| **3D Integration** | Plugins only | 3D transforms only | None | **Isolated Three.js WebGL Runtime (Zero cost on 2D DOM sites)** |
