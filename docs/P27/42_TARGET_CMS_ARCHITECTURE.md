# 🪐 OrbitoX Studio 3.0 — Target CMS & Data Architecture
**Document ID:** `docs/P27/42_TARGET_CMS_ARCHITECTURE.md`  
**Status:** TARGET ARCHITECTURE SPECIFICATION (PHASE 0)  

---

## 1. Relational Schema & Collection Model (Section 76)

Collections represent structured business data stored in the project document:
* **Field Types:** String, RichText, Number, Boolean, Image, File, Date, Reference (Relationship), Enum.
* **Built-in Collections:** Blog Posts, Team Members, Products, Testimonials, FAQs, Projects.

---

## 2. Direct Canvas Binding Semantics (Section 77)

Normal creators connect CMS data using direct visual handles:
1. Select any element (e.g. Card Heading).
2. Click the Data Binding icon (`Database` / `Link`).
3. Select Collection (e.g. `Team Members`) -> Field (e.g. `fullName`).
4. The canvas immediately previews live data from the active record.

---

## 3. Repeater Containers

* A `Stack` or `Grid` configured as a **Repeater** takes an item template node.
* The renderer iterates over collection items, projecting distinct scoped data into child bindings without cloning static nodes in the scene graph.
