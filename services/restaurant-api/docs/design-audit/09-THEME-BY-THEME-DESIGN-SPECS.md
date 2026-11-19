# 🎨 RestaurantOS — Design Reset Phase 0: Theme-by-Theme Design Specifications
**Document ID:** `REST-OS-RESET-09-THEME-SPECS`  
**Repository:** `projects/external-os/restaurant-os`  
**Status:** Canonical Storefront Theme Architectures & Structural Specifications  
**Target Surface:** In-Restaurant Diner PWA (`/dine/:locator`)  

---

## 1. Executive Summary & Structural Diversity Manifesto

A central requirement of the RestaurantOS redesign is that the six customer diner themes **must be structurally, behaviorally, and spatially unique**, not simple color-palette reskins of a single shared layout. 

Each theme represents a fundamentally different hospitality genre, dining pacing, and customer mental model:
- Fine dining demands poetic course pacing, wine pairings, and spacious editorial layout.
- A street-food night market demands rapid visual scanning, spice meters, and instant tray addition.
- An espresso roastery demands coffee dials, cup volume selectors, and bakery vitrines.
- A ramen house demands craft customizer order slips mimicking physical wooden slips.

Below are the deep structural specifications for all six canonical themes.

---

## 2. Deep Structural Specifications for the Six Themes

---

### Theme 1: Atelier Étoile Noir (`tmpl_haute_gastronomy`)
- **Category:** Haute Gastronomy & Luxury Tasting Room.
- **Intended Customer:** Fine dining patrons enjoying a multi-course culinary tasting journey.
- **Visual Concept:** Minimalist Parisian atelier. Deep obsidian canvas (`#080A0D`), muted brass and champagne gold accents (`#C5A059`), deep charcoal plate backgrounds (`#12161E`), and warm cream typography (`#F5F0E6`).

#### 1. Page Architecture & Layout Grammar
- **50/50 Asymmetric Viewport Split (Desktop >1024px):**
  - **Left Canvas (50% Width, Fixed Position, Full Height):** Immersive food photography gallery, executive chef philosophy manifesto ("Crafted over sal wood coals"), cellar sommelier profile, and table context indicator.
  - **Right Canvas (50% Width, Scrollable Flow):** Chronological tasting course timeline partitioned into "Movements I through IV", with circular dish detail vignettes and sommelier cellar pairing notes.
- **Mobile (390px Viewport):** Collapses into a single-column editorial tasting sequence. The left canvas becomes an ambient top hero banner (320px height) with a subtle vertical parallax scroll.

#### 2. Food Presentation & Card Structure
- **Card Pattern:** "Editorial Sommelier Vignette".
- **Visual Elements:** Circular plate photography module (140px diameter on desktop) flanked by dish story, French/regional course nomenclature, primary allergens, and sommelier pairing badge (`🍷 2019 Sula Dindori Reserve Viognier`).
- **Pacing:** Dishes are grouped strictly by dining sequence (*Movement I: Amuse & Starters*, *Movement II: Wood-Fired Hearth*, *Movement III: Royal Mains*, *Movement IV: Grand Finale*).

#### 3. Customization & Sommelier Folio
- **Customization Interface:** Slides in as an elegant right-hand sommelier folio. Focuses on vintage selection, course additions, and pairing notes rather than commercial upselling.
- **Cart & Order Presenter:** Floating sommelier wine folio dock in the bottom right corner with thin brass border (`1px solid #C5A059`). Expands into a tasting ledger formatted like an embossed menu book.

#### 4. Typography & Motion
- **Headings:** `"Cormorant Garamond", Georgia, serif` (Weights: 600 SemiBold, 700 Bold, Italic accents).
- **Body & Data:** `"Inter", -apple-system, sans-serif` at 13px-14px.
- **Motion:** Slow, weighted cubic-bezier transitions (`300ms cubic-bezier(0.16, 1, 0.3, 1)`). Modals glide smoothly without bouncing.

---

### Theme 2: Fjord & Form Botanical (`tmpl_nordic_minimal`)
- **Category:** Nordic Minimal & Botanical Journal.
- **Intended Customer:** Eco-conscious diners, foraging enthusiasts, natural wine lovers.
- **Visual Concept:** Organic Copenhagen food laboratory. Unbleached natural linen canvas (`#F7F5F0`), deep slate text (`#1E2229`), muted spruce green accents (`#4A6B53`), and warm birch borders (`#E5DFD5`).

