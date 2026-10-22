# 🪐 ORBITOX RESTAURANTOS 4.2 — SELECTIVE STOREFRONT REBUILD & FOOD COMMERCE REDESIGN
## Phase 0 Master Plan: Research, Source Audit, Design Concepts & Implementation Architecture

**Document Status:** PENDING OWNER APPROVAL (READ-ONLY GATE ACTIVE)  
**Target Version:** RestaurantOS 4.2.0 (Selective Storefront Rebuild & Food Commerce Overhaul)  
**Document URI:** `docs/restaurantos/RESTAURANTOS_4_2_STOREFRONT_REDESIGN_PLAN.md`  
**Runtime Engine Scope:** `projects/external-os/restaurant-os`  
**Platform Scope:** `@orbitox-io/plugin-engine`, `orbitox/apps/web` (Control Plane `localhost:3005`), RestaurantOS Runtime (`localhost:4010`)  
**Strict Read-Only Enforcement:** **Zero application source files, CSS rules, tests, database records, or package manifests modified during this phase.**

---

## 1. Executive Diagnosis: Why the Five Storefront Designs Fail

Despite passing automated AST divergence metrics (which reported 74% to 82% Jaccard class divergence in the 4.1 report), **the five customer storefronts—Fjord & Form Botanical, Roastery 1984 Vitrine, Neon Yokocho Night Alley, Osteria Rustica Convivial, and Shokunin Ramen & Robata—remain visually unattractive, emotionally sterile, and commercial failures.**

