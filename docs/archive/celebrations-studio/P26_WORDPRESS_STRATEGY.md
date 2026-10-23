# 🪐 OrbitoX P26 — WordPress Theme & Block Gutenberg Ingestion Strategy
**Document ID:** `docs/P26_WORDPRESS_STRATEGY.md`  
**Phase:** P26 Phase 0 (CMS Interoperability)  
**Status:** ARCHITECTURAL SPECIFICATION  
**Author:** WordPress Block Editor Architect & Principal Product Architect  
**Date:** October 2026  

---

## 1. Executive Summary & Context

WordPress powers over 40% of the world's websites. With the modern **Full Site Editing (FSE)** and Gutenberg block paradigm, WordPress themes have transitioned from opaque PHP templates to declarative HTML blocks and structured `theme.json` configuration files.

OrbitoX ingests WordPress block themes, block patterns, and exported content, transforming them into modern, high-performance, graph-native OrbitoX projects with zero PHP server overhead.

---

## 2. WordPress Block Theme Archive Anatomy

```
wp-block-theme.zip
├── theme.json                 ──► Global Design Tokens, Color Palette, Typography
├── style.css                  ──► Theme metadata & global baseline styles
├── templates/
│   ├── index.html             ──► Main Home Page Template (Block HTML)
│   ├── single.html            ──► Single Post / Article Template
│   └── page.html              ──► Standard Page Template
├── parts/
│   ├── header.html            ──► Reusable Global Header Template Part
│   └── footer.html            ──► Reusable Global Footer Template Part
└── patterns/
    ├── hero.php / .html       ──► Reusable Block Pattern
    └── pricing.php / .html    ──► Reusable Pricing Grid Pattern
```

---

## 3. Gutenberg Block Grammar & Parser Architecture

WordPress Gutenberg serializes block trees as HTML containing structured comment delimiters:

```html
<!-- wp:columns {"align":"wide","style":{"spacing":{"margin":{"top":"48px"}}}} -->
<div class="wp-block-columns alignwide" style="margin-top:48px">
  <!-- wp:column {"width":"66.66%"} -->
  <div class="wp-block-column" style="flex-basis:66.66%">
    <!-- wp:heading {"level":1,"style":{"typography":{"fontStyle":"normal","fontWeight":"700"}}} -->
    <h1 class="wp-block-heading">OrbitoX Gala</h1>
    <!-- /wp:heading -->
    <!-- wp:paragraph -->
    <p>Experience next-generation celebrations.</p>
    <!-- /wp:paragraph -->
  </div>
  <!-- /wp:column -->
  <!-- wp:column {"width":"33.33%"} -->
  <div class="wp-block-column" style="flex-basis:33.33%">
    <!-- wp:image {"id":102,"sizeSlug":"full","linkDestination":"none"} -->
    <figure class="wp-block-image size-full"><img src="/assets/hero.webp" alt="Hero"/></figure>
    <!-- /wp:image -->
  </div>
  <!-- /wp:column -->
</div>
<!-- /wp:columns -->
```

### Deterministic Tokenizer Mechanics:
The `WordPressAdapter` executes a regex/grammar scanner that transforms block comment boundaries into an AST:
1. `wp:columns` $\longrightarrow$ `kind: "grid"` or flex row container.
2. `wp:column` with `flex-basis: 66.66%` $\longrightarrow$ child node with `geometry.width: "66.66%"`.
3. `wp:heading` $\longrightarrow$ `kind: "text"`, `variant: "h1"`.
4. `wp:paragraph` $\longrightarrow$ `kind: "text"`, `variant: "body"`.
5. `wp:image` $\longrightarrow$ `kind: "image"` with image source extraction.
6. `wp:buttons` & `wp:button` $\longrightarrow$ `kind: "button"` with link URL and styles.

---

## 4. `theme.json` to OrbitoX Design Tokens Mapping

WordPress `theme.json` defines all global visual rules. The adapter maps these directly to OrbitoX tokens:

```json
// WordPress theme.json
{
  "settings": {
    "color": {
      "palette": [
        { "slug": "primary", "color": "#0F172A", "name": "Primary" },
        { "slug": "accent", "color": "#DFBA6B", "name": "Gold Accent" }
      ]
    },
    "typography": {
      "fontFamilies": [
        { "fontFamily": "Inter, sans-serif", "slug": "body", "name": "Inter" },
        { "fontFamily": "Cinzel, serif", "slug": "heading", "name": "Cinzel" }
      ]
    }
  }
}
```
$$\Downarrow$$
```typescript
// OrbitoX Design Tokens
{
  colors: {
    primary: { value: '#0F172A', inferredRole: 'primary' },
    accent: { value: '#DFBA6B', inferredRole: 'accent' }
  },
  typography: {
    body: { fontFamily: 'Inter', fallback: 'sans-serif' },
    heading: { fontFamily: 'Cinzel', fallback: 'serif' }
  }
}
```

---

## 5. Dynamic Queries to OrbitoX Repeater Nodes

When encountering the WordPress Query Loop block (`<!-- wp:query {"query":{"post_type":"post"}} -->`), the adapter converts it into an OrbitoX `repeater` node:
- Configures `repeater.collection = "posts"` or `"events"`.
- Binds child `wp:post-title` to `binding.field = "cms.post.title"`.
- Binds `wp:post-featured-image` to `binding.field = "cms.post.image"`.

*This concludes the WordPress Ingestion Strategy. Proceed to `docs/P26_WIX_STRATEGY.md`.*
