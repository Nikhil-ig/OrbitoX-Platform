# 🪐 OrbitoX Studio — P20 Acceptance & Multi-Layer Test Plan
**Document ID:** `docs/P20_ACCEPTANCE_PLAN.md`  
**Phase:** P20 — Phase 0: Forensic Audit & Rebuild Planning  
**Date:** October 3, 2026  
**Auditor:** Principal QA Automation & Performance Architect  
**Status:** **PLAN SUBMITTED FOR REVIEW — ZERO CODE COMMITTED — AWAITING EXPLICIT USER APPROVAL**

---

## 1. Quality Philosophy: Truth Over Test Counts

In previous iterations, automated test suites reported "62/62 Tests Passed" and "100% Production Ready", while in the real browser:
- Dragging an element moved the background element behind it.
- Corner radius and box model adjustments produced zero pixel changes.
- 3D spatial computing was a fake 2D wireframe circle simulation.
- Uploading 2 images crashed browser LocalStorage.

### The Inviolable Acceptance Rule:
> **No control, feature, or workflow may be certified as "PASS" based on unit test assertions alone. Certification requires empirical evidence across all 7 layers of the execution chain:**
> $$\mathbf{UI\ Input} \longrightarrow \mathbf{Dispatched\ Action} \longrightarrow \mathbf{State\ Mutation} \longrightarrow \mathbf{Virtual\ DOM\ Render} \longrightarrow \mathbf{Local/Cloud\ Persistence} \longrightarrow \mathbf{Browser\ Reload\ Recovery} \longrightarrow \mathbf{Live\ Published\ Parity}$$

---

## 2. Multi-Layer Testing Architecture

```
Layer 7: LIVE RUNTIME PARITY (Headless Chrome on /e/[slug] verifying pixel-identical output)
   ▲
Layer 6: BROWSER RELOAD RECOVERY (Full page refresh verifying zero state loss)
   ▲
Layer 5: STORAGE & QUOTA AUDIT (Verify payload weight < 150 KB; zero Base64 in LocalStorage)
   ▲
Layer 4: PIXEL RENDER TRUTH (Visual regression screenshots capturing computed styles)
   ▲
Layer 3: REAL POINTER & GESTURE (Playwright mouse/touch gestures on canvas handles and overlays)
   ▲
Layer 2: STORE & RESOLVER INTEGRATION (StyleResolver, LayoutResolver, SceneGraphEngine)
   ▲
Layer 1: CANONICAL COMMAND UNIT TESTS (Action dispatchers, transaction commits, immutability)
```

---

## 3. The 4 Master End-to-End Creator Journeys

### Journey A: Professional Multi-Page Website from Template
1. **Entry**: Open `/admin/template-studio`, launch Template Browser.
2. **Select Template**: Select `CloudPulse NextGen SaaS` (true SaaS blueprint).
3. **Inspect Content**: Verify hero contains developer telemetry cockpit, NOT bride/groom fields.
4. **Edit Text**: Click headline, type new value, verify inline DOM update and store commit.
5. **Drag Element**: Select subheadline, drag downward by 60px; verify subheadline moves, background stays static.
6. **Add Section**: Open Section Library, insert `Pricing Table` at Position 2. Verify no existing sections are overwritten.
7. **Reorder Sections**: Move Pricing Table up to Position 1 via section drag handle.
8. **Upload Asset**: Upload `.webp` photo; verify stored as CDN/IndexedDB URL without bloating LocalStorage.
9. **Responsive Mobile**: Switch to Mobile (390px). Reorder image above text. Switch back to Desktop; verify Desktop remains side-by-side.
10. **Publish**: Click Publish, verify Ed25519 signature generated, open `/e/[slug]`, verify identical rendering.

### Journey B: Blank Canvas to Production Website
1. **Entry**: Click "New Blank Project".
2. **Compose Page Flow**: Insert 5 sections: Navbar, Hero, Feature Bento, Testimonials, Footer.
3. **Auto-Layout Stacks**: Create a 3-column feature grid using flex stack controls.
4. **Style Typography**: Apply curated font pairing (`Cinzel` + `Outfit`); adjust font-size and line-height.
5. **Box Model & Radius**: Select card container, set padding to `24px`, set linked corner radius to `16px`. Verify rendered pixels have 16px rounded corners.
6. **Reusable Component**: Convert feature card into Master Component; instantiate 2 instances. Edit master text style; verify both instances inherit change.
7. **Publish & Verify**: Deploy project; inspect published live route.

