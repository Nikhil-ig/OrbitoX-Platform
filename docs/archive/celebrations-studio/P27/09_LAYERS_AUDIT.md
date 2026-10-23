# 🪐 OrbitoX Studio 3.0 — Layers Panel Forensic Audit
**Document ID:** `docs/P27/09_LAYERS_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Architectural Bifurcation: Two Competing Panels

The codebase contains two competing layer panel implementations, creating extreme confusion and dead code:

| Component | File Path | Line Count | Active in Shell? | Features |
| :--- | :--- | :--- | :--- | :--- |
| **`LayersPanel`** | `components/studio-zero/LayersPanel.tsx` | 532 lines | **NO (Dead Island)** | Search, Rename, Reorder, Node Kind Icons, Lock/Hide toggles |
| **`PageTreePanel`** | `components/studio-zero/navigation/PageTreePanel.tsx` | 552 lines | **YES (Mounted)** | Pages list, Section headers, Shallow root child list |

---

## 2. Flaws in Mounted `PageTreePanel.tsx`

1. **Shallow Node Depth:**
   In lines 492–512, `PageTreePanel` only renders `rootNode.children`. If an element is nested deeper (e.g. `Section -> Container -> Card -> Button -> Text`), the children are only rendered via a recursive `renderNodeRow` helper that lacks drag-reparenting or deep tree folding.
2. **Missing Node Reparenting:**
   Dragging a node row in the tree does not support dropping into a sibling frame or moving to another section.
3. **No Multi-Select Representation:**
   When multiple nodes are selected via Shift+Click on the canvas, the tree only highlights the first node, failing to show the full active selection group.
4. **Active Page Disconnect:**
   The panel displays all sections in `schema.scenes`, ignoring whether those sections belong to the currently active page when multi-page templates are enabled.

---

## 3. Target Unification Requirement (Section 55)

The Layers panel must represent **all nodes on the active page** in a single, robust, virtualized tree hierarchy:
* Continuous expansion and collapse of frames, stacks, groups, and components
* Direct drag-and-drop reparenting and reordering with drop indicators
* Multi-selection with Shift/Cmd modifiers
* Inline double-click renaming with Enter/Escape validation
* Instant lock and hide toggles with clear visual indicators
