# 🪐 OrbitoX P26 — Code Ingestion Strategy (HTML, CSS, React, Next.js, Vue, Svelte)
**Document ID:** `docs/P26_CODE_IMPORT_STRATEGY.md`  
**Phase:** P26 Phase 0 (Codebase Interoperability)  
**Status:** ARCHITECTURAL SPECIFICATION  
**Author:** Principal Front-End Architect & AST Compiler Engineer  
**Date:** October 2026  

---

## 1. Executive Summary & Objective

Modern web creators frequently want to import raw HTML/CSS snippets, landing page code, React components, Tailwind templates, or entire Next.js/Vue/Svelte projects into OrbitoX.

The **Code Ingestion Pipeline** parses source code into an Abstract Syntax Tree (AST), extracts design tokens and semantic layouts, resolves responsive styles, and compiles components into native OrbitoX `SceneGraphNode` trees—all while maintaining zero arbitrary server execution and total client safety.

---

## 2. AST Parsing Matrix by Technology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CODE INGESTION ENGINE                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│  HTML5 + CSS │             │ React / Next │             │ Vue / Svelte │
│  DOMParser + │             │ Babel / SWC  │             │ SFC Compiler │
│  PostCSS AST │             │   JSX AST    │             │   Template   │
└──────┬───────┘             └──────┬───────┘             └──────┬───────┘
       │                            │                            │
       └────────────────────────────┼────────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │                TAILWIND CSS DECOMPILER                 │
       │  Decodes 'flex flex-col gap-4 p-6 bg-slate-900...'     │
       │  into concrete OrbitoX Layout & Style properties       │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │             SEMANTIC COMPONENT BOUNDARY                │
       │  Detects reusable functions, export default, props     │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
                           Universal Import IR
```

---

## 3. HTML5 & CSS3 Ingestion Mechanics

### 3.1 Semantic HTML Mapping
The `HtmlAdapter` maps W3C semantic tags directly to OrbitoX scene graph nodes:
- `<header>`, `<footer>`, `<section>`, `<article>`, `<main>` $\longrightarrow$ `TemplateSceneDefinition` (Section) or `kind: "container"`.
- `<h1>` through `<h6>` $\longrightarrow$ `kind: "text"`, with `typography.variant = "h1" ... "h6"`.
- `<p>`, `<span>`, `<blockquote>` $\longrightarrow$ `kind: "text"` or `kind: "richtext"`.
- `<button>`, `<a class="btn">` $\longrightarrow$ `kind: "button"` with action target.
- `<img>`, `<picture>`, `<svg>` $\longrightarrow$ `kind: "image"` or `kind: "shape"` (vector path).
- `<ul>`, `<ol>`, `<dl>` $\longrightarrow$ `kind: "stack"` with child list items.

### 3.2 CSS Cascade & PostCSS Resolution
External CSS is parsed into a PostCSS AST:
1. **Selector Matching:** Selectors (`.hero-card > .title`) are matched against DOM elements using standard specificity calculation.
2. **Computed Style Generation:** CSS declarations (`display: flex; gap: 24px; color: #fff`) are assigned to matching nodes.
3. **Media Query Decomposition:** `@media (max-width: 768px)` rules are parsed and stored as `responsiveOverrides.tablet` patches.

---

## 4. React / Next.js JSX De-compilation & Tailwind Decoding

### 4.1 JSX AST Traversal
Using `@babel/parser` with `plugins: ['jsx', 'typescript']`:
- Every `JSXElement` is traversed.
- Intrinsic HTML tags map directly to node kinds.
- React components (`<ProductCard title="Gala Ticket" price="$150"/>`) are identified as component boundaries. Attributes map to component props.
- Array `.map()` iterations (`{items.map(item => <Card key={item.id} {...item}/>)}`) are automatically converted into OrbitoX `repeater` nodes.

### 4.2 The Tailwind CSS Decompiler
Tailwind is the most popular CSS framework for modern web development. The **Tailwind Decompiler** translates utility class strings into design tokens and layout properties:

| Tailwind Class | Decoded Property | OrbitoX SceneGraph Target |
|:---|:---|:---|
| `flex flex-col` | Layout mode & direction | `layoutMode: "flex"`, `layoutConfig.direction: "vertical"` |
| `items-center justify-between` | Flex alignments | `alignment.primary: "space-between"`, `alignment.cross: "center"` |
| `gap-6` | Flex gap | `layoutConfig.gap: "24px"` |
| `p-8` | Padding | `layoutConfig.padding: { top: 32, right: 32, bottom: 32, left: 32 }` |
| `bg-slate-900` | Background color | `style.background: { color: { value: "#0f172a" } }` |
| `rounded-2xl` | Border radius | `style.border.radius: "16px"` |
| `text-2xl font-bold` | Typography | `typography.fontSize: "24px"`, `typography.fontWeight: "700"` |
| `shadow-xl` | Drop shadow | `style.effects.shadow: [{ blur: 25, y: 20, color: "rgba(0,0,0,0.25)" }]` |
| `md:flex-row` | Responsive override | `responsive.tablet.layoutConfig.direction: "horizontal"` |

---

## 5. Vue & Svelte Single-File Component (SFC) Handling

1. **Vue SFC (`.vue`):**
   - `@vue/compiler-sfc` parses `<template>` into Vue AST $\longrightarrow$ mapped identically to JSX/HTML.
   - Scoped CSS in `<style scoped>` is namespaced to the component.
2. **Svelte SFC (`.svelte`):**
   - `svelte/compiler` extracts template expressions (`{#each}`, `{#if}`) and maps them directly to OrbitoX `repeater` and `conditional` nodes.

---

## 6. Custom Code Runtime Boundary (`CustomCodeRuntimeBoundary`)

When source code contains complex, non-declarative JavaScript (e.g. WebGL canvas scripts, Three.js shaders, third-party payment SDKs, or custom charting libraries):
1. **Never Silently Discard:** The code is not stripped or ignored.
2. **Sandbox Isolation:** The code is encapsulated inside an isolated iframe or web worker boundary with strict CSP (`Content-Security-Policy: default-src 'none'; script-src 'self'`).
3. **Editable Frame:** In the canvas, the boundary appears as a first-class `CustomCode` node with clear inspector controls to edit the raw snippet, reload the sandbox, or inspect console logs.

*This concludes the Code Ingestion Strategy. Proceed to `docs/P26_ASSET_IMPORT_STRATEGY.md`.*
