# 🪐 OrbitoX Studio 3.0 — Color System Forensic Audit
**Document ID:** `docs/P27/14_COLOR_SYSTEM_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Color Representation Disparities

Colors in the current codebase are represented inconsistently across multiple incompatible formats:
1. **Raw String Literals:** Hex (`#3B82F6`), RGB (`rgb(59, 130, 246)`), RGBA (`rgba(59, 130, 246, 0.5)`).
2. **ColorValue Objects:**
   * `{ type: 'solid', value: '#3B82F6' }`
   * `{ type: 'token', tokenPath: 'colors.primary' }`
   * `{ type: 'gradient', gradient: { type: 'linear', angle: 90, stops: [...] } }`
3. **Tailwind Class Names:** `text-amber-500`, `bg-slate-900` (which fail to compile).

---

## 2. Invalidation and Resolution Failures (Issue #10)

* **Gradient Parsing Fragility:**
  In `StyleResolver.resolveColor`, if a gradient object lacks `stops` or contains stops without `color` or `position`, `resolveColor` returns `undefined` without a safe fallback, causing the background to render completely transparent.
* **Alpha Channel Loss:**
  When converting colors in the color picker, transparency values (`alpha`) are frequently discarded or converted to solid `#FFFFFF` or `#000000`.
* **Dark Mode & Contrast Inversion:**
  Document colors lack semantic light/dark token mappings. Applying a dark preset to a template with hardcoded black text nodes makes text invisible against the dark background.
