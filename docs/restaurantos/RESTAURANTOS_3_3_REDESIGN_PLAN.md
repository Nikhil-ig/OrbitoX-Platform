# RestaurantOS 3.3 — Research, Design Strategy & Implementation Master Plan
**Mandatory Approval Gate: Read-Only Audit & Specification Phase**
**Status:** PROPOSED & AWAITING SIGN-OFF (Zero source code modified)
**Author:** Staff Product Design Engineer & Principal Systems Architect

---

## 1. Executive Diagnosis: Why the Previous Redesign Still Feels Weak

The visual dissatisfaction with previous iterations of RestaurantOS stems from **treating a fundamental architectural layout problem as a CSS styling exercise**.

### The 4 Core Failures of Prior Redesigns
1. **The "Single Template Disguised as Six" Trap**:
   In previous attempts, visual differentiation was attempted by swapping CSS custom properties (`--bg`, `--accent`, font families) and border styles, while keeping nearly identical DOM trees. Every template inherited a top-down list of food cards with an image on the left/top, price on the bottom, and an orange `Add to Order` button. Fine dining cannot feel like fine dining if it uses the exact same card-grid composition as a late-night street food stall.
2. **The "Phone Frame on a Desktop Screen" Failure in Diner PWA**:
   The desktop storefront at `/dine/:locator` was constrained to a mobile column (`max-width: 480px` or `max-width: 680px`), wasting 70% of widescreen displays (1440×900 and 1920×1080). When users opened the restaurant URL on desktop, they saw an oversized, empty orange app rather than an expansive, immersive culinary experience.
