# 🪐 OrbitoX P26 — Universal Adapter Pipeline Architecture
**Document ID:** `docs/P26_ADAPTER_ARCHITECTURE.md`  
**Phase:** P26 Phase 0 (Pipeline Engineering)  
**Status:** ARCHITECTURAL SPECIFICATION  
**Author:** Principal Front-End & Creative Tool Architect  
**Date:** October 2026  

---

## 1. Executive Summary & Design Principle

The **Universal Adapter Pipeline** coordinates the end-to-end ingestion lifecycle. Rather than coupling parsers directly to user interfaces or editors, all ingestion operations flow through an extensible, decoupled pipeline of discrete stages:

$$\textbf{Source} \longrightarrow \textbf{Adapter} \longrightarrow \textbf{IR} \longrightarrow \textbf{Analyzers} \longrightarrow \textbf{Mapping} \longrightarrow \textbf{Safety} \longrightarrow \textbf{Transaction}$$

---

## 2. Universal Adapter Interface (`SourceAdapter`)

Every adapter implements the unified `SourceAdapter` contract:

```typescript
export interface SourceAdapterOptions {
  importMode: 'full_project' | 'page' | 'section' | 'component' | 'tokens_only' | 'clipboard';
  targetPageId?: string;
  targetSectionId?: string;
  preserveOriginalIds?: boolean;
  extractDesignTokens?: boolean;
  localizeRemoteAssets?: boolean;
  inferResponsiveRules?: boolean;
}

export interface AdapterParseResult {
  success: boolean;
  projectIR: ImportedProject;
  warnings: string[];
  errors: string[];
  executionTimeMs: number;
}

export interface SourceAdapter<TRawInput = unknown> {
  readonly id: string;
  readonly name: string;
  readonly supportedExtensions: string[];
  readonly supportedMimeTypes: string[];

  /** Quick heuristic check to determine if this adapter can handle the payload */
  canHandle(input: TRawInput): Promise<boolean> | boolean;

  /** Parse raw payload into normalized Import IR */
  parse(input: TRawInput, options: SourceAdapterOptions): Promise<AdapterParseResult>;
}
```

---

## 3. Pipeline Stages & Architectural Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        STAGE 1: INPUT INGESTION                        │
│   File Upload (.zip, .fig, .html)  │  URL Fetch  │  Clipboard Event    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        STAGE 2: ADAPTER PARSING                        │
│   FigmaAdapter │ ShopifyAdapter │ HtmlAdapter │ ReactAdapter │ ...    │
│            Emits: Raw Universal Import IR (ImportedProject)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   STAGE 3: SEMANTIC ANALYSIS & INFERENCE               │
│   1. Design Token Extractor (Color clustering, Typography scale)       │
│   2. Asset Localizer (Fetch remote images, staging into IndexedDB)    │
│   3. Layout Inferrer (Convert absolute coordinates to Flex/Grid)       │
│   4. Component Detector (Identify repeating cards, navbars, footers)   │
│   5. Responsive Art Direction (Match mobile/tablet viewport rules)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        STAGE 4: SAFETY SANITIZATION                    │
│   DOMPurify (XSS removal) │ Script Isolation │ Custom Code Quarantine  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   STAGE 5: PREVIEW & INTERACTIVE MAPPING               │
│   Split-Screen Visual Diff │ Confidence Score HUD │ Token Customizer   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      STAGE 6: ATOMIC IMPORT TRANSACTION                │
│   Begin Transaction │ Hydrate SceneGraph │ Update Store │ Commit History│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Deep Stage Analysis

### 4.1 Stage 3A: Semantic Design Token Extractor
1. **Color Quantization:** Gathers all hex, rgb, and hsl color values across all nodes.
2. **Delta-E Clustering:** Uses CIEDE2000 color difference algorithms. Colors with $\Delta E < 3.0$ are clustered into a unified design token (e.g. `#1e293b` and `#1f2a3c` become `tokens.colors.surfacePrimary`).
3. **Role Assignment:** Evaluates usage frequency and luminance to automatically assign tokens to `primary`, `background`, `surface`, `accent`, and `text`.

### 4.2 Stage 3B: Layout Inferrer (Absolute $\longrightarrow$ Flex / Grid)
Many external sources (Adobe XD, Canva, un-auto-layouted Figma, or legacy HTML) position elements absolutely.
The **Layout Inferrer**:
- Sorts sibling elements by vertical ($y$) and horizontal ($x$) position.
- Determines if elements form a single vertical column ($y_{n+1} \ge y_n + h_n$). If true $\longrightarrow$ `layoutMode: 'flex'`, `direction: 'vertical'`.
- Determines if elements form a horizontal row ($x_{n+1} \ge x_n + w_n$). If true $\longrightarrow$ `layoutMode: 'flex'`, `direction: 'horizontal'`.
- Evaluates repeated equal-width boxes $\longrightarrow$ converts into CSS `grid` with auto-fit columns.
- Preserves absolute positioning only when elements deliberately overlap (e.g. badges on cards, floating decorative stars).

### 4.3 Stage 3C: Component Detector
- Identifies subtrees with identical node topology, tag structure, and class signatures (e.g. 3 product cards or 4 pricing tiers).
- Automatically extracts the pattern into an `ImportedComponent` master definition, converting the instances on the page into instances referencing that master with property overrides (`title`, `price`, `image`).

---

## 5. Import Modes & Destinations

| Mode | Input Scope | Destination in OrbitoX | Behavior |
|:---|:---|:---|:---|
| **Full Project** | Multi-page site, full theme, or complex Figma file | Replaces or boots entire project | Creates all pages, registers global tokens, sets up master components. |
| **New Page** | Single HTML page or Figma frame | Inserts as a new page in `pages[]` | Connects page route, preserves existing project tokens. |
| **Section Append** | Single section or block | Appends to active scene / page | Adds new `TemplateSceneDefinition` and registers child nodes in SceneGraph. |
| **Component Library** | Symbol set or snippet | Stored in reusable component drawer | Instantiable anytime onto any canvas. |
| **Clipboard Paste** | User presses Cmd+V with external payload | Pastes at cursor position / into selected parent | Generates fresh node IDs, infers layout, and executes within undoable transaction. |

---

## 6. Atomic Import Transactions & Rollback Guarantees

An import must **never** leave the editor in a half-corrupted or broken state:
1. `dispatch({ type: 'BEGIN_TRANSACTION', label: 'Import: ' + sourceName })`
2. Validate and stage all changes in memory.
3. If an error occurs during parsing, asset fetching, or mapping:
   - Abort immediately.
   - Dispatch `CANCEL_TRANSACTION`.
   - Present a detailed error recovery dialog to the user without mutating the existing project.
4. Only upon 100% successful validation:
   - Hydrate new SceneGraph nodes.
   - Dispatch `COMMIT_TRANSACTION`.
   - Record in history stack for immediate `Cmd+Z` undoability.

*This concludes the adapter architecture specification. Proceed to tool-specific strategy documents.*
