# OrbitoX Celebrations — Template Render Truth Audit
**Document ID:** `docs/TEMPLATE_RENDER_TRUTH_AUDIT.md`  
**Phase:** P11 — Static Template Migration + Graph-Native Render Truth  
**Audit Date:** 2026-09-29  
**Platform Version:** OrbitoX Celebrations v1.4.0 / Antigravity 2.0  

---

## 1. Executive Summary & Core Architectural Finding

An exhaustive source-level and runtime branch audit was conducted across all 9 celebration templates and their respective scenes.

### The Conflict Discovered
Prior to Phase 11, the platform contained two completely disconnected representations of templates:
1. **The Static React Implementations:** Hardcoded, single-file or modular TSX scene files containing hardcoded visual layout, absolute CSS, and hardcoded DOM hierarchies (e.g. `CelestialSoulsScene.tsx`, `CelestialParallaxExperience.tsx`, `RoyalRegaliaExperience.tsx`).
2. **The Template Studio Engine:** A sophisticated editable `SceneGraph` (`CelestialSoulsGraph.ts`), `SceneGraphRenderer`, and `TemplateEditorStore`.

### The Smoking Gun
In `CelestialOdysseyExperience.tsx`, the scene rendering branch was written as:
```tsx
{soulsRenderMode === 'graph' && soulsSceneGraph ? (
  <UnifiedSceneRenderer ... />
) : (
  <CelestialSoulsScene ... />
)}
```
When requests arrived at `/e/odyssey-wedding-vikram-ananya?template=celestial-odyssey`:
- `coupleConfig.renderMode` was `undefined` because neither `/api/experiences` nor `buildFallbackExperience` populated `renderMode`.
- `coupleConfig.sceneGraph` was `undefined` because the schema's scene graphs were not automatically bound to experiences unless explicitly initialized.
- Therefore, the runtime **unconditionally branched to `CelestialSoulsScene.tsx` (Static JSX)**!
- **Result:** Any mutation made to the SceneGraph in Template Studio had ZERO visual effect on the guest view at `/e/...`! The static React JSX had retained 100% visual authority.

---

## 2. Runtime Path Trace: `/e/odyssey-wedding-vikram-ananya?template=celestial-odyssey`

```
URL: /e/odyssey-wedding-vikram-ananya?template=celestial-odyssey
  │
  ▼
[Route Handler] orbitox/apps/celebrations/app/e/[slug]/page.tsx
  ├── Params resolved: slug = "odyssey-wedding-vikram-ananya"
  ├── Query param: template = "celestial-odyssey"
  ├── Loads experience via GET /api/experiences?slug=odyssey-wedding-vikram-ananya (or buildFallbackExperience)
  └── Evaluates theme: DEFAULT_THEMES.find(...) -> celestial-rose-gold
  │
  ▼
[Root Experience View] components/renderer/ExperienceView.tsx
  ├── normalizeTemplateSlug("celestial-odyssey") -> "celestial-odyssey"
  ├── Passcode gate evaluated (unlocked)
  └── Dispatches to: <CelestialOdysseyExperience experience={experience} theme={effectiveTheme} />
  │
  ▼
[Experience World Component] components/renderer/templates/celestial-odyssey/CelestialOdysseyExperience.tsx
  ├── Extracts section configs: heroConfig, coupleConfig, storyConfig, countdownConfig, etc.
  ├── Evaluates enabled scenes: isArrivalEnabled, isSoulsEnabled, isStoryEnabled, isCountdownEnabled...
  └── Inspects renderMode flags:
        soulsRenderMode = coupleConfig.renderMode (was undefined)
        storyRenderMode = storyConfig.renderMode (was undefined)
        countdownRenderMode = countdownConfig.renderMode (was undefined)
```

### Exact Scene-by-Scene Pixel Authority Investigation

