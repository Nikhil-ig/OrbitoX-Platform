# Auto Layout Engine Audit
**Document ID:** `docs/P27/13_AUTO_LAYOUT_AUDIT.md`

## 1. Auto Layout Primitives
Row, Column, Gap, Padding, Align, Justify, Wrap, Grow, Shrink, Fill, Hug, Fixed.

## 2. Invariant
When children change or resize, parent containers must reflow automatically without requiring absolute coordinate repositioning.
