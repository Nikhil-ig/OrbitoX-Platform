# 🪐 OrbitoX Phase 7B.2 — Test Acceptance Matrix & Architectural Risk Register

**Specification ID:** `ARCH-7B2-06-ACCEPTANCE`  
**Phase:** Phase 7B.2 — Theme Tokens & Persona Shell Architecture  
**Document Status:** Approved Architecture Contract  
**Governing Documents:** `PHASE7_UI_MASTER_BRIEF.md`, `docs/ui-reset/04_UI_ACCEPTANCE_MATRIX.md`  
**Accepted Baseline:** `f65698eab17b3a40842360eaeb387c74dca57ecc`  
**Author:** Principal Frontend & Platform Architect  
**Date:** November 17, 2026  

---

## 1. Executive Summary

This document establishes the binding quality assurance contract, automated testing harness requirements, risk mitigations, and execution governance for Phase 7B.2.

**Current Stage Status:** Stage 0 (Architecture & Planning).  
In accordance with Stage 0 restrictions, **no application source code has been altered**. Consequently, future implementation tests are cataloged with their exact verification criteria and are marked **`NOT RUN (Stage 0 Design Phase — Awaiting Implementation Authorization)`**.

---

## 2. Three Existing P2 Backlog Items

The following three non-blocking P2 debt items from the Phase 7B.1 independent review are formally carried forward in the engineering backlog:

| Backlog ID | Item Description | Originating Review | Severity | Target Resolution Milestone | Architectural Remediation Plan |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **P2-01** | `React.StrictMode` Double-Mount Integration Test for `AppearanceClient` | Phase 7B.1 Final Review | P2 | Phase 7B.2 (Commit 1) | Construct an automated Playwright/Vitest test mounting `<AppearanceClient>` inside `<React.StrictMode>` to prove that cleanup cancels pending fetch controllers and that the single-writer queue remains deadlock-free across double invocation. |
| **P2-02** | Real Browser Touch-Gesture Emulation for `BottomSheet` | Phase 7B.1 Final Review | P2 | Phase 7B.2 (Commit 3) | Implement a synthetic touch event suite using Playwright CDP (`Input.dispatchTouchEvent`) testing drag threshold (75px), velocity fling dismissal, and pointer-cancel handling on actual mobile viewports. |
| **P2-03** | Computed Mutating Method AST Detection in Style Guard | Phase 7B.1 Final Review | P2 | Phase 7B.2 (Commit 4) | Enhance `packages/ui/scripts/check-inline-styles.ts` AST parser to detect computed property mutations (e.g. `el.style['trans' + 'form'] = ...` or `Object.assign(el.style, ...)`) in addition to static member expressions. |

---

## 3. Comprehensive Test Acceptance Matrix

### 3.1 Token and Appearance Tests

| Test ID | Scenario Description | Expected Outcome | Verification Standard | Execution Status |
| :--- | :--- | :--- | :--- | :--- |
| **TST-TOK-01** | 16-Variant Contrast Suite (8 Accents × 2 Effective Moods) | Button text $\ge 4.5:1$ (or $\ge 8.0:1$ for Sunflower); large UI elements $\ge 3:1$. | WCAG 2.1 AA Relative Luminance Formula | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-02** | Persona Default Mood Resolution | Platform Operator defaults to `dark`; Public/Auth defaults to `light`; Customer defaults to `light`. | Server DOM inspection (`data-theme` on `<html>`) | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-03** | System Automatic Preference Resolution | When `theme: 'auto'`, browser evaluates `@media (prefers-color-scheme)` to select correct semantic tokens. | Headless Chrome media emulation | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-04** | Authenticated Database Precedence | Authenticated user DB preference strictly overrides client cookie and browser cache. | Next.js Server Component render test | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-05** | Guest Cookie Zod Validation | Valid `orbitox_appearance` cookie parses correctly; corrupted/tampered cookie falls back safely to persona default. | Vitest unit test with malformed payloads | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-06** | Database Downtime Graceful Degradation | If DB connection times out, validated guest cookie is served as temporary fallback without throwing 500. | Integration test with mocked DB failure | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-07** | Tenant Brand Isolation | Tenant custom variables in `[data-tenant-theme]` never override platform tokens in `:root` or Operator Console. | CSS cascade and specificity verification | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-08** | Zero FOUC & Zero Inline Scripts | Appearance `data-*` attributes render in initial server HTML; zero flash of wrong theme; zero inline scripts. | Playwright CSP and network trace audit | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-09** | Elimination of Competing Theme Writers | `theme-script.ts` cookie writes deprecated; modern shells route updates through `AppearancePersistenceController`. | Static analysis & bundle inspection | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-10** | Reload Persistence & User Isolation | Changing accent persists across page reloads; User A's preferences never bleed into User B's session. | Playwright multi-context authentication test | **NOT RUN** (Stage 0 — Pending Commit 1) |

---

