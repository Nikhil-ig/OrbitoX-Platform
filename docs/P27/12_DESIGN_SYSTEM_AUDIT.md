# 🪐 OrbitoX Studio 3.0 — Design System Forensic Audit
**Document ID:** `docs/P27/12_DESIGN_SYSTEM_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Design Token Architecture & Fragmentation

The design token system is represented in `TemplateSchema.ts` via `TemplateDesignTokens`:
* `colors`: Palette mapping (primary, secondary, background, surface, text, border, accent, muted).
* `typography`: Font pairings (headingFont, bodyFont, displayFont, fontScale).
* `spacing`: Base unit scale (xs, sm, md, lg, xl, 2xl).
* `radii`: Corner radius scale (none, sm, md, lg, xl, full).
* `shadows`: Box shadow tokens (sm, md, lg, glow).

---

## 2. Token Mutation Disconnect (Issue #8)

### Mechanism of Failure:
1. When a user opens `StylesPanel.tsx` and edits a theme color (e.g., changes `colors.primary` from `#3B82F6` to `#10B981`), `handleUpdateDesignTokens` dispatches an update to `schema.designTokens`.
2. **The Disconnect:** Canvas nodes in existing blueprints (e.g. `node_hero_title`, `node_hero_cta_btn`) often contain hardcoded hex codes in their `style.background` or `style.color` properties rather than referencing token paths (`{ type: 'token', tokenPath: 'colors.primary' }`).
3. Because the node styles are hardcoded literals, mutating the global design tokens does NOT trigger visual updates on the canvas!
4. The user sees the design token change in the sidebar, but the canvas elements remain in their original colors, leading to the reported issue: "Design System is unreliable."

---

## 3. Style Precedence Collision (Section 10)

There is no formal cascading style resolution order. Currently:
* Hardcoded JSX properties in adapters
* Competing `--sz-*` and `--ui-*` CSS variables
* Node-level inline styles
* Blueprint default styles
* Global design tokens

all battle each other with no deterministic priority. The target architecture must strictly enforce:
`GLOBAL TOKEN < THEME TOKEN < COMPONENT TOKEN < INSTANCE OVERRIDE < LOCAL OVERRIDE < RESPONSIVE OVERRIDE`.
