# 🪐 OrbitoX Studio 3.0 — P27 Executive Forensic Audit
**Document ID:** `docs/P27/00_EXECUTIVE_AUDIT.md`  
**Status:** COMPLETE FORENSIC AUDIT (PHASE 0)  
**Authors:** OrbitoX Principal Architecture & Engineering Review Board  
**Target Date:** October 2026  

---

## 1. Executive Summary

A deep forensic audit of the OrbitoX Visual Studio (`/admin/template-studio`) was conducted across real browser DOM instances, live computed CSS, pointer event dispatching, memory profiling, and persistence layers. 

The audit conclusively establishes that **all previous "100% Pass", "62/62 PASS", and "Figma Parity" reports were false positives**. The automated tests asserting these results bypassed the real user interface by calling internal JavaScript controller methods directly (`window.__studioController.updateNodeProperty(...)`), completely skipping actual DOM event dispatching, layout rendering, stylesheet evaluation, and input focus.

In reality, **28 major user-facing failures** cripple the platform, caused by 6 fundamental systemic root causes:
1. **Total Absence of Compiled CSS Tooling:** Neither `tailwindcss` nor `postcss` is configured in `apps/celebrations`, yet hundreds of UI elements rely entirely on raw Tailwind classes that produce zero computed rules.
2. **Selection Overlay Pointer Interception (Ghost Dragging):** The selection bounding box (`CanvasInteractionLayer`) sits at `zIndex: 35` with `pointerEvents: 'auto'`, completely swallowing pointer events meant for child or underlying elements and triggering unwanted drags of parent containers.
3. **Forced `position: absolute` Geometry Destruction on Resize:** Resizing any element unconditionally converts its position to `absolute`, tearing it out of flex/stack auto-layout and causing geometric jumps and stuck overlays.
4. **Fatal Blueprint Cache Invalidation on Reload:** `TemplateSchemaService` line 31 explicitly purges stored user schemas on browser reload whenever the first section's ID does not match the static blueprint, destroying all section insertions and reorders.
5. **Stale Store Reference in Template Provider:** `TemplateEditorProvider` caches the editor store in a `useRef` that never resets when switching templates via URL query or UI selector, causing template switching to appear completely unresponsive.
6. **Dead Component Islands & Missing Backend Persistence:** Over 3,300 lines of property panels and layers panels are dead code never mounted in the application shell, and zero database models exist in Prisma for storing projects, pages, or scenes.

---

## 2. Truth vs. Historical Test Reports

| Historical Claim | Real Browser Reality | Forensic Evidence | Verified Verdict |
| :--- | :--- | :--- | :--- |
| **"62/62 E2E Tests Passing"** | Tests called `window.__studioController.updateNodeProperty()` directly | `creator-journeys.spec.ts:19` bypasses all DOM inputs, buttons, and drag gestures | **FAILED (False Positive)** |
| **"100% CSS Fidelity & Styling"** | 0 CSS rules generated for Tailwind utilities; 169 fragmented inline styles | Browser inspection confirms 3 stylesheets, 482 total rules, `hasTailwindFlex: false` | **FAILED** |
| **"Figma-Class Direct Canvas Manipulation"** | Clicking child elements moves parent frames; dragging is erratic | `div#canvas-active-selection-box` overlays entire container with `zIndex: 35`, stealing clicks | **FAILED** |
| **"Full Auto-Layout Support"** | Resizing any node forces `position: 'absolute'`, breaking auto-layout | `CanvasInteractionLayer:661` explicitly commits `position: 'absolute'` on every resize | **FAILED** |
| **"Section Insertion & Reordering Ready"** | Reloading page immediately wipes out inserted or reordered sections | `TemplateSchemaService:31` resets `schema = null` if scene order diverges from blueprint | **FAILED** |
| **"Template Switching Operational"** | Selecting a new template leaves the previous template loaded | `TemplateEditorProvider:463` checks `if (!storeRef.current)` which evaluates to false on prop updates | **FAILED** |
| **"Production Performance 98% Optimal, 60 FPS"** | Fake hardcoded arithmetic formula in UI shell; continuous 60fps DOM thrashing | `StudioShell:833` runs `100 - (nodesCount > 250 ? 10 : 0)`; `CanvasInteractionLayer:120` runs unthrottled RAF DOM queries | **FAILED (Misleading)** |

---

## 3. Forensic Matrix of 28 User-Reported Problems

