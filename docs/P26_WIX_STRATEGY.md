# 🪐 OrbitoX P26 — Wix Site & URL Ingestion Strategy
**Document ID:** `docs/P26_WIX_STRATEGY.md`  
**Phase:** P26 Phase 0 (Site Builder Interoperability)  
**Status:** ARCHITECTURAL SPECIFICATION  
**Author:** Webflow-Class & Browser DOM Systems Architect  
**Date:** October 2026  

---

## 1. Executive Summary

Wix is one of the most common site builders used for hospitality, weddings, salons, and portfolio sites. However, Wix DOM structures are famously complex: deeply nested div wrappers, auto-generated mesh layouts (`[data-mesh-id]`), obfuscated CSS classes, and rigid positioning.

The OrbitoX `WixAdapter` deconstructs this complexity, collapsing empty wrappers, extracting strips and columns into semantic OrbitoX sections, and recovering clean typography and design tokens.

---

## 2. Wix Architecture & De-obfuscation Challenges

A standard Wix rendered webpage contains distinctive architectural artifacts:

```
#SITE_CONTAINER
 └── #masterPage
      └── #PAGES_CONTAINER
           └── [data-mesh-id="SITE_PAGESmesh"]
                └── section[data-testid="page-section"] (Wix Strip)
                     └── div[data-testid="columns"]
                          ├── div[data-testid="column"] (Width 50%)
                          │    └── h2 (Wix Text Block)
                          └── div[data-testid="column"] (Width 50%)
                               └── wix-image (Wix Image Block)
```

### Key Obstacles & Solutions:
1. **Wix Mesh Layouts (`data-mesh-id`):** Wix uses an internal CSS grid mesh to position elements. The adapter inspects the computed CSS grid template and reconstructs it as an OrbitoX `kind: "grid"` or flex stack.
2. **Wrapper Inflation:** Wix often nests 8 to 12 `<div>` wrappers around a single text headline. The **AST Flattener** prunes any intermediate node that possesses no border, background, margin, or layout role.
3. **`wix-image` Custom Elements:** Wix wraps images in custom tags with dynamic CDN sizing query strings (`wix:image://v1/...`). The adapter extracts the canonical high-resolution source image URL and downloads it into the asset pipeline.

---

## 3. Structural Mapping Matrix: Wix to OrbitoX

| Wix Entity / Attribute | Wix DOM Signature | OrbitoX Target Node | Transformation Mechanics |
|:---|:---|:---|:---|
| **Wix Strip** | `section[data-testid="page-section"]` | `TemplateSceneDefinition` (Section) | Maps to full-width section container with background fill. |
| **Wix Column Layout** | `div[data-testid="columns"]` | `kind: "grid"` or Flex Row | Translates column widths into grid columns or flex ratios. |
| **Wix Text Component** | `div[data-testid="richTextElement"]` | `kind: "text"` / `kind: "richtext"` | Cleans inner `<p>`/`<span>` tags, normalizes font and line-height. |
| **Wix Image Component** | `wix-image` / `img` | `kind: "image"` | Extracts canonical media source and alt text. |
| **Wix Button** | `a[data-testid="linkElement"]` | `kind: "button"` | Extracts label, href, border-radius, and hover states. |
| **Wix Repeater** | `div[data-testid="repeater"]` | `kind: "repeater"` | Detects repeating item structure and creates data-bound repeater template. |

---

## 4. Live URL Crawling & Computed Style Capture

When importing via live Wix URL:
1. **Headless Navigation:** Spin up sandboxed browser subagent at 1440px desktop viewport.
2. **Hydration Wait:** Await network idle and Wix client-side JavaScript hydration (`window.fedops` ready).
3. **Computed Layout Extraction:** Extract computed styles, font families, and asset URLs.
4. **Pruning & Emission:** Prune invisible elements and emit the canonical **Universal Import IR**.

*This concludes the Wix Ingestion Strategy. Proceed to `docs/P26_CODE_IMPORT_STRATEGY.md`.*
