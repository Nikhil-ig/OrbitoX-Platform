# 🪐 OrbitoX Studio 3.0 — Interoperability Research & Protocols
**Document ID:** `docs/P27/31_INTEROPERABILITY_RESEARCH.md`  
**Status:** ARCHITECTURAL SPECIFICATION (PHASE 0)  

---

## 1. Supported Official & Authorized Integration Protocols

To avoid brittle, undocumented proprietary file reverse-engineering (Sections 36–41), OrbitoX adheres to legitimate, standard integration channels:

| Platform | Authorized Integration Path | Mapping Target | Fidelity Tier |
| :--- | :--- | :--- | :--- |
| **Figma** | Official Figma REST API (`GET /v1/files/:key`) & Plugin Bridge | Frame -> Frame, Text -> Text, AutoLayout -> Stack | **Native (95%)** |
| **Adobe XD** | Structured SVG Export & XD Plugin Bridge | Layers -> SceneGraph nodes | **Hybrid (80%)** |
| **Canva** | Canva HTML5 Export Engine | Semantic HTML elements -> OrbitoX nodes | **Native (90%)** |
| **Shopify** | Dawn Theme Liquid/JSON Schemas | Templates -> Pages, Sections -> Sections, Blocks -> Elements | **Native (90%)** |
| **WordPress** | Block Editor `theme.json` & block markup (`<!-- wp:... -->`) | Patterns -> Section Templates, Blocks -> Elements | **Native (90%)** |
| **Public URLs** | Safe Headless Crawler (HTML/CSS extraction) | Semantic DOM trees -> SceneGraph | **Hybrid (75%)** |