| Scene ID | Scene Title | Runtime Branch | Which JSX Actually Produced The Pixels? | Authority State |
| :--- | :--- | :--- | :--- | :--- |
| `scene_arrival` | Arrival & Cosmic Gateway | Line 502: `<CelestialArrivalScene ... />` | `components/renderer/templates/celestial-odyssey/scenes/CelestialArrivalScene.tsx` | **Static JSX** |
| `scene_souls` | The Astral Souls | Line 526: `soulsRenderMode === 'graph' && soulsSceneGraph ? UnifiedSceneRenderer : CelestialSoulsScene` | **`components/renderer/templates/celestial-odyssey/scenes/CelestialSoulsScene.tsx`** *(Bypassed graph!)* | **Static JSX (Legacy Conflict)** |
| `scene_constellation` | Constellation of Our Story | Line 565: `storyRenderMode === 'graph' && storySceneGraph ? UnifiedSceneRenderer : CelestialConstellationScene` | **`components/renderer/templates/celestial-odyssey/scenes/CelestialConstellationScene.tsx`** *(Bypassed graph!)* | **Static JSX (Legacy Conflict)** |
| `scene_countdown` | Celestial Astrolabe Countdown | Line 588: `countdownRenderMode === 'graph' && countdownSceneGraph ? UnifiedSceneRenderer : CelestialClockScene` | **`components/renderer/templates/celestial-odyssey/scenes/CelestialClockScene.tsx`** *(Bypassed graph!)* | **Static JSX (Legacy Conflict)** |
| `scene_gathering` | The Gathering (Sanctuary) | Line 617: `<CelestialGatheringScene ... />` | `components/renderer/templates/celestial-odyssey/scenes/CelestialGatheringScene.tsx` | **Static JSX** |
| `scene_attendance` | Attendance (RSVP) | Line 635: `<CelestialRsvpScene ... />` | `components/renderer/templates/celestial-odyssey/scenes/CelestialRsvpScene.tsx` | **Static JSX** |
| `scene_blessings` | Blessings & Guestbook | Line 661: `<CelestialBlessingsScene ... />` | `components/renderer/templates/celestial-odyssey/scenes/CelestialBlessingsScene.tsx` | **Static JSX** |
| `scene_departure` | Departure | Line 683: `<CelestialDepartureScene ... />` | `components/renderer/templates/celestial-odyssey/scenes/CelestialDepartureScene.tsx` | **Static JSX** |

---

## 3. Comprehensive Platform Render Truth Audit Table

The following table documents the source of truth across all 9 templates and all scenes in the OrbitoX Celebrations platform.

