# 🪐 OrbitoX P26 — Adobe XD Archive Ingestion Strategy
**Document ID:** `docs/P26_XD_STRATEGY.md`  
**Phase:** P26 Phase 0 (Legacy Tool Interoperability)  
**Status:** ARCHITECTURAL SPECIFICATION  
**Author:** Adobe XD Interoperability Specialist & Creative Tool Architect  
**Date:** October 2026  

---

## 1. Executive Summary & Context

With Adobe halting active development of Adobe XD, millions of production designs and client design systems are trapped in legacy `.xd` archives. OrbitoX provides a premier migration path: creators drop an `.xd` file into OrbitoX Studio Zero, and it instantly breathes new life into the design, turning it into a living, responsive, production-ready web application.

---

## 2. Adobe XD File Architecture Forensic Breakdown

An `.xd` file is a standard ZIP container with a deterministic internal directory structure:

```
design-project.xd (ZIP container)
├── mimetype                     ──► "application/vnd.adobe.sparkler.project+dcx"
├── manifest                     ──► JSON metadata (artboard UUIDs, dimensions, app version)
├── resources/
│   ├── graphics/
│   │   └── graphicContent.agc   ──► Master components, global colors, gradients
│   └── images/
│       └── resource-{hash}      ──► Raw bitmap images (PNG, JPEG, WebP)
├── artwork/
│   ├── artboard-{uuid-1}/
│   │   └── graphics/
│   │       └── graphicContent.agc──► Artboard 1 SceneGraph nodes
│   └── artboard-{uuid-2}/
│       └── graphics/
│           └── graphicContent.agc──► Artboard 2 SceneGraph nodes
└── interactions/
    └── interactions.json        ──► Interactive screen-to-screen transitions
```

---

## 3. Ingestion & Conversion Pipeline

```
┌─────────────────────────────────┐
│     User Uploads .xd File       │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   In-Browser ZIP Unpacking      │ ──► JSZip / DecompressionStream
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   Parse `manifest` & Discover   │ ──► Extract Artboard list & Canvas sizes
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   Parse `graphicContent.agc`    │ ──► Traverse nodes, resolve text runs & shapes
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   Flow & Flex Inferrer Engine   │ ──► Convert absolute layout to Flex/Stack
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   Extract `interactions.json`   │ ──► Map XD triggers to OrbitoX Interactions
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   Emit Universal Import IR      │ ──► Hydrate SceneGraph
└─────────────────────────────────┘
```

---

## 4. Entity Mapping Matrix: Adobe XD to OrbitoX

| Adobe XD Entity | `.agc` Path / Type | OrbitoX SceneGraph Target | Transformation Mechanics |
|:---|:---|:---|:---|
| **Artboard** | `type: "artboard"` | `TemplatePageDefinition` or Section | Creates canvas artboard with matching width and height. |
| **Group** | `type: "group"` | `kind: "group"` / `kind: "stack"` | If children align linearly, converts to flex stack; otherwise group. |
| **Shape: Rectangle** | `type: "shape"`, rect spec | `kind: "shape"`, `shapeType: "rectangle"` | Translates `r` (radii array), fills, and border strokes. |
| **Shape: Ellipse** | `type: "shape"`, ellipse spec | `kind: "shape"`, `shapeType: "circle"` | Translates rx/ry into border-radius 9999px. |
| **Path / Vector** | `type: "path"`, path string | `kind: "shape"`, `vectorPath` | XD SVG path commands mapped 1:1 to SVG `d` attribute. |
| **Text** | `type: "text"` | `kind: "text"` / `kind: "richtext"` | XD `rawText` and `paragraphs[].lines[].runs[]` mapped to typography styles. |
| **Image Fill** | `fill: { type: "pattern" }` | `kind: "image"` | Maps pattern resource ID to `resources/images/resource-{hash}`. |
| **Component Symbol** | `meta: { ux: { symbolId } }`| `kind: "component_instance"` | Maps to OrbitoX Master Component definition. |
| **Interaction** | `interactions.json` | `node.interactions: []` | Maps `trigger: "tap"` and `action: "goToArtboard"` to `trigger: "click"`, `action: "navigate"`. |

---

## 5. Converting XD Absolute Positioning into Responsive Flexbox

Adobe XD is strictly absolute-coordinate based. To prevent imported projects from being rigid, un-responsive fixed-canvas mockups:
1. **OrbitoX Bounding Box Clustering:**
   - Group horizontally overlapping nodes into Rows.
   - Group vertically sequential rows into Columns.
2. **Auto-Margin & Spacer Deduction:**
   - Compute space between adjacent bounding boxes $\longrightarrow$ set as `gap: "${spacing}px"`.
3. **Anchor & Pinning Rules:**
   - XD constraints (`pinLeft`, `pinRight`, `pinTop`, `fixWidth`) map directly to OrbitoX geometry anchors (`anchor.horizontal: "left"|"right"|"center"`).

*This concludes the Adobe XD Strategy. Proceed to `docs/P26_CANVA_STRATEGY.md`.*
