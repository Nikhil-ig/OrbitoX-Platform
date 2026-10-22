# Resize Interaction Audit
**Document ID:** `docs/P27/10_RESIZE_AUDIT.md`

## 1. 8-Handle Resize System
Handles: NW, N, NE, E, SE, S, SW, W.

## 2. Critical Flaw
Resizing an element in auto-layout flow previously set `position: 'absolute'`, breaking the parent flexbox stack. Must preserve `position: 'flow'` and update `width` / `height` dimensions only.
