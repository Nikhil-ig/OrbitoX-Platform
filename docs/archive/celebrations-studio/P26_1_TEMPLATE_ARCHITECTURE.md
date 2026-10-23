# P26.1 Architectural Specification: Visual Template Marketplace & Live Preview Engine

## 1. Architectural Overview

The redesigned OrbitoX Template Experience eliminates the legacy 320px text drawer and destructive single-click "Apply" button. In its place, OrbitoX establishes a **Visual Template Marketplace & Live Interactive Preview Engine** that mirrors the fidelity and safety of top-tier creative tools (Shopify Theme Store, Framer Gallery, Webflow Marketplace).

---

## 2. Visual Marketplace & Gallery Specifications

### 2.1 Visual Presentation & Thumbnails
- **Card Format**: High-density 16:9 cinematic aspect ratio preview cards.
- **Render Fidelity**: Rendered snapshots showcasing real typography, imagery, and layout grids rather than synthetic CSS color gradients.
- **Hover Micro-Interactions**: Hovering a template card plays a smooth 3-second looping video or CSS animation demonstrating entrance effects, scroll parallax, and hover responses.
- **Badges**: Clear visual badges denoting Industry, Page Count, CMS inclusion, and 3D scenes.

### 2.2 Category & Filter System
- Quick Filter Pills: `All`, `SaaS`, `Portfolio`, `Ecommerce`, `Agency`, `Wedding`, `Event`, `3D & Immersive`, `B2B Enterprise`.
- Search Bar: Real-time fuzzy search across template titles, tags, colors, and industry archetypes.

---

## 3. Interactive Live Multi-Device Preview Engine

Clicking "Preview" on any template opens the **Interactive Preview Modal**:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Celestial Odyssey — Luxury Gala Experience               [X Close]    │
│  Viewport: [ 🖥 Desktop 1440px ]  [ 📱 Tablet 768px ]  [ 📲 Mobile 375px ]│
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │                   LIVE INTERACTIVE PREVIEW IFRAME                │  │
│  │                                                                  │  │
│  │       • Fully scrollable                                         │  │
│  │       • Interactive hover states                                 │  │
│  │       • Live button clicks and navigation                        │  │
│  │       • Smooth responsive viewport resizing                      │  │
│  │       • Real-time motion and parallax playback                   │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│  8 Pages • 32 Sections • 14 Components • Inter/Plus Jakarta • CMS Ready│
│  [ Use Template ▼ ]                                                    │
│    ├─ Use as New Project (Recommended)                                 │
│    ├─ Add Section to Current Page                                      │
│    ├─ Add as New Page                                                  │
│    ├─ Create Variant Branch                                            │
│    └─ Replace Current Site (Destructive)                               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Comprehensive Template Detail Specification

Every template exposes a formal manifest:

```typescript
export interface OrbitoXTemplateManifest {
  id: string;
  name: string;
  slug: string;
  version: string;
  author: {
    name: string;
    avatarUrl?: string;
    verifiedSigner: boolean;
  };
  industry: 'saas' | 'ecommerce' | 'portfolio' | 'agency' | 'celebration' | 'enterprise';
  summary: string;
  pages: Array<{
    name: string;
    route: string;
    sectionCount: number;
    previewUrl?: string;
  }>;
  sectionsCount: number;
  componentsCount: number;
  theme: {
    name: string;
    palette: string[];
    typography: {
      headingFont: string;
      bodyFont: string;
    };
  };
  capabilities: {
    motionCount: number;
    hasParallax: boolean;
    has3DCanvas: boolean;
    hasCmsCollections: boolean;
    collectionNames?: string[];
  };
  compliance: {
    digitalSignatureEd25519: string;
    licenseTier: 'community' | 'pro' | 'enterprise';
    securityAuditPassed: boolean;
  };
}
```

---

## 5. Non-Destructive Ingestion Workflows

When the creator selects "Use Template", OrbitoX never executes a silent destructive overwrite. The user is presented with 5 explicit actions:
1. **Use as New Project**: Initializes a fresh workspace with the template while leaving the current project safely stored.
2. **Add Section to Current Page**: Opens a section selector showing all 32 template sections (e.g. Hero, Feature Grid, Pricing Table) and inserts only the chosen section at the active cursor or target position.
3. **Add as New Page**: Ingests the template's pages into the active project under distinct routes (e.g. `/showcase`, `/about-us`).
4. **Create Variant Branch**: Duplicates the active project and applies the template's typography and color scheme as a branch.
5. **Replace Current Site**: Requires explicit confirmation in a modal warning dialog and automatically creates a snapshot checkpoint in the project undo history so the previous state can be restored instantly via `Cmd+Z`.
