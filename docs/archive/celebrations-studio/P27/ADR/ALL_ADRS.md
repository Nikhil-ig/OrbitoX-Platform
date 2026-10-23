# 🪐 OrbitoX Studio 3.0 — Architectural Decision Records (ADR-001 through ADR-018)
**Directory:** `docs/P27/ADR/`  
**Status:** APPROVED FOR PHASE 0 REVIEW  

---

## ADR-001: Canonical Project Document
* **Context:** Fragmented state across URL params, component stores, localStorage, and AST trees.
* **Decision:** Enforce ONE authoritative document schema (`OrbitoXProjectDocument`) containing site settings, design tokens, asset registries, CMS collections, pages, sections, and scenegraphs.
* **Consequences:** All editor tools, inspectors, importers, and exporters operate on a single source of truth.

---

## ADR-002: SceneGraph Authority
* **Context:** Competing mutations between DOM manipulation, transient React state, and backend APIs.
* **Decision:** The SceneGraph is the exclusive authority for spatial geometry and styling. The renderer is a pure projection of the SceneGraph.
* **Consequences:** Zero direct DOM mutation outside the declarative renderer.

---

## ADR-003: Canvas Hit Testing
* **Context:** Overlays intercept clicks, causing "ghost dragging" of background elements.
* **Decision:** Selection bounding box outlines must have `pointerEvents: 'none'`. Hit testing uses mathematical unprojection and spatial scene graph raycasting to select the deepest leaf node.
* **Consequences:** Clicks always reach the visual element under the cursor.

---

## ADR-004: Selection Ownership
* **Context:** Inconsistent selection states between canvas, page tree, and inspector.
* **Decision:** Centralize active selection in `store.ui.selection` (`selectedNodeIds: string[]`, `activeSceneId: string`, `activePageId: string`).
* **Consequences:** Desynchronization between canvas and panels is eliminated.

---

## ADR-005: CSS Architecture
* **Context:** Uncompiled Tailwind utilities, 169 fragmented inline styles, and missing PostCSS tooling.
* **Decision:** Install and configure Tailwind CSS and PostCSS in `apps/celebrations`. Establish a 7-tier cascading priority: Global Token < Theme Token < Component Token < Instance Override < Responsive Override < Local Node Override < Custom CSS. Scope studio chrome styles to prevent document theme leakage.
* **Consequences:** Complete visual fidelity, responsive box models, and dark studio chrome isolation.

---

## ADR-006: Inspector Schema
* **Context:** Duplicate dead `PropertiesPanel.tsx` (2,819 lines) and raw text inputs in `InspectorHost.tsx`.
* **Decision:** Deprecate `PropertiesPanel.tsx`. Rebuild `InspectorHost.tsx` using a schema-driven architecture with progressive disclosure (Essentials, Design, Layout, Responsive, Behavior, Data, Advanced) and specialized visual controls (Box Model scrubber, Corner Radius presets, Color Picker).
* **Consequences:** Clean, professional inspector UI that directly mutates SceneGraph styles.

---

## ADR-007: Section Model
* **Context:** Section insertions and reorders are wiped on browser reload due to line 31 in `TemplateSchemaService`.
* **Decision:** Model sections as first-class semantic document nodes with persistent IDs. Remove the first-scene comparison check in `TemplateSchemaService`.
* **Consequences:** Inserting, deleting, and reordering sections persists reliably across page reloads.

---

## ADR-008: Template Instantiation
* **Context:** Template switching appears unresponsive due to `useRef` caching in `TemplateEditorProvider`.
* **Decision:** Bind a React `key={slug}` prop to `TemplateEditorProvider` and provide explicit actions: "New Project from Template", "Add Section from Template", "Replace Current Site".
* **Consequences:** Template switching works instantly with rollback protection.

---

## ADR-009: Asset Architecture
* **Context:** Assets stored as volatile Blobs in IndexedDB without direct canvas drop support.
* **Decision:** Implement zero-friction drag-and-drop asset ingestion directly onto the canvas, backed by tenant-scoped cloud storage (S3/R2) and automatic WebP thumbnail generation.
* **Consequences:** Instant asset uploads, permanent cloud persistence, and usage tracking.

---

## ADR-010: Import IR (Intermediate Representation)
* **Context:** Adapters produce fragmented internal models and code-only ingestion modal.
* **Decision:** Unify all import adapters (HTML, React, Figma, Shopify, WordPress, Canva, URLs) around the canonical `OrbitoXImportIR` specification with confidence tiers and visual drag-and-drop ingestion.
* **Consequences:** High-fidelity, editable conversion across all supported formats.

---

## ADR-011: Component Model
* **Context:** Component instances lack slots and mutate master components on override edits.
* **Decision:** Adopt a Master/Instance component architecture with named slots, deep-cloned detach semantics, and isolated instance override maps.
* **Consequences:** Robust design system component workflows matching Figma/Framer standards.

---

## ADR-012: Responsive Cascade
* **Context:** Breakpoint overrides fail to inherit cleanly and lack visual reset indicators.
* **Decision:** Implement a desktop-first cascading override model (Desktop -> Tablet -> Mobile) with visual inheritance badges and one-click "Reset to Inherited" affordances.
* **Consequences:** Predictable responsive behavior without layout breakage.

---

## ADR-013: Motion Model
* **Context:** Scroll event listeners lag on main thread; lack of visual timeline scrubber.
* **Decision:** Hybrid motion runtime: declarative WAAPI for micro-interactions off the main thread, and GSAP ScrollTrigger for pinned parallax sequences with a dockable timeline editor.
* **Consequences:** 60/120 FPS hardware-accelerated animations and expressive timeline controls.

---

## ADR-014: Context Menu
* **Context:** Right-click context menu lacks empty canvas actions, submenus, and boundary clamping.
* **Decision:** Context-sensitive, viewport-aware context menu engine with nested submenus, layer hierarchy disambiguation ("Select Layer >"), and unified command execution.
* **Consequences:** First-class right-click experience across all canvas surfaces.

---

## ADR-015: Clipboard Architecture
* **Context:** In-memory clipboard only supports plain text within the same browser session.
* **Decision:** Multi-MIME clipboard serialization (`application/x-orbitox-node+json`, SVG, HTML, plain text) with Paste Special and Copy As generators.
* **Consequences:** Seamless interoperability between OrbitoX and external tools.

---

## ADR-016: Draft / Published Separation
* **Context:** Publishing mutates mutable draft; subsequent edits alter live website immediately.
* **Decision:** Strict separation between mutable draft state and immutable, versioned published snapshots stored in `StudioSnapshot`.
* **Consequences:** Zero risk of unintended live website mutations during editing; instant rollback.

---

## ADR-017: Security Boundary
* **Context:** Untrusted HTML/SVG ingestion exposes XSS script injection vulnerabilities.
* **Decision:** AST sanitization, removal of script tags and inline event handlers, and sandboxed iframe runtime boundaries for custom React/third-party embeds.
* **Consequences:** Zero-trust security for all ingested third-party content.

---

## ADR-018: Multi-Tenancy Architecture
* **Context:** Client-side caches collide across tenants; missing tenant partitioning in APIs.
* **Decision:** Prefix all storage keys and cloud paths with `tenantId`. Enforce `AsyncLocalStorage` tenant context resolution across all Next.js API routes and Prisma queries.
* **Consequences:** Zero cross-tenant data leakage or asset contamination.
