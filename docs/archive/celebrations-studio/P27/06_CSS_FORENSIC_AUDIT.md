# 🪐 OrbitoX Studio 3.0 — CSS Forensic Audit
**Document ID:** `docs/P27/06_CSS_FORENSIC_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Executive Forensic Finding: Missing Tailwind & PostCSS

The most critical styling failure in the entire platform is that **Tailwind CSS and PostCSS are completely absent from `orbitox/apps/celebrations`**, yet hundreds of components are authored with Tailwind utility classes.

### Empirical Playwright Probe Proof:
```json
{
  "sheetCount": 3,
  "linkHrefs": [
    "http://localhost:3010/_next/static/css/app/layout.css",
    "http://localhost:3010/_next/static/css/_app-pages-browser_components_studio-zero_index_ts.css"
  ],
  "inlineStyleCount": 169,
  "totalCssRules": 482,
  "hasTailwindFlex": false,
  "totalFlexElements": 0
}
```

### Analysis:
* `apps/celebrations/package.json` contains no dependency on `tailwindcss`, `@tailwindcss/postcss`, or `postcss`.
* No `tailwind.config.js` or `postcss.config.js` exists in the app root.
* Across `BoxModelControl.tsx`, `VisualBoxModel.tsx`, `InspectorHost.tsx`, `TopBar.tsx`, and `StudioShell.tsx`, components specify classes such as:
  `className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col items-center"`
* **Computed Style Result:** The browser receives NO CSS rules for these classes. `display: flex` is not applied (computed `display: block`). Colors, paddings, borders, and margins default to initial browser user-agent styles.

---

## 2. Inline Style Fragmentation (169 Inline Style Declarations)

Because utility classes fail, previous development sessions attempted to fix visual styling by randomly adding inline `style={{ ... }}` declarations.
* In `StudioShell.tsx` alone, over 100 HTML elements use hardcoded inline styles.
* In `CanvasWorkspace.tsx`, inline styles define widths, backgrounds, borders, and z-indexes.
* **The Fragility Penalty:** Inline styles have the highest specificity (`1,0,0,0`), overriding any stylesheet rules and preventing theme token changes from taking effect.

---

## 3. Conflicting CSS Variable Scopes

The codebase contains three separate, competing CSS variable naming systems:
1. `--sz-*` (Used in Studio Zero shell, e.g. `--sz-bg-primary`, `--sz-accent-blue`)
2. `--ui-*` (Used in `@orbitox/ui` packages)
3. `--color-*` / `--font-*` (Injected by template design tokens)

### Collision Trace:
When a template (e.g. `tmpl_celestial_odyssey`) injects its theme variables onto the canvas root, styles leak into the parent DOM tree. If a component uses `var(--color-background)`, it inherits the document's dark gold or violet background instead of the studio chrome's neutral dark gray (`#16181D`), violating the Neutral Chrome Principle (Section 101).

---

## 4. Root-Cause Summary for Broken Visual Controls

| Control | Class / Style Source | Missing / Colliding Element | Rendered Result |
| :--- | :--- | :--- | :--- |
| **Box Model Diagram** | `className="bg-slate-900 border-slate-800 flex"` | No Tailwind compilation | Renders transparent, unaligned block |
| **Scrub Pills** | `className="px-1.5 py-0.5 rounded text-[10px]"` | No Tailwind rules | Text wraps, lacks padding, illegible |
| **Inspector Headers** | Inline `style={{ background: '#181A20' }}` | Inline hardcoded override | Cannot be themed, high contrast borders |
| **Canvas Artboard** | `style={{ transform: rotate(...) }}` | Combined inline string | Breaks when depth plane adds `translate3d` |
| **Section Dividers** | `className="border-dashed border-amber-500/50"` | Missing border color utilities | Invisible or default solid black border |
