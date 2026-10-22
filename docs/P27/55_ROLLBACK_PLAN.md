# 🪐 OrbitoX Studio 3.0 — Rollback & Recovery Plan
**Document ID:** `docs/P27/55_ROLLBACK_PLAN.md`  
**Status:** IMPLEMENTATION PLANNING (PHASE 0)  

---

## 1. Instant Rollback Mechanism

* **Feature Flag Reversion:** If unexpected regressions emerge during implementation testing, setting `NEXT_PUBLIC_ORBITOX_STUDIO_V3=false` immediately falls back to legacy `TemplateStudio`/`StudioZero` routing.
* **Database Snapshot Restoration:** All schema migrations are reversible via Prisma down-migrations. Active stores continue functioning on existing legacy models.
* **Client-Side Cache Isolation:** Studio v3 uses storage keys with prefix `orbitox_studio_v3_`, ensuring that legacy `orbitox_celebrations_template_schema_*` caches are preserved untouched.
