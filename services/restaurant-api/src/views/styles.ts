/**
 * 🍷 RestaurantOS 2.0 Global CSS & Design System
 * ─────────────────────────────────────────────────────────────────────────────
 * Clean, modern CSS variables, responsive resets, and component layout primitives.
 * Rebuilt for Light-First Modern Apple/Linear Aesthetic from Concept Mockups.
 */

import { RestaurantTokens } from './tokens';

export const BASE_STYLE_SHEET = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,700;1,500&display=swap');

:root {
  /* Light Canvas & Surfaces */
  --color-canvas: ${RestaurantTokens.colors.canvas};
  --color-canvas-alt: ${RestaurantTokens.colors.canvasAlt};
  --color-card: ${RestaurantTokens.colors.card};
  --color-card-hover: ${RestaurantTokens.colors.cardHover};
  --color-heading: ${RestaurantTokens.colors.heading};
  --color-body: ${RestaurantTokens.colors.body};
  --color-secondary: ${RestaurantTokens.colors.secondary};
  --color-tertiary: ${RestaurantTokens.colors.tertiary};

  /* Action & Primary Tokens */
  --color-primary-pill: ${RestaurantTokens.colors.primaryPill};
  --color-primary-pill-text: ${RestaurantTokens.colors.primaryPillText};
  --color-secondary-pill: ${RestaurantTokens.colors.secondaryPill};
  --color-secondary-pill-text: ${RestaurantTokens.colors.secondaryPillText};

  /* Semantic Accents */
  --color-orange: ${RestaurantTokens.colors.orange};
  --color-blue: ${RestaurantTokens.colors.blue};
  --color-green: ${RestaurantTokens.colors.green};
  --color-amber: ${RestaurantTokens.colors.amber};
  --color-red: ${RestaurantTokens.colors.red};

  /* Compatibility Mapping for Existing Templates */
  --color-ink: ${RestaurantTokens.colors.canvas};
  --color-charcoal: ${RestaurantTokens.colors.card};
  --color-elevated: ${RestaurantTokens.colors.card};
  --color-hover: ${RestaurantTokens.colors.cardHover};
  --color-surface-hover: ${RestaurantTokens.colors.cardHover};
  --color-linen: ${RestaurantTokens.colors.heading};
  --color-stone: ${RestaurantTokens.colors.secondary};
  --color-muted: ${RestaurantTokens.colors.tertiary};
  --color-disabled: ${RestaurantTokens.colors.disabled};
  --color-copper: ${RestaurantTokens.colors.copper};
  --color-copper-hover: ${RestaurantTokens.colors.copperHover};
  --color-copper-subtle: ${RestaurantTokens.colors.copperSubtle};
  --color-copper-border: ${RestaurantTokens.colors.copperBorder};
  --color-sage: ${RestaurantTokens.colors.sage};
  --color-sage-subtle: ${RestaurantTokens.colors.sageSubtle};
  --color-amber-subtle: ${RestaurantTokens.colors.amberSubtle};
  --color-crimson: ${RestaurantTokens.colors.crimson};
  --color-crimson-subtle: ${RestaurantTokens.colors.crimsonSubtle};
  --color-sky: ${RestaurantTokens.colors.sky};
  --color-sky-subtle: ${RestaurantTokens.colors.skySubtle};

  --border-subtle: ${RestaurantTokens.colors.cardBorder};
  --border-default: ${RestaurantTokens.colors.border};
  --border-strong: ${RestaurantTokens.colors.borderStrong};
  --focus-ring: ${RestaurantTokens.colors.focusRing};

  --font-staff: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-editorial: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-diner: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono: ${RestaurantTokens.typography.monoFont};
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}

body {
  background-color: var(--color-canvas);
  color: var(--color-body);
  font-family: var(--font-staff);
  font-size: 14px;
  line-height: 1.5;
  overflow-x: hidden;
  min-height: 100vh;
}

/* Accessibility Focus Rings */
:focus-visible {
  outline: 2px solid var(--color-blue);
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
  background: rgba(0, 0, 0, 0.12);
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.22);
}

