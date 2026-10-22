# 🪐 OrbitoX P26 — Professional Multi-MIME System Clipboard Architecture
**Document ID:** `docs/P26_CLIPBOARD_ARCHITECTURE.md`  
**Phase:** P26 Phase 0 (System Bridge Architecture)  
**Status:** CANONICAL SPECIFICATION  
**Author:** Figma-Class Canvas Engineer & Front-End Systems Architect  
**Date:** October 2026  

---

## 1. Executive Summary & Design Principle

The clipboard is the most universal interoperability bridge in modern operating systems. A true professional creative tool must not restrict copy-paste to internal in-memory variables.

The **OrbitoX System Clipboard Architecture** bridges the browser's native `navigator.clipboard` API with OrbitoX Studio Zero, enabling:
1. **Multi-MIME Type Export:** Copying an element writes native JSON, formatted HTML, SVG vector markup, and plain text simultaneously.
2. **External Clipboard Ingestion:** Pasting external HTML, Figma vectors, or images automatically routes through the **Universal Import Pipeline**.
3. **Paste Special Workflows:** Precision pasting options ("Paste to Replace", "Paste into Selection", "Paste Styles Only").
4. **Copy as Code:** One-click export of any canvas element to React/JSX, HTML/CSS, SVG, or JSON.

---

## 2. Multi-MIME Payload Architecture

When a creator presses `⌘C` (Copy) or `⌘X` (Cut) on an element or selection:

```
┌────────────────────────────────────────────────────────┐
│     OrbitoX Element / Selection (SceneGraphNodes)      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               OrbitoX Clipboard Serializer             │
└──────────────────────────┬─────────────────────────────┘
                           │
      ┌────────────────────┼────────────────────┬────────────────────┐
      ▼                    ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  MIME 1:     │     │  MIME 2:     │     │  MIME 3:     │     │  MIME 4:     │
│ application/ │     │  text/html   │     │  image/svg+  │     │  text/plain  │
│ vnd.orbitox. │     │              │     │  xml         │     │              │
│ scenegraph+  │     │ Clean W3C    │     │ Scalable SVG │     │ Raw text     │
│ json         │     │ HTML & CSS   │     │ vector code  │     │ content      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       └────────────────────┼────────────────────┴────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│     OS System Clipboard (navigator.clipboard.write)    │
└────────────────────────────────────────────────────────┘
```

### MIME Specifications:
1. `application/vnd.orbitox.scenegraph+json`:
   - Contains the exact, lossless JSON subtree representation, including tokens, motion settings, 3D transforms, and bindings.
   - Allows seamless copy-paste between different browser tabs, different projects, and different OrbitoX workspaces.
2. `text/html`:
   - Contains clean semantic HTML markup with inline CSS styles.
   - Allows pasting elements directly into Google Docs, Slack, Notion, Webflow, or email clients with preserved typography and colors.
3. `image/svg+xml`:
   - If the copied node is a shape, icon, or vector group, emits clean SVG markup for pasting into Figma, Illustrator, or Sketch.
4. `text/plain`:
   - Contains the textual content of the node (or child text nodes concatenated) for simple text editors.

---

## 3. External Clipboard Ingestion Engine

When a creator presses `⌘V` (Paste) inside OrbitoX Studio Zero:

```typescript
export class SystemClipboardBridge {
  static async handlePasteEvent(e: ClipboardEvent, targetParentId: string): Promise<void> {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Priority 1: Native OrbitoX SceneGraph JSON
    const nativeJson = clipboardData.getData('application/vnd.orbitox.scenegraph+json');
    if (nativeJson) {
      const payload = JSON.parse(nativeJson);
      this.executeNativePaste(payload, targetParentId);
      return;
    }

    // Priority 2: SVG Vector Data
    const svgText = clipboardData.getData('image/svg+xml');
    if (svgText || (clipboardData.getData('text/plain').trim().startsWith('<svg') && clipboardData.getData('text/plain').trim().endsWith('</svg>'))) {
      const cleanSvg = svgText || clipboardData.getData('text/plain');
      await this.ingestSvgVector(cleanSvg, targetParentId);
      return;
    }

    // Priority 3: HTML Web Snippet
    const htmlText = clipboardData.getData('text/html');
    if (htmlText && htmlText.trim().length > 0) {
      await this.ingestHtmlSnippet(htmlText, targetParentId);
      return;
    }

    // Priority 4: Image Blob / File (e.g. Screenshot paste)
    const items = Array.from(clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (imageItem) {
      const blob = imageItem.getAsFile();
      if (blob) {
        await this.ingestImageBlob(blob, targetParentId);
        return;
      }
    }

    // Priority 5: Plain Text
    const plainText = clipboardData.getData('text/plain');
    if (plainText) {
      this.ingestPlainText(plainText, targetParentId);
    }
  }
}
```

---

## 4. Paste Special Operations

| Command | Hotkey | Target Behavior |
|:---|:---:|:---|
| **Paste** | `⌘V` | Pastes clipboard subtree as the last child of selected container, or as a sibling after selected leaf node. |
| **Paste Here** | `⌥⇧⌘V` | Pastes clipboard subtree directly at the cursor coordinates on the canvas. |
| **Paste to Replace** | `⌥⌘V` | Replaces the selected node entirely with the clipboard node, preserving the original node's index, width, and position. |
| **Paste into Selection** | `⇧⌘V` | Force-inserts clipboard subtree as a child inside the selected frame/stack. |
| **Paste Styles Only** | `⌥⌘V` | Extracts background, border, shadow, opacity, and typography from clipboard node and applies them to selected node without altering geometry or content. |
| **Paste as Plain Text** | `⌥⇧⌘V` | Strips all HTML/styling and inserts raw text into current text element. |

---

## 5. Copy as Code Specifications

Creators can right-click any element and choose **Copy as Code ▶**:

### 5.1 Copy as React / JSX
Generates modern React (Next.js) functional component markup with Tailwind CSS classes or inline CSS:
```tsx
// Generated JSX from OrbitoX Hero Node
export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-[500px] px-8 py-16 bg-[#0B0F19] text-white">
      <h1 className="text-4xl font-bold tracking-tight text-[#DFBA6B] mb-4">Celestial Gala</h1>
      <p className="max-w-xl text-center text-slate-300">An unforgettable evening under the stars.</p>
    </section>
  );
}
```

### 5.2 Copy as HTML / CSS
Generates valid, standalone HTML5 markup with scoped `<style>` block.

### 5.3 Copy as SVG Vector
Generates optimized, valid standalone SVG code with extracted vector paths and gradients.

### 5.4 Copy as JSON AST
Generates complete serialized `SceneGraphNode` definition for developers and API automations.

*This concludes the Clipboard Architecture. Proceed to `docs/P26_SECURITY_MODEL.md`.*
