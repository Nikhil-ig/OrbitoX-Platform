# OrbitoX UI master brief: new look, every surface, every device

From the technical lead. Base: `feat/compose-saas` at **166abcf** (7B accepted, CI 28/28).

**This replaces `PHASE7B_ACCEPTANCE_AND_7C_GO.md` and `PHASE7B1_NEW_LOOK_AND_7C0_GO.md`.** Ignore both.

The owner rejected the old look and approved a new direction, built as a concept canvas of **44 screens**. The owner attaches a screenshot of each one, named by the IDs in section 2. **The screenshots are the visual reference for all UI work from now on.**

**What to build now:** section 6 only (stage 7B.1 plus the 7C inventory). Everything else in this brief is the plan for later stages, so that today's work doesn't block it. Stop for review after section 6.

---

## 1. The visual language
1. **Shape:**
   - cards have a 28 px radius (hero cards 32 px);
   - inner rows 16–22 px;
   - **buttons, tabs, inputs, badges and nav items are pills** (`999px`);
   - icon buttons are 44–48 px circles.
2. **Type:**
   - **Plus Jakarta Sans** (self-hosted, OFL) for the UI; keep Noto Sans Devanagari and JetBrains Mono;
   - headings weight 600, tracking −0.02 to −0.03em;
   - **hero numbers:** 44–64 px, weight 300 (dark) or 600 (light), tracking −0.04em, one per card with a small muted label.
3. **Two moods, same components:**
   - **Dark:** background `#0D0F12`, surface `#14171C`, raised `#1B1F25`, border `rgba(255,255,255,0.06)`, text `#F2F4F7`, muted `#9AA3AF`. One soft radial glow of the accent behind the top of the page, never behind text.
   - **Light:** background gradient `#EEF1F5`→`#E3E7EE`, white cards with a soft low shadow (`0 30px 60px -44px rgba(20,22,26,0.35)`), text `#14161A`, muted `#5A6170`. A near-black pill (`#14161A`) marks the active nav item, the hero card and important badges.
4. **Which mood where (defaults; each user can switch in Appearance):**
   - **dark:** operator console, and staff screens used during service (kitchen, waiter phone, host stand);
   - **light:** customer dashboard, sign-up flow, restaurant owner admin, POS, orders, invoices, reports.
5. **Accent:** one at a time. Ocean `#3D6EF5` on dark, `#2F5BD8` on light. It marks the primary action, the active item and the one highlighted row or card (solid fill plus a coloured glow below it on dark). 8 user-selectable presets: Ocean, Emerald, Sunflower, Saffron, Ruby, Coral, Violet, Teal. Each defines its own foreground so text on it passes 4.5:1.
6. **Status colours:** good = green, warning = amber, problem = coral/red, info = blue. Always with a text label, never colour alone.
7. **Tenant brand colour** (orange in the screenshots) appears **only** where it is the restaurant's own brand: diner templates, the restaurant's logo tile, brand settings. It is never an OrbitoX UI colour.
8. **Lists are cards, not tables,** wherever a person acts on single items (orders, tenants needing attention, staff on phone). Dense tables remain for audit logs, payments and exports: 14 px text, 1 px dividers.
9. **Motion:** 200–300 ms ease-out. "Smooth animations: off" or the OS reduce-motion setting sets every duration to 0.
10. **Accessibility is not negotiable:** WCAG 2.2 AA in both moods, touch targets ≥ 44 px, real `<button>`/`<a>`/`<input>` elements, visible focus. The faint grey text of the owner's inspiration images is **not** copied.
11. **No copied artwork.** No 3D illustrations, no stock photos. Dish and logo images are tenant uploads; until one exists, show a neutral placeholder tile.

**All names, numbers and prices in the screenshots are sample data.** Real screens show real data, or designed empty, loading and error states (screen P1).

