# 🪐 OrbitoX Studio 3.0 — P27 Total Creative Editor Reconstruction Plan
**Document ID:** `docs/P27/P27_RECONSTRUCTION_EXECUTION_PLAN.md`  
**Execution Target:** OrbitoX Visual Studio (`orbitox/apps/celebrations/components/studio-zero/`)  
**Status:** APPROVED FOR EXECUTION  

---

## 1. Executive Directive

Rebuild the creative authoring experience of OrbitoX Studio around genuine direct manipulation, professional chrome aesthetics, real telemetry, contextual section styling, and zero visual voids or overlapping toolbars.

---

## 2. Targeted Defects & Surgical Resolutions

### A. Studio Chrome & Top Bar Polish
- **Defect:** `Templates` button has an aggressive bright blue background/border that breaks chrome visual hierarchy; `Style` in segmented mode switcher opens left drawer rather than changing workspace mode; top bar and status bar display hardcoded fabricated metrics (`100% Optimal`, `60 FPS`).
- **Fix in `StudioTopBar.tsx` & `StudioShell.tsx`:**
  - Modernize `Templates` button with subtle neutral styling (`background: rgba(255,255,255,0.06)`, `border: 1px solid rgba(255,255,255,0.12)`, `color: #E5E7EB`).
  - Decouple `Style` mode from drawer manipulation. Give `Style` mode dedicated design tokens/theme focus.
  - Replace hardcoded formula with genuine calculated metrics: real node count, measured asset payload, and real requestAnimationFrame performance measurement.

### B. Canvas Section Toolbar Overlap
- **Defect:** Section floating toolbar (`:: 1. Hero & Product Preview | ↑ ↓ [copy] [variant] [trash]`) is positioned at `top: 8px, left: 8px` directly inside the section, sitting on top of the section's top content (e.g. Hero badge element) and blocking creative editing.
- **Fix in `CanvasWorkspace.tsx`:**
  - Reposition the section toolbar to an external gutter or a discreet, sleek section header handle (`top: -28px` or on hover in the gutter) that never obstructs canvas artwork or content margins.
  - Maintain quick actions (`↑`, `↓`, `Duplicate`, `Variant`, `Delete`) accessible without obstructing content.

### C. Right Inspector Void & Section Inspector Rebuild
- **Defect:** `SectionInspector.tsx` only renders Section Name, Anchor, Remix button, and Transition preset, leaving over 60% of the inspector height as an empty black void. It lacks essential section styling controls.
- **Fix in `SectionInspector.tsx`:**
  - **Section Background Controls:** Color picker, gradient presets, opacity, and background overlay style.
  - **Section Box Model & Geometry:** Padding Top/Bottom scrubbers, minimum height input (`minHeight: 100vh`, `800px`, `auto`), and max-width container options (`1440px`, `1200px`, `full`).
  - **Section Layout & Alignment:** Content flow (Column/Row), content alignment (Center, Start, End), and gap controls.
  - **Responsive Visibility:** Breakpoint visibility toggles (Desktop, Tablet, Mobile).
  - Completely eliminate the empty dark void with organized, professional collapsible groups.

### D. Box Model & Typography Controls
- **Defect:** Box model inputs can fail to parse complex units or cause flexbox layout collapses; font selection needs rock-solid Google Fonts stylesheet injection.
- **Fix in `BoxModelControl.tsx`, `VisualBoxModel.tsx`, and `StudioShell.tsx`:**
  - Ensure unit normalization (px, %, rem, auto).
  - Guarantee dynamic `@font-face` links are actively injected into the document `<head>` on font family change.

---

## 3. Step-by-Step Implementation Sequence

1. **Step 1 (Top Bar & Telemetry):**
   - Update `StudioTopBar.tsx`: Clean up button styling, refine Templates button, update mode switcher.
   - Update `StudioShell.tsx`: Fix `handleModeChange` so `style` mode switches mode cleanly; replace fabricated score with genuine node/asset telemetry.
2. **Step 2 (Section Toolbar Relocation):**
   - Update `CanvasWorkspace.tsx`: Move the section action toolbar out of the content area (`top: -24px` outside the section artboard or subtle floating gutter pill) so content at `top: 8px, left: 8px` is 100% unobstructed.
3. **Step 3 (Section Inspector Complete Rebuild):**
   - Rebuild `SectionInspector.tsx`: Implement Background, Dimensions & Spacing, Layout, and Responsive Visibility controls.
4. **Step 4 (Automated E2E Testing & Pixel Verification):**
   - Run Playwright test suite against `http://localhost:3010`.
   - Take diagnostic screenshot to verify new UI appearance, absence of toolbar overlap, and elimination of the inspector void.
