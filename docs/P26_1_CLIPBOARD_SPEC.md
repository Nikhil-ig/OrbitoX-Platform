# P26.1 Technical Specification: Smart Clipboard Engine & Multi-MIME Bridge

## 1. System Overview

The **Smart Clipboard Engine** (`SceneGraphClipboard.ts` and `SystemClipboardBridge.ts`) manages copy, cut, and paste operations across both internal application memory and the host operating system's system clipboard. It enables seamless interoperability between OrbitoX and external tools (Figma, VS Code, Chrome, Illustrator, Finder).

---

## 2. Multi-MIME Clipboard Contract

### 2.1 Write Pipeline (Copy / Cut)
When a creator copies one or more nodes (`Cmd+C` or `Right-Click → Copy`):
1. **Internal Memory & LocalStorage**: Serializes the selected subtrees into a normalized `ClipboardEntry` with timestamp, source scene ID, and root node identifiers.
2. **OS System Clipboard**: Writes 4 parallel MIME data streams using `navigator.clipboard.write`:
   - `application/x-orbitox-scenegraph`: Raw JSON representation for 100% lossless copy-paste between OrbitoX browser tabs and projects.
   - `text/html`: Clean, semantic HTML5/Tailwind markup representation allowing creators to paste directly into code editors (VS Code, WebStorm).
   - `image/svg+xml`: Vector SVG representation allowing creators to paste vector paths directly into Figma or Adobe Illustrator.
   - `text/plain`: Human-readable text content or JSX representation.

### 2.2 Read Pipeline (Paste)
When a creator presses `Cmd+V` or right-clicks and selects `Paste Here`:

```
User Presses Cmd+V
        │
        ▼
Inspect Clipboard Data
        │
        ├─► Is `application/x-orbitox-scenegraph` present?
        │     └─► YES: Remap IDs, offset position, insert native nodes directly.
        │
        ├─► Is `image/png` or `image/jpeg` binary blob present?
        │     └─► YES: Stream blob to `AssetIngestionService`, create asset ID,
        │              insert `image` node at mouse cursor.
        │
        ├─► Is `image/svg+xml` or text starting with `<svg` present?
        │     └─► YES: Parse SVG DOM, extract paths/fills/viewBox,
        │              insert vector SceneGraph frame.
        │
        ├─► Is `text/html` present?
        │     └─► YES: Activate "Smart Paste" Heuristic:
        │              If single element -> Insert as Native Element.
        │              If section/page -> Display Smart Paste Menu:
        │                 [ Paste as Native Elements ] (Recommended)
        │                 [ Paste as New Section ]
        │                 [ Paste as Custom Embed ]
        │
        └─► Is `text/plain` present?
              └─► If valid JSON matching SceneGraph schema -> Parse & insert.
              └─► Otherwise -> Insert `text` node with plain text content.
```

---

## 3. Smart Paste Action Modals

When external HTML markup is detected, OrbitoX displays a subtle floating action prompt near the cursor:

```
┌────────────────────────────────────────────────────────┐
│  📋 HTML Snippet Detected (<section class="hero">...)  │
├────────────────────────────────────────────────────────┤
│  How would you like to paste this?                     │
│                                                        │
│  [✨ Paste as Native Elements] (Recommended)           │
│     Translates into editable Frames, Headings, Buttons │
│                                                        │
│  [📑 Paste as New Section]                             │
│     Appends a new full-width section to active page    │
│                                                        │
│  [📦 Paste as Custom Embed]                            │
│     Isolates HTML/JS in a sandboxed HTML component     │
└────────────────────────────────────────────────────────┘
```

---

## 4. Paste Special Semantics

### 4.1 Paste to Replace (`⇧⌘R`)
- Replaces the currently selected node on canvas with the content from clipboard.
- **Node Contract**:
  - The newly pasted root node takes the parent ID of the replaced node.
  - The newly pasted root node takes the exact index within `parent.children` array.
  - If target was constrained (e.g. `width: 320px`), the new node inherits those constraints.
  - Old node and its subtrees are cleanly removed from the scene graph.

### 4.2 Paste Styles Only (`⌥⌘V`)
- Extracts style properties from clipboard:
  - `fills` / `background`
  - `strokes` / `border`
  - `borderRadius`
  - `boxShadow`
  - `backdropFilter`
  - `opacity`
  - `typography` (if target is a text node)
- Applies extracted properties onto targeted node without altering children or layout structure.
