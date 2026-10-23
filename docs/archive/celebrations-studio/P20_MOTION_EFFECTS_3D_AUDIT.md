# 🪐 OrbitoX Studio — P20 Motion, Effects & 3D Spatial Audit
**Document ID:** `docs/P20_MOTION_EFFECTS_3D_AUDIT.md`  
**Phase:** P20 — Phase 0: Forensic Audit & Rebuild Planning  
**Date:** October 3, 2026  
**Auditor:** Principal Motion, Graphics & Spatial Systems Engineer  
**Status:** **AUDIT COMPLETE (AWAITING USER APPROVAL)**

---

## 1. Executive Summary: Simulated Capabilities vs. Runtime Reality

Creative web design today relies on motion, depth, and spatial aesthetics. In the current OrbitoX Studio:
1. **Motion Timeline**: Renders a visually slick playhead scrubber (0.0s to 3.0s) and cubic-bezier curve editor, but the playhead is **completely disconnected from canvas elements**. Scrubbing the timeline moves a yellow bar on screen, but leaves canvas nodes 100% frozen.
2. **Visual Effects Studio**: Offers 5 static cards that apply basic CSS backdrop filters. Sliders (`blurAmount`, `glowIntensity`) exist as dead React state variables that do not appear in the JSX.
3. **3D Spatial Computing**: Billed as "WebGL 60 FPS spatial scene editor", `ThreeDWorkspace.tsx` actually requests an HTML5 2D Canvas context (`canvas.getContext('2d')`) and draws 2D wireframe circles using `ctx.ellipse()`. Clicking "Insert to Canvas" hardcodes an insertion of an `astrolabe_countdown` component rather than 3D geometry.

---

## 2. Motion Subsystem Forensic Breakdown & Target Architecture

### 2.1 Current Implementation Reality
In `MotionWorkspace.tsx`:
- `currentTime` is incremented by a `requestAnimationFrame` loop.
- No `postMessage`, no callback, and no CSS transform is dispatched to the active scene graph during timeline scrubbing.
- Clicking "Apply Spring Physics" writes `{ spring: { damping, stiffness, mass } }` to `node.motion.in`, but `SceneGraphRenderer` has no spring physics solver at runtime; it merely maps this to a rough CSS cubic-bezier string approximation.

### 2.2 Target Motion Engine: GSAP / Web Animations Integration
Motion must follow a deterministic execution chain:
$$\text{Select Node} \longrightarrow \text{Add Animation Track} \longrightarrow \text{Set Keyframes} \longrightarrow \text{Scrub/Preview Live} \longrightarrow \text{Persist} \longrightarrow \text{Runtime Execution}$$

#### Supported Animatable Properties:
- Transforms: `x`, `y`, `z`, `scale`, `scaleX`, `scaleY`, `rotation`, `rotationX`, `rotationY`, `skewX`, `skewY`
- Styles: `opacity`, `filter.blur`, `filter.brightness`, `backgroundColor`, `borderRadius`
- SVG / Masks: `clipPath`, `strokeDashoffset`

#### Supported Animation Drivers:
1. **On Load / In Viewport**: Triggered with configurable threshold (e.g. element enters 20% of viewport).
2. **Scroll-Linked (Scrub)**: Element animation progress ($0\% \rightarrow 100\%$) tied directly to window scroll offset.
3. **Interactive Hover / Press**: Micro-interactions with spring physics return.
4. **Pointer Parallax**: Subtle mouse tracking in 3D coordinate space.

---

## 3. Multi-Plane Parallax Architecture

### 3.1 Depth Plane Model (-5 to +5):
- `Plane -5`: Distant cosmos / infinite background (scroll speed: 0.1x)
- `Plane -3`: Nebula / atmospheric glow (scroll speed: 0.3x)
- `Plane -1`: Midground decorative shapes (scroll speed: 0.7x)
- `Plane 0`: Primary content plane (standard 1.0x scroll speed)
- `Plane +2`: Floating foreground badges / cards (scroll speed: 1.3x)
- `Plane +5`: High-priority floating HUD / navigation (scroll speed: 1.6x)

### 3.2 Runtime Execution:
The parallax depth plane must be evaluated using GPU-accelerated CSS `transform: translate3d(0, calc(var(--scroll-y) * factor), depth)` with `will-change: transform`, ensuring smooth 60 FPS scrolling without layout thrashing.

---

## 4. Visual Effects Subsystem Architecture

The Effects Studio must replace static preset cards with **real-time parameterized optical shaders**:

| Effect Module | Parameters Controlled | Underlying Web Technology | Runtime Performance Target |
|---|---|---|:---:|
| **Frosted Glass** | Blur (0–40px), Tint (color), Specular Highlight (opacity), Surface Noise (0–100%) | `backdrop-filter: blur()`, SVG feTurbulence, border gradients | 60 FPS |
| **Aurora Glow** | Core Color, Rim Color, Spread Radius (0–200px), Pulse Speed | Multi-stop radial gradients, CSS keyframe blend-modes | 60 FPS |
| **35mm Film Grain** | Grain Intensity (0–100%), Monochromatic vs Color, Animation FPS | SVG filter feTurbulence + feColorMatrix, animated seed | 60 FPS |
| **Liquid Chrome** | Metalness, Specular Angle, Reflection Map, Dynamic Distortion | CSS linear-gradient angle scrub + SVG feDisplacementMap | 60 FPS |
| **Celestial Bloom** | Glow Color, Threshold, Softness, Rim Light | Stacked `box-shadow` and `filter: drop-shadow()` | 60 FPS |

---

## 5. 3D Spatial Computing: True WebGL with Zero-Overhead Isolation

### 5.1 The Current 2D Ellipse Simulation:
```typescript
// ThreeDWorkspace.tsx lines 38, 87-97
const ctx = canvas.getContext('2d');
...
ctx.ellipse(0, 0, Math.abs(rx) + 20, Math.abs(ry) + 20, angleY, 0, Math.PI * 2);
ctx.stroke();
```
This is a fake wireframe simulation on an HTML 2D canvas, not a 3D engine.

### 5.2 Target 3D Architecture:
1. **Three.js WebGL Runtime**:
   - Real perspective camera with OrbitControls (pan, zoom, orbit).
   - Real PBR (Physically Based Rendering) materials: `MeshStandardMaterial`, `MeshPhysicalMaterial` (transmission, roughness, metalness, clearcoat).
   - Lighting: Ambient, Directional, Point lights, and HDR environment maps.
   - Geometry Primitives: Torus Knot, Sphere, Cylinder, Cube, and `.glb` mesh imports.
2. **Strict Capability Isolation (Zero DOM Overhead)**:
   - For standard 2D websites, the Three.js bundle and WebGL context are **never loaded**.
   - If a page contains a 3D node (`kind === 'three_d'`), the runtime dynamically imports `@orbitox-io/3d-engine` via `React.lazy()` / dynamic `import()`.
   - On mobile devices where WebGL is disabled or battery saver is active, automatically falls back to an optimized static WebP render.
