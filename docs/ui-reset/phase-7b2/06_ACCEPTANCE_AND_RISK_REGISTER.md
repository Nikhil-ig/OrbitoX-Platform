# 🪐 OrbitoX Phase 7B.2 — Test Acceptance Matrix & Architectural Risk Register

**Specification ID:** `ARCH-7B2-06-ACCEPTANCE`  
**Phase:** Phase 7B.2 — Theme Tokens & Persona Shell Architecture  
**Document Status:** Approved Architecture Contract  
**Governing Documents:** `PHASE7_UI_MASTER_BRIEF.md`, `docs/ui-reset/04_UI_ACCEPTANCE_MATRIX.md`  
**Accepted Baseline:** `f65698eab17b3a40842360eaeb387c74dca57ecc`  
**Author:** Principal Frontend & Platform Architect  
**Date:** November 17, 2026 (Revised)  

---

## 1. Executive Summary & Delivery Governance

This document establishes the binding quality assurance contract, automated testing harness requirements, risk mitigations, and execution governance for Phase 7B.2.

### 1.1 Documentation Delivery Reconciliation (Correction R7-A & R7-B)
1. **Dedicated Documentation Branch:** All Stage 0 documentation deliverables reside on the dedicated branch `docs/phase-7b2-stage0-revision`, branched directly from the accepted Phase 7B.1 baseline SHA `f65698eab17b3a40842360eaeb387c74dca57ecc` and pushed to `origin/docs/phase-7b2-stage0-revision`.
2. **Exhaustive Deliverables Census:** All seven specifications are delivered independently under `docs/ui-reset/`:
   - Primary Blueprint: `docs/ui-reset/05_PHASE_7B2_THEME_TOKENS_AND_PERSONA_SHELLS.md`
   - Supporting Specifications:
     - `docs/ui-reset/phase-7b2/01_VISUAL_REFERENCE_INVENTORY.md`
     - `docs/ui-reset/phase-7b2/02_TOKEN_AND_THEME_OWNERSHIP.md`
     - `docs/ui-reset/phase-7b2/03_PROVIDER_AND_LEGACY_MIGRATION.md`
     - `docs/ui-reset/phase-7b2/04_PERSONA_SHELL_CONTRACTS.md`
     - `docs/ui-reset/phase-7b2/05_RESPONSIVE_NAVIGATION_MATRIX.md`
     - `docs/ui-reset/phase-7b2/06_ACCEPTANCE_AND_RISK_REGISTER.md`
3. **Implementation Branch Protection:** The feature branch `feat/ui-reset-7b2-theme-persona-shells` remains implementation-inactive until the repository owner grants formal authorization.
4. **Current Execution Status:** Stage 0 (Architecture & Planning). In accordance with Stage 0 restrictions, **no application source code has been altered**. Future implementation tests are marked **`NOT RUN (Stage 0 Design Phase — Awaiting Implementation Authorization)`**.

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
| **TST-TOK-01** | 16-Variant Computed Contrast Suite (8 Accents × 2 Effective Moods) | Button text $\ge 4.5:1$ (or $\ge 8.0:1$ for Sunflower); non-text controls $\ge 3:1$ (Sunflower uses contrast-safe token `#B45309` $\ge 4.0:1$). Evaluated on **computed styles after CSS cascade**. | WCAG 2.2 AA Relative Luminance with sRGB Linearization | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-02** | Persona-Specific Explicit Default Mood Resolution | Platform Operator defaults to `dark`; Staff defaults to `dark` (POS override `light`); Public/Auth/Customer defaults to `light`. | Server DOM inspection (`data-theme` on `<html>`) | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-03** | System Automatic Preference Resolution | When user explicitly chose `theme: 'auto'`, browser evaluates `@media (prefers-color-scheme)` to select correct semantic tokens. | Headless Chrome media emulation | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-04** | Authenticated Database Precedence | Authenticated user DB preference strictly overrides client cookie and browser cache. | Next.js Server Component render test | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-05** | Guest Cookie Zod Validation | Valid `orbitox_appearance` cookie parses correctly; corrupted/tampered cookie falls back safely to persona default. | Vitest unit test with malformed payloads | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-06a** | Database Downtime Graceful Degradation (Case A: Cookie Available) | When DB connection times out/fails and client presents a cryptographically valid `orbitox_appearance` cookie, the server renders the cached provisional appearance without throwing 500. | Integration test with mocked DB failure + valid cookie | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-06b** | Database Downtime Graceful Degradation (Case B: First-time Guest / Missing Cookie) | When DB connection times out/fails and no valid cookie is present, the server renders the authoritative persona default mood without throwing 500. | Integration test with mocked DB failure + empty cookie jar | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-07** | Tenant Brand Isolation | Tenant custom variables in `[data-tenant-theme]` never override platform tokens in `:root` or Operator Console. | CSS cascade and specificity verification | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-08** | Zero FOUC & Zero Custom Theme Scripts | Appearance `data-*` attributes render in initial server HTML; zero flash of wrong theme; zero custom inline bootstrap scripts (conforming to strict CSP). | Playwright CSP and network trace audit | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-09** | Elimination of Competing Theme Writers | `theme-script.ts` cookie writes deprecated; modern shells route updates through controlled callbacks to persistence controller. | Static analysis & bundle inspection | **NOT RUN** (Stage 0 — Pending Commit 1) |
| **TST-TOK-10** | Reload Persistence & User Isolation | Changing accent persists across page reloads; User A's preferences never bleed into User B's session. | Playwright multi-context authentication test | **NOT RUN** (Stage 0 — Pending Commit 1) |

