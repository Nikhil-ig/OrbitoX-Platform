# 🪐 OrbitoX UI Reset: File-by-File Disposition Ledger

**Repository:** `Nikhil-ig/OrbitoX-Platform`  
**Governing Specification:** `PHASE7_UI_MASTER_BRIEF.md` & `OrbitoX UI Reset Master Plan`  
**Phase:** Phase 0 — Authoritative Ledger  
**Status:** Approved Architectural Disposition  
**Date:** November 17, 2026  

---

## 1. Principles of Disposition & Destruction Prevention

1. **Zero Premature Deletions:** No component, stylesheet, or route is deleted while it has active consumers or until its verified replacement is fully operational.
2. **Zero Security/Backend Alterations:** Cryptographic signing (`Ed25519`), RLS multi-tenant boundary checks, Prisma database schemas, API guards, and session authentication logic are strictly outside the deletion scope.
3. **Audit Before Action:** Every file marked `REPLACE LATER` or `DEPRECATE / DELETE LATER` must undergo an import sweep to verify 0 runtime callers before deletion.
4. **Single Source of Truth:** All UI tokens will converge on `packages/ui/src/tokens/`, eliminating competing `--ui-*` stylesheets.

---

## 2. Authoritative File-by-File Disposition Matrix

| File or Directory | Architectural Decision | Current State | Required Migration Action | Target State |
|---|---|---|---|---|
| `packages/ui/src/components/` | **KEEP / REFACTOR** | Modern components using `--color-*` | Restyle pill radius (999px), 28px card radius, verify WCAG AA | Master component library |
| `packages/ui/src/tokens/` | **KEEP / COMPLETE** | Modern token engine (`theme.css`, `semantic.css`, `motion.css`) | Add density multipliers (0.65x, 1.0x, 1.25x), complete 8 accent presets | Canonical token source |
| `packages/ui/src/components/app-shell.tsx` | **REFACTOR** | Desktop sidebar + mobile drawer | Add responsive bottom pill navigation for mobile (390×844) | Universal responsive shell |
| `packages/ui/src/components/bottom-tab-bar.tsx` | **KEEP / VERIFY** | Floating pill nav | Verify touch targets ≥ 44px, 5-item limit, active pill mood styling | Mobile bottom navigation |
| `packages/ui/src/components/bottom-sheet.tsx` | **REFACTOR** | Static handle container | Add real touch drag gesture, Escape key trap, focus trap | Universal bottom sheet |
| `packages/ui/src/components/progress-bar.tsx` | **KEEP / VERIFY** | Accessible progress bar | Verify bounds clamping (0–100%), ARIA labels, semantic color tones | Core feedback component |
| `packages/ui/src/components/dangerous-action.tsx` | **PROTECT / VERIFY** | Step-up auth + typed confirmation dialog (Master C2) | Preserve security invariants, test coverage, zero DOM leaks | Security primitive |
| `packages/ui/src/components/copy-once-secret.tsx` | **PROTECT / VERIFY** | Single reveal, volatile memory wipe (Master C6) | Preserve security invariants, prevent replay after unmount | Security primitive |
| `packages/ui/src/components/masked-field.tsx` | **PROTECT / VERIFY** | Zero DOM leak, 60s auto-hide on blur/visibilitychange | Preserve PHI/PII protection rules and zero SSR leak | Security primitive |
| `packages/ui/src/legacy/components/theme-provider.tsx` | **REPLACE / DELETE LATER** | Client `ThemeProvider` injecting `<style>` via `dangerouslySetInnerHTML` | Migrate all consumers to server-resolved `<html>` `data-*` attributes; remove | Fully retired |
| `packages/ui/src/legacy/dynamic/dynamic-sidebar.tsx` | **REPLACE / DELETE LATER** | Legacy sidebar used only in `(dashboard)/layout.tsx` | Migrate consumers to `AppShell`; remove once consumer count is 0 | Fully retired |
| `packages/ui/src/legacy/dynamic/dynamic-copilot.tsx` | **REPLACE / DELETE LATER** | Legacy floating copilot used only in `(dashboard)/layout.tsx` | Retire with legacy dashboard layout | Fully retired |
| `packages/ui/src/legacy/dynamic/dynamic-dashboard.tsx` | **REPLACE / DELETE LATER** | Legacy dashboard grid used only in `(dashboard)/page.tsx` | Replace with `HeroStat` / `StatStrip`; remove once usage is 0 | Fully retired |
| `packages/ui/src/legacy/components/glass-card.tsx` | **DELETE LATER** | Legacy glass card; 0 consumers in app | Remove from `packages/ui/src/index.ts` after Phase 7B.1 | Fully retired |
| `packages/ui/src/legacy/components/neon-badge.tsx` | **DELETE LATER** | Legacy neon badge; 0 consumers in app | Remove from `packages/ui/src/index.ts` after Phase 7B.1 | Fully retired |
| `packages/ui/src/legacy/components/studio-button.tsx` | **DELETE LATER** | Legacy button; 0 consumers in app | Remove from `packages/ui/src/index.ts` after Phase 7B.1 | Fully retired |
| `packages/ui/src/legacy/components/stat-metric-widget.tsx` | **DELETE LATER** | Legacy widget; 0 consumers in app | Remove from `packages/ui/src/index.ts` after Phase 7B.1 | Fully retired |
| `packages/ui/src/legacy/components/modern-tabs.tsx` | **DELETE LATER** | Legacy tabs; 0 consumers in app | Remove from `packages/ui/src/index.ts` after Phase 7B.1 | Fully retired |
| `packages/ui/src/legacy/dynamic/dynamic-table.tsx` | **DELETE LATER** | Legacy table; 0 consumers in app | Modern `DataTable` is active; remove | Fully retired |
| `packages/ui/src/legacy/dynamic/dynamic-marketplace.tsx` | **DELETE LATER** | Legacy marketplace; 0 consumers in app | Plugin management migrated to `C2`/`C3`; remove | Fully retired |
| `packages/ui/src/legacy/dynamic/dynamic-form.tsx` | **DELETE LATER** | Legacy form; 0 consumers in app | Modern `Form` is active; remove | Fully retired |
| `packages/ui/src/legacy/dynamic/dynamic-workflow-builder.tsx` | **DELETE LATER** | Legacy workflow builder; 0 consumers in app | Modern `Stepper`/`Timeline` active; remove | Fully retired |
| `packages/ui/src/legacy/components/button.tsx` | **DELETE LATER** | Aliased as `LegacyButton`; 0 consumers | Remove alias | Fully retired |
| `packages/ui/src/legacy/components/card.tsx` | **DELETE LATER** | Aliased as `LegacyCard`; 0 consumers | Remove alias | Fully retired |
| `packages/ui/src/legacy/components/badge.tsx` | **DELETE LATER** | Aliased as `LegacyBadge`; 0 consumers | Remove alias | Fully retired |
| `packages/ui/src/styles/theme.css` | **DEPRECATE / DELETE LATER** | Older `--ui-*` stylesheet | Migrate CSS modules and legacy pages to `--color-*`; then delete | Fully retired |
| `packages/ui/src/index.ts` | **REFACTOR LATER** | Exports modern and legacy components | Remove legacy export block once consumer count is zero | Pure canonical exports |
| `apps/platform/src/app/layout.tsx` | **REFACTOR** | Imports both `theme.css` files | Remove `@orbitox-io/ui/src/styles/theme.css`; keep server appearance | Single root layout |
| `apps/platform/src/app/globals.css` | **REFACTOR** | Imports `tokens/theme.css` | Sole global entry point with canonical tokens | Canonical global stylesheet |
| `apps/platform/src/app/providers.tsx` | **REFACTOR** | Mounts `ThemeProvider` and `AdminProvider` | Remove `ThemeProvider` & `AdminProvider`; keep `ToastProvider` | Lean global provider |
| `apps/platform/src/app/fonts.ts` | **KEEP / CLEAN UP** | Loads Plus Jakarta Sans but aliases to `fontInter` | Rename `fontInter` to `fontPlusJakartaSans` for architectural clarity | OFL font configuration |
| `apps/platform/src/app/(console)/layout.tsx` | **REFACTOR** | Mounts duplicate `AdminProvider` | Remove `AdminProvider`; rely on route-level data services | Pass-through layout |
| `apps/platform/src/app/(dashboard)/layout.tsx` | **REPLACE LATER** | Legacy dashboard layout with `DynamicSidebar` | Retire after root route `/` destination is approved by owner | Fully retired |
| `apps/platform/src/app/(dashboard)/page.tsx` | **REPLACE LATER** | Self-nesting layout and hardcoded sample metrics | Replace with approved root landing/workspace router | Modern production screen |
| `apps/platform/src/app/(console)/console/components/console-shell.tsx` | **KEEP / REFACTOR** | Operator console shell foundation | Remove hardcoded badges (128, 342, etc.) and static cluster string | Real-data operator shell |
| `apps/platform/src/app/(console)/console/settings/appearance/` | **KEEP / FIX** | Interactive appearance client | Fix optimistic save failure recovery & toast feedback | Production feature |
| `apps/platform/src/server/appearance/appearance-service.ts` | **KEEP / PROTECT** | Per-user DB persistence, schema validation | Retain strict schema validation, zero CSS injection | Core security service |
| `apps/platform/src/app/(console)/console/design-system/` | **KEEP / COMPLETE** | Component showcase | Complete all 11 Master Showcase screens (A1, A2, A3, etc.) | Canonical review showcase |
| `apps/platform/src/app/(console)/console/overview/` | **KEEP / REFACTOR** | Live operator overview screen | Bind deltas and time-series to live telemetry; remove mocks | Production operator screen |
| `apps/platform/src/app/(console)/admin/data/admin-context.tsx` | **HOLD / AUDIT** | Mock state provider for `/admin/*` routes | Retain while `/admin/*` routes are being consolidated | Retire after Step C4 |
| `apps/platform/src/app/(console)/admin/data/mock-data.ts` | **HOLD / AUDIT** | Mock data fixtures | Retain until dependent legacy admin routes are migrated | Retire after Step C4 |
| `apps/platform/src/app/admin/data/admin-context.tsx` | **REFACTOR LATER** | Re-export shim | Remove after provider consolidation | Fully retired |
| `docs/console/parity.md` | **UPDATE** | Route parity inventory | Reconcile route realities (`/platform`, `/platform/explorer`, etc.) | Authoritative parity doc |

---

## 3. Strict Pre-Conditions for Any File Deletion

Before any file is physically unlinked from git:
1. `git grep "<ExportName>"` must return **0 results** across the repository (excluding deprecated test fixtures).
2. The replacement component or route must be fully built, type-checked, and passing all tests.
3. 301/308 redirects must be tested and verified for any retired route.
4. Formal owner sign-off must be recorded.