3. **The Disconnect Between the Abstract Syntax Tree (AST) and the Diner Renderer**:
   In [`packages/domain/index.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/domain/index.ts), `DEFAULT_TEMPLATES` defines rich `TemplateCompositionSpec` objects containing `componentTree` nodes (`SiteHeader`, `HeroBanner`, `EditorialStory`, etc.). However, `/dine/:locator` in [`packages/ui/pages/diner.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/diner.ts) did not walk this AST. Instead, it executed hardcoded imperative functions (`renderHauteComposition`, `renderNordicComposition`, etc.) that emitted static DOM markup. When a restaurant owner edited sections in Visual Studio ([`packages/ui/pages/studio.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/studio.ts)), the actual published diner page failed to reflect structural changes because the renderer did not consume the AST dynamically.
4. **Data Contract Omission & Modifier Hallucination**:
   The `MenuItem` domain type lacked structured modifier group bindings (`modifierGroups?: ModifierGroup[]`). In the UI, modifier options (such as "Oat Milk", "Vanilla Syrup", and "Extra Shot") were hardcoded in sample HTML strings or loosely applied across categories. This caused Paneer Tikka or Wood-Fired Margherita Pizza to display espresso modifiers, immediately eroding product credibility.
5. **Technical Leaks in Customer Experiences**:
   The Marketplace presented restaurant owners with internal engineering jargon—exposing terms like "Layout AST Fingerprint", "Component Depth", and "Reconciler Engine" directly on storefront preview cards. A restaurateur seeking an elegant bistro website was confronted with a developer debugging console.

---

## 2. Market Research & Benchmark Analysis

To inform genuine architectural layout differentiation, we analyzed leading hospitality digital experiences across Framer, BentoBox, Toast, and Square.

| Reference & URL | Restaurant Type | Visual Personality & Tone | Page Architecture & Flow | Menu & Product Presentation | Responsive Strategy | Key Interaction Pattern Worth Adopting | RestaurantOS Application | Anti-Pattern: What NOT to Copy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Framer — Qitchen**<br>*(framer.com/templates/qitchen)* | High-End Japanese Sushi / Omakase | Cinematic dark minimalism, warm gold accents, serif typography, high-end tranquility. | Full-viewport split hero (story left, reservation card right) → Asymmetric tasting course timeline → Floating chef quote → Sticky footer reservation bar. | Courses grouped chronologically (Zensai, Sashimi, Yakimono) with sake pairings displayed inline rather than in generic modal popups. | Desktop: 1440px multi-column asymmetric layout.<br>Tablet: 2-column sticky sidebar.<br>Mobile: Story accordion with persistent booking bar. | Sticky bottom booking/order summary bar with real-time course counter and pairing drawer. | **Haute Gastronomy Noir** & **Tokyo Izakaya** templates. | Overly dark low-contrast text (<4.5:1 ratio) that impairs accessibility in bright environments. |
| **Framer — MOKA Café**<br>*(framer.com/templates/moka)* | Artisan Specialty Roastery & Bakery | Tactile craft, warm terracotta/sand palette, editorial grotesque typography, rich texture. | Split hero with hero roastery video/still → Visual brew guide → Horizontal scrolling vitrine for bakery → Dense category tabs → Fast pickup drawer. | Tactile cards with bean origin badges, roast profile meters (1–5 beans), tasting notes, and grind selector pills (Whole / Espresso / Filter). | Desktop: 3-column masonry with sticky drink builder drawer.<br>Mobile: Fast horizontal pill slider + tap-to-expand details. | Inline size & milk pill toggles (8oz/12oz/16oz; Whole/Oat/Almond) directly on the product row without requiring a full modal overlay. | **Café Atelier & Roastery** template. | Cluttered sticker graphics and excessive micro-animations that delay checkout velocity. |
| **Framer — Sorrel Kitchen**<br>*(framer.com/templates/sorrel)* | Organic Farm-to-Table & Botanical Dining | Earthy olive & stone neutrals, refined serif headlines, generous whitespace, archival botanical accents. | Editorial hero with provenance statement → Daily harvest grid → Split menu & wine pairing board → Producer spotlight cards. | Clean tabular menu rows with botanical ingredient notes, harvest season indicators, and dietary badges (GF, VG, Bio-dynamic). | Desktop: 2-column editorial book spread.<br>Tablet: Single centered column with wide margins.<br>Mobile: Clean list layout. | Sticky category index that auto-highlights based on viewport scroll position with smooth snap navigation. | **Modern Nordic Minimalist** template. | Fragile, delicate serif type at small font sizes (<13px) that compromises legibility. |
| **BentoBox — Gramercy Tavern & Crown Shy**<br>*(getbento.com)* | Acclaimed NYC Hospitality & Fine Dining | Authoritative, warm, hospitality-first, rich culinary photography, dignified typography. | Full-bleed hero imagery → Welcoming host note → Dual dining options (Tavern Walk-in vs Dining Room Reserve) → Interactive seasonal menus → Gift cards & private dining. | Distinction between casual walk-in bar menu and prix-fixe dining room menu with vintage wine cellar listings. | Fluid container system scaling from 1600px desktop down to 390px mobile with zero horizontal scrolling. | Dual entry-point selector in hero ("Book Dining Room" vs "Order Tavern Curbside") adapting layout to intent. | **Trattoria Bella Rustica** & **Haute Gastronomy** templates. | Rigid PDF embedded menu viewers that break mobile responsiveness and SEO. |
| **Toast — Online Ordering**<br>*(toasttab.com)* | High-Velocity Restaurant Commerce | Utilitarian, clear, fast, operational efficiency, high contrast, brand header. | Sticky store status header (Pickup 25m, Delivery 45m) → Category navigation pills → 2-column item grid with modifier badges → Sticky cart drawer. | Items display high-contrast prices, modifier options ("Required / Optional"), dietary tags, and out-of-stock indicators. | Desktop: 70% menu catalog + 30% persistent live cart drawer.<br>Mobile: Full-width list + bottom sticky cart pill. | Bottom sheet modifier selector enforcing min/max rules with live price delta updates (`+$1.50`). | **Diner PWA Ordering Flow** (all templates) & **Menu Catalog**. | Sterile, white-label generic POS styling with no distinct restaurant brand identity. |
| **Square — Online Store & Catalog**<br>*(squareup.com)* | Fast Casual & Beverage Retail | Modular, clean, accessible, card-based with clean typography and rapid search. | Top announcement bar → Search bar + category carousel → Visual product cards with quick-add overlay → Slide-over checkout drawer. | Item cards with badges ("Sold Out", "Popular"), variant drop-downs, and quantity steppers directly on cards. | Responsive fluid grid auto-fitting cards from 4 columns (1440px) to 2 columns (768px) to 1 column (390px). | Quick-add with default options bypasses modal if no mandatory modifiers exist. | **Marketplace Catalog** & **Menu Management**. | Excessive white space between cards that forces excessive vertical scrolling on desktop. |
| **Toast — Kitchen Display System (KDS)**<br>*(pos.toasttab.com/hardware/kds)* | High-Density Kitchen Workstation | Industrial, high-contrast dark theme (all black/charcoal with neon status accents), zero clutter, high legibility from 6 feet. | Top status bar (Active Tickets, Avg Ticket Time, Station Selector) → 4-to-6 column ticket grid → Bump bar controls → Station routing tabs. | Tickets organized by order time; modifier callouts in bold yellow/cyan; allergy alerts highlighted in high-contrast red badge; item count indicators. | Fixed viewport optimized for 1080p wall displays and 10-inch prep station tablets. Bump bar keyboard/touch support. | Single-tap ticket bump with undo grace period (5 seconds) and auditory chime trigger. | **RestaurantOS KDS Workspace**. | Low-density desktop layouts that waste screen space and require horizontal scrolling during rush hours. |

---

## 3. Read-Only Source Architecture Audit & Root Cause Analysis

### Audited Codebases
- [`projects/external-os/restaurant-os/packages/domain/index.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/domain/index.ts)
- [`projects/external-os/restaurant-os/packages/domain/security.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/domain/security.ts)
- [`projects/external-os/restaurant-os/packages/storage/store.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/storage/store.ts)
- [`projects/external-os/restaurant-os/packages/ui/pages/diner.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/diner.ts)
- [`projects/external-os/restaurant-os/packages/ui/pages/marketplace.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/marketplace.ts)
- [`projects/external-os/restaurant-os/packages/ui/pages/studio.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/studio.ts)
- [`projects/external-os/restaurant-os/packages/ui/pages/whitelabel.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/whitelabel.ts)
- [`projects/external-os/restaurant-os/packages/ui/icons.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/icons.ts)
- [`projects/external-os/restaurant-os/src/server.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/src/server.ts)

### Root-Cause Analysis Matrix

| ID | Problem Observed | Concrete Evidence in Code / UI | Root Cause | User & Customer Impact | Recommended Correction |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RC-1** | **Diner PWA Desktop Layout is Constrained** | In [`packages/ui/pages/diner.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/diner.ts), outer container uses `max-width: 540px` or `max-width: 680px; margin: 0 auto`. | Layout was architected strictly as a mobile wrapper without responsive desktop/tablet breakpoints. | Desktop diners on 1440px displays see an oversized phone app with 70% empty gutters. | Redesign diner shell to responsive 3-column architecture (Categories Left 240px, Menu Center 1fr, Live Sticky Cart Right 360px) on desktop, collapsing to bottom drawer on mobile. |
| **RC-2** | **Mismatched Dish Modifiers (Coffee modifiers on Paneer)** | In [`packages/domain/index.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/domain/index.ts) `MenuItem`, there is no `modifierGroupIds?: string[]`. In `diner.ts`, sample modal script binds static beverage modifiers across dish cards. | Lack of domain schema binding items to specific modifier groups. No category-level or item-level modifier constraints. | Customer ordering a curry or pizza is prompted to select "Oat Milk" and "Extra Espresso Shot", destroying culinary credibility. | Extend `MenuItem` with `modifierGroups: ModifierGroup[]` schema. Bind Coffee modifiers only to beverages, Cheese/Crust to pizza, Spice/Bread to curries. |
| **RC-3** | **AST Component Tree Disconnected from Diner Renderer** | In [`packages/domain/index.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/domain/index.ts), `DEFAULT_TEMPLATES` defines rich `componentTree` objects, but `diner.ts` manually outputs hardcoded HTML functions (`renderHauteComposition`, etc.). | The AST was built for the `/developer/templates` inspector, while the diner route executes static procedural HTML generators. | Studio section reordering, additions, or text edits never reflect on the live `/dine/:locator` customer storefront. | Build an authoritative AST-to-HTML walker in `diner.ts` that executes dynamic section rendering from `template.composition.componentTree` or draft sections. |
| **RC-4** | **Marketplace Exposes Technical Internal Labels** | In [`packages/ui/pages/marketplace.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/marketplace.ts), cards display `AST Nodes: 18`, `Fingerprint: haute-editorial-v3`, and `Component Tree Engine`. | Developer debugging metadata was mapped directly to customer-facing marketplace cards without an audience separation filter. | Non-technical restaurant owners feel intimidated by engineering jargon rather than excited by aesthetic suitability. | Split Marketplace: Customer-facing view focuses on hospitality concept, cuisine fit, photo previews, and 1-click install; technical AST inspector moved to dedicated Dev tab. |
| **RC-5** | **Visual Studio Edits Do Not Persist to Live Storefront** | In [`packages/ui/pages/studio.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/studio.ts), saving modifies `state.brand` or in-memory draft, but `diner.ts` renders fixed baseline template constants. | Store draft/publish pipeline only merges colors/fonts into `brandSettings`, ignoring structural section additions/deletions. | Visual Studio acts as a styling toy rather than a true website builder. Edits are discarded or invisible to customers. | Wire Visual Studio draft/publish endpoints (`/api/studio/draft`, `/api/studio/publish`) to persist full section trees into tenant storage, which `diner.ts` reads authoritatively. |
| **RC-6** | **Uniform Card Grid Across All 6 Templates** | In `diner.ts`, all 6 template functions output identical `.product-card` flex containers with minor CSS variable overrides. | Lack of distinct architectural layouts per template concept (e.g. multi-course timeline vs tabular harvest board vs vitrine shelf). | Templates look superficially re-skinned; fine dining looks like street food with dark colors. | Implement 6 distinct structural layouts with unique DOM hierarchies, navigation models, and product row presentations. |
| **RC-7** | **KDS Uses Shared Administrative Layout** | In [`src/server.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/src/server.ts), `/kds` uses the generic dashboard shell with a wide sidebar, small fonts, and low contrast. | KDS was treated as another admin dashboard page rather than a specialized kitchen appliance. | Kitchen staff cannot read tickets from a distance; sidebar wastes prep station screen space; bumping tickets requires multiple clicks. | Implement a dedicated, full-screen, high-contrast industrial KDS view with large typography, timer badges, and 1-tap bump bar actions. |

---

## 4. Proposed Product Design System: Two Distinct Systems

To eliminate interface confusion, we propose two related but fundamentally distinct design systems:
1. **Design System A: OrbitoX Administrative Suite** (Clean, dense, utilitarian, reliable)
2. **Design System B: Restaurant Public Storefronts** (Expressive, atmospheric, brand-aligned, conversion-focused)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ORBITOX DESIGN SYSTEM FOUNDATION                      │
│        Shared Tokens: Typography Scale, Spacing (4px base), Color Primitives│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│  DESIGN SYSTEM A: ADMINISTRATION     │  │  DESIGN SYSTEM B: STOREFRONTS        │
│  • SaaS Control Center               │  │  • 6 Distinct Architectural Templates│
│  • Restaurant Workspace              │  │  • Diner PWA (Desktop/Tablet/Mobile) │
│  • Menu Catalog & Floor Studio       │  │  • Guest Ordering & Real-Time Cart   │
│  • KDS Kitchen Display Workstation   │  │  • Visual Brand Customizer           │
│  • Staff Directory & Support Desk    │  │  • Dynamic AST-Driven Renderer       │
│                                      │  │                                      │
│  Characteristics:                     │  │  Characteristics:                    │
│  - Dense, data-rich layouts          │  │  - Immersive culinary photography     │
│  - High-contrast neutral palettes    │  │  - Custom typography pairings        │
│  - Monospace identifiers & currency  │  │  - Whitespace-driven hierarchy        │
│  - Lucide SVG icons (Zero emojis)    │  │  - Contextual modifiers & add-ons    │
│  - Fixed split panes & inspectors    │  │  - Fluid responsive layouts          │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
```

### Design System A: OrbitoX Administrative Suite (B2B SaaS & Back-of-House)

- **Target Persona:** Platform admins, restaurant owners, general managers, kitchen expeditors.
- **Visual Tone:** Swiss-rationalist, precision engineering, high-density data, understated authority.
- **Color Architecture:**
  - Base Background: `--admin-bg: #0B0E14` (Deep obsidian)
  - Surface Elevated: `--admin-surface: #141923` (Slate surface)
  - Surface Border: `--admin-border: #1E2638` (Subtle boundary)
  - Text Primary: `--admin-text-1: #F1F5F9` (Crisp readability)
  - Text Secondary: `--admin-text-2: #94A3B8` (Informational)
  - Accent Primary: `--admin-accent: #38BDF8` (Sky cyan for actions)
  - Semantic Status: Emerald `#10B981` (Online/Paid), Amber `#F59E0B` (Pending/Prep), Rose `#F43F5E` (Void/Alert).
- **Typography:**
  - UI Labels & Controls: Inter, -apple-system, 13px/1.4, tracking-tight.
  - Numbers, Currency, Timers: JetBrains Mono or SF Mono, tabular figures.
- **Layout Rhythm:** 4px grid (4, 8, 12, 16, 24, 32px). Dense data tables, 36px table rows, compact pill filters.
- **Iconography:** Lucide SVG icons exclusively, 16px/18px stroke-width 1.75. **Strictly zero emojis**.

### Design System B: Restaurant Public Storefronts (Customer-Facing Hospitality)

Storefronts do not share a single generic stylesheet. Instead, each of the 6 templates defines its own layout engine, typography pairing, and component composition.

---

## 5. Six Structurally Distinct Template Specifications

To ensure the 6 templates are genuinely distinct rather than color variations, each template implements a unique layout architecture, menu presentation, and interaction flow.

### Structural Comparison Matrix

| Attribute | 1. Haute Gastronomy Noir | 2. Modern Nordic Minimalist | 3. Café Atelier & Roastery | 4. Neon Alley Street Food | 5. Trattoria Bella Rustica | 6. Tokyo Izakaya & Craft Ramen |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Concept Identity** | Michelin-star fine dining & tasting menus | Foraged harvest & Nordic bakery | Specialty coffee roaster & all-day brunch | Tokyo late-night alley & bao bar | Tuscan wood-fired trattoria & enoteca | Traditional Kyoto izakaya & ramen bar |
| **Header Layout** | Minimalist centered logo, transparent floating nav, discreet reservation CTA | Asymmetric brandmark left, text index center, language/currency right | Warm branded bar with live roast schedule badge & order pickup toggle | Cyber street ticker header, glowing live station status, cart pill right | Warm terracotta bar with family heritage crest & telephone/hours banner | Minimalist cedar plank banner with vertical calligraphy mark & branch selector |
| **Hero Structure** | Split 50/50: Editorial portrait left, chef tasting preview card right | Asymmetric full-bleed with coordinate stamps & daily foraged notes | Hero beverage vitrine with bean origin highlights & tactile brew steppers | Neon split-panel marquee with dual-lane order buttons (Eat In / Takeaway) | Hearth photography hero with rustic wooden overlay & seasonal special badge | Structured lantern hero with multi-course wooden placard navigation |
| **Menu Architecture** | Multi-course progression timeline (Courses I–VI) | Tabular harvest spec sheet with origin coordinates & allergen matrix | Dual-column beverage builder + pastry vitrine shelf | High-density dual-lane matrix (Skewers Lane vs Bao/Noodle Lane) | Category accordion with wood-fired bread pairings & family feast options | Vertical broth bar selector (Tare: Shio/Shoyu/Miso) + skewer grid |
| **Product Row / Card** | Elegant text-dominant row with sommelier wine pairing drawer | Monospace-inspired tabular spec row with botanical badge | Tactile product card with size & milk toggles directly on card | Compact street box with spice level flames & rapid tap add | Warm textured card with pairing recommendation & portion size pills | Wooden ticket card with noodle firmness & broth richness checkboxes |
| **Modifier Experience** | Pairing drawer: Reserve Vintage or Non-Alcoholic Pairing | Botanical notes modal: Allergen omissions & harvest season note | Direct pill selector: 8oz/12oz, Whole/Oat, Extra Shot (+₹40) | Rapid spice selector: Mild / Fire / Ghost Pepper | Crust & cheese options: Neapolitan / Roman, Burrata (+₹120) | Multi-step ramen builder: Noodle Firmness, Broth Density, Chashu |
| **Cart & Ordering** | Discreet sommelier drawer with reservation & tasting notes | Clean sidebar ledger with transparent tax & gratuity breakdown | Sticky bottom pickup bar with estimated brew time (8–12m) | High-contrast neon checkout drawer with live kitchen queue timer | Generous family feast basket with complimentary breadsticks callout | Traditional wooden bill tray drawer with split-bill calculation |
| **Typography Pairing** | Playfair Display / Cormorant Garamond + Inter | Space Grotesk / Neue Haas + JetBrains Mono | Outfit / Plus Jakarta Sans + DM Sans | Syne / Clash Display + Space Mono | Fraunces / Serif + Inter | Shippori Mincho / Noto Serif JP + DM Sans |

---

### Grayscale Wireframe Specifications (Proving Structural Differentiation Without Color)

```
========================================================================================
CONCEPT 1: HAUTE GASTRONOMY NOIR (Editorial Tasting Timeline)
========================================================================================
[============================== BRANDMARK / LOGO ==============================]
[  Experience  ·  Tasting Menus  ·  Wine Cellar  ·  Chef  ·  Private  · [RESERVE] ]
----------------------------------------------------------------------------------------
[ SPLIT HERO - 50% / 50% ]
[ LEFT: Chef Portrait & Philosophy                | RIGHT: Current 8-Course Tasting   ]
[ "An ode to seasonal provenance..."              | "Autumn Harvest Tasting Menu"     ]
[ Chef Laurent Vance                              | 8 Courses · Sommelier Selection   ]
[ [View Tasting Menu]  [Reserve Table]            | [Begin Curated Selection ->]      ]
----------------------------------------------------------------------------------------
[ COURSE-BY-COURSE TIMELINE (Chronological Culinary Progression) ]
  Course I: Amuse-Bouche
  [=== Photo ===]  Cured Hiramasa Kingfish · Kaluga Hybrid Caviar · Sea Grape
                   Dashi emulsion, compressed winter melon, shiso oil
                   Sommelier Pairing: 2018 Domaine Leflaive Puligny-Montrachet [Drawer]
  Course II: Earth & Forage
  [=== Photo ===]  Glazed Maitake & Pine Needle Broth
                   Smoked chestnut purée, wild juniper reduction, shaved black truffle
                   Sommelier Pairing: 2019 Louis Jadot Gevrey-Chambertin [Drawer]
----------------------------------------------------------------------------------------
[ SOMMELIER PAIRING DRAWER ]
  Select Pairing Level:  (o) Classic Reserve (Included)  ( ) Grand Cru Prestige (+₹4,500)

========================================================================================
CONCEPT 2: MODERN NORDIC MINIMALIST (Tabular Harvest Spec Sheet)
========================================================================================
[ NORDIC / 59.9139° N, 10.7522° E ]                     [ Daily Harvest: Oct 10 · 08:30 ]
----------------------------------------------------------------------------------------
[ HARVEST SPECIFICATION OVERVIEW ]
  Producer Network: 14 Bio-dynamic Farms · Zero Food Miles · Heritage Grains
----------------------------------------------------------------------------------------
[ TABULAR MENU ROWS (Clean, Dense, Monospace-Accented) ]
  CODE    ITEM DESCRIPTION                   PROVENANCE             ALLERGENS     PRICE
  --------------------------------------------------------------------------------------
  DK-01   Fermented Rye Sourdough            Øland Heritage Wheat   [GL]          ₹420
          Cultured sea-salt butter, cold-pressed rapeseed oil
  DK-02   Salt-Baked Celeriac & Apple        Vingården Farm         [VG, GF]      ₹780
          Pickled elderberry, toasted hazelnut broth
  DK-03   Charred Arctic Char & Pine         Lofoten Catch          [F, D]        ₹1,250
          Smoked buttermilk whey, dill emulsion, sea purslane
----------------------------------------------------------------------------------------
[ STICKY LEDGER SIDEBAR ]
  Order Summary (3 Items) · Subtotal: ₹2,450 · Tax: ₹122.50 · Total: ₹2,572.50 [CONFIRM]

========================================================================================
CONCEPT 3: CAFÉ ATELIER & ROASTERY (Tactile Vitrine & Beverage Builder)
========================================================================================
[ ATELIER ROASTERS ]  [ Roasting Today: Ethiopian Yirgacheffe ]  [ [Pickup: 12m] [Cart: 2] ]
----------------------------------------------------------------------------------------
[ LIVE BREW VITRINE (Visual Product Cards with Inline Controls) ]
  +------------------------------------+  +------------------------------------+
  | [Image: Cortado Glass]             |  | [Image: Pain au Chocolat]          |
  | Cortado — Dual Origin              |  | Valrhona Chocolate Croissant       |
  | Notes: Bergamot, Peach, Jasmine    |  | 72-hour lamination, French butter  |
  | Size:  [ 4oz ]  [ 8oz ]            |  | Fresh out of oven at 07:15         |
  | Milk:  [ Whole ] [ Oat ] [ Almond ]|  |                                    |
  | ₹260                               |  | ₹220                               |
  | [ + Add to Atelier Tray ]          |  | [ + Add to Atelier Tray ]          |
  +------------------------------------+  +------------------------------------+
----------------------------------------------------------------------------------------
[ BEAN DISCOVERY BAR ]
  Take Home Whole Beans: 250g Pouches · Grind Options: [Whole] [Espresso] [V60/Filter]

========================================================================================
CONCEPT 4: NEON ALLEY STREET FOOD (High-Contrast Dual Cyber Lanes)
========================================================================================
[ /// NEON ALLEY TOKYO /// ]  [ STALL 04 ACTIVE ]  [ QUEUE: 4 TICKETS AHEAD ]  [ [BAG: ₹680] ]
----------------------------------------------------------------------------------------
[ DUAL ORDER LANES ]
  < LANE A: BINCHO SKEWERS & YAKITORI >   | < LANE B: SMASHED BAO & LOADED NOODLES >
  ----------------------------------------+---------------------------------------------
  [Image] Tsukune Chicken Skewer          | [Image] Crispy Pork Belly Bao (2pc)
          Tare glaze, cured egg yolk dip  |         Pickled mustard greens, crushed peanut
          Spice: [Mild] [Spicy] [X-Hot]   |         Spice: [Original] [Fire Ghost Pepper]
          ₹280  [ + SLAM IN BAG ]         |         ₹380  [ + SLAM IN BAG ]
  ----------------------------------------+---------------------------------------------
  [Image] Wagyu Beef & Scallion Skewer    | [Image] Dan Dan Sesame Broth Noodles
          Koji butter, black garlic salt  |         Preserved radish, chili oil, bok choy
          ₹420  [ + SLAM IN BAG ]         |         ₹460  [ + SLAM IN BAG ]

========================================================================================
CONCEPT 5: TRATTORIA BELLA RUSTICA (Warm Hearth & Family Feasts)
========================================================================================
[ CASA BELLA · DAL 1984 ]  [ Forno a Legna Acceso ]  [ Tavolo 04 ]  [ Chiama Cameriere ]
----------------------------------------------------------------------------------------
[ WOOD-FIRED HEARTH STORY HERO ]
  "Three generations of sourdough mother yeast, San Marzano tomatoes, and cold-pressed oil."
----------------------------------------------------------------------------------------
[ ANTIPASTI & BRUSCHETTE ]
  Burrata Pugliese con Fichi · Prosciutto di Parma 24 Mesi · Focaccia Barese all'Origano
----------------------------------------------------------------------------------------
[ PIZZE DAL FORNO (Wood-Fired Pizza Builder) ]
  Margherita Antica — ₹650
  San Marzano D.O.P., Fior di Latte, Basilico Fresco, Olio Extra Vergine
  [ Choose Crust: (o) Verace Tradizionale  ( ) Bordo Alto Canotto ]
  [ Add Extra Cheese: [ ] Bufala Campana (+₹140)  [ ] Stracciatella Fresca (+₹180) ]
  [ + Aggiungi all'Ordine ]

========================================================================================
CONCEPT 6: TOKYO IZAKAYA & CRAFT RAMEN (Kyoto Cedar Plank Board)
========================================================================================
[ 居酒屋 · IZAKAYA KYOTO ]  [ Noren Status: Open ]  [ Counter 02 ]  [ Water / Tea Free ]
----------------------------------------------------------------------------------------
[ VERTICAL CEDAR MENU PLACARDS ]
  [ OTsumami (Starters) ]    [ Kushiyaki (Charcoal) ]    [ Ramen & Donburi ]
----------------------------------------------------------------------------------------
[ MASTER RAMEN BUILDER (Multi-Step Craft Customization) ]
  Tori Paitan Rich Chicken Broth Ramen — ₹780
  Slow-simmered 14-hour rich chicken broth, sous-vide chashu, ajitama egg, menma
  Step 1: Tare Base        ->  (o) White Shoyu    ( ) Black Garlic Oil   ( ) Spicy Miso
  Step 2: Noodle Firmness  ->  ( ) Soft           (o) Katame (Firm)      ( ) Bari-Kata (Hard)
  Step 3: Broth Richness   ->  ( ) Light          (o) Standard           ( ) Kotteri (Extra Rich)
  Step 4: Craft Add-ons    ->  [x] Ajitama Egg (+₹60)   [ ] Double Chashu (+₹180)
  [ + Place Wooden Slip in Order Tray ]
```

---

## 6. Redesigned Marketplace Experience Specification

### Core Concept: Visual Hospitality Discovery (Not a Developer Console)

The current marketplace fails because it presents technical engineering metadata (AST node counts, layout fingerprint hashes) inside cramped dark tiles. The redesign transforms `/marketplace` into an **inspirational hospitality showcase** that enables restaurant operators to preview templates in real-world scenarios.

### Page Architecture & Layout Hierarchy (1440×900 Desktop)
1. **Top Discovery Bar (Height 72px):**
   - Left: Platform Brandmark & Workspace Switcher.
   - Center: Search input (`"Search by cuisine, style, or dining type..."`) with instant debounce.
   - Right: Active Template Status Pill (`Installed: Haute Gastronomy Noir · Draft Active`) + `Visual Studio` quick link.
2. **Featured Hero Showcase (Height 380px):**
   - High-impact editorial card spotlighting the featured template of the week.
   - Displays real diner viewport preview mockup, hospitality profile, live demo link, and 1-click install button.
3. **Cuisine & Style Filter Carousel (Height 56px):**
   - Filter pills: `All Styles (6)`, `Fine Dining & Chef-Led`, `Café & Specialty Beverage`, `Street Food & Fast Casual`, `Artisan Trattoria & Pizzeria`, `Ramen & Izakaya`.
4. **Visual Template Gallery (Grid: 3 Columns at 1440px, 2 Columns at 1024px, 1 Column at 768px):**
   - **Template Showcase Card Component:**
     - High-resolution interactive iframe / screenshot preview viewport.
     - Viewport device switcher pills directly on card (`Desktop 1440px`, `Tablet 768px`, `Mobile 390px`).
     - Template Name, Cuisine Type, and Architectural Concept tagline.
     - Key Highlights: e.g., *"Multi-course timeline, Sommelier drawer, Editorial story"*.
     - Action Buttons: `Preview Live Storefront` (opens full modal) and `Install to Restaurant` (triggers instant setup).
5. **Full-Screen Interactive Preview Modal:**
   - Real-time device frame switcher (`Desktop 1440×900`, `Tablet iPad 768×1024`, `Mobile iPhone 390×844`).
   - Live interactive render of `/dine/:locator?previewTemplateId={id}` using the restaurant's actual menu catalog.
   - Customizer preview sidebar showing primary font and color options before installation.
6. **Separation of Concerns for Technical Metadata:**
   - Architectural AST details (Component tree depth, Reconciler version) are moved to a toggleable `Developer & Agency Inspector` drawer, keeping the main interface clean and accessible for restaurant operators.

---

## 7. Redesigned Diner PWA Experience Specification

### Solving the Desktop Framing Problem

The current desktop storefront is trapped inside an artificial mobile frame. The redesign establishes three distinct responsive layouts.

### 1. Desktop Layout (1440 × 900 Viewport)
- **Container Max-Width:** 1380px fluid container with 32px horizontal padding.
- **Header Structure (Height 80px):**
  - Left: Restaurant Brandmark & Branch Selector (`The Bombay Canteen · Lower Parel`).
  - Center: Table/Locator Badge (`Table 04 · Dining Room`) + Fulfillment Status (`Dine-In Session Active`).
  - Right: Search input + Order History Drawer button + Bag Summary Pill (`3 items · ₹1,850`).
- **Hero Section:** Full-width atmospheric hero adapted to the active template (e.g. split editorial story for Haute, vitrine for Café).
- **Three-Column Operating Layout:**
  - **Left Rail (Width 240px, Sticky):** Category Navigation Index with active scrollspy indicator (`Starters`, `Tasting Courses`, `Wood-Fired Pizze`, `Desserts`, `Beverages`).
  - **Center Stage (Width 1fr, Max 820px):** Menu catalog rendered according to the template's unique layout rules (timeline, tabular spec, or product vitrine).
  - **Right Rail (Width 360px, Sticky):** Real-time Live Bill & Order Drawer showing current guest items, kitchen fulfillment progress, minor-unit subtotal, taxes, and `Send Order to Kitchen` action.

### 2. Tablet Layout (768 × 1024 Viewport)
- **Two-Column Split:**
  - Category navigation collapses to a horizontal sticky pill bar below the hero.
  - Menu catalog occupies 65% width; live order tray occupies 35% width as a sticky right sidebar.
  - Product modifier sheets slide up from the bottom as accessible dialog overlays.

### 3. Mobile Layout (390 × 844 Viewport - iPhone Baseline)
- **Header:** Compact 56px sticky bar with brandmark, table pill, and search trigger.
- **Category Bar:** Horizontal sliding pill carousel with smooth inertia scrolling.
- **Catalog Layout:** Single-column density optimized for thumb reach. Images use 16:9 or 1:1 aspect ratios with high-contrast tap targets (minimum 44×44px).
- **Sticky Bottom Action Bar (Height 68px, Safe Area Inset Aware):**
  - Displays item count, integer minor-unit total, and `View Order` / `Checkout` button.
- **Bottom Sheet Modifier Modal:**
  - Slides up with smooth physics, displaying required vs. optional groups, item steppers, and clear price additions (`+₹60`).

---

## 8. Visual Studio Architecture Specification

### The True Document Model (Bridging Studio and Diner)

To ensure Visual Studio is an authentic website builder rather than a surface-level CSS customizer, edits must manipulate a **versioned JSON Abstract Syntax Tree (AST)** that the diner renderer parses authoritatively.

### Schema Hierarchy
```typescript
interface StorefrontDocument {
  version: "3.3.0";
  templateId: string;
  themeTokens: ThemeTokenOverrides;
  sections: StorefrontSection[];
}

interface StorefrontSection {
  id: string;               // e.g. "sec-hero-01"
  type: StorefrontSectionType; // "HeroBanner" | "TastingTimeline" | "HarvestTable" | "VitrineGrid" | "MenuCatalog"
  enabled: boolean;
  order: number;
  properties: Record<string, any>; // Section-specific parameters (e.g. headline, layoutMode)
  children?: StorefrontComponentNode[];
}

interface StorefrontComponentNode {
  id: string;
  type: string;             // "Heading" | "ProductCard" | "ModifierPicker" | "WinePairingDrawer"
  props: Record<string, any>;
  dataBinding?: {
    entity: "catalog.categories" | "catalog.items" | "brand.story";
    filter?: Record<string, any>;
  };
}
```

### Visual Studio Editing Pipeline
1. **Selection & Highlighting:** Clicking any section in the Studio preview canvas selects the corresponding node in the Document AST and opens its property panel in the right-hand inspector.
2. **Reordering & Visibility:** Dragging sections in the left-hand layer tree updates the section `order` indices; toggling the eye icon sets `enabled: false`.
3. **Draft Isolation:** Changes are persisted via `POST /api/studio/draft`, storing the updated AST in the tenant's draft slot without modifying the live customer storefront.
4. **Real-Time Preview Canvas:** The Studio center canvas renders `/dine/:locator?mode=studio-draft` within an interactive iframe, reflecting AST modifications instantly.
5. **Publish Pipeline:** Clicking `Publish Changes` triggers cryptographic signing and promotes the draft AST to `publishedDocument`. The live `/dine/:locator` route immediately resolves the new published document.
6. **Revision History & Rollback:** Each publish action archives a snapshot in the revisions log, enabling 1-click instant rollback.

---

## 9. Administrative Product Surfaces Redesign Matrix

To prevent the administrative interfaces from feeling like generic dashboards, each product surface is assigned a tailored layout and interaction model.

| Product Surface | User Persona | Navigation & Layout Pattern | Information Density | Key Interactive Primitives | Mobile / Tablet Adaptation | Distinction from Other Apps |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OrbitoX Control Center** | Platform Super-Admin | Multi-tenant master sidebar; top platform metrics ribbon; tenant table with status badges and SLA indicators. | High (32px table rows, compact monospaced IDs). | Tenant provisioning drawer, subscription tier toggles, audit log stream, feature flag switches. | Responsive collapse to card list on mobile; priority stats cards remain visible. | Focused on global multi-tenant isolation, license enforcement, and infrastructure health; no restaurant catalog concerns. |
| **Restaurant Workspace** | General Manager & Owner | Top branch context selector; daily operational overview; live revenue meter; kitchen SLA summary cards. | Medium-High (metric cards + live activity feed). | Quick-action bar (Close Register, 86 Item, Call Support), branch switcher dropdown, revenue goal progress bar. | Single-column stacked cards with bottom quick-actions menu. | Executive operational cockpit; surfaces cross-department summaries without exposing raw POS tickets. |
| **Customer Support Desk** | Front-of-House Manager | 3-pane email-client architecture: Left ticket queue, Center threaded message history, Right order & table inspector. | High (dense conversation stream with status pills). | Quick-reply macro buttons, priority escalation selector, 1-click refund/comp order trigger. | Collapses to list view; tapping ticket opens conversation detail. | Purpose-built for conflict resolution and guest communication; links directly to live table order state. |
| **Staff Directory & RBAC** | General Manager & HR | Two-column layout: Left staff roster with station badges; Right role permissions matrix and active credentials drawer. | High (tabular matrix with permission checkboxes). | Station assignment pills (Bar, Line 1, Host), PIN reset trigger, cryptographic key revocation button. | Roster list with slide-over drawer for role edits. | Security-sensitive identity management; strictly enforces zero-trust staff permissions and audit logs. |
| **Menu Catalog Manager** | Executive Chef & F&B Director | Master-detail split: Left category hierarchy tree with drag-and-drop; Right dish editor with modifier group assignments. | High (multi-field form with live image preview and pricing minor units). | Drag-to-reorder categories, 86 availability toggle, modifier group selector, spice level and allergen checkboxes. | Category selector dropdown; editing forms stack vertically. | Authoritative culinary catalog source of truth; manages modifier bindings that prevent mismatched dish options. |
| **Floor Studio** | Hostess & Operations Lead | Interactive 2D SVG canvas editor; top branch/floor selector; right table inspector (seats, shape, QR code locator). | Visual Canvas (pan/zoom canvas with grid snap). | Drag-and-drop table positioning, shape switcher (Round/Square/Booth), 1-click Table QR Code generator. | Tablet-optimized for floor hosts; read-only seated view on mobile. | Spatial table layout designer; manages physical table locators linked directly to diner PWA sessions. |
| **Kitchen Display System (KDS)** | Line Cook & Expeditor | Full-screen multi-column ticket rail; high-contrast dark theme (all black/charcoal); station filter bar (All, Grill, Fry, Expo). | Maximum (large typography legible from 6 feet, zero wasted space). | 1-tap ticket bump, modifier alert highlights (Yellow/Red), elapsed SLA timer badges (Green <5m, Yellow <10m, Red >15m). | Optimized for fixed 1080p wall displays and 10-inch prep station tablets. | Specialized kitchen appliance interface; emphasizes speed, high contrast, and tactile feedback. |
| **White-Label & Domains** | Brand Director & Owner | Clean step-by-step branding console: Brand identity (Logos, Colors, Fonts), Custom domains with DNS verification table. | Medium (form inputs with real-time status indicators). | DNS record copy-to-clipboard buttons, SSL certificate check trigger, branch branding inheritance toggles. | Form fields stack cleanly with responsive status cards. | Dedicated white-label configuration surface; manages CNAME routing and brand inheritance across multi-unit operations. |

---

## 10. Concrete Implementation Roadmap (Milestones 0–9)

| Milestone | Goal | Primary Affected Modules / Files | Concrete Deliverables | Dependencies | Acceptance Criteria & Automated Tests | Estimated Effort |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M0: Research & Baseline Diagnosis** *(CURRENT)* | Conduct market research, audit source tree, diagnose root causes, and propose implementation plan. | `docs/restaurantos/RESTAURANTOS_3_3_REDESIGN_PLAN.md` | Comprehensive research report, root-cause table, 6 template specifications, wireframes, and roadmap. | None (Read-only phase). | Plan document written; zero application source files modified. Approval gate presented to user. | Complete (1 day) |
| **M1: Design System & Approval Sign-off** | Secure user approval on architectural decisions and finalize design tokens for Systems A & B. | `docs/restaurantos/*` | User sign-off recorded; design tokens, typography scales, and component contracts frozen. | Milestone 0 | Explicit user approval received for implementation to begin. | 0.5 days |
| **M2: Template AST & Modifier Domain Schema** | Extend domain models to support structured modifier groups and authoritative AST section rendering. | [`packages/domain/index.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/domain/index.ts), [`packages/storage/store.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/storage/store.ts) | `ModifierGroup` and `StorefrontDocument` schemas implemented; catalog migration script for test seed data. | Milestone 1 | Unit tests: Schema validation tests, minor-unit price calculations with modifiers. Zero regressions in existing store tests. | 1.5 days |
| **M3: Redesigned Marketplace Experience** | Transform `/marketplace` into a customer-facing visual discovery showcase with device preview frames. | [`packages/ui/pages/marketplace.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/marketplace.ts), [`src/server.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/src/server.ts) | Visual template gallery, cuisine filters, live preview modal with device toggles, 1-click installer. | Milestone 2 | Playwright test: Browse templates, switch viewports, install template to tenant, verify success notification. | 2 days |
| **M4: Six Distinct Storefront Templates** | Implement the 6 unique layout architectures in the storefront engine, parsing authoritative catalog data. | [`packages/ui/pages/diner.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/diner.ts), `packages/ui/templates/*` | 6 distinct template renderers: Haute Timeline, Nordic Harvest, Café Vitrine, Neon Alley, Trattoria Hearth, Tokyo Placard. | Milestone 2 | Visual test: Capture screenshots of all 6 templates with identical catalog data; verify distinct DOM structures and zero layout overlap. | 3 days |
| **M5: Responsive Diner PWA Experience** | Eliminate mobile constraints on desktop; deliver dedicated 1440px desktop, 768px tablet, and 390px mobile layouts. | [`packages/ui/pages/diner.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/diner.ts), [`packages/ui/components/cart.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/components/cart.ts) | 3-column desktop diner layout, sticky category navigation, bottom-sheet modifier modal, real-time cart. | Milestones 2, 4 | Browser tests at 1440×900, 768×1024, and 390×844. Verify modifier binding correctness (coffee modifiers only on coffee). | 2 days |
| **M6: Visual Studio AST Document Engine** | Connect Studio canvas and inspector directly to the persistent draft/publish AST pipeline. | [`packages/ui/pages/studio.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/studio.ts), [`src/server.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/src/server.ts) | Section drag-and-drop reordering, property inspector, live draft preview, publish-to-live pipeline. | Milestones 2, 5 | E2E test: Add section in Studio, edit headline, verify draft isolation, publish, verify live diner reflects update. | 2.5 days |
| **M7: Administrative Surfaces Redesign** | Redesign all 8 operational applications according to Design System A specifications. | [`packages/ui/pages/kds.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/kds.ts), `menu.ts`, `floor.ts`, `staff.ts`, `support.ts`, `whitelabel.ts` | High-contrast KDS workstation, split-pane Menu Manager, 2D Floor Studio, Support Inbox, Staff Directory, White-Label. | Milestones 1, 2 | Integration tests: Bump KDS ticket, update menu item availability, reorder floor tables, verify SSE real-time sync. | 3.5 days |
| **M8: Motion, Accessibility & Performance Polish** | Implement refined transitions, complete keyboard navigation, WCAG AA contrast compliance, and sub-second rendering. | `packages/ui/*`, `packages/styles/*` | Fluid drawer animations, full ARIA attributes, focus traps in modals, optimized SVG asset loading. | Milestones 3–7 | Lighthouse audit: Accessibility score ≥ 95, Performance score ≥ 90. Zero horizontal overflow across all viewports. | 1.5 days |
| **M9: Acceptance Testing & Regression Verification** | Execute full end-to-end regression test suite, capture visual verification artifacts, and document release readiness. | `scripts/test-browser-e2e.js`, `docs/restaurantos/*` | Master acceptance test report, full screenshot carousel across all viewports and templates, zero open defects. | Milestones 0–8 | 100% automated test pass rate. Zero regressions in financial minor-unit quotes, HMAC auth, and session capabilities. | 1.5 days |

---

## 11. Explicit Architectural Decisions Requiring User Approval

Before any application source code is modified, we request sign-off on the following 6 key architectural decisions:

1. **Domain Model Extension for Modifiers (`ModifierGroup` Schema):**
   - *Proposal:* Extend `MenuItem` in [`packages/domain/index.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/domain/index.ts) to include `modifierGroups?: ModifierGroup[]`. Each group specifies `id`, `name`, `minSelections`, `maxSelections`, and options with minor-unit price deltas (`priceDeltaMinor`).
   - *Rationale:* Permanently resolves the issue of mismatched dish modifiers (e.g. coffee milk options displaying on curry or pizza dishes).
2. **Authoritative AST Rendering Engine for Diner Storefront:**
   - *Proposal:* Refactor `/dine/:locator` in [`packages/ui/pages/diner.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/pages/diner.ts) to walk the template's `componentTree` (or published draft sections) rather than invoking hardcoded static HTML generators.
   - *Rationale:* Ensures that additions, reordering, and text edits made in Visual Studio are faithfully rendered on the customer-facing storefront.
3. **Three-Column Responsive Desktop Architecture for Diner PWA:**
   - *Proposal:* Abandon the narrow mobile column (`max-width: 540px`) on desktop viewports (≥1024px) in favor of a 3-column layout (Categories Left 240px, Menu Catalog Center 1fr, Sticky Order Drawer Right 360px). Mobile viewports (<768px) retain the streamlined single-column layout with a bottom cart bar.
   - *Rationale:* Delivers an immersive, widescreen experience for desktop diners while preserving mobile ordering efficiency.
4. **Separation of Concerns in Marketplace (Restaurateur vs. Developer View):**
   - *Proposal:* Redesign the main `/marketplace` route to display visual hospitality previews, device frame toggles, and 1-click install actions. Relocate technical AST metrics and engine internals to a dedicated `Developer Inspector` drawer.
   - *Rationale:* Presents restaurant owners with an intuitive discovery interface rather than an intimidating developer console.
5. **Two-Tier Design System Foundation:**
   - *Proposal:* Establish **Design System A** (dense, utilitarian, monospaced accents, Lucide SVGs) for back-of-house administration and **Design System B** (atmospheric, brand-specific typography and layout recipes) for customer storefronts.
   - *Rationale:* Prevents the restaurant's public storefront and the admin dashboard from looking like variations of the same generic application.
6. **Strict Preservation of Existing Security, Financial & Real-Time Invariants:**
   - *Commitment:* Preserve server-authoritative integer minor-unit pricing, HMAC-SHA256 staff authentication, `GuestCapability` session tokens, permanent physical QR locators, real-time SSE broadcasts, and the single-node deployment boundary without alteration.

---

## 12. Approval Sign-off Checklist

To authorize implementation, please review the checklist below and confirm in your response:

- [ ] **1. Executive Diagnosis Confirmed:** Concurrence on root causes (AST disconnect, missing modifier schema, desktop framing constraints, uniform card grids).
- [ ] **2. Market Research Alignment:** Approval of benchmark findings from Framer (Qitchen, MOKA, Sorrel), BentoBox, Toast, and Square.
- [ ] **3. Two-Tier Design System Strategy:** Sign-off on distinct design systems for administrative tools vs. public storefronts.
- [ ] **4. Six Template Architectural Concepts:** Approval of the 6 distinct layout specifications and grayscale wireframes.
- [ ] **5. Redesigned Marketplace Experience:** Sign-off on visual discovery layout and device preview modal.
- [ ] **6. Redesigned Diner PWA Architecture:** Approval of the 3-column desktop and responsive mobile ordering layouts.
- [ ] **7. Visual Studio Document AST Model:** Approval of the versioned JSON AST and draft/publish persistence pipeline.
- [ ] **8. Implementation Roadmap (Milestones 0–9):** Sign-off on sequencing, deliverables, and acceptance criteria.

---
*End of Master Plan. Awaiting explicit user approval before proceeding to Milestone 1.*
