# 🪐 OrbitoX Studio 3.0 — Clipboard System Forensic Audit
**Document ID:** `docs/P27/19_CLIPBOARD_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Existing Clipboard Implementation

Clipboard logic resides in `SceneGraphClipboard.ts`:
* Supports `copyNodes(nodes, cut)` storing serialized JSON in `sessionStorage` and calling `navigator.clipboard.writeText(JSON.stringify(payload))`.
* Supports `pasteNodes(sceneGraph, targetParentId)` assigning new IDs to cloned nodes.

---

## 2. Forensic Deficiencies Identified

1. **Lack of Multi-MIME Type Support:**
   `navigator.clipboard.writeText` only writes plain text. When a designer copies a node in OrbitoX and tries to paste it into Slack, Figma, or an external IDE, it pastes raw serialized JSON rather than semantic SVG, HTML, or plain text.
2. **Missing "Copy As" Functionality (Section 68):**
   No built-in generators for:
   * Copy as HTML
   * Copy as React JSX
   * Copy as Tailwind CSS
   * Copy as SVG
3. **Missing "Paste Special" Pipeline (Section 67):**
   Pasting an external SVG, HTML snippet, or image URL either fails or is pasted as raw text into a text node rather than instantiating the appropriate node type.