## 2. Screen index (screenshot file names start with the ID)
| ID | Screen | Device | Mood | Stage |
|---|---|---|---|---|
| A1 | Operator console overview | desktop | dark | 7B.1 showcase → 7C |
| A2 | Customer dashboard home | desktop | light | 7B.1 showcase → 7D |
| A3 | Appearance settings (interactive) | desktop | dark | **7B.1 (real)** |
| A4 | Diner template "Saffron" (free) | phone | tenant | 7B.1 showcase → 7F |
| C0 | Console sidebar | desktop | dark | 7B.1 |
| C1 | Organization detail | desktop | dark | 7C |
| C2 | Tenant detail + Suspend dialog | desktop | dark | 7B.1 showcase → 7C |
| C3 | Billing & payments | desktop | dark | 7C |
| C4 | Provisioning job, retry | desktop | dark | 7B.1 showcase → 7C |
| C5 | Data rights | desktop | dark | 7C |
| C6 | Security & keys | desktop | dark | 7B.1 showcase → 7C |
| U1 | Change plan | desktop | light | 7D |
| U2 | Diner template gallery | desktop | light | 7F |
| U3 | Diner template "Noir" (paid) | phone | tenant | 7F |
| U4 | Diner template "Fresh" (free) | phone | tenant | 7F |
| AI1 | Ask OrbitoX (AI over MCP) | desktop | dark | 7G |
| F1 | Sign up | desktop | light | 7D |
| F2 | Create organization | desktop | light | 7D |
| F3 | Add restaurant (+ template, starter menu) | desktop | light | 7D |
| F4 | First login: site live in preview | desktop | light | 7D + 7F |
| F5 | Choose plan and pay | desktop | light | 7D |
| F6 | You're live: setup checklist | desktop | light | 7F |
| R0 | RestaurantOS sidebar | desktop | light | 7F |
| R1 | Today | desktop | light | 7F |
| R2 | Branches + edit panel | desktop | light | 7F |
| R3 | Floors & tables editor (interactive) | desktop | light | 7F |
| R4 | Menu + edit item | desktop | light | 7F |
| R5 | Staff & roles | desktop | light | 7F |
| R6 | Settings: brand, domain, GST, payments, danger zone | desktop | light | 7F |
| P1 | Pop-ups, toasts, banners, empty/loading/error states | — | light | 7B.1 (components) |
| S1 | Kitchen screen (interactive) | tablet landscape | dark | 7F |
| S2 | POS: take order and checkout (interactive) | tablet landscape | light | 7F |
| S3 | Orders | desktop | light | 7F |
| S4 | Invoices & GST | desktop | light | 7F |
| S5 | Reports | desktop | light | 7F |
| D1 | Owner phone: Today | phone | light | 7F |
| D2 | Owner phone: Orders | phone | light | 7F |
| D3 | Owner phone: Edit dish (bottom sheet) | phone | light | 7F |
| D4 | Waiter phone: My tables | phone | dark | 7F |
| D5 | Waiter phone: Take order (interactive) | phone | dark | 7F |
| D6 | Phone: first login preview | phone | light | 7D + 7F |
| D7 | Operator console on a phone | phone | dark | 7C |
| D8 | Customer dashboard on a phone | phone | light | 7D |
| D9 | Host stand: live floor (interactive) | tablet portrait | dark | 7F |

**HospitalOS (7E) has no concept screens yet.** Don't design it yourself. The owner will supply them before 7E starts.

## 3. Built for each device, not squeezed onto it
Every surface works on phone, tablet and desktop. **A phone layout is not the desktop layout stacked.** Each page defines three layouts from the same components.

| | Phone (< 640 px) | Tablet (640–1100 px) | Desktop (> 1100 px) |
|---|---|---|---|
| Navigation | **floating pill tab bar** at the bottom (≤ 5 items, the main action in the middle), everything else under "More" | bottom bar in portrait, rail in landscape | sidebar card |
| Detail / edit | **bottom sheet** with a drag handle | side sheet | side panel beside the list |
| Lists | cards; **swipe to act** always has a visible button alternative | cards in 2 columns | cards or dense table |
| Titles | large title (32–34 px), one hero card first | — | 40–44 px page title |
| Primary action | one, fixed at the bottom in thumb reach | bottom or top right | top right |
| Dialogs | full-width sheet | centred dialog | centred dialog |

Rules:
1. **Installable web app (PWA)** for platform and RestaurantOS web: manifest, icons, theme colour per mood, standalone display, safe-area insets (`env(safe-area-inset-*)`). No native app.
2. **Staff service screens are device-specific by design:** S1 kitchen and S2 POS target a landscape tablet; D4/D5 the waiter's phone; D9 a portrait tablet. They must still be usable at other sizes, but those are the sizes they're designed for.
3. **Touch first on phone and tablet:** targets ≥ 44 px (≥ 52 px on kitchen and POS), no hover-only actions, no tiny table rows.
4. **Offline:** the banner "You're offline…" in P1 is a design reference only. **Do not promise offline ordering.** In the 7F inventory, report what offline support RestaurantOS really has today (station secrets suggest some). The owner decides scope after that.
5. **Tests:** Playwright runs every page at 390×844, 834×1194, 1194×834 and 1440×900, light and dark, with axe; no horizontal page scroll at any size.

## 4. New product features in the screenshots (each needs backend work)
None of these are built in 7B.1. For each, the owning stage starts with a short design note for review **before** code. All the standing rules apply: additive migrations only, RLS and role checks never weakened, no invented fallbacks, tests for every permission.

