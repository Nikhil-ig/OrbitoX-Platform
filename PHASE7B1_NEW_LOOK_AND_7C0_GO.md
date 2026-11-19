# 7B accepted; 7B.1 GO (new visual language); 7C limited to C0

From the technical lead. Base: `feat/compose-saas` at **166abcf**. **This replaces `PHASE7B_ACCEPTANCE_AND_7C_GO.md`.** Ignore that file's instruction to build console screens.

## 7B: accepted
CI is 28/28 on 166abcf, and F-1 to F-6 are verified (see the previous acceptance notes). The architecture stays: tokens, Tailwind v4, Radix, the components, the security components, the formatters, Storybook, axe and the visual baselines.

## Why 7B.1
The owner rejected the current look. He shared 12 references and approved a direction, which I built as a concept canvas of 16 screens. **The owner attaches screenshots of all of them to this message. They're the visual reference for 7B.1 and for every later screen.**

| # | Screen | Used in |
|---|---|---|
| 1 | Operator console overview (dark) | 7B.1 Showcase, then 7C |
| 2 | Customer dashboard home (light) | 7B.1 Showcase, then 7D |
| 3 | Appearance settings (interactive) | 7B.1 (built for real) |
| 4 | Diner phone, template "Saffron" | 7B.1 Showcase, then 7F |
| 5 | Console sidebar (shared) | 7B.1 AppShell |
| 6 | Organization detail | 7C |
| 7 | Tenant detail + Suspend dialog | 7B.1 Showcase (DangerousAction), then 7C |
| 8 | Billing & payments | 7C |
| 9 | Provisioning job (step timeline, retry) | 7B.1 Showcase (Stepper), then 7C |
| 10 | Data rights | 7C |
| 11 | Security & keys (rotated key shown once) | 7B.1 Showcase (CopyOnceSecret), then 7C |
| 12 | Change plan (customer) | 7D |
| 13 | Diner template gallery (customer) | 7F |
| 14 | Diner template "Noir" (paid) | 7F |
| 15 | Diner template "Fresh" (free) | 7F |
| 16 | Ask OrbitoX, AI assistant over MCP | the future AI stage, design reference only |

The sample names, numbers and prices in the screenshots are placeholders. Real screens show real data, or empty and loading states.

**7B.1 restyles the design system to that language.** It's mostly token values plus a few new components. **No console screens are built until 7B.1 is accepted.**

## The visual language (build exactly this)
1. **Shape:**
   - cards have a 28 px radius (large hero cards 32 px);
   - inner rows and list items 16–18 px;
   - **buttons, tabs, inputs, badges and nav items are pills** (`999px`);
   - icon buttons are 44 px circles.
2. **Space:**
   - generous: card padding 24–32 px, grid gap 20–24 px;
   - three **density** settings change spacing only: relaxed (×1.25), standard, compact (×0.65).
3. **Type:**
   - **Plus Jakarta Sans** (self-hosted, OFL) replaces Inter for the UI; keep Noto Sans Devanagari and JetBrains Mono;
   - headings 600, tracking −0.02 to −0.03em;
   - **"hero numbers": 48–64 px, weight 300, tracking −0.04em**, one per card with a small muted label under it.
4. **Colour, dark mood (default for the operator console):**
   - background `#0D0F12`, surface `#14171C`, raised `#1B1F25`;
   - border `rgba(255,255,255,0.06)`;
   - text `#F2F4F7`, muted `#9AA3AF`;
   - **one soft radial "glow"** of the accent behind the top of the page (about 20% opacity). Background only, never behind text.
5. **Colour, light mood (default for the customer dashboard):**
   - background a soft grey gradient `#EEF1F5`→`#E3E7EE`, white cards, text `#14161A`, muted `#5A6170`;
   - a near-black pill marks the active nav item and important badges ("Live", "Paid").
