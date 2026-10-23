# 🪐 OrbitoX Studio 3.0 — CMS & Data Binding Forensic Audit
**Document ID:** `docs/P27/21_CMS_DATA_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Existing Data Panel & CMS Implementation

Located in `DataPanel.tsx`:
* Exposes variable binding (`onBindVariable`) and collection repeater binding (`onBindCollection`).
* Dispatches `SG_SET_BINDING` or updates node `repeater: { arrayFieldKey, itemTemplateNodeId }`.

---

## 2. Forensic Deficiencies Identified (Issue #12)

1. **Unbacked CMS Collections:**
   Collections (e.g. `products`, `team`, `posts`) are mock JavaScript objects defined locally in `StudioData.ts`. There is no CRUD interface to add records, define schemas, or import CSVs.
2. **Repeater Render Desynchronization:**
   In `SceneGraphRenderer.tsx`, repeater execution dynamically multiplies DOM elements. However, `CanvasInteractionLayer` measures nodes based on static scene graph IDs, meaning repeated items cannot be individually selected or styled.
3. **Missing Relational Filtering & Sorting:**
   Bindings cannot specify conditions (e.g. `category == 'featured'`) or sorting (`order by date desc`).
