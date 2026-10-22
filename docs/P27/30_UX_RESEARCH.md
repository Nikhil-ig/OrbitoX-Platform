# 🪐 OrbitoX Studio 3.0 — Industry UX Research & Benchmarks
**Document ID:** `docs/P27/30_UX_RESEARCH.md`  
**Status:** ARCHITECTURAL SPECIFICATION (PHASE 0)  

---

## 1. Benchmarking World-Class Creative Platforms

To achieve the vision set out in Section 133 of the mandate, OrbitoX combines the best ergonomic paradigms from industry leaders into an original, unified creation experience:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ORBITOX SYNTHESIS OF CREATIVE PARADIGMS                  │
│                                                                             │
│  Figma:       Direct pointer manipulation, 8-handle scaling, rotation stems │
│  Canva:       Zero-barrier drag-and-drop ingestion, visual magic, simplicity│
│  Framer:      Interactive web layout, smooth auto-layout, spring animations │
│  Webflow:     Semantic box model, structured CSS hierarchy, breakpoints     │
│  Shopify:     Section-and-block page composing, add/remove/reorder flow     │
│  WordPress:   Modular block patterns, global styles (theme.json)            │
│  Spline:      Spatial 3D interactivity, lighting, spatial coordinates       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Direct Manipulation Invariants

1. **Topmost Leaf Selection:** Clicking selects the topmost visual leaf node. The user should never have to manually click through five parent containers to change a button label.
2. **Double-Click Drill-Down:** Clicking a component instance selects the instance. Double-clicking enters the component and selects the clicked internal child.
3. **Escape Key Unwinding:** Hitting `Escape` walks the selection upward to the parent container:
   `Text -> Button -> Stack -> Frame -> Section -> Page`.
4. **Zero-Event Overlays:** The selection bounding box must NEVER intercept pointer events meant for child nodes. Transform handles alone intercept resize gestures.