6. **Accent:**
   - one accent at a time, default **Ocean `#3D6EF5`**, used for the primary button, the active nav item and the one highlighted row;
   - the user can choose from 8 presets: Ocean, Emerald, Sunflower, Saffron, Ruby, Coral, Violet, Teal;
   - each preset defines its own foreground colour, so text on it passes 4.5:1. Add a contrast test per preset in both moods.
7. **Status pills:** soft tinted background + strong text. Good = green, warning = amber, problem = coral, info = teal. They never rely on colour alone, so the label is always there.
8. **Depth:**
   - soft, large, low shadows in light mode;
   - in dark mode, a coloured glow under the **active** element only (for example `0 18px 40px -18px accent`).
   - **No** heavy glassmorphism: `backdrop-filter` at most on the command palette and overlays.
9. **Motion:**
   - 200–300 ms ease-out on hover, press and theme change;
   - **"Smooth animations: off"**, or the OS's reduce-motion setting, sets every duration to 0.
10. **What stays plain:**
    - data tables stay simple and dense: 14 px text, 1 px row dividers, no cards per row;
    - all text keeps **WCAG 2.2 AA**. The references' faint grey text is **not** copied.
11. **No copied artwork:** no 3D illustrations or images from the references. Empty states use simple line icons until the owner buys a licensed illustration set.

## New or changed components
- **`SegmentedControl`:** the pill group with the active segment filled (Auto/Light/Dark, filters, density).
- **`HeroStat` / `StatStrip`:** a big number, label and delta, with an optional divider row of 3–4 stats.
- **`PillNav`:** the top navigation for the customer dashboard (white pill track, black active pill).
- **`AppShell` restyle:** a rounded sidebar card for the console, pill nav items with the accent fill, an optional plugin section, and the STAGING card at the bottom.
- **`ListRowLink`:** a rounded row with a status dot, title, subtitle and chevron; it can be highlighted with the accent and glow.
- **`ActivityFeed`:** a timeline with a bold actor, the action text, an outlined tag pill and the time.
- **`LiveStatusBar`** (RestaurantOS diner): the black pill with an icon, a title ("Ready in 5 min"), a subtitle ("Order #42 · 2 items · Table 7") and an action. `aria-live="polite"`.
- **`QuantityStepper`:** the split −/+ pill.
- **`MenuItemCard`:** image (or placeholder), title, tags, ₹ price "incl. GST", add button. It uses tenant theme tokens.
- **Charts:** a smooth gradient line with a dashed comparison line, and the "lollipop" daily bar (dots on thin stems, the selected day filled black with a value pill). Both use tokens and include a table fallback.
- **`Stepper` restyle (vertical):** circle status icons (done = green check, failed = coral × with glow, waiting = outlined clock), a connector line, a title, a note and a time per step. Screen 9.
- **`DangerousAction` restyle:** the dialog in screen 7. A warning icon, what happens in plain words, a reason textarea, typed confirmation, a notice that "next, confirm with your password and authenticator code", and a red primary button. **The behavior from 7B stays exactly the same.**
- **`CopyOnceSecret` restyle:** the green panel in screen 11, with a monospace key pill, "Copy" and "I've stored it". **Same behavior as 7B.**
- **`ProgressBar` and `MeterRow`:** a label, a value and a rounded bar (plan usage, export progress, revenue by product).

