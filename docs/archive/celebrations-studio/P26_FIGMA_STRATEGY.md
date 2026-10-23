# 🪐 OrbitoX P26 — Figma Universal Ingestion & Interoperability Strategy
**Document ID:** `docs/P26_FIGMA_STRATEGY.md`  
**Phase:** P26 Phase 0 (Design Tool Strategy)  
**Status:** ARCHITECTURAL SPECIFICATION  
**Author:** Figma-Class Canvas Engineer & Principal Product Architect  
**Date:** October 2026  

---

## 1. Executive Summary & Value Proposition

Figma is the world's premier digital design interface. To establish OrbitoX Studio Zero as a true creative powerhouse, creators must be able to seamlessly bring Figma designs into OrbitoX and immediately edit, animate, make responsive, bind to real data, and publish them as high-performance web applications.

This strategy establishes two complementary ingestion tracks:
1. **Figma REST API & Cloud Sync:** Creators paste a Figma file/frame URL and connect their Figma account.
2. **Direct `.fig` Binary Ingestion & Plugin Bridge:** Offline drag-and-drop of `.fig` archives or instant one-click export via the official OrbitoX Figma Bridge plugin.

---

## 2. Ingestion Track 1: Figma REST API Pipeline

### 2.1 Workflow Sequence
```
Creator pastes Figma URL (https://www.figma.com/design/KEY/Project?node-id=1-23)
      │
      ▼
Authenticate (Personal Access Token or OAuth2 PKCE)
      │
      ▼
Fetch Document AST: GET /v1/files/{file_key}?ids={node_id}&geometry=paths
      │
      ▼
Traverse Node Tree & Collect Image References (fills with type === "IMAGE")
      │
      ▼
Batch Fetch High-Res Images: GET /v1/images/{file_key}?ids=...&format=png&scale=2
      │
      ▼
Batch Fetch Rendered Vectors (Complex SVGs): GET /v1/images/{file_key}?ids=...&format=svg
      │
      ▼
Feed into FigmaAdapter ──► Universal Import IR ──► OrbitoX SceneGraph
```

---

## 3. Structural Mapping: Figma AST to OrbitoX SceneGraph

### 3.1 Node Type Correspondence

| Figma Node Type | Conditions / Attributes | OrbitoX SceneGraph Node Kind | Layout / Style Behavior |
|:---|:---|:---|:---|
| `CANVAS` | Top-level page | `TemplatePageDefinition` | Root page container in project hierarchy. |
| `FRAME` | Height > 400, top-level on canvas | `TemplateSceneDefinition` (Section) | Full-width section with auto-layout or container geometry. |
| `FRAME` | Inner frame with `layoutMode !== "NONE"` | `kind: "stack"` | CSS Flexbox row or column with gap and padding. |
| `FRAME` | Inner frame with `layoutMode === "NONE"` | `kind: "frame"` | Absolute coordinates with transform origin and constraints. |
| `TEXT` | Single style run | `kind: "text"` | Direct text string with typography tokens. |
| `TEXT` | Multiple style runs / character spans | `kind: "richtext"` | Structured rich text with inline bold, italic, colors, links. |
| `RECTANGLE` | Fill has `IMAGE` | `kind: "image"` | Image node with `objectFit: "cover"|"contain"`. |
| `RECTANGLE` | Fill has solid/gradient | `kind: "shape"`, `shapeType: "rectangle"` | Shape node with background fill and border radius. |
| `ELLIPSE` | Solid / Gradient | `kind: "shape"`, `shapeType: "circle"` | Rounded geometry. |
| `VECTOR` / `STAR` / `LINE` | Path geometry | `kind: "shape"` / `vectorPath` | SVG path rendering via `vectorPaths[0].data`. |
| `COMPONENT` | Reusable master | Master `ComponentDefinition` | Registered in global component registry. |
| `INSTANCE` | Instance of master | `kind: "component_instance"` | Linked to master ID with property overrides. |
| `COMPONENT_SET` | Group of variants | Component with Variant Matrix | Variant axes (`variant=primary|secondary`, `size=sm|md|lg`). |

---

## 4. Layout & Coordinate Transformation Matrix

Figma's Auto-layout maps directly to OrbitoX's Flex/Stack layout engine:

```typescript
function mapFigmaAutoLayout(figmaNode: FigmaFrameNode): AutoLayoutConfig {
  const isHorizontal = figmaNode.layoutMode === 'HORIZONTAL';
  
  return {
    direction: isHorizontal ? 'horizontal' : 'vertical',
    gap: `${figmaNode.itemSpacing || 0}px`,
    padding: {
      top: `${figmaNode.paddingTop || 0}px`,
      right: `${figmaNode.paddingRight || 0}px`,
      bottom: `${figmaNode.paddingBottom || 0}px`,
      left: `${figmaNode.paddingLeft || 0}px`,
    },
    alignment: {
      primary: mapPrimaryAxis(figmaNode.primaryAxisAlignItems),
      cross: mapCounterAxis(figmaNode.counterAxisAlignItems),
    },
    wrap: figmaNode.layoutWrap === 'WRAP',
  };
}

function mapPrimaryAxis(align: string): 'start' | 'center' | 'end' | 'space-between' {
  switch (align) {
    case 'CENTER': return 'center';
    case 'MAX': return 'end';
    case 'SPACE_BETWEEN': return 'space-between';
    default: return 'start';
  }
}

function mapCounterAxis(align: string): 'start' | 'center' | 'end' | 'stretch' {
  switch (align) {
    case 'CENTER': return 'center';
    case 'MAX': return 'end';
    case 'BASELINE': return 'start';
    default: return 'stretch';
  }
}
```

---

## 5. Ingestion Track 2: Direct `.fig` Binary Parsing

### 5.1 The `.fig` File Format Anatomy
A `.fig` file is a ZIP archive containing two primary segments:
1. **Header:** 32-byte binary header with magic bytes `fig-kiwi`.
2. **Kiwi Binary Stream:** A binary serialization format developed by Figma (based on the open-source Kiwi schema language).

### 5.2 De-serialization Engine
To parse `.fig` files client-side without relying on external servers:
1. Decompress ZIP payload using `JSZip` / WebStreams.
2. Read the binary Kiwi schema definition embedded in the file.
3. Decode the message stream into the identical Figma node JSON AST used by the REST API.
4. Pass directly into `FigmaAdapter.parse()`.

---

## 6. Design Token & Variable Extraction

Figma variables (Color, Float, String, Boolean) are extracted directly into OrbitoX Design Tokens:
- **Color Variables:** `Figma Collection "Core Colors" -> primary/500` $\longrightarrow$ `tokens.colors.primary = "#3b82f6"`.
- **Spacing Variables:** `Spacing/md` $\longrightarrow$ `tokens.spacing.md = 16`.
- **Radii Variables:** `Radius/card` $\longrightarrow$ `tokens.radii.card = 12`.
- **Typography Styles:** Mapped to Google Fonts / native font family descriptors.

---

## 7. Vector Precision & Boolean Flattening

When an imported Figma node is a complex Boolean Operation (`UNION`, `SUBTRACT`, `INTERSECT`, `EXCLUDE`):
1. **First Choice:** If vector path data is available in `node.vectorPaths`, construct clean SVG geometry so each anchor point and bezier curve remains editable.
2. **Visual Fallback:** If the vector includes complex non-standard boolean shaders, request high-fidelity SVG vector rasterization via Figma's Image API to guarantee 100% visual parity.

*This concludes the Figma Ingestion Strategy. Proceed to `docs/P26_XD_STRATEGY.md`.*
