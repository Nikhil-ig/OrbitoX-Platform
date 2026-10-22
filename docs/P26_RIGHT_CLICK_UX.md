# 🪐 OrbitoX P26 — Professional Right-Click Context Menu Architecture & UX
**Document ID:** `docs/P26_RIGHT_CLICK_UX.md`  
**Phase:** P26 Phase 0 (Creative Interaction Systems)  
**Status:** CANONICAL SPECIFICATION  
**Author:** Figma-Class Canvas Engineer & Principal Creative UX Architect  
**Date:** October 2026  

---

## 1. Executive Summary & Design Principle

> **"Right-click is not optional. It is the primary speed mechanism of professional creative software."**

In Figma, Webflow, and Adobe creative tools, designers rely heavily on the contextual right-click menu for 60%+ of their repetitive operations (Duplicate, Group, Copy Styles, Lock, Layer Navigation).

Currently, OrbitoX Studio Zero has **0% right-click context menu coverage**—right-clicking opens the native browser menu (`Back`, `Forward`, `Inspect`).

This document defines the complete architectural design, interaction states, visual layout, keyboard navigation, and command dispatching mechanics for the **OrbitoX Context Menu System**.

---

## 2. Global Context Resolution Architecture

When a `contextmenu` event fires anywhere in the application:

```typescript
export interface ContextMenuTarget {
  type: 'canvas' | 'node' | 'multi_node' | 'section' | 'page' | 'asset' | 'component_instance';
  sceneId: string;
  nodeId?: string;
  nodeIds?: string[];
  sectionId?: string;
  pageId?: string;
  assetId?: string;
  clientPosition: { x: number; y: number };
  scenePosition: { x: number; y: number };
}
```

```
User Right-Clicks (Event: contextmenu)
      │
      ▼
preventDefault() & stopPropagation()
      │
      ▼
CanvasCoordinates Hit Test ──► Identifies Topmost Node & Full Ancestor Stack
      │
      ▼
Resolve Context:
├── Single Node Selected  ──► Element Context Menu + Nested Layer Submenu
├── Multiple Nodes        ──► Multi-Selection Context Menu
├── Canvas Background     ──► Canvas Background Context Menu
├── Section Header/Edge   ──► Section Context Menu
├── Page Tab in Rail      ──► Page Context Menu
└── Media Drawer Item     ──► Asset Context Menu
      │
      ▼
Viewport Boundary Clamp (Flips menu if near screen edge)
      │
      ▼
Render High-Fidelity Glassmorphism Context Menu
```

---

## 3. Comprehensive Menu Specifications

### 3.1 Canvas Background Right-Click Menu
Triggered when right-clicking on empty canvas backdrop or artboard canvas padding:

```
┌──────────────────────────────────────────────┐
│  Paste                                ⌘V     │
│  Paste Here                       ⌥⇧⌘V     │
├──────────────────────────────────────────────┤
│  Select All                           ⌘A     │
│  Add Section Block                     A     │
├──────────────────────────────────────────────┤
│  Zoom to Fit (100%)                   ⌘0     │
│  Zoom to Selection                    ⌘2     │
│  Reset Pan                                   │
├──────────────────────────────────────────────┤
│  ✓ Show Smart Guides                         │
│  ✓ Show Rulers                        ⇧R     │
│    Show Layout Grid                   ⌃G     │
└──────────────────────────────────────────────┘
```

### 3.2 Single Element / Node Right-Click Menu
Triggered when right-clicking an element on canvas or in the layer panel:

```
┌──────────────────────────────────────────────┐
│  Cut                                  ⌘X     │
│  Copy                                 ⌘C     │
│  Copy as Code                  ▶             │ ──► [JSX / React, HTML / CSS, SVG Vector, JSON AST]
│  Paste                                ⌘V     │
│  Paste to Replace                     ⌥⌘V    │
├──────────────────────────────────────────────┤
│  Duplicate                            ⌘D     │
│  Delete                            ⌫ / Del   │
├──────────────────────────────────────────────┤
│  Select Layer                  ▶             │ ──► [Deep Ancestor & Child Stack (Section 4)]
├──────────────────────────────────────────────┤
│  Wrap in Frame / Stack                ⌥⌘G    │
│  Group Selection                      ⌘G     │
│  Create Component                     ⌥⌘K    │
│  Convert to Section                          │
├──────────────────────────────────────────────┤
│  Bring to Front                       ]      │
│  Bring Forward                        ⌘]     │
│  Send Backward                        ⌘[     │
│  Send to Back                         [      │
├──────────────────────────────────────────────┤
│  Copy Styles                          ⌥⌘C    │
│  Paste Styles                         ⌥⌘V    │
├──────────────────────────────────────────────┤
│  Lock / Unlock                        ⌘L     │
│  Hide / Show                          ⌘⇧H    │
│  Rename Layer                         ⏎      │
└──────────────────────────────────────────────┘
```

### 3.3 Component Instance Right-Click Menu
Triggered when right-clicking an instance of a Master Component:

```
┌──────────────────────────────────────────────┐
│  Go to Master Component               ⌥⌘O    │
│  Push Overrides to Master                    │
│  Reset All Overrides                         │
│  Detach Instance                      ⌥⌘B    │
├──────────────────────────────────────────────┤
│  (Standard Node Actions: Copy, Duplicate...) │
└──────────────────────────────────────────────┘
```

