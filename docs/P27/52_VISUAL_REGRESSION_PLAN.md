# 🪐 OrbitoX Studio 3.0 — Visual Regression Test Plan
**Document ID:** `docs/P27/52_VISUAL_REGRESSION_PLAN.md`  
**Status:** IMPLEMENTATION PLANNING (PHASE 0)  

---

## 1. Pixel-Level Regression Strategy (Section 11)

Tests must capture and compare actual rendered pixels, layout geometry, colors, typography, borders, and shadows before and after changes:

### Test Surfaces:
1. **Editor Chrome:** TopBar, Left Rail, Drawer Panels, Right Inspector.
2. **Canvas Selection:** Transform handles, bounding boxes, distance badges, smart guides.
3. **Document Artboard:** Full section layouts across Desktop (1440px), Tablet (834px), and Mobile (390px).

---

## 2. Thresholds & Automated Baseline

* **Image Diff Engine:** Playwright built-in visual comparison (`expect(page).toHaveScreenshot()`).
* **Pixel Tolerance:** Maximum `0.05%` pixel difference allowed for anti-aliasing variations.
* **Deterministic Environment:** Fixed 1440×900 viewport, system font fallback disabled, animations frozen via `page.evaluate(() => document.body.classList.add('reduce-motion'))`.
