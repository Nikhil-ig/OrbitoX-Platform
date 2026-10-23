# P26.1 Forensic Audit: Right-Click Context Menu & Navigation System

## 1. Executive Summary

In professional creative tools (Figma, Framer, Webflow, Sketch), the **right-click context menu** is not a minor shortcut—it is the central nervous system of canvas navigation, layer manipulation, component lifecycle, and clipboard operations.

While Phase P26 introduced `CanvasContextMenu.tsx` and `ContextMenuManager.tsx` with core support for `canvas`, `node`, `multi_node`, and `section` targets, a comprehensive audit reveals critical functional and contextual gaps:
1. **Lack of Node-Specific Specialization**: Right-clicking an `image` node displays generic element options rather than rich media operations (`Replace Asset`, `Crop`, `Fit/Fill`, `Aspect Ratio`).
2. **Missing Nested Layer Drill-Down ("Select Layer >")**: In complex nested hierarchies (e.g. a `text` node inside a `button` inside a `card` inside a `hero`), right-clicking does not provide a hierarchical breadcrumb menu allowing the creator to immediately jump selection to ancestor containers.
3. **Incomplete Empty Canvas Command Set**: Right-clicking the canvas lacks quick-creation shortcuts (`Create Frame`, `Create Section`, `Guides & Snapping toggles`, `Import from Clipboard`).
4. **Missing Multi-Selection Spatial Operations**: Multi-selection lacks `Distribute Spacing`, `Frame Selection`, and `Animate Together`.

---

## 2. Current Implementation Audit

### 2.1 File: `orbitox/apps/celebrations/components/template-studio/components/context-menu/CanvasContextMenu.tsx`
- **Total Lines**: 737 lines
- **Handled Context Types**:
  ```typescript
  export type ContextMenuType = 'canvas' | 'node' | 'multi_node' | 'section';
  ```
- **Strengths Present**:
  - Full keyboard navigation (Up/Down arrow keys, Enter, Escape, space).
  - Submenu support (`activeSubmenu === 'align'`, `'arrange'`, `'copy_as'`).
  - Command dispatch integration via `TemplateEditorCommand`.
- **Gaps Identified**:
  - **No Media-Specific Branches**: When `node.kind === 'image'`, there is no `Replace → Asset | Upload | URL` or `Object Fit: Cover / Contain / Fill` submenu.
  - **No Ancestor Hierarchy Selector**: If a creator clicks a deeply nested label, they have to manually hunt in `LayersPanel.tsx` to select the parent card.
  - **No Section Reordering Commands**: Right-clicking a section currently lacks `Move to Top`, `Move to Bottom`, `Insert Section Above`, or `Insert Section Below`.
  - **Multi-Selection Lacks Grouping Primitives**: Cannot `Group into Frame` or `Distribute Evenly (H/V)` directly from the context menu.

### 2.2 Hit-Testing & Layer Selection Heuristics
- `SceneGraphHitTester.ts` performs bounding-box checks with z-index ordering.
- If overlapping elements share the exact same bounding box (e.g. an invisible hit-area overlay or transparent frame), the hit-tester resolves the topmost child, but provides no contextual menu allowing the user to select the parent frame.

---

## 3. Required Context Menu Taxonomy for P26.1

### 3.1 Empty Canvas Context Menu
```
┌───────────────────────────────────────┐
│ Paste Here                   ⌘V       │
│ Paste Special                ⇧⌘V      │
├───────────────────────────────────────┤
│ Add Element                  ▶        │
│ Add Layout (Frame / Grid)    ▶        │
│ Add Section                  ▶        │
│ Add Component                ▶        │
│ Add 3D / Immersive Scene              │
├───────────────────────────────────────┤
│ Create Section Here                   │
│ Create Frame                          │
├───────────────────────────────────────┤
│ Select All                   ⌘A       │
│ Zoom to Fit                  ⇧1       │
├───────────────────────────────────────┤
│ Canvas Grid & Guides         ▶        │
│ Snap to Objects              ✓        │
├───────────────────────────────────────┤
│ Import into Project…         ⌘I       │
└───────────────────────────────────────┘
```

