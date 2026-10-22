# 🪐 OrbitoX Celebrations — P14 Master Authoring & Production Hardening Plan
**Document ID:** `docs/P14_MASTER_IMPLEMENTATION_PLAN.md`  
**Phase:** P14 — Master Authoring & Production Hardening  
**Target:** Make Template Studio a complete professional visual authoring product and SceneGraph the unquestionable source of truth across the production catalog.

---

## 1. Permanent Architectural Invariant

The following architectural hierarchy is permanently locked across the platform:

```
                    ┌─────────────────────────┐
                    │     Template Studio     │
                    │   (Visual Authoring)    │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │       SceneGraph        │
                    │      SOURCE TRUTH       │
                    └────────────┬────────────┘
                                 │
             ┌───────────────────┼───────────────────┐
             ▼                   ▼                   ▼
      Layout Resolver    Behavior Resolver     Data Binder
      (Flex/Stack/Grid)  (Interactions/Motion) (State/Repeater)
             │                   │                   │
             └───────────────────┼───────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │     Resolved Graph      │
                    │  (Pure Computed Tree)   │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  UnifiedSceneRenderer   │
                    │  (Zero Shadow Layouts)  │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │      Guest Pixels       │
                    └─────────────────────────┘
```

### Prohibited Architectural Antipatterns
* ❌ `Inspector → React special case` (no hidden props that bypass SceneGraph nodes)
* ❌ `Canvas → React special case` (no canvas-only visual wrappers)
* ❌ `Customer setting → React special case` (customer permissions resolve strictly into SceneGraph overrides)

---

## 2. The 7 Pillars of P14

### Pillar P14-A: Full Catalog Graph Migration
* **Baseline Audit:** Generated machine-readable audit (`docs/P14_CATALOG_GRAPH_AUDIT.json`).
  * Current baseline: **24 Graph Native scenes (38.7%)**, **4 Hybrid scenes (6.5%)**, **34 Legacy scenes (54.8%)**.
* **Goal:** Eliminate all 34 legacy JSX scene templates. Every scene across all 10 templates must resolve through `UnifiedSceneRenderer`.
* **Zero Orphan Renderers:** Deprecate static `.tsx` template files once their declarative SceneGraphs are validated in `BUILTIN_SCHEMAS`.

### Pillar P14-B: True Visual Composition & Layer Tree Synchronization
* **Full Semantic Insert Palette:**
  * Core primitives: `Frame`, `Stack`, `Grid`, `Text`, `RichText`, `Image`, `Video`, `Shape`, `Line`, `Group`, `Mask`, `Button`, `Divider`, `Icon`.
  * Celebration primitives: `Person/Portrait`, `Couple Cluster`, `Story Milestone`, `Event Card`, `Venue Map`, `Countdown Chronograph`, `RSVP Form`, `Gallery Grid`, `Guestbook Wall`.
* **Deep Structural Mutations:**
  * Direct canvas drag & drop nesting/unnesting.
  * Hierarchical multi-selection, alignment (left/center/right/distribute evenly), z-order stacking, and sibling swapping.
  * Bi-directional canvas ↔ layer tree synchronization with lock, hide, and inline rename.

### Pillar P14-C: Component & Variant System
* **Master Components & Instances:**
  * Component definition with exposed properties and slot placeholders.
  * Linked instances: Edits to master component propagate across all instances.
* **Component Variants:**
  * Aesthetic variants (e.g. `WeddingHero` → `Celestial`, `Minimal`, `Botanical`, `Modern`).
* **Instance Detachment:**
  * Designer can "Detach Instance" to break link and gain freeform SceneGraph editing on that subtree.

### Pillar P14-D: Data System (Repeaters & Conditionals)
* **Visual Data Binding:**
  * Canonical dot-notation picker (`celebrants[0].name`, `celebrants[0].portrait`, `celebration.date`, `venue.address`).
* **Dynamic Repeaters:**
  * Repeating arrays from state: `story.milestones[*]`, `events[*]`, `gallery.photos[*]`, `wishes[*]`.
  * Item template definition: author designs one card, repeater loops over array with min/max bounds and empty states.
* **Declarative Conditionals:**
  * Rule-based visibility without code: `module.shagun.enabled == true`, `celebrants.length > 1`, `guestCount > 0`.

### Pillar P14-E: Interaction Studio (State & Event Graph)
* **Visual Interaction Editor:**
  * Separate studio panel defining: `TRIGGER` → `CONDITION` → `ACTION` → `NEXT STATE`.
* **Triggers:**
  * `onTap`, `onHover`, `onScrollProgress` (e.g. 0% → 40%), `onSceneEnter`, `onSceneExit`, `onSubmit`, `onTimer`.
* **Actions:**
  * Animate property, reveal/hide subtree, navigate chapter, play soundscape, open modal, trigger celebration confetti/particles.

### Pillar P14-F: Responsive Art Direction
* **True Responsive Composition (Not Just Scaling):**
  * Independent art direction per breakpoint: `Desktop` (1440px), `Tablet` (768px), `Mobile` (390px).
  * Breakpoint-specific layout mode (e.g. horizontal flex on desktop → vertical stack on mobile).
  * Breakpoint-specific element ordering, visibility, cropping, and spacing.

### Pillar P14-G: Automated Cross-Device Visual QA Suite
* **Automated Multi-Resolution Headless Runner:**
  * Evaluates 6 standard viewports: Desktop 1440, Desktop 1280, Tablet 768, Mobile 430, Mobile 390, Mobile 375.
  * Pixel-level diffing against golden baselines.
  * Catches phantom mutations where inspector updates but guest pixels remain unchanged.

---

## 3. P14 Acceptance Test Protocol (The 27-Step Master Benchmark)

1. Create blank celebration template from zero.
2. Create 5 distinct scenes (`Hero`, `Portraits`, `Story`, `Countdown`, `RSVP`).
3. Insert 30+ semantic nodes across all 5 scenes.
4. Establish custom nested hierarchy with auto-layout containers.
5. Create a reusable `CouplePortraitCard` master component.
6. Create an alternate variant of the component (`ArchFrame` vs `CircleGlow`).
7. Bind real celebration customer data to text and image nodes.
8. Add a dynamic repeater node iterating over `itinerary.events[*]`.
9. Add a conditional visibility rule on the RSVP dietary requirements field.
10. Configure Desktop art direction (side-by-side flex layout).
11. Configure Tablet art direction (2-column condensed grid).
12. Configure Mobile art direction (single vertical stack with adjusted margins).
13. Add a scroll-progress interaction (celestial glow brightens 0% → 50%).
14. Add a tap interaction on the RSVP submit button.
15. Add state transitions (`default` → `hover` → `pressed` → `submitted`).
16. Add keyframe entrance animations with staggered delays.
17. Insert and bind image and ambient background audio media.
18. Configure design tokens (typography, color palettes, border radiuses).
19. Save template to database.
20. Reload template from scratch in studio.
21. Publish template as a new immutable version.
22. Create a customer celebration experience from the published template.
23. Open Guest View URL in headless browser.
24. Verify identical resolved SceneGraph between studio and guest view.
25. Verify responsive art direction across Desktop, Tablet, and Mobile.
26. Verify interaction triggers and state transitions function in guest view.
27. Verify accessibility (WCAG AA, focus states, aria regions).

**Zero lines of React/CSS source code edited.**
