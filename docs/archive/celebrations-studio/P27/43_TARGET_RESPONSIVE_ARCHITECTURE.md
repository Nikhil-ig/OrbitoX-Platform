# 🪐 OrbitoX Studio 3.0 — Target Responsive Architecture
**Document ID:** `docs/P27/43_TARGET_RESPONSIVE_ARCHITECTURE.md`  
**Status:** TARGET ARCHITECTURE SPECIFICATION (PHASE 0)  

---

## 1. Cascading Breakpoint Cascade (Section 79)

The responsive system follows a desktop-first inheritance cascade:
`Desktop (Base: 1280px+) ──► Tablet (768px–1279px) ──► Mobile (< 768px)`

* Properties defined on Desktop cascade automatically to Tablet and Mobile.
* Overrides set on Tablet cascade down to Mobile.
* Overrides set on Mobile stay strictly on Mobile.

---

## 2. Visual Inheritance Indicators in Inspector

Every property field in the inspector displays its responsive status:
* **Blue dot / Accent label:** Locally customized override for the current breakpoint.
* **Gray label / Inherited icon:** Inherited from the parent breakpoint.
* **Hover Affordance ("Reset to Inherited"):** Clicking the indicator clears the override and restores active inheritance from Desktop immediately.