## Appearance settings: controlled from the web
A real feature, not just a story.
1. **Preferences:** mode (auto/light/dark), accent preset, density, corner radius (4–32, step 4), smooth animations, bold focus rings, compact sidebar.
2. **Stored per user on the server** (operators and customer users), through an API:
   - `GET/PUT /api/v1/platform/me/appearance` and `/api/v1/customer/me/appearance`;
   - validated against a fixed schema: an enum for each preference, a number range for the radius. **No free CSS or colours** (tenant brand colours are 7F's tenant theming, a separate thing);
   - a new **additive** migration adds the columns. **No edits to old migrations.**
3. **Applied on the server** as `data-*` attributes on `<html>` (`data-theme`, `data-accent`, `data-density`, `data-motion`…), with CSS variables chosen by attribute selectors. **No inline style and no inline script**, so CSP stays strict and the page doesn't flash on load.
4. **Page:** `/console/settings/appearance` (operators) and the same component in the customer dashboard later. Every change applies immediately, and a toast says "Theme updated · saved to your account".
5. **Tests:**
   - the API refuses an invalid value (unknown accent, radius 7, CSS injection strings), with 400 and the field error;
   - one user's preferences never affect another user's;
   - Playwright: change the accent and density, reload, and they persist;
   - axe passes for **every accent × mode** combination on the Foundations story.

## Storybook and visual baselines
- **Re-baseline every story** in the new look (Linux baselines used by CI, as before), including the new components.
- Add a **"Showcase"** story group that recreates **7 of the canvas screens** from real components, with mock data:
  - **1** console overview (dark);
  - **2** customer home (light);
  - **3** appearance settings;
  - **4** diner phone "Saffron";
  - **7** tenant detail with the Suspend dialog open;
  - **9** provisioning job;
  - **11** security & keys with a rotated key.

  This is the owner's review surface. The other screens are built in their own stages.
- `/console/design-system` shows the same showcase inside the app.

## Rules (unchanged)
- No existing app page changes in 7B.1, except `/console/design-system` and the new appearance page.
- Every pushed commit is in the report with its CI result, output is verbatim, and **NOT RUN** comes with a reason.
- All existing CI jobs stay green with the same test counts.

## Plan for later stages (don't build now, but don't block it)
The owner added two product features. They're **not** part of 7B.1. Keep the foundations compatible.
1. **Diner templates, a marketplace** (built in 7F):
   - an organization or tenant picks how its diners see it from a gallery of **free and paid** templates (screens 13–15);
   - **a template is data, not code:** a versioned record of a token set (colours, radius, fonts), layout options (cards / list / photo grid) and section switches (top dishes, live order bar, veg filter);
   - the tenant's brand colour is applied on top and must pass the contrast check;
   - switching templates never changes menus, prices or orders, and needs no redeploy;
   - paid templates unlock through the **existing plan and entitlement system** (a grant line item), not a separate payment path.

   **For 7B.1:** make sure the 7B `applyTenantTheme` API can take a whole token set (a template) plus a brand override, not just a few colours. A unit test is enough. No UI.
2. **AI assistant over MCP** (its own stage after the screens, screen 16):
   - the assistant uses an MCP server that exposes OrbitoX tools;
   - each tool has a permission level the owner sets: read freely / ask first / ask + re-authentication / never through AI;
   - it acts **as the signed-in user**, with that user's role, so it can never do more than they could by hand;
   - actions are **drafted, then approved by the user** in the UI;
   - every tool call goes to the audit log.

   **For 7B.1:** nothing. **For 7C:** every console action must go through a server-side function with an explicit permission check (no logic only in page handlers), so the same functions can later be exposed as MCP tools.

## 7C: only C0 for now
In parallel, you may do **7C step C0 only**: `docs/console/parity.md`, the inventory of all 40 `/admin` and `/platform` pages with migrate / merge / drop, the APIs and actions each one uses, and the drop list for the owner.
- **Map every old page onto the new navigation** from screen 5: Overview, Organizations, Tenants, Provisioning, Billing, Data rights, Security & keys, Audit log, Settings (and later Ask OrbitoX).
- For each section, list the APIs that exist and the ones screens 6–11 would need but are missing. Read-only first, as in the earlier 7C brief.
- **No console screens.**
- The C1 navigation follows 7B.1's AppShell once that's accepted.

## Report (stop for review)
- Commits with CI.
- **Screenshots of the 7 Showcase screens** (dark and light where it applies, desktop and mobile), side by side with the owner's concept screenshots.
- The `applyTenantTheme` template token-set test.
- Each accent in both modes on the Foundations story.
- Appearance API tests, Playwright persistence, axe results.
- The new baseline count.
- `docs/console/parity.md`.
