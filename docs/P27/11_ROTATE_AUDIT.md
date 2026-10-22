# Rotation Engine Audit
**Document ID:** `docs/P27/11_ROTATE_AUDIT.md`

## 1. Rotation Transform
Rotation is stored as `geometry.rotation` in degrees (0–360).

## 2. Flaws
- Bounding box calculation for rotated nodes did not account for affine trigonometrical transform, causing resize handle offsets.
