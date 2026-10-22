# 🪐 OrbitoX Visual Studio — P15 Part 2 Implementation Plan
**Document ID:** `docs/P15_PART_2_IMPLEMENTATION_PLAN.md`  
**Phase:** P15 Part 2 — AI Orchestration & Expert Mode  
**Status:** **COMPLETED**

---

## 1. Objectives

1. **AI As Primary Authoring Metaphor**
   - Implement a floating action bar on the canvas: "Generate section...", "Redesign...", "Write copy...".
   - AI generation must produce standard `SceneGraph` nodes (Box, Text, Image, Section, Form), fully editable via the inspector.
   - Context-aware generation: AI should understand domain context (e.g., `bindings.wedding.date` for Celebrations).

2. **Expert Mode (Developer Handoff)**
   - Add an "Expert Mode" toggle in the Minimalist Top Bar.
   - Extend the Contextual Inspector to reveal advanced properties when Expert Mode is ON:
     - Custom CSS classes (`className`)
     - Custom CSS overrides (`style` object editor)
     - Advanced ARIA attributes
     - Custom interaction hooks (`onClick`, etc.)
   - Maintain Progressive Disclosure: These advanced features must remain completely hidden when Expert Mode is OFF.

## 2. Implementation Steps

### Step 1: Expert Mode Toggle & State [x]
- Add `expertMode` boolean to the central store/context of the Visual Studio.
- Update `OrbitoXVisualStudioTopBar.tsx` to include an "Expert Mode" toggle.

### Step 2: Expert Mode Inspector Panels [x]
- Update `OrbitoXContextualInspector.tsx` to conditionally render advanced property sections.
- Create UI for editing `className`, `style` overrides, ARIA attributes, and custom interaction hooks on SceneGraph nodes.
- Ensure the SceneGraph schema supports these advanced properties (if they don't already).

### Step 3: AI Floating Action Bar [x]
- Create `OrbitoXAIFloatingBar.tsx` rendered within the `OrbitoXVisualCanvas` or main layout, positioned over the canvas.
- Implement UI for actions: "Generate section...", "Redesign...", "Write copy...".

### Step 4: AI Mock Orchestrator [x]
- Since this is a UI prototype/foundation, implement a mock `OrbitoXAIOrchestrator` service that simulates context-aware AI generation.
- The orchestrator will output mock standard `SceneGraph` nodes (e.g., a "Celebrations" specific section with bindings) and insert them into the `SceneGraph`.

### Step 5: Verification [x]
- Verify the Expert Mode toggle shows/hides advanced properties in the inspector.
- Verify the AI Floating Action Bar triggers a mock generation that inserts fully editable SceneGraph nodes.
- Take golden screenshots of Expert Mode and AI generation states.