---

### 3.2 Shell Responsiveness Tests (Four Viewports & Edge Cases)

| Test ID | Viewport | Target Device | Navigation Model Expected | Max Width & Overflow Checks | Touch Target Check | Execution Status |
| :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| **TST-SHL-01** | `390 × 844` | iPhone 12/13/14 | Floating `BottomTabBar` ($\le 5$ items) + `MoreNavSheet` | Zero horizontal scroll (`scrollWidth === clientWidth`) | $\ge 44\text{px}$ (WCAG 2.2 AA SC 2.5.8 compliant) | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-02** | `834 × 1194` | iPad Pro 11" Portrait | Floating `BottomNavPill` (centered) + slide-over sheet | Zero horizontal scroll; padding $16\text{px}$ | $\ge 44\text{px}$ | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-03** | `1194 × 834` | iPad Pro 11" Landscape | Collapsible `IconRail` ($64\text{px}$ width) | Full operational canvas utilized; padding $24\text{px}$ | $\ge 52\text{px}$ (Kitchen KDS & POS actions) | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-04** | `1440 × 900` | Desktop / MacBook | Fixed `SidebarCard` ($260\text{px}$ expanded) | Max-width $1280\text{px}$ / $1440\text{px}$ container; padding $32\text{px}$ | $44–48\text{px}$ bounding hit target ($20\text{px}$ glyph) | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-05** | `844 × 390` | Phone Landscape | TopBar collapses to $40\text{px}$; bottom navigation docks to minimal pill/rail | Sheet max height $100\text{vh} - 32\text{px}$; zero vertical obscuration | $\ge 44\text{px}$ | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-06** | `639 / 640px` | Phone/Tablet Boundary | $639\text{px}$ renders `BottomTabBar`; $640\text{px}$ renders `BottomNavPill` | Zero layout pop, jitter, or overlapping elements | $\ge 44\text{px}$ | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-07** | `1023 / 1024px` | Portrait/Landscape Boundary | $1023\text{px}$ renders `BottomNavPill`; $1024\text{px}$ renders $64\text{px}$ `IconRail` | Clean horizontal space reclamation | $\ge 44\text{px}$ / $\ge 52\text{px}$ | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-08** | `1279 / 1280px` | Landscape/Desktop Boundary | $1279\text{px}$ renders $64\text{px}$ `IconRail`; $1280\text{px}$ renders $260\text{px}$ `SidebarCard` | Smooth transition; zero card clipping | $44–48\text{px}$ hit target | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-09** | `1100 × 900` | Desktop Split-Screen | 64px `IconRail` active in split-screen window; zero horizontal overflow | Card content wraps cleanly without truncation | $44–48\text{px}$ hit target | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-10** | Any | Keyboard Traversal | Tab order flows logically; active focus ring visible on all interactive elements. | Focus rings pass WCAG 2.4.7 / 2.4.11 | — | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-11** | Any | Reduced Motion | Animations and transitions zero out when `prefers-reduced-motion: reduce` is active. | Computed transition duration is $0\text{ms}$ | — | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-SHL-12** | All 4 Viewports | axe-core A11y Suite | Zero critical or serious accessibility violations across all persona shells. | `@axe-core/playwright` automated scan (WCAG 2.2 AA) | — | **NOT RUN** (Stage 0 — Pending Commit 3) |

