# 🪐 OrbitoX RestaurantOS 4.1 — Storefront Reconstruction From Zero & Master Rebuild Blueprint

**Document Version**: 4.1.0-RC1  
**Phase State**: Phase 0 (Research, Source Audit & Implementation Plan)  
**Approval Gate**: 🔒 **LOCKED — Awaiting Explicit Owner Approval Before Any Code Modification**  
**Document URI**: `docs/restaurantos/RESTAURANTOS_4_1_STOREFRONT_REBUILD_PLAN.md`  
**Target Platform Kernel**: `@orbitox-io/plugin-engine` (v1.4.0) | `@orbitox-io/crm` (v1.0.1)  
**Authors**: Principal Product Designer, Digital Art Director, Restaurant Commerce UX Specialist, Senior Design Systems Architect, Visual Template-Engine Architect, Mobile UX Expert, KDS Product Designer, Senior Full-Stack Engineer  

---

## 📑 Master Table of Contents
1. [Executive Diagnosis: Why Past Redesigns Failed & The Zero-Rebuild Mandate](#1-executive-diagnosis-why-past-redesigns-failed--the-zero-rebuild-mandate)
2. [Empirical Research Matrix: 8+ Real-World Restaurant Flagships & Design Systems](#2-empirical-research-matrix-8-real-world-restaurant-flagships--design-systems)
3. [Read-Only Source Audit & Explicit Delete Inventory](#3-read-only-source-audit--explicit-delete-inventory)
4. [The Six Brand-New Canonical Customer Storefront Concepts](#4-the-six-brand-new-canonical-customer-storefront-concepts)
5. [Annotated Multi-Viewport Wireframes (Desktop 1440, Tablet 768, Mobile 390)](#5-annotated-multi-viewport-wireframes-desktop-1440-tablet-768-mobile-390)
6. [Grayscale Wireframe Test & Structural Uniqueness Matrix](#6-grayscale-wireframe-test--structural-uniqueness-matrix)
7. [Storefront Document AST Architecture & Modular Engine](#7-storefront-document-ast-architecture--modular-engine)
8. [Authoritative Catalog & Modifier Data Integrity Contract](#8-authoritative-catalog--modifier-data-integrity-contract)
9. [Purpose-Built Kitchen Instrument (KDS) & Expo Dispatch Redesign](#9-purpose-built-kitchen-instrument-kds--expo-dispatch-redesign)
10. [Full-Product Evaluation of 10 Application Workspaces](#10-full-product-evaluation-of-10-application-workspaces)
11. [Delete-and-Rebuild Migration, Backup & Rollback Strategy](#11-delete-and-rebuild-migration-backup--rollback-strategy)
12. [Phased Implementation Roadmap (Phases 0 through 10)](#12-phased-implementation-roadmap-phases-0-through-10)
13. [Objective Acceptance & Verification Strategy](#13-objective-acceptance--verification-strategy)
14. [Risks, Open Decisions & Owner Approval Gate Checklist](#14-risks-open-decisions--owner-approval-gate-checklist)

---

## 1. Executive Diagnosis: Why Past Redesigns Failed & The Zero-Rebuild Mandate

### 1.1 The Forensic Diagnosis
Previous attempts to differentiate the six canonical customer storefronts treated a deep presentation-layer problem as a styling exercise. While tokens, colors, typography, and test divergence scores changed:
- **The underlying page skeleton remained rigidly identical**: Every template inherited `.diner-layout-container` (`grid-template-columns: 240px minmax(0, 1fr) 370px`), with a top sticky navigation bar, a colored intro banner, a vertical list of cards with thumbnails on the left, a bottom floating pill, and an identical bottom-sheet modal.
- **Grayscale inspection revealed visual monotony**: In black and white, Michelin fine-dining looked structurally indistinguishable from an artisan coffee roastery or a Tokyo street food stall. They all shared the same visual rhythm, padding, card geometry, and button affordances.
- **Synthetic modifier metadata leaked into food items**: Modifiers were patched ad-hoc rather than strictly bound to the catalog item's `modifierGroups`, eroding domain credibility.
- **The templates were not self-authoring documents**: The templates were hardcoded procedural HTML switch statements inside a single monolithic file (`packages/ui/pages/diner.ts`), rather than modular, self-contained layout documents following modern composable standards (such as Shopify Online Store 2.0 sections and blocks, Framer components, or Webflow templates).

### 1.2 The Absolute Rebuild Mandate
In strict compliance with the Owner's directive:
1. **Zero CSS-patching or cosmetic renaming**: We will **delete** the legacy 6 template implementations entirely.
2. **True Structural Divergence**: Six completely new customer-facing storefronts with genuinely unique page compositions, navigation models, product presentation styles, and interaction physics.
3. **Strict Approval Gate**: No application source code (`.ts`, `.js`, `.css`, `.json`) will be modified until this research and implementation plan receives explicit Owner approval.

---

## 2. Empirical Research Matrix: 8+ Real-World Restaurant Flagships & Design Systems

To ground the new storefronts in verified commercial and digital art direction standards, we analyzed eight distinct global benchmarks and leading commerce design systems:

### 2.1 Research Matrix of Global References

| Reference | Category & URL | Information Architecture & Hierarchy | Hero & First Viewport | Navigation Model | Product Presentation | Typography & Art Direction | Key Insights to Adopt | Patterns to Avoid |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. SingleThread Farm & Alchemist** | **Luxury Fine Dining**<br>`singlethreadfarms.com`<br>`alchemist.dk` | Full-bleed editorial storytelling. Menu presented as a 10-course narrative progression (Acts / Movements) rather than a list of fast-food items. | Asymmetric editorial split. Left: High-concept photography. Right: Chef manifesto and reservation inquiry. Zero aggressive "+ Add" buttons. | Minimal horizontal Roman numeral anchor rail (`Act I · Hearth`, `Act II · Field`, `Act III · Sea`). | Sommelier-paired circular plate modules with provenance storytelling, wine pairing notes, and tasting additions. | Cormorant Garamond, Freight Big Pro, muted warm champagne (`#C5A059`), charcoal noir (`#090B0E`). | - Asymmetric split screen.<br>- Movement/chapter progression.<br>- Sommelier pairing drawer.<br>- Restrained, quiet luxury. | - Hiding ordering completely.<br>- Multi-megabyte uncompressed assets.<br>- Ambiguous navigation. |
| **2. Sey Coffee & April Coffee** | **Minimalist Artisan Coffee**<br>`seycoffee.com`<br>`aprilcoffeecopenhagen.com` | Scandinavian hyper-clean harvest ledger. High negative space. Extreme focus on estate lots, varietals, washing processes, and roast curves. | Stark architectural typographic header with live harvest rotation date and origin coordinates. No promotional banners. | Minimal sticky top category chips (`Whole Bean`, `Batch Brew`, `Filter Pour`, `Single Estate`). | Razor-sharp horizontal data rows: Estate lot, process (Washed/Natural), tasting pills, mono price, clean `+ Select`. | Inter Grotesque, JetBrains Mono, warm linen paper (`#F7F5F0`), stark black (`#141414`). | - Tabular data-dense ledger.<br>- Single-origin lot tagging.<br>- Warm linen base instead of black.<br>- Ultra-fast scanability. | - Cold medical/sterile appearance.<br>- Omitting imagery entirely.<br>- Slow multi-step checkouts. |
| **3. Tartine Bakery** | **Artisan Bakery & Hearth**<br>`tartinebakery.com` | Warm tactile morning counter. Focus on oven bake schedules (Morning Viennoiserie, Sourdough Hearth, Tartines, Coffee Counter). | Atmospheric warm bakery vitrine photography with fresh-out-of-the-oven schedule badge. | Organic rounded category pills with subtle active states (`Bread Schedule`, `Morning Bakes`, `Tartines`, `Beverages`). | Tactile vitrine cards with generous pastry shots, flour grain provenance, and direct inline quantity steppers `[- 1 +]`. | Recoleta Serif, Apercu Sans, warm terracotta (`#A84B2E`), warm parchment (`#FDFBF7`). | - Tactile `[- 1 +]` steppers on card faces.<br>- Daily bake schedule callout.<br>- Rich natural light photography.<br>- Warm parchment tones. | - Generic orange background overlays.<br>- Cluttered coupon banners.<br>- Tiny unclickable buttons. |
| **4. Momofuku Noodle Bar** | **Contemporary Street Food**<br>`momofukunoodlebar.com` | High-energy, high-rhythm urban dining. Dense 2-column street stall matrix, bold graphic typography, fast-tap ordering. | Bold angled brand wordmark with live night market BPM ticker and street hours (`Open until 02:00 AM`). | Sticky horizontal street stall tabs (`Buns & Bao`, `Noodles`, `Skewers`, `Late Night`). | High-contrast ticket cards with flame meters (`3X FIRE`), bold price stamps, and instant `+ BUMP` action triggers. | Syne ExtraBold, Space Grotesk, carbon slate (`#0B0E14`), electric cyan (`#00F2FE`), hot pink (`#FE0979`). | - Dense parallel stall matrix.<br>- High-contrast visual hierarchy.<br>- Instant bump actions.<br>- Street heat BPM ticker. | - Dark dashboard aesthetic.<br>- Cheap gaming glow effects.<br>- Unreadable low-contrast text. |
| **5. Via Carota NYC** | **Italian Trattoria & Osteria**<br>`viacarota.com` | Plain-text elevated simplicity rooted in Tuscan culinary traditions. Classic course progression: Antipasti -> Primi -> Secondi -> Dolci. | Centered classic Italian serif wordmark with hand-drawn olive branch divider and warm hearth story. | Traditional ribbon nav with Italian course names (`Antipasti & Spuntini`, `La Pasta Fresca`, `Secondi al Forno`, `Dolci`). | Warm framed editorial cards with DOP ingredient certifications, wood-oven badges, and "Tavola Grande" family feast combos. | Italian Plate Serif, Alegreya, Tuscan cream (`#FBF8F2`), olive green (`#3D4A39`), terracotta (`#8C3820`). | - Classic Italian course structure.<br>- Family sharing combo builder.<br>- DOP heritage certification seals.<br>- Warm Tuscan cream canvas. | - Red-and-white checkered cliches.<br>- Overly decorative borders.<br>- Slow multi-step ordering. |
| **6. Izakaya Rintaro SF & Afuri** | **Japanese Craft Izakaya & Ramen**<br>`izakayarintaro.com`<br>`afuriramen.com` | Hinoki cedar craftsmanship (*Shokunin*). Vertical typographic rhythm, deliberate ingredient provenance, structured bowl customizer. | Vertical Japanese kanji crest (*職人魂 · 極上出汁*), 18-hour simmered broth timer stat, steam mist ambiance. | Vertical timber plank navigation rail with Kanji and Latin dual-language tabs (`Otsumami`, `Ramen`, `Yakitori`, `Sake`). | Slat-style cedar cards with 18h dashi badges, broth density/noodle firmness checklist, and certified sake pairings. | Noto Serif JP, DM Sans, natural cedar wood (`#1E1915`), washi parchment (`#F7F4EB`), vermilion (`#D3381C`). | - Vertical timber plank rhythm.<br>- Integrated broth/noodle checklist.<br>- Cedar and washi paper design tokens.<br>- Craft sake flights. | - Inaccurate/fake Japanese text.<br>- Anime/cartoon styling.<br>- Cluttered coupon banners. |
| **7. Shopify Online Store 2.0** | **Modular Theme Architecture**<br>`help.shopify.com/themes` | Declarative JSON hierarchy: `Template -> Section -> Block`. Eliminates rigid monolithic page wrappers. | Hero section is an independent block configurable with layout variants (split, full-bleed, carousel, banner). | Decoupled header and navigation patterns per template archetype. | Product cards are modular blocks rendering dynamic schema properties rather than hardcoded HTML. | System typography with custom Google Font injection per theme JSON schema. | - Reusable section/block model.<br>- True structural decoupling.<br>- Isolated block styles.<br>- Declarative settings schema. | - Complex Liquid code overhead.<br>- Overly generic defaults without culinary hospitality context. |
| **8. Toast & Square KDS** | **Commercial Kitchen Systems**<br>`pos.toasttab.com/kds`<br>`squareup.com/kds` | Operational high-density touchscreen workstation. Station-filtered queues, All-Day item aggregation, multi-course pacing. | Real-time status bar: Active tickets, Rush mode alert, Edge connection status, Master prep clock. | Top station selector tabs (`ALL`, `ALL DAY`, `TANDOOR`, `CURRY LINE`, `BAR`, `EXPO`, `RECALL`). | Dense tickets with monospace timers (Green -> Amber -> Flashing Red), item checkmarks, allergen warning banners. | High-contrast monospace, dark kitchen slate (`#06080B`), pure white (`#FFFFFF`), signal amber/red. | - Two-level fulfillment (item + order).<br>- All-Day aggregation counts.<br>- Bump-bar hardware shortcuts.<br>- High-contrast steamy kitchen legibility. | - Consumer marketing styles.<br>- Decorative animations.<br>- Low-density cards requiring excessive scrolling. |

---

## 3. Read-Only Source Audit & Explicit Delete Inventory

A rigorous audit was conducted across `projects/external-os/restaurant-os`. The following inventory categorizes every existing component and module that must be eliminated, replaced, or refactored:

### 3.1 Component & Module Inventory

| File Path & Symbol | Current Purpose | Shared Coupling | Root Cause of Visual Failure | Proposed Disposition |
| :--- | :--- | :--- | :--- | :--- |
| `packages/ui/pages/diner.ts`<br>`renderHauteComposition` | Legacy Haute Gastronomy HTML renderer | Coupled to legacy 3-column container & hardcoded dark colors | Shares identical card stacking and thumbnail arrangement with other templates. | **REMOVE_AND_REPLACE** |
| `packages/ui/pages/diner.ts`<br>`renderNordicComposition` | Legacy Nordic HTML renderer | Coupled to legacy 3-column container | Despite lighter background, layout remains a linear card stack without genuine architectural divergence. | **REMOVE_AND_REPLACE** |
| `packages/ui/pages/diner.ts`<br>`renderCafeAtelierComposition` | Legacy Café Atelier HTML renderer | Coupled to legacy 3-column container | Reuses legacy food card structure with orange buttons and synthetic tags. | **REMOVE_AND_REPLACE** |
| `packages/ui/pages/diner.ts`<br>`renderNeonStreetComposition` | Legacy Neon Street HTML renderer | Coupled to legacy 3-column container | Dark box with pink borders instead of an authentic high-rhythm street market layout. | **REMOVE_AND_REPLACE** |
| `packages/ui/pages/diner.ts`<br>`renderTrattoriaComposition` | Legacy Trattoria HTML renderer | Coupled to legacy 3-column container | Linear cards with red borders rather than an authentic convivial Italian family feasting structure. | **REMOVE_AND_REPLACE** |
| `packages/ui/pages/diner.ts`<br>`renderTokyoIzakayaComposition` | Legacy Izakaya HTML renderer | Coupled to legacy 3-column container | Linear cards with green borders rather than an authentic timber plank craft rhythm. | **REMOVE_AND_REPLACE** |
| `packages/ui/pages/diner.ts`<br>`getCafeItemMeta` | Synthetic metadata generator | Hardcoded fallback for food items | Stamped fake coffee tags ("Micro-Lot Pour · Whole Milk") on Indian curries and snacks. | **REMOVE_AND_REPLACE** |
| `packages/ui/pages/diner.ts`<br>`.diner-layout-container` | Global 3-column CSS grid | Wraps all 6 templates into `240px minmax(0, 1fr) 370px` | Forces Michelin dining, casual cafes, and street food into the exact same dashboard layout. | **REMOVE_AND_REPLACE** |
| `packages/ui/pages/diner.ts`<br>`renderDinerPwa` | Master diner HTML generator | Hardcodes outer shell, topbar, and sidebars | Injects identical topbar and sidebars around every template. Must be refactored into a composable document renderer. | **REFACTOR_FOUNDATION** |
| `packages/domain/index.ts`<br>`DEFAULT_TEMPLATES` | Canonical 6 template definitions | Consumed by `store.ts`, `server.ts`, and marketplace | Contains obsolete schemas, legacy component trees, and token fallbacks. | **REMOVE_AND_REPLACE** |
| `packages/ui/pages/marketplace.ts`<br>`renderTemplateMiniPreview` | Hardcoded mini preview cards | Duplicates obsolete HTML snippets | Renders static mock previews instead of true dynamic AST documents. | **REMOVE_AND_REPLACE** |
| `packages/storage/store.ts`<br>`installTemplate` | Template installation engine | Updates `tenantBrand.activeTemplateId` | Reliable state machine; needs migration mapping for legacy template IDs. | **REFACTOR_FOUNDATION** |
| `packages/ui/pages/kds.ts`<br>`renderKdsWorkspace` | Kitchen Display System | Standalone operational tool | Working state machine; requires visual redesign into Toast/Square ergonomic workstation. | **REFACTOR_FOUNDATION** |
| `packages/domain/security.ts` | HMAC tokens, PIN auth, capabilities | Authoritative security engine | Zero cryptographic or domain flaws. Preserves all invariants. | **RETAIN_AS_INFRASTRUCTURE** |
| `packages/domain/money.ts` & `catalog.ts` | Integer minor units & quote verification | Authoritative pricing & hashing | Zero financial flaws. Must be strictly preserved. | **RETAIN_AS_INFRASTRUCTURE** |

---

## 4. The Six Brand-New Canonical Customer Storefront Concepts

We reject all existing six template implementations. The new designs are conceived from scratch with distinct architectural models:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                            RESTAURANTOS 4.1 CANONICAL ARCHETYPES                             │
├───────────────────────────────┬───────────────────────────────┬──────────────────────────────┤
│ 1. ATELIER ÉTOILE             │ 2. FJORD & FORM               │ 3. ROASTERY 1984             │
│ (Editorial Tasting Journey)   │ (Nordic Botanical Ledger)     │ (Artisan Café Vitrine)       │
│ • 50/50 Asymmetric Split      │ • Full-Width Specimen Rows    │ • 3-Column Tactile Vitrine   │
│ • Course Movement Chapters    │ • Hairline Ledger Grid        │ • Direct Card Face Steppers  │
│ • Sommelier Cellar Folio      │ • In-Row Expanding Specs      │ • Sensory Aroma Spectrum     │
├───────────────────────────────┼───────────────────────────────┼──────────────────────────────┤
│ 4. NEON YOKOCHO               │ 5. OSTERIA RUSTICA            │ 6. SHOKUNIN RAMEN & ROBATA   │
│ (Tokyo Street Food Lanes)     │ (Convivial Tuscan Feast)      │ (Cedar Woodcraft Izakaya)    │
│ • Parallel Dual-Stall Matrix  │ • Centered Editorial Column   │ • Vertical Timber Plank Rail │
│ • High-Contrast Ticket Cards  │ • Tavola Grande Combo Box     │ • Step-by-Step Bowl Builder  │
│ • Live BPM Heat Ticker        │ • DOP Certification Seals     │ • 18-Hour Broth Stat Badge   │
└───────────────────────────────┴───────────────────────────────┴──────────────────────────────┘
```

### 4.1 Template 1: Atelier Étoile — Fine Dining Editorial Tasting Journey
- **Design Objective**: Deliver an uncompromising Michelin-grade tasting experience prioritizing culinary narrative, ingredient provenance, and wine pairings.
- **Visual Reference**: SingleThread Farm, Alchemist Copenhagen, Eleven Madison Park.
- **Canvas & Palette**: Deep Obsidian Noir (`#080A0D`), Champagne Gold (`#C5A059`), Polished Slate (`#12161E`), Bone Ivory (`#F5F0E6`).
- **Typography**: Cormorant Garamond (Serif Headings), Neue Haas Grotesk / Inter (Clean Micro-Labels), Mono (Currency).
- **Page Architecture**: 50/50 Asymmetric Viewport Split. Left viewport: Fixed atmospheric visual canvas with chef quote and sommelier cellar status. Right viewport: Scrollable chronological tasting progression (*Movement I: Amuse & Crudo* → *Movement II: Charcoal Hearth* → *Movement III: Royal Mains* → *Movement IV: Sweet Finale*).
- **Product Presentation**: Circular plate photography modules, sommelier pairing banner per course, poetic ingredient narrative, refined "+ Add to Tasting Flight" button.
- **Cart Presentation**: Slide-over Sommelier Cellar Folio with tasting pacing countdown and service requests.

### 4.2 Template 2: Fjord & Form — Nordic Minimal Botanical Ledger
- **Design Objective**: Provide a tranquil, ultra-scannable farm-to-table menu inspired by Scandinavian architectural simplicity.
- **Visual Reference**: Hart Bageri Copenhagen, April Coffee, Noma Taste Journal.
- **Canvas & Palette**: Warm Scandinavian Linen (`#F7F5F0`), Stark Grotesque Black (`#121314`), Botanical Sage (`#3D5A45`), Chalk White (`#FFFFFF`).
- **Typography**: Inter Grotesque (Bold Architectural Headings), JetBrains Mono (Lot codes, coordinates, prices).
- **Page Architecture**: Full-Width Single-Column Botanical Ledger. No traditional cards! Minimalist header with live daylight coordinates and harvest season stamp. Menu displayed as precision hairline data rows:
  `[Plot/Origin Code]  [Botanical Name & Foraged Lot]  [Allergen Badge]  [Kr / ₹ Price]  [+ Select]`
- **Product Detail**: Clicking a row smoothly unrolls an inline spec sheet showing harvest farm coordinates, allergen breakdown, and preparation notes without opening a separate popup.
- **Cart Presentation**: Minimalist sticky bottom receipt status dock with clean monospace breakdown.

### 4.3 Template 3: Roastery 1984 — Artisan Café & Vitrine Counter
- **Design Objective**: Deliver an intuitive, tactile counter ordering experience built specifically for specialty roasteries, espresso bars, and artisan bakeries.
- **Visual Reference**: Onyx Coffee Lab, Sey Coffee Brooklyn, Tartine Bakery.
- **Canvas & Palette**: Warm Cream Parchment (`#FDFBF7`), Rich Espresso Brown (`#241D17`), Warm Terracotta (`#A84B2E`), Pure Milk White (`#FFFFFF`).
- **Typography**: Space Grotesk (Expressive Modern Headings), Outfit (Warm Friendly Body).
- **Page Architecture**: Top Roastery Vitrine Carousel featuring daily single-origin lots with sensory flavor wheels (*Acidity*, *Body*, *Sweetness*), followed by a 3-column product grid.
- **Product Presentation**: Tactile product vitrines with generous photography, roast profile pills (*Single Origin*, *Washed*), and **direct inline quantity steppers `[- 1 +]` mounted on the card face**.
- **Modifier Flow**: Direct inline options (Milk selection, Temperature, Extra shot) embedded directly on the product module.
- **Cart Presentation**: Floating tactile capsule pill showing cup count and live subtotal.

### 4.4 Template 4: Neon Yokocho — Contemporary Street Food & Night Market
- **Design Objective**: Capture the kinetic energy and high visual rhythm of a bustling Tokyo night market alley.
- **Visual Reference**: Momofuku Noodle Bar, Black Tap Craft, Afuri Harajuku.
- **Canvas & Palette**: Carbon Night Slate (`#07090E`), Electric Cyan (`#00F2FE`), Tokyo Magenta (`#FE0979`), Subdued Violet (`#14101F`).
- **Typography**: Syne ExtraBold (Loud Street Headings), Space Grotesk (Stall Labels), Monospace (BPM / Price).
- **Page Architecture**: Dual-Stall Parallel Market Lanes. Left Lane: *Stall 01: Bincho-tan Yakitori Skewers* | Right Lane: *Stall 02: Wok Fire & Smashed Bao*. Top bar features a live street heat BPM ticker (`128 BPM`) and late-night order rush tracker.
- **Product Presentation**: High-contrast horizontal street ticket cards with flame meters (`3X FIRE`), bold price stamps, and an instant rapid-tap `+ BUMP` action trigger.
- **Cart Presentation**: Bottom late-night street order bag with street combo deals.

### 4.5 Template 5: Osteria Rustica — Convivial Tuscan Family Feast
- **Design Objective**: Celebrate warm, convivial Italian hospitality with storytelling, wood-fired hearth warmth, and family sharing feasts.
- **Visual Reference**: Carbone NYC, Via Carota, Rezdôra Osteria.
- **Canvas & Palette**: Tuscan Cream (`#FBF8F2`), Sienese Terracotta (`#8C3820`), Olive Leaf Green (`#3D4A39`), Crisp White (`#FFFFFF`).
- **Typography**: Italian Plate Serif (Classic Traditional Headings), Alegreya (Warm Book Narrative).
- **Page Architecture**: Centered Classic Editorial Column with wood-fired hearth storytelling masthead, followed by traditional Italian course sequence: *Antipasti della Casa* → *Primi Piatti (Pasta Fresca)* → *Secondi al Forno* → *Dolci Artigianali*.
- **Featured Module**: "Tavola Grande" Family Feast Bundle builder: diners select 2 Pizzas + 2 Pastas + Wine Carafe with bundled savings.
- **Product Presentation**: Generous framed cards with DOP ingredient certification badges, wood-oven seals, and pasta shape guides.
- **Cart Presentation**: Handcrafted leather folio bill presenter drawer.

### 4.6 Template 6: Shokunin Ramen & Robata — Hinoki Woodcraft Izakaya
- **Design Objective**: Channel the disciplined, minimalist mastery of Japanese culinary craft (*Shokunin*) through natural cedar textures, deliberate vertical typography, and structured customization.
- **Visual Reference**: Izakaya Rintaro SF, Afuri Ramen, Ippudo Tokyo.
- **Canvas & Palette**: Hinoki Cedar Wood (`#1E1915`), Washi Off-White (`#F7F4EB`), Charcoal Ink (`#101413`), Vermilion Red (`#D3381C`).
- **Typography**: Noto Serif JP (Authentic Japanese Serif), DM Sans (Humanist Clean Body).
- **Page Architecture**: Vertical Timber Plank Navigation Rail with Japanese kanji banner (*職人魂 · 極上出汁*), followed by a structured cedar menu board.
- **Interactive Ramen Customizer**: Step-by-step ramen customizer embedded into the menu flow:
  `Broth Richness (Kotteri / Assari)` → `Noodle Firmness (Katame / Futsuu / Yawarakame)` → `Tare Seasoning` → `Toppings Bar`.
- **Product Presentation**: Slat-style timber plank cards with 18-hour broth timer badges, tare options, and certified sake flights.
- **Cart Presentation**: Japanese bento-style wooden check tray with table service call bell.

---

## 5. Annotated Multi-Viewport Wireframes (Desktop 1440, Tablet 768, Mobile 390)

The following wireframes define the structural placement and proportions across viewports:

### 5.1 Template 1: Atelier Étoile (Fine Dining Asymmetric Split)

```
DESKTOP (1440 × 900)
┌────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ LEFT VIEWPORT (50% Fixed Editorial Canvas)             │ RIGHT VIEWPORT (50% Scrollable Tasting Sequence)       │
│                                                        │                                                        │
│ [ RESTAURANT CREST & TABLE T-14 LOCATOR ]              │ [ MOVEMENT 01 · AMUSE & CRUDO ]                        │
│                                                        │ ┌────────────────────────────────────────────────────┐ │
│ ┌────────────────────────────────────────────────────┐ │ │ (○) Plate Photo   Title: Charcoal Smoked Paneer   │ │
│ │                                                    │ │ │                   Pairing: Blanc de Blancs Brut    │ │
│ │            FULL-BLEED EDITORIAL PHOTO              │ │ │                   ₹350  [ + ADD TO TASTING FLIGHT ]│ │
│ │                                                    │ │ └────────────────────────────────────────────────────┘ │
│ └────────────────────────────────────────────────────┘ │                                                        │
│                                                        │ [ MOVEMENT 02 · CHARCOAL HEARTH & TANDOOR ]            │
│ "24 hours slow-simmered over dying sal wood coals.     │ ┌────────────────────────────────────────────────────┐ │
│ True flavor cannot be rushed."                         │ │ (○) Plate Photo   Title: Dal Makhani Simmered 24h  │ │
│ — Executive Chef Curator                               │ │                   Pairing: Sula Dindori Reserve    │ │
│                                                        │ │                   ₹380  [ + ADD TO TASTING FLIGHT ]│ │
│ [ SOMMELIER CELLAR STATUS: CELLAR READY ]              │ └────────────────────────────────────────────────────┘ │
│ [ CALL SOMMELIER ]  [ VIEW CELLAR FOLIO (3 COURSES) ] │                                                        │
└────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────┘

TABLET (768 × 1024)                                       MOBILE (390 × 844)
┌──────────────────────────────────────────────┐         ┌──────────────────────────────────────┐
│ [ ATELIER ÉTOILE · TABLE T-14 ]              │         │ [ ATELIER ÉTOILE ]       [TABLE T-14]│
├──────────────────────────────────────────────┤         ├──────────────────────────────────────┤
│ [ HERO PHOTO (Compact 320px) ]               │         │ [ EDITORIAL HERO BANNER ]            │
│ "24h slow simmer over sal wood coals..."     │         │ "24h slow simmer..." — Chef          │
├──────────────────────────────────────────────┤         ├──────────────────────────────────────┤
│ [ ACT I: AMUSE ] [ ACT II: HEARTH ] [ ACT III│         │ [I · AMUSE] [II · HEARTH] [III · MAIN│
├──────────────────────────────────────────────┤         ├──────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │         │ ┌──────────────────────────────────┐ │
│ │ (○) Plate Shot  Smoked Paneer Tikka      │ │         │ │(○) Paneer Tikka Charcoal         │ │
│ │                 Pairing: Blanc de Blancs │ │         │ │    Pairing: Blanc de Blancs      │ │
│ │                 ₹350  [ + ADD COURSE ]   │ │         │ │    ₹350    [ + ADD COURSE ]      │ │
│ └──────────────────────────────────────────┘ │         │ └──────────────────────────────────┘ │
│                                              │         ├──────────────────────────────────────┤
│ [ FLOATING SOMMELIER CELLAR PILL: 2 DISHES ] │         │ [ CELLAR FOLIO: 2 COURSES · ₹730 → ] │
└──────────────────────────────────────────────┘         └──────────────────────────────────────┘
```

---

### 5.2 Template 2: Fjord & Form (Nordic Minimal Botanical Ledger)

```
DESKTOP (1440 × 900)
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [ FJORD & FORM ]           HARVEST ROTATION · OCTOBER           ORIGIN 30°54'N 75°51'E             [TABLE T-14] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 01 / FORAGED BOTANICAL PLATES & STARTERS                                                                        │
├──────┬───────────────────────────────────────────────────────┬────────────┬─────────────────────────┬───────────┤
│ LOT  │ BOTANICAL DISH & PROVENANCE                           │ ALLERGENS  │ PRICE                   │ ACTION    │
├──────┼───────────────────────────────────────────────────────┼────────────┼─────────────────────────┼───────────┤
│ #081 │ Amritsari River Sole · Cold-Pressed Ajwain Oil        │ [FISH]     │ ₹480.00                 │ [+ SELECT]│
│ #082 │ Fire-Roasted Cottage Cheese · Himalayan Mint Emulsion │ [DAIRY]    │ ₹350.00                 │ [+ SELECT]│
├──────┴───────────────────────────────────────────────────────┴────────────┴─────────────────────────┴───────────┤
│ 02 / FERMENTED SOURDOUGH & HEARTH PROVISIONS                                                                    │
├──────┬───────────────────────────────────────────────────────┬────────────┬─────────────────────────┬───────────┤
│ #094 │ 24-Hour Simmered Black Lentils · Farmhouse Makhan     │ [DAIRY]    │ ₹380.00                 │ [+ SELECT]│
│ #095 │ Clay Oven Flatbread · Salted Farm Butter              │ [GLUTEN]   │ ₹70.00                  │ [+ SELECT]│
├──────┴───────────────────────────────────────────────────────┴────────────┴─────────────────────────┴───────────┤
│ [ DOCK: 2 ITEMS SELECTED · SUBTOTAL ₹830.00 · 5% GST ₹41.50 · TOTAL ₹871.50 ]               [ DISPATCH ORDER → ]│
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

TABLET (768 × 1024)                                       MOBILE (390 × 844)
┌──────────────────────────────────────────────┐         ┌──────────────────────────────────────┐
│ [ FJORD & FORM ]       55°N 12°E · AUTUMN    │         │ [ FJORD & FORM ]           [T-14]    │
├──────────────────────────────────────────────┤         │ Harvest: Autumn · 30°N 75°E          │
│ 01 / FORAGED BOTANICALS                      │         ├──────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │         │ 01 / FORAGED BOTANICALS              │
│ │ #081 Amritsari Sole      ₹480 [+ SELECT] │ │         ├──────────────────────────────────────┤
│ │      River sole · cold-pressed ajwain    │ │         │ #081 Amritsari Sole          ₹480    │
│ ├──────────────────────────────────────────┤ │         │      River sole · ajwain  [+ SELECT] │
│ │ #082 Smoked Paneer       ₹350 [+ SELECT] │ │         ├──────────────────────────────────────┤
│ │      Charcoal seared · mint emulsion     │ │         │ #082 Smoked Paneer           ₹350    │
│ └──────────────────────────────────────────┘ │         │      Charcoal mint        [+ SELECT] │
│                                              │         ├──────────────────────────────────────┤
│ [ RECEIPT DOCK: 2 ITEMS · ₹871.50 · SEND → ] │         │ [ RECEIPT: 2 ITEMS · ₹871.50 | SEND ]│
└──────────────────────────────────────────────┘         └──────────────────────────────────────┘
```

---

### 5.3 Template 3: Roastery 1984 (Artisan Café Vitrine Counter)

```
DESKTOP (1440 × 900)
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [ ROASTERY 1984 LOGO ]              (ESPRESSO)  (SLOW POUR)  (BAKERY)  (BRUNCH)            [TABLE T-14] [CART 2]│
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ DAILY ROASTERY VITRINE SHOWCASE                                                                                 │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐ ┌─────────────────────────────┐                 │
│ │ LOT: YIRGACHEFFE NATURAL    │ │ LOT: HUILA PINK BOURBON     │ │ LOT: RATNAGIRI ESTATE       │                 │
│ │ Notes: Jasmine · Bergamot   │ │ Notes: Wild Honey · Peach   │ │ Notes: Mango · Cardamom     │                 │
│ │ Roast: Light · Acidity: High│ │ Roast: Med · Acidity: Mid   │ │ Chilled Yogurt Whipped      │                 │
│ └─────────────────────────────┘ └─────────────────────────────┘ └─────────────────────────────┘                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ CRAFT BEVERAGES & FRESH BAKES                                                                                   │
│ ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐                            │
│ │ [PHOTO]                 │ │ [PHOTO]                 │ │ [PHOTO]                 │                            │
│ │ Alphonso Mango Lassi    │ │ Paneer Tikka Croissant  │ │ Cold Brew Reserve       │                            │
│ │ Chilled Ratnagiri batch │ │ Flaky sourdough laminate│ │ 16h immersion drip      │                            │
│ │ ₹140.00                 │ │ ₹280.00                 │ │ ₹180.00                 │                            │
│ │ [- 1 +] (Mounted Step)  │ │ [- 0 +] (Mounted Step)  │ │ [- 2 +] (Mounted Step)  │                            │
│ └─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

TABLET (768 × 1024)                                       MOBILE (390 × 844)
┌──────────────────────────────────────────────┐         ┌──────────────────────────────────────┐
│ [ ROASTERY 1984 ]                [TABLE T-14]│         │ [ ROASTERY 1984 ]        [TABLE T-14]│
├──────────────────────────────────────────────┤         ├──────────────────────────────────────┤
│ (Espresso Bar) (Slow Pour) (Bakery) (Brunch) │         │ (Espresso) (Pour) (Bakery) (Brunch)  │
├──────────────────────────────────────────────┤         ├──────────────────────────────────────┤
│ ┌──────────────────┐ ┌───────────────────┐   │         │ ┌──────────────────────────────────┐ │
│ │ [PHOTO]          │ │ [PHOTO]           │   │         │ │ [PHOTO] Mango Lassi       ₹140.00│ │
│ │ Mango Lassi      │ │ Tikka Croissant   │   │         │ │         Ratnagiri batch          │ │
│ │ ₹140.00          │ │ ₹280.00           │   │         │ │         [ -  1  + ] (Tactile)    │ │
│ │ [- 1 +] (Stepper)│ │ [- 0 +] (Stepper) │   │         │ └──────────────────────────────────┘ │
│ └──────────────────┘ └───────────────────┘   │         │ ┌──────────────────────────────────┐ │
│                                              │         │ │ [PHOTO] Warm Gulab Jamun  ₹190.00│ │
│ [ FLOATING CAPSULE: 3 ITEMS · ₹460.00 → ]    │         │ │         Lachha rabri             │ │
└──────────────────────────────────────────────┘         │ │         [ -  1  + ] (Tactile)    │ │
                                                         │ └──────────────────────────────────┘ │
                                                         ├──────────────────────────────────────┤
                                                         │ [ 2 ITEMS · ₹330.00 | VIEW ORDER → ] │
                                                         └──────────────────────────────────────┘
```

---

### 5.4 Template 4: Neon Yokocho (Tokyo Street Food Dual Lanes)

```
DESKTOP (1440 × 900)
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [ NEON YOKOCHO // 東京 ]    STREET HEAT 128 BPM     LATE NIGHT SHIFT TIL 02:00 AM      [TABLE T-14] [BAG: 3]    │
├───────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────┤
│ STALL 01: BINCHO-TAN CHARCOAL SKEWERS                 │ STALL 02: WOK FIRE & SMASHED BAO                        │
│ ┌───────────────────────────────────────────────────┐ │ ┌─────────────────────────────────────────────────────┐ │
│ │ [SHOT]  Amritsari Sole Skewers      FIRE 3X SPICE │ │ │ [SHOT]  Old Delhi Butter Chicken    RICH GRAVY      │ │
│ │         Single skewer, ajwain glaze               │ │ │         Tender chicken, fenugreek honey             │ │
│ │         ₹480.00                   [ + BUMP (zap) ]│ │ │         ₹490.00                     [ + BUMP (zap) ]│ │
│ └───────────────────────────────────────────────────┘ │ └─────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────────────┐ │ ┌─────────────────────────────────────────────────────┐ │
│ │ [SHOT]  Charcoal Seared Paneer      FIRE 2X SPICE │ │ │ [SHOT]  Crisp Garlic Butter Naan    HOT TANDOOR     │ │
│ │         Kashmiri chili, char smoke                │ │ │         Charred garlic, nigella                     │ │
│ │         ₹350.00                   [ + BUMP (zap) ]│ │ │         ₹90.00                      [ + BUMP (zap) ]│ │
│ └───────────────────────────────────────────────────┘ │ └─────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────┘

TABLET (768 × 1024)                                       MOBILE (390 × 844)
┌──────────────────────────────────────────────┐         ┌──────────────────────────────────────┐
│ [ NEON YOKOCHO ]   128 BPM HEAT   [TABLE T-14│         │ [ YOKOCHO // 夜市 ]       128 BPM 🔥 │
├──────────────────────────────────────────────┤         ├──────────────────────────────────────┤
│ [ STALL 01: SKEWERS ]  [ STALL 02: WOK & BAO]│         │ [STALL 1: SKEWERS] [STALL 2: WOK/BAO]│
├──────────────────────────────────────────────┤         ├──────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │         │ ┌──────────────────────────────────┐ │
│ │ [SHOT] Amritsari Sole Skewers   FIRE 3X  │ │         │ │ [SHOT] Sole Skewer       FIRE 3X │ │
│ │        ₹480.00           [ + BUMP (zap) ]│ │         │ │        ₹480.00           [+ BUMP]│ │
│ └──────────────────────────────────────────┘ │         │ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │         │ ┌──────────────────────────────────┐ │
│ │ [SHOT] Smoked Paneer Tikka      FIRE 2X  │ │         │ │ [SHOT] Paneer Tikka      FIRE 2X │ │
│ │        ₹350.00           [ + BUMP (zap) ]│ │         │ │        ₹350.00           [+ BUMP]│ │
│ └──────────────────────────────────────────┘ │         │ └──────────────────────────────────┘ │
│                                              │         ├──────────────────────────────────────┤
│ [ STREET ORDER BAG: 2 ITEMS · ₹830.00 → ]    │         │ [ STREET BAG: 2 DISHES · ₹830 | 🔥 ] │
└──────────────────────────────────────────────┘         └──────────────────────────────────────┘
```

---

### 5.5 Template 5: Osteria Rustica (Tuscan Convivial Family Feast)

```
DESKTOP (1440 × 900)
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [ OSTERIA RUSTICA ]           FORNO A LEGNA & PASTA FATTA A MANO · DAL 1974               [TAVOLO T-14] [CONTO] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ TAVOLA GRANDE · FAMILY SHARING FEAST COMBO BUILDER                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Choose any 2 Primi + 2 Secondi + Chianti Classico Carafe (15% Convivial Feast Savings)                      │ │
│ │ [ BUILD FAMILY FEAST BUNDLE → ]                                                                             │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ANTIPASTI DELLA CASA                                  LA PASTA FRESCA & SECONDI AL FORNO                        │
│ ┌───────────────────────────────────────────────────┐ ┌───────────────────────────────────────────────────────┐ │
│ │ [PHOTO]  Paneer al Forno Rustico       DOP SEAL   │ │ [PHOTO]  Dal Makhani della Tradizione    SLOW HEARTH  │ │
│ │          Wood-fired cottage cheese, fresh herbs   │ │          24h slow simmer, farmhouse makhan            │ │
│ │          ₹350.00                    [ + ORDINA ]  │ │          ₹380.00                     [ + ORDINA ]     │ │
│ └───────────────────────────────────────────────────┘ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

TABLET (768 × 1024)                                       MOBILE (390 × 844)
┌──────────────────────────────────────────────┐         ┌──────────────────────────────────────┐
│ [ OSTERIA RUSTICA ]             [TAVOLO T-14]│         │ [ OSTERIA RUSTICA ]      [TAVOLO 14] │
├──────────────────────────────────────────────┤         ├──────────────────────────────────────┤
│ [ TAVOLA GRANDE: FAMILY FEAST BUNDLE (15%) ] │         │ [ TAVOLA GRANDE FEAST BUNDLE (-15%) ]│
├──────────────────────────────────────────────┤         ├──────────────────────────────────────┤
│ (Antipasti) (Primi Piatti) (Secondi) (Dolci) │         │ (Antipasti) (Primi) (Secondi) (Dolci)│
├──────────────────────────────────────────────┤         ├──────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │         │ ┌──────────────────────────────────┐ │
│ │ [PHOTO] Paneer al Forno         DOP SEAL │ │         │ │ [PHOTO] Paneer al Forno  DOP SEAL│ │
│ │         ₹350.00             [ + ORDINA ] │ │         │ │         ₹350.00     [ + ORDINA ] │ │
│ └──────────────────────────────────────────┘ │         │ └──────────────────────────────────┘ │
│                                              │         ├──────────────────────────────────────┤
│ [ IL CONTO DEL TAVOLO: 2 PIATTI · ₹730.00 ]  │         │ [ IL CONTO: 2 PIATTI · ₹730.00 → ]   │
└──────────────────────────────────────────────┘         └──────────────────────────────────────┘
```

---

### 5.6 Template 6: Shokunin Ramen & Robata (Hinoki Woodcraft Izakaya)

```
DESKTOP (1440 × 900)
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 職人魂 · 極上出汁    SHOKUNIN RAMEN & ROBATA CRAFT BAR        KANSUI 32% · SIMMERED 18H         [席番: T-14] [伝票]│
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ CRAFT YOUR RAMEN BOWL ORDER (STEP-BY-STEP CHECKLIST)                                                            │
│ ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────────────┐ │
│ │ 1. BROTH RICHNESS     │ │ 2. NOODLE FIRMNESS    │ │ 3. TARE SEASONING     │ │ 4. CRAFT TOPPINGS             │ │
│ │ (●) Kotteri (Rich Oil)│ │ (●) Katame (Firm)     │ │ (●) Shoyu (Aged Soy)  │ │ [✓] Nitamago Egg (+₹30)       │ │
│ │ ( ) Assari (Light Dsh)│ │ ( ) Futsuu (Standard) │ │ ( ) Shio (Sea Salt)   │ │ [✓] Flame Chashu (+₹50)       │ │
│ └───────────────────────┘ └───────────────────────┘ └───────────────────────┘ └───────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ CEDAR BOARD MENU (SIGNATURE BOWLS & ROBATA SKEWERS)                                                             │
│ ┌───────────────────────────────────────────────────┐ ┌───────────────────────────────────────────────────────┐ │
│ │ [SHOT]  Charcoal Yakitori Sole Skewer     18H TARE│ │ [SHOT]  Simmered Black Dal Ramen Bowl    KOTTERI DENSE│ │
│ │         River sole, tare glaze, sansho pepper     │ │         Simmered 24h, aged tare, springy ramen        │ │
│ │         ₹480.00                   [ + ORDER BOWL ]│ │         ₹380.00                      [ + ORDER BOWL ] │ │
│ └───────────────────────────────────────────────────┘ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

TABLET (768 × 1024)                                       MOBILE (390 × 844)
┌──────────────────────────────────────────────┐         ┌──────────────────────────────────────┐
│ 職人魂 · SHOKUNIN RAMEN BAR     [席番: T-14] │         │ 職人魂 · SHOKUNIN        [席番: T-14]│
├──────────────────────────────────────────────┤         ├──────────────────────────────────────┤
│ [ STEP-BY-STEP RAMEN BUILDER CHECKLIST ]     │         │ [ STEP-BY-STEP RAMEN BOWL BUILDER ]  │
├──────────────────────────────────────────────┤         │ Broth: Kotteri · Noodle: Katame Firm │
│ (Otsumami) (Ramen Bowls) (Robata) (Sake)     │         ├──────────────────────────────────────┤
├──────────────────────────────────────────────┤         │ (Otsumami) (Ramen) (Robata) (Sake)   │
│ ┌──────────────────────────────────────────┐ │         ├──────────────────────────────────────┤
│ │ [SHOT] Sole Yakitori Skewer     18H TARE │ │         │ ┌──────────────────────────────────┐ │
│ │        ₹480.00          [ + ORDER BOWL ] │ │         │ │ [SHOT] Sole Skewer      18H TARE │ │
│ └──────────────────────────────────────────┘ │         │ │        ₹480.00  [ + ORDER BOWL ] │ │
│                                              │         │ └──────────────────────────────────┘ │
│ [ 伝票 (BENTO TRAY): 2 ITEMS · ₹860.00 → ]   │         ├──────────────────────────────────────┤
└──────────────────────────────────────────────┘         │ [ 伝票: 2 ITEMS · ₹860.00 | 注文 → ] │
                                                         └──────────────────────────────────────┘
```

---

## 6. Grayscale Wireframe Test & Structural Uniqueness Matrix

To prove that the six proposed designs are structurally distinct in black and white without relying on color tokens, they are compared side-by-side across 12 dimensions:

### 6.1 The 12-Dimensional Grayscale Comparison Matrix

| Dimension | 1. Atelier Étoile | 2. Fjord & Form | 3. Roastery 1984 | 4. Neon Yokocho | 5. Osteria Rustica | 6. Shokunin Ramen |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Header & Masthead** | Minimal centered serif wordmark with reservation inquiry | Left-aligned geometric sans with daylight coordinates | Top centered emblem with roastery vitrine badge | Angled high-contrast street wordmark with BPM ticker | Centered classic Italian serif with hand-drawn olive rule | Vertical Kanji crest + Latin dual-language header |
| **2. Hero Introduction** | 50/50 Asymmetric split with full-viewport visual canvas | Hairline archival ledger header with origin stamp | 3-item roast profile carousel with aroma dials | Loud night market marquee with dual-stall rush status | Wood-fired hearth storytelling banner with dough age | Cedar woodcraft board with simmered broth timer |
| **3. Main Page Geometry** | Sequenced course movement timeline chapters | Single-column horizontal specimen ledger | 3-column product vitrine grid | Parallel dual-stall side-by-side market lanes | Centered classic editorial reading column | Vertical timber plank rhythm with modular boxes |
| **4. Category Navigation** | Roman numeral anchor progression (*Movement I–IV*) | Sticky monochrome numbered rail (*01 / Harvest*) | Organic rounded category pill carousel | Left-rail vertical street cart tabs | Centered classic ribbon with Italian course names | Vertical timber tab strip with Kanji labels |
| **5. Product Module Construction** | Circular plate photo with sommelier pairing banner | Hairline tabular row with estate lot and allergen badge | Large product photo with **direct inline `[- 1 +]` stepper** | Dense ticket card with flame badge and `+ BUMP` trigger | Framed rustic card with DOP badge and combo option | Slat-style timber card with 18h dashi timer |
| **6. Detail & Customizer Interaction** | Slide-over cellar tasting notes modal | Inline expanding spec drawer (zero popup modal) | Direct inline chip selector (Milk, Temp, Roast) | Rapid slide-up street modifier drawer | Family feast portion & crust selector modal | Step-by-step ramen customizer (Broth, Noodle, Tare) |
| **7. Cart & Bill Presentation** | Sommelier Cellar Folio drawer | Minimalist bottom status dock | Floating tactile capsule pill with cup count | Bottom late-night street order bag | Leather-styled trattoria bill folio presenter | Bento-style wooden check tray with call bell |
| **8. Typography Direction** | Cormorant Garamond & Playfair Display (Luxury Serif) | Inter Grotesque & JetBrains Mono (Precision Mono) | Space Grotesk & Outfit (Tactile Modern Sans) | Syne ExtraBold & Space Grotesk (Expressive Street) | Italian Plate & Alegreya (Warm Book Serif) | Noto Serif JP & DM Sans (Humanist Japanese Serif) |
| **9. Image Arrangement** | Dramatic circular & editorial close-ups | Zero decorative photos; pure botanical specimen focus | Large top-down product vitrine photography | Dense square thumbnail street stall shots | Generous framed family sharing spreads | Steaming bowl & bincho charcoal skewer close-ups |
| **10. Motion Language** | Slow, elegant fades and editorial mask reveals | Instant tabular state changes; zero spring bounce | Tactile physical click-down on stepper buttons | Snappy energetic transitions with street blink accents | Gentle warm accordion unfolding | Crisp, disciplined sliding drawer transitions |
| **11. Desktop Layout Width** | 50/50 Split (1440px viewport locked) | Full-width ledger (1320px max-width) | 3-column grid (1280px max-width) | Split dual-stall lanes (1400px max-width) | Centered editorial reading width (1080px max-width) | Asymmetric Japanese ledger layout (1360px max-width) |
| **12. Mobile Interaction** | Single-column luxury editorial with sticky Movement bar | Compact tabular harvest list with micro tags | Stacked tactile cards with direct touch steppers | Fast-scrolling dual stall feeds with thumb dock | Convivial course cards with combo options | Structured ramen builder with bottom sheet |

---

## 7. Storefront Document AST Architecture & Modular Engine

To guarantee that templates have real structural autonomy and that the Visual Brand Studio never corrupts data, RestaurantOS 4.1 introduces a **Composable Storefront Document Abstract Syntax Tree (AST)** engine.

### 7.1 The AST Schema Contract

```typescript
export interface StorefrontTokenBundle {
  colorBase: string;          // Root background canvas
  colorSurface: string;       // Card and panel surfaces
  colorText: string;          // Primary typography
  colorMuted: string;         // Secondary typography and captions
  colorAccent: string;        // Primary brand action color
  colorBorder: string;        // Structural dividers and card strokes
  fontHeading: string;        // Headings font family
  fontBody: string;           // Body copy font family
  fontMono: string;           // Monospace prices, lot codes, timers
  radius: string;             // Border radius tokens (e.g. 0px, 8px, 16px, 999px)
  elevation: string;          // Box shadow elevation tokens
}

export interface StorefrontComponentBlock {
  id: string;
  type: string;                // e.g. 'SommelierPairingBanner', 'TactileStepperPill', 'FlameMeterBadge'
  props: Record<string, any>;
  bindings?: {
    field: string;             // e.g. 'item.name', 'item.formattedPrice', 'item.modifierGroups'
  };
}

export interface StorefrontSectionNode {
  id: string;
  type: 'hero' | 'story' | 'catalog_menu' | 'featured_showcase' | 'customizer_module' | 'hours_contact';
  layoutPattern: 'split-asymmetric' | 'horizontal-ledger' | 'tactile-vitrine-grid' | 'dual-lane-market' | 'centered-editorial' | 'timber-plank-board';
  title?: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  visible: boolean;
  order: number;
  blocks: StorefrontComponentBlock[];
  customProps?: Record<string, any>;
}

export interface StorefrontDocument {
  schemaVersion: '4.1.0';
  templateId: string;
  slug: string;
  name: string;
  category: string;
  author: string;
  version: string;
  tokens: StorefrontTokenBundle;
  shell: {
    pageArchitecture: string;
    navigationModel: 'movement-timeline' | 'monochrome-top-rail' | 'rounded-pills' | 'street-tabs' | 'italian-ribbon' | 'timber-plank-rail';
    cartPresentation: 'cellar-folio' | 'minimal-dock' | 'tactile-capsule' | 'street-bag' | 'leather-folio' | 'bento-tray';
    customHeaderLayout?: string;
  };
  sections: StorefrontSectionNode[];
}
```

### 7.2 Core Architectural Principles
1. **No Universal Outer Wrapper**: The obsolete `.diner-layout-container` 3-column wrapper is abolished. Each template renders its own full-page layout shell based on its `pageLayout` token.
2. **Component Autonomy**: Templates define their own product presentation components (Atelier uses `SommelierPlateRow`, Fjord uses `LedgerSpecimenRow`, Roastery uses `VitrineCardWithStepper`, Yokocho uses `StreetTicketCard`, Osteria uses `TuscanFramedCard`, Shokunin uses `CedarSlatCard`).
3. **Sandboxed Declarative Execution**: Templates are pure declarative documents rendered by approved, sandboxed React/TypeScript renderers. No arbitrary code execution or unvalidated strings are allowed.

---

## 8. Authoritative Catalog & Modifier Data Integrity Contract

### 8.1 Elimination of Synthetic Fallbacks
In previous iterations, helper functions like `getCafeItemMeta()` stamped arbitrary tags ("Micro-Lot Pour · Whole Milk", "Smoked Embers") onto dishes that had nothing to do with coffee. In RestaurantOS 4.1:
- **Zero Hardcoded Synthetic Tags**: Storefronts render **strictly and exclusively** what is defined in the catalog item's `modifierGroups` and domain attributes.
- **Pure Domain Binding**: If an item has zero modifier groups, the card directly adds the item or opens a clean information view with zero invented option selectors.

### 8.2 Authoritative Domain Model

```typescript
export interface CatalogItemModifierOption {
  id: string;
  name: string;
  priceDeltaMinor: number;         // e.g. +3000 = +₹30.00
  formattedPriceDelta?: string;    // e.g. "+₹30.00"
  isDefault?: boolean;
  allergens?: string[];
}

export interface CatalogItemModifierGroup {
  id: string;
  name: string;                    // e.g. "Sauce Finish", "Sweetness & Base", "Garlic Intensity"
  description?: string;
  minSelections: number;           // 1 = Required; 0 = Optional
  maxSelections: number;           // 1 = Radio single-select; >1 = Checkbox multi-select
  options: CatalogItemModifierOption[];
}

export interface AuthoritativeCatalogItem {
  id: string;
  name: string;
  description: string;
  story?: string;
  basePriceMinor: number;          // e.g. 35000 = ₹350.00
  formattedPrice: string;
  category: string;
  station: 'TANDOOR' | 'CURRY_LINE' | 'BAR' | 'DESSERT' | 'EXPO';
  prepDurationMinutes: number;
  allergens: string[];
  dietaryFlags: string[];
  isAvailable: boolean;            // Sold out handling
  imageUrl?: string;
  modifierGroups: CatalogItemModifierGroup[];
}
```

### 8.3 Strict Integrity Verification Matrix
1. **Items with Zero Modifiers**: Adding an item (e.g., plain water or simple sides) increments the cart immediately without prompting an empty modal.
2. **Items with Required Modifiers (`minSelections > 0`)**: The Add button is locked with clear feedback until the customer makes a selection.
3. **Priced Modifiers**: All modifier price deltas are summed client-side and verified against server-authoritative SHA-256 pricing quotes (`POST /api/restaurant/quote`).
4. **Sold-Out Items (`isAvailable: false`)**: Rendered with an elegant desaturated "Sold Out for Service" badge; all add actions are disabled.
5. **Missing Images**: Fallback uses an authentic SVG monogram matching the installed template's aesthetic—never broken image icons or placeholder graphics.

---

## 9. Purpose-Built Kitchen Instrument (KDS) & Expo Dispatch Redesign

The KDS is an industrial kitchen tool, not a consumer marketing site. It operates in hot, fast-paced kitchen conditions with steam, grease, and high pressure.

### 9.1 Station Ergonomics & Workflows

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       KITCHEN DISPLAY STATION ROUTING                                           │
└───────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────┘
                                                │
                                      [ Table T-14 Order Placed ]
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        ▼                                               ▼
             ┌─────────────────────┐                         ┌─────────────────────┐
             │   TANDOOR STATION   │                         │  CURRY LINE STATION │
             │   • Paneer Tikka    │                         │  • Dal Makhani      │
             │   • Garlic Naan     │                         │  • Butter Chicken   │
             └──────────┬──────────┘                         └──────────┬──────────┘
                        │                                               │
                        │   (Item-Level Cook Checkoff: ✓ Item Ready)    │
                        └───────────────────────┬───────────────────────┘
                                                ▼
                                     ┌─────────────────────┐
                                     │    EXPO COMMAND     │
                                     │  • Table T-14 View  │
                                     │  • Status: 3/4 Ready│
                                     │  • [ SEND TO TABLE ]│
                                     └─────────────────────┘
```

1. **TANDOOR & CURRY LINE (Hot Prep Stations)**:
   - **All-Day Production Header**: Live aggregate count of items cooking across all active tickets (`4x Paneer Tikka`, `6x Garlic Naan`, `3x Dal Makhani`).
   - **Item Checkmarks**: Cooks check off individual dishes as they come out of the tandoor or handi.
   - **Monospace Pacing Timers**: Green (<8 min) → Amber (8–12 min) → Crimson Overdue (>14 min).
2. **BAR & DRINKS**:
   - High-density queue sorted by order timestamp with quick 1-tap bump.
3. **EXPO COMMAND (Expediter)**:
   - Aggregates multi-station readiness per table (e.g., `Table T-14 · 3 of 4 Ready`). Prevents runner dispatch until all hot items are ready.
   - Single-tap `[ Send to Table ]` action clears the table ticket.
4. **RECALL WORKFLOW**:
   - Dedicated "Recently Bumped" buffer allows accidental bumps to be undone within 60 seconds with 1 tap or keyboard key `R`.

### 9.2 Hardware & Bump-Bar Hotkeys
- Bump Bar Key `1–8`: Select ticket in column.
- `Space`: Bump / mark next item ready.
- `Enter`: Advance ticket state (`QUEUED` → `IN_PROGRESS` → `READY`).
- `R`: Recall last bumped ticket.
- `A`: Toggle All-Day production summary.
- `E`: Switch to Expo view.
- Touch Targets: Strictly **≥ 54px** for wet or gloved hands.

---

## 10. Full-Product Evaluation of 10 Application Workspaces

RestaurantOS is an enterprise restaurant operating system. Every workspace is evaluated and given a targeted design directive:

| Workspace | Port & Route | Current Architectural State | Design Directive | Planned Changes |
| :--- | :--- | :--- | :--- | :--- |
| **1. Platform Control Center** | `3005 /admin` | High-density cluster management, tenant quota meters, cryptographic Ed25519 license verification. | **RETAIN_AS_INFRASTRUCTURE** | Maintain solid multi-tenant infrastructure, add 4.1 template catalog telemetry. |
| **2. Operations Cockpit** | `4010 /` | Shift Command KPI ribbon, 2-column live service split (Invoicing on left, Station Loads & Server Calls on right). | **REFACTOR_FOUNDATION** | Polish typography, enhance live table turnover metrics, preserve SSE stream. |
| **3. Template Marketplace** | `4010 /marketplace` | Full-width gallery with live device previews (390, 768, 1200px) and real menu data. | **RECONSTRUCT** | Replace legacy 6 template previews with the 6 brand-new 4.1 designs; implement 1-click install and rollback. |
| **4. Visual Brand Studio** | `4010 /studio` | 3-pane authoring IDE with section tree, live canvas, property inspector, and draft persistence. | **RECONSTRUCT** | Synchronize center canvas with the new 4.1 Storefront Document AST engine; enable section reordering and revision rollback. |
| **5. Spatial Floor Studio** | `4010 /operations/floor` | Interactive CAD canvas, 24px snap-to-grid, 90° table rotation, and seat capacity popover. | **RETAIN_AS_INFRASTRUCTURE** | Working spatial CAD engine; polish chair silhouette graphics. |
| **6. Kitchen Instrument (KDS)** | `4010 /kds` | High-contrast touch terminal with station tabs, item checkmarks, and bump bar shortcuts. | **RECONSTRUCT** | Implement the new station-specific All-Day headers, multi-station Expo aggregation, and pacing timers. |
| **7. Customer Support Desk** | `4010 /support` | 3-pane incident triage workbench with SLA countdowns and threaded messaging. | **RETAIN_AS_INFRASTRUCTURE** | Maintain working 3-pane workbench; optimize mobile viewport rendering. |
| **8. Staff Directory & RBAC** | `4010 /staff` | Employee roster table with salted SHA-256 PIN authentication and active token revocation. | **RETAIN_AS_INFRASTRUCTURE** | Maintain secure cryptographic RBAC; enhance role permission matrix display. |
| **9. Menu Catalog Workspace** | `4010 /menu` | Data table with recipe pricing, station routing badges, and modifier group modal. | **REFACTOR_FOUNDATION** | Upgrade modifier group editor to support multi-select constraints and price deltas. |
| **10. White-Label & Domains** | `4010 /white-label` | Custom domain provisioning with live CNAME DNS verification state machine and SSL tracking. | **RETAIN_AS_INFRASTRUCTURE** | Maintain working DNS state machine; ensure custom CSS injection does not break 4.1 AST. |

---

## 11. Delete-and-Rebuild Migration, Backup & Rollback Strategy

### 11.1 Deletion Scope
The deletion applies exclusively to **obsolete storefront presentation and layout code**:
- Delete legacy 6 template renderers in `packages/ui/pages/diner.ts`.
- Delete `.diner-layout-container` 3-column wrapper styles.
- Delete `getCafeItemMeta` synthetic fallback generator.
- Delete legacy mini-preview renderers in `packages/ui/pages/marketplace.ts`.
- Retire legacy `DEFAULT_TEMPLATES` in `packages/domain/index.ts`.

### 11.2 Business Data Protection Guarantee
**Under no circumstances will customer records, orders, payments, tables, staff credentials, or tenant configurations be deleted.**
- All persistent data in `projects/external-os/restaurant-os/data/restaurant-runtime-store.json` is preserved.
- Before applying the template schema migration, an atomic backup is created:
  `data/restaurant-runtime-store.json.bak_v4_1`.

### 11.3 Legacy Template Mapping Table
For existing tenant installations referencing old template IDs:

| Legacy Template ID | New 4.1 Template ID | Replacement Display Name | Automatic Token Migration |
| :--- | :--- | :--- | :--- |
| `tmpl_haute_gastronomy` | `tmpl_atelier_etoile_4_1` | Atelier Étoile Noir | Maps to `#080A0D` canvas, Cormorant Garamond |
| `tmpl_nordic_minimal` | `tmpl_fjord_form_4_1` | Fjord & Form Botanical | Maps to `#F7F5F0` linen canvas, Inter Grotesque |
| `tmpl_artisan_coffee` | `tmpl_roastery_1984_4_1` | Roastery 1984 Vitrine | Maps to `#FDFBF7` parchment canvas, Space Grotesk |
| `tmpl_neon_street` | `tmpl_neon_yokocho_4_1` | Neon Yokocho Street | Maps to `#07090E` slate canvas, Syne ExtraBold |
| `tmpl_trattoria_bella` | `tmpl_osteria_rustica_4_1` | Osteria Rustica Convivial | Maps to `#FBF8F2` cream canvas, Italian Plate Serif |
| `tmpl_tokyo_izakaya` | `tmpl_shokunin_ramen_4_1` | Shokunin Ramen & Robata | Maps to `#1E1915` cedar canvas, Noto Serif JP |

---

## 12. Phased Implementation Roadmap (Phases 0 through 10)

```
Phase 0: Research & Audit (COMPLETED IN THIS PROPOSAL)
   │
Phase 1: Design Approval Gate (LOCKED — STANDING BY FOR OWNER APPROVAL)
   │
Phase 2: Retire Obsolete Template Implementations & Foundation Setup
   │
Phase 3: Build Six Brand-New Composable Customer Storefronts
   │
Phase 4: Authoritative Catalog & Modifier Engine Integration
   │
Phase 5: Rebuild Template Marketplace with Live Previews
   │
Phase 6: Rebuild Visual Brand Studio with Document AST Synchronization
   │
Phase 7: Reconstruct Purpose-Built Kitchen Instrument (KDS) & Expo Dispatch
   │
Phase 8: Workspace UX Polish across Cockpit, Support, Staff, Menu & Floor
   │
Phase 9: Motion Tuning, Tactile Steppers, WCAG AA Accessibility Polish
   │
Phase 10: Master Visual, Operational & Security Verification
```

### Phase Details

| Phase | Deliverables | Modules Affected | Estimated Effort | Principal Risk & Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 0** *(Current)* | Forensic audit, research matrix, wireframes, AST schema, rebuild plan. | `docs/restaurantos/*` | Completed | Plan divergence. Mitigated by strict approval gate. |
| **Phase 1** *(Gate)* | Owner review, architectural alignment, explicit approval. | Documentation | Awaiting Owner | Premature code changes. Code strictly locked. |
| **Phase 2** | Delete legacy 6 template renderers, `.diner-layout-container`, and seed new 4.1 AST schemas. | `packages/domain/index.ts`<br>`packages/storage/store.ts` | 2 Days | Breaking stored tenant references. Mitigated by automatic ID mapping table and store backup. |
| **Phase 3** | Implement 6 new independent storefront compositions (Atelier, Fjord, Roastery, Yokocho, Osteria, Shokunin). | `packages/ui/pages/diner.ts`<br>`packages/ui/templates/*` | 4–5 Days | Template cloning. Mitigated by Grayscale Wireframe divergence test (≥ 70%). |
| **Phase 4** | Pure catalog-driven modifier rendering, server SHA-256 pricing validation, sold-out states. | `packages/ui/pages/diner.ts`<br>`packages/domain/catalog.ts` | 2–3 Days | Price calculation drift. Mitigated by server integer minor price hash verification. |
| **Phase 5** | Full-width Template Marketplace overhaul with live device switchers (390, 768, 1200px). | `packages/ui/pages/marketplace.ts` | 2 Days | Preview divergence. Mitigated by executing the actual 4.1 AST renderer in previews. |
| **Phase 6** | Visual Brand Studio overhaul: AST component tree inspector, canvas sync, revision rollback. | `packages/ui/pages/studio.ts`<br>`packages/storage/store.ts` | 3 Days | Draft data loss. Mitigated by atomic file storage with revision hashes (`rev_v*`). |
| **Phase 7** | KDS & Expo reconstruction: All-Day aggregation, two-level fulfillment, bump-bar shortcuts. | `packages/ui/pages/kds.ts` | 2–3 Days | Kitchen speed degradation. Mitigated by high-contrast zero-animation UI and hotkeys. |
| **Phase 8** | Operational polish across Operations Cockpit, Menu Catalog, Floor Studio, and Support Desk. | `packages/ui/pages/*`<br>`packages/ui/shell.ts` | 2–3 Days | Regression in admin tools. Mitigated by maintaining existing API and RBAC contracts. |
| **Phase 9** | Spring physics on tactile steppers, sheet slide-up transitions, WCAG AA contrast, reduced motion. | `packages/ui/styles.ts`<br>`packages/ui/tokens.ts` | 1–2 Days | Layout shifts. Mitigated by transform-only CSS transitions and media query checks. |
| **Phase 10** | End-to-end browser audit across 7 viewports, zero emoji validation, and regression suites. | `scripts/audit-visual-truth.js`<br>`scripts/test-*.js` | 2 Days | Visual defects. Mitigated by multi-viewport Playwright screenshot captures and pairwise diffing. |

---

## 13. Objective Acceptance & Verification Strategy

The implementation will be subjected to strict, objective acceptance criteria:

1. **Grayscale Structural Uniqueness**: Every new template will be captured in pure 100% grayscale via Playwright. Pairwise AST Jaccard dissimilarity must exceed **70%**, proving differentiation without relying on colors.
2. **Omnichannel Viewport Accuracy**: High-resolution browser screenshots captured across:
   - **Mobile**: `390 × 844` (iPhone 14/15/16) and `430 × 932` (iPhone Pro Max).
   - **Tablet**: `768 × 1024` (iPad portrait) and `1024 × 768` (iPad landscape).
   - **Desktop**: `1280 × 800`, `1440 × 900`, and `1920 × 1080`.
3. **Data Integrity & Modifiers**:
   - Zero synthetic tags on any dish.
   - Items with zero modifiers add directly without empty modals.
   - Items with required modifiers lock the cart until selected.
   - Sold-out items cannot be ordered.
   - All totals match server SHA-256 pricing quotes (`inputHash`, `resultHash`).
4. **Kitchen Operations & Expo**:
   - Station routing verifies accurate ticket distribution (Tandoor vs Curry Line vs Bar).
   - Line cooks check off individual dishes (`✓ Item Ready`).
   - Expo view displays multi-station readiness count in real time (`X/Y Ready`).
   - Bump-bar keyboard shortcuts (`Space`, `Enter`, `R`, `A`, `E`) function with zero latency.
5. **Visual Brand Studio Integrity**:
   - Section modifications persist to draft storage.
   - Publishing commits an immutable revision (`rev_v*`).
   - Reverting restores exact prior AST state without layout corruption.
6. **Zero Emojis Everywhere**: 100% SVG vector Lucide iconography enforced via automated regex audit (`[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]`).

---

## 14. Risks, Open Decisions & Owner Approval Gate Checklist

### 14.1 Key Design Decisions for Owner Confirmation
- [ ] **1. Complete Deletion of Old Templates**: Confirm removal of the old 6 template renderers and `.diner-layout-container` 3-column wrapper.
- [ ] **2. Adoption of 6 New Archetypes**: Approve the concepts for Atelier Étoile, Fjord & Form, Roastery 1984, Neon Yokocho, Osteria Rustica, and Shokunin Ramen.
- [ ] **3. Grayscale Wireframe Criteria**: Approve the 12-dimensional structural differentiation criteria.
- [ ] **4. Composable Document AST Engine**: Approve replacing hardcoded switch statements with the declarative AST schema.
- [ ] **5. Pure Catalog Modifiers**: Approve strict elimination of synthetic metadata fallbacks.
- [ ] **6. Purpose-Built KDS Workstation**: Approve two-level fulfillment and station-specific All-Day aggregation.
- [ ] **7. 10-Phase Roadmap & Effort**: Approve the phased execution plan and effort estimation.

---
*End of RestaurantOS 4.1 Rebuild Plan. Phase 0 Complete. Standing by for Owner review and explicit approval before any code modifications.*
