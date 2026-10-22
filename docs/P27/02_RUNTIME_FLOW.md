# 🪐 OrbitoX Studio 3.0 — Runtime Flow Tracing
**Document ID:** `docs/P27/02_RUNTIME_FLOW.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Application Bootstrapping Flow

The runtime flow begins when the user visits `/admin/template-studio?template=saas-nextgen`.

```
[User Browser Request]
       │
       ▼
/admin/template-studio/page.tsx
       │  (Dynamic Import with ssr: false)
       ▼
Suspense Fallback ("Initializing OrbitoX Visual Studio Zero...")
       │
       ▼ (Client hydration complete)
StudioShell.tsx mounted
       │
       ├── Reads search params: slug = 'saas-nextgen'
       ├── Calls TemplateSchemaService.getSchema(slug)
       │      ├── Checks localStorage (`orbitox_celebrations_template_schema_saas-nextgen`)
       │      │      └── BUG: If scene[0].id != blueprint.scenes[0].id -> Discards localStorage!
       │      └── Fallback to BLUEPRINT_CATALOG[slug]
       │
       ▼
TemplateEditorProvider({ initialSchema })
       │  (Stores initialSchema into useRef)
       │  BUG: When slug changes, useRef is NOT reinitialized!
       ▼
TemplateEditorStore instantiated
       │  (State: draft.schema, ui.selection, history)
       ▼
StudioShell Children Mount:
       ├── TopBar
       ├── LeftRail
       ├── CanvasWorkspace
       │      ├── SceneGraphRenderer (Renders DOM for nodes)
       │      └── CanvasInteractionLayer (Starts RAF measurement loop)
       └── InspectorHost (Mounts SectionInspector if no node selected)
```

---

## 2. Pointer Down & Hit-Testing Execution Flow

When a user clicks on an element in the canvas:

```
[User Clicks Element] (e.g. Hero Headline Button)
       │
       ▼
Pointer Event Reaches DOM
       │
       ├── SCENARIO A: An existing element is ALREADY selected.
       │      ├── div#canvas-active-selection-box sits at zIndex: 35 with pointerEvents: 'auto'
       │      ├── Selection box COVERS the bounding rect of the previously selected node.
       │      ├── Event NEVER hits the underlying element!
       │      └── handleBoxPointerDown is invoked on the PREVIOUS element instead of the target!
       │      └── RESULT: User drags or selects the wrong element (Ghost Dragging).
       │
       └── SCENARIO B: No element currently selected.
              ├── Event reaches DOM node rendered by SceneGraphRenderer.
              ├── handleContainerClick in SceneGraphRenderer captures event.
              ├── target.closest('[data-node-id]') extracts nodeId.
              ├── Calls onNodeClick(nodeId).
              └── Controller dispatches SELECT_NODE -> updates store.
```

---

## 3. Node Mutation & Style Application Flow

When a property is edited in the right sidebar (e.g., Box Model padding):

```
[User Scrubs Padding in BoxModelControl]
       │
       ▼
onChangePadding('top', '24px')
       │
       ▼
VisualBoxModel -> onPaddingChange('top', '24px')
       │
       ▼
FrameInspector -> onUpdateStyle(nodeId, { paddingTop: '24px' })
       │
       ▼
StudioShell -> handleUpdateStyle -> controller.dispatch('SG_UPDATE_STYLE')
       │
       ▼
TemplateEditorStore -> Reducer updates draft.schema.scenes[...].nodes[nodeId].style.paddingTop
       │
       ▼
Store emits notification -> useSyncExternalStore triggers React re-render
       │
       ▼
SceneGraphRenderer -> NodeRenderer -> StyleResolver.resolveToCSSProperties
       │
       ├── Evaluates style.paddingTop
       ├── Constructs React.CSSProperties object
       └── Passes css to DOM node's style attribute
              │
              └── BUG: If component is rendered via an adapter with hardcoded CSS or classes,
                       the inline style is overridden or ignored.
```

---

## 4. Section Drag-and-Drop & Reorder Flow

When a user drags a section in the page tree to reorder:

```
[User Reorders Section 2 to Section 0]
       │
       ▼
PageTreePanel -> onReorderSections(1, 0)
       │
       ▼
StudioShell -> handleReorderScenes
       │
       ▼
controller.dispatch('REORDER_SCENES', { fromIndex: 1, toIndex: 0 })
       │
       ▼
Store mutates array order of scenes
       │
       ▼
CanvasWorkspace re-renders with new section order
       │
       ▼
User saves project (or autosave triggers)
       │
       ▼
localStorage stores new schema with updated scenes[0].id
       │
       ▼
[User Refreshes Browser]
       │
       ▼
TemplateSchemaService.getSchema(slug)
       │
       ├── Reads localStorage
       ├── Checks: if (parsed.scenes[0].id !== blueprint.scenes[0].id) schema = null;
       └── PURGES USER EDIT! Loads original blueprint!
```
