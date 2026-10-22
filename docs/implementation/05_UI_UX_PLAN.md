# 🎨 OrbitoX RestaurantOS: UI/UX & Form-Factor Architecture Plan (05)

> **Document:** `docs/implementation/05_UI_UX_PLAN.md`  
> **Status:** Production UI/UX Architecture Baseline  

---

## 1. Asymmetrical Form-Factor Specifications

RestaurantOS rejects the "one responsive template fits all" anti-pattern. Each user role operates on a custom, purpose-built form-factor:

```
1. MOBILE GUEST PWA (390×844px)        ── One-thumb ergonomics · Zero install · Sticky cart drawer · Ambient companion
2. KITCHEN KDS (1920×1080px Touch)     ── High-contrast dark mode · 52px+ touch targets · Station columns · Audio alerts
3. WAITER CAPTAIN TABLET (1024×768px)  ── Interactive floor map · Pending guest service calls · Fast order entry
4. OWNER & MANAGER STUDIO (Desktop)     ── Multi-pane financial analytics · Recipe BOM editor · Multi-branch switcher
```

---

## 2. Component Architecture & Design Tokens

Following OrbitoX design system guidelines, all components bind to semantic CSS tokens defined in `orbitox/packages/ui/src/styles/theme.css`:

```css
:root {
  --restaurant-surface-base: #0f172a;
  --restaurant-surface-elevated: #1e293b;
  --restaurant-brand-accent: #f59e0b;
  --restaurant-status-cooking: #3b82f6;
  --restaurant-status-ready: #10b981;
  --restaurant-status-delayed: #ef4444;
  --restaurant-touch-target-min: 52px;
}
```

### 2.1 Frontline Guest Components
- `<TableHeroBanner />`: Displays restaurant identity, verified branch, and table badge.
- `<MenuCategoryPillRail />`: Horizontal scrollable category filters with sticky behavior.
- `<DishCard />`: High-resolution food photography, allergen badges, price in minor units, customization modal trigger.
- `<ItemCustomizerModal />`: Radio/checkbox modifier selector with live price recalculation.
- `<TableCompanionBar />`: Sticky bottom tab bar showing participant count, active cart count, and live subtotal.
- `<LivePrepTimeline />`: Human-friendly order progress journey derived from `CustomerVisibilityProjection`.

### 2.2 Kitchen Display System (KDS) Components
- `<KdsHeaderBar />`: Station selector, clock with network time drift check, active ticket counter, audio mute toggle.
- `<KdsTicketColumn />`: Chronological task card queue sorted by calculated fire times.
- `<KdsTicketCard />`: High-contrast order card with elapsed time badge (Green $< \text{Target}$, Amber $\rightarrow$ Warning, Red $\rightarrow$ Critical).
- `<KdsBumpButton />`: Oversized $52\text{px}+$ tactile button to transition tasks to `PREPARING` and `READY`.
- `<ExpoConsolidationPanel />`: Master screen for runners showing items arriving from all stations for a single table.
