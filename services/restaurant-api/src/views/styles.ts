/**
 * 🍷 RestaurantOS 2.0 Global CSS & Design System
 * ─────────────────────────────────────────────────────────────────────────────
 * Clean, modern CSS variables, responsive resets, and component layout primitives.
 */

import { RestaurantTokens } from './tokens';

export const BASE_STYLE_SHEET = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

:root {
  --color-ink: ${RestaurantTokens.colors.ink};
  --color-charcoal: ${RestaurantTokens.colors.charcoal};
  --color-elevated: ${RestaurantTokens.colors.elevated};
  --color-hover: ${RestaurantTokens.colors.surfaceHover};
  --color-surface-hover: ${RestaurantTokens.colors.surfaceHover};
  --color-linen: ${RestaurantTokens.colors.linen};
  --color-stone: ${RestaurantTokens.colors.stone};
  --color-muted: ${RestaurantTokens.colors.muted};
  --color-disabled: ${RestaurantTokens.colors.disabled};
  --color-copper: ${RestaurantTokens.colors.copper};
  --color-copper-hover: ${RestaurantTokens.colors.copperHover};
  --color-copper-subtle: ${RestaurantTokens.colors.copperSubtle};
  --color-copper-border: ${RestaurantTokens.colors.copperBorder};
  --color-sage: ${RestaurantTokens.colors.sage};
  --color-sage-subtle: ${RestaurantTokens.colors.sageSubtle};
  --color-amber: ${RestaurantTokens.colors.amber};
  --color-amber-subtle: ${RestaurantTokens.colors.amberSubtle};
  --color-crimson: ${RestaurantTokens.colors.crimson};
  --color-crimson-subtle: ${RestaurantTokens.colors.crimsonSubtle};
  --color-sky: ${RestaurantTokens.colors.sky};
  --color-sky-subtle: ${RestaurantTokens.colors.skySubtle};

  --border-subtle: ${RestaurantTokens.colors.borderSubtle};
  --border-default: ${RestaurantTokens.colors.borderDefault};
  --border-strong: ${RestaurantTokens.colors.borderStrong};
  --focus-ring: ${RestaurantTokens.colors.focusRing};

  --font-staff: ${RestaurantTokens.typography.staffFont};
  --font-editorial: ${RestaurantTokens.typography.guestHeadFont};
  --font-diner: ${RestaurantTokens.typography.guestBodyFont};
  --font-mono: ${RestaurantTokens.typography.monoFont};
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}

body {
  background-color: var(--color-ink);
  color: var(--color-linen);
  font-family: var(--font-staff);
  font-size: 14px;
  line-height: 1.5;
  overflow-x: hidden;
  min-height: 100vh;
}

/* Accessibility Focus Rings */
:focus-visible {
  outline: 2px solid var(--color-copper);
  outline-offset: 2px;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.22);
}

/* Typography Helpers */
.font-editorial {
  font-family: var(--font-editorial);
}
.font-mono {
  font-family: var(--font-mono);
}
.text-mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.text-stone {
  color: var(--color-stone);
}
.text-muted {
  color: var(--color-muted);
}
.text-copper {
  color: var(--color-copper);
}
.text-sage {
  color: var(--color-sage);
}
.text-amber {
  color: var(--color-amber);
}
.text-crimson {
  color: var(--color-crimson);
}
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Breadcrumbs Component */
.breadcrumb-trail {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-stone);
  user-select: none;
}
.breadcrumb-item {
  color: var(--color-stone);
  text-decoration: none;
  transition: color 120ms ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.breadcrumb-item:hover {
  color: var(--color-linen);
}
.breadcrumb-item.active {
  color: var(--color-linen);
  font-weight: 600;
}
.breadcrumb-sep {
  color: var(--color-muted);
  opacity: 0.6;
}

/* SSE Live Connection Indicator */
.sse-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(93, 154, 122, 0.12);
  color: var(--color-sage);
  border: 1px solid rgba(93, 154, 122, 0.25);
}
.sse-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--color-sage);
  display: inline-block;
  box-shadow: 0 0 6px var(--color-sage);
  animation: ssePulse 2s infinite ease-in-out;
}
.sse-dot.offline {
  background: var(--color-crimson);
  box-shadow: 0 0 6px var(--color-crimson);
  animation: none;
}
@keyframes ssePulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

