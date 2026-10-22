# 🪐 OrbitoX Studio 3.0 — Component System Forensic Audit
**Document ID:** `docs/P27/15_COMPONENT_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Master Component vs. Instance Architecture

In `TemplateSchema.ts`:
* Master components are stored in `schema.masterComponents: Record<string, MasterComponentDefinition>`.
* Instances are nodes with `node.component = { masterComponentId, overrides }`.

---

## 2. Forensic Flaws & Instability (Issue #11)

1. **Lack of Slot Architecture:**
   Instances cannot declare named child slots (e.g. `<Slot name="icon" />` or `<Slot name="children" />`). Inserting a new child node into a component instance silently attaches the node to the master component or fails to render.
2. **Override Mutation Leakage:**
   In `ComponentsPanel.tsx` and `InspectorHost.tsx`:
   * Editing properties on an instance can accidentally mutate the master definition if `node.component.masterComponentId` is passed directly to `onUpdateNode`.
   * Resetting overrides (`handleResetOverrides`) frequently leaves orphaned child node overrides in the state.
3. **Detachment Desynchronization:**
   When detaching an instance (`handleDetachInstance`), the node graph must deep-clone the master's subtree and generate new unique IDs for every child. In the current implementation, child IDs are preserved, causing duplicate ID collisions across the scene graph.
