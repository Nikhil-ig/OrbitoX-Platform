# 🪐 OrbitoX Studio 3.0 — Motion & Interaction Forensic Audit
**Document ID:** `docs/P27/23_MOTION_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Existing Motion Runtime Analysis

* Implemented in `SceneGraphRenderer.tsx` (`MotionRuntimeNode`) using the Web Animations API (WAAPI).
* Parallax depth planes (`depthPlane: -5 to +5`) use a custom CSS variable `--scroll-y` with `calc(var(--scroll-y, 0px) * factor)`.

---

## 2. Forensic Deficiencies Identified

1. **Scroll Event Performance Lag:**
   In `SceneGraphRenderer.tsx:78`:
   `el.addEventListener('scroll', updateScrollY, { passive: true })`
   Directly updates `el.style.setProperty('--scroll-y', ...)` on every scroll tick on the main thread, causing frame drops during rapid scrolling.
2. **Missing Scrubbable Keyframe Timeline:**
   There is no dockable visual timeline editor with playhead, tracks, easing curves, or spring physics controls.
3. **Trigger-Action Disconnect:**
   Interaction triggers (Hover, Click, In-View) in `InteractionsPanel.tsx` do not reliably execute actions in the canvas because canvas click events are captured by selection handlers.