/* Badges & Indicators */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 4px;
  text-transform: uppercase;
}
.badge-sage {
  background: var(--color-sage-subtle);
  color: var(--color-sage);
  border: 1px solid rgba(93, 154, 122, 0.25);
}
.badge-amber {
  background: var(--color-amber-subtle);
  color: var(--color-amber);
  border: 1px solid rgba(217, 154, 69, 0.3);
}
.badge-crimson {
  background: var(--color-crimson-subtle);
  color: var(--color-crimson);
  border: 1px solid rgba(201, 87, 87, 0.3);
}
.badge-copper {
  background: var(--color-copper-subtle);
  color: var(--color-copper);
  border: 1px solid rgba(200, 107, 60, 0.3);
}
.badge-sky {
  background: var(--color-sky-subtle);
  color: var(--color-sky);
  border: 1px solid rgba(74, 139, 178, 0.25);
}
.badge-neutral {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-stone);
  border: 1px solid var(--border-default);
}

/* Operational Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 140ms cubic-bezier(0.16, 1, 0.3, 1);
  text-decoration: none;
  font-family: inherit;
  user-select: none;
  line-height: 1.3;
}
.btn:active:not(:disabled) {
  transform: translateY(1px);
}
.btn:disabled, .btn[disabled] {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
.btn-primary {
  background: var(--color-copper);
  color: #FFFFFF;
}
.btn-primary:hover:not(:disabled) {
  background: var(--color-copper-hover);
  box-shadow: 0 2px 10px rgba(200, 107, 60, 0.3);
}
.btn-secondary {
  background: var(--color-elevated);
  color: var(--color-linen);
  border: 1px solid var(--border-default);
}
.btn-secondary:hover:not(:disabled) {
  background: var(--color-hover);
  border-color: var(--border-strong);
}
.btn-ghost {
  background: transparent;
  color: var(--color-stone);
}
.btn-ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-linen);
}
.btn-danger {
  background: var(--color-crimson-subtle);
  color: var(--color-crimson);
  border: 1px solid rgba(201, 87, 87, 0.3);
}
.btn-danger:hover:not(:disabled) {
  background: var(--color-crimson);
  color: #FFFFFF;
  box-shadow: 0 2px 10px rgba(201, 87, 87, 0.3);
}
.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}
.btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Operational Data Rows */
.data-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background 120ms ease;
}
.data-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

/* Command Palette Backdrop & Box */
.cmdk-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 999;
  display: none;
  align-items: flex-start;
  justify-content: center;
  padding-top: 14vh;
}
.cmdk-backdrop.open {
  display: flex;
}
.cmdk-box {
  background: var(--color-elevated);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  width: 100%;
  max-width: 580px;
  box-shadow: 0 24px 54px rgba(0, 0, 0, 0.85);
  overflow: hidden;
  animation: cmdkAppear 140ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes cmdkAppear {
  from { opacity: 0; transform: scale(0.97) translateY(-8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.cmdk-input {
  width: 100%;
  padding: 16px 20px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-default);
  color: var(--color-linen);
  font-size: 15px;
  font-family: inherit;
  outline: none;
}
.cmdk-input::placeholder {
  color: var(--color-muted);
}
.cmdk-results {
  max-height: 340px;
  overflow-y: auto;
  padding: 8px;
}
.cmdk-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 6px;
  color: var(--color-stone);
  cursor: pointer;
  font-size: 13px;
  text-decoration: none;
  transition: background 80ms ease, color 80ms ease;
}
.cmdk-item:hover, .cmdk-item.selected {
  background: var(--color-copper-subtle);
  color: var(--color-linen);
}
.cmdk-item kbd {
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--color-stone);
}
`;
