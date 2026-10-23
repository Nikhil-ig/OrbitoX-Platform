# P26.1 Forensic Audit: Inspector Panel, Box Model & Corner Radius

## 1. Executive Summary

`PropertiesPanel.tsx` is the primary property manipulation surface in OrbitoX Studio Zero, spanning 2,638 lines of code. It accommodates extensive capabilities, including geometry, styles, fills, borders, typography, component master/instance controls, responsive overrides, and 3D depth parameters.

However, a forensic audit reveals two major UI/UX defects:
1. **The Visual Box Model is Incomplete**: While padding and margin inputs exist (lines 2030–2140), they lack interactive visual nesting (Margin Box enclosing Padding Box enclosing Content Dimensions), intuitive unit switching, and linked/unlinked visual toggles that mimic industry-standard visual tools (Webflow, Framer).
2. **Corner Radius Lacks Visual Hotspots and Standard Presets**: The corner radius control currently consists of a simple slider and an unlink button that displays 4 raw text inputs. It lacks the interactive rounded-rectangle visual schematic with four corner hotspots and standard instant presets (`None: 0px`, `Small: 4px`, `Medium: 8px`, `Large: 16px`, `Pill: 9999px`).

---

## 2. Forensic Codebase Audit of Existing Inspector

### 2.1 File: `orbitox/apps/celebrations/components/studio-zero/PropertiesPanel.tsx`
- **Total Lines**: 2,638 lines
- **Current Tab Structure**:
  - `essentials`: Common properties (dimensions, alignment, text content, image URL).
  - `design`: Visual styling (background, border, corner radius, shadow, opacity).
  - `layout`: Flex/Grid alignment, spacing, padding, margin.
  - `motion`: Animation presets, duration, delay, triggers.
  - `effects`: Glassmorphism, backdrop blur, blend modes.
  - `data`: Variable binding, repeaters.
  - `advanced`: Code AST inspect, custom CSS, z-index, accessibility tags.
- **Issues Identified**:
  - Semantic components (e.g. `hero`, `navbar`, `button`) show raw low-level CSS properties by default rather than high-level semantic content controls (e.g. Button Label, Target URL, Icon Position, Variant).
  - Property overload: Too many technical inputs are exposed simultaneously on simple selections.

---

## 3. Visual Box Model Specification

The Box Model must be rendered as a clear, layered, interactive diagram:

```
┌────────────────────────────────────────────────────────┐
│                        MARGIN                          │
│                         [ 0 ]                          │
│     ┌────────────────────────────────────────────┐     │
│     │                  PADDING                   │     │
│     │                   [ 16 ]                   │     │
│     │     ┌────────────────────────────────┐     │     │
│     │     │                                │     │     │
│[ 0 ]│[ 24]│         1200 × 600             │[ 24]│[ 0 ]│
│     │     │           CONTENT              │     │     │
│     │     │                                │     │     │
│     │     └────────────────────────────────┘     │     │
│     │                   [ 16 ]                   │     │
│     │                  PADDING                   │     │
│     └────────────────────────────────────────────┘     │
│                         [ 0 ]                          │
│                        MARGIN                          │
└────────────────────────────────────────────────────────┘
```

### 3.1 Control Features
1. **Four-Way Individual Controls**: Top, Right, Bottom, Left.
2. **Linked Mode Toggle**: When linked, adjusting any side adjusts all four sides symmetrically.
3. **Axis-Linked Mode**: Horizontal (`px / mx`) and Vertical (`py / my`) paired inputs.
4. **Unit Selectors**: Support `px`, `rem`, `%`, `em`, and `auto`.
5. **Direct Mutation**: Every keystroke or scrub directly updates `node.style.padding` or `node.style.margin` and propagates to the canvas renderer without lag.

---

## 4. Visual Corner Radius Control Specification

### 4.1 Visual Interactive Diagram
An interactive SVG graphic representing a rounded box with 4 interactive corner anchor points:
```
       ╭─────────────────────────────╮
       │ (TL)                   (TR) │
       │                             │
       │                             │
       │ (BL)                   (BR) │
       ╰─────────────────────────────╯
```
- Clicking a corner hotspot focuses that specific corner's numeric input.
- Dragging a corner hotspot interactively increases or decreases that corner's radius.

### 4.2 Presets Bar
Instant one-click presets:
- **None**: `0px` (Sharp corners)
- **Small**: `4px` (Subtle UI components, inputs)
- **Medium**: `8px` (Standard cards, dropdowns)
- **Large**: `16px` (Hero banners, dialog modals)
- **Pill**: `9999px` (Fully rounded badges and CTA buttons)

### 4.3 Custom & Asymmetric Radius
- Unlinked mode exposes 4 inputs: `TL`, `TR`, `BR`, `BL`.
- Directly maps to CSS `border-radius: tl tr br bl` and SceneGraph schema.
