# Hit Testing & Pointer Routing Audit
**Document ID:** `docs/P27/07_HIT_TEST_AUDIT.md`

## 1. Deterministic Hit-Testing Principle
The topmost visible, unlocked node under the pointer cursor MUST win selection.

## 2. Root Cause of Drag Theft
The active selection overlay was mounted at `zIndex: 35` with `pointerEvents: 'auto'`. When clicking inside a container to select a nested child, the selection box intercepted the click and initiated a move of the parent container.
