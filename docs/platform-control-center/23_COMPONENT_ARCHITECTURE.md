# 🪐 OrbitoX Platform Control Center: Component Architecture (v3.1)
**Document Ref: PCC-23**  
**Classification: Reusable UI Component Primitives & Style Guide**

---

## 1. Reusable Component Primitives

To eliminate arbitrary one-off CSS and inline style inconsistencies, the following components constitute the standard library:

### 1.1. Layout & Shell
- [`PlatformShell`](../../orbitox/apps/web/app/platform/components/PlatformContext.tsx): Root layout wrapper containing sidebar, topbar, inspector drawer, and command palette.
- [`PlatformSidebar`](../../orbitox/apps/web/app/platform/components/PlatformSidebar.tsx): Compact, hierarchical navigation rail with collapsible sections and clean SVG icons.
- [`PlatformTopbar`](../../orbitox/apps/web/app/platform/components/GlobalPlatformBar.tsx): Restrained header with breadcrumb navigation, search bar (⌘K), environment switcher, and notifications.

### 1.2. Interactive Primitives
- `MetricStrip`: Horizontal metrics bar with typography-driven numbers and subtle labels.
- `AttentionList`: Prioritized issue queue with severity indicators (`🔴`, `🟠`, `🟡`) and inline action links.
- `ResourceTable`: High-density data table supporting sticky headers, column sorting, pagination, and row click selection.
- `ResourceInspector`: 440px slide-over drawer with progressive disclosure tabs (Overview, Config, Security, Usage, Activity).
- `CommandPalette`: Keyboard-first modal (⌘K) indexing projects, keys, credentials, packages, and actions.
- `StatusDot`: Minimalist 6px indicator (`emerald`, `amber`, `rose`, `zinc`) with semantic status label.
- `FilterBar`: Clean search and filter controls for data tables without excessive card wrapping.

---

## 2. Shared Token Enforcement

Every component imports tokens directly from `app/platform/components/tokens.ts`:
```ts
import { PlatformTokens } from './tokens';
```
No component is allowed to define its own border-radius, background gradient, or font scale independently.