#### 1. Page Architecture & Layout Grammar
- **Single-Column Archival Food Journal:**
  - Centered reading container with generous breathing room (`max-width: 880px`).
  - Header displays daily harvest date and geographic coordinates (`55°40'34"N 12°34'06"E`).
  - Minimalist navigation anchor strip: `[ Harvest Starters ]  [ Wild Hearth ]  [ Foraged Flora ]  [ Ferments ]`.

#### 2. Food Presentation & Card Structure
- **Card Pattern:** "Horizontal Botanical Ledger".
- **Visual Elements:** Minimalist ledger row with small square botanical plate preview (80px), dish name, provenance coordinates (e.g., "Himalayan Morel Mushrooms · Foraged at 2,400m altitude"), and harvest season tag.
- **Accordion Expander:** Clicking a dish unrolls an in-place specimen drawer revealing soil notes, botanical classification, and farmer partnership details.

#### 3. Customization & Tasting Folio
- **Customization Interface:** Inline drawer expanding downward within the ledger list, preserving customer scroll context.
- **Cart & Order Presenter:** Unbleached paper tasting dock anchored to the bottom right. Displays simple leaf vector icon and minimal cover count.

#### 4. Typography & Motion
- **Headings:** `"Playfair Display", "Cormorant Garamond", serif` with low contrast ratios.
- **Body & Micro-Labels:** `"Plus Jakarta Sans", sans-serif` at 12px-13px, Letter-spacing `0.04em`.
- **Motion:** Gentle paper unrolling animations (`200ms ease-out`).

---

### Theme 3: Roastery 1984 Vitrine (`tmpl_artisan_coffee`)
- **Category:** Specialty Café, Bakery & Espresso Bar.
- **Intended Customer:** Coffee purists, brunch guests, bakery patrons.
- **Visual Concept:** Sunlit Melbourne roastery. Warm steamed-milk background (`#FDFBF7`), dark espresso roast text (`#2C1E18`), terracotta copper accents (`#C86B3C`), and brass counter trim.

#### 1. Page Architecture & Layout Grammar
- **Tactile Counter Vitrine Grid:**
  - Top Interactive Roast Dial: Live SVG flavor compass showing Origin, Altitude (1,850m), Roast Profile (Light-Medium), and Cupping Notes (Bergamot, Jasmine, Honey).
  - Morning Hearth Bakery Vitrine: Horizontal live batch drawer showing real-time remaining batch counts ("Fresh out of oven · Only 4 croissants remaining in batch").
  - 3-Column counter card grid on desktop, 1-column on mobile.

#### 2. Food Presentation & Card Structure
- **Card Pattern:** "Tactile Vitrine Counter Card".
- **Visual Elements:** High-angle coffee cup photography, inline cup size selector pills (`[ 8oz Flat White ]` vs `[ 12oz Mug ]`), milk alternative matrix (Oat, Almond, Soy, Whole Milk), and mounted `[- 1 +]` stepper buttons.

#### 3. Customization & Barista Order Capsule
- **Customization Interface:** Quick-tap bottom sheet with visual bean grind selector, syrup pumps stepper, and temperature slider (Extra Hot / Warm / Iced).
- **Cart & Order Presenter:** Floating Barista Order Capsule anchored to the bottom right with live steaming cup vector icon.

#### 4. Typography & Motion
- **Headings & Numbers:** `"Outfit", "Plus Jakarta Sans", sans-serif` (Weights: 600 SemiBold, 800 ExtraBold).
- **Data & Milliliters:** `JetBrains Mono, monospace` for volume and temperature values.
- **Motion:** Snappy tactile micro-interactions (`140ms cubic-bezier(0.16, 1, 0.3, 1)`). Steppers give immediate haptic feel.

---

### Theme 4: Neon Yokocho Night Alley (`tmpl_neon_street`)
- **Category:** Asian Street Food & Urban Night Market.
- **Intended Customer:** High-energy casual diners, groups sharing street skewers and craft beers.
- **Visual Concept:** Shinjuku/Taipei neon night alley. Pitch midnight canvas (`#090B10`), glowing lantern vermilion (`#FF2A55`), electric amber (`#FF5722`), and high-contrast dark gray stall cards (`#141822`).

