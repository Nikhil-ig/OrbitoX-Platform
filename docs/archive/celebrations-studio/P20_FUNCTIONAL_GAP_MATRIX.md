# 🪐 OrbitoX Studio — P20 Functional Gap Matrix
**Document ID:** `docs/P20_FUNCTIONAL_GAP_MATRIX.md`  
**Phase:** P20 — Phase 0: Forensic Audit & Rebuild Planning  
**Date:** October 3, 2026  
**Auditor:** Principal Architecture & Systems Engineering Team  
**Status:** **AUDIT COMPLETE (AWAITING USER APPROVAL)**

---

## 1. Subsystem Classification Legend

- **WORKING**: Reliable execution path from UI ➔ Action ➔ Command ➔ State ➔ Renderer ➔ Persistence ➔ Live Parity.
- **PARTIAL**: Basic operations function, but edge cases, responsive overrides, or advanced capabilities fail.
- **BROKEN**: Critical regressions prevent intended behavior (e.g. underlying element moving on drag, radius not rendering).
- **MISLEADING**: UI displays an active capability or metric (e.g. "WebGL 60 FPS", "98% Optimal"), but underlying implementation is simulated or disconnected.
- **MISSING**: Crucial capability required by product vision is completely absent from the architecture.

---

## 2. Comprehensive Subsystem Audit Matrix

| Subsystem Area | Current Classification | Stated Capability in UI | Actual Implementation Truth | Target Architecture Resolution |
|---|:---:|---|---|---|
| **Canvas Hit-Testing & Selection** | **BROKEN** | Precise direct-pointer node selection and drag | `document.elementsFromPoint` finds `nid !== nodeId`, causing underlying background/sibling to drag instead of clicked node | Deterministic topmost-leaf hit tester; selection overlay locks drag owner to `selectedNodeId` |
| **Canvas Nested Selection** | **PARTIAL** | Cmd-click deep selection; Escape to parent | Cmd-click leaf selection works; Escape key climbing to parent is missing or inconsistent | Formal selection state machine: Click = component/leaf, Double-Click = dive in, Escape = climb out |
| **Layers Panel Hierarchy** | **BROKEN** | Full document layer tree | Renders only `activeScene.sceneGraph`; completely hides all other sections on the page | Render full Active Page Tree: Page ➔ All Sections in order ➔ All nested children |
| **Layers ↔ Canvas Sync** | **PARTIAL** | Selecting in Layers selects on Canvas; clicking Canvas highlights Layer | Synchronizes selection for active section; fails when selecting nodes in other sections | Canonical selection state (`selectedNodeId`, `selectedSceneId`) with auto-scroll in Layers panel |
| **Box Model (Margin & Padding)** | **BROKEN** | 4-sided interactive margin & padding | Dispatches string shorthands and longhands that clash in `StyleResolver`; layout mode semantics ignored | Visual 4-sided interactive diagram with direct numeric inputs, units (`px`, `rem`, `%`, `auto`), and layout-aware resolver |
| **Corner Radius** | **BROKEN** | Linked & unlinked 4-corner radius sliders | Inspector writes `style.borderRadius: { all: ... }`; `StyleResolver.ts` strictly checks `style.border.radius` | Normalize property schema: `style.borderRadius` with `{ tl, tr, br, bl, linked }` and fallback |
| **Right Inspector Context** | **MISLEADING** | Dedicated inspector per selected object type | When no node is selected, displays "Page Inspector" with section-level controls | Discrete Contextual Inspectors: Page Inspector, Section Inspector, Stack/Grid Inspector, Text, Image, 3D |
| **Site Template Switching** | **MISLEADING** | 10 Archetypes (SaaS, Agency, Hotel, Retail, etc.) | Metadata wrappers around 4 wedding celebration factory functions; content migrator hardcoded to wedding fields | Real blueprint schemas for every archetype with generic non-wedding schema definitions |
| **Template Operations** | **BROKEN** | Non-destructive replacement, adding sections, applying themes | `ADD_SCENE` performs in-place overwrite when section IDs match, silently destroying user work | Distinct atomic commands: `NEW_FROM_TEMPLATE`, `REPLACE_SITE` (with draft snapshot rollback), `INSERT_TEMPLATE_SECTION` |
| **Section Composer & Reorder** | **WORKING** | Move up/down, duplicate, re-keying | `rekeySceneGraph` prevents duplicate node IDs; reorder updates order properties | Maintain existing robust re-keying while enhancing drag-and-drop affordance |
| **Asset File Upload** | **BROKEN** | High-res image/video upload and storage | Base64 strings saved in `localStorage` trigger `QuotaExceededError` (5MB browser limit), crashing save | Real backend upload endpoint returning CDN URL or local IndexedDB blob storage |
| **Asset Drag to Canvas** | **PARTIAL** | Drag image onto canvas to place | Creates image node with absolute dimensions; cannot drop into auto-layout stacks or replace image sources | Smart drop resolver: drop on background = background image, drop on image = replace source, drop in stack = insert node |
| **Component System** | **PARTIAL** | Master, Instance, Detach | Master creation and instance detachment working; slot overrides and variants incomplete | True component definition registry with typed property overrides and variant states |
| **Responsive Art Direction** | **PARTIAL** | Desktop ➔ Tablet ➔ Mobile cascade with overrides | Geometry and style overrides persist; structural changes (hiding/reordering per breakpoint) partially broken | Full responsive model supporting layout direction changes, order swaps, and visibility per breakpoint |
| **Motion Studio & Timeline** | **MISLEADING** | Interactive keyframe timeline & playback | Playhead scrubs a local state number; no connection to canvas node transforms or CSS animations | Integrated Web Animations / GSAP engine driving real node transforms with timeline playhead |
| **Atmospheric Visual Effects** | **PARTIAL** | Parameterized shaders (Glow, Aurora, Film, Glass) | Presets inject basic CSS filters/backdrop-filters; sliders missing or disconnected | Parameterized shader engine with real-time live preview of blur, noise, bloom, and displacement |
| **3D Spatial Computing** | **MISLEADING** | WebGL 60 FPS spatial scene editor | HTML5 2D Canvas drawing 2D wireframe circles via `ctx.ellipse`; insert button adds countdown | True Three.js WebGL scene adapter loaded on-demand; zero WebGL overhead on 2D DOM sites |
| **Performance Health Telemetry** | **MISLEADING** | "98% Optimal", "60 FPS Mobile Target" | Fabricated hardcoded score calculated from static node count heuristics | Real performance measurement using PerformanceObserver (LCP, DOM nodes, memory, CSS weight) |
| **Undo / Redo History** | **PARTIAL** | Multi-level undo/redo via `⌘Z` / `⌘⇧Z` | Command transactions work, but drag operations emit rapid stream of mutations rather than single transaction | Single transactional commit on gesture completion (`BEGIN_TRANSACTION` ➔ `COMMIT_TRANSACTION`) |
| **Published Website Parity** | **WORKING** | Live route `/e/[slug]` renders identical Virtual DOM | Renders `SceneGraphRenderer` synchronously on both SSR and client hydration | Maintain unified renderer architecture; eliminate legacy celebration section fallback |
| **Zero-Trust Multi-Tenancy** | **WORKING** | Tenant-scoped data isolation | `tenantId` enforced across state and export | Maintain strict zero-trust scoping adhering to `AGENTS.md` |
