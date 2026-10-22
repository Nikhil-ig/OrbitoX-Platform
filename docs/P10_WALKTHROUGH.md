# 🪐 OrbitoX Celebrations: P10 Professional Visual Authoring Engine Walkthrough

> **System Version:** `@orbitox-io/celebrations` v1.4.0 • **Pipeline Status:** Verified `15/15 PASS` • **Architecture:** Zero-Code Graph-Native Visual Composition

---

## 1. Executive Summary & Paradigm Shift

The fundamental requirement of **P10** is transitioning OrbitoX Celebrations from a **"Configurable Template"** (schema fields driving fixed React JSX parameters) to a **"Visual Authoring Engine"** (an open scene graph where designers freely manipulate geometry, hierarchies, Auto Layout, and freeform layers with instantaneous deterministic propagation to the Guest View without touching code).

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                               PREVIOUS STATE (P0–P3)                              ║
║  Inspector Fields ───► JSON Props ───► Hardcoded JSX Scenes (Rigid Structure)     ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                  PHASE 10 ENGINE                                  ║
║  Visual Inspector ───► Store Reducer ──► Scene Graph ──► Resolver ──► Renderer   ║
║  (Freeform/Auto)       (Immutable)       (Nodes Tree)    (Tokens)    (Guest View) ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Core Architectural Pillars Implemented

### A. Graph-Native Scene Architecture
Three flagship scenes of the *Celestial Odyssey* template have been converted into pure, declarative scene graphs:

1. **[CelestialSoulsGraph.ts](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/engine/CelestialSoulsGraph.ts)**
   - **Hierarchy**: `root_souls` → `bg_atmosphere`, `content_group` (`eyebrow`, `name_a`, `ampersand`, `name_b`, `union_dec`), `portrait_group` (`portrait_a`, `portrait_b`), `vows_group` (`vow_a`, `vow_b`).
   - **Visual Capabilities**: Dual interactive portraits with rotation (`-4°` / `+5°`), drop shadows, z-index elevation, responsive stacking (`mobile: position: 'flow'`), and dynamic data bindings (`celebrants[0].portrait`, `celebrants[1].portrait`, `unionDeclaration`).

2. **[CelestialConstellationGraph.ts](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/engine/CelestialConstellationGraph.ts)**
   - **Hierarchy**: `root_constellation` → `bg_starfield`, `astro_grid`, `cosmic_beam`, `constellation_header` (`const_eyebrow`, `const_quote`, `const_body`), `milestones_cluster` (`star_m1`–`star_m4`).
   - **Visual Capabilities**: Astronomical SVG grid, dynamic star coordinates, interactive glowing nodes, and responsive scale overrides.

3. **[CelestialCountdownGraph.ts](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/engine/CelestialCountdownGraph.ts)**
   - **Hierarchy**: `root_countdown` → `bg_space_dust`, `orbit_outer_ring`, `orbit_inner_ring`, `countdown_header` (`cd_eyebrow`, `cd_title`, `cd_date_proclamation`), `astrolabe_clock_container` (`clock_days`, `clock_hours`, `clock_minutes`, `clock_seconds`), `calendar_cta_wrap`.
   - **Visual Capabilities**: Multi-ring concentric astrolabe orbit rings, flexible countdown dials with Auto Layout (flex/grid/stack), and calendar action triggers.

---

### B. Coexistence of Auto Layout & Freeform Canvas

The engine solves the classic tension between structured layouts and artistic freedom:

| Mode | Coordinate Model | Inspector Controls | Use Cases |
| :--- | :--- | :--- | :--- |
| **Freeform Canvas** | Absolute `(x, y, zIndex, rotation, scale)` | Drag bounds, angle degree wheel, z-index stacker | Overlapping partner portraits, artistic stamps, badges, offset quotes |
| **Auto Layout (Flex/Stack)** | CSS Flexbox with gap, align, padding | Direction (`horizontal`, `vertical`, `wrap`), gap (`px`), padding (`top/right/bottom/left`) | Header metadata, vow cards, contextual navigation |
| **Auto Layout (Grid)** | CSS Grid with explicit columns & gap | Columns (`1–12` / `auto-fit`), column width, gap (`px`), alignment | Astrolabe countdown dials, milestone star clusters, photo galleries |

---

### C. Precision Inspector Controls & Source Explainability

Located in **[TemplateStudioInspector.tsx](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/components/TemplateStudioInspector.tsx)**:

1. **Scene Graph Explorer**: Full visual tree showing parents, children, locks, and visibility toggles.
2. **Transform Palette**: Precision sliders and numeric inputs for:
   - `Position X / Y` (`px`, `%`, `vw`, `vh`)
   - `Size Width / Height` (`px`, `%`, `auto`, `fill`)
   - `Rotation` (`-180°` to `+180°`)
   - `Scale` (`0.1x` to `3.0x`)
   - `Z-Index` (`0` to `100`)
   - `Opacity` (`0%` to `100%`)
