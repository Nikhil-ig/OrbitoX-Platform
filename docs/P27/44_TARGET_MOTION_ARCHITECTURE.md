# 🪐 OrbitoX Studio 3.0 — Target Motion Architecture
**Document ID:** `docs/P27/44_TARGET_MOTION_ARCHITECTURE.md`  
**Status:** TARGET ARCHITECTURE SPECIFICATION (PHASE 0)  

---

## 1. Hybrid Animation Runtime (WAAPI + GSAP)

To balance performance with expressive control:
* **Declarative WAAPI (Web Animations API):** Used for micro-interactions, hover effects, fades, and scale transitions. Runs off the main thread at hardware 60/120 FPS.
* **GSAP / ScrollTrigger Engine:** Used for scrubbed parallax sequences, pinning sections, camera travel, and complex multi-node timelines.

---

## 2. Visual Timeline Workspace (Section 80)

When switching to Motion mode:
* A dockable timeline panel opens at the bottom of the canvas.
* Tracks represent nodes, with keyframes for opacity, transform, and blur.
* Playhead allows real-time scrubbing across scroll offsets or time seconds.
* Built-in easing curves (linear, ease-out-quad, spring physics, bezier).