1. **Appearance preferences (7B.1, real).** See section 6.
2. **Preview mode, "see it before you pay" (7D + 7F; screens F4, D6).**
   - A new tenant is provisioned in state **PREVIEW**: the real site with a sample menu; diners can browse.
   - **Ordering is refused on the server** while in PREVIEW, except **test orders** placed by the signed-in owner.
   - Test orders are flagged in the database, never get a GST invoice number, never appear in reports, and are **deleted when the tenant goes live**.
   - Going live = successful subscription payment (the existing Razorpay flow and billing guard). A preview that is never paid expires after a period the owner sets (default 14 days), then follows the normal deletion path.
   - Tests: an anonymous diner cannot order in PREVIEW; a test order can't leak into invoices, GST totals or reports; go-live purges them.
3. **Sample menu (7F; F3, R4).** Sample dishes are flagged, shown with a "Sample" badge to the owner, and removable in one action. They must never be sold unnoticed: the checklist (F6) keeps "Replace the sample menu" open until none remain.
4. **Menu import from a spreadsheet (7F).** CSV/XLSX upload → the owner reviews every row before anything is saved. **Menu import from a photo is not built** unless the owner approves it separately (it needs an AI/OCR service and a data-handling decision).
5. **Diner templates, free and paid (7F; U2–U4, A4).**
   - **A template is data, not code:** a versioned record of a token set, layout options (cards / list / photo grid) and section switches (top dishes, live order bar, veg filter).
   - The tenant's brand colour is applied on top and must pass the contrast check (7B `applyTenantTheme`).
   - Switching never changes menus, prices or orders, and needs no redeploy. "Publish to diners" is explicit; there's a preview before publishing.
   - Paid templates unlock through the **existing plan / entitlement grant**, not a separate payment path.
6. **Owner admin editing (7F; R1–R6).** Most of this exists in RestaurantOS today (branches, floors, tables with shape, position and QR, menu with per-branch overrides, staff roles and PINs, custom domains, onboarding steps, plan limits). The 7F inventory lists, per screen, which API exists and which is missing. **Branch-level authorization (`BRANCH_MISMATCH`) applies to every new endpoint**, and the branch-isolation suite is extended to cover them.
7. **GST behaviour without a GSTIN (7F; R6).** The three options in R6 are a product decision for the owner's accountant. **Default stays "refuse to issue a tax invoice"** (B0-11). Don't build the other two until the owner confirms.
8. **GSTR-1 export and Reports (7F; S4, S5).** New read-only features. The export format is confirmed with the owner's accountant before it is built. Numbers come from invoices, not from orders.
9. **Diner payments to the restaurant's own Razorpay account (7F; R6).** `TenantPaymentConfig` exists. Secrets are entered by the tenant owner, stored encrypted, never shown again, never exported (6G deny-list).
10. **Waitlist and "seat a party" (7F; D9).** Report in the inventory whether any waitlist model exists. If not, it's a new small feature with its own note.
11. **AI assistant over MCP (7G; AI1, D7).**
    - An MCP server exposes OrbitoX tools. Each tool has a permission level the owner sets: **read freely / ask first / ask + re-authentication / never through AI** (data erasure is always "never").
    - The assistant acts **as the signed-in user with that user's role**, so it can never do more than they could by hand.
    - Every action is **drafted, then approved by the user in the UI**; every tool call is written to the audit log.
    - Untrusted text (tenant names, ticket text, menu items) is treated as data and can never trigger a tool.
    - **Required from 7C onwards:** every console action is a server-side function with an explicit permission check, not logic inside a page handler, so the same function can become an MCP tool later.

**Shown in the screenshots but NOT approved to build** (owner decides; leave them out until told):
- **"Continue with Google"** on F1. Email + password + email code is the supported sign-up.
- **"Impersonate (read-only)"** on C1. Operator access to a customer's view is a sensitive feature that needs its own security design.
- **Plan and template prices.** Plans are migration-managed. Never hard-code a price from a screenshot.

## 5. Stages after this brief
| Stage | Scope |
|---|---|
| **7B.1** | restyle the design system, new components, Appearance, showcase (**now**) |
| **7C** | operator console (A1, C0–C6, D7) |
| **7D** | customer dashboard and sign-up flow (A2, U1, F1–F5, D6, D8) |
| **7E** | HospitalOS staff app (screens to come from the owner) |
| **7F** | RestaurantOS: owner admin, service screens, diner templates, phone and tablet (R0–R6, S1–S5, U2–U4, A4, F6, D1–D5, D9) |
| **7G** | AI assistant over MCP (AI1) |
| then | 6H / 6I, then VPS staging |

