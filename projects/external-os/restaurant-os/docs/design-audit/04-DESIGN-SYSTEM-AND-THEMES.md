# 🎨 Deliverable D & E: Design System, Themes & Storefront Specifications
**RestaurantOS UI/UX Reverse-Engineering & Design Handoff**
**Document ID:** `REST-OS-AUDIT-04-DESIGN-SYSTEM-AND-THEMES`
**Status:** Complete Specification `[Verified in source]` & `[Verified at runtime]`

---

## 1. Executive Overview & Design System Philosophy

RestaurantOS 4.x operates under a dual design philosophy:
1. **Warm Noir / Modern Operational Hospitality (Back-of-House & Operational Shell):**
   - Combines Apple-grade physical restraint with Linear-level information density.
   - Built on a deep charcoal/ink base (`#0D0F10`, `#151719`) punctuated by restrained warm copper accents (`#C86B3C`), sage greens (`#5D9A7A`), and crisp minor-unit typography.
   - 100% vector SVG iconography via custom zero-dependency Lucide-style engine (`packages/ui/icons.ts`). Emojis are strictly prohibited.
2. **Architecturally Distinct Multi-Persona Storefronts (Customer Experience / Diner PWA):**
   - Rejects the standard "re-skin with CSS variables" approach.
   - Implements 6 structurally distinct dine-in themes (Asymmetric split, Botanical ledger, Tactile vitrine, High-energy street market, Convivial rustic feasting, Shoji slip grid).
   - Plus 3 purpose-built standalone commerce engines: **CraveAtlas** (Brand Flagship Magazine), **SwiftBite** (High-velocity Mobile QSR), and **PantryRush** (Dark-store Quick Commerce).

---

## 2. Deliverable D: Design System Inventory

### 2.1 Color Tokens & Semantic System

Defined authoritatively in [`packages/ui/tokens.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/tokens.ts) and exported to CSS variables in [`packages/ui/styles.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/styles.ts).

#### Layer & Surface Hierarchy
| Token Name | Hex / Value | CSS Variable | Semantic Usage |
|---|---|---|---|
| `colors.ink` | `#0D0F10` | `--color-ink` | Deepest root background canvas across operational shell and dark themes. |
| `colors.charcoal` | `#151719` | `--color-charcoal` | Shell sidebar, primary headers, table row zebra bases, card containers. |
| `colors.elevated` | `#1C1F21` | `--color-elevated` | Modals, drawers, inspector panels, active toolbars, hover rows. |
| `colors.surfaceHover` | `#24282B` | `--color-hover` | Hover state on clickable cards, table rows, and secondary action surfaces. |
| `colors.surfaceBorder` | `rgba(255, 255, 255, 0.08)` | `--border-subtle` | Ultra-subtle dividers between ledger items and list rows. |
| `colors.borderSubtle` | `rgba(255, 255, 255, 0.05)` | `--border-subtle` | Structural frame dividers and low-contrast borders. |
| `colors.borderDefault` | `rgba(255, 255, 255, 0.10)` | `--border-default` | Standard input borders, card frames, and tab bar dividers. |
| `colors.borderStrong` | `rgba(255, 255, 255, 0.18)` | `--border-strong` | Active input borders, modal outlines, focused canvas elements. |

#### Warm Hospitality Neutrals
| Token Name | Hex / Value | CSS Variable | Semantic Usage |
|---|---|---|---|
| `colors.linen` | `#F3EEE5` | `--color-linen` | Primary typography, guest surfaces, warm high-contrast text. |
| `colors.stone` | `#A8A196` | `--color-stone` | Secondary typography, table column headers, metadata subtext, micro-labels. |
| `colors.muted` | `#706B63` | `--color-muted` | Timestamps, inactive pagination, disabled actions, keyboard shortcuts. |

#### Functional Brand & Action Accents
| Token Name | Hex / Value | CSS Variable | Semantic Usage |
|---|---|---|---|
| `colors.copper` | `#C86B3C` | `--color-copper` | Primary brand accent ("Ember"). Primary CTA buttons, active tabs, brand badges. |
| `colors.copperHover` | `#D87B4C` | `--color-copper-hover` | Active hover state for primary action buttons. |
| `colors.copperSubtle` | `rgba(200, 107, 60, 0.12)` | `--color-copper-subtle`| Selected row highlight, active category background, focused command item. |
| `colors.copperBorder` | `rgba(200, 107, 60, 0.35)` | - | Active tab underlines, selected card borders. |

