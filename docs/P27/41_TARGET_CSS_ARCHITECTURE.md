# 🪐 OrbitoX Studio 3.0 — Target CSS Architecture
**Document ID:** `docs/P27/41_TARGET_CSS_ARCHITECTURE.md`  
**Status:** TARGET ARCHITECTURE SPECIFICATION (PHASE 0)  

---

## 1. Unified Cascading Style Precedence (Section 10)

Every style computation resolves through a deterministic priority cascade:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       THE UNIFIED STYLE CASCADE                             │
│                                                                             │
│  [Tier 1] Global System Tokens     (base default colors, font scales)       │
│      ▼                                                                      │
│  [Tier 2] Theme Tokens             (active palette: primary, surface)       │
│      ▼                                                                      │
│  [Tier 3] Component Tokens         (button variants, card styles)           │
│      ▼                                                                      │
│  [Tier 4] Instance Overrides       (component instance prop overrides)      │
│      ▼                                                                      │
│  [Tier 5] Responsive Overrides     (tablet/mobile breakpoint overrides)     │
│      ▼                                                                      │
│  [Tier 6] Local Node Overrides     (specific fill/stroke/margin on node)    │
│      ▼                                                                      │
│  [Tier 7] Expert Custom CSS        (raw CSS declarations on node)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Toolchain Remediation: Compiling Tailwind & PostCSS

1. **Dependency Installation:**
   Add `tailwindcss`, `@tailwindcss/postcss`, and `postcss` to `apps/celebrations/package.json`.
2. **Build Configuration:**
   Configure `postcss.config.js` and `tailwind.config.js` scoped strictly to `components/` and `app/`.
3. **Neutral Studio Chrome Isolation (Section 101):**
   * Studio chrome uses dedicated scoped CSS classes (`.sz-chrome-*`) with fixed dark tokens (`#0E1015`, `#16181D`, `#252932`).
   * Website/Document theme variables are scoped exclusively to the canvas iframe or container (`#sz-artboard-root`), preventing document themes from corrupting editor tools.