### 3.2 Image & Media Node Context Menu
```
┌───────────────────────────────────────┐
│ Copy                         ⌘C       │
│ Cut                          ⌘X       │
│ Duplicate                    ⌘D       │
│ Delete                       ⌫        │
├───────────────────────────────────────┤
│ Replace                      ▶        │
│   ├─ From Asset Library…              │
│   ├─ Upload File…                     │
│   └─ From Image URL…                  │
│ Fit & Fill                   ▶        │
│   ├─ Cover (Fill Frame)               │
│   ├─ Contain (Letterbox)              │
│   └─ Reset Natural Aspect Ratio       │
│ Crop Image                            │
├───────────────────────────────────────┤
│ Select Layer                 ▶        │
│   ├─ Heading "Build Future"           │
│   ├─ Content Frame                    │
│   └─ Hero Section                     │
├───────────────────────────────────────┤
│ Arrange                      ▶        │
│ Align                        ▶        │
├───────────────────────────────────────┤
│ Create Component             ⌥⌘K      │
│ Lock                         ⌘L       │
│ Hide                         ⌘H       │
├───────────────────────────────────────┤
│ Add Motion Animation                  │
│ Add Interactive Trigger               │
│ Add Visual Effect (Glow/Blur)         │
├───────────────────────────────────────┤
│ Copy Style                   ⌥⌘C      │
│ Paste Style                  ⌥⌘V      │
│ Copy Properties                       │
│ Paste Properties                      │
├───────────────────────────────────────┤
│ AI Assistant                 ▶        │
│   ├─ Upscale Image (2x/4x)            │
│   ├─ Remove Background                │
│   └─ Generate Alt Variant             │
├───────────────────────────────────────┤
│ Export Asset                 ⇧⌘E      │
│ Inspect in Properties Panel           │
└───────────────────────────────────────┘
```

### 3.3 Section Context Menu
```
┌───────────────────────────────────────┐
│ Rename Section                        │
│ Duplicate Section            ⌘D       │
├───────────────────────────────────────┤
│ Move Up                      ⌥↑       │
│ Move Down                    ⌥↓       │
│ Move to Top                           │
│ Move to Bottom                        │
├───────────────────────────────────────┤
│ Insert Section Above                  │
│ Insert Section Below                  │
├───────────────────────────────────────┤
│ Save as Reusable Section              │
│ Create Master Component               │
│ Detach / Unlink                       │
├───────────────────────────────────────┤
│ Hide Section                          │
│ Lock Section                          │
├───────────────────────────────────────┤
│ Motion & Scroll Effects               │
│ Responsive Behavior                   │
│ AI Remix Section                      │
├───────────────────────────────────────┤
│ Copy Section                 ⌘C       │
│ Paste Below                  ⌘V       │
│ Delete Section               ⌫        │
└───────────────────────────────────────┘
```

### 3.4 Multi-Selection Context Menu
```
┌───────────────────────────────────────┐
│ Copy Selection               ⌘C       │
│ Duplicate Selection          ⌘D       │
│ Delete Selection             ⌫        │
├───────────────────────────────────────┤
│ Group Selection              ⌘G       │
│ Frame Selection              ⌥⌘G      │
│ Create Component             ⌥⌘K      │
├───────────────────────────────────────┤
│ Align                        ▶        │
│ Distribute Spacing           ▶        │
│   ├─ Distribute Horizontally          │
│   ├─ Distribute Vertically            │
│   └─ Auto-Tidy Grid                   │
├───────────────────────────────────────┤
│ Arrange Order                ▶        │
│ Lock All                     ⌘L       │
│ Hide All                     ⌘H       │
├───────────────────────────────────────┤
│ Animate Together (Stagger)            │
│ Copy Combined Properties              │
│ Export Multi-Selection       ⇧⌘E      │
└───────────────────────────────────────┘
```

---

## 4. Architectural Implementation Requirements
1. **Single Command Dispatch**: Every menu item must execute via `dispatch(TemplateEditorCommand)` to ensure full undo/redo transaction safety.
2. **Context Target Resolution**: The context menu state must capture the exact targeted node, its parent chain (`targetNode.parentId`), and all selected nodes.
3. **Submenu Positioning**: Submenus must dynamically detect viewport boundaries to prevent rendering off-screen.
