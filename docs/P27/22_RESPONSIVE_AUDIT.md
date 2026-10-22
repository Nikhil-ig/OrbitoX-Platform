# 🪐 OrbitoX Studio 3.0 — Responsive Engine Forensic Audit
**Document ID:** `docs/P27/22_RESPONSIVE_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Breakpoint Model & Inheritance

Managed in `StyleResolver.resolveForDevice`:
* Supported breakpoints: `desktop` (base), `desktopSmall`, `tablet`, `mobile`, `mobileLarge`, `mobileSmall`.
* Overrides stored on node: `node.responsive[breakpoint]: { geometry, style }`.

---

## 2. Forensic Deficiencies Identified

1. **Broken Multi-Tier Inheritance Cascade:**
   In `StyleResolver.ts` lines 49–60:
   * When `device === 'mobile'`, it applies `override('tablet')` followed by `override('mobile')`.
   * However, if a user overrides a property on Mobile and then changes a DIFFERENT property on Desktop, the Mobile view does not reliably inherit the unmodified Desktop properties due to shallow merging.
2. **Missing Inheritance Visual Indicators in Inspector:**
   The property inspector does not indicate whether a property is currently inheriting from Desktop or has been locally customized for Mobile.
3. **No "Reset to Inherited" Affordance:**
   Once a property is changed on Mobile, there is no UI button to clear the override and restore inheritance.
