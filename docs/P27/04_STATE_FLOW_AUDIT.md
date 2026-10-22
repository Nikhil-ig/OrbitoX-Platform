# State & Data Flow Audit
**Document ID:** `docs/P27/04_STATE_FLOW_AUDIT.md`

## 1. State Flow Diagram
```
User Action → UI Handler → Controller Method → Store Dispatch → Reducer Mutation → React State Update → Canvas Render
```

## 2. State Leaks
- Resizing updates geometry in local React state first, then dispatches to store on pointer-up, causing visual lag.
- Double dispatches on multi-side padding changes trigger 4 separate history entries instead of 1 atomic transaction.
