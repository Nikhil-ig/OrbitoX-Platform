# 🪐 OrbitoX Studio 3.0 — Context Menu Forensic Audit
**Document ID:** `docs/P27/20_CONTEXT_MENU_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Existing Context Menu Analysis

Implemented in `CanvasContextMenu.tsx`:
* Listens to `onContextMenu` in `CanvasWorkspace.tsx`.
* Shows basic actions: Duplicate, Copy, Delete, Bring Forward, Send Backward.

---

## 2. Forensic Deficiencies Identified (Issues #26, #56–#65)

1. **No Empty Canvas Context Menu (Section 57):**
   Right-clicking empty canvas space either triggers browser default context menu or shows an empty/disabled menu without Add Element, Add Section, Paste, Import, or Zoom to Fit.
2. **Missing Submenus and Nesting (Section 65):**
   The menu is a flat list without cascading flyout submenus for "Arrange >", "Align >", "Add >", or "AI >".
3. **Viewport Clipping:**
   When right-clicking near the bottom-right edge of the viewport, the menu overflows off-screen without intelligent boundary detection or upward/leftward flipping.
4. **No Layer Hierarchy Disambiguation (Section 64):**
   When multiple layers overlap at the pointer coordinate, the menu lacks a "Select Layer >" submenu to allow selecting specific parent/child containers.
