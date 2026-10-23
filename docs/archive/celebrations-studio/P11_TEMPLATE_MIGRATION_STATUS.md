# OrbitoX Celebrations — P11 Template Migration Status
**Document ID:** `docs/P11_TEMPLATE_MIGRATION_STATUS.md`  
**Phase:** P11 — Static Template Migration + Graph-Native Render Truth  
**Date:** 2026-09-29  
**Target:** Visual Authoring Engine & Guest Experience Convergence  

---

## 1. Migration Strategy Overview

The platform uses a three-tier rendering strategy:
- **`LEGACY`**: Pre-existing monolithic or modular static React TSX components (`CelestialSoulsScene.tsx`, `AmalfiRivieraExperience.tsx`). Maintained as reference renderers and fallback targets.
- **`HYBRID`**: SceneGraph controls container layout, responsive overrides, ordering, position, size, and data bindings; specialized interactive logic (astrolabe escapements, procedural galaxy maps, Web Audio chiming parallax cards) is delegated to typed **Smart Components** (`CelestialCountdownClock`, `CelestialConstellationMap`, `CelestialParallaxPortrait`).
- **`GRAPH_NATIVE`**: SceneGraph is the 100% authoritative visual definition. Rendered exclusively through `SceneGraphRenderer` via `UnifiedSceneRenderer`. Static TSX is completely bypassed at runtime.

---

## 2. Template-by-Template Status Breakdown

### 1. Celestial Odyssey (`celestial-odyssey`)
- **Total Scenes:** 8 scenes
- **Graph-Native Scenes:** 3 (`scene_souls`, `scene_constellation`, `scene_countdown`)
- **Hybrid Scenes:** 0
- **Legacy Scenes:** 5 (`scene_arrival`, `scene_gathering`, `scene_attendance`, `scene_blessings`, `scene_departure`)
- **Authoritative Engine:** Graph-first with fallback to legacy if `renderMode: 'legacy'` is explicitly configured.

#### Detailed Scene Status Table
| Scene ID | Scene Title | Rendering Strategy | Source of Truth | Active Runtime Renderer | Fallback / Reference | Migration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `scene_arrival` | Arrival & Cosmic Gateway | `LEGACY` | Static TSX | `CelestialArrivalScene.tsx` | N/A | Preserved |
| `scene_souls` | The Astral Souls | `GRAPH_NATIVE` | **SceneGraph (`CelestialSoulsGraph.ts`)** | **`UnifiedSceneRenderer` (`SceneGraphRenderer`)** | `CelestialSoulsScene.tsx` | **MIGRATED & VERIFIED** |
| `scene_constellation` | Constellation of Our Story | `GRAPH_NATIVE` | **SceneGraph (`CelestialConstellationGraph.ts`)** | **`UnifiedSceneRenderer` (`SceneGraphRenderer`)** | `CelestialConstellationScene.tsx` | **MIGRATED & VERIFIED** |
| `scene_countdown` | Celestial Astrolabe Countdown | `GRAPH_NATIVE` | **SceneGraph (`CelestialCountdownGraph.ts`)** | **`UnifiedSceneRenderer` (`SceneGraphRenderer`)** | `CelestialClockScene.tsx` | **MIGRATED & VERIFIED** |
| `scene_gathering` | The Gathering (Sanctuary) | `LEGACY` | Static TSX | `CelestialGatheringScene.tsx` | N/A | Preserved |
| `scene_attendance` | Attendance (RSVP) | `LEGACY` | Static TSX | `CelestialRsvpScene.tsx` | N/A | Preserved |
| `scene_blessings` | Blessings & Guestbook | `LEGACY` | Static TSX | `CelestialBlessingsScene.tsx` | N/A | Preserved |
| `scene_departure` | Departure | `LEGACY` | Static TSX | `CelestialDepartureScene.tsx` | N/A | Preserved |

---

### 2. Legacy Templates Catalog (Preserved Reference Renderers)

All remaining 8 flagship templates remain fully operational in `LEGACY` mode. They serve as deterministic baselines for future scene extraction blueprints.

| Template Slug | Universe Name | File Reference | Size | Strategy | Migration Target Phase |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `celestial-parallax` | Celestial Parallax | `CelestialParallaxExperience.tsx` | 108 KB | `LEGACY` | P13 |
| `royal-regalia` | Royal Regalia | `RoyalRegaliaExperience.tsx` | 81 KB | `LEGACY` | P13 |
| `surreal-organimo` | Surreal Organimo | `SurrealOrganimoExperience.tsx` | 88 KB | `LEGACY` | P14 |
| `romantic-doors` | Romantic Doors | `RomanticDoorsExperience.tsx` | 66 KB | `LEGACY` | P14 |
| `amalfi-riviera` | Amalfi Riviera | `AmalfiRivieraExperience.tsx` | 41 KB | `LEGACY` | P14 |
| `enchanted-glasshouse` | Enchanted Glasshouse | `EnchantedGlasshouseExperience.tsx` | 41 KB | `LEGACY` | P15 |
| `party-nocturne` | Party Nocturne | `PartyNocturneExperience.tsx` | 30 KB | `LEGACY` | P15 |
| `minimal-editorial` | Minimal Editorial | `MinimalEditorialExperience.tsx` | 28 KB | `LEGACY` | P15 |

---

## 3. Migration Workflow & Admin Approval Pipeline

The migration pipeline follows a deterministic 5-step validation gate:
1. **Extraction**: Static TSX scene inspected; DOM elements mapped to semantic nodes, primitives, and smart components in a deterministic TypeScript blueprint.
2. **Draft Preview**: Template Studio loads the blueprint into the canvas using `CanvasWorkspace` and `SceneGraphRenderer`.
3. **Parity Check**: Visual diff view compares the legacy output with the graph output.
4. **Authoritative Switch**: Scene's `renderMode` is set to `'graph'` in schema and saved drafts.
5. **Runtime Verification**: Guest renderer immediately routes requests to `UnifiedSceneRenderer`.