#### Operational Status & Kitchen State Tokens
| Token Name | Hex / Value | CSS Variable | Semantic Usage |
|---|---|---|---|
| `colors.sage` | `#5D9A7A` | `--color-sage` | Success state, Table "OCCUPIED/SEATED", KDS "READY", SLA on-track. |
| `colors.sageSubtle` | `rgba(93, 154, 122, 0.12)` | `--color-sage-subtle`| Sage badge background, ready task card glow. |
| `colors.amber` | `#D99A45` | `--color-amber` | Attention required, Table "BILL_REQUESTED", KDS delayed task (>70% SLA). |
| `colors.amberSubtle` | `rgba(217, 154, 69, 0.14)` | `--color-amber-subtle`| Amber badge background, pending bill chip. |
| `colors.crimson` | `#C95757` | `--color-crimson` | SLA breach (>100% SLA), Table "DIRTY", Order "CANCELLED", Voided item. |
| `colors.crimsonSubtle`| `rgba(201, 87, 87, 0.15)` | `--color-crimson-subtle`| SLA breach flashing card border, error banner. |
| `colors.sky` | `#4A8BB2` | `--color-sky` | Info notices, Bar station indicator, Table "RESERVED" badge. |
| `colors.skySubtle` | `rgba(74, 139, 178, 0.12)` | - | Bar order tag background, drink modifier highlights. |

---

### 2.2 Typography Scale & Font System

#### Font Families
- **Operational Staff & Admin (`--font-staff`):** `system-ui, -apple-system, BlinkMacSystemFont, "Geist", "Inter", "Segoe UI", sans-serif`
  - High x-height, maximum legibility on kitchen bump bars, POS terminals, and mobile devices under high glare.
- **Editorial Guest Headings (`--font-editorial`):** `"Playfair Display", "Cormorant Garamond", Georgia, "Times New Roman", serif`
  - Used for luxury dining headings, sommelier wine folios, chapter dividers, and brand narratives.
- **Diner Body (`--font-diner`):** `system-ui, -apple-system, BlinkMacSystemFont, "Inter", sans-serif`
  - Clean reading flow for item descriptions, ingredient manifests, and allergen disclosures.
- **Precision Data & Currency Monospace (`--font-mono`):** `ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace`
  - Used strictly for currency figures (`₹450.00`), minor-unit calculations, table numbers (`T-14`), timestamps, and order UUIDs.

#### Type Scale (`tokens.typography.sizes`)
| Token | Computed Size | Line Height | Usage |
|---|---|---|---|
| `micro` | `11px` | `14px` | Station chips, table capacity badges, modifier price deltas, keyboard hints. |
| `xs` | `12px` | `16px` | Timestamps, table column headers, breadcrumb links, SLA countdowns. |
| `sm` | `13px` | `18px` | Secondary buttons, sidebar navigation items, table row metadata, drawer text. |
| `base` | `14px` | `21px` | Default body copy, form input labels, standard list items. |
| `md` | `15px` | `22px` | Menu item titles, section summary headers, dialog lead text. |
| `lg` | `17px` | `24px` | Card primary titles, modal headings, order totals. |
| `xl` | `20px` | `28px` | Section titles, drawer headers, KPI stat numbers. |
| `headline` | `24px` | `32px` | Top-level screen titles, floor plan names, storefront chapter titles. |
| `display` | `32px` | `40px` | Luxury hero titles, grand brand headlines, revenue figures. |

---

### 2.3 Spacing, Borders, Radii, Shadows & Elevation