### 3.4 Section Right-Click Menu
Triggered when right-clicking section header, divider, or section layer item:

```
┌──────────────────────────────────────────────┐
│  Duplicate Section                    ⌘D     │
│  Save Section as Template                    │
│  Move Section Up                      ⌥↑     │
│  Move Section Down                    ⌥↓     │
│  Swap Section Preset                         │
├──────────────────────────────────────────────┤
│  Section Background & Padding...             │
│  Delete Section                              │
└──────────────────────────────────────────────┘
```

### 3.5 Page Right-Click Menu
Triggered when right-clicking page tab in the Left Rail:

```
┌──────────────────────────────────────────────┐
│  Rename Page                          ⏎      │
│  Duplicate Page                       ⌘D     │
│  Set as Home Page (/)                        │
│  Page SEO & OpenGraph Settings               │
├──────────────────────────────────────────────┤
│  Delete Page                                 │
└──────────────────────────────────────────────┘
```

### 3.6 Multi-Selection Right-Click Menu
Triggered when 2 or more elements are selected:

```
┌──────────────────────────────────────────────┐
│  Group Selection                      ⌘G     │
│  Wrap in Auto-Layout Stack            ⌥⇧A    │
├──────────────────────────────────────────────┤
│  Align Left                           ⌥A     │
│  Align Center                         ⌥H     │
│  Align Right                          ⌥D     │
│  Align Top                            ⌥W     │
│  Align Middle                         ⌥V     │
│  Align Bottom                         ⌥S     │
├──────────────────────────────────────────────┤
│  Distribute Horizontally              ⌃⌥H    │
│  Distribute Vertically                ⌃⌥V    │
├──────────────────────────────────────────────┤
│  Delete Selected Nodes                ⌫      │
└──────────────────────────────────────────────┘
```

---

## 4. Deep Drill-Down: "Select Layer" Submenu

One of the most frustrating aspects of canvas design is trying to select a nested child or an obscured parent when elements overlap.

The **Select Layer Submenu** queries the mathematical coordinate stack at the right-click point and renders the hierarchical lineage:

```
Select Layer ▶
  ┌────────────────────────────────────────────────────────┐
  │  ◈ Hero Section (Section)                              │
  │    ↳ ⬒ Content Stack (Flex Column)                     │
  │        ↳ ⬒ Card Container (Stack)                      │
  │            ↳ 🗚 "Celestial Gala Headline" (Text)  ✓   │
  │            ↳ ⬕ "RSVP Button" (Button)                  │
  │            ↳ 🖼 "Event Banner" (Image)                  │
  └────────────────────────────────────────────────────────┘
```
Clicking any item in this submenu immediately selects that exact node on the canvas and in the inspector.

---

## 5. Visual Styling & Keyboard Accessibility

### 5.1 Glassmorphism Design System
- **Background:** `rgba(15, 23, 42, 0.88)` with `backdrop-filter: blur(20px) saturate(180%)`.
- **Border:** `1px solid rgba(255, 255, 255, 0.12)`.
- **Shadow:** `0 20px 40px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)`.
- **Border Radius:** `10px`.
- **Typography:** `Inter`, `12.5px`, font weight 450, color `#E2E8F0`.
- **Hover State:** `background: #3B82F6; color: #FFFFFF; border-radius: 6px;`.
- **Shortcut Badge:** `color: rgba(255, 255, 255, 0.45); font-size: 11px; font-mono`.

### 5.2 Viewport Boundary Collision Detection
The context menu measures its width ($220\text{px}$) and height ($280\text{px}$) against `window.innerWidth` and `window.innerHeight`.
- If $x + \text{width} > \text{innerWidth}$, flip to open to the left ($x - \text{width}$).
- If $y + \text{height} > \text{innerHeight}$, flip to open upwards ($y - \text{height}$).

### 5.3 Keyboard Navigation
- `ArrowDown` / `ArrowUp`: Traverse menu items.
- `ArrowRight`: Open active submenu.
- `ArrowLeft`: Close submenu.
- `Enter` / `Space`: Execute selected command.
- `Escape`: Close context menu.

---

## 6. Real Command Dispatch Pipeline

The context menu is not a cosmetic mockup. Every action directly emits typed commands into `TemplateEditorStore`:

```typescript
const handleMenuAction = (action: ContextMenuAction) => {
  switch (action) {
    case 'DUPLICATE':
      dispatch({ type: 'SG_DUPLICATE_NODE', sceneId, nodeId: targetNodeId });
      break;
    case 'DELETE':
      dispatch({ type: 'SG_DELETE_NODE', sceneId, nodeId: targetNodeId });
      break;
    case 'LOCK':
      dispatch({ type: 'SG_LOCK_NODE', sceneId, nodeId: targetNodeId, locked: !node.locked });
      break;
    case 'GROUP':
      dispatch({ type: 'SG_GROUP_NODES', sceneId, nodeIds: selectedNodeIds });
      break;
    case 'CREATE_COMPONENT':
      dispatch({ type: 'SG_CREATE_COMPONENT', sceneId, nodeId: targetNodeId });
      break;
    // ... all other actions directly wired
  }
  closeMenu();
};
```

*This concludes the Right-Click UX Architecture. Proceed to `docs/P26_CLIPBOARD_ARCHITECTURE.md`.*
