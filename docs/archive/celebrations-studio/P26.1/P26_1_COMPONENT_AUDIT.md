# P26.1 Forensic Audit: Component Master/Instance Architecture & Automated Detection

## 1. Executive Summary

A professional creative platform (Figma, Framer, Webflow) relies on **Components** as the primary weapon against design entropy. When a creator edits a Master Component, all instances automatically update, while preserving legitimate localized overrides (such as individual text strings, button labels, or image URLs).

In the current OrbitoX Studio Zero:
- `ComponentsPanel.tsx` has basic master/instance data structures (`isMaster`, `masterComponentId`, `instanceOverrides`).
- However, during external site/code/theme import, repeated structures (e.g. 12 pricing cards, 8 team member cards, 6 testimonial blocks) are imported as 12 detached, independent frames. This burdens the creator with maintaining 12 duplicate copies.
- Automated structural similarity analysis is needed during import to cluster repeated DOM trees into a single Master Component with instances.

---

## 2. Current Implementation Audit

### 2.1 File: `orbitox/apps/celebrations/components/studio-zero/ComponentsPanel.tsx`
- **Total Lines**: 589 lines
- **Capabilities Present**:
  - `onCreateComponent(nodeId)`: Converts node into a master component (❖).
  - `onInstantiateComponent(masterId)`: Clones master as an instance (◇).
  - `onPushToMaster(nodeId)`: Propagates instance property changes to master.
  - `onResetOverrides(nodeId)`: Restores instance to exact master state.
  - `onDetachInstance(nodeId)`: Unlinks instance into plain scene graph nodes.
- **Deficiencies**:
  - Lacks visual component variant management (e.g. `Button: Primary | Secondary | Ghost | Danger`).
  - Lacks auto-exposed component property schemas (Props panel: `Title`, `Subtitle`, `Icon`, `Button Link`).
  - Importer core does not run an automatic component inference pass on parsed HTML/JSX/Shopify blocks.

---

## 3. Automated Component Detection During Import

When an external site, HTML document, or theme is parsed into `ImportIR`:

```
Imported Section Nodes (e.g. 48 raw nodes)
         │
         ▼
┌──────────────────────────────────────────────┐
│ 1. Structural Subtree Fingerprinting         │  Compute structural hash:
│    (Node kind sequence, CSS class footprint, │  Frame -> Image + H3 + P + Button
│     depth, children count)                   │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ 2. Subtree Clustering & Frequency Analysis   │  Identify clusters where occurrences >= 3
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ 3. Property Variance Extraction              │  Diff content between instances:
│                                              │  - title varies -> prop "heading"
│                                              │  - image varies -> prop "avatar"
│                                              │  - text varies  -> prop "quote"
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ 4. Master / Instance IR Generation           │  1 Master Component in Library
│                                              │  N Instances with auto-bound props
└──────────────────────────────────────────────┘
```

### 3.1 Creator Acceptance Experience
In the import summary review step, OrbitoX displays:
```
✨ 16 Reusable Components Detected:
   • Feature Card (12 instances found in Features Section)
   • Team Member Avatar (8 instances found in About Section)
   • Pricing Tier Column (3 instances found in Pricing Section)

   [Convert to Master Components] (Recommended)    [Keep as Detached Layers]
```
If the user accepts, the project is created with clean, maintainable masters and instances.

---

## 4. Master-Instance Synchronization Contract

1. **Hierarchy Integrity**: Adding a child node to the Master Component automatically inserts that child into all instances at the exact same relative hierarchy index.
2. **Override Isolation**: If an instance has overridden `textContent: "Enterprise Plan"`, editing the Master Component's background color or padding updates the instance, but preserves `"Enterprise Plan"`.
3. **Push to Master**: Selecting an instance with modified spacing or colors and clicking `Push to Master` updates the Master and all other instances, while retaining existing localized text overrides.