### 3.2 Shell Responsiveness Tests (Four Viewports)

| Test ID | Viewport | Target Device | Navigation Model Expected | Max Width & Overflow Checks | Touch Target Check | Execution Status |
| :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| **TST-SHL-01** | `390 × 844` | iPhone 12/13/14 | Floating `BottomTabBar` ($\le 5$ items) + `MoreNavSheet` | Zero horizontal scroll (`scrollWidth === clientWidth`) | $\ge 44\text{px}$ | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-02** | `834 × 1194` | iPad Pro 11" Portrait | Floating `BottomNavPill` (centered) + slide-over sheet | Zero horizontal scroll; padding $16\text{px}$ | $\ge 44\text{px}$ | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-03** | `1194 × 834` | iPad Pro 11" Landscape | Collapsible `IconRail` ($64\text{px}$ width) | Full operational canvas utilized; padding $24\text{px}$ | $\ge 48\text{px}$ (Kitchen) | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-04** | `1440 × 900` | Desktop / MacBook | Fixed `SidebarCard` ($260\text{px}$ expanded) | Max-width $1280\text{px}$ / $1440\text{px}$ container; padding $32\text{px}$ | $\ge 36\text{px}$ (Pointer) | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-05** | Any | Keyboard Traversal | Tab order flows logically; active focus ring visible on all interactive elements. | Focus rings pass WCAG 2.4.7 / 2.4.11 | — | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-06** | Any | Reduced Motion | Animations and transitions zero out when `prefers-reduced-motion: reduce` is active. | Computed transition duration is $0\text{ms}$ | — | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-07** | All 4 Viewports | axe-core A11y Suite | Zero critical or serious accessibility violations across all persona shells. | `@axe-core/playwright` automated scan | — | **NOT RUN** (Stage 0 — Pending Commit 3) |

---

### 3.3 Compatibility & Migration Tests

| Test ID | Scenario Description | Expected Outcome | Verification Standard | Execution Status |
| :--- | :--- | :--- | :--- | :--- |
| **TST-CMP-01** | Legacy Dashboard Theme Context | `(dashboard)/layout.tsx` mounts local `ThemeProvider`; legacy theme switcher and `useTheme()` function perfectly. | Component integration test | **NOT RUN** (Stage 0 — Pending Commit 2) |
| **TST-CMP-02** | Root Provider Decoupling | `GlobalProviders` in `providers.tsx` contains only `ToastProvider`; no `ThemeProvider` or `AdminProvider` at root. | AST inspection of `providers.tsx` | **NOT RUN** (Stage 0 — Pending Commit 2) |
| **TST-CMP-03** | Console `AdminProvider` Deduplication | Single instance of `AdminProvider` in `(console)/layout.tsx`; zero duplicate provider nesting in React tree. | React DevTools tree depth inspection | **NOT RUN** (Stage 0 — Pending Commit 2) |
| **TST-CMP-04** | Legacy `--ui-*` Variable Bridging | All 17 console pages referencing `--ui-*` variables continue to render without missing styles or contrast drops. | Visual regression check of `/console/*` | **NOT RUN** (Stage 0 — Pending Commit 2) |
| **TST-CMP-05** | Elimination of Fake `href="#"` Links | All `AppShell` navigation items render semantic buttons or real router links; no fake hashes. | Automated link-crawler test | **NOT RUN** (Stage 0 — Pending Commit 4) |

---

## 4. Comprehensive Architectural Risk Register

| Risk ID | Risk Description | Severity | Probability | Mitigation Strategy | Circuit-Breaker Mechanism |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **RSK-01** | **Root Provider Decoupling Breaks Legacy Screens:** Removing `ThemeProvider` from `providers.tsx` breaks legacy dashboard pages relying on `useTheme()`. | **High** | Medium | Re-mount `ThemeProvider` locally in `apps/platform/src/app/(dashboard)/layout.tsx` before modifying `providers.tsx`. | If any consumer throws "ThemeContext not found", immediately restore local provider wrapper without touching root. |
| **RSK-02** | **Tablet Landscape Breakpoint Misclassification:** `1194px` viewport classified as desktop, forcing 260px sidebar on POS/KDS tablets. | **High** | High | Adopt formal Owner Amendment `UI-7B2-BP1` shifting desktop threshold to `1280px` (`xl`), placing `1194px` in `1024px–1279px` icon rail band. | Automated Playwright viewport assertion at `1194 × 834` verifying presence of `IconRail` and absence of `SidebarCard`. |
| **RSK-03** | **Database Failure Cascades to 500 Error in Root Layout:** Unhandled exception in `getOperatorAppearance()` crashes root layout during database blip. | **Critical** | Low | Enforce `try / catch` blocks in `RootLayout` with automatic fallback to validated `orbitox_appearance` cookie, then persona default. | Automated unit test injecting Prisma client failure and asserting 200 OK with persona default mood. |
| **RSK-04** | **Legacy `--ui-*` Consumers Break on Unbridged Tokens:** Older console modules fail to render when root styling is modernized. | **Medium** | Low | Retain `packages/ui/src/styles/theme.css` with comprehensive semantic CSS variable bridges (`--ui-bg-card: var(--color-surface);`). | Zero deletions of legacy CSS during Phase 7B.2. |
| **RSK-05** | **Tenant Custom CSS Injects Malicious Payloads:** Tenant custom branding introduces cross-site scripting or layout breakages. | **Critical** | Low | Tenant appearance endpoint accepts strictly validated hex strings and typography enum keys via Zod. Arbitrary CSS rejected. | Strict Content Security Policy (CSP) prohibiting inline styles and unsafe-inline scripts. |

