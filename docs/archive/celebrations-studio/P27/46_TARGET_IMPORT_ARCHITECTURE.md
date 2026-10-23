# 🪐 OrbitoX Studio 3.0 — Target Universal Import Architecture
**Document ID:** `docs/P27/46_TARGET_IMPORT_ARCHITECTURE.md`  
**Status:** TARGET ARCHITECTURE SPECIFICATION (PHASE 0)  

---

## 1. Zero-Friction Universal Ingestion (Section 27)

The import experience is simplified to a single primary affordance:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       UNIVERSAL INTAKE DROPZONE                             │
│                                                                             │
│                 "Drop anything into OrbitoX Studio"                         │
│            Files • HTML • React • Figma Tokens • ZIP • URLs                 │
│                                                                             │
│             [ Choose Files ]              [ Paste URL ]                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Four-Stage Import Pipeline

```
[User Drops File or Pastes Code/URL]
       │
       ▼
[Stage 1: Automatic Detection]
       ├── Magic bytes, MIME type, file extension, or code heuristics
       └── Routes to appropriate adapter: HTML, React, Figma, Shopify, WordPress, URL
       │
       ▼
[Stage 2: Semantic Analysis & AST Parsing]
       ├── Extracts semantic headings, paragraphs, buttons, images, layout containers
       ├── Extracts color palette, typography tokens, spacing rules
       └── Analyzes interactions and state bindings
       │
       ▼
[Stage 3: Normalization to Import IR]
       ├── Generates normalized `OrbitoXImportIR`
       ├── Flags confidence tiers: Native, Hybrid, Custom Runtime
       └── Attaches source code mappings for expert mode
       │
       ▼
[Stage 4: Project Instantiation & Canvas Mounting]
       ├── Merges tokens into project design system
       ├── Appends or instantiates editable sections
       └── Creator can immediately select, move, restyle, and publish!
```
