# Box Model UI & Scrubber Audit
**Document ID:** `docs/P27/19_BOX_MODEL_AUDIT.md`

## 1. Concentric Box Model
Visual nested diagram: Margin (Amber) → Padding (Cyan) → Content Box.

## 2. Flaws & Fixes
- Added pointer capture scrubbing.
- Added double-click to type directly into an inline input.
- Added atomic batching via `onUpdateStyle`.
