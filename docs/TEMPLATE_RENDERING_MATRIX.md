# Template Rendering Matrix: OrbitoX Celebrations Engine

This document provides a forensic, codebase-verified audit of **every template and scene** across the OrbitoX Celebrations platform. It traces the complete execution path from HTTP route to rendered pixels, identifying the exact runtime authority, editability, and migration status.

---

## 1. Executive Classification Principles

1. **`GRAPH_NATIVE`**:
   - **SceneGraph is the absolute visual and layout source of truth.**
   - The React component is purely an executor of the resolved scene graph (`UnifiedSceneRenderer` / `SceneGraphRenderer`).
   - Mutations dispatched in Template Studio (geometry, styling, auto layout, bindings, motion) immediately update the SceneGraph and render directly to pixels in both Studio and Guest view (`/e/[slug]`).
   - React JSX is **NOT** the layout source of truth.

2. **`HYBRID`**:
   - SceneGraph controls structure, geometry, layering, responsive overrides, visibility, and high-level motion triggers.
   - Specialized React Smart Components execute procedural, canvas, or WebGL shader visuals (e.g. 3D Astrolabe mechanics, interactive starfields, dynamic audio visualizers).

3. **`LEGACY`**:
   - Static React / JSX components remain authoritative for layout and styling.
   - Customizations are limited to hardcoded configuration props or style override objects.
   - No direct visual canvas node manipulation until migrated via the **Template Compiler**.

---

## 2. Forensic Template & Scene Rendering Matrix

