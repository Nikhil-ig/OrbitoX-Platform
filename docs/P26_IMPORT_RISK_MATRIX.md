# 🪐 OrbitoX P26 — Ingestion Risk Analysis & Fallback Mitigation Matrix
**Document ID:** `docs/P26_IMPORT_RISK_MATRIX.md`  
**Phase:** P26 Phase 0 (Risk Management)  
**Status:** CANONICAL SPECIFICATION  
**Author:** QA/E2E Automation Architect & Principal Creative Systems Engineer  
**Date:** October 2026  

---

## 1. Executive Summary & Philosophy

> **"Do not claim 100% automated import unless the evidence supports it. Truth > Demo. Predictability > Magic."**

No creative software importer can guarantee 100.0% perfect automated translation of every esoteric CSS trick, custom Three.js shader, proprietary font, or dynamic database query without occasional fidelity gaps.

The **OrbitoX Risk Management Philosophy** guarantees:
1. **Zero Silent Failures:** The importer never silently deletes or corrupts elements it cannot fully parse.
2. **Transparent Confidence Scoring:** Every imported project and node receives an objective confidence score ($0.0 \text{ to } 1.0$) highlighting potential fidelity variances.
3. **Graceful Fallbacks:** Unsupported features gracefully degrade to safe equivalents (e.g. complex webgl $\longrightarrow$ isolated sandbox container; missing font $\longrightarrow$ closest aesthetic typography fallback).
4. **Interactive Correction Workspace:** Creators can visually compare the original source against the imported OrbitoX canvas in split-screen or overlay mode, correcting discrepancies with one click.

---

## 2. Ingestion Risk Matrix

| Risk Scenario | Probability | Impact | Root Cause | Fallback & Mitigation Strategy |
|:---|:---:|:---:|:---|:---|
| **Missing Proprietary Web Fonts** | High | Medium | Source uses commercial licensed font (e.g. Helvetica Neue, Futura, GT Walsheim) not present on creator's machine or Google Fonts. | 1. Prompt creator to upload font file (`.woff2`/`.ttf`).<br>2. Automatically substitute with closest Google Font metric match.<br>3. Keep original font name in token metadata so it renders if installed locally. |
| **Figma API Rate Limits (429 Too Many Requests)** | Medium | High | Large design systems with hundreds of components exceed Figma Tier 1 rate limit (300 req/min). | 1. Implement exponential backoff retry worker with jitter.<br>2. Cache node subtrees in IndexedDB.<br>3. Recommend direct `.fig` file upload or Figma Bridge plugin export. |
| **Complex CSS Layout Divergence** | Medium | Medium | Source relies on `display: contents`, intricate CSS subgrids, or negative margins that conflict with standard flex containers. | 1. Fall back to `position: absolute` with coordinate constraints.<br>2. Flag in Import Report with "Convert to Flex" button. |
| **Large ZIP / Asset Memory Exhaustion** | Medium | High | User uploads 500MB theme package with uncompressed 4K video backgrounds. | 1. Stream decompression with 150MB unpacked quota guard.<br>2. Downscale raster assets > 2000px client-side via `OffscreenCanvas`.<br>3. Offload raw video binaries directly to cloud object storage. |
| **Unparseable Dynamic Code / Liquid Logic** | High | Low | Shopify theme uses complex server-side Ruby algorithms or custom third-party app blocks. | 1. Wrap unparseable snippet inside `CustomCodeRuntimeBoundary`.<br>2. Bind standard variables (`product`, `collection`) to OrbitoX CMS.<br>3. Keep raw code accessible in inspector. |
| **Overlapping Vector Boolean Paths** | Low | Low | Complex vector icons with non-standard winding rules (evenodd vs nonzero). | 1. Render high-res SVG snapshot.<br>2. Preserve raw SVG string in `node.content.vectorSvgPath`. |

---

## 3. Confidence Scoring Algorithm

Every imported node is evaluated across four core dimensions to produce a normalized score ($S \in [0, 100]$):

$$S = 0.35 \cdot S_{\text{layout}} + 0.30 \cdot S_{\text{style}} + 0.20 \cdot S_{\text{assets}} + 0.15 \cdot S_{\text{tokens}}$$

- **$S_{\text{layout}}$:** Evaluates whether flex/grid structure matches original bounding boxes ($\Delta x, \Delta y < 2\text{px}$).
- **$S_{\text{style}}$:** Evaluates color, opacity, border, and shadow precision.
- **$S_{\text{assets}}$:** Evaluates image resolution, SVG vector integrity, and font availability.
- **$S_{\text{tokens}}$:** Evaluates how cleanly styles were normalized into global design tokens.

### Confidence HUD Badges:
- 🟢 **High Confidence ($90 - 100\%$):** Pixel-perfect semantic match.
- 🟡 **Medium Confidence ($70 - 89\%$):** Minor styling adjustments or font fallbacks applied.
- 🔴 **Review Needed ($< 70\%$):** Complex layout or custom code boundary quarantined.

---

## 4. Visual Diff & Import Correction Workspace

Before committing the import transaction, creators are presented with the **Import Correction Studio**:
1. **Split-Screen Slider:** Slide between the rendered original source preview and the live editable OrbitoX canvas.
2. **Difference Heatmap:** Highlights any visual delta exceeding 5% pixel discrepancy.
3. **One-Click Quick Fixes:** Suggested corrections in the sidebar (e.g. *"Switch 3 absolute cards to Flex Row"*, *"Substitute Playfair Display for missing font"*).

*This concludes the Ingestion Risk Matrix. Proceed to `docs/P26_TARGET_ARCHITECTURE.md`.*
