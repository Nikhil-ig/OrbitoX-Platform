# 🪐 OrbitoX P26 — Master Creator Acceptance & Verification Test Plan
**Document ID:** `docs/P26_ACCEPTANCE_PLAN.md`  
**Phase:** P26 Phase 0 (Verification Strategy)  
**Status:** CANONICAL SPECIFICATION  
**Author:** QA/E2E Automation Architect & Principal Product Architect  
**Date:** October 2026  

---

## 1. Executive Summary & Acceptance Standard

> **"Do not say 'Figma supported' unless a real Figma workflow works. Do not say 'Shopify supported' unless a real theme package imports. Do not say 'Right click supported' unless actions actually mutate the project. TRUTH > TEST COUNT."**

The **OrbitoX P26 Master Acceptance Plan** establishes 11 rigorous, end-to-end verification tests. Each test evaluates real creative workflows, measuring correctness, editability, performance, security, and undoability.

---

## 2. The 11 Mandatory Acceptance Tests

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ORBITOX P26 ACCEPTANCE TEST SUITE                    │
├────────────────────────────────────────────────────────────────────────┤
│  TEST 01: Canvas Background Right-Click Context Menu Test             │
│  TEST 02: Single Element Context Menu & Mutation Test                  │
│  TEST 03: "Select Layer" Nested Ancestor Drill-Down Test               │
│  TEST 04: Section Right-Click & Section Management Test                │
│  TEST 05: Multi-Selection Context Menu & Alignment Test                │
│  TEST 06: System Clipboard Multi-MIME & Cross-Tab Test                 │
│  TEST 07: Paste Special & Copy as Code Test                           │
│  TEST 08: HTML5, CSS3, & Tailwind Code Ingestion Test                  │
│  TEST 09: External Theme Fidelity Test (Shopify / WordPress / Figma)  │
│  TEST 10: Non-Destructive Atomic Import & Undo Transaction Test       │
│  TEST 11: Zero-Trust Security & XSS Penetration Defense Test           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Test Specifications & Verification Gates

### TEST 01: Canvas Background Right-Click Context Menu Test
- **Objective:** Verify right-clicking empty canvas triggers custom menu with working actions.
- **Procedure:**
  1. Navigate to Studio Zero canvas.
  2. Right-click on empty canvas backdrop at coordinates $(400, 300)$.
  3. Verify native browser menu is prevented (`e.defaultPrevented === true`).
  4. Verify custom glassmorphic canvas menu renders with items: `Paste`, `Select All`, `Add Section Block`, `Zoom to Fit`.
  5. Click `Add Section Block`.
  6. Verify new section is inserted and canvas updates smoothly.
- **Pass Criteria:** Custom menu opens in $< 16\text{ms}$; browser menu does not appear; command mutates state.

### TEST 02: Single Element Context Menu & Mutation Test
- **Objective:** Verify right-clicking an element allows direct mutation without opening side inspectors.
- **Procedure:**
  1. Right-click on a text headline node on canvas.
  2. Verify menu displays: `Cut`, `Copy`, `Duplicate`, `Delete`, `Lock`, `Hide`, `Copy Styles`.
  3. Click `Duplicate`. Verify duplicated node appears directly below with fresh ID.
  4. Right-click duplicated node and click `Lock`. Verify node selection shows locked indicator and dragging is prevented.
  5. Right-click again and click `Delete`. Verify node is cleanly removed.
- **Pass Criteria:** All 5 commands successfully execute through `TemplateEditorStore.dispatch()` with full undoability.

### TEST 03: "Select Layer" Nested Ancestor Drill-Down Test
- **Objective:** Verify obscured nested elements can be selected directly from canvas right-click.
- **Procedure:**
  1. Position a button inside a card inside a stack inside a section.
  2. Right-click on the button.
  3. Hover over the `Select Layer ▶` submenu.
  4. Verify the submenu lists the complete ancestral stack: `Button` $\longrightarrow$ `Card` $\longrightarrow$ `Stack` $\longrightarrow$ `Section`.
  5. Click on `Card` in the submenu.
  6. Verify the active selection in the editor switches to `Card` and its bounding box appears on canvas.
- **Pass Criteria:** Accurate geometric hit testing resolves all overlapping layers; click selects targeted node.

### TEST 04: Section Right-Click & Section Management Test
- **Objective:** Verify section operations via right-click.
- **Procedure:**
  1. Right-click on a section artboard divider/header.
  2. Click `Duplicate Section`. Verify entire section with all child nodes is duplicated in order.
  3. Click `Move Down`. Verify section changes position in `pages[].sectionIds`.
- **Pass Criteria:** Section reordering and duplication execute atomically with correct render order.