| Template | Scene | Legacy Renderer (JSX Source) | Graph Blueprint | Graph Renderer | Smart Components | Runtime Authority | Editability | Migration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Celestial Odyssey** | `scene_arrival` (Arrival & Hero) | `CelestialArrivalScene.tsx` | N/A (Candidate) | N/A | Ambient Starlight Canvas, Audio Mute Trigger | **LEGACY (React JSX)** | Props / Config | **LEGACY** |
| **Celestial Odyssey** | `scene_souls` (The Astral Souls) | `CelestialSoulsScene.tsx` | `CelestialSoulsGraph.ts` | `UnifiedSceneRenderer.tsx` &rarr; `SceneGraphRenderer.tsx` | `smart_portrait_a`, `smart_portrait_b`, `smart_union_quote` | **GRAPH_NATIVE (SceneGraph)** | **Full Direct Manipulation** (Drag, Resize, Rotate, Typography, Styles, Bindings) | **GRAPH_NATIVE** |
| **Celestial Odyssey** | `scene_constellation` (Story & Milestones) | `CelestialConstellationScene.tsx` | `CelestialConstellationGraph.ts` | `UnifiedSceneRenderer.tsx` &rarr; `SceneGraphRenderer.tsx` | `constellation_smart_map`, `smart_milestone_card` | **GRAPH_NATIVE (SceneGraph)** | **Full Direct Manipulation** (Repeater, Star layout, Orbit geometry, Modals) | **GRAPH_NATIVE** |
| **Celestial Odyssey** | `scene_countdown` (Astrolabe Chronograph) | `CelestialClockScene.tsx` | `CelestialCountdownGraph.ts` | `UnifiedSceneRenderer.tsx` &rarr; `SceneGraphRenderer.tsx` | `smart_countdown_clock`, `smart_calendar_button` | **GRAPH_NATIVE (SceneGraph)** | **Full Direct Manipulation** (Astrolabe ring, digit typography, calendar actions) | **GRAPH_NATIVE** |
| **Celestial Odyssey** | `scene_gathering` (Sanctuary & Itinerary) | `CelestialGatheringScene.tsx` | N/A (Candidate) | N/A | Protocol Modal, Itinerary Accordion | **LEGACY (React JSX)** | Props / Config | **LEGACY** |
| **Celestial Odyssey** | `scene_rsvp` (Cosmic Attendance Gate) | `CelestialRsvpScene.tsx` | N/A (Candidate) | N/A | Cosmic RSVP Form, Dietary Selector | **LEGACY (React JSX)** | Props / Config | **LEGACY** |
| **Celestial Odyssey** | `scene_memories` (Blessing Wall) | `CelestialBlessingsScene.tsx` | N/A (Candidate) | N/A | Starlight Particle Wall, Guestbook Dispatcher | **LEGACY (React JSX)** | Props / Config | **LEGACY** |
| **Celestial Parallax** | `sec-hero` (Cosmic Parallax Hero) | `CelestialParallaxExperience.tsx:L120` | N/A | N/A | Starfield Canvas | **LEGACY (React JSX)** | Props / StyleOverrides | **LEGACY** |
| **Celestial Parallax** | `sec-story` (Parallax Story) | `CelestialParallaxExperience.tsx:L240` | N/A | N/A | Story Carousel | **LEGACY (React JSX)** | Props / StyleOverrides | **LEGACY** |
| **Celestial Parallax** | `sec-couple` (Couple Overview) | `CelestialParallaxExperience.tsx:L350` | N/A | N/A | Static Image Cards | **LEGACY (React JSX)** | Props / StyleOverrides | **LEGACY** |
| **Celestial Parallax** | `sec-schedule` (Event Itinerary) | `CelestialParallaxExperience.tsx:L480` | N/A | N/A | Timeline List | **LEGACY (React JSX)** | Props / StyleOverrides | **LEGACY** |
| **Celestial Parallax** | `sec-venue` (Venue Details & Map) | `CelestialParallaxExperience.tsx:L600` | N/A | N/A | Interactive Map Frame | **LEGACY (React JSX)** | Props / StyleOverrides | **LEGACY** |
| **Celestial Parallax** | `sec-rsvp` (Passcode & Attendance) | `CelestialParallaxExperience.tsx:L720` | N/A | N/A | Guestbook Form | **LEGACY (React JSX)** | Props / StyleOverrides | **LEGACY** |
| **Amalfi Riviera** | `sec-amalfi-hero` (Coastal Citrus Arrival) | `AmalfiRivieraExperience.tsx:L190` | N/A | N/A | `AmalfiCoastalCanvas.tsx` (Lemon & wave shaders) | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Amalfi Riviera** | `sec-amalfi-couple` (Portofino Arch Profiles) | `AmalfiRivieraExperience.tsx:L280` | N/A | N/A | Architectural Arch Masks | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Amalfi Riviera** | `sec-amalfi-schedule` (Cliffside Soirée Itinerary)| `AmalfiRivieraExperience.tsx:L390` | N/A | N/A | Itinerary List | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Amalfi Riviera** | `sec-amalfi-venue` (Villa Cimbrone Map) | `AmalfiRivieraExperience.tsx:L510` | N/A | N/A | Map Box | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Amalfi Riviera** | `sec-amalfi-rsvp` (Yacht Club RSVP) | `AmalfiRivieraExperience.tsx:L630` | N/A | N/A | RSVP Form | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Minimal Editorial** | `sec-edit-hero` (Swiss Typographic Hero) | `MinimalEditorialExperience.tsx:L198` | N/A (Candidate) | N/A | Editorial Grid, Date Badge | **LEGACY (React JSX)** | Props / Config | **LEGACY** |
| **Minimal Editorial** | `sec-edit-couple` (Monograph Dual Profiles) | `MinimalEditorialExperience.tsx:L310` | N/A (Candidate) | N/A | Asymmetric Split Portraits | **LEGACY (React JSX)** | Props / Config | **LEGACY** |
| **Minimal Editorial** | `sec-edit-schedule` (Event Index Schedule) | `MinimalEditorialExperience.tsx:L428` | N/A | N/A | Numbered Index Items | **LEGACY (React JSX)** | Props / Config | **LEGACY** |
| **Minimal Editorial** | `sec-edit-venue` (Pavilion Architecture) | `MinimalEditorialExperience.tsx:L545` | N/A | N/A | Venue Logistics | **LEGACY (React JSX)** | Props / Config | **LEGACY** |
| **Minimal Editorial** | `sec-edit-wishes` (Registry & RSVP) | `MinimalEditorialExperience.tsx:L782` | N/A | N/A | Editorial Guestbook & RSVP | **LEGACY (React JSX)** | Props / Config | **LEGACY** |
| **Enchanted Glasshouse** | `sec-glass-hero` (Botanical Conservatory) | `EnchantedGlasshouseExperience.tsx:L170` | N/A | N/A | `GlasshouseCanvas.tsx` (Floating fern particles) | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Enchanted Glasshouse** | `sec-glass-couple` (Conservatory Lovers) | `EnchantedGlasshouseExperience.tsx:L260` | N/A | N/A | Foliage Frame Portraits | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Enchanted Glasshouse** | `sec-glass-schedule` (Palm Court Itinerary) | `EnchantedGlasshouseExperience.tsx:L370` | N/A | N/A | Greenhouse Timetable | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Enchanted Glasshouse** | `sec-glass-venue` (Orangery Grounds) | `EnchantedGlasshouseExperience.tsx:L480` | N/A | N/A | Conservatory Map | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Enchanted Glasshouse** | `sec-glass-rsvp` (Flora RSVP) | `EnchantedGlasshouseExperience.tsx:L590` | N/A | N/A | Floral RSVP Gate | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Party Nocturne** | `sec-party-hero` (Neon Midnight Portal) | `PartyNocturneExperience.tsx:L165` | N/A | N/A | `KineticNeonCanvas.tsx` (Pulsing neon beams) | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Party Nocturne** | `sec-party-vips` (Headliner VIP Cards) | `PartyNocturneExperience.tsx:L255` | N/A | N/A | Neon Glitch Portraits | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Party Nocturne** | `sec-party-schedule` (Set Times Timetable) | `PartyNocturneExperience.tsx:L360` | N/A | N/A | Festival Set List | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Party Nocturne** | `sec-party-venue` (Underground Sanctum) | `PartyNocturneExperience.tsx:L470` | N/A | N/A | Nightclub Wayfinding | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Party Nocturne** | `sec-party-rsvp` (Guestlist VIP Access) | `PartyNocturneExperience.tsx:L580` | N/A | N/A | VIP Pass Form | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Surreal Organimo** | `sec-org-hero` (Bio-Eden Portal) | `SurrealOrganimoExperience.tsx:L180` | N/A | N/A | `RoseDecorations.tsx` (Organic floral growth) | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Surreal Organimo** | `sec-org-couple` (Symbiosis Portraits) | `SurrealOrganimoExperience.tsx:L270` | N/A | N/A | Bio-Morphing Frames | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Surreal Organimo** | `sec-org-schedule` (Lifecycle Journey) | `SurrealOrganimoExperience.tsx:L380` | N/A | N/A | Organic Growth Timeline | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Surreal Organimo** | `sec-org-venue` (Sacred Sanctum) | `SurrealOrganimoExperience.tsx:L490` | N/A | N/A | Bio-Pavilion Map | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Surreal Organimo** | `sec-org-rsvp` (Communion RSVP) | `SurrealOrganimoExperience.tsx:L600` | N/A | N/A | Organic Form | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Romantic Doors** | `sec-doors-hero` (Château Architectural Gate) | `RomanticDoorsExperience.tsx:L190` | N/A | N/A | `RomanticPetalsCanvas.tsx` & Opening Gate | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Romantic Doors** | `sec-doors-couple` (The Châtelains) | `RomanticDoorsExperience.tsx:L285` | N/A | N/A | Baroque Oval Frame Cards | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Romantic Doors** | `sec-doors-schedule` (Grand Salon Schedule) | `RomanticDoorsExperience.tsx:L395` | N/A | N/A | Formal Salon Timetable | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Romantic Doors** | `sec-doors-venue` (Estate Grounds) | `RomanticDoorsExperience.tsx:L505` | N/A | N/A | Estate Map | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Romantic Doors** | `sec-doors-rsvp` (Wax-Sealed RSVP) | `RomanticDoorsExperience.tsx:L615` | N/A | N/A | Wax Seal Interactive Form | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Royal Regalia** | `sec-regalia-hero` (Baroque Gold Sovereign) | `RoyalRegaliaExperience.tsx:L195` | N/A | N/A | `CosmicGoldCanvas.tsx` (Gold leaf particles) | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Royal Regalia** | `sec-regalia-couple` (Imperial Dynasty Profiles) | `RoyalRegaliaExperience.tsx:L290` | N/A | N/A | Ornate Gold Leaf Portraits | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Royal Regalia** | `sec-regalia-schedule` (Protocol Ceremonial) | `RoyalRegaliaExperience.tsx:L400` | N/A | N/A | Court Order Timetable | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Royal Regalia** | `sec-regalia-venue` (Palace State Reception) | `RoyalRegaliaExperience.tsx:L510` | N/A | N/A | State Rooms Map | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |
| **Royal Regalia** | `sec-regalia-rsvp` (Imperial Decree RSVP) | `RoyalRegaliaExperience.tsx:L620` | N/A | N/A | Crown Decree RSVP | **LEGACY (React JSX)** | Props / Theme Tokens | **LEGACY** |

---

## 3. Migration Roadmap to GRAPH_NATIVE

To fulfill the **Absolute Principle** of the OrbitoX Platform:
1. **Flagship Flag State**: The 3 flagship scenes (`scene_souls`, `scene_constellation`, `scene_countdown`) in Celestial Odyssey are fully migrated and operating as **GRAPH_NATIVE** visual truths.
2. **Build-Time Compilation Target**: All other static templates (`Minimal Editorial`, `Amalfi Riviera`, `Royal Regalia`, etc.) can be ingested through `TemplateCompiler.ts` to output initial semantic SceneGraph blueprints.
3. **Zero Runtime JSX Parsing**: Blueprints are emitted as structured JSON graphs into `schema.scenes[*].sceneGraph` with `renderMode: 'graph'`.
4. **Visual Parity Gate**: Migration switches from `LEGACY` &rarr; `GRAPH_NATIVE` only after golden screenshot comparison confirms zero unacceptable visual regressions.
