# ADR 0005: Design System Stack & Pinned Architecture

## Status
Accepted

## Context
Stage 7B establishes the unified, multi-tenant design system for OrbitoX (`packages/ui`) that will power all user-facing applications (Platform Operator Console, Customer Dashboard, HospitalOS, and RestaurantOS) across Stages 7C–7F.
Previously, `packages/ui` contained 20 ad-hoc components with no coherent token system, and `apps/platform` relied on 3,968 inline `style={{...}}` blocks and scattered CSS modules with zero Tailwind and no tokens.

To achieve strict accessibility (WCAG 2.2 AA), zero-runtime CSS-in-JS overhead, responsive multi-tenant theming (including strict contrast verification and injection prevention), and headless component primitives, the technical lead specified the unified stack requirements.

## Decision

We adopt the following stack and pin exact versions across `packages/ui` and consuming applications:

### 1. Core Styling & Primitives
- **Styling**: `tailwindcss@4.0.9` with `@tailwindcss/postcss@4.0.9`. CSS-first `@theme` mapped directly to token CSS variables (`--color-*`, `--space-*`, `--radius-*`). Zero runtime CSS-in-JS.
- **Variants & Class Merging**: `class-variance-authority@0.7.1`, `tailwind-merge@3.0.2`, `clsx@2.1.1` unified through the canonical `cn()` helper.
- **Primitives**: Radix UI headless components written directly into repository (no hosted third-party kits):
  - `@radix-ui/react-slot@1.1.2`
  - `@radix-ui/react-label@2.1.2`
  - `@radix-ui/react-separator@1.1.2`
  - `@radix-ui/react-avatar@1.1.3`
  - `@radix-ui/react-tabs@1.1.3`
  - `@radix-ui/react-switch@1.1.3`
  - `@radix-ui/react-checkbox@1.1.4`
  - `@radix-ui/react-dialog@1.1.6`
  - `@radix-ui/react-alert-dialog@1.1.6`
  - `@radix-ui/react-popover@1.1.6`
  - `@radix-ui/react-select@2.1.6`
  - `@radix-ui/react-dropdown-menu@2.1.6`
  - `@radix-ui/react-context-menu@2.2.6`
  - `@radix-ui/react-radio-group@1.2.3`
  - `@radix-ui/react-slider@1.2.3`
  - `@radix-ui/react-tooltip@1.1.8`
- **Icons**: `lucide-react@0.475.0` (tree-shaken single icon set).

### 2. Forms & Data
- **Forms**: `react-hook-form@7.54.2` + `@hookform/resolvers@3.10.0` + `zod@3.24.2`.
- **Tables**: `@tanstack/react-table@8.21.2` (headless, server-side pagination, sorting, filters, row selection).
- **Charts**: `recharts@2.15.1` (wrapped in `packages/ui/src/charts` with token colors and data-table fallback; lazy-loaded).

### 3. Typography & Self-Hosted Fonts
- **Fonts**: Self-hosted via `next/font/local`:
  - `Inter` (UI default) — SIL Open Font License 1.1 (`apps/platform/public/fonts/LICENSES/OFL-Inter.txt`)
  - `Noto Sans Devanagari` (Hindi and Indic script fallback) — SIL Open Font License 1.1 (`apps/platform/public/fonts/LICENSES/OFL-NotoSansDevanagari.txt`)
  - `JetBrains Mono` (identifiers, codes, API keys, JSON) — SIL Open Font License 1.1 (`apps/platform/public/fonts/LICENSES/OFL-JetBrainsMono.txt`)
  - Strictly no Google Fonts CDN (satisfying strict CSP and privacy regulations).

### 4. Documentation, Visual Testing & Quality Gates
- **Storybook**: Storybook 8 (`storybook@8.6.4`, `@storybook/react@8.6.4`, `@storybook/react-vite@8.6.4`, `@storybook/addon-essentials@8.6.4`, `@storybook/addon-a11y@8.6.4`, `@storybook/addon-interactions@8.6.4`).
- **Accessibility & Visual Regression**: `playwright@1.65.0` with `@axe-core/playwright@4.10.2` (asserting 0 WCAG 2.2 AA violations across all stories in desktop 1440px & mobile 390px, light & dark modes) and committed PNG visual regression baselines (`packages/ui/test/visual/__snapshots__`).
- **Security & Component Unit Tests**: `jsdom@26.0.0`, `@testing-library/react@16.2.0`.
- **Bundle Budget**: `size-limit@11.1.6` with `@size-limit/preset-small-lib@11.1.6` in `import` mode (`ignore: ["react", "react-dom"]` only, bundling Radix, TanStack Table, React Hook Form, Zod, and Recharts).

### 5. Architectural Invariants
1. **Additive Legacy Migration**:
   - Existing components are moved to `packages/ui/src/legacy/`, marked `@deprecated`, and continue to be re-exported from `@orbitox-io/ui` until callers are phased out in Stages 7C–7F.
2. **Three-Tier Token Architecture**:
   - Primitive (`primitives.css`): raw palette, space, radius, shadow, duration.
   - Semantic (`semantic.css`): `--color-bg`, `--color-surface`, `--color-text`, `--color-primary`, `--color-danger`, etc.
   - Component (`components.css`): specific dimensions (e.g., `--sidebar-width`).
   - Lint rule: Zero raw hex or `rgb()` in `packages/ui/src/components`.
3. **Tenant Theme Sanitization**:
   - `applyTenantTheme` strictly validates inputs through hex/OKLCH color parser, enforces contrast $\ge 4.5:1$ against foreground, and rejects hostile CSS injection strings.
4. **Security & PHI Guards**:
   - `MaskedField` ensures masked values are never emitted into DOM before explicit authenticated revelation.
   - `CopyOnceSecret` ensures secrets cannot be re-rendered or leaked after acknowledgement.
   - Zero `dangerouslySetInnerHTML` and zero inline `style` in `packages/ui`.

## Consequences
- **Positive**: Consistent, accessible, theme-capable design system across platform and restaurant applications.
- **Positive**: Zero external font or style CDN requests, enabling strict CSP compliance.
- **Positive**: Additive migration guarantees zero breaking changes to existing platform pages in Stage 7B.
- **Negative**: Requires strict discipline and linting to ensure no inline styles or raw colors leak into components.