### TEST 05: Multi-Selection Context Menu & Alignment Test
- **Objective:** Verify multi-node operations.
- **Procedure:**
  1. Drag a marquee selection over 3 cards on canvas.
  2. Right-click on the selection.
  3. Verify menu displays: `Group`, `Align (Left, Center, Right, Top, Middle, Bottom)`, `Distribute Horizontally`.
  4. Click `Align Middle`.
  5. Verify all 3 nodes now share identical vertical center coordinates.
- **Pass Criteria:** Multi-selection is preserved during right-click; alignment modifies geometries accurately.

### TEST 06: System Clipboard Multi-MIME & Cross-Tab Test
- **Objective:** Verify clipboard bridge with operating system and cross-tab paste.
- **Procedure:**
  1. Select a Hero section in Browser Tab A and press `⌘C`.
  2. Read OS clipboard using `navigator.clipboard.read()`.
  3. Verify clipboard contains `application/vnd.orbitox.scenegraph+json` AND `text/html`.
  4. Open Browser Tab B with a different project.
  5. Press `⌘V`.
  6. Verify the exact Hero section pastes into Tab B with fresh unique IDs and identical styling.
- **Pass Criteria:** Subtrees transfer losslessly across independent browser sessions.

### TEST 07: Paste Special & Copy as Code Test
- **Objective:** Verify Paste Special modes and code export.
- **Procedure:**
  1. Copy a styled button node (`⌘C`).
  2. Select an existing plain button and right-click $\longrightarrow$ `Paste Styles Only`.
  3. Verify background, border, typography, and shadow transfer, but original button text remains unchanged.
  4. Right-click button and select `Copy as Code ▶ Copy as JSX`.
  5. Paste into text editor and verify valid React JSX with Tailwind classes is emitted.
- **Pass Criteria:** Style extraction applies cleanly without geometry distortion; JSX code is syntactically valid.

### TEST 08: HTML5, CSS3, & Tailwind Code Ingestion Test
- **Objective:** Verify code ingestion creates editable nodes, not flat embeds or screenshots.
- **Procedure:**
  1. Open Import Center (`⌘K` $\longrightarrow$ Import Code).
  2. Paste HTML containing `<section class="flex flex-col p-8 bg-slate-900"><h1 class="text-3xl text-white">Title</h1><p>Body</p></section>`.
  3. Click `Import into Canvas`.
  4. Verify imported section appears in SceneGraph.
  5. Click on `Title` text node. Verify it can be edited inline.
  6. Change fill color in inspector and verify it updates in real time.
- **Pass Criteria:** Zero screenshots; zero uneditable `<iframe>` wrappers; 100% individual element selection and editability.

### TEST 09: External Theme Fidelity Test (Shopify / WordPress / Figma)
- **Objective:** Verify theme package ingestion.
- **Procedure:**
  1. Upload a Shopify OS 2.0 theme ZIP (e.g. Dawn) or WordPress block theme ZIP.
  2. Execute `ShopifyAdapter.parse()`.
  3. Verify `templates/index.json` translates to page sections.
  4. Verify `config/settings_data.json` extracts color and typography design tokens.
  5. Verify product card blocks render with dynamic CMS bindings.
- **Pass Criteria:** Theme structure maps cleanly into pages, sections, and editable elements with confidence score $> 92\%$.

### TEST 10: Non-Destructive Atomic Import & Undo Transaction Test
- **Objective:** Verify import transaction safety.
- **Procedure:**
  1. Start with an existing project containing 3 customized scenes.
  2. Import a new external section.
  3. Verify existing 3 scenes remain completely unchanged.
  4. Press `⌘Z` (Undo).
  5. Verify imported section is completely removed and project returns to exact prior state.
  6. Press `⌘⇧Z` (Redo). Verify imported section cleanly restores.
- **Pass Criteria:** Atomic transaction boundary ensures zero corruption and instant rollback.

### TEST 11: Zero-Trust Security & XSS Penetration Defense Test
- **Objective:** Verify immunity against malicious payloads.
- **Procedure:**
  1. Attempt to import an SVG containing `<script>alert('xss')</script>`.
  2. Attempt to import HTML containing `<img src="x" onerror="stealCookies()">`.
  3. Verify DOMPurify sanitization strips all executable tags before AST generation.
  4. Verify zero script execution occurs in the browser.
- **Pass Criteria:** 100% of malicious vectors neutralized; zero console alerts or unauthorized requests.

---

## 4. Test Execution & Reporting Protocol

During implementation phases P26.1 through P26.14, every pull request must pass the corresponding automated test in this plan. Upon completion of Phase P26.14, all 11 tests will be executed end-to-end and documented in `docs/P26_MASTER_ACCEPTANCE_REPORT.md` with browser recording artifacts.

*This concludes the Acceptance Test Plan.*
