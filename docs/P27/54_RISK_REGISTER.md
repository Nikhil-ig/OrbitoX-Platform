# 🪐 OrbitoX Studio 3.0 — Comprehensive Risk Register
**Document ID:** `docs/P27/54_RISK_REGISTER.md`  
**Status:** IMPLEMENTATION PLANNING (PHASE 0)  

---

## 1. Technical & Architectural Risk Assessment

| Risk ID | Description | Likelihood | Impact | Severity | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | Tailwind compilation conflicts with legacy CSS classes | Medium | High | **HIGH** | Scope Tailwind strictly to `./components` and `./app`; use CSS prefix if class collisions occur. |
| **RSK-02** | Stored schema migration corrupts existing saved projects | Medium | Critical | **CRITICAL** | Implement `DocumentSchemaMigrator` with automated backups and fallback to original JSON. |
| **RSK-03** | Removing selection overlay pointer events breaks handle dragging | Low | High | **MEDIUM** | Ensure transform handles retain `pointerEvents: 'auto'` and `setPointerCapture`. |
| **RSK-04** | Large imported HTML structures overload SceneGraph tree | Medium | High | **HIGH** | Enforce node capping during ingestion; collapse deeply nested trivial wrapper divs. |
| **RSK-05** | Three.js WebGL bundle bloats initial page load | High | High | **HIGH** | Use Next.js dynamic import `{ ssr: false }` for 3D workspace; load only when 3D node exists. |
| **RSK-06** | Browser IndexedDB quota exceeded by large uncompressed images | Medium | Medium | **MEDIUM** | Compress images to WebP client-side before caching; offload to S3/R2 cloud storage. |
| **RSK-07** | Custom fonts fail CORS or CSP policies | Medium | Medium | **MEDIUM** | Proxy font requests or embed Google Fonts via official stylesheet links. |
| **RSK-08** | Multi-tenant domain routing exposes cross-tenant draft pages | Low | Critical | **CRITICAL** | Validate tenant context strictly in middleware via `AsyncLocalStorage` and database constraints. |