---

### 3.3 Compatibility & Migration Tests

| Test ID | Scenario Description | Expected Outcome | Verification Standard | Execution Status |
| :--- | :--- | :--- | :--- | :--- |
| **TST-CMP-01** | Legacy Dashboard Theme Context | `(dashboard)/layout.tsx` mounts local `ThemeProvider`; legacy theme switcher and `useTheme()` function perfectly. | Component integration test | **NOT RUN** (Stage 0 — Pending Commit 2) |
| **TST-CMP-02** | Root Provider Decoupling | `GlobalProviders` in `providers.tsx` contains only `ToastProvider`; no `ThemeProvider` or `AdminProvider` at root. | AST inspection of `providers.tsx` | **NOT RUN** (Stage 0 — Pending Commit 2) |
| **TST-CMP-03** | Console `AdminProvider` Deduplication | Single instance of `AdminProvider` in `(console)/layout.tsx`; zero duplicate provider nesting in React tree. | React DevTools tree depth inspection | **NOT RUN** (Stage 0 — Pending Commit 2) |
| **TST-CMP-04** | Legacy `--ui-*` Variable Bridging Across All Console & Platform Routes | All console pages (`/console/*`), platform governance pages (`/platform/*`), and admin pages (`/admin/*`) referencing `--ui-*` variables continue to render without missing styles or contrast drops. | Automated visual regression suite covering `/console/*`, `/platform/*`, and `/admin/*` routes | **NOT RUN** (Stage 0 — Pending Commit 2) |
| **TST-CMP-05** | Elimination of Fake `href="#"` Links | All `AppShell` navigation items render semantic buttons or real router links; no fake hashes. | Automated link-crawler test | **NOT RUN** (Stage 0 — Pending Commit 4) |
| **TST-CMP-06** | Package Dependency Invariant | `packages/ui` contains zero imports from `apps/platform`. | ESLint import rule / dep-check | **NOT RUN** (Stage 0 — Pending Commit 3) |
| **TST-CMP-07** | Dashboard HMS Governance Dock Provider Resolution | When `PlatformGovernanceDock` mounts in `(dashboard)/layout.tsx` for HospitalOS routes, `useAdmin()` resolves cleanly without throwing uncaught Context errors. | Vitest/Playwright route test for `/dashboard` with `activeServiceId` | **NOT RUN** (Stage 0 — Pending Commit 2) |

---

## 4. Comprehensive Architectural Risk Register

