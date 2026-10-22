# 🪐 OrbitoX Visual Studio — P15 Architecture Contract & Master Specification
**Document ID:** `docs/P15_ARCHITECTURE_CONTRACT.md`  
**Phase:** P15 — Universal Visual Website Studio  
**Target:** Figma-Level Simplicity + Production-Grade Website Authoring  
**Status:** **ACTIVE CONTRACT (LOCKED)**

---

## 1. Executive Direction & Product Model

OrbitoX Visual Studio elevates the SceneGraph authoring engine from a celebration-specific template editor into a **Universal Visual Website Studio**.

Instead of building fragmented visual editors for each vertical (weddings, ecommerce, restaurants, hotels, SaaS landing pages), OrbitoX defines **one core visual engine** (`@orbitox/visual-engine`) upon which vertical product suites register modular domain extensions.

```
                    ORBITOX VISUAL ENGINE (@orbitox/visual-engine)
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │                                           │
          Universal Website Engine                     Domain Extensions
                    │                                           │
          ┌─────────┼─────────┐                   ┌─────────────┼─────────────┐
          │         │         │                   │             │             │
        Layout    Style     Logic             Celebrations  Ecommerce  Restaurant
      (Auto/Free) (Tokens) (Data/CMS)           (Weddings)   (Products)   (Menus)
```

---

## 2. Core Architectural Invariants (Preserved from P14)

1. **SceneGraph is the Exclusive Source of Truth**:
   ```
   OrbitoX Visual Studio
         │
         ▼ (Dispatches Atomic Commands)
   SceneGraph (Normalized JSON AST)
         │
         ▼ (Resolves Tokens, Media, CMS Data, Responsive Art Direction)
   Resolved SceneGraph Document
         │
         ▼
   UnifiedSceneRenderer
         │
         ▼
   Browser Pixels (Zero Shadow Layouts, Zero React JSX Hardcodes)
   ```
2. **Tri-Modal Governance**:
   * **`GRAPH_NATIVE` (100% of standard catalog)**: 100% owned by declarative SceneGraph.
   * **`HYBRID` (WebGL shaders / procedural canvas only)**: SceneGraph owns frame boundary, layout slot, geometry, z-index, responsive sizing; procedural canvas strictly contained inside leaf node.
   * **`LEGACY`**: Formally deprecated and eradicated in P14 (0 legacy scenes permitted).
3. **Command & History Pipeline**: Every visual and structural mutation passes through `TemplateEditorCommands` / `SceneGraphEngine` with linear undo/redo stacks.

---

## 3. The Golden UX Principle: Progressive Disclosure

The studio interface must never expose 200 controls simultaneously. The workflow is strictly:

```
See something  ──►  Click it  ──►  Change it  ──►  See result instantly
```

### Contextual Inspector Matrix

| Selected Item | Visible Controls in Inspector | Collapsed / Advanced ("More") |
|---|---|---|
| **Nothing (Canvas / Page)** | Page Title, Slug, Background Color, Global Tokens Quick-Tweak | Meta tags, SEO, Custom Head/Body Scripts |
| **Text / Heading** | Content text, Font family, Size, Weight, Line Height, Alignment, Color | Letter spacing, text transform, shadows, clipping |
| **Image / Media** | Image source URL/upload, Fit (Cover/Contain), Corner radius, Position, Crop | Aspect ratio locks, focal points, filters, opacity |
| **Section / Container** | Layout mode (Auto Stack/Grid vs Freeform), Width, Padding, Gap, Background | Min/Max bounds, overflow clipping, custom CSS attributes |
| **Button / CTA** | Label text, Click Action (URL/Modal/Submit), Button Variant, Padding | Icon slot, hover transition states, tracking tags |
| **Master Component** | Component Name, Variant selector, Exposed Properties list | Slot rules, detach component, variant definitions |
| **Component Instance** | Master Component Link, Variant Picker, Overrides Reset | Detach Instance (breaks link back to normal nodes) |
| **Prototype Mode (Any)** | Interaction Trigger (`onTap`, `onHover`, `onScroll`), Action, Target | Easing curves, condition rules, duration ms |

---

