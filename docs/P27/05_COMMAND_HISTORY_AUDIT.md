# Command & History Audit
**Document ID:** `docs/P27/05_COMMAND_HISTORY_AUDIT.md`

## 1. Undo/Redo Engine
The store maintains `past: EditorDraftSnapshot[]` and `future: EditorDraftSnapshot[]`.

## 2. Flaws
- Fine-grained pointer-move events can spam the history stack if debounce fails.
- Section deletions store snapshot, but restore fails if blueprint ID check rejects the restored scene.
