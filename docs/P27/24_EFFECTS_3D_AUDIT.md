# 🪐 OrbitoX Studio 3.0 — Effects & 3D Forensic Audit
**Document ID:** `docs/P27/24_EFFECTS_3D_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Effects Pipeline

* **CSS Filters:** Evaluated in `StyleResolver.ts:220–240` (blur, brightness, contrast, saturate, grayscale, hue-rotate, invert, sepia, backdropBlur).
* **Deficiencies:**
  * No visual preview thumbnail of presets (Glass, Aurora, Liquid, Glow, Neon).
  * Backdrop blur requires specific parent background opacities; when applied to opaque containers, the effect is completely invisible with no explanation to the creator.

---

## 2. 3D & Spatial Subsystem

* Implemented in `ThreeDWorkspace.tsx` and `ThreeDInspector.tsx` using Three.js (`three: ^0.186.1`).
* **Deficiencies:**
  1. **Bundle Cost on 2D Projects:** Three.js is imported in bundle chunks that load even when creating a simple flat portfolio or blog, degrading initial page load times.
  2. **Canvas Context Loss:** Switching between 2D Build mode and 3D mode recreates the WebGL renderer without caching geometry or texture buffers, leading to memory leaks and WebGL context loss errors on mobile devices.
  3. **No Embedded 3D Canvas Nodes:** 3D is treated as an isolated full-screen mode rather than allowing interactive 3D viewports (e.g. Spline-like embeds) embedded directly inside regular page sections.