3. **One-Click Composition Presets**:
   - **Editorial Asymmetric**: Overlapping rotated portraits (`-6°` / `+6°`) with offset margins.
   - **Centered Stage**: Symmetrical stacked layout for formal celebrations.
   - **Split Dual Column**: Side-by-side balanced columns.
   - **Overlapping Intimate**: High-overlap z-indexed composition.
4. **Source Explainability Badges**:
   - `[Token]`: Property bound to centralized design tokens (e.g., `colors.accentPrimary`).
   - `[Binding]`: Property bound to dynamic celebration customer data (e.g., `celebrants[0].name`).
   - `[Responsive Override]`: Value specifically overridden for `mobile` or `tablet`.
   - `[Local]`: Explicit scene graph node styling.

---

### D. Snapshot Resolution & Live Experience Forwarding

1. **[TemplateEditorResolver.ts](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/engine/TemplateEditorResolver.ts)**:
   Extracts `draft.scenes[].sceneGraph` and maps them into `CelebrationState.sceneGraphs`.
2. **[StudioData.ts](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio/StudioData.ts)**:
   `buildLiveExperience()` automatically passes `sceneGraph` into:
   - Section `sec_couple_profile` (`scene_souls`)
   - Section `sec_story` (`scene_constellation`)
   - Section `sec_countdown` (`scene_countdown`)
3. **[CelestialOdysseyExperience.tsx](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/renderer/templates/celestial-odyssey/CelestialOdysseyExperience.tsx)**:
   Passes `sceneGraph` prop to scenes.
4. **Graph-Native Scene Execution**:
   [CelestialSoulsScene.tsx](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/renderer/templates/celestial-odyssey/scenes/CelestialSoulsScene.tsx), [CelestialConstellationScene.tsx](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/renderer/templates/celestial-odyssey/scenes/CelestialConstellationScene.tsx), and [CelestialClockScene.tsx](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/renderer/templates/celestial-odyssey/scenes/CelestialClockScene.tsx) dynamically branch to **[SceneGraphRenderer.tsx](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/renderer/SceneGraphRenderer.tsx)** when `sceneGraph` is present.

---

## 3. Automated Verification Test Suite (15/15 PASS)

All verification tests run deterministically via **[verify-pipeline/route.ts](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/app/api/verify-pipeline/route.ts)**:

```bash
curl -s http://localhost:3010/api/verify-pipeline | jq
```

### Test Results Breakdown

| Phase | Test Name | Result | Details |
| :---: | :--- | :---: | :--- |
| **P0** | Content Field Schema Bindings Registered | **PASS** | 39 fields registered, 0 missing |
| **P0** | Design Tokens & Palette Snapshot Propagation | **PASS** | Accent primary token propagation verified |
| **P0** | Module Toggles Through Resolver & Live Experience | **PASS** | RSVP & Guestbook modules toggleable |
| **P1** | Media Slot Authoring (Focal Points, Shapes, Overlays) | **PASS** | Arch, circle, and editorial shapes verified |
| **P2** | Desktop Layout Composition & Motion Config Resolution | **PASS** | Editorial layout & cinematic motion verified |
| **P2** | Responsive Device Breakpoint Override Resolution | **PASS** | Mobile centered override resolved cleanly |
| **P2** | Live Experience Sections Receive Layout & Motion | **PASS** | All sections receive configured props |
| **P3** | Interaction Authoring & Snapshot Resolver Propagation | **PASS** | Custom portal jump & transitions verified |
| **P3** | Live Experience Sections Receive Scene Interactions | **PASS** | Interactions bound to interactive layers |
| **P2** | React Component Instantiation (7 Scenes + Root) | **PASS** | All 7 scenes instantiate with zero runtime errors |
| **P10** | **P10-1: Graph-Native Scene Graphs Registered in Schema** | **PASS** | Souls (14 nodes), Constellation (13 nodes), Countdown (14 nodes) |
| **P10** | **P10-2: Precision Transforms & Auto Layout in Store Reducer** | **PASS** | `portrait_a` (140, 90, -7°), dials grid mode, inserted stardust frame |
| **P10** | **P10-3: Snapshot Resolver Propagation of Mutated Graphs** | **PASS** | Resolver propagates geometry, rotations, and grid layouts |
| **P10** | **P10-4: Live Experience & Component Forwarding** | **PASS** | All 3 scenes receive live graphs and instantiate cleanly |
| **P10** | **P10-5: Responsive Overrides & Source Explainability** | **PASS** | Mobile overrides, token bindings, and local styles explained |

---

## 4. Verification Checkpoints

1. **Type Safety**:
   - `npx tsc --noEmit` in `orbitox/apps/celebrations`: **0 Errors**
2. **HTTP Endpoints**:
   - Studio Editor: `http://localhost:3010/admin/templates/celestial-odyssey` (`HTTP 200 OK`)
   - Guest Experience: `http://localhost:3010/e/odyssey-wedding-vikram-ananya?template=celestial-odyssey` (`HTTP 200 OK`)
   - Pipeline Verification: `http://localhost:3010/api/verify-pipeline` (`HTTP 200 OK`, `15/15 PASS`)
