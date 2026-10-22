# 🪐 OrbitoX Studio 3.0 — Target Add Center Architecture
**Document ID:** `docs/P27/36_TARGET_LIBRARY_ARCHITECTURE.md`  
**Status:** TARGET ARCHITECTURE SPECIFICATION (PHASE 0)  

---

## 1. Unified Add Center (Section 105)

Instead of disparate buttons and isolated modals, creation is consolidated into **One Add Center**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          UNIVERSAL ADD CENTER                               │
│                                                                             │
│  [Search Bar: "Search elements, sections, components... (Cmd+K)"]          │
│                                                                             │
│  [Tabs]                                                                     │
│  ├── Elements:    Text, Heading, Image, Video, Button, Icon, Embed         │
│  ├── Layouts:     Frame, Container, Stack, Grid, Columns, Spacer            │
│  ├── Sections:    Hero, Features, Pricing, Testimonials, CTA, Footer        │
│  ├── Components:  Master Components, Team Library, Marketplace              │
│  ├── Assets:      Images, SVGs, Lottie, Rive, 3D Models                     │
│  └── 3D:          Spatial Scene, Lighting Rig, Camera, 3D Canvas Embed      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Direct Canvas Insertion Semantics

* **Click to Append:** Appends the selected element to the active section or selected container.
* **Drag to Place:** Dragging an item card over the canvas displays an interactive insertion indicator (horizontal line between siblings in a stack, or drop slot in a grid).
* **Auto-Sizing:** Elements dropped into flow containers default to `width: 100%` or `hug`, never overflowing parent boundaries.
