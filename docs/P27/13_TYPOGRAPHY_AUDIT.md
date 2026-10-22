# 🪐 OrbitoX Studio 3.0 — Typography Forensic Audit
**Document ID:** `docs/P27/13_TYPOGRAPHY_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Font Loading & Font-Face Injection Deficiencies

### The Core Failure:
In `StudioShell.tsx` and `SceneGraphRenderer.tsx`, there is NO automated font-face injection pipeline for custom Google Fonts or uploaded fonts.

### Trace of Issue #9:
1. When a user selects a heading node and changes its `fontFamily` to `'Playfair Display'`, `'Cinzel'`, or `'Outfit'`, the inspector writes:
   `node.style.typography = { fontFamily: 'Playfair Display' }`.
2. `StyleResolver.resolveToCSSProperties` outputs:
   `css.fontFamily = 'Playfair Display'`.
3. **The Silent Failure:** The browser document does NOT have a `<link rel="stylesheet">` or `@font-face` declaration for 'Playfair Display'.
4. Unless the user happens to have that font installed locally on their operating system, the browser silently falls back to `Times New Roman` or system serif.
5. The user sees a broken, default system font and reports: "Typography is unreliable."

---

## 2. Incomplete Typography Property Propagation

In `TextInspector.tsx` vs. `BasicNodeAdapters.tsx`:
* `TextInspector` allows setting `lineHeight`, `letterSpacing`, `textTransform`, and `textAlign`.
* Some text adapters wrap text inside nested `<span>` or `<p>` tags without passing `letterSpacing` or `textTransform` down to the innermost text container, resulting in ignored styles.
* Responsive font scaling (e.g., clamp-based scales) is absent; resizing viewport causes text to overflow container boxes.
