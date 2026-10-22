# 🪐 OrbitoX Studio 3.0 — Security Forensic Audit
**Document ID:** `docs/P27/28_SECURITY_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Import Sanitization & Script Injection Vulnerabilities

### Current Ingestion Threat:
In `HtmlAdapter.ts` and `OrbitoXUniversalImportModal.tsx`, raw HTML strings are parsed into DOM nodes.
* **Vulnerability:** If imported HTML contains `<script>`, `onload=...`, or `javascript:...` URI schemes, and these nodes are rendered directly into the canvas or published guest page without sanitization, arbitrary JavaScript executes in the context of the user's authenticated session (XSS).
* **Missing Boundary:** Custom React or third-party web components lack an isolated iframe runtime boundary, allowing untrusted code to access `window.__studioStore` or local storage tokens.

---

## 2. Server-Side Execution Invariant (Section 92)

* Untrusted code from imported templates (Liquid, PHP, Python, Node) must NEVER be executed on the server.
* The import engine must strictly use AST static analysis and sandboxed worker environments to transform structure into safe SceneGraph nodes.
