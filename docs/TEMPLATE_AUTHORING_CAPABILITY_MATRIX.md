# Template Authoring Capability Matrix: OrbitoX Celebrations Engine

This capability matrix provides an end-to-end verification of every SceneGraph node type, supported property, visual direct manipulation capability, inspector control, transactional command, resolver, renderer, and persistence mechanism.

---

## 1. Node & Property Capability Matrix

| Node Kind | Property | Visual Edit (Canvas) | Inspector Control | Command Dispatched | Draft Update | Resolver (`StyleResolver`) | Renderer (`SceneGraphRenderer`) | Responsive (Desktop/Tab/Mob) | Motion (Entrance/Hover) | Interaction (Click/Tap) | Data Binding (`GraphDataBinder`) | Persistence (Local/Debounced) | Undo / Redo | Verified Test |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Container / Frame** | `x, y` (Position) | Drag Move | Number Input | `SG_UPDATE_GEOMETRY` | Yes | Yes | CSS `transform` / `top,left` | Yes (Overrides) | Parallax / Drift | Click / Tap | N/A | Yes | Yes | `Freedom Test #1` |
| **Container / Frame** | `width, height` | 4-Corner Handles | Number / 'auto' / '100%' | `SG_UPDATE_GEOMETRY` | Yes | Yes | CSS `width`, `height` | Yes (Overrides) | Scale In | N/A | N/A | Yes | Yes | `Freedom Test #2` |
| **Container / Frame** | `rotation` | Rotation Handle | Slider (-180° to 180°) | `SG_UPDATE_GEOMETRY` | Yes | Yes | CSS `rotate(Xdeg)` | Yes | Hover Spin | N/A | N/A | Yes | Yes | `Freedom Test #3` |
| **Container / Frame** | `zIndex` | Reorder / Depth | Number Input | `SG_UPDATE_GEOMETRY` | Yes | Yes | CSS `zIndex` | Yes | N/A | N/A | N/A | Yes | Yes | `Freedom Test #5` |
| **Container / Frame** | `opacity` | Direct Manip | Slider (0.0 to 1.0) | `SG_UPDATE_GEOMETRY` | Yes | Yes | CSS `opacity` | Yes | Fade In/Out | N/A | N/A | Yes | Yes | `Inspector Test` |
| **Stack / Grid** | `layoutMode` (flex/grid/stack) | Canvas Guides | Segmented Toggle | `SG_SET_LAYOUT_MODE` | Yes | Yes | Flexbox / CSS Grid | Yes | Staggered Children | N/A | N/A | Yes | Yes | `AutoLayout Test` |
| **Stack / Grid** | `gap, padding` | Visual Padding Box | Dual Input (X/Y) | `SG_UPDATE_STYLE` | Yes | Yes | CSS `gap`, `padding` | Yes (Responsive) | N/A | N/A | N/A | Yes | Yes | `AutoLayout Test` |
| **Stack / Grid** | `alignment` (primary/cross) | Snap Guides | 3x3 Alignment Grid | `SG_UPDATE_LAYOUT_CONFIG` | Yes | Yes | CSS `justifyContent`, `alignItems` | Yes | N/A | N/A | N/A | Yes | Yes | `AutoLayout Test` |
| **Text / RichText** | `textContent` | Inline WYSIWYG Double-Click | Textarea / Input | `SG_UPDATE_NODE_PROPERTY` | Yes | Yes | DOM Text Node | Yes | Letter Spacing Reveal | N/A | `{{celebration.title}}` | Yes | Yes | `InlineEdit Test` |
| **Text / RichText** | `typography.fontSize` | Drag-scale font | Input (px/rem) | `SG_UPDATE_STYLE` | Yes | Yes | CSS `fontSize` | Yes (Overrides) | Text Scaling | N/A | Token Fallback | Yes | Yes | `Freedom Test #6` |
| **Text / RichText** | `typography.fontFamily` | Font Selector | Font Family Dropdown | `SG_UPDATE_STYLE` | Yes | Yes | Google Fonts / Token | Yes | N/A | N/A | `tokens.typography` | Yes | Yes | `Typography Test` |
| **Text / RichText** | `typography.letterSpacing` | Slider | Number / 'em' Input | `SG_UPDATE_STYLE` | Yes | Yes | CSS `letterSpacing` | Yes | Kinetic Drift | N/A | N/A | Yes | Yes | `Freedom Test #6` |
| **Text / RichText** | `typography.color` | Swatch Picker | Color Picker + Token List | `SG_UPDATE_STYLE` | Yes | Yes | CSS `color` | Yes | Glow Pulse | N/A | `tokens.colors` | Yes | Yes | `Style Engine Test` |
| **Image** | `src` / Media Slot | Drop Asset | URL Input + Media Uploader | `SG_UPDATE_NODE_PROPERTY` | Yes | Yes | `<img>` / `background-image` | Yes (Responsive Crop) | Ken Burns / Zoom | Click &rarr; Modal | `{{celebrants[0].image}}` | Yes | Yes | `MediaSlot Test` |
| **Image** | `crop / focalPoint` | Visual Crop Overlay | Focal Point Picker (X/Y %) | `SG_UPDATE_STYLE` | Yes | Yes | CSS `object-position` | Yes (Mobile Crop) | Zoom In | N/A | N/A | Yes | Yes | `Freedom Test #11` |
| **Image** | `maskShape` | Shape Palette | Arch / Oval / Hex / Shield | `SG_UPDATE_STYLE` | Yes | Yes | SVG ClipPath / Mask | Yes | Mask Morph | N/A | N/A | Yes | Yes | `Masking Test` |
| **Shape / Line** | `background / fill` | Swatch Pick | Solid / Gradient / Token | `SG_UPDATE_STYLE` | Yes | Yes | CSS `background` | Yes | Color Transition | N/A | `tokens.colors` | Yes | Yes | `Freedom Test #8` |
| **Shape / Line** | `border` (width/color/radius) | Border Handles | Width / Radius Sliders | `SG_UPDATE_STYLE` | Yes | Yes | CSS `border`, `borderRadius` | Yes | Glow Expansion | N/A | N/A | Yes | Yes | `Border Test` |
| **Shape / Line** | `shadow / glow` | Glow Reticle | Blur / Spread / Color Inputs | `SG_UPDATE_STYLE` | Yes | Yes | CSS `box-shadow` | Yes | Breathing Pulse | N/A | `tokens.shadows` | Yes | Yes | `Shadow Test` |
| **Person / Couple** | `partnerNames` | Double-Click | Input (Name A & B) | `SG_UPDATE_NODE_PROPERTY` | Yes | Yes | Rendered Portraits + Typography | Yes | Dual Gravitational Drift | Tap &rarr; Bio Modal | `{{celebrants[*].name}}` | Yes | Yes | `Freedom Test #1` |
| **Person / Couple** | `partnerImages` | Click &rarr; Crop | Media Slots | `SG_UPDATE_NODE_PROPERTY` | Yes | Yes | Dual Crop Portraits | Yes | Parallax Float | Tap &rarr; Vow Play | `{{celebrants[*].portrait}}` | Yes | Yes | `Freedom Test #2` |
| **Story / Milestone** | `milestones[*]` (Repeater) | Canvas Node Drag | Add / Remove Milestone List | `SG_UPDATE_NODE_PROPERTY` | Yes | Yes | Interactive Milestones | Yes | Constellation Star Drift | Click &rarr; Memory Reveal | `{{story.milestones[*]}}` | Yes | Yes | `Repeater Test` |
| **Countdown** | `targetDate` / Speed | Dial Interaction | DateTime Picker + Speed Tier | `SG_UPDATE_NODE_PROPERTY` | Yes | Yes | Chronograph Clock | Yes | Astrolabe Continuous Spin | Add to Calendar | `{{event.dateTime}}` | Yes | Yes | `Countdown Test` |
| **RSVP Form** | `formFields` (Attendance) | Drag / Reorder | Field Builder (Toggle/Text/Num) | `SG_UPDATE_NODE_PROPERTY` | Yes | Yes | Glassmorphic Form | Yes | Submission Fade | Submit &rarr; API Event | `{{rsvp.guest}}` | Yes | Yes | `RSVP Test` |
| **Atmosphere / FX** | `particleDensity / glow` | Visual Scrubbing | Intensity Slider + Mode Toggle | `SG_UPDATE_STYLE` | Yes | Yes | Canvas / WebGL Layer | Yes (Reduced Motion) | Cosmic Drift | Hover &rarr; Repel | `tokens.atmosphere` | Yes | Yes | `Visual FX Test` |
| **Group / Instance** | `isInstance` (Detach) | Multi-Select Canvas | Detach Component Button | `SG_DETACH_INSTANCE` | Yes | Yes | Converted to Normal Nodes | Yes | Detached Transitions | N/A | N/A | Yes | Yes | `Detach Test` |
| **Any Node** | `locked / hidden` | Lock/Hide Icon | Actions Bar Toggle Buttons | `SG_LOCK_NODE` / `SG_HIDE_NODE` | Yes | Yes | Canvas pointerEvents / display | Yes | Exit Animation | N/A | N/A | Yes | Yes | `Actions Test` |

