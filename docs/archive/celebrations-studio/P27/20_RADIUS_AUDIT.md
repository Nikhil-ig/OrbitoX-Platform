# Corner Radius Control Audit
**Document ID:** `docs/P27/20_RADIUS_AUDIT.md`

## 1. Visual Corner Radius
Supports uniform and independent 4-corner controls (TL, TR, BR, BL).

## 2. Presets & Normalization
Presets: 0, 4, 8, 16, Pill. All mutations must commit explicit `px` units to avoid CSS invalidation.
