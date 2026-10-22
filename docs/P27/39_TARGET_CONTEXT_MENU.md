# 🪐 OrbitoX Studio 3.0 — Target Context Menu Architecture
**Document ID:** `docs/P27/39_TARGET_CONTEXT_MENU.md`  
**Status:** TARGET ARCHITECTURE SPECIFICATION (PHASE 0)  

---

## 1. Unified Command Dispatcher (Section 107)

Right-click menu actions, Command Palette (`Cmd+K`), and keyboard shortcuts invoke the exact same underlying commands:

```
[Right Click -> Duplicate] ──┐
[Cmd+K -> "Duplicate"]     ──┼──► controller.dispatch('DUPLICATE_NODES', { ids })
[Keyboard -> Cmd+D]         ──┘
```

---

## 2. Context-Sensitive Action Hierarchy (Sections 56–64)

* **Empty Canvas:** Paste, Add > (Element, Layout, Section, Component), Import, Zoom to Fit, Grid/Guides.
* **Element Selected:** Cut, Copy, Duplicate, Delete, Select Layer > (Parent, Children), Group, Frame Selection, Create Component, Arrange > (Bring Front, Send Back), Align >, Add Motion, Add Effect.
* **Section Selected:** Move Up, Move Down, Insert Section Above, Insert Section Below, Duplicate, Delete, Save to Library, Convert to Component.
* **Overlapping Layers Disambiguation (Section 64):** When multiple layers intersect the pointer position, a "Select Layer >" flyout lists the exact visual hierarchy, enabling precise selection of covered elements.
