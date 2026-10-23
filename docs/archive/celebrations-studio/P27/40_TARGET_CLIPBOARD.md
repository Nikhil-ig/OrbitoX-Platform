# 🪐 OrbitoX Studio 3.0 — Target Clipboard Architecture
**Document ID:** `docs/P27/40_TARGET_CLIPBOARD.md`  
**Status:** TARGET ARCHITECTURE SPECIFICATION (PHASE 0)  

---

## 1. Multi-MIME Type Clipboard Serialization (Section 66)

Copying nodes writes multiple MIME formats to the OS clipboard simultaneously via `navigator.clipboard.write([ClipboardItem])`:
1. `application/x-orbitox-node+json`: Complete native SceneGraph serialization including styles, layout configs, and responsive overrides.
2. `image/svg+xml`: Vector SVG markup suitable for pasting into Figma, Illustrator, or Sketch.
3. `text/html`: Semantic HTML5 representation with clean utility or inline CSS.
4. `text/plain`: Text content of selected nodes.

---

## 2. "Copy As" Generators (Section 68)

Right-clicking or using the command palette provides immediate code generation from canonical project state:
* **Copy as React / JSX:** Clean functional component with typed props and Tailwind or styled classes.
* **Copy as HTML & CSS:** Production HTML snippet with compiled stylesheet.
* **Copy as SVG:** Self-contained vector graphic.

---

## 3. "Paste Special" Pipeline (Section 67)

When pasting into the canvas:
* If clipboard contains native OrbitoX JSON -> Clones nodes with fresh unique IDs.
* If clipboard contains an image file -> Uploads image and creates Image node.
* If clipboard contains SVG text -> Parses vector paths into native Shape/Vector nodes.
* If clipboard contains HTML snippet -> Ingests via Universal Import IR pipeline.