| ID | User-Reported Issue | Forensic Root Cause | Severity |
| :--- | :--- | :--- | :--- |
| **01** | CSS is not displaying correctly | Missing `tailwindcss` & `postcss` in `apps/celebrations`. Classes like `flex`, `p-3`, `bg-slate-900` produce no CSS rules. | **BLOCKER** |
| **02** | Many UI controls do not actually work | Controls in `InspectorHost` mutate properties that `StyleResolver` and node adapters ignore. | **CRITICAL** |
| **03** | Many visible functions are missing | Components like `PropertiesPanel.tsx` (2,819 lines) and `LayersPanel.tsx` (532 lines) exist in the tree but are unmounted. | **CRITICAL** |
| **04** | Elements cannot reliably be freely moved | Flow elements lack dedicated coordinate projections; dragging triggers conflicting reparenting and absolute positioning. | **CRITICAL** |
| **05** | Dragging an element moves underlying/back element | Active selection bounding box has `pointerEvents: 'auto'` and `zIndex: 35`, intercepting pointer down intended for child elements. | **BLOCKER** |
| **06** | Resize visually glitches and gets stuck on top | Every resize forces `position: 'absolute'`; continuous RAF measurement loop battles React state updates, leaving stale bounding boxes. | **BLOCKER** |
| **07** | Layers behavior is incomplete/confusing | `LayersPanel.tsx` is completely unmounted; `PageTreePanel.tsx` only renders shallow children without reparenting or multiselect. | **HIGH** |
| **08** | Design System is unreliable | Modifying design tokens updates token object but fails to trigger style recalculation on nodes using hardcoded inline styles. | **HIGH** |
| **09** | Typography is unreliable | Google Fonts are not dynamically injected into canvas document head; text adapters fall back to browser defaults. | **HIGH** |
| **10** | Colors are unreliable | Token color references collide with hex and HSL strings; alpha transparency parsing fails in `StyleResolver.resolveColor`. | **HIGH** |
| **11** | Components are incomplete/not reliable | Component instances lack slot overrides; editing an instance can accidentally mutate master component state. | **HIGH** |
| **12** | Data & CMS is incomplete/not reliable | CMS repeaters bind to static mock objects; schema changes are not backed by persistent database collections. | **HIGH** |
| **13** | Import experience is too complicated | `OrbitoXUniversalImportModal` forces creators into a technical code editor rather than a visual ingestion workflow. | **HIGH** |
| **14** | Import should be file drag/drop or picker first | Canvas and modal lack file drop targets; all imports require manual copy-pasting of raw code strings. | **HIGH** |
| **15** | Template UI is too technical | Template browser displays dense cards with JSON-like metadata instead of rich visual previews and live viewports. | **MEDIUM** |
| **16** | Template switching appears to do nothing | `TemplateEditorProvider` caches store in a `useRef` without checking slug changes or binding a React `key` prop. | **BLOCKER** |
| **17** | Sections need reliable insertion | Inserting a section above index 0 breaks the first-scene comparison check in `TemplateSchemaService`, purging the section on reload. | **BLOCKER** |
| **18** | Sections need reliable movement/reordering | Moving sections changes `scenes[0].id`, triggering the exact same fatal purge on reload. | **BLOCKER** |
| **19** | Assets/images need a first-class upload system | Uploads rely on browser IndexedDB without asset metadata, folders, optimization, or database persistence. | **HIGH** |
| **20** | Add Elements must work | Adding elements injects default nodes without resolving layout mode of parent container, leading to clipping. | **HIGH** |
| **21** | Add Layouts must work | Layout primitives (Stack, Grid, Container) lack dedicated runtime adapters and render as generic frames. | **HIGH** |
| **22** | Right sidebar is not professional | `BoxModelControl` and inspector controls rely on uncompiled Tailwind classes, rendering misaligned and unstyled. | **HIGH** |
| **23** | Right sidebar controls do not always mutate actual output | Property changes in `InspectorHost` write to keys like `paddingTop` while node adapters read `padding` or inline styles. | **BLOCKER** |
| **24** | Box Model must work | Scrubbing margins and paddings produces no visual effect when the target node is rendered via an adapter that ignores box model styles. | **BLOCKER** |
| **25** | Corner Radius must work | Radius controls write `{ all: 8 }` while CSS properties expect `borderRadius: '8px'`; uncompiled classes break control UI. | **HIGH** |
| **26** | Right-click menu must be first-class | Context menu lacks viewport collision detection, submenus, and unified command binding for copy/paste/arrange. | **HIGH** |
| **27** | Imported content must become genuinely editable | Importer creates opaque or partially mapped nodes that lack proper SceneGraph geometries and editable text nodes. | **CRITICAL** |
| **28** | Published output must match Studio | Studio canvas and published renderer use different CSS injection routines and motion wrappers, causing visual drift. | **BLOCKER** |

---

## 4. Architectural Rebuild Directive

Phase 0 establishes that patching existing code is strictly prohibited. The platform must be rebuilt around **One Canonical Project Document**, with:
1. Deterministic SceneGraph Authority
2. Clean Mathematical Hit-Testing without event-stealing overlays
3. Unified Cascading CSS Architecture (Design Token < Theme Token < Component Token < Override)
4. Full Section & Block Semantics inspired by modern web standards
5. Zero-Friction Universal Ingestion Pipeline
6. Dual Draft/Publish Immutable Snapshots with Postgres Multi-Tenant Persistence

---

## 5. Phase 0 Recommendation

**RECOMMENDATION:** **NO-GO** on production code modifications until the complete Phase 0 audit and implementation plan is formally approved by the user.
