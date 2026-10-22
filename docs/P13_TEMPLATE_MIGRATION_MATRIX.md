# 🪐 OrbitoX Celebrations — P13 Template Migration Matrix
**Document ID:** `docs/P13_TEMPLATE_MIGRATION_MATRIX.md`  
**Phase:** P13 — Template Studio Productization & Legacy-to-Graph Transition  
**Architecture:** Tri-Modal Hybrid/Graph/Legacy Architecture (`@orbitox-io/plugin-engine`)

---

## 1. Migration Architecture & Philosophy

Under **P13 Sections 8, 9, 10, 11, and 55**, existing templates remain production-safe while migrating systematically:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     LEGACY      │  ──►  │     HYBRID      │  ──►  │  GRAPH_NATIVE   │
│ Hardcoded React │       │ Graph Structure │       │ 100% SceneGraph │
│   & Fixed JSX   │       │ + Smart Plugins │       │ + Zero TSX Scene│
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

1. **SceneGraph is Canonical:** For `GRAPH_NATIVE` scenes, the resolved SceneGraph is the single source of truth. There are no conflicting or shadow JSX layouts.
2. **Explicit Hybrid Boundaries:** For `HYBRID` scenes:
   * **SceneGraph owns:** Structure, DOM hierarchy, positioning, responsive overrides, visibility toggles, standard borders/shadows, and layout flow.
   * **Smart Component owns:** Specialized canvas renders, procedural WebGL particle shaders, astrolabe celestial mathematics, or complex internal audio hooks.
   * **No Hidden JSX Layout:** Smart components render inside the bounds determined by their parent graph node.
3. **Safe Migration Tooling:** Admin migration preview displays **Side-by-Side**, **Overlay**, and **Difference Summary** prior to committing production authority.

---

## 2. Complete Catalogue Migration Status

| Template ID | Aesthetic Family | Previous Architecture | P13 Migration Status | Canonical Authority | Smart Component Bounds | Migration Target |
|-------------|------------------|-----------------------|----------------------|---------------------|------------------------|------------------|
| `celestial-odyssey` | Celestial / Cosmic | Legacy React | **HYBRID** | SceneGraph for Souls & Countdown; Parallax Experience container | Astrolabe Clock (`smart_astrolabe_clock`), Constellation Map (`smart_constellation_map`), Parallax Portrait (`smart_parallax_portrait`) | Complete Graph Universe (P14) |
| `minimal-editorial` | Minimal / Architectural | Legacy React | **GRAPH_NATIVE** | Pure SceneGraph (`UnifiedSceneRenderer`) | None — 100% declarative SceneGraph frames, text, and grids | Fully Native ✅ |
| `garden-romance` / `floral-romance` | Floral / Botanical | Legacy React | **GRAPH_NATIVE** | Pure SceneGraph (`UnifiedSceneRenderer`) | Organic watercolor card frames, floral dividers | Fully Native ✅ |
| `modern-harmony` | Modern / Geometric | Brand New (P13) | **GRAPH_NATIVE** | Pure SceneGraph (`UnifiedSceneRenderer`) | Architectural glass cards, neon badges, dynamic grids | Fully Native ✅ |
| `surreal-organimo` | Avant-Garde / Botanical | Legacy React | **HYBRID** | SceneGraph for Couple Bio (`organimo-couple-bio`); Organimo Experience container | Botanical Mesh Canvas (`bg_botanical_mesh`) | Full Graph Universe |
| `amalfi-riviera` | Mediterranean / Coastal | Legacy React | **AUTO_MIGRATED** | SceneGraph via `LegacyTemplateMigrator` on load | Villa watercolor backdrop, ceramic tile frames | Native Graph |
| `party-nocturne` | Nocturne / Nightclub | Legacy React | **AUTO_MIGRATED** | SceneGraph via `LegacyTemplateMigrator` on load | Strobe beat visualizer, glow particle burst | Native Graph |
| `romantic-doors` | Romantic / Classical | Legacy React | **AUTO_MIGRATED** | SceneGraph via `LegacyTemplateMigrator` on load | 3D Perspective Door Portal | Native Graph |
| `royal-regalia` | Regal / Palace | Legacy React | **AUTO_MIGRATED** | SceneGraph via `LegacyTemplateMigrator` on load | Gold foil seal, royal crest renderer | Native Graph |

---

## 3. Explicit Hybrid Component Declarations

Every smart node used in a `HYBRID` scene is strictly documented with its inputs, outputs, and layout constraints:

### 1. `CelestialAstrolabeClock`
* **Parent Node:** `astrolabe_smart_clock` (kind: `smart`, smartComponent: `CelestialAstrolabeClock`)
* **Graph Controlled:** Dimensions (280x280px), absolute position (`x: 0`, `y: 40%`), opacity, responsive scaling (`0.85` on mobile).
* **Internal Component Authority:** SVG rotational angles, second/minute/day hand mathematical trigonometry, astrological constellation markers.
* **Binding:** Subscribed to `celebration.date` and `event.time`.

### 2. `CelestialConstellationMap`
* **Parent Node:** `constellation_smart_map` (kind: `smart`, smartComponent: `CelestialConstellationMap`)
* **Graph Controlled:** Frame boundaries (`width: 100%`, `height: 480px`), responsive overrides (`height: 340px` on mobile), z-index.
* **Internal Component Authority:** Star catalog generation, interactive hover glow on star clusters, canvas particle trails.
* **Binding:** Subscribed to `venue.city` and `venue.latitude`/`longitude`.

### 3. `CelestialParallaxPortrait`
* **Parent Node:** `smart_portrait_a` / `smart_portrait_b` (kind: `smart`, smartComponent: `CelestialParallaxPortrait`)
* **Graph Controlled:** Aspect ratio (`3:4`), border radius (`16px`), drop shadow, border accent, rotation (`-4deg`).
* **Internal Component Authority:** Gyroscopic / mouse-follow 2.5D parallax layer displacement, subtle shimmer overlay.
* **Binding:** Subscribed to `celebrants[0].portrait` and `celebrants[1].portrait`.

---

## 4. Migration Tooling & Preview Protocol

When converting a legacy scene to Graph Native:
1. **Extraction:** `LegacyTemplateMigrator.extractSceneGraphFromLegacy(sceneLayer)` reads static DOM hierarchy and converts it into a valid `SceneGraph` schema (`schemaVersion: 1`).
2. **Side-by-Side Review:** Studio displays the legacy preview iframe beside the `SceneGraphRenderer` iframe.
3. **Difference Inspection:** Diff engine compares computed bounding boxes, computed styles, and font sizes across Desktop, Tablet, and Mobile.
4. **Explicit Promotion:** Admin clicks **Confirm Migration**, updating `renderMode: 'graph'` in `TemplateSchema.scenes`. At no point is production authority swapped silently.

---

## 5. Schema Evolution & Deterministic Migrations

The SceneGraph adheres to strict versioning:
* **`schemaVersion: 1`**: Current canonical schema supporting `freeform`, `flex`, and `stack` layout modes, responsive overrides for `tablet` and `mobile`, keyframe entrance motion, and dot-notation data bindings.
* **Automatic Migrators**: The loader passes raw schemas through `migrateSceneGraph(rawGraph)` before mounting in the store, ensuring backwards compatibility with any serialized template snapshots.
