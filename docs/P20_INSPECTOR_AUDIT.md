# 🪐 OrbitoX Studio — P20 Inspector Architecture & Property Audit
**Document ID:** `docs/P20_INSPECTOR_AUDIT.md`  
**Phase:** P20 — Phase 0: Forensic Audit & Rebuild Planning  
**Date:** October 3, 2026  
**Auditor:** Principal Frontend & UI Architect  
**Status:** **AUDIT COMPLETE (AWAITING USER APPROVAL)**

---

## 1. Executive Summary: The Monolithic Inspector Crisis

The current Right Inspector (`PropertiesPanel.tsx`) is a **single 2,629-line monolithic file** attempting to handle all document-level, section-level, and 15 element-level inspectors simultaneously:

```
PropertiesPanel.tsx (118 KB, 2,629 lines)
├── Fallback Scene Header (Mislabeled "Page Inspector") [Lines 111-380]
├── General Node Header & Action Icons [Lines 450-520]
├── Essentials Tab (Text Content, Dimensions, Layout Direction) [Lines 530-900]
├── Design Tab (Fill, Stroke, Radius, Shadows, Box Model) [Lines 901-1400]
├── Specialized Element Panels (Countdown, RSVP, Map, 3D, Video, Gallery) [Lines 1401-1900]
├── Visual Box Model Inputs [Lines 1950-2225]
├── Corner Radius Sliders [Lines 2226-2350]
├── Behavior Tab (Links, Actions, Triggers) [Lines 2351-2480]
└── Advanced Tab (Z-Index, ID, Raw JSON, Expert diagnostics) [Lines 2481-2629]
```

### Critical Consequences of the Monolith:
1. **Context Pollution**: No clear boundary between Page, Section, Layout, and Element properties.
2. **Key Collisions**: Multiple sections dispatch the same property under different names (`borderRadius` vs `border.radius`, `paddingX` vs `paddingLeft`).
3. **Severe Performance Lag**: Every keystroke in an input field causes the entire 2,629-line component tree to re-evaluate and re-render.
4. **Dead Controls**: Multiple controls render visually but have no listeners or send updates to fields ignored by `StyleResolver.ts`.

---

## 2. Rebuilding the Inspector: Context-First Architecture

The monolithic panel must be dismantled and replaced by **type-specialized contextual inspector modules**:

```
                       CANVAS SELECTION
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
Nothing Selected       Section Selected       Node Selected
         ▼                    ▼                    ▼
   PAGE INSPECTOR      SECTION INSPECTOR           │
   • Page Name         • Section Title             ├─ Layout Node:  CONTAINER / STACK / GRID
   • Route Slug        • Anchor ID                 ├─ Text Node:    TYPOGRAPHY / CONTENT
   • SEO Title/Desc    • Layout Variant            ├─ Media Node:   IMAGE / VIDEO / GALLERY
   • Background        • Section Padding           ├─ Input Node:   RSVP / FORM / BUTTON
   • Global Tokens     • Order & Move              └─ Spatial Node: 3D / WebGL / PARALLAX
```

---

## 3. Box Model Rebuild Plan

### 3.1 The Visual Box Model Specification
The current box model inputs are replaced by an interactive, designer-grade concentric 2D box model:

```
┌─────────────────────────────────────────────────────────────┐
│                           MARGIN                            │
│                         [  top  ]                           │
│     ┌─────────────────────────────────────────────────┐     │
│     │                      BORDER                     │     │
│     │  ← [ left ]                       [ right ] →   │     │
│     │     ┌─────────────────────────────────────┐     │     │
│     │     │               PADDING               │     │     │
│     │     │              [  top  ]              │     │     │
│     │     │  ┌───────────────────────────────┐  │     │     │
│     │     │  │            CONTENT            │  │     │     │
│     │     │  │          [ W  ×  H ]          │  │     │     │
│     │     │  └───────────────────────────────┘  │     │     │
│     │     │             [ bottom ]              │     │     │
│     │     └─────────────────────────────────────┘     │     │
│     │                                                 │     │
│     └─────────────────────────────────────────────────┘     │
│                         [ bottom ]                          │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Layout-Aware Box Model Semantics:
- **In Stack / Flex Layout**:
  - `margin` is disabled or acts as auto-margin alignment.
  - `padding` insets children from container walls.
  - `gap` controls spacing between adjacent sibling items.
- **In Freeform (Absolute) Layout**:
  - `left` / `top` dictate absolute position coordinates.
  - `margin` is normalized to offset adjustments.
- **Unit Support**: Every input supports explicit units: `px` (default), `rem`, `%`, `auto`, and `vw`/`vh`.

---

## 4. Corner Radius Rebuild Plan

### 4.1 Normalized Data Contract
The data model is unified across the inspector, store, and resolver:

```typescript
interface NodeBorderRadius {
  tl: number | string; // Top Left
  tr: number | string; // Top Right
  br: number | string; // Bottom Right
  bl: number | string; // Bottom Left
  isLinked: boolean;   // True if all 4 corners are linked
}
```

### 4.2 Resolver Translation to CSS:
```typescript
if (style.borderRadius) {
  if (typeof style.borderRadius === 'object') {
    const { tl = 0, tr = 0, br = 0, bl = 0 } = style.borderRadius;
    const format = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);
    css.borderRadius = `${format(tl)} ${format(tr)} ${format(br)} ${format(bl)}`;
  } else {
    css.borderRadius = typeof style.borderRadius === 'number' ? `${style.borderRadius}px` : style.borderRadius;
  }
}
```

### 4.3 Quick Presets:
`0px (Square)`, `4px (Subtle)`, `8px (Card)`, `16px (Container)`, `24px (Pill Soft)`, `9999px (Full Capsule)`.

---

## 5. Style Property Coverage Audit Matrix

| Property Group | Properties Audited | Inspector Read | Inspector Write | StyleResolver CSS | Real Render Status |
|---|---|:---:|:---:|:---:|:---:|
| **Dimensions** | width, height, min/max | YES | YES | YES | **WORKING** |
| **Positioning** | x, y, z-index, position | YES | YES | YES | **WORKING** |
| **Corner Radius**| tl, tr, br, bl, linked | PARTIAL | BROKEN | MISMATCH | **BROKEN** |
| **Padding** | top, right, bottom, left | YES | PARTIAL | YES | **PARTIAL** |
| **Margin** | top, right, bottom, left | YES | PARTIAL | PARTIAL | **PARTIAL** |
| **Layout Gap** | row-gap, column-gap | YES | YES | YES | **WORKING** |
| **Typography** | font, weight, size, height | YES | YES | YES | **WORKING** |
| **Fills & Colors**| solid, gradient, image | YES | YES | YES | **WORKING** |
| **Strokes/Border**| color, width, style | YES | YES | YES | **WORKING** |
| **Shadows** | drop-shadow, box-shadow | YES | YES | YES | **WORKING** |
| **Filters/Blur**| blur, backdrop-blur | YES | PARTIAL | YES | **PARTIAL** |
| **Opacity** | 0.0 to 1.0 slider | YES | YES | YES | **WORKING** |