---

## 5. Staged Implementation Plan (Upon Owner Authorization)

Once formal implementation authorization is granted by the repository owner, implementation will proceed across four atomic commits:

```
feat/ui-reset-7b2-theme-persona-shells
 ├── Commit 1: build(tokens): consolidate canonical design tokens and auto-mode calibration
 ├── Commit 2: refactor(providers): isolate global providers and relocate legacy ThemeProvider
 ├── Commit 3: feat(shells): implement responsive shell navigation primitives & Storybook stories
 └── Commit 4: feat(console): integrate ConsoleShell and backward-compatible AppShell adapter
```

### Commit 1: `build(tokens)`
- Consolidate canonical tokens in `primitives.css` and `semantic.css`.
- Standardize Ocean accent (`#3A6BF5` dark, `#2F5BD8` light).
- Add complete status color and accent overrides under `@media (prefers-color-scheme: light)` for `[data-theme="auto"]`.
- Deprecate `theme-script.ts` cookie writers.
- Execute automated 16-variant contrast test suite.

### Commit 2: `refactor(providers)`
- Remove `ThemeProvider` and `AdminProvider` from platform root `providers.tsx`.
- Mount `ThemeProvider` locally in `apps/platform/src/app/(dashboard)/layout.tsx`.
- Remove duplicate `AdminProvider` from `apps/platform/src/app/(console)/layout.tsx`.
- Add legacy CSS variable bridges to `packages/ui/src/styles/theme.css`.
- Verify legacy dashboard and console administrative routes.

### Commit 3: `feat(shells)`
- Implement modular primitives in `packages/ui/src/shells/primitives/`: `SidebarCard`, `IconRail`, `TopBar`, `BottomNavPill`, `BottomTabBar`, `MoreNavSheet`, `ShellContentFrame`.
- Add comprehensive Storybook stories covering all 4 test viewports (`390×844`, `834×1194`, `1194×834`, `1440×900`).
- Enforce touch-target minimums ($\ge 44\text{px}$ phone, $\ge 48\text{px}$ kitchen) and safe-area insets.

### Commit 4: `feat(console)`
- Refactor `packages/ui/src/components/app-shell.tsx` as a backward-compatible adapter over new primitives.
- Replace fake `href="#"` links with accessible typed buttons/links.
- Wire shell appearance toggle to `AppearancePersistenceController`.
- Wire `ConsoleShell` in `apps/platform/src/app/(console)/layout.tsx`.
- Run complete test suite, type-check, lint invariants, and Storybook build.

---

## 6. Scope Boundaries & Owner Alignment

### 6.1 Explicitly In-Scope for Phase 7B.2:
- Canonical design tokens, auto-mode calibration, WCAG contrast verification.
- Appearance resolution precedence, schema validation, and server-authoritative injection.
- Provider topology refactoring and legacy provider isolation.
- Modular shell navigation primitives (`SidebarCard`, `IconRail`, `TopBar`, `BottomNavPill`, `BottomTabBar`, `MoreNavSheet`, `ShellContentFrame`).
- Backward-compatible `AppShell` adapter.
- Storybook stories for all 4 device viewports.

### 6.2 Explicitly Out-of-Scope (Deferred to Later Phases):
- Root `/` route modifications (`apps/platform/src/app/(dashboard)/page.tsx`).
- Creation of Phase 7C Operator product screens (fleet telemetry, data rights, saga retry).
- Creation of Phase 7D Customer product screens (plan change, customer billing).
- Creation of Phase 7E HospitalOS screens.
- Creation of Phase 7F RestaurantOS operational screens (KDS ticket queues, POS checkout, waiter tables, menu importer).
- Deletion of legacy UI package components or stylesheets.

---

## 7. Owner Decisions Required Before Stage 1 Authorization

1. **Approval of Breakpoint Amendment `UI-7B2-BP1`:** Formally adjusting the desktop threshold from `1100px` to `1280px` (`xl`) to harmonize tablet landscape (`1194 × 834`) with iPad Pro 11" concepts.
2. **Authorization of Dedicated Implementation Branch:** Approving creation of `feat/ui-reset-7b2-theme-persona-shells` for execution once Stage 0 documentation review is accepted.
