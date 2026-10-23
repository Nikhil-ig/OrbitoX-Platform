# 🪐 OrbitoX Studio 3.0 — Migration Strategy
**Document ID:** `docs/P27/47_MIGRATION_STRATEGY.md`  
**Status:** IMPLEMENTATION PLANNING (PHASE 0)  

---

## 1. Dual-Run Architecture & Zero-Downtime Migration

To guarantee stability and prevent regressions during the rebuild:
* **Feature Flag Isolation:** The rebuild will operate behind a deterministic runtime flag: `process.env.NEXT_PUBLIC_ORBITOX_STUDIO_V3 === 'true'`.
* **Legacy Compatibility:** Existing blueprints and saved schemas will be migrated non-destructively through a schema normalization adapter (`DocumentSchemaMigrator.v2ToV3(legacySchema)`).
* **Dual Run Verification:** During Phases 1 through 5, legacy routes remain accessible while tests run parallel validations comparing rendering fidelity between v2 and v3.

---

## 2. Six-Phase Rebuild Progression

```
Phase 1: Toolchain & Core Engine Foundation (Tailwind, PostCSS, Document Schema, Store)
Phase 2: Spatial Canvas & Direct Manipulation (Hit-testing, Zero-event overlays, 8-handle resize)
Phase 3: Contextual Inspector & Unified Box Model (Smart controls, Box model, Radius, Design tokens)
Phase 4: Section Flow, Add Center & Template Engine (Drag-reorder, Section insertion, Live browser)
Phase 5: Universal Intake & Asset Pipeline (File drop, Multi-MIME clipboard, Cloud asset vault)
Phase 6: Multi-Tenant Backend, Publishing & Final Acceptance (Postgres schema, REST APIs, E2E verification)
```