### Journey C: Existing Project Inspection & Recovery
1. **Entry**: Open existing project with 9 sections and 80+ nodes.
2. **Layers Tree Inspection**: Open Layers panel; verify ALL 9 sections and their nested children are visible.
3. **Canvas ↔ Layer Sync**: Click a deeply nested button on canvas; verify Layers panel automatically expands and scrolls to highlight the button layer.
4. **Escape Key Navigation**: Press Escape; verify selection climbs to parent Container, then Section, then Page.
5. **Browser Reload**: Reload browser via `F5` / `⌘R`; verify 100% of nodes, positions, and token states are restored.

### Journey D: Cinematic Immersive & Spatial Experience
1. **Entry**: Open `Spatial Horizon 3D` or `Celestial Odyssey`.
2. **Parallax Depth Planes**: Assign depth plane `-3` to background stars, `+2` to floating glass card.
3. **Live Scroll Preview**: Scroll canvas; verify background stars translate slower (0.3x) and glass card translates faster (1.3x) with GPU `translate3d`.
4. **Optical Shaders**: Open Effects panel; adjust Frosted Glass blur to `20px` and specular highlight to `0.3`. Verify immediate visual change.
5. **Real 3D Spatial Canvas**: Open 3D Workspace; orbit camera in real Three.js WebGL viewport; adjust roughness and lighting; insert into canvas.
6. **Publish**: Deploy to `/e/[slug]`; verify 60 FPS WebGL rendering on desktop and responsive graceful fallback on mobile.

---

## 4. Capability Acceptance Criteria Matrix

| Subsystem / Control | User Input | Action Dispatched | State Mutation | Render Output | Persistence | Reload |
|---|---|---|---|---|---|---|
| **Canvas Drag** | Drag selection overlay down 60px | `SG_UPDATE_GEOMETRY` | `node.geometry.y += 60` | Clicked node moves +60px; underlying elements stay frozen | Saved to draft | Exact position preserved |
| **Corner Radius** | Set slider to `24px` | `SG_UPDATE_STYLE` | `node.style.borderRadius = 24` | Element corners visibly rounded to 24px in DOM | Saved to draft | 24px preserved |
| **Box Model Padding** | Set Top Padding to `32px` | `SG_UPDATE_STYLE` | `node.style.paddingTop = '32px'` | Container insets content by 32px | Saved to draft | 32px preserved |
| **Layers Tree** | Open Layers panel | Open Drawer | Reads active page sections | All sections and nested children rendered in tree | N/A | Full tree rendered |
| **Template Replace** | Select SaaS template | `REPLACE_PROJECT` | Replaces draft atomically | SaaS bento hero renders; zero wedding fields | Snapshot saved | SaaS layout preserved |
| **Section Insert** | Drop section from library | `INSERT_SECTION` | Spliced into `scenes` array | New section appears; existing sections untouched | Saved to draft | All sections preserved |
| **Asset Upload** | Upload 4MB image | `uploadFile` | Metadata saved to `assets` | Image renders on canvas; LocalStorage < 150KB | IndexedDB / CDN | Image loads instantly |
| **Mobile Art Direction** | Set Mobile layout to column | `SET_RESPONSIVE_OVERRIDE` | `responsive.mobile.layout = 'col'` | Mobile renders column; Desktop remains row | Saved to draft | Split layouts preserved |
| **Motion Scrub** | Scrub playhead to 1.5s | `SET_TIMELINE_TIME` | `ui.playheadTime = 1.5` | Canvas elements animate to 1.5s keyframe state | Saved on commit | Keyframes preserved |
| **3D Mesh Orbit** | Drag mouse on 3D canvas | Three.js OrbitControls | Camera matrix rotates | Real WebGL geometry rotates with specular lighting | Saved to draft | WebGL scene restored |

---

## 5. Certification Sign-Off Protocol

The P20 Rebuild will only be certified as complete when:
- **100% of controls in `docs/P20_CONTROL_CAPABILITY_MATRIX.json` achieve `PASS`.**
- **0 controls remain in `FAIL` or `MISLEADING`.**
- **All 4 Master Creator Journeys execute end-to-end with 0 manual interventions.**
- **All automated Playwright tests pass against the live running application.**
