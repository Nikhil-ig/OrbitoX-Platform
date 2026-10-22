# P26.1 Architectural Specification: Unified Creative Library System

## 1. Executive Summary

In the unified OrbitoX vision, the **Library** is the creative repository that bridges local authoring with team-wide and ecosystem-wide reuse. Rather than fragmenting templates into a separate isolated modal, components into a dedicated panel, and assets into another drawer, the **Universal Creative Library** unifies all design entities under a singular catalog architecture.

---

## 2. Library Scopes & Taxonomy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UNIVERSAL CREATIVE LIBRARY                      │
├─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│ Scope           │ Access Level    │ Description                      │
├─────────────────┼─────────────────┼──────────────────┼─────────────────┤
│ My Project      │ Active Session  │ Entities local to active project │
│ My Team         │ Organization    │ Shared across organization seats │
│ OrbitoX Curated │ Core Platform   │ Built-in premium starter catalog │
│ Community / Mkt │ Public / Store  │ Published templates & UI kits    │
│ Imported        │ Project-Scoped  │ Entities extracted from imports  │
└─────────────────┴─────────────────┴──────────────────┴─────────────────┘
```

Within every scope, entities are structured into 7 primary categories:
1. **Templates**: Full multi-page website projects with complete themes, CMS collections, and routing.
2. **Themes**: Curated design token packages (color universes, font pairings, spacing grids, border radii, shadows).
3. **Sections**: Composable page sections (Hero, Features, Pricing, Testimonials, FAQ, Gallery, CTA, Footer).
4. **Components**: Atomic and compound UI components with master/instance binding and property schemas.
5. **Assets**: Media binaries (photos, vector graphics, icons, background textures, video clips, audio tracks, custom variable fonts, 3D GLB/GLTF meshes).
6. **Motion & Interactions**: Reusable animation curves, GSAP timeline presets, scroll-triggered reveals, and micro-interactions.
7. **3D & Visual Effects**: Atmospheric particle simulations, WebGL shaders, celestial canvas scenes, and glassmorphic depth filters.

---

## 3. Physical Drag-and-Drop Everywhere

Every item in the library is a physical, draggable creative element:

| Entity Type | Drag Action | Canvas Behavior |
| :--- | :--- | :--- |
| **Section** | Drag onto Page | Blue drop indicator highlights insertion slot between sections; inserts section without displacing siblings |
| **Component** | Drag onto Canvas | Inserts instance (◇) inside hovered frame or at exact cursor coordinates |
| **Asset (Image/Video)**| Drag onto Canvas | If dropped over image node, prompts "Replace Asset"; if dropped over canvas, creates new node |
| **Theme** | Drag onto Project | Smoothly morphs all bound token colors and typography across the active scene |
| **Motion Preset** | Drag onto Object | Applies animation curve, duration, and scroll trigger directly to targeted node |
| **Visual Effect** | Drag onto Object | Applies glassmorphic backdrop filter, neon drop shadow, or gradient mesh |

---

## 4. Reverse Extraction: Expanding the Library from Canvas

The creative workflow flows seamlessly in both directions. Any design authored or imported on the canvas can be extracted into the library in one click:
- **Save as Section**: Right-click Section → `Save as Section` → Available in `Library → Sections → My Library`.
- **Create Master Component**: Right-click Frame → `Create Component` → Available in `Library → Components`.
- **Extract Theme**: Design System Panel → `Save Active Tokens as Theme` → Available in `Library → Themes`.
- **Save as Template**: Project Menu → `Save as Project Template` → Verified via `TemplatePackager` and signed with Ed25519 digital signature.