#### Spacing Scale & Layout Grid
- **Base Grid:** 4px grid system (`4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `48px`, `64px`).
- **Sidebar Width:** Fixed `240px` on desktop (`>1024px`); collapses to `0px` with off-canvas slide drawer on mobile.
- **Canvas Width:** Fluid `calc(100vw - 240px)` on desktop with max-width content bounding containers (`1440px` for operations, `1600px` for KDS wall grid).
- **Inspector Panel Width:** Fixed `380px` (or `420px` for Studio preview drawer) right-docked on desktop, takes 100% width modal sheet on mobile (`<768px`).

#### Border Radii (`tokens.radii`)
- `xs: 4px` — Status badges, mini tags, inline code snippets.
- `sm: 6px` — Standard action buttons (`.btn`), form input fields, table action icons.
- `md: 8px` — Menu item cards, operational data widgets, command palette items.
- `lg: 12px` — Command palette box (`.cmdk-box`), modals, KDS order tickets, floating cart dock.
- `xl: 16px` — Customer mobile bottom sheet drawers, hero card wrappers.
- `pill: 9999px` — Category filter pills (`.cat-pill`), mood chips, quantity steppers, service FAB.

#### Shadows & Elevation Hierarchy (`tokens.shadows`)
- `none: none` — Flat embedded data rows.
- `subtle: 0 1px 3px rgba(0, 0, 0, 0.4)` — Data table cards, list items on dark background.
- `panel: 0 4px 16px rgba(0, 0, 0, 0.55)` — Floating header bars, sticky action bars.
- `inspector: -4px 0 24px rgba(0, 0, 0, 0.65)` — Right-docked side inspector drawers.
- `modal: 0 24px 48px -12px rgba(0, 0, 0, 0.85)` — Centered dialogs, confirmation popups.
- `glowCopper: 0 0 16px rgba(200, 107, 60, 0.35)` — Active button hover, focused table in floor view.

---

### 2.4 Touch Targets & Ergonomic Standards (`tokens.touch`)

Operational environments (greasy screens, fast handoffs, rapid kitchen bumping) enforce rigorous touch geometries:
- `minTarget: 44px` — Minimum clickable area for all operational buttons, table dots, and form fields.
- `kdsBump: 54px` — Extra large hit-target for kitchen station bump buttons (`BUMP COMPLETE`, `MARK PREPPING`).
- `navItem: 40px` — Height of sidebar navigation rows.
- `dinerButton: 48px` — Full-width primary CTA on diner mobile viewports (`Add to Cart`, `Place Order`).

---

### 2.5 Vector Iconography Library (`packages/ui/icons.ts`)

RestaurantOS contains a zero-dependency SVG vector icon engine with 94 hand-tuned icons. Every icon renders an accessible inline SVG (`viewBox="0 0 24 24"`, stroke 2px, customizable size and color).

#### Categorized Icon Catalog
| Category | Icon Names Available in Source |
|---|---|
| **Navigation & Surfaces** | `overview`, `floor`, `tables`, `orders`, `kitchen`, `menu`, `guests`, `reports`, `studio`, `marketplace`, `whitelabel`, `staff`, `locations`, `floors`, `support`, `terminal` |
| **Actions & Editing** | `search`, `plus`, `minus`, `check`, `x`, `save`, `upload`, `trash`, `edit`, `refresh`, `send`, `filter`, `maximize`, `minimize` |
| **Directional & Chevrons** | `chevron-down`, `chevron-right`, `chevron-left`, `arrow-right`, `arrow-up`, `arrow-down` |
| **Status & Indicators** | `clock`, `alert-circle`, `check-circle`, `shield`, `shield-check`, `sparkles`, `flame`, `star`, `heart`, `info`, `bell`, `zap` |
| **Devices & Viewports** | `smartphone`, `monitor`, `tablet`, `globe`, `layers`, `palette`, `sliders`, `settings`, `code`, `play` |
| **Hospitality & Commerce**| `coffee`, `utensils`, `beer`, `chair`, `tag`, `credit-card`, `shopping-bag`, `cart`, `clipboard`, `file-text`, `message-square`, `external-link`, `phone`, `user`, `users`, `map-pin`, `wifi`, `lock`, `key` |
| **Form Shapes & Toggles** | `circle`, `square`, `check-square`, `minus-circle`, `plus-circle`, `layout-grid` |

---

### 2.6 Core UI Primitives & Variants

#### Buttons (`.btn`)
- `.btn-primary`: Background `--color-copper`, white text, copper hover glow. Used for primary form submits, order placement, and table opening.
- `.btn-secondary`: Background `--color-elevated`, border `--border-default`, text `--color-linen`. Used for filters, cancel actions, and secondary toolbars.
- `.btn-ghost`: Transparent background, text `--color-stone`, hover highlight. Used for icon buttons, breadcrumbs, and row dismissals.
- `.btn-sm`: Compact `padding: 4px 10px; font-size: 12px;` for table row actions.

#### Badges (`.badge`)
- `.badge-sage`: Green subtle fill, sage text, sage border (`rgba(93, 154, 122, 0.25)`).
- `.badge-amber`: Amber subtle fill, amber text, amber border (`rgba(217, 154, 69, 0.3)`).
- `.badge-crimson`: Red subtle fill, crimson text, crimson border (`rgba(201, 87, 87, 0.3)`).
- `.badge-copper`: Ember subtle fill, copper text, copper border (`rgba(200, 107, 60, 0.3)`).
- `.badge-neutral`: Neutral white 5% fill, stone text, default border.

#### Command Palette (`.cmdk-backdrop` & `.cmdk-box`)
- Global overlay with `backdrop-filter: blur(8px)`.
- Input has zero border, border-bottom 1px solid `--border-default`, auto-focused on `⌘K` or `/`.
- Results list with max height `320px`, keyboard up/down traversal, and instant `Enter` navigation.

---

## 3. Deliverable E: Storefront & Restaurant Theme Audit

### 3.1 The 6 Authentic Dine-In Themes (`packages/ui/pages/diner.ts`)

The diner PWA engine (`/dine/:locator`) dynamically instantiates one of 6 specialized layout engines based on the active template configured in `store.data.tenantBrand.activeTemplateId`.

#### 1. Atelier Étoile Noir (`tmpl_haute_gastronomy`)
- **Category:** Haute Gastronomy & Fine Dining.
- **Visual Concept:** Luxury Parisian/Nordic tasting room. Pitch black background (`#080A0D`) with champagne gold accents (`#C5A059`), deep charcoal cards (`#12161E`), and warm cream typography (`#F5F0E6`).
- **Page Architecture:** **50/50 Asymmetric Viewport Split**:
  - *Left Viewport Canvas (Fixed Desktop, 50% width):* Immersive high-res food photography, executive chef philosophy manifesto, sommelier wine pairing notes, and table context.
  - *Right Viewport Canvas (Scrollable Desktop, 50% width):* Chronological tasting course timeline ("Movements I through IV"), circular plate detail cards, and sommelier cellar drawer.
- **Cart & Order Presenter:** Sommelier tasting folio dock sliding out from right side with wine-glass vector accents.
- **Typography:** Headings in `"Cormorant Garamond", Georgia, serif`; body in `"Inter", sans-serif`.

#### 2. Fjord & Form Botanical (`tmpl_nordic_minimal`)
- **Category:** Nordic Minimal & Botanical Journal.
- **Visual Concept:** Organic Copenhagen foraging aesthetic. Natural unbleached linen background (`#F7F5F0`), slate charcoal text (`#1E2229`), moss green accents (`#4A6B53`), and warm birch borders (`#E5DFD5`).
- **Page Architecture:** **Single-Column Editorial Food Journal**:
  - Centered archival harvest feed (`max-width: 880px`).
  - Item cards formatted as horizontal botanical ledgers with latitude/longitude harvest coordinates, local forager attribution, and specimen detail drawers.
- **Cart & Order Presenter:** Floating minimalist tasting folio bar anchored to the bottom right with unbleached paper textures.
- **Typography:** Headings in `"Playfair Display", serif`; body in `"Plus Jakarta Sans", sans-serif`.

#### 3. Roastery 1984 Vitrine (`tmpl_artisan_coffee`)
- **Category:** Specialty Café, Bakery & Espresso Bar.
- **Visual Concept:** Sunlit minimalist Melbourne coffee roastery. Warm milk foam background (`#FDFBF7`), espresso roast dark brown (`#2C1E18`), terracotta copper accents (`#C86B3C`), and tactile brass borders.
- **Page Architecture:** **Tactile Counter Vitrine Grid**:
  - Top interactive Roastery Bar dial showing single-origin bean roast profiles, tasting notes (floral, bergamot, dark chocolate), and origin elevation (1,850m).
  - Interactive cup size selector pills directly on item cards (`8oz Flat White` vs `12oz Mug`).
  - Milk alternative matrix (Oat, Almond, Soy, Whole).
  - Morning Hearth Bakery Vitrine drawer showing live remaining batch counts ("Only 4 croissants remaining in oven batch").
- **Cart & Order Presenter:** Compact floating Barista Order Capsule with instant cup count badge.
- **Typography:** Modern clean geometric sans (`"Outfit", sans-serif`).

#### 4. Neon Yokocho Night Alley (`tmpl_neon_street`)
- **Category:** Contemporary Asian Street-Food & Night Market.
- **Visual Concept:** Shinjuku/Taipei neon alley. Deep midnight canvas (`#090B10`), glowing lantern vermilion (`#FF2A55`), electric amber (`#FF5722`), and high-contrast dark gray stall cards (`#141822`).
- **Page Architecture:** **High-Energy Dense Market Grid**:
  - Horizontal sticky food-stall category strip with neon glow badges.
  - 2-column mobile, 3-column desktop grid with dynamic spice level flame meters (`Flame 1` to `Flame 4`).
  - Rapid 1-tap `+ Add to Tray` button bypassing customary dialogs for uncustomized items.
- **Cart & Order Presenter:** Slide-up street receipt order tray modeled after printed thermal izakaya receipts with zig-zag tear edges.
- **Typography:** Punchy modern display sans (`"Plus Jakarta Sans", sans-serif`).

#### 5. Osteria Rustica Convivial (`tmpl_trattoria_bella`)
- **Category:** Italian Trattoria & Convivial Feasting.
- **Visual Concept:** Sun-drenched Tuscan villa. Warm rustic terracotta (`#8C3820`), sun-baked limestone stone (`#FAF7F2`), deep olive branch green (`#3D4A39`), and dark wood framing.
- **Page Architecture:** **Traditional Course-Paced Feasting Flow**:
  - Sections strictly paced into classical Italian courses: *Antipasti*, *Primi Piatti*, *Secondi*, *Contorni*, *Dolci*.
  - Wood-fired oven live story banner and official DOP/IGP certification seals on specialty cheeses and olive oils.
  - "Tavola Grande" family feasting combo options allowing party-wide pasta and meat platters with 1-click inclusion.
- **Cart & Order Presenter:** Classic Italian leather folio check presenter sliding up from viewport footer.
- **Typography:** Editorial Renaissance serif (`"Cormorant Garamond", Georgia, serif`).

#### 6. Shokunin Ramen & Robata (`tmpl_tokyo_izakaya`)
- **Category:** Japanese Ramen Craft & Robata Skewer House.
- **Visual Concept:** Traditional Kyoto machiya alley. Hinoki cedar wood canvas (`#26201B`), shoji paper textured panels (`#F5EFE6`), sumi ink black typography (`#12100E`), and Japanese red stamp accents (`#BC2E24`).
- **Page Architecture:** **Shoji Screen & Craft Order Slip Grid**:
  - Traditional vertical Japanese kanji script headers (職人魂 · 極上出汁).
  - Interactive 4-step ramen order slip:
    1. Broth Richness: *Light (Assari)* / *Standard* / *Ultra-Rich (Kotteri)*.
    2. Noodle Firmness: *Soft* / *Firm (Katame)* / *Very Firm (Barikata)*.
    3. Garlic Level: *None* / *1 Clove* / *Double Roasted Garlic*.
    4. Tare Seasoning: *Shio* / *Shoyu* / *Miso Tare*.
  - Binchotan charcoal grill robata skewer grid with tare glaze vs sea salt toggles.
- **Cart & Order Presenter:** Lacquered bento box bill tray dock anchored to bottom right.
- **Typography:** Monospace data figures combined with clean serif Japanese display titles.

---

### 3.2 Standalone Customer Experiences

#### 1. CraveAtlas (`/crave-atlas` — `packages/ui/pages/crave-atlas.ts`)
- **Business Model:** Multi-branch restaurant flagship website & brand magazine.
- **Layout Structure:**
  - *Brand Header:* Dynamic branch locator pill (`Ludhiana Main`, `Chandigarh Sector 17`, `Delhi CP`) with real-time open/closed status.
  - *Hero Section:* Visual culinary storytelling banner with photography of charcoal tandoor fires.
  - *Branch Selector Modal:* 3-branch switcher with distance calculation and delivery radius validation.
  - *Signature Highlights Carousel:* Horizontal WAI-ARIA accessible carousel with prev/next arrows on desktop and touch swipe on mobile.
  - *Menu Catalog:* Multi-column category grid with live instant search and veg/non-veg filter pills.
  - *Order Folio:* Right-docked slide-over cart with branch-specific delivery fee calculation and 5% GST computation.

#### 2. SwiftBite (`/swift-bite` — `packages/ui/pages/swift-bite.ts`)
- **Business Model:** Speed-first mobile pickup & express counter ordering.
- **Layout Structure:**
  - *Sticky Speed Bar:* 15-20 min SLA guarantee banner with live kitchen load indicator.
  - *Past Favorites Rail:* "Order Again in 1-Tap" horizontal quick-reorder carousel.
  - *Express Card Grid:* 1-tap add buttons that transform directly into in-place `[- 1 +]` steppers without opening modal sheets.
  - *Persistent Order Capsule:* Sticky bottom summary bar expanding into full-screen express checkout with instant UPI QR presentation.

#### 3. PantryRush (`/pantry-rush` — `packages/ui/pages/pantry-rush.ts`)
- **Business Model:** Dark-store hyper-local grocery & quick-commerce engine.
- **Layout Structure:**
  - *Dark-Store Header:* Delivery address pill with pincode validation (`141001`), 12-15 min ETA pill, and live store operational status.
  - *Free Delivery Threshold Tracker:* Visual progress bar ("Add ₹49 more for FREE delivery").
  - *Dense Shelf Grid:* 4 columns on desktop, 2 columns on mobile. Shows brand metadata, pack size, MRP with strikethrough, selling price, and real-time inventory count.
  - *Substitution Drawer:* Radio selector for out-of-stock items (*Allow best replacement*, *Ask me via call*, *Refund item*).

---

### 3.3 Template & Storefront Comparison Matrix (Anti-Token-Clone Analysis)

The following matrix documents the **genuine structural, interaction, layout, and component differences** between all 9 customer-facing storefronts. These are not merely color reskins.

| Template / Storefront | Page Architecture | Hero Model | Card Layout Pattern | Customization Experience | Cart / Checkout Interface | Unique Structural Primitives |
|---|---|---|---|---|---|---|
| **Atelier Étoile Noir** (`tmpl_haute_gastronomy`) | 50/50 Viewport Split (Fixed left, scroll right) | Fixed editorial manifesto & sommelier canvas | Editorial course movement with circular plate thumbnails | Sommelier cellar pairing & vintage selector modal | Sommelier wine folio slide-over | Split-viewport grid, tasting course timeline, wine vintage badge |
| **Fjord & Form Botanical** (`tmpl_nordic_minimal`) | Single-column centered archival journal | Minimal text headline with geographical coordinates | Horizontal botanical ledger with specimen detail expander | Foraged ingredient provenance accordion | Unbleached linen tasting folio dock | Coordinates stamp, forager attribution block, botanical ledger row |
| **Roastery 1984 Vitrine** (`tmpl_artisan_coffee`) | Tactile counter vitrine grid | Interactive coffee bean roast dial & flavor notes | Tactile counter cards with inline 8oz/12oz size pills | Cup size stepper, roast profile selector, milk matrix | Barista order capsule bottom chip | Aroma dial SVG, milk matrix selector, hearth bakery countdown bar |
| **Neon Yokocho** (`tmpl_neon_street`) | Dense night market 3-col grid | Glowing neon stall marquee banner | High-contrast stall ticket with spice flame meters | Instant spice slider (Flame 1 to 4) & rapid toppings | Slide-up printed thermal receipt tray | Spice flame meter, neon category pill rail, tear-edge receipt dock |
| **Osteria Rustica** (`tmpl_trattoria_bella`) | Sequential Italian course flow | Wood-fired hearth hearthside narrative | Framed rustic parchment cards with DOP/IGP seals | Family feasting "Tavola Grande" combo selector | Classic leather folio check presenter | DOP seal badge, course sequence separator, family combo card |
| **Shokunin Ramen** (`tmpl_tokyo_izakaya`) | Shoji screen slat grid | Calligraphic woodblock brand header | Hinoki cedar slat cards with skewer tare notes | Interactive 4-step ramen order slip modal | Lacquered bento box bill tray | 4-step craft ramen slip, cedar slat grid, robata glaze toggle |
| **CraveAtlas** (`/crave-atlas`) | Multi-branch discovery portal | Wide culinary photography banner with branch switcher | Modern e-commerce dish cards with dietary badges | Multi-group modifier sheet with required rule checks | Slide-in right order folio with branch 5% GST quote | Branch selector modal, WAI-ARIA signature carousel, branch hours pill |
| **SwiftBite** (`/swift-bite`) | High-velocity mobile-first rail | Compact 1-line SLA timer banner | Dense list rows with instant `[- 1 +]` steppers | Fast-path bottom drawer only for mandatory choices | Sticky bottom 1-tap checkout bar | Past orders 1-tap reorder rail, inline stepper conversion |
| **PantryRush** (`/pantry-rush`) | Dark-store multi-aisle grocery shelf | Delivery threshold progress banner | Multi-column supermarket shelf with MRP discount tags | Pack size selector & explicit substitution modal | Supermarket checkout folio with delivery slot picker | Free delivery progress bar, stock count limiters, substitution rules |

---

## 4. Customization Scopes & Governance

The table below defines how each storefront element is configured and governed across RestaurantOS:

| Element | Customer Editable? | Restaurant Admin / Manager? | Branch Specific? | Globally Fixed Engine? |
|---|---|---|---|---|
| **Primary & Secondary Colors** | No | Yes (via `/whitelabel` or `/studio`) | Yes (via `branchOverrides`) | Defaults set in domain seeds |
| **Typography Selection** | No | Yes (Studio font selectors) | Yes | Bounded to approved font catalog |
| **Storefront Architecture** | No | Yes (Marketplace template install) | Yes | 6 canonical engines |
| **Dish Names, Descriptions & Stories** | No | Yes (via `/menu` editor) | No (Global catalog) | Domain `MenuItem` contract |
| **Dish Pricing & 86'd Availability** | No | Yes (via `/locations` or `/menu`) | Yes (BranchMenuOverride) | Storage branch override map |
| **Modifier Options & Upcharges** | Selected during order | Yes (via `/menu` modifier builder)| No | SHA-256 pricing quote validated |
| **Guest Party Name & Seating Mood** | Yes (via diner header) | Can edit via `/operations/floor` | Scoped to active table session | Transient session state |
| **Dark Store Inventory Stock Counts**| No | Auto-decremented on order commit | Yes (per dark-store branch) | `store.decrementGroceryStock` |
| **Branch Address & Opening Hours** | No | Yes (via `/locations`) | Yes | Domain `BranchRecord` |
| **Custom CSS Injections** | No | Yes (Whitelabel custom CSS box) | Yes | Rendered inside `<style>` tag |

---

## 5. Verification & Confidence Statement

- **Design Tokens & Styles:** `[Verified in source]` (`packages/ui/tokens.ts`, `packages/ui/styles.ts`).
- **Iconography Library:** `[Verified in source]` (`packages/ui/icons.ts` - 94 icons, zero emojis).
- **Dine-In Themes (6 canonical engines):** `[Verified in source]` (`packages/ui/pages/diner.ts`) and `[Verified at runtime]` on `:4010/dine/table_ldh_14?templateId=...`.
- **Standalone Storefronts (CraveAtlas, SwiftBite, PantryRush):** `[Verified in source]` (`crave-atlas.ts`, `swift-bite.ts`, `pantry-rush.ts`) and `[Verified at runtime]` on `:4010/crave-atlas`, `:4010/swift-bite`, `:4010/pantry-rush`.
- **Template Normalization & Alias Mapping:** `[Verified in source]` (`packages/storage/store.ts` line 2256).
