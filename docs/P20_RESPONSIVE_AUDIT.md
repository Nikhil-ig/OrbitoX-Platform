# 🪐 OrbitoX Studio — P20 Responsive Art Direction Audit
**Document ID:** `docs/P20_RESPONSIVE_AUDIT.md`  
**Phase:** P20 — Phase 0: Forensic Audit & Rebuild Planning  
**Date:** October 3, 2026  
**Auditor:** Principal Responsive Web Architect  
**Status:** **AUDIT COMPLETE (AWAITING USER APPROVAL)**

---

## 1. Executive Summary: Responsive Design Beyond Pixel Scaling

In standard website builders, "responsive mode" often degenerates into shrinking the desktop artboard. However, professional responsive art direction requires **structural adaptation**:

Desktop:
$$\begin{bmatrix} \text{Headline} & \text{Lead Copy} \\ \text{Hero Visual} & \text{Interactive 3D} \end{bmatrix} \quad (\text{Horizontal Split, Row Layout})$$

Mobile:
$$\begin{bmatrix} \text{Hero Visual} \\ \text{Headline} \\ \text{Lead Copy} \\ \text{CTA Button} \end{bmatrix} \quad (\text{Vertical Column, Reordered, 3D Hidden})$$

The current OrbitoX engine supports basic numeric overrides (`width`, `height`, `x`, `y`), but **struggles with structural changes (layout direction, child ordering, and visibility)**.

---

## 2. Forensic Analysis of Current Responsive Architecture

### 2.1 The Cascade Implementation in `StyleResolver.ts`
Lines 45–60:
```typescript
if (device === 'tablet') {
  applyOverride('tablet');
} else if (device === 'mobile') {
  applyOverride('tablet');
  applyOverride('mobile');
}
```
- **Strengths**: The base desktop styles correctly cascade down to Tablet and Mobile. Overrides applied at Tablet cascade down to Mobile unless overridden at Mobile.
- **Flaws**:
  1. `applyOverride` performs shallow/deep merges on `geometry` and `style`, but does not properly handle layout switching from `direction: 'row'` to `direction: 'column'`.
  2. In `SceneGraphRenderer.tsx`, child nodes inside auto-layout containers compute flex sizing (`flex: 1` or `width: auto`) based on the parent's base layout, ignoring mobile layout overrides.
  3. The right inspector lacks visual indicators showing whether a given input is currently **Inherited from Desktop** or **Overridden Locally on Mobile**.

---

## 3. Target Responsive Art Direction Model

### 3.1 Primary vs. Secondary Breakpoint Contract
Following the Figma Sites & Webflow benchmark:
- **Desktop (1440px - Primary)**:
  - Base document truth.
  - Adding an element, updating global tokens, or modifying text content applies across all breakpoints.
- **Tablet (768px - Secondary)**:
  - Inherits from Desktop.
  - Edits create localized Tablet overrides (`node.responsive.tablet`).
  - Tablet overrides cascade to Mobile.
- **Mobile (390px - Secondary)**:
  - Inherits from Tablet (or Desktop if no Tablet override exists).
  - Edits create localized Mobile overrides (`node.responsive.mobile`).

### 3.2 Required Structural Responsive Capabilities:
1. **Layout Direction Reversal**:
   - Desktop: `layoutConfig.direction = 'row'`
   - Mobile: `layoutConfig.direction = 'column'`
2. **Visual Child Reordering**:
   - `responsive[mobile].order`: Allows moving an image above a headline on mobile without altering desktop DOM flow.
3. **Selective Device Visibility**:
   - `responsive[mobile].hidden = true`: Hides heavy decorative elements or 3D canvases on mobile to guarantee 60 FPS performance and rapid mobile LCP.
4. **Fluid Typography Scales**:
   - Headings adapt via `clamp(min, preferred, max)` or explicit mobile font sizes (`32px` on Mobile vs `72px` on Desktop).

---

## 4. Inspector Responsive UI Specifications

In the right inspector:
- When viewing **Desktop**: All property labels render normally.
- When viewing **Mobile**:
  - Properties that are **Inherited** display a subtle blue dot or muted gray text:  
    `[ · ] Width: 100% (Inherited from Desktop)`
  - Properties that have a **Local Override** display a bright amber/blue badge with an un-link action:  
    `[ ⦿ ] Width: 320px (Mobile Override) [ ✕ Reset ]`
  - Clicking `Reset` deletes `node.responsive.mobile[property]` and instantly snaps back to the inherited desktop value.
