# 🪐 OrbitoX Studio 3.0 — Inspector Forensic Audit
**Document ID:** `docs/P27/11_INSPECTOR_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Architectural Bifurcation: Two Competing Inspectors

The codebase contains two completely separate property inspector systems:

| Inspector Component | File Path | Line Count | Mounted in StudioShell? |
| :--- | :--- | :--- | :--- |
| **`PropertiesPanel.tsx`** | `components/template-studio/panels/PropertiesPanel.tsx` | 2,819 lines | **NO (Dead Island)** |
| **`InspectorHost.tsx`** | `components/studio-zero/inspectors/InspectorHost.tsx` | 337 lines | **YES (Active)** |

### Analysis of the Dead Island:
* `PropertiesPanel.tsx` contains extensive implementations for color pickers, typography scales, layout modes, borders, shadows, and animation bindings.
* However, `StudioShell.tsx:38` imports and mounts `InspectorHost.tsx` instead.
* Any controls added or debugged in `PropertiesPanel.tsx` during previous phases never appeared in the running application!

---

## 2. Flaws in Active `InspectorHost.tsx` & Child Inspectors

### A. Broken Box Model Scrubbing (Issue #24)
* `BoxModelControl.tsx` provides mouse scrubbing for margins and paddings.
* However, `BoxModelControl` relies entirely on uncompiled Tailwind utility classes (`bg-slate-900`, `flex`, `p-3`). The entire control renders unstyled.
* Furthermore, scrubbing calls `onUpdateStyle(nodeId, { paddingTop: val })`. If the selected node is an image, button, or custom component whose adapter hardcodes internal padding or uses flex properties directly, the updated style key has no visual effect.

### B. Broken Corner Radius Semantics (Issue #25)
* `CornerRadiusControl.tsx` offers linked and unlinked corner controls.
* When linked, it updates `style.border.radius = { all: val }` or `style.borderRadius = val`.
* However, in `StyleResolver.ts` line 195:
  `const rawRadius = style.border?.radius ?? (style as any).borderRadius;`
  If `rawRadius` is an object with `all` as a number without `px` units, some SVG or canvas adapters fail to parse it, causing borders to render square.

### C. Generic Text Inputs Instead of Smart Controls (Issue #71)
* Gradients, shadows, and backdrop blurs are presented as plain text inputs where users must manually type complex CSS strings like `drop-shadow(0 4px 6px rgba(0,0,0,0.3))` or `linear-gradient(135deg, #111, #444)`.
* Typing errors cause silent styling failures with no validation or visual feedback.
