# 🪐 OrbitoX Studio 3.0 — Target Inspector Architecture
**Document ID:** `docs/P27/35_TARGET_INSPECTOR_ARCHITECTURE.md`  
**Status:** TARGET ARCHITECTURE SPECIFICATION (PHASE 0)  

---

## 1. Contextual Routing Engine

The right sidebar adapts dynamically to the active selection:

| Selection State | Active Inspector Component | Visible Sections |
| :--- | :--- | :--- |
| **None / Empty Canvas** | `PageInspector` | Page Title, Route, SEO Metadata, Social Share, Theme |
| **Section Selected** | `SectionInspector` | Layout Mode, Padding, Section Variants, Background, Motion |
| **Frame / Stack / Grid** | `FrameInspector` | Auto-Layout (Flow/Wrap/Gap), Box Model, Corner Radius, Fill, Stroke |
| **Text / Heading** | `TypographyInspector` | Font Family, Weight, Responsive Clamp Scale, Line Height, Align |
| **Image / Video** | `MediaInspector` | Source URL / Asset Vault, Object Fit, Aspect Ratio, Radius, Filter |
| **Component Instance** | `ComponentInspector` | Master Link, Variants, Slot Overrides, Reset Overrides, Detach |

---

## 2. Progressive Disclosure Hierarchy (Section 70)

Controls are organized into seven logical tiers:
1. **Essentials:** Core identification, text content, primary color.
2. **Design:** Fills, borders, corner radii, shadows, visual effects.
3. **Layout:** Flex / Stack / Grid / Freeform, dimensions, Box Model.
4. **Responsive:** Current breakpoint override status, reset to inherited.
5. **Behavior:** Hover states, active states, click actions, links.
6. **Data:** Dynamic CMS collection and variable bindings.
7. **Advanced:** Custom CSS properties, source mappings, accessibility (ARIA).
