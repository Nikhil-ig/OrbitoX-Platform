# Program GO: 6G data rights → cleanup and restructure → design system → new interface

From the technical lead. Base: `feat/compose-saas` at **cbac4b3** (CI #281 green).

## Owner decisions (recorded 10 Nov 2026)
| Topic | Decision |
|---|---|
| Order | **6G data rights first**, then cleanup, restructure and the new interface. VPS staging (`PHASE6F_VPS_STAGING_GO.md`) comes **after** this program. |
| Sample plugins | **Delete** commerce, CRM, finance, HRMS, inventory, school and POS: code, pages, APIs, packages, tests and flags. The product is the **platform + HospitalOS + RestaurantOS**. |
| Unused apps | **Delete** `orbitox/apps/celebrations` (and `plugins/celebrations`) and `projects/external-os/hospital-os`. Git history keeps them. |
| Interface scope | **All four surfaces:** operator console, customer dashboard, HospitalOS staff app, RestaurantOS apps. |
| Design approach | **One design system** shared by every app, including RestaurantOS, which moves from server-rendered HTML strings to React. |

## What I found (the starting point, at cbac4b3)
- **Two overlapping operator consoles:** `/admin/*` (17 pages) and `/platform/*` (25 pages), each linked from about 50 places.
- **The web app:** 80 pages, about 39,000 lines of page code. HMS pages run 2,000–3,300 lines each, about 96 files use inline styles, and there's no shared component library.
- **Restaurant UI exists twice:** web `/kds` and `/dine/[locator]`, **and** 23 RestaurantOS pages rendered as HTML strings from a 7,900-line `src/server.ts` (plus a 3,200-line `packages/domain/index.ts`). That includes three demo themes: `crave-atlas`, `pantry-rush`, `swift-bite`.
- **16 `compat-*` alias packages** (old `@orbitox/*` names re-exporting `@orbitox-io/*`), still imported by **139 files**.
- **32 of the 37 root `scripts/*`** aren't referenced by CI or any package script.
- **`docs/archive`** (282 files); **phase prompts and reference packs at the repo root**; `B2B2C_Template_Docs`, `developer_guide`.

## Rules for the whole program
- **Security behaviour must not change** unless a GO says so: RLS, roles and grants, the billing guard, CSRF and same-origin checks, MFA and re-authentication, the PHI access log, idempotency, the outbox, signatures.
  - **The full existing security test set stays green at every commit:** the RLS inventory, the cross-tenant generators (HMS 52/52, customer dashboard N/N), privilege tests, the no-token sweep, billing and webhook DB tests, the RDS-compatible chain.
- **Migrations:**
  - never edit a pushed migration;
  - removing sample-plugin tables is done with **new** migrations that pass the RDS-compatible chain job;
  - update the RLS allowlist when tables go away.
- **Deletions need evidence.** Delete only what the inventory proves is unused, or what the owner decided to delete. **Tests are deleted only together with the feature they test.**
- **New screens replace old ones only after parity.** A written parity checklist is complete, and the E2E tests pass. Only then is the old screen deleted.
- **The UI uses the existing APIs.** A new endpoint is allowed only when needed, built with the same guard patterns, classified in the no-token sweep, and covered by the cross-tenant generator.
- **Commits:** small, one logical change each, descriptive titles, CI green.
- **Every report includes:**
  - the CI result of the pushed commit;
  - **verbatim** output;
  - "NOT RUN" plus the reason for anything not run.

  Ignore-list reasons, "removed" claims and test names are all checked against the code, so they must be exact.

---

## Stage 1: 6G data rights (do first)
Build **G1–G5 exactly as written in `TRACK_B_6G_6H_6I_GO.md`**:
- the plugin data contract;
- organisation export through the `ObjectStore` (Local in CI);
- deletion with the 30-day window and the signed certificate plus its verification CLI;
- per-principal export, correction and erasure-or-restriction;
- the two-organisation leak scan, the full table sweep after deletion, and crash-resume.

The contract only needs **HospitalOS and RestaurantOS**, since the sample plugins are about to be deleted. Build them **API-first**. The buttons and screens come in Stage 7D and 7E, on the new design system. Don't restyle old pages for 6G.

**→ Stop for review (checkpoint 6G).**

## Stage 2 (7A-1): inventory, then delete
1. **`docs/cleanup/inventory.md`, generated with evidence:**
   - `knip` (unused files, exports, dependencies), `madge --circular`, and a TypeScript import graph;
   - plus "referenced by CI, Docker, Terraform or package scripts?" checks.

   One row per candidate: path, the evidence, a decision (DELETE / KEEP + reason / MOVE).
2. **Delete by category, one commit each:**
   1. **The sample plugins:**
      - `plugins/{commerce,crm,finance,hrms,inventory,school,pos,celebrations}`;
      - their web pages (`/commerce/*`, `/crm/*`, `/finance/*`, `/hrms/*`, `/inventory/*`, `/store/*`, `/(platform)/automations`, plus storefront and commerce components);
      - their API routes, `lib/sample-plugins.ts` and its flag (`ORBITOX_DISABLE_SAMPLE_PLUGINS`);
      - their tests, and their catalogue/registry entries;
      - their database tables, through a **new migration**.

      Then confirm the plan catalogue and plugin registry contain only HMS and RestaurantOS.
   2. **`apps/celebrations`** and **`projects/external-os/hospital-os`**.
   3. **`packages/compat-*`.** First rewrite the 139 imports to the `@orbitox-io/*` scope (codemod), then delete all 16 packages, and remove the old names from every `package.json`.
   4. **Root `scripts/*`** not used by CI or package scripts, **after** checking each one isn't the only test of a kept feature. If one is, convert it into a real CI test instead of deleting it.
   5. **Docs:** delete `docs/archive`. Move the still-useful material into `docs/` sections (architecture, runbooks, security, decisions), and move the root phase prompts and reference packs to `docs/history/`. The README gets rewritten in Stage 3.
   6. **External Project Engine, `packages/services`, `packages/importer-core`:** **keep or delete only on inventory evidence**, because some may be used by the control plane or the importer tests.
3. **Report:**
   - the inventory;
   - per commit, the files and lines removed;
   - the database migration(s), with the RDS-chain job green;
   - a **"kept security tests" manifest**, before and after, identical apart from tests for deleted features.

**→ Review.**

## Stage 3 (7A-2): restructure
1. **Monorepo layout:**
   - `apps/web`: the platform. **Route groups:** `(console)` for operators, `(dashboard)` for customers, `(hospital)` for HospitalOS staff;
   - `apps/restaurant-os`: **moved into the pnpm workspace** from `projects/external-os/restaurant-os`. It stays a **separately deployed service with its own database and bridge**, and its server becomes **API-only**;
   - `apps/restaurant-web`: the new RestaurantOS UI (Stage 7F);
   - `packages/*`: `core`, `plugin-engine`, `bridge`, `runtime`, `sdk`, `types`, `utils`, `config`, and **`ui` (the design system)**.

   Update CI, Docker, Terraform, the env-contract test, the secret generator and the docs paths in the **same** commit as each move.
2. **Break up the monoliths, behaviour-preserving, with tests green before and after:**
   - RestaurantOS `src/server.ts` → route modules per domain (auth, menu, orders, floor/tables, KDS, payments/invoicing, bridge, admin), with shared middleware;
   - `packages/domain/index.ts` → one module per domain;
   - HMS pages → components (Stage 7E rebuilds the UI, but the data and access code is extracted here).
3. **Guardrails in CI:**
   - **ESLint** import boundaries: apps don't import other apps, plugins talk only through contracts, `packages/ui` has no data access;
   - no import cycles;
   - **no inline `style=`** in new code;
   - a max-lines warning (about 400 per file);
   - `knip` has to stay clean.
4. **A new README and `docs/architecture.md`:** what each app and package is, how they talk (bridge, grants, outbox), and how to run, test and deploy.

**→ Review.**

## Stage 4 (7B): the design system (`packages/ui`)
1. **Foundations:**
   - **design tokens** as CSS variables: colour (neutral + brand + semantic success/warning/danger/info), typography scale, spacing, radius, elevation, motion;
   - **light and dark** themes;
   - **tenant brand theming** for RestaurantOS diner and white-label screens: tenant colours are validated and must pass contrast, else a safe default is used;
   - **Tailwind CSS** wired to the tokens;
   - **Radix primitives** with shadcn-style components owned in the repo (no hosted UI kit).
2. **Components:**
   - **app shell:** sidebar, top bar, org/tenant switcher, breadcrumbs, command palette;
   - **data table:** server pagination, sort, filters, column visibility, CSV export hook, empty/loading/error states;
   - **forms:** react-hook-form + zod, with field and server-error mapping;
   - **feedback and display:** dialog, sheet, drawer, tabs, toast, badge/status pill, stat card, timeline, file upload;
   - **specialised:** **"dangerous action with re-authentication"** (delete, cancel, transfer ownership); **masked PHI field with "reveal with reason"**, which calls the existing access-logged API;
   - **formatting and charts:** INR currency, Indian number grouping (lakh/crore) as an option, dates and times in the user's timezone (default Asia/Kolkata), one chart library.
3. **Quality gates:**
   - Storybook, published as a CI artifact;
   - **axe accessibility checks** (WCAG 2.2 AA: keyboard, focus, contrast, labels);
   - visual regression screenshots;
   - **no `dangerouslySetInnerHTML`** without a sanitiser;
   - a CSP-compatible approach (no inline styles), so CSP can drop `'unsafe-inline'` for styles later;
   - i18n-ready: strings go through a translation helper, default `en-IN`.
4. **Performance budgets per route:** a JS budget, LCP target, and route-level code splitting.

**→ Review** (Storybook artifact plus screenshots, light/dark, desktop/mobile).

## Stages 5–8: the new interface (one checkpoint per surface)
For **each** surface:
1. information architecture and navigation;
2. a **parity checklist** against the old screens;
3. screens built **only from `packages/ui`**;
4. role-aware navigation;
5. empty, loading and error states everywhere;
6. **Playwright E2E** for the critical flows;
7. axe accessibility;
8. screenshots;
9. delete the old screens **after** parity.

Old URLs **301-redirect** to the new ones for one release.

### 7C: operator console (`/console`, replacing both `/admin` and `/platform`)
- **Pages:** overview (health, alerts, signups, revenue), organisations and tenants (search, detail, suspend/resume with reason), provisioning operations (saga status, retry), plans and catalogue (read-only, since the catalogue is migration-managed), billing (subscriptions, grace states, **unknown billing events**, webhook signature alerts), data-rights jobs (exports, scheduled deletions, certificates), fleet and health, audit log (filters, export), security (operators, MFA status, sessions, lockouts, API keys), settings.
- **Respect the operator session, MFA and re-authentication** exactly as now.

### 7D: customer dashboard (`/dashboard`)
- **Pages:** organisation and members (invite, roles, ownership transfer with re-auth), tenants (create via the wizard, status, plugins, plans), usage against quota, API keys (create-once, masked, rotate, revoke), billing (plan, next charge, invoices, update payment method, cancel), audit (own organisation only), **data rights** (request an export and download it; schedule or cancel deletion; download and verify the certificate). The data rights pages use the Stage 1 APIs.
- **The customer cross-tenant generator and role matrix stay N/N.**

### 7E: HospitalOS staff app (`/hospital`)
- **Pages:** patients (list and search through blind indexes; record view with **PHI masked by default** and reveal-with-reason; RESTRICT status shown and enforced), appointments and calendar, beds and wards, labs, pharmacy, billing, staff and roles, a profile, and the hierarchy.
- **Keep:** clinical-safety confirmations, audit trails, and the 52/52 HMS cross-tenant generator.
- Data subject requests are available to the tenant admin.

### 7F: RestaurantOS (`apps/restaurant-web` + the API-only `apps/restaurant-os`)
- **Architecture:**
  - **Next.js**: diner ordering is server-rendered and mobile-first;
  - **staff, POS and KDS:** client routes with **realtime (the existing SSE)**, installed as a **PWA with offline support for stations** (using the station-secret model);
  - **tenant resolution** by host/subdomain, as today.
- **Screens:** overview, menu and categories, floor and tables (QR stands), orders, **KDS**, POS/checkout and payments, **GST invoicing** (per-tenant GSTIN; refuse without one; bill of supply or receipt per the tenant setting), guests, staff and invites, locations, reports, onboarding, white-label and brand, support.
- **The three demo themes** (`crave-atlas`, `pantry-rush`, `swift-bite`) become **2–3 tenant-selectable diner themes built on design-system tokens**, unless the owner says to drop them. Demo content stays only in seed data.
- **Remove the duplicate restaurant UI** in `apps/web` (`/kds`, `/dine/[locator]`, `/admin/restaurant`, `/platform/restaurants` operator views move into 7C as the fleet and tenant views).
- **Keep green:** the RestaurantOS RLS suites, the bridge tests, the KDS concurrency and adversarial tests (converted into CI tests if they're currently root scripts), and payment safety.

---

## Order and checkpoints
1. **6G** → review
2. **7A-1 inventory and deletions** → review
3. **7A-2 restructure** → review
4. **7B design system** → review
5. **7C console** → review
6. **7D dashboard** → review
7. **7E HospitalOS** → review
8. **7F RestaurantOS** → review

Then the remaining **6H / 6I** groundwork, then **VPS staging**.

**Don't start a stage before the previous review is accepted.** Small fixes from a review can overlap with the next stage's preparation (inventory, design drafts).
