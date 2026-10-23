# Section Composition & Composer Audit
**Document ID:** `docs/P27/15_SECTION_AUDIT.md`

## 1. Section Semantics
Sections are modular horizontal blocks (Hero, Features, Pricing, Gallery, CTA, Footer).

## 2. Purge Bug
Inserting or reordering sections changed the scene at index 0, causing `TemplateSchemaService` to wipe out the schema on page reload.