### The "Algorithmic Trap" of Synthetic Testing
In Phase 4.1, divergence was measured by comparing CSS class token sets between DOM trees. While the scripts verified that class names differed (`.ff-ledger-wrap` vs `.r84-vitrine-stage` vs `.ny-night-market`), **they failed to evaluate human visual hierarchy, culinary appetite appeal, photographic balance, and genuine restaurant ordering ergonomics.** Passing an AST test does not make a food storefront look good.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     WHY THE FIVE CURRENT DESIGNS FAILED                          │
├───────────────────────┬─────────────────────────────────────────────────────────┤
│ Template              │ Root Visual Failure                                     │
├───────────────────────┼─────────────────────────────────────────────────────────┤
│ Fjord & Form          │ Rendered as an administrative supply ledger. Monochrome │
│ Botanical             │ text rows with tiny "+ Select" buttons and zero food    │
│ (Nordic)              │ photography on the main view. Feels like a laboratory   │
│                       │ inventory spreadsheet rather than Michelin-grade Nordic │
│                       │ gastronomy (Noma, Geranium, Maaemo).                    │
├───────────────────────┼─────────────────────────────────────────────────────────┤
│ Roastery 1984         │ Generic 3-column e-commerce grid with repetitive brown  │
│ Vitrine               │ tokens and non-functional pills ("Jasmine Florals").    │
│ (Café Atelier)        │ No specialty café workflow: no cup size selection, no   │
│                       │ milk alternatives, no bean roast notes, no tactile      │
│                       │ bakery vitrine drawer. Looks like generic hardware cards│
├───────────────────────┼─────────────────────────────────────────────────────────┤
│ Neon Yokocho          │ Garish gaming HUD with cyan (#00F2FE) and magenta       │
│ Night Alley           │ (#FE0979) border outlines, arcade copy ("128 BPM HEAT", │
│ (Street Food)         │ "BUMP ⚡"). Resembles an esports dashboard rather than  │
│                       │ an electric, appetizing contemporary Asian street food  │
│                       │ market (such as Bao London or Hawker Hall).             │
├───────────────────────┼─────────────────────────────────────────────────────────┤
│ Osteria Rustica       │ Flat list of cards on parchment paper with decorative   │
│ Convivial             │ Italian buzzwords ("Il Conto", "DOP Certified"). Lacks  │
│ (Trattoria)           │ convivial warmth, antipasti-to-dolci course pacing, or  │
│                       │ large-format family sharing dynamics.                   │
├───────────────────────┼─────────────────────────────────────────────────────────┤
│ Shokunin Ramen        │ Dark slate slat cards with static checklist text in the │
│ & Robata              │ header ("1. Broth: Kotteri Rich...") instead of an      │
│ (Tokyo Izakaya)       │ interactive, tactile ramen craft ordering slip (like    │
│                       │ Ichiran or Ippudo). Cluttered and visually heavy.       │
└───────────────────────┴─────────────────────────────────────────────────────────┘
```

### The Single Provisional Quality Benchmark
The only storefront that achieved legitimate culinary appeal is **Atelier Étoile Noir** (`tmpl_haute_gastronomy` / `tmpl_atelier_etoile_4_1`). Its success stems from:
1. **Dramatic Food Photography:** Large, high-resolution hearth-fire visuals that immediately stimulate appetite.
2. **Editorial Asymmetry:** A balanced 50/50 split layout that anchors storytelling on the left while allowing menu browsing on the right.
3. **Typographic Grace:** High-contrast serif typography (`Cormorant Garamond`) paired with understated sans microcopy.
4. **Curated Progression:** Organizing the meal into "Acts" (`Act 01: Awakening` through `Act 04: The Finale`) with sommelier pairing callouts.

**Mandate for 4.2:** Atelier Étoile Noir is classified as `PROVISIONAL_KEEPER_REFERENCE`. It will be preserved as our visual quality benchmark. However, **it must NOT become a universal template skeleton cloned across the other five.** The remaining five customer storefronts must be designed and built as **five entirely distinct digital food applications**, each with its own layout geometry, browsing logic, card anatomy, modifier interaction, and motion personality.

---

## 2. In-Depth Food & Hospitality Commerce UX Research (8 References)

To ground the redesign in verified industry excellence rather than generic AI conventions, we conducted deep inspection across 8 premier digital restaurant, café, and operational commerce benchmarks:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                              PRIMARY RESEARCH MATRIX (8 BENCHMARKS)                          │
├─────┬───────────────────────────────┬────────────────────────────┬───────────────────────────┤
│ Ref │ Identity & URL                │ Archetype / Domain         │ Core Architectural Value  │
├─────┼───────────────────────────────┼────────────────────────────┼───────────────────────────┤
│ A   │ Framer Restaurant Marketplace │ Multi-Archetype Templates  │ Sectional dynamism,       │
│     │ framer.com/marketplace/...    │ (Fine dining, fast casual) │ typography as identity    │
├─────┼───────────────────────────────┼────────────────────────────┼───────────────────────────┤
│ B   │ Sorrel Kitchen (Framer)       │ Contemporary Fine Dining   │ Story-to-menu transition, │
│     │ framer.com/marketplace/...    │ (Editorial Storytelling)   │ seasonal dish highlights  │
├─────┼───────────────────────────────┼────────────────────────────┼───────────────────────────┤
│ C   │ Foodies Web App (Neeraj Das)  │ Web Food Ordering Platform │ Category scroller, cart   │
│     │ neerajdas.com/ux/foodies-web/ │ (Responsive Ordering UX)   │ drawer ergonomics         │
├─────┼───────────────────────────────┼────────────────────────────┼───────────────────────────┤
│ D   │ Baymard Food Delivery 2026    │ Food Commerce Usability    │ Decision fatigue, modifier│
│     │ baymard.com/research-articles │ (Takeout & Dine-In Study)  │ hierarchy, order feedback │
├─────┼───────────────────────────────┼────────────────────────────┼───────────────────────────┤
│ E   │ Square Modifier Engine        │ Restaurant Catalog Engine  │ Authoritative options,    │
│     │ squareup.com/help/...         │ (POS / Online Ordering)    │ scoped modifier groups    │
├─────┼───────────────────────────────┼────────────────────────────┼───────────────────────────┤
│ F   │ Toast Kitchen Display System  │ Mission-Critical KDS       │ Station routing, Expo,    │
│     │ pos.toasttab.com/hardware/... │ (High-Volume Kitchen Prep) │ All Day aggregated counts │
├─────┼───────────────────────────────┼────────────────────────────┼───────────────────────────┤
│ G   │ Blue Bottle Coffee / % Arabica│ Specialty Artisan Café     │ Roast profiles, milk      │
│     │ bluebottlecoffee.com          │ (Beverage & Bakery UX)     │ options, tactile vitrine  │
├─────┼───────────────────────────────┼────────────────────────────┼───────────────────────────┤
│ H   │ Ichiran / Ippudo Ramen Slips  │ Japanese Noodle Craft      │ Step-by-step customization│
│     │ ichiran.com / ippudo.com      │ (Custom Order Sheets)      │ slips, izakaya robata     │
└─────┴───────────────────────────────┴────────────────────────────┴───────────────────────────┘
```

### Detailed Evaluation per Reference

#### Reference A: Framer Restaurant Template Marketplace
* **URL:** `https://www.framer.com/marketplace/templates/categories/restaurants/`
* **Verified Observations:** Templates such as *Sorrel Kitchen*, *Qitchen*, *MOKA Cafe*, *Camino*, *StacknSnack*, and *Sofra* feature distinct identities. *Qitchen* uses stark Japanese minimalism with wide gutters and subtle parallax. *StacknSnack* employs energetic neo-brutalist burger cards with heavy drop shadows. *MOKA Cafe* uses warm earthy tones with circular drink badges and floating sticky order pills.
* **Interpretation:** Restaurant websites fail when they treat every establishment like a standard e-commerce grid. A steakhouse needs cinematic drama; a café needs high-speed morning ordering; a street food stall needs sensory excitement.
* **Proposed RestaurantOS Decision:** Build 5 distinct layout engines with dedicated CSS Grid architectures, unique component trees, and tailored mobile layouts.
* **What Would Be Inappropriate:** Over-reliance on heavy Canvas/WebGL animations that degrade mobile ordering performance on 4G cellular networks.

#### Reference B: Sorrel Kitchen (Framer Showcase)
* **URL:** `https://www.framer.com/marketplace/templates/sorrel-kitchen/`
* **Verified Observations:** Dark editorial aesthetic, generous 64px padding, editorial serif headlines (`Playfair Display`), floating photo heroes with atmospheric lighting, "On The Menu Tonight" seasonal carousel, sommelier wine pairing notes, and unobtrusive reservation/order triggers.
* **Interpretation:** Fine dining diners browse emotionally before deciding. Storytelling and ingredients (e.g., "Foraged Pine Oil", "Dry-Aged Holstein") justify premium pricing.
* **Proposed RestaurantOS Decision:** Reinforce Atelier Étoile Noir's sommelier notes and course structure, while ensuring the other templates do not copy this specific editorial style.
* **What Would Be Inappropriate:** Multi-page navigation flows that bury the order buttons behind lengthy biographical essays.

#### Reference C: Foodies Web App Design Case Study (Neeraj Das)
* **URL:** `https://neerajdas.com/ux/foodies-web/`
* **Verified Observations:** Explores web food ordering across desktop and mobile. Emphasizes instant category filtering (sticky horizontal pill bar), clear dish imagery, explicit vegetarian/spicy badges, modal modifier selection with clear step indicators, and a persistent order summary drawer.
* **Interpretation:** Quick-ordering diners need minimal cognitive friction. Searching for categories or wondering if an item contains allergens leads directly to cart abandonment.
* **Proposed RestaurantOS Decision:** Implement sticky, responsive category rails and tactile quantity steppers across fast-casual templates (Neon Yokocho & Roastery 1984).
* **What Would Be Inappropriate:** Generic delivery-address form fields that clutter in-restaurant QR table ordering.

#### Reference D: Baymard Institute Food Delivery & Takeout UX Benchmark 2026
* **URL:** `https://baymard.com/research-articles/food-delivery-and-takeout-ux-benchmark-2026`
* **Verified Observations:** Baymard's food commerce usability testing reveals that 68% of users struggle with unclear item customization. Major pain points include: hidden required modifiers, failure to display real-time price updates when options are selected, lack of dietary/allergen visibility, and ambiguous cart feedback.
* **Interpretation:** A food ordering UI must clearly separate *required selections* (e.g., "Choose Noodle Firmness") from *optional add-ons* (e.g., "Add Nitamago Egg +$2.50"). Server-authoritative price updates must reflect immediately.
* **Proposed RestaurantOS Decision:** Formulate an explicit modifier drawer contract that visually distinguishes single-choice radio requirements from multi-choice checkbox add-ons with immediate live subtotal calculations.
* **What Would Be Inappropriate:** Forcing takeout delivery address verification onto dine-in table guests who are physically seated.

#### Reference E: Square Item Modifier Management
* **URL:** `https://squareup.com/help/us/en/article/5119-create-and-manage-item-modifiers`
* **Verified Observations:** Square's catalog architecture enforces modifier groups scoped strictly to relevant item classes. A modifier group defines `min_selected`, `max_selected`, and individual option price deltas. Modifiers are never globally inherited without explicit item-level attachment.
* **Interpretation:** Cross-contamination of menu modifiers destroys diner trust and breaks kitchen operations. Coffee modifiers (e.g., Oat Milk, Extra Shot) must never attach to a Curry or Pasta item.
* **Proposed RestaurantOS Decision:** Ensure the diner template engine dynamically reads `item.modifierGroups` from the domain catalog and validates server-side quotations without hardcoded assumptions.
* **What Would Be Inappropriate:** Injecting mock modifier chips into the DOM when the authoritative product model has no modifier groups.

#### Reference F: Toast Kitchen Display System (Hardware & Operations)
* **URL:** `https://pos.toasttab.com/hardware/kitchen-display-system`
* **Verified Observations:** Toast KDS separates operational views into prep stations (Grill, Fryer, Salad, Bar) and an Expediter (Expo) station that collates all items for table delivery. Critical elements include: high-contrast ticket cards, elapsed time color thresholds (Green < 5m, Yellow 5-10m, Red > 10m), aggregated "All Day" production counts (e.g., "Total Hakata Ramen in Flight: 7"), and one-tap order recall.
* **Interpretation:** The KDS is an industrial kitchen tool, not a marketing website. It requires 100% vector legibility from 4 feet away, dark low-glare backgrounds, physical keyboard shortcuts, and zero promotional fluff.
* **Proposed RestaurantOS Decision:** Overhaul RestaurantOS `/kds` to deliver a genuine 4-station routing architecture (Tandoor/Grill, Curry Line, Bar/Beverage, Expo Master) with All Day item production sums and high-contrast bump controls.
* **What Would Be Inappropriate:** Animating kitchen tickets with bouncing transitions or rendering decorative dish marketing photos on cooking screens.

#### Reference G: Blue Bottle Coffee & % Arabica Digital Ordering
* **URL:** `https://bluebottlecoffee.com` & `https://arabica.coffee`
* **Verified Observations:** Artisan coffee digital experiences prioritize bean origins (Ethiopia Yirgacheffe, Colombia Geisha), roast profiles (Light, Medium, Dark), extraction methods (Pour Over, Espresso, Kyoto Cold Drip), and milk alternatives (Oat, Almond, Whole). Pastry vitrines are showcased like jewelry with fresh morning availability tags.
* **Interpretation:** Roastery 1984 Vitrine must feel like a sunlit Scandinavian coffee bar, not an electronics catalogue.
* **Proposed RestaurantOS Decision:** Rebuild Roastery 1984 around drink customization (Cup Size carousel, Bean Origin selector, Milk Choice radio group) and a visual "Vitrine Pastry Drawer".
* **What Would Be Inappropriate:** Generic 3-column e-commerce product boxes with brown borders and static flavor badges.

#### Reference H: Ichiran & Ippudo Craft Ramen Ordering Sheets
* **URL:** `https://ichiran.com` & `https://ippudo.com`
* **Verified Observations:** Famous ramen houses use tactile paper ordering slips where customers customize four essential dimensions: Dashi Broth Richness (Light → Ultra Rich), Garlic Level (None → Heavy), Noodle Texture (Extra Firm → Soft), and Secret Tare Spice Level (Mild → 10x). Izakaya menus pair skewers (Yakitori/Robata) by the pair with charcoal grill notes.
* **Interpretation:** Shokunin Ramen must recreate the authentic ritual of filling out a craft ramen slip, rather than displaying generic slate cards.
* **Proposed RestaurantOS Decision:** Rebuild Shokunin with an interactive 4-step Ramen Order Slip interface and an Izakaya Robata Skewer board.
* **What Would Be Inappropriate:** Random decorative kanji characters that have no meaning, or neon cyberpunk coloring.

---

## 3. Root-Cause Source Audit of the Current Customer Storefronts

We inspected the actual implementation across `projects/external-os/restaurant-os`:
- `packages/ui/pages/diner.ts` (1,845 lines)
- `packages/ui/pages/marketplace.ts` (360 lines)
- `packages/ui/pages/studio.ts` (670 lines)
- `packages/ui/pages/kds.ts` (540 lines)
- `packages/domain/index.ts` (2,150 lines)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   EVIDENCE-BASED ROOT-CAUSE AUDIT                                      │
├────┬─────────────────────────────┬────────────────────────────────────┬────────────────────────────────┤
│ ID │ Finding                     │ Source Evidence                    │ User Impact & Correction       │
├────┼─────────────────────────────┼────────────────────────────────────┼────────────────────────────────┤
│ F1 │ Fjord & Form is an          │ packages/ui/pages/diner.ts         │ Diners see zero food pictures; │
│    │ unappetizing supply ledger  │ Lines 1291-1363                    │ feels like an audit spreadsheet│
│    │                             │ (renderFjordFormComposition)       │ -> Complete removal & replace. │
├────┼─────────────────────────────┼────────────────────────────────────┼────────────────────────────────┤
│ F2 │ Roastery 1984 uses generic  │ packages/ui/pages/diner.ts         │ No cup size, milk choice, or   │
│    │ hardware cards with static  │ Lines 1415-1486                    │ roast notes. Bland e-commerce  │
│    │ flavor text                 │ (renderRoastery1984Composition)    │ -> Rebuild café flow from zero.│
├────┼─────────────────────────────┼────────────────────────────────────┼────────────────────────────────┤
│ F3 │ Neon Yokocho looks like an  │ packages/ui/pages/diner.ts         │ Cyan/magenta glow irritates    │
│    │ esports gaming HUD          │ Lines 1491-1555                    │ eyes; lacks food appeal        │
│    │                             │ (renderNeonYokochoComposition)     │ -> Rebuild electric food hall. │
├────┼─────────────────────────────┼────────────────────────────────────┼────────────────────────────────┤
│ F4 │ Osteria Rustica is a flat   │ packages/ui/pages/diner.ts         │ Boring card list with fake     │
│    │ card list on parchment      │ Lines 1580-1641                    │ Italian buzzwords              │
│    │                             │ (renderOsteriaRusticaComposition)  │ -> Rebuild convivial dining.   │
├────┼─────────────────────────────┼────────────────────────────────────┼────────────────────────────────┤
│ F5 │ Shokunin Ramen has static   │ packages/ui/pages/diner.ts         │ Diners cannot customize noodle │
│    │ checklist text, not slips   │ Lines 1668-1734                    │ firmness or broth richness     │
│    │                             │ (renderShokuninRamenComposition)   │ -> Rebuild tactile ramen slip. │
├────┼─────────────────────────────┼────────────────────────────────────┼────────────────────────────────┤
│ F6 │ Marketplace shows fake 260px│ packages/ui/pages/marketplace.ts   │ Previews do not match actual   │
│    │ mock div and exposes AST    │ Lines 160-220                      │ /dine/:locator storefront; AST │
│    │ divergence scores to owners │ (.tm-preview-stage, AST labels)    │ scores confuse restaurant owner│
├────┼─────────────────────────────┼────────────────────────────────────┼────────────────────────────────┤
│ F7 │ KDS missing true station    │ packages/ui/pages/kds.ts           │ Expo cannot see all-station    │
│    │ routing & All Day counts    │ Lines 110-240                      │ tickets; cooks lack aggregate  │
│    │                             │ (Filtered station buttons)         │ item counts -> Toast standard. │
├────┼─────────────────────────────┼────────────────────────────────────┼────────────────────────────────┤
│ F8 │ Studio edits tokens, not    │ packages/ui/pages/studio.ts        │ Section reordering doesn't     │
│    │ template AST structure      │ Lines 140-320                      │ alter layout geometry          │
│    │                             │ (renderStudioWorkspace)            │ -> True AST document model.    │
└────┴─────────────────────────────┴────────────────────────────────────┴────────────────────────────────┘
```

---

## 4. Removal & Preservation Inventory

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  SOURCE ARTIFACT REMOVAL & RETENTION PLAN                              │
├───────────────────────────────┬────────────────────────────────────────────────────────────────────────┤
│ Classification                │ Source Modules & Paths                                                 │
├───────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ PROVISIONAL_KEEPER_REFERENCE  │ packages/ui/pages/diner.ts: renderAtelierEtoileComposition (L1174-1286)│
│                               │ - Retained as the fine-dining benchmark. Not to be cloned into others. │
├───────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ REMOVE_AND_REBUILD            │ 1. packages/ui/pages/diner.ts: renderFjordFormComposition (L1291-1363) │
│ (Obsolete Storefronts)        │    and CSS (.ff-ledger-wrap, .ff-specimen-row, etc.)                   │
│                               │ 2. packages/ui/pages/diner.ts: renderRoastery1984Composition (L1415)   │
│                               │    and CSS (.r84-vitrine-stage, .r84-product-card, etc.)               │
│                               │ 3. packages/ui/pages/diner.ts: renderNeonYokochoComposition (L1491)    │
│                               │    and CSS (.ny-night-market, .ny-stall-card, etc.)                    │
│                               │ 4. packages/ui/pages/diner.ts: renderOsteriaRusticaComposition (L1580) │
│                               │    and CSS (.or-trattoria-stage, .or-convivial-feast-card, etc.)       │
│                               │ 5. packages/ui/pages/diner.ts: renderShokuninRamenComposition (L1668)  │
│                               │    and CSS (.sr-woodcut-stage, .sr-craft-card, etc.)                   │
├───────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ REFACTOR_FOUNDATION           │ 1. packages/ui/pages/diner.ts: renderDinerStorefront dispatcher (L1098)│
│ (Presentation Infrastructure) │ 2. packages/ui/pages/marketplace.ts: Live sandboxed preview frame      │
│                               │ 3. packages/ui/pages/kds.ts: Toast-grade station matrix & All Day sums │
│                               │ 4. packages/domain/index.ts: DEFAULT_TEMPLATES section tree schemas    │
├───────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ RETAIN_AS_INFRASTRUCTURE      │ 1. packages/domain/index.ts: CartCalculationService & Domain Models    │
│ (Core Business & Security)    │ 2. packages/runtime/index.ts: SSE Realtime Hub & Quotation Engine      │
│                               │ 3. packages/runtime/index.ts: Session, Auth & RBAC Security Layer      │
│                               │ 4. data/restaurant-runtime-store.json: Operational state, tables, orders│
├───────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ MIGRATION_REQUIRED            │ 1. Tenant template bindings in runtime store (backward-compat alias)   │
│ (Zero-Downtime Compatibility) │ 2. Brand Studio active drafts and revision history entries             │
└───────────────────────────────┴────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Keeper Assessment: Atelier Étoile Noir

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                            ATELIER ÉTOILE NOIR (PROVISIONAL KEEPER)                          │
├────────────────────────────────┬─────────────────────────────────────────────────────────────┤
│ Architectural Dimension        │ Evaluation                                                  │
├────────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ Primary Strengths to Preserve  │ • Dramatic 50/50 split layout on desktop (Story Left, Menu) │
│                                │ • Cormorant Garamond serif headers + gold accent microcopy  │
│                                │ • Tasting Menu structure ("Act 01: Awakening" through "Act 04")│
│                                │ • Sommelier wine pairing notes beneath each signature dish  │
│                                │ • Deep midnight (#07090E) atmospheric background            │
├────────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ Shortcomings to Refine in 4.2  │ • Mobile (390px) header is overly tall before the first dish│
│                                │ • Circular 80×80 plate thumbnails crop rectangular photos   │
│                                │ • Hardcoded French course labels ("Amuse", "Entrée")        │
│                                │   require catalog-driven naming flexibility                 │
├────────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ Architectural Invariant        │ MUST NOT BE COPIED as a universal skeleton for the other 5. │
│                                │ It serves solely as the standard for fine dining romance.   │
└────────────────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 6. Five Brand-New Customer Dining Applications

The five replacements are conceived as **distinct digital products** tailored to specific hospitality models:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                FIVE NEW CUSTOMER STOREFRONT VISIONS                          │
├─────────────────────┬────────────────────────────────┬───────────────────────────────────────┤
│ New Application     │ Concept & Spirit               │ Distinct Ordering Mechanics           │
├─────────────────────┼────────────────────────────────┼───────────────────────────────────────┤
│ 1. Fjord & Form     │ Nordic Editorial Food Journal  │ • Natural linen aesthetic (#F7F5F0)   │
│                     │ (Quiet, organic, ingredient-   │ • Asymmetric editorial story tiles    │
│                     │ led foraging culinary art)     │ • Ingredient provenance callouts      │
│                     │                                │ • Floating bottom-sheet order drawer  │
├─────────────────────┼────────────────────────────────┼───────────────────────────────────────┤
│ 2. Roastery 1984    │ Modern Specialty Café Bar      │ • High-speed morning barista workflow │
│                     │ (Tactile, warm timber, coffee  │ • Dynamic cup size selector (8/12/16) │
│                     │ craftsmanship & fresh vitrine) │ • Milk & bean origin radio controls   │
│                     │                                │ • Fresh bakery vitrine drawer         │
├─────────────────────┼────────────────────────────────┼───────────────────────────────────────┤
│ 3. Neon Yokocho     │ Contemporary Street Food Hall  │ • High-energy urban market lanes      │
│                     │ (Vibrant, photo-led, fast-     │ • Sticky visual category badge bar    │
│                     │ casual, authentic night market)│ • Big photo cards with instant Add    │
│                     │                                │ • Slide-up street receipt cart tray   │
├─────────────────────┼────────────────────────────────┼───────────────────────────────────────┤
│ 4. Osteria Rustica  │ Immersive Italian Hospitality  │ • Warm terracotta & Tuscan olive tones│
│                     │ (Convivial feasting, course    │ • Antipasti → Primi → Secondi flow    │
│                     │ progression, family table)     │ • Family-style sharing portion tags   │
│                     │                                │ • Course-paced "Tavola" ordering sheet│
├─────────────────────┼────────────────────────────────┼───────────────────────────────────────┤
│ 5. Shokunin Ramen   │ Japanese Ramen Craft Slips     │ • Authentic 4-step ramen order sheet  │
│                     │ (Minimalist woodblock craft,   │   (Broth, Garlic, Noodles, Tare)      │
│                     │ customized noodle bowls & robata)• Clean Izakaya robata skewer grid    │
│                     │                                │ • Woodblock stamp badge aesthetics    │
└─────────────────────┴────────────────────────────────┴───────────────────────────────────────┘
```

---

## 7. Multi-Viewport Text Wireframes (Mobile, Tablet, Desktop)

### 7.1. Fjord & Form — Nordic Editorial Food Journal

#### Mobile (390 × 844)
```
┌─────────────────────────────────────────┐
│ [≡ Menu]       FJORD & FORM     [Bag 2] │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │  [Full-Bleed Nordic Dish Photo]     │ │
│ │  "Spring Foraging: Lichen & Birch"  │ │
│ └─────────────────────────────────────┘ │
│  JOURNAL ENTRY 14 · FORAGED BOTANICALS  │
│                                         │
│  Lichen Smoked Langoustine      $32     │
│  Pickled wild gooseberry, sea buckthorn │
│  Origin: Lofoten Cold Fjords            │
│  [+ Add to Tasting]                     │
│  ─────────────────────────────────────  │
│  Braised Celeriac Hearth Root   $26     │
│  Fermented pear reduction, hazelnut oil │
│  Origin: Österlen Organic Farm          │
│  [+ Add to Tasting]                     │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ▲ TASTING SELECTION: 2 ITEMS · $58  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### Tablet (768 × 1024) & Desktop (1440 × 900)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ FJORD & FORM       [Journal]   [Tasting Menu]   [Cellar]   [Table 04 · Seated]  │
├───────────────────────────────────────┬─────────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │  CULLINARY PHILOSOPHY · 2026            │
│ │                                   │ │  "We cook only what the cold northern   │
│ │   [Large Architectural Photo]     │ │   waters and forests provide today."    │
│ │   Wild Angelica & Juniper Hearth  │ │                                         │
│ │                                   │ │  SPRING TASTING COURSES                 │
│ └───────────────────────────────────┘ │  ─────────────────────────────────────  │
│  PROVENANCE MAP                       │  01. Lichen Langoustine           $32   │
│  Lofoten Archipelago · Sea Harvest    │      Pickled gooseberry, sea buckthorn  │
│  Soil Temp: 4.2°C                     │      [Select Foraged Pairing +$14]      │
│                                       │  ─────────────────────────────────────  │
│                                       │  02. Smoked Birch Venison         $44   │
│                                       │      Juniper ash, lingonberry glaze     │
│                                       │      [+ Add to Tasting Progression]     │
└───────────────────────────────────────┴─────────────────────────────────────────┘
```

---

### 7.2. Roastery 1984 — Modern Specialty Café Experience

#### Mobile (390 × 844)
```
┌─────────────────────────────────────────┐
│ ROASTERY 1984          [Table 12] [☕ 1] │
├─────────────────────────────────────────┤
│ [Espresso]  [Pour Over]  [Cold]  [Bake] │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ [Photo: Flat White in Ceramic]      │ │
│ │ FLAT WHITE                  $5.50   │ │
│ │ Double ristretto, microfoam         │ │
│ ├─────────────────────────────────────┤ │
│ │ SIZE:  (•) 8oz   ( ) 12oz (+$0.75)  │ │
│ │ MILK:  [Whole] [Oat +$0.80] [Almond]│ │
│ │ BEAN:  [House Blend] [Ethiopia +$1] │ │
│ │        [ -  1  + ]   [ADD TO ORDER] │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ [Photo: Cardamom Bun]               │ │
│ │ SWEDISH CARDAMOM BUN        $4.50   │ │
│ │ Fresh from bakery hearth (6 left)   │ │
│ │        [ -  0  + ]   [ADD TO ORDER] │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ [ ORDER: 1 BEVERAGE · $6.30 · VIEW CART]│
└─────────────────────────────────────────┘
```

#### Desktop (1440 × 900)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ☕ ROASTERY 1984 ATELIER     [Espresso Bar] [Slow Drip] [Vitrine Bakery] [Cart 2]│
├──────────────────────────────────────┬──────────────────────────────────────────┤
│ CRAFT BEVERAGE WORKFLOW              │ TODAY'S VITRINE BAKERY (HEARTH-FRESH)    │
│ ┌──────────────────────────────────┐ │ ┌──────────────────┐ ┌──────────────────┐ │
│ │ [Espresso Extraction Visual]     │ │ │ [Croissant Photo]│ │ [Cruffin Photo]  │ │
│ │ Flat White · Single Origin       │ │ │ Almond Croissant │ │ Valrhona Cruffin │ │
│ │ Origin: Guji Highland, Ethiopia  │ │ │ $5.25  [Add]     │ │ $6.00  [Add]     │ │
│ │ Notes: Bergamot, Peach Blossom   │ │ └──────────────────┘ └──────────────────┘ │
│ │                                  │ │ YOUR BARISTA TICKET                      │
│ │ Size:  [8oz]  [12oz +$0.75]      │ │ 1x Flat White (8oz, Oat Milk)      $6.30 │
│ │ Dairy: [Whole] [Oat] [Almond]    │ │ 1x Almond Croissant                $5.25 │
│ │ Shots: [Standard 2] [Triple +$1] │ │ Subtotal                          $11.55 │
│ │ [ADD CRAFT BEVERAGE — $6.30]     │ │ [SEND TO BARISTA BAR — $11.55]           │
│ └──────────────────────────────────┘ └──────────────────────────────────────────┘
```

---

### 7.3. Neon Yokocho — Contemporary Street Food Commerce

#### Mobile (390 × 844)
```
┌─────────────────────────────────────────┐
│ ⚡ NEON YOKOCHO       [LANE 03] [🥢 $28]│
├─────────────────────────────────────────┤
│ [🔥 SKEWERS] [🍜 NOODLES] [🥟 DUMPLINGS]│
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ [Vibrant Photo: Crispy Pork Bao]    │ │
│ │ CRISPY PORK BELLY BAO (2pc)   $13.50│ │
│ │ Hoisin glaze, crushed peanut, pickle│ │
│ │ 🔥 SPICE: (•) Mild  ( ) Hot  ( ) Fire│ │
│ │           [ + ADD TO TRAY ]         │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ [Vibrant Photo: Charcoal Yakitori]  │ │
│ │ TARE CHARCOAL CHICKEN THIGH    $9.00│ │
│ │ Tokyo tare glaze, scallion, shichimi│ │
│ │           [ + ADD TO TRAY ]         │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ [🥢 STREET TRAY: 2 ITEMS · $22.50 · GO] │
└─────────────────────────────────────────┘
```

#### Desktop (1440 × 900)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🥢 NEON YOKOCHO NIGHT MARKET      [Skewer Grill] [Wok Bowls] [Steam Bao] [Tray] │
├──────────────────────────────┬──────────────────────────────┬───────────────────┤
│ 🍢 ROBATA SKEWER GRILL       │ 🍜 STREET NOODLES & WOK      │ 🥡 YOUR STREET    │
│ ┌──────────────────────────┐ │ ┌──────────────────────────┐ │    ORDER TRAY     │
│ │ [Yakitori Photo]         │ │ │ [Dan Dan Wok Photo]      │ │ 2x Pork Bao $13.50│
│ │ Tare Chicken Thigh  $9.00│ │ │ Sichuan Dan Dan  $15.00  │ │ 1x Tare Skew $9.00│
│ │ Scallion, shichimi       │ │ │ Minced pork, chili oil   │ │ 1x Dan Dan  $15.00│
│ │ [ + Instant Add ]        │ │ │ [ + Instant Add ]        │ │ ───────────────── │
│ └──────────────────────────┘ │ └──────────────────────────┘ │ Total:      $37.50│
│ ┌──────────────────────────┐ │ ┌──────────────────────────┐ │ [FIRE TICKET TO   │
│ │ [Tsukune Meatball Photo] │ │ │ [Spicy Pork Bao Photo]   │ │  STREET KITCHEN]  │
│ │ Tsukune Egg Yolk   $10.50│ │ │ Pork Belly Bao   $13.50  │ │                   │
│ │ [ + Instant Add ]        │ │ │ [ + Instant Add ]        │ │                   │
│ └──────────────────────────┘ │ └──────────────────────────┘ │                   │
└──────────────────────────────┴──────────────────────────────┴───────────────────┘
```

---

### 7.4. Osteria Rustica — Immersive Italian Hospitality

#### Mobile (390 × 844)
```
┌─────────────────────────────────────────┐
│ OSTERIA RUSTICA      [Tavola 08] [🍷 2] │
├─────────────────────────────────────────┤
│  "Benvenuti a Casa · Cucina Toscana"    │
│ ┌─────────────────────────────────────┐ │
│ │ [Warm Photo: Hand-Rolled Pappardelle│ │
│ │ PAPPARDELLE AL CINGHIALE      $28.00│ │
│ │ Slow-braised wild boar ragù,        │ │
│ │ 24-month Parmigiano-Reggiano        │ │
│ │ Portion: (•) Singolo  ( ) Condiviso │ │
│ │          [AGGIUNGI ALLA TAVOLA]     │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ [Warm Photo: Bistecca Fiorentina]   │ │
│ │ BISTECCA ALLA FIORENTINA      $78.00│ │
│ │ 800g dry-aged Chianina beef, rosemary││
│ │ Serving: Family Feast (2-3 Ospiti)  │ │
│ │          [AGGIUNGI ALLA TAVOLA]     │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ [🍽️ IL CONTO DELLA TAVOLA: $106.00 · INVIA]│
└─────────────────────────────────────────┘
```

#### Desktop (1440 × 900)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ OSTERIA RUSTICA      [Antipasti]   [Primi Piatti]   [Secondi]   [Dolci]  [Tavola]│
├──────────────────────────────────────────────────────┬──────────────────────────┤
│ CUCINA DELLA TRADIZIONE — MENU DEGUSTAZIONE          │ TAVOLA CONVIVIALE        │
│ ┌──────────────────────────────────────────────────┐ │ Tavola: 08 (4 Ospiti)   │
│ │ PRIMI PIATTI FATTI A MANO                        │ │                          │
│ │                                                  │ │ Antipasti:               │
│ │ [Photo: Pappardelle]  Pappardelle al Cinghiale   │ │ • Burrata Pugliese $22   │
│ │                       Slow-braised wild boar ragù│ │                          │
│ │                       $28.00  [+ Aggiungi]       │ │ Primi:                   │
│ │                                                  │ │ • Pappardelle x2   $56   │
│ │ [Photo: Risotto]      Risotto al Tartufo Nero    │ │                          │
│ │                       Acquerello rice, black     │ │ Secondi:                 │
│ │                       Norcia truffle, butter     │ │ • Bistecca 800g    $78   │
│ │                       $34.00  [+ Aggiungi]       │ │ ──────────────────────── │
│ └──────────────────────────────────────────────────┘ │ Totale:          $156.00 │
│ ┌──────────────────────────────────────────────────┐ │ [CONFERMA ORDINE        │
│ │ SECONDI E GRIGLIA TOSCANA                        │ │  ALLA CUCINA]            │
│ │ [Photo: Bistecca]     Bistecca alla Fiorentina   │ │                          │
│ │                       $78.00  [+ Aggiungi]       │ │                          │
│ └──────────────────────────────────────────────────┘ └──────────────────────────┘
```

---

### 7.5. Shokunin — Japanese Ramen Craft Slips & Izakaya

#### Mobile (390 × 844)
```
┌─────────────────────────────────────────┐
│ 職人 SHOKUNIN RAMEN     [Counter 05] [🍜 1]│
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ TONKOTSU CRAFT ORDER SLIP    $16.50 │ │
│ │ 1. BROTH RICHNESS                   │ │
│ │    ( ) Light   (•) Medium   ( ) Rich│ │
│ │ 2. NOODLE TEXTURE                   │ │
│ │    ( ) Soft    ( ) Normal   (•) Firm│ │
│ │ 3. GARLIC LEVEL                     │ │
│ │    ( ) None    (•) Standard ( ) High│ │
│ │ 4. SECRET CHILI TARE                │ │
│ │    ( ) None    (•) Medium   ( ) 2x  │ │
│ │ 5. TOPPINGS:                        │ │
│ │    [x] Ajitsuke Tamago Egg  +$2.50 │ │
│ │    [ ] Extra Chashu (2pc)   +$4.00 │ │
│ │          [ SUBMIT RAMEN SLIP ]      │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ [🥢 RAMEN ORDER: 1 BOWL · $19.00 · VIEW]│
└─────────────────────────────────────────┘
```

#### Desktop (1440 × 900)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 職人 SHOKUNIN · TOKYO CRAFT     [Ramen Slips] [Robata Skewers] [Izakaya] [Slip] │
├──────────────────────────────────────┬──────────────────────────────────────────┤
│ 🍜 CRAFT RAMEN SPECIFICATION SLIP    │ 🍢 ROBATA CHARCOAL SKEWERS & IZAKAYA     │
│ ┌──────────────────────────────────┐ │ ┌──────────────────┐ ┌──────────────────┐ │
│ │ [Hero Photo: Tonkotsu Ramen]     │ │ │ [Kurobuta Photo] │ │ [Wagyu Skewer]   │ │
│ │ Signature Hakata Tonkotsu $16.50 │ │ │ Pork Belly Tare  │ │ Wagyu Beef Robata│ │
│ ├──────────────────────────────────┤ │ │ $8.50  [+ Add]   │ │ $14.00 [+ Add]   │ │
│ │ 1. Dashi:   [Light] [Medium] [Rich│ │ └──────────────────┘ └──────────────────┘ │
│ │ 2. Noodles: [Soft] [Firm] [X-Firm│ │ YOUR IZAKAYA ORDER SLIP                  │
│ │ 3. Garlic:  [None] [Med] [Heavy] │ │ • Hakata Tonkotsu (Firm, Rich, Med Tare) │
│ │ 4. Tare:    [None] [Mild] [Spicy]│ │   + Ajitsuke Tamago                $19.00│
│ │ 5. Adds:    [x] Tamago  [ ] Chash│ │ • Kurobuta Pork Belly Skewer        $8.50│
│ │ [CONFIRM CRAFT SLIP — $19.00]    │ │ Total:                             $27.50│
│ └──────────────────────────────────┘ │ [TRANSMIT ORDER TO NOODLE BAR]           │
└──────────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 8. Mandatory Uniqueness Matrix (14 Architectural Dimensions)

| Dimension | Atelier Étoile Noir (Keeper) | Fjord & Form (Nordic Journal) | Roastery 1984 (Specialty Café) | Neon Yokocho (Street Market) | Osteria Rustica (Tuscan Feast) | Shokunin (Ramen Slips) |
|---|---|---|---|---|---|---|
| **1. Page Hierarchy** | 50/50 Editorial Split | Asymmetric Journal with Provenance Tiles | Top Category Bar + Dynamic Customizer | Multi-Lane Urban Food Hall | Progressive Course Stages (Antipasti→Dolci) | Interactive Ramen Slips + Robata Grid |
| **2. Hero Intro** | Dark hearth hero with quote | Minimalist landscape & foraging date | Live coffee extraction & bean origin note | Fast-moving neon lantern badge & stall tag | Tuscan farmhouse vignette & wine cellar note | Woodblock chop stamp & broth kettle badge |
| **3. Navigation** | Tasting Movement timeline | Quiet sticky footnote scroller | Horizontal pill tabs: Espresso / Vitrine | Sticky lane badge bar with live item count | Course-by-course scroll tracker | Dual tabs: Ramen Slips vs Robata Grill |
| **4. Content Geometry** | Balanced two-column split | Uncluttered asymmetric layout with margins | Two-column customizer + vitrine shelf | High-density 3-column stall grid | Centered editorial dining table | Structured dual-column order slip layout |
| **5. Category Nav** | Course sequence ("Acts") | Botanical seasons ("Spring Foraging") | Beverage extraction type & bakery vitrine | Food hall stalls (Grill, Wok, Steam) | Italian courses (Antipasti, Primi, Secondi) | Broth foundation & Skewer types |
| **6. Card Composition** | Editorial sommelier card with circular dish visual | Minimalist row with ingredient origin callout | Large product tile with inline size & bean selectors | Punchy photo card with instant Add button | Generous dish card with sharing portion tags | Authentic paper order slip with checkboxes |
| **7. Product Detail** | Tasting progression story & wine pairing notes | Foraging location, soil, and producer notes | Flavor radar (acidity, body, notes) & roast level | Spicy heat scale & cooking style (Wok / Grill) | Region of origin (DOP) & wine recommendation | Four-dimension customizer (Broth, Garlic, Noodles, Tare) |
| **8. Modifier UX** | Sommelier wine pairing add-on | Foraged wild herb enhancement option | Inline cup size (8/12oz) & milk radio choices | Street spice level & side dumpling toggle | Single vs Shared family portion selector | Authentic 4-step ramen order slip interface |
| **9. Cart Dynamics** | Discreet gold bottom bar with course count | Clean floating linen bottom summary | Sticky order subtotal bar with barista timer | Slide-up street receipt tray with quick checkout | Convivial sharing table tally ("Il Conto") | Traditional wooden counter order slip |
| **10. Typography** | Cormorant Garamond serif + gold accents | Restrained sans-serif + small-caps accents | Clean grotesque sans + monospace roast tags | Bold display sans + Japanese accent tags | Classical Bodoni serif + warm italic descriptions | Japanese-inspired display font + clean sans |
| **11. Photography** | Dramatic, dark hearth culinary visuals | Natural light, earthy, botanical dish photos | Warm morning cafe light, ceramic cups, pastries | High-saturation, close-up street food sizzle | Rustic, sun-drenched Tuscan food photography | Atmospheric steam, charred skewers, ramen bowls |
| **12. Desktop Layout** | Fixed left hero, scrolling right menu | Spacious asymmetric editorial layout | Split customizer bar with right vitrine shelf | Wide 3-column market stall layout | Centered dining flow with right order ledger | Split craft noodle customizer & robata list |
| **13. Mobile Layout** | Single-column luxury presentation | Clean editorial reading layout with bottom drawer | Quick barista order sheet with thumb controls | High-density vertical stall feed with sticky tray | Warm story-to-dish stack with sharing notes | Vertical order slip with clear step toggles |
| **14. Motion Style** | Slow fade-in and smooth slide transitions | Gentle reveal and subtle image opacity shifts | Crisp, tactile button snaps and quantity bounces | Energetic slide-ins and swift pop micro-interactions| Graceful scroll animations and warm transitions | Precise, mechanical paper-slide slip transitions |

---

## 9. Real Template Marketplace Architecture

The current Marketplace (`packages/ui/pages/marketplace.ts`) exhibits two major flaws:
1. **Mock Previews:** It renders a small, static 260px mock div with hardcoded text instead of displaying the actual diner template layout.
2. **Exposed Developer Diagnostics:** It surfaces technical metrics (AST class names, Jaccard divergence scores) that confuse restaurant owners.

### The New Marketplace Design (Owner-First Experience)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🪐 ORBITOX STOREFRONT MARKETPLACE     [All (6)] [Fine Dining] [Café] [Street]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  CURATED STOREFRONT EXPERIENCES FOR RESTAURANTS, CAFÉS & FOOD HALLS             │
│  Choose an expertly crafted design system tailored to your culinary identity.   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐ ┌───────────────────────────────────┐ │
│ │ [Full 16:9 Live Sandboxed Preview]    │ │ [Full 16:9 Live Sandboxed Preview]│ │
│ │                                       │ │                                   │ │
│ │ ATELIER ÉTOILE NOIR                   │ │ ROASTERY 1984 ATELIER             │ │
│ │ Haute Gastronomy & Fine Dining        │ │ Specialty Café & Artisan Bakery   │ │
│ │ • 50/50 Asymmetric Editorial Layout   │ │ • Custom Cup Size & Milk Selector │ │
│ │ • Tasting Acts & Sommelier Pairings   │ │ • Live Fresh Pastry Vitrine Drawer│ │
│ │ [ACTIVE TEMPLATE]  [Open Live Demo]   │ │ [INSTALL TEMPLATE] [Live Preview] │ │
│ └───────────────────────────────────────┘ └───────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Marketplace Overhaul Principles:
1. **Sandboxed Live Device Previews:** Each template card renders an interactive `iframe` pointing to `/dine/demo?templateId=<ID>&preview=true` at standard device viewports (Desktop 1440, Tablet 768, Mobile 390).
2. **Owner-Focused Attributes:** Replace technical labels with business benefits (e.g., "Best for: Multi-course tasting menus, wine bars, fine dining" or "Best for: High-volume morning coffee, bakeries").
3. **Dedicated Developer Route:** Move all AST topology inspect tools, Jaccard matrices, and class counts to an admin-only path: `/admin/engine/templates/diagnostics`.

---

## 10. Authoritative Diner Data Contract & Square-Grade Modifiers

To prevent cross-contamination and ensure bulletproof checkout reliability:

```typescript
// Authoritative Modifier Engine Contract (packages/domain/index.ts)
export interface ModifierOption {
  id: string;
  name: string;
  priceDelta: number; // e.g., +0.80 for Oat Milk, +2.50 for Tamago Egg
  isDefault?: boolean;
  available?: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string; // e.g., "Cup Size", "Milk Choice", "Noodle Firmness"
  minSelections: number; // 1 = Required (Radio), 0 = Optional (Checkbox)
  maxSelections: number; // 1 = Single-choice, >1 = Multi-choice
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl?: string;
  category: string;
  isAvailable: boolean;
  dietaryFlags?: ('VEGAN' | 'GLUTEN_FREE' | 'VEGETARIAN' | 'HALAL')[];
  modifierGroups?: ModifierGroup[]; // Item-scoped, NEVER inherited globally
}
```

### Strict Scoping Invariants:
1. **Zero Modifier Leakage:** Modifiers bound to a coffee product (`Size`, `Dairy Choice`) never leak into kitchen dishes (`Curry`, `Pasta`).
2. **Server-Authoritative Pricing:** The client never calculates the final order total alone. Every modifier change triggers a call to `CartCalculationService.quoteCart(...)`.
3. **Edge Case Resilience:** Handlers must support items with zero modifiers, required radio groups, optional check groups, price-reducing options, sold-out options, and long descriptions without breaking layouts.

---

## 11. Independent Toast-Grade KDS Operational Architecture

The Kitchen Display System (`/kds`) is a mission-critical operations product, not a customer storefront theme.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🍳 KITCHEN DISPLAY SYSTEM · EXPEDITER STATION               17:42:10 · ALL STATIONS│
├─────────────────────────────────────────────────────────────────────────────────┤
│ ALL DAY AGGREGATE COUNTS:                                                       │
│ [Tonkotsu Ramen: 6]  [Tare Skewers: 14]  [Flat White: 3]  [Pappardelle: 4]      │
├────────────────────────────────┬────────────────────────────────┬───────────────┤
│ TICKET #104 · TABLE 08 · 03:12 │ TICKET #105 · TBL 12 · 08:45   │ TICKET #106   │
│ [STATION: EXPEDITER]   [PRIO]  │ [STATION: EXPEDITER]   [WARN]  │ TBL 04 · 14:20│
├────────────────────────────────┼────────────────────────────────┼───────────────┤
│ 2x Pappardelle al Cinghiale    │ 1x Tonkotsu Ramen              │ 2x Bistecca   │
│    • 1x Extra Parmigiano       │    • Firm Noodles, Heavy Garlic│    • Rare     │
│ 1x Bistecca Fiorentina (800g)  │ 2x Tare Chicken Thigh Skewers  │ 1x Burrata    │
│    • Medium-Rare               │    • Extra Shichimi            │ [OVERDUE]     │
├────────────────────────────────┼────────────────────────────────┼───────────────┤
│ [BUMP ALL]    [RECALL TICKET]  │ [BUMP ALL]    [RECALL TICKET]  │ [BUMP ALL]    │
└────────────────────────────────┴────────────────────────────────┴───────────────┘
```

### Operational Improvements:
1. **Four Dedicated Station Filters:**
   - `TANDOOR_GRILL`: Charcoal skewers, steaks, and roasted items.
   - `CURRY_WOK`: Noodles, curries, and simmered dishes.
   - `BAR_BEVERAGE`: Coffee, wines, cocktails, and cold drinks.
   - `EXPO_MASTER`: Expediter station showing complete multi-station tickets for table delivery.
2. **All Day Counts:** Real-time aggregate count of every item currently in flight across active tickets.
3. **High-Contrast Aging:**
   - `Normal` (< 5m): Low-glare charcoal card with crisp white typography.
   - `Warning` (5–10m): Amber status badge.
   - `Critical` (> 10m): High-visibility red header bar for immediate kitchen priority.
4. **Ergonomic Controls:** One-touch ticket bumping, order recall drawer, and physical keyboard shortcut support (`Space` to bump, `R` to recall).

---

## 12. Visual Brand Studio Architecture (True AST Document Editing)

The Brand Studio (`packages/ui/pages/studio.ts`) must support genuine document tree editing rather than simple CSS variable injection:

```typescript
// AST Document Model (packages/domain/index.ts)
export interface StorefrontSection {
  id: string;
  type: 'HERO_STORY' | 'CATEGORY_NAV' | 'PRODUCT_GRID' | 'SPECIALTY_VITRINE' | 'CHEF_NOTE' | 'CART_DRAWER';
  layoutVariant: string; // e.g., 'ASYMMETRIC_SPLIT' | 'EDITORIAL_JOURNAL' | 'STALL_GRID'
  tokens: Record<string, string>; // Brand colors, typography overrides
  props: Record<string, any>; // Component-specific props (headlines, featured item IDs)
  visible: boolean;
  order: number;
}

export interface StorefrontDocument {
  id: string;
  tenantId: string;
  templateId: string;
  version: number;
  sections: StorefrontSection[];
  globalTokens: {
    fontFamilyHeading: string;
    fontFamilyBody: string;
    colorPrimary: string;
    colorBackground: string;
    colorSurface: string;
    borderRadius: string;
  };
}
```

### Studio Editing Capabilities:
1. **Section Tree Management:** Add, delete, toggle visibility, and drag-and-drop reorder storefront sections.
2. **Direct Visual Property Inspection:** Edit headlines, select featured categories, and configure layout modes per section.
3. **Draft & Published Revisions:** Save work in progress as drafts with live preview before deploying to live storefronts.
4. **Full Rollback Support:** Restore previous revisions with a single click.

---

## 13. Tenant Template Migration, Compatibility & Rollback Plan

### Zero Data Loss Guarantee
Under no circumstances will operational tables, active diner sessions, orders, or staff records be altered.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       TENANT COMPATIBILITY MAPPING TABLE                        │
├──────────────────────────┬──────────────────────────┬───────────────────────────┤
│ Legacy Canonical ID      │ 4.1 Alias ID             │ 4.2 Target Canonical ID   │
├──────────────────────────┼──────────────────────────┼───────────────────────────┤
│ tmpl_haute_gastronomy    │ tmpl_atelier_etoile_4_1  │ tmpl_atelier_etoile_noir  │
│ tmpl_nordic_minimal      │ tmpl_fjord_form_4_1      │ tmpl_fjord_form_nordic    │
│ tmpl_artisan_coffee      │ tmpl_roastery_1984_4_1   │ tmpl_roastery_1984_cafe   │
│ tmpl_neon_street         │ tmpl_neon_yokocho_4_1    │ tmpl_neon_yokocho_street  │
│ tmpl_trattoria_bella     │ tmpl_osteria_rustica_4_1 │ tmpl_osteria_rustica_tratt│
│ tmpl_tokyo_izakaya       │ tmpl_shokunin_ramen_4_1  │ tmpl_shokunin_ramen_tokyo │
└──────────────────────────┴──────────────────────────┴───────────────────────────┘
```

### Safety Protocol:
1. **Persistent Backup:** Verify store backup at `data/restaurant-runtime-store.json.bak_v4_2` before any deployment.
2. **Transparent ID Resolution:** The runtime resolver accepts legacy IDs, 4.1 aliases, and new 4.2 canonical IDs interchangeably.
3. **Instant Rollback:** If visual verification fails, a single config flag reverts template resolution to the snapshot within 500ms.

---

## 14. Dependency-Aware 9-Phase Implementation Roadmap

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION ROADMAP (PHASES 0–8)                      │
├───────┬──────────────────────────────────┬──────────┬──────────┬────────────────┤
│ Phase │ Milestone Focus                  │ Effort   │ Risk     │ Dependencies   │
├───────┼──────────────────────────────────┼──────────┼──────────┼────────────────┤
│ P0    │ Research & Audit (Current Phase) │ Completed│ Zero     │ None           │
├───────┼──────────────────────────────────┼──────────┼──────────┼────────────────┤
│ P1    │ Owner Approval Gate              │ —        │ Zero     │ P0 Plan Review │
├───────┼──────────────────────────────────┼──────────┼──────────┼────────────────┤
│ P2    │ Eradicate 5 Inferior Storefronts │ 3-4 hrs  │ Low      │ P1 Approval    │
│       │ & Build 5 New Experiences        │          │          │                │
├───────┼──────────────────────────────────┼──────────┼──────────┼────────────────┤
│ P3    │ Catalog & Modifier Bindings      │ 2 hrs    │ Medium   │ P2 Components  │
├───────┼──────────────────────────────────┼──────────┼──────────┼────────────────┤
│ P4    │ Marketplace Live Previews Overhaul│ 2 hrs   │ Low      │ P2 & P3        │
├───────┼──────────────────────────────────┼──────────┼──────────┼────────────────┤
│ P5    │ Brand Studio AST Document Engine │ 2-3 hrs  │ Medium   │ P2 Layouts     │
├───────┼──────────────────────────────────┼──────────┼──────────┼────────────────┤
│ P6    │ Toast-Grade KDS Station Overhaul │ 2 hrs    │ Low      │ Core SSE Hub   │
├───────┼──────────────────────────────────┼──────────┼──────────┼────────────────┤
│ P7    │ Motion, Responsive Polish & Dark │ 2 hrs    │ Low      │ P2–P6          │
├───────┼──────────────────────────────────┼──────────┼──────────┼────────────────┤
│ P8    │ Multi-Viewport Verification & E2E│ 2 hrs    │ Low      │ All Phases     │
└───────┴──────────────────────────────────┴──────────┴──────────┴────────────────┘
```

---

## 15. Comprehensive Verification Plan & Acceptance Gates

### 15.1. Multi-Viewport Visual Validation Matrix
Every template will be verified across 7 standard screen sizes in both full color and grayscale:
- Mobile Small: **390 × 844**
- Mobile Large: **430 × 932**
- Tablet Portrait: **768 × 1024**
- Tablet Landscape: **1024 × 768**
- Laptop Standard: **1280 × 800**
- Desktop Widescreen: **1440 × 900**
- Large Display: **1920 × 1080**

### 15.2. Functional Acceptance Gates
1. **Modifier Accuracy:** Selecting modifiers must update the displayed quote in real time and transfer cleanly to KDS tickets.
2. **Zero Cross-Contamination:** Coffee modifiers must never appear on dining items; dining modifiers must never appear on café items.
3. **Session Continuity:** Reloading a diner tab must preserve active cart items and table association.
4. **KDS Bump & Recall:** Orders bumped from kitchen stations must instantly update the Expo screen and allow recall if needed.
5. **Brand Studio Persistence:** Draft edits saved in Brand Studio must reload accurately without loss of structural customization.

### 15.3. Clarification of Previous Test Suite Arithmetic
The previous 4.1 report stated 200 passed assertions, which decomposes as follows:
- `audit-visual-truth.js`: 28 assertions
- `test-template-differentiation.js`: 87 assertions
- `test-browser-e2e.js`: 38 assertions
- `test-session-payment-safety.js`: 9 assertions
- `test-restaurantos-3-redesign.js`: 38 assertions
- **Total: 28 + 87 + 38 + 9 + 38 = 200 assertions.**

When omitting `audit-visual-truth.js` (28), the remaining 4 suites total 172. As demonstrated in this audit, passing class-count assertions does not guarantee visual excellence. Visual verification in 4.2 will rely on direct side-by-side human inspection across devices in addition to automated checks.

---

## 16. Owner Approval Checklist

Before proceeding to implementation, please confirm approval for:

- [ ] **Keeper Classification:** Preserving Atelier Étoile Noir as the provisional fine-dining benchmark without cloning it into the other templates.
- [ ] **Complete Storefront Replacement:** Retiring the current visual implementations of Fjord & Form, Roastery 1984, Neon Yokocho, Osteria Rustica, and Shokunin Ramen, and replacing them with the 5 new application designs.
- [ ] **Data Contract & Modifiers:** Enforcing Square-grade modifier scoping with zero cross-contamination.
- [ ] **Marketplace Redesign:** Replacing mock divs with sandboxed live device previews and moving AST diagnostics to developer routes.
- [ ] **Independent KDS Overhaul:** Implementing 4-station routing, All Day production counts, and Toast-grade ticket ergonomics.
- [ ] **Brand Studio AST Engine:** Supporting genuine section addition, reordering, and revision rollbacks.

---

*Phase 0 research and design audit complete. Application source code remains untouched. Awaiting Owner approval.*
