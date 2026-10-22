# P26.1 Forensic Audit: Template UX & Destructive Mutation Analysis

## 1. Executive Summary

The current Template experience in OrbitoX (`TemplatePanel.tsx`, `TemplateBrowserModal.tsx`, and `StudioShell.tsx`) is designed like an internal configuration selector rather than a modern creative marketplace. 

Key architectural and UX violations:
1. **The 320px Dense Text Drawer**: `TemplatePanel.tsx` renders a cramped 320px sidebar with tiny text cards, category pills, and 70px miniature gradient banners that convey zero real layout structure.
2. **The Destructive "Apply" Action**: Line 226 of `TemplatePanel.tsx` and lines 963 / 1319 of `StudioShell.tsx` wire clicking any card directly to `handleReplaceSite`. This immediately obliterates the creator's existing canvas without confirmation, section extraction, or variant branching.
3. **Static Card Previews vs. Live Interactive Experiential Previews**: Templates are represented by static CSS gradients rather than live, interactive, scrollable multi-device preview viewports.
4. **Lack of Template Architecture Breakdown**: Templates do not expose their constituent pages, sections, components, design tokens, motion timelines, or CMS collections prior to ingestion.

---

## 2. Codebase Investigation & Line-by-Line Evidence

### 2.1 File: `orbitox/apps/celebrations/components/studio-zero/TemplatePanel.tsx`
- **Line 47**: `width: '320px'` creates an overly constrained layout where templates cannot be visually distinguished.
- **Lines 194–203**:
  ```tsx
  <div style={{ height: '70px', background: t.previewGradient, padding: '10px' }}>
    <span>{t.category}</span>
    <span>{t.name}</span>
  </div>
  ```
  The preview is a synthetic CSS linear gradient with no rendered DOM nodes, images, or interactive elements.
- **Lines 225–228**:
  ```tsx
  <span style={{ fontSize: '0.7rem', color: '#3B82F6', fontWeight: 600 }}>
    <span>Apply</span>
    <ArrowRight size={11} />
  </span>
  ```
  The call-to-action is labeled "Apply" inside a tiny footer. Clicking anywhere on the card invokes `onSelectTemplate(t)`, which is wired directly to site replacement.

### 2.2 File: `orbitox/apps/celebrations/components/studio-zero/StudioShell.tsx`
- **Line 963**:
  ```tsx
  {!isFullscreen && activeRailTab === 'templates' && (
    <TemplatePanel
      onClose={() => setActiveRailTab(null)}
      onSelectTemplate={handleReplaceSite}
      onOpenFullBrowser={() => setIsTemplateBrowserOpen(true)}
    />
  )}
  ```
- **Line 1319**:
  ```tsx
  <TemplateBrowserModal
    isOpen={isTemplateBrowserOpen}
    onClose={() => setIsTemplateBrowserOpen(false)}
    onSelectTemplate={handleReplaceSite}
    onReplaceSite={handleReplaceSite}
    onAddTemplateSection={handleAddTemplateSection}
    onApplyTemplateTheme={handleApplyTemplateTheme}
  />
  ```
- **Consequence**: In `TemplatePanel.tsx`, there are no options to "Add Section", "Add as New Page", "Create Project Variant", or "Preview Live". A misclick instantly wipes all authoring work on the active page.

---

## 3. Comparison with Industry Leaders

### 3.1 Shopify Theme Architecture
Shopify themes do not treat pages as flat templates. Shopify explicitly structures themes into:
- **Layout** (global wrapper, header/footer)
- **Templates** (JSON configuration files defining page structure)
- **Sections** (rearrangable layout blocks that can be added, moved, and removed)
- **Blocks** (nested components within sections)
- **Theme Settings** (global tokens for typography, colors, borders)
Merchants never accidentally wipe their store when exploring a theme; they preview it as an unpublished theme or insert specific sections into their active page.

### 3.2 Framer Visual Marketplace
Framer's template browser provides:
- Large cinematic preview cards (16:9 aspect ratio or full viewport modals)
- Live interactive iframe previews with desktop, tablet, and mobile viewport switchers
- Interactive hover effects and scroll simulations
- Detailed breakdown: Number of pages, CMS collections included, custom interactions, designer attribution
- Primary action: "Use Template" which opens a modal offering project creation or section insertion.

### 3.3 Canva & Webflow
Canva allows clicking any template page to "Add as new page" or "Replace current page". Webflow treats templates as independent project clones or reusable layout packs.

---

## 4. Architectural Flaws & Root Causes

1. **Monolithic Project Replacement Model**: The early architecture treated a template as an atomic immutable snapshot (`StudioTemplateMeta`) rather than a structured catalog of composable entities (Theme + Pages + Sections + Components + CMS Records + Motion Timelines).
2. **Missing Template Detail Sheet / Inspector**: There is no intermediate detail inspection view where a creator can audit what assets, fonts, and scripts a template introduces before committing.
3. **Absence of Sandboxed Preview Runtime**: Studio Zero lacked a lightweight sandboxed preview engine capable of rendering a template without modifying the active editor state.

---

## 5. Target Architecture for P26.1

### 5.1 Visual Marketplace & Gallery Layout
- Expanded gallery view with large, rich thumbnail cards featuring real rendered snapshots and interactive hover video/motion loops.
- Industry categories: `All`, `SaaS`, `Portfolio`, `Ecommerce`, `Agency`, `Wedding`, `Event`, `3D & Immersive`, `B2B Enterprise`.

### 5.2 Interactive Live Multi-Device Preview
- Hovering or clicking a template opens a live interactive preview modal with:
  - Device toggles: **Desktop (1440px)**, **Tablet (768px)**, **Mobile (375px)**
  - Fully interactive scroll, hover micro-interactions, responsive fluid resizing, and motion effect playback.

### 5.3 Rich Template Detail Specification
Every template must declare a comprehensive capability manifest:
```typescript
interface TemplateDetailModel {
  id: string;
  name: string;
  category: string;
  industry: string;
  pagesCount: number;
  sectionsCount: number;
  componentsCount: number;
  theme: {
    name: string;
    colors: string[];
    typography: { heading: string; body: string };
  };
  motion: {
    interactionCount: number;
    hasParallax: boolean;
    has3DScene: boolean;
  };
  cms: {
    hasCollections: boolean;
    collectionNames: string[];
  };
  compliance: {
    licenseTier: 'MIT' | 'Commercial' | 'Enterprise';
    verifiedDigitalSignature: boolean;
  };
}
```

### 5.4 Non-Destructive Action Set
Never render a single destructive "Apply" button. The creator must be presented with unambiguous options:
1. **Use as New Project** (Opens clean project in workspace)
2. **Add Section to Active Page** (Extracts hero, features, or CTA into current layout)
3. **Add as New Page** (Adds `/about`, `/pricing`, etc. to current project)
4. **Create Variant Branch** (Duplicates current project and applies template theme)
5. **Save to Library** (Stores template in "My Team / My Library" for reusable drag-and-drop)
6. **Replace Current Site** (Dangerous action requiring explicit confirmation modal with automatic snapshot recovery)
