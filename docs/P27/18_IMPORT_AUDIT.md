# 🪐 OrbitoX Studio 3.0 — Universal Import Forensic Audit
**Document ID:** `docs/P27/18_IMPORT_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Import Experience Complexity (Issue #13 & #14)

### Current User Flow:
1. User clicks "Import" in the left rail.
2. A large modal (`OrbitoXUniversalImportModal.tsx`, 1,054 lines) appears.
3. The modal presents a technical tabs interface: HTML, React, Figma, Shopify, WordPress, URL.
4. Each tab requires pasting raw code strings into a code editor textarea or configuring technical adapter options.
5. There is NO drag-and-drop dropzone for files (HTML, ZIP, Figma tokens, SVG, Images) anywhere on the canvas or in the modal.

---

## 2. Imported Content Editability Gaps (Issue #27)

### Forensic Adapter Breakdown:
* **HTML Adapter (`HtmlAdapter.ts`):** Parses DOM via Cheerio/DOMParser. However, imported elements are frequently mapped as generic `frame` nodes with static inline styles, losing semantic heading tags (`h1`, `h2`), buttons, and responsive grid configurations.
* **React Adapter (`ReactAdapter.ts`):** Static AST parsing via Babel. JSX elements with ternary conditionals or map loops produce flattened placeholder text rather than active repeaters and conditional visibility bindings.
* **Shopify Adapter (`ShopifyAdapter.ts`):** Converts JSON schema sections and blocks, but liquid expressions like `{{ section.settings.image | img_url: 'master' }}` are dumped as plain text strings rather than bound image properties.
* **WordPress Adapter (`WordPressAdapter.ts`):** Parses Gutenberg block comments, but custom block variations lack styling fallback and render as empty boxes.
