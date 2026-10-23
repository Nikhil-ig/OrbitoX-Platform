# 🪐 OrbitoX Studio 3.0 — UI Architecture Audit
**Document ID:** `docs/P27/04_UI_ARCHITECTURE_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Top-Level Layout & Chrome Analysis

The Visual Studio chrome is structured in `StudioShell.tsx`:
* **Top Bar (`TopBar.tsx`):** Displays template title, mode switcher (Build, Style, Motion, Prototype, 3D), viewport switcher (Desktop, Tablet, Mobile), undo/redo, preview, and publish buttons.
* **Left Rail (`LeftRail.tsx`):** Fixed 56px icon rail providing access to Add, Layers, Pages, Assets, Components, Templates, Styles, and Data drawers.
* **Tool Drawer:** 280px–340px slide-out drawer hosting the active rail tab's panel.
* **Center Canvas Workspace (`CanvasWorkspace.tsx`):** Infinite pan/zoom artboard surrounded by viewport boundaries.
* **Right Inspector (`InspectorHost.tsx`):** 310px contextual panel that mounts different inspector types based on the selected object.

---

## 2. Forensic Discovery: Dead Component Islands

A critical discovery of this forensic audit is that **thousands of lines of production UI code are dead, unmounted islands**:

### A. The Dead `PropertiesPanel.tsx` Island (2,819 lines)
* **Location:** `orbitox/apps/celebrations/components/template-studio/panels/PropertiesPanel.tsx`
* **Status:** DEAD / UNMOUNTED.
* **Evidence:** In `StudioShell.tsx`, the right sidebar mounts `InspectorHost.tsx` from `./inspectors`. All recent property controls, sliders, and features added to `PropertiesPanel.tsx` are completely invisible in the live application! Developers and past sessions were updating a file that is never rendered!

### B. The Dead `LayersPanel.tsx` Island (532 lines)
* **Location:** `orbitox/apps/celebrations/components/studio-zero/LayersPanel.tsx`
* **Status:** DEAD / UNMOUNTED.
* **Evidence:** When the user clicks the "layers" tab on the left rail (`activeRailTab === 'layers'`), `StudioShell.tsx:1002` mounts `PageTreePanel.tsx` from `./navigation/PageTreePanel`. `LayersPanel.tsx` (which had complete search, node kind icons, and reordering) is never mounted!

---

## 3. UI Inconsistencies & Visual Bugs

1. **Uncompiled Tailwind Classes in Inspector:**
   `BoxModelControl.tsx` and various inspector controls use utility classes like `bg-slate-900/90`, `border-slate-800`, `flex`, and `text-slate-400`. Because Tailwind is not installed in `apps/celebrations`, these controls render unstyled with browser default white/transparent backgrounds and unaligned elements.

2. **Cluttered Left Drawers:**
   The Template drawer displays raw metadata (e.g. `tmpl_saas_nextgen`, scene counts, category pills) and dense technical cards rather than rich, visual, live preview cards.

3. **Missing Neutral Chrome Separation:**
   Document themes (e.g., Celestial Gold, Dark Neon) leak CSS variables into editor chrome, causing buttons and text inputs in the inspector to inherit website styles rather than maintaining a neutral, professional dark studio theme.