| Template | Scene | Static Renderer | SceneGraph | Graph Renderer | Actual Runtime Path | Editable | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Celestial Odyssey** | `scene_arrival` | `CelestialArrivalScene.tsx` | None | None | `CelestialOdysseyExperience -> CelestialArrivalScene` | No | `LEGACY` |
| **Celestial Odyssey** | `scene_souls` | `CelestialSoulsScene.tsx` | `CelestialSoulsGraph.ts` | `UnifiedSceneRenderer -> SceneGraphRenderer` | `CelestialOdysseyExperience -> UnifiedSceneRenderer` | **Yes (Graph)** | **`GRAPH_NATIVE` (Authoritative)** |
| **Celestial Odyssey** | `scene_constellation` | `CelestialConstellationScene.tsx` | `CelestialConstellationGraph.ts` | `UnifiedSceneRenderer -> SceneGraphRenderer` | `CelestialOdysseyExperience -> UnifiedSceneRenderer` | **Yes (Graph)** | **`GRAPH_NATIVE` (Authoritative)** |
| **Celestial Odyssey** | `scene_countdown` | `CelestialClockScene.tsx` | `CelestialCountdownGraph.ts` | `UnifiedSceneRenderer -> SceneGraphRenderer` | `CelestialOdysseyExperience -> UnifiedSceneRenderer` | **Yes (Graph)** | **`GRAPH_NATIVE` (Authoritative)** |
| **Celestial Odyssey** | `scene_gathering` | `CelestialGatheringScene.tsx` | None | None | `CelestialOdysseyExperience -> CelestialGatheringScene` | No | `LEGACY` |
| **Celestial Odyssey** | `scene_attendance` | `CelestialRsvpScene.tsx` | None | None | `CelestialOdysseyExperience -> CelestialRsvpScene` | No | `LEGACY` |
| **Celestial Odyssey** | `scene_blessings` | `CelestialBlessingsScene.tsx` | None | None | `CelestialOdysseyExperience -> CelestialBlessingsScene` | No | `LEGACY` |
| **Celestial Odyssey** | `scene_departure` | `CelestialDepartureScene.tsx` | None | None | `CelestialOdysseyExperience -> CelestialDepartureScene` | No | `LEGACY` |
| **Celestial Parallax** | *All Scenes (Monolith)* | `CelestialParallaxExperience.tsx` (108 KB) | None | None | `ExperienceView -> CelestialParallaxExperience` | No | `LEGACY` |
| **Amalfi Riviera** | *All Scenes (Monolith)* | `AmalfiRivieraExperience.tsx` (41 KB) | None | None | `ExperienceView -> AmalfiRivieraExperience` | No | `LEGACY` |
| **Royal Regalia** | *All Scenes (Monolith)* | `RoyalRegaliaExperience.tsx` (81 KB) | None | None | `ExperienceView -> RoyalRegaliaExperience` | No | `LEGACY` |
| **Enchanted Glasshouse**| *All Scenes (Monolith)* | `EnchantedGlasshouseExperience.tsx` (41 KB) | None | None | `ExperienceView -> EnchantedGlasshouseExperience` | No | `LEGACY` |
| **Party Nocturne** | *All Scenes (Monolith)* | `PartyNocturneExperience.tsx` (30 KB) | None | None | `ExperienceView -> PartyNocturneExperience` | No | `LEGACY` |
| **Minimal Editorial** | *All Scenes (Monolith)* | `MinimalEditorialExperience.tsx` (28 KB) | None | None | `ExperienceView -> MinimalEditorialExperience` | No | `LEGACY` |
| **Romantic Doors** | *All Scenes (Monolith)* | `RomanticDoorsExperience.tsx` (66 KB) | None | None | `ExperienceView -> RomanticDoorsExperience` | No | `LEGACY` |
| **Surreal Organimo** | *All Scenes (Monolith)* | `SurrealOrganimoExperience.tsx` (88 KB) | None | None | `ExperienceView -> SurrealOrganimoExperience` | No | `LEGACY` |

---

## 4. Architectural Rules Established in Phase 11

### Rule 1: One Source of Truth Rule
For a `GRAPH_NATIVE` scene, the `SceneGraph` is the **only visual source of truth**.
We strictly reject competing layout declarations where static React JSX positions elements while the SceneGraph positions them separately.

### Rule 2: Single Authoritative Strategy Flag
No scattered boolean flags (`USE_NEW_GRAPH`, `USE_GRAPH_RENDERER`).
Every scene defines an authoritative `rendererMode: 'legacy' | 'hybrid' | 'graph'`.
When `rendererMode === 'graph'`, the scene component:
1. Obtains the resolved `SceneGraph` (custom draft or default template blueprint).
2. Converts active experience and theme data into `CelebrationState` and `TemplateDesignTokens`.
3. Passes them into `UnifiedSceneRenderer` (`SceneGraphRenderer`).
4. Bypasses the legacy React JSX entirely.

### Rule 3: Smart Components for Specialized Interactive Experiences
Specialized mathematical or WebGL/Audio components (e.g. `CelestialCountdownClock` astrolabe rings, `CelestialConstellationMap` procedural star field, `CelestialParallaxPortrait` cursor chimes) are encapsulated as **Smart Components**.
- The `SceneGraph` controls: `position`, `x`, `y`, `width`, `height`, `rotation`, `scale`, `zIndex`, `responsive overrides`, and `layering`.
- The Smart Component receives typed controlled props and executes internal interactive canvas/SVG rendering inside the graph node frame.

### Rule 4: Preserving Legacy Templates as Reference Renderers
Existing static templates (`RoyalRegaliaExperience.tsx`, `AmalfiRivieraExperience.tsx`, etc.) are preserved intact as **Legacy Reference Renderers**. They are not deleted; they serve as golden visual targets during deterministic scene extraction.
