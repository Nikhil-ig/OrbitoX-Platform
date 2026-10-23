# 🪐 OrbitoX Studio 3.0 — Template System Forensic Audit
**Document ID:** `docs/P27/17_TEMPLATE_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. The Template Switching Freeze Bug (Issue #16)

### Forensic Root Cause:
In `TemplateEditorController.tsx` lines 461–466:
```typescript
export function TemplateEditorProvider({ initialSchema, children }: TemplateEditorProviderProps) {
  const storeRef = useRef<TemplateEditorStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = new TemplateEditorStore(initialSchema);
  }
  const store = storeRef.current;
  ...
}
```
And in `StudioShell.tsx` lines 84–88:
```tsx
<TemplateEditorProvider initialSchema={initialSchema}>
  ...
</TemplateEditorProvider>
```

### Trace:
* When the user clicks "Use Template" in the template drawer, or changes the URL to `?template=amalfi-coastal`, `initialSchema` recalculates.
* However, because `<TemplateEditorProvider>` does NOT have a `key={initialSchema.id}` or `key={slug}`, React does not unmount the provider.
* Inside `TemplateEditorProvider`, `storeRef.current` is already defined from the previous template.
* The `if (!storeRef.current)` condition evaluates to `false`.
* The newly passed `initialSchema` is completely discarded! The store remains on the old template forever!
* **User Experience:** The user clicks "Apply" or "Use", the URL updates, but the canvas remains completely unchanged, leading to: "Template switching appears to do nothing."

---

## 2. Technical Template UI (Issue #15)

* The template browser renders tiny 320px drawers with raw database-like schema names (`tmpl_saas_nextgen`), scene counts, and raw category tags.
* There is no full-screen visual template browser, no live multi-device preview modal, and no clear separation between:
  1. Creating a New Project from Template
  2. Adding a Section from Template
  3. Replacing Current Site with Template