#### 1. Page Architecture & Layout Grammar
- **High-Energy Dense Market Grid:**
  - Sticky neon food-stall category strip with glowing pill badges (`[ 🔥 SKEWERS ]`, `[ 🥟 DUMPLINGS ]`, `[ 🍜 NOODLES ]`, `[ 🍺 BEER ]`).
  - High-density multi-column grid (3 columns desktop, 2 columns mobile) maximizing visible dishes per viewport.

#### 2. Food Presentation & Card Structure
- **Card Pattern:** "High-Contrast Street Stall Ticket".
- **Visual Elements:** Bold dish photography, prominent spice flame meters (1 to 4 flames), fast-tag badges (*Chef's Fire Skewer*, *Night Market Special*), and instant `+ Add to Tray` button bypassing customary dialogs for uncustomized items.

#### 3. Customization & Street Receipt Tray
- **Customization Interface:** Rapid 1-step spice slider modal with radio buttons for dipping sauces and toppings.
- **Cart & Order Presenter:** Slide-up thermal izakaya receipt tray with zig-zag perforated tear edge. Displays items in dense thermal printer typography.

#### 4. Typography & Motion
- **Headings:** `"Plus Jakarta Sans", -apple-system, sans-serif` (Weights: 800 ExtraBold, 900 Black).
- **Receipt Body:** `ui-monospace, "SF Mono", monospace`.
- **Motion:** High-velocity snappy transitions with subtle neon pulse glow on hover (`120ms ease-in-out`).

---

### Theme 5: Osteria Rustica Convivial (`tmpl_trattoria_bella`)
- **Category:** Italian Trattoria & Convivial Feasting.
- **Intended Customer:** Multi-generational families, celebration parties, wine lovers.
- **Visual Concept:** Sun-drenched Tuscan villa. Warm rustic terracotta (`#8C3820`), sun-baked limestone stone (`#FAF7F2`), olive branch green (`#3D4A39`), and dark walnut framing.

#### 1. Page Architecture & Layout Grammar
- **Classical Course-Paced Feasting Flow:**
  - Sections strictly paced into traditional Italian courses:
    - *Antipasti della Casa* (Starters & Burrata)
    - *Primi Piatti* (Handmade Fresh Pastas)
    - *Secondi dal Forno* (Wood-Fired Meats & Seafood)
    - *Contorni* (Seasonal Sides)
    - *Dolci & Digestivi* (Tiramisu & Amaro)
  - Wood-Fired Hearth story banner detailing 72-hour slow-fermented dough and live live-fire cooking.

#### 2. Food Presentation & Card Structure
- **Card Pattern:** "Framed Rustic Parchment Card".
- **Visual Elements:** Framed cards with dark wood borders, official DOP/IGP certification seals, olive oil provenance notes, and "Tavola Grande" family feasting combo options (serves 4-6).

#### 3. Customization & Leather Folio Presenter
- **Customization Interface:** Elegant course-pacing selector (*Serve with Primi* vs. *Serve as Entrée*) and wine glass pairing picker.
- **Cart & Order Presenter:** Classic Italian leather folio check presenter sliding smoothly up from the footer.

#### 4. Typography & Motion
- **Headings:** `"Cormorant Garamond", "Playfair Display", Georgia, serif`.
- **Body Copy:** `"Plus Jakarta Sans", sans-serif`.
- **Motion:** Warm, relaxed transitions (`220ms ease-out`).

---

### Theme 6: Shokunin Ramen & Robata (`tmpl_tokyo_izakaya`)
- **Category:** Japanese Ramen Craft & Robata Skewer House.
- **Intended Customer:** Ramen enthusiasts, yakitori diners, sake bar patrons.
- **Visual Concept:** Traditional Kyoto machiya alley. Hinoki cedar wood canvas (`#26201B`), shoji paper textured panels (`#F5EFE6`), sumi ink black typography (`#12100E`), and Japanese red vermilion stamp accents (`#BC2E24`).

#### 1. Page Architecture & Layout Grammar
- **Shoji Screen & Craft Order Slip Grid:**
  - Traditional vertical Japanese kanji script headers (職人魂 · 極上出汁 · 炭火焼鳥).
  - Robata charcoal grill skewer grid with tare glaze vs. sea salt toggles.

#### 2. Food Presentation & Card Structure
- **Card Pattern:** "Cedar Slat Craft Slip".
- **Visual Elements:** Binchotan charcoal grill marks, cedar wood grain textures, and an interactive **4-Step Craft Ramen Customizer Slip**:
  1. *Broth Richness:* Light (Assari) / Standard / Ultra-Rich (Kotteri)
  2. *Noodle Firmness:* Soft / Firm (Katame) / Extra Firm (Barikata)
  3. *Garlic Level:* None / Single Clove / Double Roasted Garlic
  4. *Tare Base:* Shio / Shoyu / Miso Tare

#### 3. Customization & Bento Bill Tray
- **Customization Interface:** Emulates a physical Japanese wooden order slip with red stamp checkmarks.
- **Cart & Order Presenter:** Lacquered bento box bill tray dock anchored to bottom right with traditional chopstick vector accents.

#### 4. Typography & Motion
- **Display Headings:** Authentic Japanese calligraphy font paired with `"Outfit", sans-serif`.
- **Order Slips:** Monospace data layout (`JetBrains Mono`).
- **Motion:** Crisp shoji sliding panel transitions (`180ms ease-in-out`).

---

## 3. Structural Comparison Matrix (Anti-Token-Clone Analysis)

The table below proves the structural, architectural, and behavioural independence of all six themes:

| Theme Identifier | Page Architecture | Hero Model | Card Layout Pattern | Customization Experience | Cart & Check Presenter | Unique Structural Primitives |
|---|---|---|---|---|---|---|
| **`tmpl_haute_gastronomy`** (Atelier Étoile) | 50/50 Viewport Split (Fixed left, scroll right) | Fixed editorial manifesto & cellar canvas | Circular plate vignette with sommelier pairings | Sommelier cellar pairing & vintage selector modal | Sommelier wine folio slide-over | Split-viewport grid, tasting timeline, wine pairing badge |
| **`tmpl_nordic_minimal`** (Fjord & Form) | Centered archival journal (`max-width: 880px`) | Geographical coordinates & harvest date | Horizontal botanical ledger with specimen expander | In-place unrolling accordion drawer | Unbleached linen folio dock | Coordinates stamp, forager attribution, specimen expander |
| **`tmpl_artisan_coffee`** (Roastery 1984) | Tactile counter vitrine grid | Interactive coffee bean roast dial & flavor notes | Tactile counter cards with inline 8oz/12oz size pills | Cup size stepper, roast dial, milk alternative matrix | Barista order capsule dock | Aroma dial SVG, milk matrix selector, bakery countdown |
| **`tmpl_neon_street`** (Neon Yokocho) | High-energy dense market grid (3-col) | Glowing neon stall marquee banner | High-contrast stall ticket with spice flame meters | Rapid spice slider (Flame 1-4) & rapid toppings | Slide-up thermal receipt tray with tear edges | Spice flame meter, neon category pill rail, tear receipt |
| **`tmpl_trattoria_bella`** (Osteria Rustica) | Sequential Italian course flow | Wood-fired hearth hearthside narrative | Framed rustic parchment cards with DOP/IGP seals | Family feasting "Tavola Grande" combo selector | Classic leather folio check presenter | DOP seal badge, course sequence separator, family combo |
| **`tmpl_tokyo_izakaya`** (Shokunin Ramen) | Shoji screen slat grid | Calligraphic woodblock brand header | Hinoki cedar slat cards with skewer tare notes | Interactive 4-step craft ramen order slip modal | Lacquered bento box bill tray | 4-step craft ramen slip, cedar slat grid, robata toggle |

---

## 4. Cross-Theme Implementation Rules & Governance

1. **Authoritative Data Grounding:** Every theme binds strictly to `item.modifierGroups` and verifies totals via `/api/restaurant/quote`. Themes must never invent fictitious upcharges or fake delivery timers.
2. **Iconography Standard:** Zero emojis across all six themes. All iconography rendered as inline vector SVGs via [`packages/ui/icons.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/projects/external-os/restaurant-os/packages/ui/icons.ts).
3. **Currency Guarantee:** All prices formatted from integer paise (`basePriceMinor`) using locale currency symbols (`₹380.00`).