## 4. Application UI Structure (Minimal 4-Quadrant Architecture)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🪐 OrbitoX   Acme Landing Page          Design  |  Prototype         [ Desktop | Tablet | Mobile ]    │
│              ↶ Undo  ↷ Redo                                               ● Saved   [ Preview ]  [ Publish ] │
├──────────────┬──────────────────────────────────────────────────────────────────────────┬──────────────┤
│ ＋ Add       │                                                                          │  CONTEXTUAL  │
│ ≡ Layers     │                                                                          │  INSPECTOR   │
│ ▤ Pages      │                              CANVAS WORKSPACE                            │  (Relevant   │
│ ⊞ Assets     │                                                                          │   controls   │
│ ◇ Components │                                                                          │   only)      │
│              │                                                                          │              │
└──────────────┴──────────────────────────────────────────────────────────────────────────┴──────────────┘
```

### 1. Minimal Top Bar
* **Left**: OrbitoX Brandmark, Project Title (inline editable), Undo / Redo buttons.
* **Center**: Mode Tabs (`Design` | `Prototype`), Viewport Switcher (`Desktop` 1440px | `Tablet` 768px | `Mobile` 390px).
* **Right**: Real-time Save status (`● Saved`), `Preview` modal launcher, `Publish` deployment button.

### 2. Left Rail (5 Items Only)
1. **`+ Add`**: Unified searchable insert palette categorized into:
   * **Layout**: Frame, Container, Stack, Grid, Section
   * **Content**: Text, Heading, Image, Video, Icon, Shape, Button
   * **Web Blocks**: Navbar, Hero, Split Hero, Video Hero, Features, Pricing, Testimonials, FAQ, CTA, Footer
   * **Data**: Collection, Repeater
   * **Domain Extensions**: Celebrations (`Portrait`, `Couple`, `RSVP`, `Countdown`, `Story`, `Shagun`, `Wishes`), Ecommerce (`ProductGrid`, `CartButton`), etc.
2. **`Layers`**: Clean hierarchical tree with drag-and-drop reordering, nesting, renaming, visibility toggle, lock toggle, and bidirectional canvas selection.
3. **`Pages`**: Multi-page website management (Home, About, Pricing, Contact) with route paths and SEO settings.
4. **`Assets`**: Media manager for uploaded photography, icons, audio, and illustrations.
5. **`Components`**: Master component library with 1-click instantiation and variant management.

### 3. Star Center Canvas
* Dominant visual workspace with device viewport frames (Desktop 1440px, Tablet 768px, Mobile 390px).
* Direct manipulation: Click to select, double-click to edit text inline, drag selection handles to resize, drag element to move/reorder, drag corner radius handles.

### 4. Contextual Right Inspector
* Adapts dynamically based on active selection (Progressive Disclosure).
* Never overwhelms the user; advanced technical settings are tucked neatly under collapsible `"More"` disclosure sections.

---

## 5. Multi-Page Website System Schema

A website in P15 is a cohesive multi-page project, not an isolated single scene:

```typescript
export interface WebsiteProject {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  activePageId: string;
  pages: WebsitePage[];
  sharedComponents: Record<string, SceneGraphNode>;
  designTokens: TemplateDesignTokens;
  assets: MediaAsset[];
  settings: WebsiteSettings;
}

export interface WebsitePage {
  id: string;
  slug: string; // e.g. "/", "/about", "/pricing"
  name: string; // e.g. "Home", "About Us", "Pricing"
  title: string; // SEO title tag
  description: string; // Meta description
  scenes: TemplateSceneDefinition[]; // Ordered sections (Navbar, Hero, Features, Pricing, Footer)
  isHomePage: boolean;
}
```

---

## 6. Pre-Built Production Web Section Blocks

The `+ Add` library provides high-conversion, beautifully designed, responsive section blocks that insert directly as **100% editable SceneGraph nodes** (zero screenshots, zero locked components):

1. **`Navbar`**: Logo slot, navigation links, primary CTA button, mobile hamburger toggle.
2. **`Hero`**: Centered grand display headline, supporting paragraph, dual CTA buttons, social proof row.
3. **`Split Hero`**: Left-side copy & actions, right-side showcase image card or interactive visual.
4. **`Video Hero`**: Atmospheric video background with dark gradient overlay and high-contrast typography.
5. **`Feature Grid`**: 3-column auto-layout grid with icon badges, bold headings, and descriptive text.
6. **`Pricing Table`**: Tier cards (Basic / Pro / Enterprise), monthly/annual billing pill switch, checkmark features, and highlighted "Most Popular" card.
7. **`Testimonials`**: Customer quote cards with 5-star ratings, author avatar, name, and company title.
8. **`FAQ Accordion`**: Stacked questions with chevron toggle interactions and expandable answer text.
9. **`CTA Banner`**: High-contrast gradient banner with newsletter input or checkout button.
10. **`Footer`**: Brand column, 3 link category columns, copyright declaration, and social icon links.

---

## 7. Command Palette (`⌘K`) Contract

Pressing `⌘K` or `Ctrl+K` summons the universal command palette, allowing users to execute actions instantly without touching the menus:
* `Insert <Block>` (e.g. `Insert Hero`, `Insert Pricing`, `Insert Navbar`)
* `Create Page` / `Go to Page <Name>`
* `Create Component` / `Detach Component`
* `Switch Viewport` (Desktop / Tablet / Mobile)
* `Switch Mode` (Design / Prototype)
* `Bind Data` / `Add Repeater`
* `Publish Website`

---

## 8. Domain Extension Registry Contract

Core visual engine remains agnostic of business domains. Domain modules register via `registerDomainExtension`:

```typescript
export interface DomainExtension {
  id: string;
  name: string;
  category: string;
  nodes: {
    kind: string;
    label: string;
    icon: string;
    defaultNode: (id: string) => Partial<SceneGraphNode>;
    adapter: NodeRendererAdapter;
  }[];
  sectionTemplates?: SectionBlockDefinition[];
}
```

`@orbitox/celebrations` registers its 9 custom nodes (`portrait`, `couple`, `countdown`, `story`, `event`, `venue`, `rsvp`, `shagun`, `guestbook`) into the universal engine without requiring forked codebases.

---

## 9. Quality Bar & Verification Standard

P15 is verified not by the quantity of inspector inputs, but by **user speed, visual fidelity, and clean mental models**:
* **Beginner speed**: A new user can create a page, insert a hero, edit text inline, adjust colors, switch to mobile, test interactions, and publish in under 3 minutes.
* **Fidelity**: Zero pixel shifts between Studio canvas preview and live published website.
* **Extensibility**: Celebrations and custom corporate websites run on the exact same engine.