/* Typography Helpers */
.font-editorial {
  font-family: var(--font-staff);
}
.font-mono {
  font-family: var(--font-mono);
}
.text-mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.text-stone {
  color: var(--color-secondary);
}
.text-muted {
  color: var(--color-tertiary);
}
.text-copper {
  color: var(--color-primary-pill);
}
.text-sage {
  color: var(--color-green);
}
.text-amber {
  color: var(--color-amber);
}
.text-crimson {
  color: var(--color-red);
}
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Clean Modern Card */
.ui-card {
  background: var(--color-card);
  border-radius: 24px;
  border: 1px solid var(--border-subtle);
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02);
  padding: 24px;
  box-sizing: border-box;
}

/* Breadcrumbs Component */
.breadcrumb-trail {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-secondary);
  user-select: none;
}
.breadcrumb-item {
  color: var(--color-secondary);
  text-decoration: none;
  transition: color 120ms ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.breadcrumb-item:hover {
  color: var(--color-heading);
}
.breadcrumb-item.active {
  color: var(--color-heading);
  font-weight: 600;
}
.breadcrumb-sep {
  color: var(--color-tertiary);
  opacity: 0.6;
}

/* SSE Live Connection Indicator */
.sse-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  background: #ECFDF5;
  color: #059669;
  border: 1px solid #A7F3D0;
}
.sse-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #10B981;
  display: inline-block;
  box-shadow: 0 0 6px #10B981;
  animation: ssePulse 2s infinite ease-in-out;
}
.sse-dot.offline {
  background: #EF4444;
  box-shadow: 0 0 6px #EF4444;
  animation: none;
}
@keyframes ssePulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

/* Modern Pill Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 9999px;
}
.badge-sage {
  background: #ECFDF5;
  color: #059669;
  border: 1px solid #A7F3D0;
}
.badge-amber {
  background: #FFFBEB;
  color: #D97706;
  border: 1px solid #FDE68A;
}
.badge-crimson {
  background: #FEF2F2;
  color: #DC2626;
  border: 1px solid #FECACA;
}
.badge-copper {
  background: #000000;
  color: #FFFFFF;
}
.badge-sky {
  background: #EFF6FF;
  color: #2563EB;
  border: 1px solid #DBEAFE;
}
.badge-neutral {
  background: #F1F5F9;
  color: var(--color-secondary);
  border: 1px solid var(--border-default);
}

/* Modern Pill Buttons (Apple/Linear Style) */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 9999px;
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
  background: #000000;
  color: #FFFFFF;
  border: 1px solid #000000;
}
.btn-primary:hover:not(:disabled) {
  background: #1E293B;
  border-color: #1E293B;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.btn-secondary {
  background: #FFFFFF;
  color: var(--color-heading);
  border: 1px solid var(--border-default);
}
.btn-secondary:hover:not(:disabled) {
  background: #F8FAFC;
  border-color: #CBD5E1;
}
.btn-ghost {
  background: transparent;
  color: var(--color-secondary);
}
.btn-ghost:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
  color: var(--color-heading);
}
.btn-danger {
  background: #FEF2F2;
  color: #DC2626;
  border: 1px solid #FECACA;
}
.btn-danger:hover:not(:disabled) {
  background: #EF4444;
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
}
.btn-sm {
  padding: 6px 14px;
  font-size: 12px;
}
.btn-icon {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Operational Data Rows */
.data-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background 120ms ease;
}
.data-row:hover {
  background: rgba(0, 0, 0, 0.02);
}

/* Command Palette Backdrop & Box */
.cmdk-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
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
  background: #FFFFFF;
  border: 1px solid var(--border-default);
  border-radius: 20px;
  width: 100%;
  max-width: 580px;
  box-shadow: 0 24px 54px rgba(0, 0, 0, 0.15);
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
  color: var(--color-heading);
  font-size: 15px;
  font-family: inherit;
  outline: none;
}
.cmdk-input::placeholder {
  color: var(--color-tertiary);
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
  border-radius: 12px;
  color: var(--color-secondary);
  cursor: pointer;
  font-size: 13px;
  text-decoration: none;
  transition: background 80ms ease, color 80ms ease;
}
.cmdk-item:hover, .cmdk-item.selected {
  background: #F1F5F9;
  color: var(--color-heading);
}
.cmdk-item kbd {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--color-secondary);
}
`;