---

## 2. Architectural Pipeline Guarantees

```
INSPECTOR / CANVAS DIRECT MANIPULATION
               │
               ▼ (Command Dispatch)
   TEMPLATE EDITOR COMMAND
               │
               ▼ (State Mutation)
     CANONICAL DRAFT GRAPH (Store)
               │
               ▼ (Resolves Tokens, Responsive Breakpoints, Customizer Contract)
      STYLE & LAYOUT RESOLVER
               │
               ▼ (Data Binding)
       GRAPH DATA BINDER
               │
               ▼ (Pixel Projection)
       SCENE GRAPH RENDERER
               │
               ▼
          LIVE PIXELS (Canvas, Customer Studio Simulator, Guest View)
```

1. **Schema OK**: Deeply typed against `SceneGraphNode`, `NodeGeometry`, `NodeStyle`, and `AutoLayoutConfig`.
2. **Command OK**: Every operation dispatches a strongly typed `TemplateEditorCommand`.
3. **Draft OK**: Immer-backed single source of truth in `TemplateEditorStore`.
4. **Resolver OK**: Computes tokens, responsive cascade (Desktop &rarr; Tablet &rarr; Mobile), and unit fallbacks.
5. **Renderer OK**: Projects directly to HTML5 semantic tags with hardware-accelerated CSS transforms.
6. **Persistence OK**: Immediate reactive preview with debounced local storage persistence.
7. **Undo OK**: Complete transaction history with forward/backward stack.
