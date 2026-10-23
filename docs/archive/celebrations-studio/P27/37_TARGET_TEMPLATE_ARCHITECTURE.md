# 🪐 OrbitoX Studio 3.0 — Target Template Architecture
**Document ID:** `docs/P27/37_TARGET_TEMPLATE_ARCHITECTURE.md`  
**Status:** TARGET ARCHITECTURE SPECIFICATION (PHASE 0)  

---

## 1. Visual Template Browser & Live Preview (Sections 49–53)

The template experience is rebuilt to emphasize visual immersion:
* **Large Visual Cards:** High-resolution responsive viewport previews (Desktop, Tablet, Mobile).
* **Live Interactive Preview:** Full-screen modal allowing live interaction (scroll, animations, responsiveness) before committing.

---

## 2. Explicit Template Actions (Section 52)

Replacing the ambiguous single "Apply" button with explicit operations:
1. **New Project from Template:** Instantiates a clean document snapshot under the active tenant.
2. **Add Section from Template:** Deep-clones a specific section from the template into the current document, merging required design tokens without overwriting existing sections.
3. **Replace Current Site:** Creates a restore point of the current site, validates the target template schema, instantiates the new site, and provides one-click rollback.
