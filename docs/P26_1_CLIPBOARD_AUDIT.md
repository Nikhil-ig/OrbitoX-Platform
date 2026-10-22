# P26.1 Forensic Audit: Clipboard Architecture & Smart Paste Engine

## 1. Executive Summary

In a modern web design tool, **copying and pasting** is the single highest-frequency interoperability mechanism. Creators constantly copy code snippets from StackOverflow or GitHub, SVGs from Figma or Illustrator, imagery from browser search tabs, and components between different pages or projects.

In the current implementation:
- `SceneGraphClipboard.ts` handles internal SceneGraph nodes (`application/x-orbitox-scenegraph`) and cross-tab `localStorage` synchronization.
- `SystemClipboardBridge.ts` writes fallback HTML and JSON to the OS clipboard.
- **Critical Gap**: When a user copies arbitrary external content (e.g. an HTML `<section>` from Chrome, an SVG logo from Figma, or an image file from Finder) and presses `Cmd+V` over OrbitoX canvas, the application does not yet intelligently intercept and translate the external MIME payload into native, editable SceneGraph nodes.

---

## 2. Current Implementation Audit

### 2.1 File: `orbitox/apps/celebrations/components/template-studio/engine/SceneGraphClipboard.ts`
- **Total Lines**: 500 lines
- **Capabilities Present**:
  - Subtree collection and deep cloning (`copy`, `cut`).
  - ID remapping (`remapIds`) ensuring pasted nodes never collide with existing nodes.
  - Position offsetting (+24px offset on duplicate paste).
  - Cross-tab `localStorage` serialization.
  - Asynchronous write to system clipboard via `navigator.clipboard.write`.
  - Paste Special primitives (`pasteToReplace`, `pasteStylesOnly`).

### 2.2 System Clipboard Ingestion Deficiencies
- When `handlePaste` fires in `CanvasWorkspace.tsx`, it inspects the internal `SceneGraphClipboard.getClipboard()` snapshot first.
- If the internal snapshot is null, or if the user copied content from an external application, `navigator.clipboard.read()` or `e.clipboardData` is not fully wired to the `@orbitox-io/importer-core` parser pipeline.
- Specifically:
  1. **External HTML**: Pasting an HTML `<section>...</section>` does not trigger the smart modal: `Paste as: Native Elements | Section | Embed`.
  2. **External SVG**: Pasting `<svg>...</svg>` text does not automatically compile into vector paths.
  3. **External Images**: Pasting binary image data (e.g. screenshot via `Cmd+Shift+4` on macOS) does not automatically upload to `FileUploadService` and drop at the cursor position.

---

## 3. The Multi-MIME Format Hierarchy

A professional clipboard must handle both write and read operations across multiple MIME representations simultaneously:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        OS SYSTEM CLIPBOARD                             │
├────────────────────────────────┬───────────────────────────────────────┤
│ MIME Type                      │ Payload Description                   │
├────────────────────────────────┼───────────────────────────────────────┤
│ application/x-orbitox-scenegraph│ Full lossless JSON SceneGraph Subtree │
│ text/html                      │ Clean, semantic HTML5 + CSS markup    │
│ image/svg+xml                  │ Vector SVG graphic representation     │
│ image/png                      │ Rendered bitmap raster preview        │
│ text/plain                     │ Human-readable text content / JSX     │
└────────────────────────────────┴───────────────────────────────────────┘
```

When pasting:
1. If `application/x-orbitox-scenegraph` exists → Native lossless paste with fresh IDs.
2. If `image/svg+xml` or `text/plain` starts with `<svg` → Vector importer compiles into vector SceneGraph elements.
3. If `text/html` exists → `HtmlAdapter` analyzes the DOM:
   - If single element → Inset as child of selected frame.
   - If section-level (`<section>`, `<header>`, `<footer>`, `<div class="hero">`) → Offer "Paste as Section".
   - If complex custom script → Offer "Paste as Custom Embed".
4. If `image/png` or `image/jpeg` binary data exists → Automatically register in project assets and insert an `image` node.

---

## 4. Paste Special Specification

Paste Special must be accessible via keyboard shortcut (`⌥⌘V` / `⇧⌘V`) and the right-click menu:

### 4.1 Paste to Replace (`⇧⌘R`)
Replaces the selected node with the clipboard content:
- Preserves the target node's parent container.
- Preserves the target node's sibling index (order in layout).
- Optionally preserves target node's explicit geometry constraints (width/height).

### 4.2 Paste Styles Only (`⌥⌘V`)
Transfers visual styling without altering node kind, children, or text content:
- Backgrounds, gradients, fills.
- Borders, corner radii, outlines.
- Box shadows, backdrop blur.
- Typography (font family, font size, weight, letter spacing, line height, text color).

### 4.3 Paste Properties Only
Transfers layout parameters (direction, gap, padding, alignment) from one container to another.

### 4.4 Paste at Cursor Coordinates
Computes mouse position in scene coordinates (`SceneGraphEngine.viewportToSceneCoords`) and sets the pasted root node's `(x, y)` to match the user's cursor.
