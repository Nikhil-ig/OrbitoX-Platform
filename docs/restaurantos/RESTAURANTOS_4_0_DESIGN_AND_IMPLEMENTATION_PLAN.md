# 🪐 OrbitoX RestaurantOS 4.0 — Product Design Reset & Architectural Blueprint
**Phase**: Research → Diagnosis → Design Concepts → Architecture → Phased Implementation Plan  
**Approval Gate**: 🔒 **LOCKED — Awaiting Explicit Owner Approval**  
**Document URI**: `docs/restaurantos/RESTAURANTOS_4_0_DESIGN_AND_IMPLEMENTATION_PLAN.md`  
**Authors**: Principal Product Designer, Senior Digital Art Director, Restaurant Commerce UX Specialist, Enterprise SaaS UX Architect, Mobile-First Ordering Experience Designer, Kitchen Display System Product Designer, Visual Website Builder Architect, Design Systems Engineer, Senior Frontend Architect, Restaurant Domain and API Architect, Motion Design Specialist, Accessibility and Quality Engineering Specialist.  
**Target Platform Kernel**: `@orbitox-io/plugin-engine` (v1.4.0) | `@orbitox-io/crm` (v1.0.1)  

---

## 📑 Master Table of Contents
1. [Executive Summary & Lock of the Approval Gate](#1-executive-summary--lock-of-the-approval-gate)
2. [Forensic Inspection & Root-Cause Diagnosis](#2-forensic-inspection--root-cause-diagnosis)
3. [Empirical Research Matrix: Global Restaurants & POS/KDS Leaders](#3-empirical-research-matrix-global-restaurants--poskds-leaders)
4. [Dual-Pillar Design Philosophy: Enterprise SaaS vs. Bespoke Hospitality](#4-dual-pillar-design-philosophy-enterprise-saas-vs-bespoke-hospitality)
5. [The Six Canonical Customer Storefront Archetypes](#5-the-six-canonical-customer-storefront-archetypes)
6. [The Grayscale Wireframe Test & 12-Dimensional Differentiation Matrix](#6-the-grayscale-wireframe-test--12-dimensional-differentiation-matrix)
7. [Diner Omnichannel Architecture: Desktop, Tablet & Mobile PWA](#7-diner-omnichannel-architecture-desktop-tablet--mobile-pwa)
8. [Storefront Domain Data Contract & Authoritative Modifier Engine](#8-storefront-domain-data-contract--authoritative-modifier-engine)
9. [Purpose-Built Kitchen Instrument (KDS) & Expo Dispatch Redesign](#9-purpose-built-kitchen-instrument-kds--expo-dispatch-redesign)
10. [Comprehensive Redesign of 9 Administrative Workspaces](#10-comprehensive-redesign-of-9-administrative-workspaces)
11. [Motion Design, Interaction System & Tactile Physics](#11-motion-design-interaction-system--tactile-physics)
12. [Storefront Document AST & Visual Studio Architecture](#12-storefront-document-ast--visual-studio-architecture)
13. [Phased Implementation Roadmap (Phases 0–10)](#13-phased-implementation-roadmap-phases-010)
14. [Exhaustive Acceptance & Verification Strategy](#14-exhaustive-acceptance--verification-strategy)
15. [Owner Decision & Approval Gate Checklist](#15-owner-decision--approval-gate-checklist)

---

## 1. Executive Summary & Lock of the Approval Gate

### 1.1 The Mandate
RestaurantOS 3.x succeeded in establishing an enterprise-grade backend foundation—cryptographic session signing, HMAC staff authentication, sub-second Server-Sent Events (SSE), and server-authoritative integer minor pricing. However, **its presentation layer failed to deliver authentic hospitality experiences**. 

Direct visual inspection of the running platform confirms the Owner's diagnosis:
- **The six customer storefronts feel like superficial skin swaps of an identical dark software dashboard** (`#090B0E`), locked into a rigid 3-column container with identical `#11141B` cards, repetitive thumbnails, and the same copper/orange action buttons.
- **Modifiers were improperly abstracted**, resulting in coffee roastery parameters appearing on North Indian starters, or hardcoded mock tags masquerading as authentic dish configurations.
- **The administrative suite (Control Center, Cockpit, Support, Staff, Menu, Floor, Studio, KDS, Marketplace) suffers from visual monotony**, reusing the same sidebar-plus-six-cards pattern without honoring the unique cognitive and operational workflows of each role.

### 1.2 The Approval Lock Rule
In strict adherence to the Owner's directive:
> **ABSOLUTE RULE: DO NOT IMPLEMENT APPLICATION CODE UNTIL THE OWNER APPROVES THE PLAN.**
> This phase is strictly research, inspection, design exploration, architecture planning, and implementation planning. No application source code (`.ts`, `.js`, `.css`, `.html`, `.json`) has been or will be mutated during this phase.

This document stands as the definitive proposal and execution blueprint for **RestaurantOS 4.0**.

---

## 2. Forensic Inspection & Root-Cause Diagnosis

A read-only forensic inspection was conducted across `projects/external-os/restaurant-os` and the OrbitoX Control Plane (`localhost:3005`).

### 2.1 The Root-Cause Matrix

| Finding | Evidence in Code | Actual Root Cause | Impact on Experience | Proposed Direction in 4.0 |
| :--- | :--- | :--- | :--- | :--- |
| **All 6 templates share identical page geometry** | `packages/ui/pages/diner.ts:148-214`<br>`.diner-layout-container { display: grid; grid-template-columns: 240px minmax(0, 1fr) 370px; }` | The master outer shell wraps every template in the same 3-column grid, injecting identical left navigation cards and right bill sidebars. | A Michelin fine-dining site looks structurally indistinguishable from a cyber street food stall or espresso bar. | Deconstruct the outer wrapper. Let each template define its own full-viewport layout shell, hero, navigation, and cart geometry. |
| **Monochrome dark canvas saturation** | `packages/ui/styles.ts:12-49`<br>`body { background: var(--color-ink); }`<br>`packages/ui/tokens.ts:12-27` | Global CSS defines `--color-ink: #0D0F10`, `--color-charcoal: #151719`, `--color-copper: #C86B3C` as universal platform tokens. | Every template inherits dark obsidian tones and orange accents regardless of culinary identity. | Decouple Platform Tokens from Storefront Design Systems. Provide authentic light, warm neutral, cedar, and high-contrast dark foundations. |
| **Coffee modifiers appearing on unrelated food** | `packages/ui/pages/diner.ts:1407-1421`<br>`function getCafeItemMeta(item): { spec, tag }` | Fake metadata generator hardcoded fallbacks that stamped "Micro-Lot Pour · Whole Milk" on any beverage and "Smoked Embers" on food. | Mango Lassi displayed "Double Shot Reserve"; Paneer Tikka showed coffee roastery tags. Destroyed domain credibility. | Pure catalog-driven modifier rendering: render *only* what is configured in `item.modifierGroups`. Zero synthetic metadata injection. |
| **Brand Studio canvas diverges from real diner** | `packages/ui/pages/studio.ts:240-350`<br>Canvas renders static mock sections instead of actual `renderDinerPwa` runtime | The editor uses a separate, handcrafted HTML preview renderer that does not execute the actual template's composition engine. | What the restaurant manager edits in Studio does not reflect what guests see at Table T-14. | Unified Storefront Document AST: Studio canvas renders the exact same AST-driven component tree as the live diner. |
| **Administrative UI monotony ("Sidebar + Topbar + 6 Cards")** | `packages/ui/shell.ts:101-140`<br>`packages/ui/pages/overview.ts:68-120` | All 10 workspaces inherit `renderShell` with identical 220px nav rail, identical card containers, and identical KPI row layouts. | Support Desk, KDS, Floor Plan, and Control Center look like identical dashboards instead of specialized tools. | Role-specific application shells: KDS is a high-contrast touch terminal; Floor is a full-viewport spatial canvas; Support is a 3-pane incident triage workbench. |
| **KDS lacks station-specific operational ergonomics** | `packages/ui/pages/kds.ts:44-86`<br>Identical ticket component rendered across `TANDOOR`, `CURRY_LINE`, `BAR`, `EXPO` | KDS uses a single generic ticket card template regardless of whether the station is preparing drinks, naan, or expediting multi-course tickets. | Expo runners cannot see consolidated multi-station progress; line cooks see cluttered tickets without pacing timers. | Station-specialized views: All-Day aggregation boards for line cooks; consolidated multi-station course tickets for Expo; drink queue for Bar. |

---

## 3. Empirical Research Matrix: Global Restaurants & POS/KDS Leaders

We researched six distinct restaurant categories and two industry-standard kitchen operational systems to ground our design proposals in verified best practices.

### 3.1 Restaurant Design Reference Matrix

| Reference & Source | Identity & Focus | First Screen & Placement | Menu Presentation & Categories | Product Card & Detail Interaction | Lessons Worth Adopting for RestaurantOS | Inappropriate Patterns to Avoid |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SingleThread Farm**<br>*(Michelin 3-Star, Healdsburg)*<br>`singlethreadfarms.com` | **Haute Gastronomy**<br>Image-led & Editorial storytelling. Atmospheric photography of farm plots and bespoke ceramic ware. | Restrained top-center typography. Hero is full-viewport photography with subtle scroll prompt. Zero aggressive CTA buttons. | Menu introduced as a sequenced 10-course narrative. Categories are "Acts" or "Movements". No prices on the tasting sequence. | Dishes presented with poetic ingredient provenance, artisan ceramicist notes, and optional wine pairing details. Minimalist modal. | - Multi-act tasting progression.<br>- Sommelier pairing integration.<br>- Asymmetric editorial whitespace.<br>- Cormorant/Playfair typography. | - Hiding ordering/pricing altogether.<br>- Non-functional artistic ambiguity.<br>- Unresponsive multi-megabyte imagery. |
| **Hart Bageri & Noma**<br>*(Copenhagen, Denmark)*<br>`hartbageri.com` / `noma.dk` | **Modern Nordic Minimal**<br>Design-led & typography-driven. Warm off-white/linen, stark black grotesque typography, extreme precision. | Bold architectural wordmark top-left. Ample negative space. Daily harvest date and coordinates prominently displayed. | Two-column tabular spec-sheet. Categories navigated via minimalist sticky text anchor rail (e.g. *01 / Morning Breads*, *02 / Foraged Grains*). | Razor-sharp horizontal row: Name, estate mill, allergen pill, price in mono font. Clicking expands an inline spec sheet. | - Tabular spec-sheet layout.<br>- Honest harvest/origin tagging.<br>- Warm linen base (`#F8F6F0`) instead of black.<br>- Ultra-fast scanability. | - Overly sterile medical/scientific UI.<br>- Omitting dish images completely.<br>- Lack of direct ordering feedback. |
| **Onyx Coffee Lab**<br>*(Specialty Roaster, Arkansas)*<br>`onyxcoffeelab.com` | **Artisan Café & Roastery**<br>Tactile & Technical precision. Deep sensory notes, extraction parameters, roast profiles. | Top brand emblem with roastery vitrine carousel. Main focus is on single-origin harvest lots and sensory wheel notes. | Category pill scroller (*Pour Over*, *Espresso Bar*, *Pastry Counter*). Menu cards display processing method (Washed, Natural, Anaerobic). | Tactile product module with roast level dial, tasting notes pills (*Jasmine*, *Bergamot*), and direct inline quantity stepper `[- 1 +]`. | - Inline quantity steppers on cards.<br>- Sensory flavor note tags.<br>- Milk, temperature, and size selectors.<br>- Tactile warm terracotta/parchment palette. | - Showing coffee modifiers on food.<br>- Overly complex brewing graphs on mobile.<br>- Cluttering screen with merchandise ads. |
| **Momofuku Noodle Bar**<br>*(Urban Street Food, NYC)*<br>`momofukunoodlebar.com` | **Neon Alley / Street Food**<br>Energetic, high-contrast, casual night-market dining. Bold typography, dense grid, high visual rhythm. | Eye-catching neon brand logo, loud headline, active service hours, energetic badge (*Street Heat / Fast Casual*). | Dense 2-column card matrix. Sticky category chips (*Buns*, *Noodles*, *Rice Cakes*, *Late Night*). | Compact horizontal card with prominent thumbnail, bold price, and immediate single-tap "+ Add" or "+ Bump" trigger. Quick customization drawer. | - Dense, rapid-tap mobile cards.<br>- High-contrast visual hierarchy.<br>- Vibrant accents without glowing borders.<br>- Street combo builders. | - Dark dashboard aesthetic.<br>- Gaming/cyberpunk neon glows that look cheap.<br>- Low-contrast dark purple backgrounds. |
| **Carbone & Via Carota**<br>*(Trattoria Rustica, NYC)*<br>`carbonenewyork.com` | **Trattoria Bella Rustica**<br>Warm Italian hospitality, convivial dining, wood-fired hearth warmth, heritage family feast. | Centered classic Italian serif wordmark, warm olive/terracotta tones, imagery of hand-rolled pasta and wood ovens. | Traditional Italian course structure: *Antipasti*, *Primi Piatti*, *Secondi*, *Contorni*, *Dolci*. Section dividers feel like printed trattoria paper. | Editorial card with hand-drawn subtle border, generous food photo, DOP ingredient certifications, wine pairing recommendation. | - Classic Italian course progression.<br>- Warm terracotta and parchment palette.<br>- Convivial "Family Feast" combo grouping.<br>- Rich food photography. | - Cluttered red-and-white checkered cliches.<br>- Overly ornate decorative borders.<br>- Slow, multi-step ordering flows. |
| **Afuri Ramen & Izakaya**<br>*(Tokyo & Portland)*<br>`afuriramen.com` | **Tokyo Izakaya & Craft Ramen**<br>Disciplined Japanese craft (*Shokunin*), natural cedar wood, deliberate typography, structured checklist. | Clean vertical kanji and modern romaji wordmark. Minimalist hero featuring steam rising from yuzu shio broth. | Categorized into *Otsumami* (Small Plates), *Shokunin Ramen*, *Yakitori Skewers*, and *Craft Sake*. Clean tab strip. | Structured card with broth density, noodle firmness checklist, chashu options, and sake pairing. Clean modal with Japanese aesthetic restraint. | - Vertical typographic rhythm & Kanji accents.<br>- Step-by-step ramen customizer (Broth, Noodle, Spice).<br>- Cedar/washi paper design tokens.<br>- Sake pairing notes. | - Inaccurate or decorative fake Japanese text.<br>- Anime/cartoon styling.<br>- Cluttered coupon/loyalty banners. |

### 3.2 Operations & Kitchen Display System (KDS) Reference Matrix

| Reference & Source | Order Grouping & Station Routing | Ticket Density & Readability | Modifiers & Allergen Handling | Item-Level vs Ticket Fulfillment | Expo / Runner Coordination | Keyboard / Bump Bar & Error Prevention |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Toast Kitchen Display System**<br>`pos.toasttab.com` | - Routing by prep station (`Grill`, `Fry`, `Bar`, `Expo`).<br>- Multi-station split (1 ticket split across Tandoor and Curry). | - High-density 4, 6, or 8 ticket layout.<br>- Monospace timers with color progression (Green → Amber → Flashing Red). | - Modifiers indented in bold capital text.<br>- Red badge for critical allergens (`ALLERGY: DAIRY`).<br>- Server special notes in high-visibility box. | - Two-level fulfillment: Line cooks tap individual checkmarks per dish.<br>- Whole ticket clears only when all items are checked. | - Dedicated Expo monitor aggregates prep station readiness.<br>- Visual badge: `3/4 Ready` before final dispatch to table runner. | - Official KRS bump bar support (numeric 1-8, Space to Bump, Enter to Hold, R to Recall).<br>- Undo buffer prevents accidental bumps. |
| **Square Restaurant KDS**<br>`squareup.com/pos/restaurants` | - Real-time websocket sync.<br>- Station filtering by menu category and item tag.<br>- Dining option indicators (Dine-In, Takeout). | - Clean, high-contrast dark mode designed for steamy kitchen lighting.<br>- Large 24px+ table numbers and elapsed time. | - Conversational modifier formatting.<br>- Positive price deltas shown if server configured.<br>- Subtractive modifiers highlighted (`NO ONIONS`). | - Item strike-through upon tap.<br>- Completed ticket shifts to "Recently Completed" tray.<br>- 1-tap Recall restores state instantly. | - "All-Day" production view sums total items cooking across all tables (e.g. `8x Paneer Tikka`, `12x Naan`). | - Large 54px touch targets for greasy/gloved hands.<br>- Audible chime on new ticket arrival and SLA overdue alert. |

---

## 4. Dual-Pillar Design Philosophy: Enterprise SaaS vs. Bespoke Hospitality

RestaurantOS 4.0 strictly segregates the visual and interaction foundation into two intentional tiers:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ORBITOX PLATFORM ARCHITECTURE                           │
├───────────────────────────────────────────┬─────────────────────────────────────────────┤
│   PILLAR 1: ADMINISTRATIVE & OPERATIONS   │   PILLAR 2: CUSTOMER-FACING STOREFRONTS     │
│   (Consistent, ergonomic, role-specialized)│   (Bespoke, brand-owned, distinct identity) │
├───────────────────────────────────────────┼─────────────────────────────────────────────┤
│ • Platform Control Center: Multi-tenant   │ • Template A (Haute): Editorial Noir        │
│ • Restaurant Workspace: GM Cockpit        │ • Template B (Nord): Scandinavian Linen     │
│ • Support Desk: 3-Pane Incident Queue     │ • Template C (Café): Tactile Roastery       │
│ • Staff & RBAC: Cryptographic Matrix      │ • Template D (Neon): Tokyo Night Market     │
│ • Spatial Floor Studio: Interactive CAD   │ • Template E (Trattoria): Rustic Hearth     │
│ • Kitchen Instrument: High-Contrast KDS   │ • Template F (Izakaya): Cedar Plank Craft   │
│ • Brand Studio: Visual IDE & Inspector    │                                             │
└───────────────────────────────────────────┴─────────────────────────────────────────────┘
```

### Pillar 1: Enterprise Administration & Operations
- **Design Tokens**: Standardized system tokens (`--admin-bg`, `--admin-surface`, `--admin-border`, `--admin-accent`).
- **Ergonomics**: Dense, highly scannable, keyboard-accessible (⌘K palette, bump bar hotkeys), zero gratuitous decorative animations.
- **Role Alignment**: Each workspace has a unique information architecture suited to its task—not a cookie-cutter sidebar-and-card template.

### Pillar 2: Six Customer-Facing Storefronts
- **Zero Inheritance of Administrative Chrome**: Storefronts never inherit admin sidebars, system buttons, or platform tokens.
- **Authentic Autonomy**: Each template controls its own full-page geometry, typography family, spacing rhythm, product cards, category navigation, and cart drawer.
- **Tenant Brand Customization**: Restaurants can apply their own brand logo, primary/secondary colors, and custom CSS without breaking the structural integrity of the installed template.

---

## 5. The Six Canonical Customer Storefront Archetypes

### 5.1 TEMPLATE A — HAUTE GASTRONOMY NOIR
- **Target Audience**: Michelin-starred venues, luxury tasting rooms, chef-driven tasting experiences.
- **Visual Direction**: Editorial sophistication, asymmetric layouts, restrained gold/champagne accents, deep charcoal/obsidian surfaces, Cormorant Garamond & Playfair Display typography.
- **Page Architecture**: Full-width split editorial hero with chef manifesto quote, followed by a multi-movement Tasting Menu progression (*Course I: Amuse* → *Course II: Hearth* → *Course III: Royal Mains* → *Course IV: Finale*).
- **Navigation**: Minimalist horizontal anchor rail with Roman numerals (*Act I*, *Act II*, *Act III*).
- **Product Card**: Sommelier-pairing card with 120px circular plate photography, wine pairing badge, ingredient notes, and refined "+ Add Course Dish" action.
- **Cart Presentation**: Slide-over Sommelier Cellar Drawer with course pacing timeline.

### 5.2 TEMPLATE B — MODERN NORDIC MINIMALIST
- **Target Audience**: Scandinavian bakeries, farm-to-table harvest bistros, quiet cafes.
- **Visual Direction**: Warm linen/sand canvas (`#F8F6F0`), stark black typography (`Inter` / `JetBrains Mono`), razor-sharp lines, extreme negative space.
- **Page Architecture**: Header with harvest coordinates and daylight indicator. Two-column tabular harvest spec-sheet. Left column for botanical starters; right column for grain and hearth dishes.
- **Navigation**: Sticky top monochrome rail (*01 / Harvest*, *02 / Ferments*, *03 / Hearth*).
- **Product Card**: Spec-sheet data row with estate lot provenance tags, allergen matrix, clean mono price, and instant "+ Select" action.
- **Cart Presentation**: Minimalist bottom status dock with clear receipt summary.

### 5.3 TEMPLATE C — CAFÉ ATELIER & ROASTERY
- **Target Audience**: Third-wave coffee roasters, artisan cafes, bakeries, brunch spots.
- **Visual Direction**: Tactile terracotta, warm parchment (`#FDFBF7`), rich espresso brown (`#241D17`), Space Grotesk typography.
- **Page Architecture**: Roastery vitrine carousel featuring single-origin lots and aroma profile tags (*Jasmine*, *Bergamot*, *Honey*). 3-column tactile beverage and bake grid.
- **Navigation**: Organic category pill strip (*Espresso Bar*, *Slow Pour*, *Laminated Pastry*, *Brunch*).
- **Product Card**: Tactile card with large product shot, roast level dial, sensory notes, and **direct inline quantity stepper `[- 1 +]`**.
- **Cart Presentation**: Floating tactile capsule with real-time cup count and subtotal.

### 5.4 TEMPLATE D — NEON ALLEY CYBER STREET
- **Target Audience**: Street food night markets, late-night ramen bars, casual Asian street food.
- **Visual Direction**: High-energy, high-contrast dark street palette (`#0B0E14`), vibrant electric cyan (`#00F2FE`) and hot pink (`#FE0979`) accents, Syne & Space Grotesk typography.
- **Page Architecture**: Dual-stall market lanes (*Stall 01: Bincho-tan Skewers* vs *Stall 02: Smashed Bao & Noodles*). Street heat BPM ticker.
- **Navigation**: Vertical neon stall selector on left; instant jump to street carts.
- **Product Card**: Bold horizontal stall card with fire level indicator (`3X FIRE`), bold price badge, and rapid-tap `+ BUMP` action button.
- **Cart Presentation**: Late-night order bag bottom drawer with street combo deals.

### 5.5 TEMPLATE E — TRATTORIA BELLA RUSTICA
- **Target Audience**: Italian trattorias, wood-fired pizzerias, rustic osterias, family dining.
- **Visual Direction**: Warm terracotta (`#A84B2E`), Tuscan cream (`#FBF8F2`), olive green accents, Italian Plate serif typography.
- **Page Architecture**: Wood-fired hearth storytelling masthead, followed by traditional Italian course sequence: *Antipasti della Casa*, *Primi Piatti*, *Secondi*, *Pizze*, *Dolci*.
- **Navigation**: Centered classic ribbon nav with hand-drawn Italian floral accents.
- **Product Card**: Warm framed card with DOP ingredient certification badges, wood-oven icon, and "Family Feast Combo" expansion.
- **Cart Presentation**: Classic check folio drawer styled like an authentic leather bill presenter.

### 5.6 TEMPLATE F — TOKYO IZAKAYA & CRAFT RAMEN
- **Target Audience**: Traditional and modern Japanese izakayas, craft ramen shops, yakitori bars.
- **Visual Direction**: Natural cedar wood tones (`#2B231D`), washi off-white (`#F7F4EB`), vermilion accents (`#D3381C`), Noto Serif JP typography.
- **Page Architecture**: Shokunin cedar board masthead with Japanese kanji banner (*職人魂 · 極上出汁*), followed by categorized izakaya sections (*Otsumami*, *Ramen*, *Yakitori*, *Sake*).
- **Navigation**: Clean vertical timber plank navigation rail.
- **Product Card**: Structured card with 18-hour broth timer badge, customizable broth density/noodle firmness checklist, and certified sake pairing.
- **Cart Presentation**: Japanese bento-style order box with table service bell.

---

## 6. The Grayscale Wireframe Test & 12-Dimensional Differentiation Matrix

To prove that the six templates are structurally distinct without relying on color variables, each design was tested against a strict **Grayscale Wireframe Test**.

### 6.1 The 12-Dimensional Differentiation Matrix

| Dimension | Haute Gastronomy | Modern Nordic | Café Atelier | Neon Alley | Trattoria Bella | Tokyo Izakaya |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Header Arrangement** | Minimal centered serif wordmark with reservation link | Left-aligned geometric sans with live daylight/coords | Top centered emblem with roastery vitrine badge | High-contrast angled street logo with live BPM meter | Traditional centered Italian serif with olive leaf rule | Vertical Kanji + Latin dual-language header |
| **2. Hero Introduction** | Full-viewport split editorial with chef manifesto quote | Tabular harvest spec sheet with season date & origin | Tactile roast profile showcase with aroma spectrum pills | Loud night market banner with dual-stall marquee | Wood-fired hearth story with copper pot illustration | Shokunin cedar board with simmered broth timer |
| **3. Content Geometry** | Multi-movement sequenced course timeline | Two-column tabular harvest spec sheet | 3-column tactile card vitrine grid | Asymmetric dual-stall street market matrix | Classic single-column editorial course progression | Vertical timber plank rhythm with modular boxes |
| **4. Category Navigation** | Horizontal Roman numeral anchors (*Act I–IV*) | Sticky monochrome numbered rail (*01–03*) | Organic rounded category pill carousel | Left-rail vertical glowing street cart tabs | Centered decorative ribbon with Italian course names | Top horizontal washi tab strip with Kanji labels |
| **5. Product Card Pattern** | Sommelier card with round plate photo & wine pairing | Tabular row with estate lot tag & allergen matrix | Tactile vitrine card with **inline `[- 1 +]` stepper** | Dense stall row with bold price & `+ BUMP` trigger | Framed rustic card with DOP badge & combo builder | Structured card with broth/noodle firmness checklist |
| **6. Detail Interaction** | Elegant full-bleed sommelier notes modal | Clean inline expanding spec-sheet accordion | Tactile beverage customizer (Milk/Roast/Temp) | Fast slide-up street modifier drawer | Family feast portion & crust selector modal | Step-by-step ramen customizer (Broth/Noodle/Meat) |
| **7. Cart Presentation** | Slide-over Sommelier Cellar Drawer | Minimalist bottom status dock | Floating tactile capsule pill with item badge | Bottom late-night street order bag | Leather-styled trattoria bill folio | Bento-style wooden check box |
| **8. Typography** | Cormorant Garamond + Playfair Display (Serif) | Inter + JetBrains Mono (Grotesque / Monospace) | Space Grotesk + Outfit (Modern Geometric) | Syne + Space Grotesk (Expressive High-Contrast) | Italian Plate + Alegreya (Warm Classic Serif) | Noto Serif JP + DM Sans (Humanist Japanese) |
| **9. Photography** | High-contrast dramatic plate close-ups | High-key bright natural light, top-down foraging | Rich warm beverage vitrine & baked goods | Energetic street stalls, sizzling woks, smoke | Generous table spreads, bubbling cheese, pasta | Steaming ramen bowls, skewered yakitori embers |
| **10. Motion Language** | Slow, elegant fades and editorial mask reveals | Instant tabular state changes, zero spring bounce | Tactile physical click-down on stepper buttons | Snappy energetic transitions, street blink accents | Gentle warm accordion unfolding | Crisp, disciplined sliding drawer transitions |
| **11. Desktop Layout** | Full-width editorial narrative (1440px wide) | 2-column wide harvest ledger (1320px wide) | 3-column vitrine grid (1280px wide) | Split dual-stall multi-column matrix (1400px wide) | Centered editorial reading width (1040px wide) | Asymmetric Japanese ledger layout (1360px wide) |
| **12. Mobile Layout** | Single-column luxury editorial with sticky Act bar | Compact tabular harvest list with micro tags | Stacked tactile cards with direct touch steppers | Fast-scrolling dual stall feeds with thumb dock | Convivial course cards with combo options | Structured ramen builder with bottom sheet |

### 6.2 Grayscale Architectural Wireframe Comparisons

```
HAUTE GASTRONOMY (Editorial Split)       MODERN NORDIC (Tabular Spec Sheet)
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│     [   SERIF RESTAURANT   ]    │     │ [NORDIC]  55°N 12°E · AUTUMN    │
├────────────────┬────────────────┤     ├─────────────────────────────────┤
│ [CHEF STORY]   │ [FULL BLEED    │     │ [01 / HARVEST]   [02 / FERMENT] │
│ "24h simmer... │  PLATE PHOTO]  │     ├────────────────┬────────────────┤
├────────────────┴────────────────┤     │ ROW 1: Fish    │ ROW 3: Bread   │
│ ACT 01 · AMUSE & COLD PLATES    │     │ Provenance     │ Heritage Grain │
│ ┌───────────┐ ┌───────────────┐ │     │ Kr 480 [+SEL]  │ Kr 120 [+SEL]  │
│ │(○) PLATE  │ │ Wine Pairing  │ │     ├────────────────┼────────────────┤
│ │  PHOTO    │ │ Dish Name     │ │     │ ROW 2: Roots   │ ROW 4: Butter  │
│ │           │ │ ₹350 [+COURSE]│ │     │ Organic Lot    │ Churned Fresh  │
│ └───────────┘ └───────────────┘ │     │ Kr 240 [+SEL]  │ Kr 80  [+SEL]  │
└─────────────────────────────────┘     └─────────────────────────────────┘

CAFÉ ATELIER (Tactile Steppers)          NEON ALLEY (Dual-Stall Matrix)
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│ [ROASTERY EMBLEM]  [AROMA TAGS] │     │ [STREET LOGO]  [LIVE HEAT BPM]  │
├─────────────────────────────────┤     ├────────────────┬────────────────┤
│ (Espresso) (Slow Pour) (Pastry) │     │ STALL 01: WOK  │ STALL 02: BAO  │
├───────┬───────┬─────────────────┤     ├────────────────┼────────────────┤
│CARD 1 │CARD 2 │CARD 3           │     │ [SHOT] Dish    │ [SHOT] Dish    │
│[PHOTO]│[PHOTO]│[PHOTO]          │     │ Name & Heat    │ Name & Filling │
│Notes  │Notes  │Notes            │     │ ₹350  [+BUMP]  │ ₹280  [+BUMP]  │
│[- 1 +]│[- 1 +]│[- 1 +]          │     │                │                │
└───────┴───────┴─────────────────┘     └────────────────┴────────────────┘
```

---

## 7. Diner Omnichannel Architecture: Desktop, Tablet & Mobile PWA

### 7.1 Desktop (1440 × 900)
- **Elimination of the Rigid 3-Column Trap**: In 3.x, every template was forced into `grid-template-columns: 240px minmax(0, 1fr) 370px`. In 4.0, each template controls its desktop container:
  - **Haute**: Expansive editorial canvas (1380px max-width) with asymmetric story split and floating sommelier drawer.
  - **Nord**: Balanced 2-column tabular harvest ledger (1320px max-width).
  - **Café**: 3-column product vitrine with tactile category pill filter (1280px max-width).
  - **Neon**: Dynamic dual-stall side-by-side market lanes with pinned quick-cart.
  - **Trattoria**: Centered storytelling column (1080px max-width) with rustic side annotations.
  - **Izakaya**: Traditional cedar multi-column plank board with floating order checklist.

### 7.2 Tablet (768 × 1024)
- Touch targets strictly maintained at **≥ 44 × 44px**.
- 2-column layouts smoothly adapt to single or staggered multi-row flows without unreadable font shrinkage.
- Sticky category anchor navigation converts into a smooth horizontal scroll pill bar.

### 7.3 Mobile PWA (390 × 844 & 430 × 932)
- **Zero Squeezed Desktop Chrome**: The mobile storefront feels like an app installed on iOS/Android.
- **Header**: Sticky restaurant identity, branch name, and table locator pill.
- **Category Switching**: Frictionless horizontal pill bar with active tab scroll-into-view.
- **Cart Access**: Floating tactile pill at bottom (`[ 3 Items · ₹1,240.00 | View Order → ]`) with safe-area padding for iPhone Home Indicator (`env(safe-area-inset-bottom)`).
- **Modifier Sheet**: Native-feeling bottom sheet with drag handle, smooth spring slide-up, clear required vs optional indicators, and instant total recalculation.

---

## 8. Storefront Domain Data Contract & Authoritative Modifier Engine

### 8.1 Elimination of Synthetic Metadata
In 3.x, code inspected in `diner.ts` generated fake specs (`Micro-Lot Pour · Whole Milk` on any drink, `Smoked Embers` on food). In 4.0, **the frontend renders exclusively what is defined in the catalog item**.

### 8.2 The Authoritative TypeScript Domain Contract

```typescript
export interface CatalogItemModifierOption {
  id: string;
  name: string;
  priceDeltaMinor: number;       // Integer minor units (e.g. +3000 = +₹30.00)
  formattedPriceDelta?: string;  // e.g. "+₹30.00" or "" if 0
  isDefault?: boolean;
  allergens?: string[];
}

export interface CatalogItemModifierGroup {
  id: string;
  name: string;                  // e.g. "Cooking Temperature", "Milk Selection", "Broth Density"
  description?: string;
  minSelections: number;         // 1 = Required; 0 = Optional
  maxSelections: number;         // 1 = Single-choice Radio; >1 = Multi-choice Checkbox
  options: CatalogItemModifierOption[];
}

export interface StorefrontMenuItem {
  id: string;
  name: string;
  description: string;
  story?: string;
  basePriceMinor: number;        // e.g. 35000 = ₹350.00
  formattedPrice: string;
  category: string;
  station: 'TANDOOR' | 'CURRY_LINE' | 'BAR' | 'DESSERT' | 'EXPO';
  prepDurationMinutes: number;
  allergens: string[];           // e.g. ['DAIRY', 'GLUTEN']
  dietaryFlags: string[];        // e.g. ['VEG', 'NON_VEG', 'VEGAN']
  isAvailable: boolean;          // Sold-out handling
  imageUrl?: string;
  modifierGroups: CatalogItemModifierGroup[];
}
```

### 8.3 Catalog Integrity Verification Rules
1. **No Modifiers on Plain Items**: If `item.modifierGroups` is empty, clicking the card immediately adds the item or opens a clean details sheet *without* inventing options.
2. **Required Modifier Enforcing**: If `minSelections > 0`, the Add button in the sheet is disabled until the customer makes a valid selection.
3. **Priced Modifiers**: All modifier price deltas are summed into `totalPriceMinor` and validated server-side by `POST /api/restaurant/quote` with SHA-256 pricing hashes (`inputHash`, `resultHash`).
4. **Sold-Out Items**: If `isAvailable === false`, the card renders with an elegant desaturated "Sold Out for Evening Service" badge, and tap actions are disabled.
5. **Missing Images**: Fallbacks use authentic SVG geometric monogram illustrations matching the template's aesthetic—never broken image icons or stretched generic photos.

---

## 9. Purpose-Built Kitchen Instrument (KDS) & Expo Dispatch Redesign

The Kitchen Display System is an operational instrument, not a customer website. It must operate under hot, fast-paced kitchen conditions with high contrast, immediate tactile feedback, and station-specific routing.

### 9.1 Station Architecture & Routing

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 KITCHEN ORDER DISPATCH PIPELINE                         │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
                                  [ New Table Order ]
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
         ┌─────────────────────┐                         ┌─────────────────────┐
         │  TANDOOR STATION    │                         │  CURRY LINE STATION │
         │  • Paneer Tikka     │                         │  • Dal Makhani      │
         │  • Butter Naan      │                         │  • Murgh Makhani    │
         └──────────┬──────────┘                         └──────────┬──────────┘
                    │                                               │
                    │   (Item-level Cook Fulfillment)               │
                    └───────────────────────┬───────────────────────┘
                                            ▼
                                 ┌─────────────────────┐
                                 │    EXPO COMMAND     │
                                 │  • Consolidated View│
                                 │  • Runner Dispatch  │
                                 │  • [ Send to Table ]│
                                 └─────────────────────┘
```

### 9.2 Station-Specific Workflows
1. **TANDOOR & CURRY LINE (Hot Prep Stations)**:
   - **All-Day Aggregation Header**: Shows live counts of dishes cooking right now (`5x Paneer Tikka`, `8x Butter Naan`, `3x Dal Makhani`).
   - **Ticket Item Checklist**: Chefs check off individual items as they come off the skewers or out of the handi.
   - **Pacing Timers**: Green (0–8m) → Amber (8–12m) → Crimson Overdue (>14m).
2. **BAR & DRINKS**:
   - High-density drink queue sorted by order time. Quick 1-tap "Bump Drink" button.
3. **EXPO COMMAND (Expediter)**:
   - Aggregates all stations per table. Displays readiness status (e.g. `Table T-14 · 3 of 4 Ready`).
   - Prevents runner dispatch until all hot dishes and drinks are ready.
   - Single-tap `[ Complete & Send to Runner ]` button clears ticket.
4. **RECALL WORKFLOW**:
   - Dedicated "Recently Bumped" buffer allows accidental bumps to be undone within 60 seconds with 1 tap or bump bar `R`.

### 9.3 Hardware, Bump Bar & Keyboard Shortcuts
- Bump Bar Key `1–8`: Select ticket in column.
- `Space`: Bump / mark next ready item.
- `Enter`: Advance ticket state (`QUEUED` → `IN_PROGRESS` → `READY`).
- `R`: Recall last bumped ticket.
- `A`: Toggle All-Day production summary.
- `E`: Switch to Expo view.
- Touch Targets: Strictly **≥ 54px** for wet or gloved hands.

---

## 10. Comprehensive Redesign of 9 Administrative Workspaces

Every platform workspace receives a dedicated layout and UX model reflecting its specific operational purpose:

### 10.1 Platform Control Center (`/admin` on Port 3005)
- **Purpose**: Multi-tenant infrastructure management, cluster health, client project provisioning, license enforcement.
- **Layout**: High-density system status bar, tenant quota telemetry, cryptographic license verification drawer, zero-downtime feature flag toggles.

### 10.2 Restaurant Workspace / Operations Cockpit (`/` on Port 4010)
- **Purpose**: General Manager live shift oversight.
- **Layout**: Shift Command KPI ribbon (Revenue, Seated Covers, Kitchen SLA), 2-column live service split:
  - Left: Active Table Invoicing & Unsettled Folios.
  - Right: Live Station Loads & Immediate Guest Requests (Water, Bill, Call Server).

### 10.3 Template Marketplace (`/marketplace`)
- **Purpose**: Visual discovery and 1-click installation of restaurant design systems.
- **Layout**: Full-width immersive gallery (no competing admin sidebar). Live device preview switcher (Mobile 390px, Tablet 768px, Desktop 1200px) showing real menu data. Non-technical owner-facing copy.

### 10.4 Visual Brand Studio (`/studio`)
- **Purpose**: Real-time website authoring, section rearrangement, design token customization.
- **Layout**: Professional IDE layout:
  - Top Toolbar: Viewport switcher, Undo/Redo, Revision history, Save Draft, Publish.
  - Left Panel: Section hierarchy, Component blocks, Layer tree.
  - Center Canvas: Real-time responsive preview matching the live diner engine.
  - Right Inspector: Contextual properties (Typography, Colors, Spacing, Content).

### 10.5 Spatial Floor Studio (`/operations/floor`)
- **Purpose**: Table layout design, real-time table turnover, party capacity management.
- **Layout**: Full-viewport interactive CAD canvas. Continuous pointer dragging, 24px snap-to-grid, table rotation (0/90/180/270°), capacity editing popovers, and seat assignment inspectors.

### 10.6 Menu Catalog Workspace (`/menu`)
- **Purpose**: Product catalog management, recipe pricing, station routing, availability toggles.
- **Layout**: Data table with visual thumbnails, category filtering, station routing badges (`TANDOOR`, `CURRY`, `BAR`), and a dedicated modifier group builder modal.

### 10.7 Staff Directory & Cryptographic RBAC (`/staff`)
- **Purpose**: Personnel management, salted SHA-256 PIN authentication, role permission matrix.
- **Layout**: Employee roster table with role badges (Owner, Manager, Server, Chef, Expo), station authorizations, active token revocation registry, and PIN security audits.

### 10.8 Customer Support Desk (`/support`)
- **Purpose**: Multi-channel incident triage and restaurant operations assistance.
- **Layout**: Purpose-built 3-pane workbench:
  - Pane 1: Priority Ticket Queue & SLA countdown timers.
  - Pane 2: Chronological incident message thread with internal staff notes.
  - Pane 3: Restaurant telemetry, active template, hardware status, and network diagnostics.

### 10.9 White-Label & Custom Domains Studio (`/white-label`)
- **Purpose**: Custom domain provisioning, DNS status verification, multi-branch brand inheritance.
- **Layout**: Tabbed configuration with live CNAME DNS verification state machine, SSL certificate generation status, and branch-level logo/color override matrix.

---

## 11. Motion Design, Interaction System & Tactile Physics

Motion in RestaurantOS 4.0 communicates cause and effect while maintaining sub-frame performance:

### 11.1 Motion Rules
1. **Storefronts (Customer Delight)**:
   - **Cart Pill Addition**: Spring bounce (`cubic-bezier(0.175, 0.885, 0.32, 1.275)`, 240ms) on count change.
   - **Modifier Sheet Slide-Up**: Natural deceleration (`cubic-bezier(0.16, 1, 0.3, 1)`, 280ms).
   - **Template Switching in Marketplace**: Smooth cross-fade (160ms) with zero layout thrashing.
2. **Operations & KDS (Operational Speed)**:
   - **Zero Decorative Transitions**: Bumping a ticket is instantaneous (0–50ms) to ensure kitchen speed.
   - **Overdue Pulse**: Gentle color pulsation on overdue tickets without distracting flashing.
3. **Accessibility**:
   - Strict `prefers-reduced-motion: reduce` compliance across all stylesheets, replacing motion with instantaneous opacity swaps.

---

## 12. Storefront Document AST & Visual Studio Architecture

To guarantee that templates have real structural independence and that Studio edits do not corrupt data, RestaurantOS 4.0 utilizes a **Versioned Storefront Document Abstract Syntax Tree (AST)**.

### 12.1 The AST Schema

```typescript
export interface StorefrontComponentNode {
  id: string;
  type: string;                  // e.g. 'HeroSplitAsymmetric', 'SommelierTimeline', 'RoasterVitrineGrid'
  name: string;
  layout: 'split-asymmetric' | 'tabular-spec' | 'tactile-grid' | 'dual-stall' | 'rustic-stack';
  props: Record<string, any>;
  children?: StorefrontComponentNode[];
}

export interface StorefrontSection {
  id: string;
  type: 'hero' | 'story' | 'catalog_menu' | 'featured_dishes' | 'hours_contact';
  title: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  visible: boolean;
  order: number;
  customProps?: Record<string, any>;
}

export interface StorefrontDocument {
  version: string;               // e.g. '4.0.0'
  templateId: string;            // e.g. 'tmpl_haute_gastronomy'
  sections: StorefrontSection[];
  componentTree: StorefrontComponentNode[];
  tokens: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    surfaceColor: string;
    fontFamilyHeading: string;
    fontFamilyBody: string;
    borderRadius: string;
  };
}
```

### 12.2 Security & Immutability Guarantees
- **No Arbitrary Code Execution**: Templates are pure declarative AST documents rendered by approved, sandboxed React/TypeScript components. No executable scripts or untrusted HTML strings are accepted from marketplace packages.
- **Draft & Version History**: Studio edits are stored in `studioDraft`. Clicking "Publish" creates an immutable timestamped revision (`rev_v1`, `rev_v2`) in storage.
- **Instant Rollback**: Reverting to any prior revision instantly restores all AST nodes, design tokens, and section configurations.
- **Server Authority**: Storefront templates cannot override prices, tax calculations, kitchen stations, or order statuses.

---

## 13. Phased Implementation Roadmap (Phases 0–10)

This roadmap outlines the precise sequence of work upon receiving Owner approval:

```
Phase 0: Research & Audit (COMPLETED)
   │
Phase 1: Art Direction Approval (GATE LOCKED)
   │
Phase 2: Template Document AST & Component Registry Engine
   │
Phase 3: Template Marketplace Overhaul
   │
Phase 4: Six Authentic Customer Storefront Compositions
   │
Phase 5: Diner Omnichannel PWA (Desktop, Tablet, Mobile)
   │
Phase 6: Visual Brand Studio & Revision Engine
   │
Phase 7: Purpose-Built KDS & Expo Dispatch Workstation
   │
Phase 8: Comprehensive Administrative Workspaces Redesign
   │
Phase 9: Motion, Tactile Polish & Accessibility
   │
Phase 10: Master Visual, Operational & Security Verification
```

### Phase Details

| Phase | Deliverables | Modules Affected | Estimated Effort | Principal Risk & Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 0** *(Current)* | Forensic audit, research matrix, 12D wireframe tests, master proposal. | `docs/restaurantos/*` | Completed | Plan divergence. Mitigated by strict approval gate. |
| **Phase 1** *(Gate)* | Owner review, decision points alignment, explicit go-ahead. | Documentation | Awaiting Owner | Unauthorized implementation. Code changes strictly locked. |
| **Phase 2** | Typed Storefront AST schema, Component Registry, AST Renderer. | `packages/domain/index.ts`<br>`packages/runtime/index.ts` | 3–4 Days | Breaking existing stored templates. Mitigated by backward-compatible JSON migration. |
| **Phase 3** | Redesigned Marketplace with full-width layout, device previews. | `packages/ui/pages/marketplace.ts` | 2–3 Days | Preview mismatch. Mitigated by rendering true AST in previews. |
| **Phase 4** | Build 6 distinct template compositions (Haute, Nord, Café, Neon, Trattoria, Izakaya). | `packages/ui/pages/diner.ts`<br>`packages/ui/templates/*` | 5–6 Days | Template cloning. Mitigated by enforcing Grayscale Wireframe divergence. |
| **Phase 5** | Omnichannel responsive layouts: 1440 desktop, 768 tablet, 390 mobile PWA. | `packages/ui/pages/diner.ts`<br>`packages/ui/styles.ts` | 3–4 Days | Mobile viewport squishing. Mitigated by testing on simulated mobile viewports. |
| **Phase 6** | Visual Brand Studio overhaul: AST inspector, canvas sync, revision rollback. | `packages/ui/pages/studio.ts`<br>`packages/storage/store.ts` | 4–5 Days | Unsaved draft loss. Mitigated by atomic file storage with revision hashes. |
| **Phase 7** | KDS & Expo redesign: station views, timers, bump bar shortcuts, All-Day board. | `packages/ui/pages/kds.ts` | 3–4 Days | Kitchen speed degradation. Mitigated by zero-animation high-contrast UI. |
| **Phase 8** | Redesign Cockpit, Support, Staff, Menu, Floor, White-Label workspaces. | `packages/ui/pages/*`<br>`packages/ui/shell.ts` | 5–6 Days | Monotonous UI regression. Mitigated by role-specialized view layouts. |
| **Phase 9** | Motion tuning, tactile steppers, spring physics, contrast & WCAG AA audits. | `packages/ui/styles.ts`<br>`packages/ui/tokens.ts` | 2–3 Days | Layout shifts. Mitigated by transform-only CSS transitions and reduced-motion queries. |
| **Phase 10** | End-to-end visual truth audit, Playwright tests, zero-emoji verification. | `scripts/audit-visual-truth.js`<br>`scripts/test-*.js` | 2–3 Days | Regression. Mitigated by automated pairwise AST diffing and screenshot captures. |

---

## 14. Exhaustive Acceptance & Verification Strategy

Upon execution, the implementation will be subjected to the following automated and visual verification gates:

1. **Grayscale Structural Uniqueness**: Every template will be rendered in pure grayscale and captured via Playwright. Pairwise AST divergence must exceed **65%**, proving differentiation without relying on colors.
2. **Omnichannel Viewport Accuracy**: High-resolution browser screenshots captured across:
   - **Mobile**: `390 × 844` (iPhone 14/15/16) and `430 × 932` (iPhone Pro Max).
   - **Tablet**: `768 × 1024` (iPad portrait) and `1024 × 768` (iPad landscape).
   - **Desktop**: `1280 × 800`, `1440 × 900`, and `1920 × 1080`.
3. **Data Integrity & Modifiers**:
   - Items with zero modifiers add directly without synthetic popups.
   - Items with required modifiers lock the cart until selected.
   - Sold-out items cannot be added.
   - Price quotes validated against server SHA-256 hashes.
4. **Kitchen Operations & Expo**:
   - Tandoor and Curry Line orders route accurately to respective stations.
   - Line cooks can check off individual items.
   - Expo view updates readiness count in real time (`X/Y Ready`).
   - Bump bar shortcuts (`Space`, `Enter`, `R`) function with zero latency.
5. **Visual Brand Studio Integrity**:
   - Modifying section titles or tokens persists to draft storage.
   - Publishing commits an immutable revision (`rev_v*`).
   - Reverting to prior revision restores exact AST state without page corruption.
6. **Zero Emoji & 100% Vector Iconography**: Enforce automated regex validation (`[\u{1F300}-\u{1F9FF}]`) across all rendered HTML outputs.

---

## 15. Owner Decision & Approval Gate Checklist

To transition from planning into Phase 2 execution, the following decisions are presented for explicit Owner approval:

- [ ] **1. Dual-Pillar Architecture**: Approve decoupling administrative operations tokens from customer-facing storefronts.
- [ ] **2. Six Distinct Templates**: Approve the structural directions for Haute, Nord, Café Atelier, Neon Alley, Trattoria Bella, and Tokyo Izakaya.
- [ ] **3. Grayscale Wireframe Criteria**: Approve the 12-dimensional differentiation requirements and rejection of superficial color swaps.
- [ ] **4. Catalog Data Truth**: Approve strict elimination of synthetic modifier metadata in favor of pure catalog-driven modifier groups.
- [ ] **5. Specialized KDS & Expo**: Approve two-level fulfillment (prep station item checkmarks + Expo runner dispatch) with bump bar hotkeys.
- [ ] **6. Administrative Workspace Specialization**: Approve role-specific layouts for Cockpit, Support Desk, Staff RBAC, and Floor Studio.
- [ ] **7. Phased Implementation Roadmap**: Approve the 10-phase sequence (Phases 0–10) and effort estimation.

---
*End of Architectural Proposal. Standing by for Owner review and explicit approval.*