Each stage gets its own GO with details, starts with an inventory (what exists, what's missing), and stops for review.

---

## 6. Build now: 7B.1 + the 7C inventory
### 6.1 Restyle `@orbitox-io/ui`
1. **Tokens** to section 1: both moods, the 8 accent presets (with a contrast test per preset per mood), radius, density (relaxed ×1.25 / standard / compact ×0.65), shadows, glow, motion. Plus Jakarta Sans self-hosted with its OFL licence file.
2. **Restyle the existing components** (behaviour unchanged, tests unchanged): Button, inputs, Tabs, Badge/StatusPill, Card, Dialog/AlertDialog/Sheet, Toast, Banner, DataTable, AppShell, Stepper, **DangerousAction** (C2), **CopyOnceSecret** (C6), MaskedField, EmptyState/ErrorState/Skeleton (P1).
3. **New components:**
   - `SegmentedControl`, `PillNav`, `HeroStat` / `StatStrip`, `ProgressBar` / `MeterRow`;
   - `ListRowLink` and `ActionCard` (status, title, subtitle, progress, optional accent highlight);
   - `ActivityFeed`;
   - `BottomTabBar` (floating pill, centre action), `BottomSheet` (drag handle, focus trap, Escape/back closes), `SwipeActions` (always with a visible button alternative);
   - `RingTimer` (S1), `QuantityStepper`, `LiveStatusBar` (`aria-live="polite"`), `MenuItemCard`, `VegMark`;
   - `FloorPlan` (tables positioned from data; selectable; keyboard reachable; **read-only in 7B.1**, editing comes in 7F);
   - charts: gradient line with dashed comparison, lollipop daily bars, hourly bars, each with a table fallback.
4. **`applyTenantTheme`** accepts a whole template token set plus a brand override (unit test only, no UI).
5. **Lint invariants** from 7B still pass: no hex in components, no inline style, no `dangerouslySetInnerHTML`, no hard-coded strings.

### 6.2 Appearance settings (A3), a real feature
1. Preferences: mode (auto/light/dark), accent preset, density, corner radius (4–32, step 4), smooth animations, bold focus rings, compact sidebar.
2. Stored **per user on the server**: `GET/PUT /api/v1/platform/me/appearance` (operators) and `/api/v1/customer/me/appearance` (customers). Fixed schema, enums and a number range only. **No free CSS or colours.** New additive migration.
3. Applied on the server as `data-*` attributes on `<html>`; CSS variables switch by attribute selector. **No inline style, no inline script** (CSP stays strict, no flash on load).
4. Page `/console/settings/appearance`; changes apply at once with the toast "Theme updated · saved to your account".
5. Tests: invalid values (unknown accent, radius 7, CSS-injection strings) → 400 with the field error; one user's preferences never affect another's; Playwright: change accent and density, reload, they persist; axe passes for **every accent × mode**.

### 6.3 Showcase (the owner's review surface)
Storybook group "Showcase", also shown at `/console/design-system`, rebuilding these screens **from real components with mock data**:

**A1, A2, A3, A4, C2, C4, C6, P1, S1, D1, D4.**

Each at its own device size, in its own mood. Phone and tablet showcases use `BottomTabBar` / `BottomSheet`, not a shrunk desktop layout.

### 6.4 7C inventory only (no screens)
`docs/console/parity.md`:
- all 40 `/admin` and `/platform` pages mapped onto the new navigation (Overview, Organizations, Tenants, Provisioning, Billing, Data rights, Security & keys, Audit log, Settings, later Ask OrbitoX), each marked migrate / merge / drop with the APIs and actions it uses;
- for screens A1 and C1–C6: which API exists, which is missing (read-only first);
- **the drop list for the owner.** Nothing is deleted without the owner's yes.

### 6.5 Rules
- No existing app page changes in 7B.1 except `/console/design-system` and the new appearance page.
- All existing CI jobs stay green with the same test counts. Visual baselines are re-made for the new look (Linux, as before).
- Every pushed commit is in the report with its CI result. Output is pasted verbatim. Anything not run is **NOT RUN** with the true reason. Report text is taken from the code, not from memory.

### 6.6 Report, then stop
- Commits with CI run URLs.
- Screenshots of the 11 showcase screens next to the owner's concept screenshots, at the right device sizes, light and dark where both apply.
- Every accent in both moods on the Foundations story.
- Appearance API tests, Playwright persistence, axe results, bundle sizes, the new baseline count.
- `docs/console/parity.md` with the drop list.
- A short list of anything in the screenshots you could not match with the design system, and why.
