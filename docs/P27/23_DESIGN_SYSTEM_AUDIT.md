# Design System & Token Cascade Audit
**Document ID:** `docs/P27/23_DESIGN_SYSTEM_AUDIT.md`

## 1. Token Cascade
Global Tokens → Theme Tokens → Component Tokens → Instance Overrides → Local Overrides.

## 2. Single Resolver
`StyleResolver` is the single source of truth for translating tokens into React CSSProperties.
