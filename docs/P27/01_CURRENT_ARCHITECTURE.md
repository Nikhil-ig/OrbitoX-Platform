# Current Architecture Audit
**Document ID:** `docs/P27/01_CURRENT_ARCHITECTURE.md`

## 1. System Topology
The current visual editor is split across two divergent module trees:
1. `components/template-studio/`: Original single-page wedding invitation and event editor.
2. `components/studio-zero/`: Multi-page, auto-layout, continuous canvas editor intended for general SaaS/Web creation.

## 2. Architecture Collision Points
- **Dual Component Sets:** Two distinct property panels exist: `studio-zero/PropertiesPanel.tsx` (2,826 lines) and `studio-zero/inspectors/InspectorHost.tsx` (337 lines). The shell mounts `InspectorHost`, leaving `PropertiesPanel` dead.
- **Dual Layers Panels:** `studio-zero/LayersPanel.tsx` (532 lines) is unmounted while `studio-zero/navigation/PageTreePanel.tsx` (672 lines) is mounted.
- **Store Desynchronization:** `TemplateEditorStore` maintains `draft.schema` while local component state inside canvas interaction layers caches transient drag coordinates in parallel refs.