| Risk ID | Risk Description | Severity | Probability | Mitigation Strategy | Circuit-Breaker Mechanism |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **RSK-01** | **Root Provider Decoupling Breaks Legacy Screens:** Removing `ThemeProvider` from `providers.tsx` breaks legacy dashboard pages relying on `useTheme()`. | **High** | Medium | Re-mount `ThemeProvider` locally in `apps/platform/src/app/(dashboard)/layout.tsx` before modifying `providers.tsx`. | If any consumer throws "ThemeContext not found", immediately restore local provider wrapper without touching root. |
| **RSK-02** | **Tablet Landscape Breakpoint Misclassification:** `1194px` viewport classified as desktop, forcing 260px sidebar on POS/KDS tablets. | **High** | High | Adopt formal Owner Amendment `UI-7B2-BP1` shifting desktop threshold to `1280px` (`xl`), placing `1194px` in `1024px–1279px` icon rail band. | Automated Playwright viewport assertion at `1194 × 834` verifying presence of `IconRail` and absence of `SidebarCard`. |
| **RSK-03** | **Database Failure Cascades to 500 Error in Root Layout:** Unhandled exception in `getOperatorAppearance()` crashes root layout during database blip. | **Critical** | Low | Enforce `try / catch` blocks in `RootLayout` with automatic fallback to validated `orbitox_appearance` cookie, then persona default. | Automated unit test injecting Prisma client failure and asserting 200 OK with persona default mood. |
| **RSK-04** | **Legacy `--ui-*` Consumers Break on Unbridged Tokens:** Older console modules fail to render when root styling is modernized. | **Medium** | Low | Retain `packages/ui/src/styles/theme.css` with comprehensive semantic CSS variable bridges (`--ui-bg-card: var(--color-surface);`). | Zero deletions of legacy CSS during Phase 7B.2. |
| **RSK-05** | **Tenant Custom CSS Injects Malicious Payloads:** Tenant custom branding introduces cross-site scripting or layout breakages. | **Critical** | Low | Tenant appearance endpoint accepts strictly validated hex strings and typography enum keys via Zod. Arbitrary CSS injections are rejected at the API boundary. The Content Security Policy (CSP) enforces zero custom theme-bootstrap scripts; React component inline style props are allowed for dynamic layout calculations, but arbitrary `<style>` tags and unsafe-inline script blocks are barred. | Validation rejects payloads containing tags, url(), expressions, or unparsed CSS. |
| **RSK-06** | **Nested ConsoleShell Rendering:** Centralizing `ConsoleShell` into `(console)/layout.tsx` wraps legacy `admin/*` and causes double-shells over existing page-level shells. | **High** | High | Retain `ConsoleShell` at the `/console` route boundary and keep existing page-level wrappers intact during 7B.2. | Automated Playwright selector test asserting exactly 1 `<header>` and 1 `<aside>` in DOM. |

---

## 5. Staged Implementation Plan (Upon Owner Authorization)

```
feat/ui-reset-7b2-theme-persona-shells
 ├── Commit 1: build(tokens): consolidate canonical design tokens and auto-mode calibration
 ├── Commit 2: refactor(providers): isolate global providers and relocate legacy ThemeProvider
 ├── Commit 3: feat(shells): implement responsive shell navigation primitives & Storybook stories
 └── Commit 4: feat(console): integrate ConsoleShell adapter and verify console route parity
```

- **Commit 1 (`build(tokens)`):** Fix CSS cascade order in `semantic.css`, standardize Ocean accent, complete `auto` mode mappings, deprecate `theme-script.ts` cookie writes, execute 16-variant computed contrast suite.
- **Commit 2 (`refactor(providers)`):** Clean `providers.tsx`, relocate `ThemeProvider` into `(dashboard)/layout.tsx`, keep `AdminProvider` local, add `--ui-*` CSS variable bridges.
- **Commit 3 (`feat(shells)`):** Implement modular shell primitives (`SidebarCard`, `IconRail`, `TopBar`, `BottomNavPill`, `BottomTabBar`, `MoreNavSheet`, `ShellContentFrame`) with controlled presentation props. Add Storybook stories for all 4 viewports.
- **Commit 4 (`feat(console)`):** Refactor `AppShell` as a backward-compatible adapter over new primitives with normalized non-breaking `NavItem` semantics. Verify console routes and run full CI.

---

## 6. Scope Boundaries & Owner Decisions Required

### 6.1 Strict Boundaries
- **Strictly In-Scope:** Design tokens, auto-mode calibration, appearance resolution precedence, provider topology refactoring, modular shell primitives, `AppShell` backward-compatible adapter, Storybook stories for all 4 viewports.
- **Strictly Out-of-Scope:** Root `/` route changes (`apps/platform/src/app/(dashboard)/page.tsx`), Phase 7C–7F product screens (KDS queues, POS checkout, waiter tables, menu CSV importer, customer billing, hospital clinical workflows), deletions of legacy UI files.

### 6.2 Owner Decisions Required Before Stage 1 Authorization
1. **Approval of Breakpoint Amendment `UI-7B2-BP1` (`Proposed — Pending Owner Approval`):** Formally adjusting desktop threshold from `1100px` to `1280px` (`xl`) to harmonize tablet landscape (`1194 × 834`) with iPad Pro 11" concepts.
2. **Authorization of Dedicated Implementation Branch:** Authorizing the creation/activation of `feat/ui-reset-7b2-theme-persona-shells` to begin Commit 1.
