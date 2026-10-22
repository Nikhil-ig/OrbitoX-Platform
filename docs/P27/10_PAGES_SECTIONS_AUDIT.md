# 🪐 OrbitoX Studio 3.0 — Pages & Sections Forensic Audit
**Document ID:** `docs/P27/10_PAGES_SECTIONS_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. The Fatal Persistence Purge Bug (Issues #17, #18, #89)

### Exact Forensic Trace:
In `TemplateSchemaService.ts` lines 27–35:
```typescript
const stored = localStorage.getItem(`${STORAGE_PREFIX}${slug}`);
if (stored) {
  const parsed = JSON.parse(stored) as TemplateSchema;
  const blueprint = BLUEPRINT_CATALOG[slug];
  // Invalidate stale fallback if stored schema does not match blueprint architecture
  if (blueprint && parsed.scenes?.[0]?.id !== blueprint.scenes?.[0]?.id && parsed.scenes?.[0]?.slug !== blueprint.scenes?.[0]?.slug) {
    schema = null; // <--- CATASTROPHIC PURGE!
  } else {
    schema = parsed;
  }
}
```

### Mechanism of Destruction:
1. When a user adds a section above the hero (position: 0), or moves an existing section (e.g., Gallery or Pricing) to the top of the page, the array order of `scenes` changes.
2. `parsed.scenes[0].id` is now `scene_pricing_custom` or `scene_gallery`.
3. However, `blueprint.scenes[0].id` is still `scene_saas_hero`.
4. When the user reloads the browser, `TemplateSchemaService.getSchema(slug)` evaluates the condition:
   `parsed.scenes[0].id !== blueprint.scenes[0].id` -> TRUE!
5. It sets `schema = null` and loads the default unmodified blueprint from `BLUEPRINT_CATALOG`!
6. **Result:** Every time a user inserts a section at the top, moves a section to the top, or reorders scenes, their entire project is silently purged upon browser refresh!

---

## 2. Section Insertion Behavior (Issue #17 & #20)

* **Current Implementation:**
  Clicking the `+` affordance between sections invokes `onAddSection(pos)`. This opens `AddPanel` in the left drawer. Selecting a section calls `handleAddSection(targetInsertPosition)`.
* **Flaws:**
  1. `targetInsertPosition` is stored in local React state in `StudioShell`. If the user clicks elsewhere or closes the drawer, the insertion position is lost or resets to the end of the page.
  2. The added section generates IDs based on `Date.now()`, which can collide during rapid actions.
  3. When an imported section is inserted, its design tokens are not merged into `schema.designTokens`, causing missing colors and broken typography.

---

## 3. Pages Architecture (Issue #54)

* In single-page templates (e.g. `saas-nextgen`), `schema.pages` is `undefined`. `StudioShell` falls back to treating `schema.scenes` as a single flat page.
* When pages are explicitly defined in multi-page templates, `page.sectionIds` references scenes in the global array.
* However, deleting a page does not clean up orphan scenes in `schema.scenes`, causing silent memory leaks and bloated JSON payloads.
