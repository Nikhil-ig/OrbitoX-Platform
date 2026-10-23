# 🪐 OrbitoX Studio 3.0 — Comprehensive Test Plan
**Document ID:** `docs/P27/51_TEST_PLAN.md`  
**Status:** IMPLEMENTATION PLANNING (PHASE 0)  

---

## 1. Five-Tier Verification Methodology (Section 110)

To permanently prevent false-positive reports, all future test suites must span five discrete levels of verification:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FIVE-TIER VERIFICATION MODEL                          │
│                                                                             │
│  Level 1: Pure Unit Tests         (Command reducers, IR normalizers, AST)   │
│  Level 2: Integration Tests       (Controller -> Store -> StyleResolver)    │
│  Level 3: Headless Browser Tests  (Real DOM pointer events, keyboard, focus)│
│  Level 4: Visual Pixel Tests      (Playwright screenshot diffs, computed CSS│
│  Level 5: Published Runtime Tests (Real public guest URL, SSR, hydration)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Prohibition of Controller Bypasses

**STRICT RULE:** E2E Playwright tests are FORBIDDEN from calling `window.__studioController.updateNodeProperty()` or mutating internal store state to simulate user actions.
* Tests MUST use `page.click()`, `page.fill()`, `page.mouse.move()`, `page.mouse.down()`, and `page.keyboard.press()`.
* Tests MUST verify that rendered DOM computed styles (`window.getComputedStyle(el)`) and pixel positions match expected output.
