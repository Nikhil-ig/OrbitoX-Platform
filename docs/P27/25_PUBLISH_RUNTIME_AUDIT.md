# 🪐 OrbitoX Studio 3.0 — Publish Runtime Forensic Audit
**Document ID:** `docs/P27/25_PUBLISH_RUNTIME_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Studio vs. Published Drift (Issue #28 & #90)

### Critical Architectural Invariant:
`STUDIO CANVASES == LIVE PREVIEW == PUBLISHED OUTPUT`

### Current Reality:
The published runtime differs significantly from the studio canvas:
1. **Editor-Only Wrapper Styles:** In the studio, `CanvasWorkspace` wraps sections in interactive containers with margin boundaries, hover outlines, and selection affordances. In the published view, these wrappers are stripped, causing layout shifts and alignment discrepancies.
2. **Missing Font Injections in SSR:** In the published guest view, custom fonts loaded dynamically during the studio session are not present in server-side rendered `<head>`, resulting in a flash of unstyled text (FOUT).
3. **No Immutable Published Snapshots:** Publishing currently writes the active draft directly to storage without creating an immutable versioned snapshot. Subsequent edits to the draft alter the live website immediately!
