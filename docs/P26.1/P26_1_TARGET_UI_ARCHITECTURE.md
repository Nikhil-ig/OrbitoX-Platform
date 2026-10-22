# P26.1 Architectural Specification: Target UI Architecture & Creative Command Center

## 1. System Philosophy

The goal of OrbitoX P26.1 is to eliminate "internal-tool-style" panels and replace them with a cohesive, world-class desktop creative experience. The creator must feel effortless empowerment:
- The **`+ Add` button** becomes the single universal command center.
- **Importing** becomes a frictionless 3-step intake: Drop → Understand → Bring it in.
- **Templates** become a live, interactive multi-device marketplace.
- **The Right-Click Menu** becomes the core spatial navigation system.
- **The Inspector** provides immediate, visual physical controls (interactive Box Model and Corner Radius).

---

## 2. The Universal `+ Add` Command Center

Clicking the `+` button in the rail or pressing `A` opens the **Universal Add Command Center**:

```
┌────────────────────────────────────────────────────────────────────────┐
│  + ADD                                                   [ ⌘K / Esc ]  │
│  🔍 Search anything… (e.g. "Hero", "Button", "Pricing", "Font")       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [ ELEMENTS ]     [ LAYOUT ]        [ SECTIONS ]     [ COMPONENTS ]    │
│  • Heading        • Frame (Auto)    • Hero           • My Components   │
│  • Paragraph      • Stack (H/V)     • Features       • Team Library    │
│  • Image          • Grid (2-4 Col)  • Pricing        • OrbitoX Curated │
│  • Video          • Container       • Testimonials                     │
│  • Button                           • FAQ                              │
│  • Icon                             • CTA                              │
│  • Shape (Vector)                   • Footer                           │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [ ASSETS ]       [ TEMPLATES ]     [ AI GENERATOR ] [ INTAKE / DROP ] │
│  • Upload Media   • Full Websites   • Generate Page  • Drop Files Here │
│  • Image Library  • Section Packs   • Remix Section  • Paste URL       │
│  • Videos & Audio • Themes & Tokens • Improve Copy   • Figma Bridge    │
│  • Custom Fonts                                                        │
│  • 3D GLB Models                                                       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```
**Benefits**: No hunting between 6 different drawers. Everything that can be added to an OrbitoX project is accessible in one organized, searchable space.

---

## 3. The 3-Step Creative Intake Experience

### Step 1 — Drop
A minimalist, welcoming intake surface:
```
┌────────────────────────────────────────────────────────────────────────┐
│                      Bring anything into OrbitoX                       │
│                                                                        │
│                          ┌──────────────────┐                          │
│                          │        ☁         │                          │
│                          │  Drag a file here│                          │
│                          │  or choose file  │                          │
│                          └──────────────────┘                          │
│                                                                        │
│            HTML  •  ZIP  •  Figma  •  SVG  •  PDF  •  Media            │
│            Shopify Theme  •  WordPress Block Theme                     │
│                                                                        │
│           ─── or paste a public website URL below ───                  │
│           [ https://example.com/                     ] [ Analyze ]     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Step 2 — Understand
OrbitoX analyzes the input and displays a clear, human-readable summary:
```
┌────────────────────────────────────────────────────────────────────────┐
│  ✓ Website Structure Detected                                          │
├────────────────────────────────────────────────────────────────────────┤
│  Structure:      8 Pages • 42 Sections • 218 Elements                  │
│  Components:     16 Reusable Components (FeatureCard × 12, etc.)       │
│  Assets:         38 Images • 4 Custom Fonts (Inter, Cinzel)            │
│  Design System:  12 Color Tokens • 4 Spacing Presets                   │
│  Interactivity:  9 Scroll Interactions • 2 Hover Effects               │
│                                                                        │
│  Fidelity Score: 96% Native Editable  [Why? ▶]                         │
│  ⚠ 2 Custom Scripts isolated in secure sandboxes                       │
└────────────────────────────────────────────────────────────────────────┘
```

### Step 3 — Bring It In
Explicit destination choices:
```
┌────────────────────────────────────────────────────────────────────────┐
│  Where should OrbitoX place this content?                              │
│                                                                        │
│  [ 📑 Add to Current Page ]       [ 📄 Add as New Page(s) ]            │
│  Appends sections below active    Creates separate routes in project   │
│                                                                        │
│  [ 🚀 Create New Project ]        [ 🔄 Replace Selected Section ]      │
│  Starts clean project in workspace Replaces active target node         │
│                                                                        │
│  [ Import into Studio ]                                                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Visual Inspector Architecture

### 4.1 Progressive Disclosure Tiers
The Inspector reorganizes into clear progressive tiers:
1. **Essentials**: High-level semantic properties (Label, Image Source, Variant, Alignment).
2. **Design**: Colors, Typography tokens, Fills, Borders, Shadows.
3. **Layout**: Interactive Box Model (Margin/Padding), Auto Layout, Flow direction, Gap.
4. **Responsive**: Breakpoint overrides (Desktop / Tablet / Mobile).
5. **Motion & Effects**: Trigger → Target → Action → Timeline, Glassmorphism, 3D Depth.
6. **Data & CMS**: Dynamic collection field binding, Repeaters.
7. **Advanced (Expert Mode)**: Source mapping trace, Custom CSS, Accessibility aria roles.

### 4.2 Interactive Box Model Diagram
- Rendered using responsive SVG with active highlighted input fields for Margin (outer), Padding (inner), and Content dimensions (center pill).
- Supports link/unlink, unit switching (`px`, `%`, `rem`), and instant canvas re-render.

### 4.3 Corner Radius Diagram & Presets
- Interactive rounded rect preview with 4 corner hotspots.
- One-click presets: `None (0px)`, `Small (4px)`, `Medium (8px)`, `Large (16px)`, `Pill (9999px)`.
