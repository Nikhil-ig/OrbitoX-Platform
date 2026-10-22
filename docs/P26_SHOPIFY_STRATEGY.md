# 🪐 OrbitoX P26 — Shopify Theme Ingestion & Commerce Interoperability Strategy
**Document ID:** `docs/P26_SHOPIFY_STRATEGY.md`  
**Phase:** P26 Phase 0 (Commerce Strategy & Architecture)  
**Status:** CANONICAL SPECIFICATION  
**Author:** Principal Product Architect & Commerce Systems Team  
**Date:** October 2026  

---

## 1. Executive Summary & Architectural Alignment

Shopify Online Store 2.0 (OS 2.0) is built on a clean, declarative hierarchy:
$$\text{Template (.json)} \longrightarrow \text{Sections (.liquid)} \longrightarrow \text{Blocks (.liquid)} \longrightarrow \text{Settings (.json)}$$

Because OrbitoX Studio Zero already organizes projects as **Pages $\longrightarrow$ Sections $\longrightarrow$ Elements $\longrightarrow$ Tokens**, Shopify OS 2.0 themes map directly into the OrbitoX architecture with unmatched semantic fidelity.

---

## 2. Shopify Theme ZIP Archive Structure

When a creator uploads a Shopify theme ZIP (e.g., Dawn, Impulse, Prestige), the `ShopifyAdapter` parses the archive without executing server-side code:

```
shopify-theme.zip
├── layout/
│   └── theme.liquid           ──► Global Master Layout (Header, Main, Footer)
├── templates/
│   ├── index.json             ──► Home Page Template (Section order & block settings)
│   ├── product.json           ──► Product Detail Page (PDP) Dynamic Template
│   └── collection.json        ──► Collection / Catalog Template
├── sections/
│   ├── header.liquid          ──► Navigation Section + {% schema %}
│   ├── image-banner.liquid    ──► Hero Section + Schema
│   ├── featured-product.liquid──► Commerce Product Card Grid
│   └── footer.liquid          ──► Global Footer Section
├── snippets/
│   ├── product-card.liquid    ──► Reusable Component Definition
│   └── icon-cart.liquid       ──► SVG Vector Asset
├── config/
│   └── settings_data.json     ──► Global Design Tokens (Colors, Typography, Layout widths)
└── assets/
    ├── base.css               ──► Theme Stylesheet (PostCSS AST parsing)
    └── global.js              ──► Client-side Interactions AST
```

---

## 3. Direct Mapping Matrix

| Shopify Concept | Source File / Schema | OrbitoX Target Entity | Conversion Logic |
|:---|:---|:---|:---|
| **JSON Template** | `templates/index.json` | `TemplatePageDefinition` | Maps `sections` list to ordered `sectionIds` |
| **Section** | `sections/*.liquid` | `TemplateSceneDefinition` / Section | Parses HTML structure, converts schema settings to props |
| **Section Schema** | `{% schema %} ... {% endschema %}` | `ComponentProperties` | Declares inputs: `text`, `image_picker`, `range`, `select` |
| **Block** | `type: "heading"`, `type: "button"` | `SceneGraphNode` | Blocks become child nodes inside section auto-layout |
| **Theme Settings** | `config/settings_data.json` | `ImportedDesignTokens` | `colors_accent_1` -> `tokens.colors.primary` |
| **Liquid Tag: Output** | `{{ product.title }}` | `content.bindings: "cms.product.title"` | Directly bound to OrbitoX Commerce CMS |
| **Liquid Tag: Loop** | `{% for item in collection %}` | `SceneGraphNode (kind: "repeater")` | Configured with `cmsCollection: "products"` |
| **Liquid Tag: Condition**| `{% if section.settings.show %}` | `SceneGraphNode (condition)` | Configured with boolean variable binding |
| **Metafields** | `{{ product.metafields.custom.spec }}` | CMS Custom Fields | Registered in dynamic data schema |
| **Complex Logic** | Unparseable Liquid tags | `CustomCodeRuntimeBoundary` | Preserved in isolated sandbox; no silent deletion |

---

## 4. Safe Liquid Parsing & Deterministic AST Architecture

1. **Zero Execution of Server-Side Ruby/Liquid:** We do not spin up an arbitrary Liquid runtime or Ruby container on the server.
2. **Static AST Analysis:** We parse Liquid using a deterministic tokenizer/AST compiler (`liquidjs` AST mode).
3. **Data Binding Resolution:** Standard commerce variables (`product`, `collection`, `cart`, `shop`) are bound to OrbitoX's native `@orbitox-io/commerce` engine.
4. **Boundary Isolation:** Any third-party app embeds or custom script tags (`{% render 'app-block' %}`) are wrapped in a controlled `CustomCodeRuntimeBoundary` with clear warning telemetry.

---

## 5. Schema Setting to Property Inspector Translation

Every Shopify section contains a JSON `{% schema %}` block declaring authorable settings. The `ShopifyAdapter` converts these settings directly into OrbitoX Inspector controls:

```json
// Shopify schema setting
{
  "type": "range",
  "id": "padding_top",
  "min": 0,
  "max": 100,
  "step": 4,
  "unit": "px",
  "label": "Top Padding",
  "default": 36
}
```
$$\Downarrow$$
```typescript
// OrbitoX Inspector Property Definition
{
  fieldId: "padding_top",
  label: "Top Padding",
  dataType: "slider",
  min: 0,
  max: 100,
  step: 4,
  unit: "px",
  defaultValue: 36,
  targetPath: "geometry.padding.top"
}
```

*This concludes the Shopify Strategy. Proceed to `docs/P26_WORDPRESS_STRATEGY.md`.*
