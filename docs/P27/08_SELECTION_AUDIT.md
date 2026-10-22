# Selection Architecture Audit
**Document ID:** `docs/P27/08_SELECTION_AUDIT.md`

## 1. Current Selection Architecture
Single node selection is tracked via `ui.selection.nodeId`. Multi-selection is tracked via `ui.selection.nodeIds`.

## 2. Requirements
- Zero-event pass-through on selection box interior.
- 5px perimeter drag strips and title badge for container dragging.
- 8 perimeter handles with `pointerEvents: 'auto'` and `zIndex: 45`.
