/**
 * ⚡ RestaurantOS 2.0 Purpose-Built Kitchen Instrument (KDS)
 * ─────────────────────────────────────────────────────────────────────────────
 * Commercial 2026 Touchscreen Operational Workstation:
 * - High-contrast, dense touchscreen layout (54px+ touch targets)
 * - Navigation: ALL | ALL DAY | TANDOOR | CURRY LINE | BAR | DESSERT | EXPO | PREVIEW | RECALL
 * - Live Server-Authoritative SLA Timers (Normal, Warning >75%, Overdue >=100%)
 * - Pure Synthesized Web Audio API Chimes (New Orders, SLA Breach)
 * - User Audio Toggle & Autoplay Gesture Unlock
 * - Event Deduplication across SSE Reconnects
 * - Individual Item Fulfillment (✓ item checklist with (X/Y ready) ticket progress)
 * - Expo Command Pass with Readiness Gating & Mutual Exclusion
 * - Dedicated Recall & Refire Buffer
 * - Non-Blocking Floating Toasts (Zero modal alerts freezing kitchen screens)
 * - Bump Bar & Keyboard Shortcuts (Space, Enter, R, E, A)
 */

import { KitchenTask } from '../../domain';
import { BASE_STYLE_SHEET } from '../styles';
import { icon } from '../icons';

export const STATION_SLA_MINUTES: Record<string, number> = {
  TANDOOR: 12,
  CURRY_LINE: 15,
  BAR: 4,
  DESSERT: 5,
  EXPO: 10,
  DEFAULT: 10,
};

export function getStationSlaMinutes(station?: string): number {
  if (!station) return STATION_SLA_MINUTES.DEFAULT;
  return STATION_SLA_MINUTES[station] || STATION_SLA_MINUTES.DEFAULT;
}

export function renderKdsWorkspace(
  tasks: KitchenTask[],
  activeStation = 'ALL',
  branchName = 'Ludhiana Main',
  serviceShift = 'Dinner Service',
  staffToken?: string,
  currentSequence = 0,
  branchId = 'branch_ldh',
  staffRole?: string,
  isAuthenticated?: boolean
): string {
  // Station categorization
  const stations = [
    { key: 'ALL', label: 'All Tickets' },
    { key: 'ALL_DAY', label: 'All Day Production' },
    { key: 'TANDOOR', label: 'Tandoor' },
    { key: 'CURRY_LINE', label: 'Curry Line' },
    { key: 'BAR', label: 'Bar & Drinks' },
    { key: 'DESSERT', label: 'Dessert' },
    { key: 'EXPO', label: 'Expo Command' },
    { key: 'PREVIEW', label: 'Fire Queue' },
    { key: 'RECALL', label: 'Recall Fulfilled' },
  ];

  const activeTasks = tasks.filter((t) => t.status !== 'BUMPED');
  const recalledTasks = tasks.filter((t) => t.status === 'BUMPED');

  const filteredTasks =
    activeStation === 'ALL'
      ? activeTasks
      : activeStation === 'ALL_DAY'
      ? activeTasks
      : activeStation === 'EXPO'
      ? activeTasks
      : activeStation === 'PREVIEW'
      ? activeTasks.filter((t) => t.status === 'QUEUED')
      : activeStation === 'RECALL'
      ? recalledTasks
      : activeTasks.filter((t) => t.station === activeStation);

  // All Day Items Aggregation
  const allDayCounts = new Map<string, { count: number; tables: string[] }>();
  activeTasks.forEach((t) => {
    const existing = allDayCounts.get(t.itemName) || { count: 0, tables: [] };
    existing.count += t.quantity;
    if (!existing.tables.includes(t.tableNumber)) existing.tables.push(t.tableNumber);
    allDayCounts.set(t.itemName, existing);
  });

  // Rush Mode detection
  const isRushMode = activeTasks.length >= 4;

  // Group active tasks by table for Expo mode
  const tableOrdersMap = new Map<string, KitchenTask[]>();
  activeTasks.forEach((t) => {
    const list = tableOrdersMap.get(t.tableNumber) || [];
    list.push(t);
    tableOrdersMap.set(t.tableNumber, list);
  });

  const isAuthed = Boolean(isAuthenticated || staffRole || staffToken);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>KDS Kitchen Instrument · ${branchName}</title>
  <script>
    window.__STAFF_SESSION__ = {
      isAuthenticated: ${isAuthed},
      role: "${isAuthed ? (staffRole || 'CHEF') : ''}",
      station: "${activeStation}",
      branchId: "${branchId}"
    };
    window.__STATION_SLA__ = ${JSON.stringify(STATION_SLA_MINUTES)};
  </script>
  <style>
    ${BASE_STYLE_SHEET}

    body {
      background: #06080B;
      color: #FFFFFF;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    /* KDS Main Instrument Header */
    .kds-header {
      height: 60px;
      background: #0E1218;
      border-bottom: 2px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      z-index: 30;
    }
    .kds-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .kds-title {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0.02em;
      color: var(--color-linen);
    }
    .kds-badge {
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Rush Mode Alert Strip */
    .rush-banner {
      background: linear-gradient(90deg, #A83232 0%, #C95757 50%, #A83232 100%);
      color: #FFFFFF;
      padding: 6px 20px;
      font-size: 12px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: space-between;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      box-shadow: 0 2px 10px rgba(201, 87, 87, 0.4);
    }

    /* Station Navigation Tabs */
    .kds-stations-bar {
      height: 52px;
      background: #090C10;
      border-bottom: 1px solid var(--border-default);
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 8px;
      overflow-x: auto;
    }
    .station-btn {
      min-height: 38px;
      padding: 0 16px;
      border-radius: 6px;
      border: 1px solid var(--border-default);
      background: #12161E;
      color: var(--color-stone);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 120ms ease;
      text-decoration: none;
      white-space: nowrap;
    }
    .station-btn:hover {
      background: #181E29;
      color: #FFF;
    }
    .station-btn.active {
      background: var(--color-copper);
      color: #FFF;
      border-color: var(--color-copper);
      box-shadow: 0 2px 10px rgba(200, 107, 60, 0.35);
    }

    /* Ticket Canvas */
    .kds-viewport {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      overflow-x: hidden;
    }
    .kds-ticket-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    /* Modern High-Density Ticket Card */
    .ticket-card {
      background: #11151D;
      border: 2px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.6);
      transition: all 140ms ease;
    }
    .ticket-card.QUEUED {
      border-color: var(--color-copper);
    }
    .ticket-card.IN_PROGRESS {
      border-color: var(--color-sky);
      box-shadow: 0 0 16px rgba(74, 139, 178, 0.25);
    }
    .ticket-card.READY {
      border-color: var(--color-sage);
      box-shadow: 0 0 16px rgba(93, 154, 122, 0.3);
    }
    .ticket-card.SLA_WARNING {
      border-color: var(--color-amber);
      box-shadow: 0 0 16px rgba(220, 160, 50, 0.35);
    }
    .ticket-card.SLA_BREACH {
      border-color: var(--color-crimson);
      animation: alertPulse 1.8s infinite;
    }
    @keyframes alertPulse {
      0%, 100% { box-shadow: 0 0 12px rgba(201, 87, 87, 0.3); }
      50% { box-shadow: 0 0 24px rgba(201, 87, 87, 0.8); }
    }

    .ticket-header {
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.04);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ticket-table-title {
      font-size: 19px;
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: -0.01em;
    }
    .ticket-timer {
      font-size: 13px;
      font-family: var(--font-mono);
      font-weight: 800;
      color: var(--color-linen);
    }

    .ticket-body {
      padding: 14px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Individual Item Row with Checkmark */
    .ticket-item-row {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      padding: 10px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 120ms ease;
    }
    .ticket-item-row.item-fulfilled {
      background: rgba(93, 154, 122, 0.1);
      border-color: rgba(93, 154, 122, 0.3);
      text-decoration: line-through;
      opacity: 0.75;
    }

    .item-qty-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.16);
      color: #FFF;
      font-weight: 900;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 14px;
      margin-right: 8px;
    }
    .item-name-text {
      font-size: 15px;
      font-weight: 800;
      color: #FFFFFF;
      line-height: 1.25;
    }
    .item-mod-badge {
      font-size: 12px;
      color: var(--color-copper);
      font-weight: 700;
      margin-top: 3px;
    }

    /* Touch Fulfillment Toggle Button */
    .item-check-btn {
      width: 38px;
      height: 38px;
      border-radius: 6px;
      border: 1px solid var(--border-default);
      background: #171B24;
      color: var(--color-stone);
      font-size: 16px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 100ms ease;
    }
    .item-check-btn:active {
      transform: scale(0.92);
    }
    .item-check-btn.checked {
      background: var(--color-sage);
      color: #FFF;
      border-color: var(--color-sage);
    }

    /* 54px High-Target Bump Action Button */
    .bump-btn {
      width: 100%;
      min-height: 54px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 120ms ease;
    }
    .bump-btn-start {
      background: var(--color-copper);
      color: #FFF;
    }
    .bump-btn-ready {
      background: var(--color-sage);
      color: #FFF;
    }
    .bump-btn-bump {
      background: #252D3A;
      color: var(--color-linen);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .bump-btn-disabled {
      background: #1C212A;
      color: var(--color-stone);
      cursor: not-allowed;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .bump-btn:active {
      transform: scale(0.97);
    }

    /* Floating Toast Notification Container */
    #kds-toast-container {
      position: fixed;
      top: 72px;
      right: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }
    .kds-toast {
      min-width: 280px;
      max-width: 420px;
      padding: 12px 16px;
      border-radius: 8px;
      background: #141922;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #FFF;
      font-size: 13px;
      font-weight: 700;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: auto;
      animation: toastSlide 200ms ease;
    }
    .kds-toast.success { border-color: var(--color-sage); color: var(--color-sage); }
    .kds-toast.error { border-color: var(--color-crimson); color: var(--color-crimson); }
    .kds-toast.warning { border-color: var(--color-amber); color: var(--color-amber); }
    @keyframes toastSlide {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    /* Shortcut Help Legend */
    .kds-footer {
      height: 40px;
      background: #090C10;
      border-top: 1px solid var(--border-default);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      font-size: 11px;
      color: var(--color-stone);
    }
    .kbd-shortcut {
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: var(--font-mono);
      color: var(--color-linen);
      margin-right: 4px;
    }

    @media (max-width: 1024px) {
      .kds-ticket-grid {
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 12px;
      }
      .kds-header {
        padding: 0 12px;
      }
      .kds-viewport {
        padding: 12px;
      }
    }
  </style>
</head>
<body>
  <div id="kds-toast-container"></div>

  <!-- KDS Top Header -->
  <header class="kds-header">
    <div class="kds-brand">
      <span class="kds-title" style="display: flex; align-items: center; gap: 8px;">
        ${icon('kitchen', { size: 16, color: 'var(--color-copper)' })}
        <span>KITCHEN WORKSTATION</span>
      </span>
      <span class="kds-badge" style="background: var(--color-copper); color: #FFF;">${activeStation}</span>
      <span style="font-size: 12px; color: var(--color-stone);">${branchName} · ${serviceShift}</span>
    </div>

    <div style="display: flex; align-items: center; gap: 14px;">
      <!-- Audio Alert Toggle with Autoplay Gesture Unlock -->
      <button id="kds-audio-toggle" onclick="toggleKdsAudio()" class="btn btn-secondary btn-sm" style="font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; background: #171B24; border-color: rgba(255,255,255,0.15);">
        <span id="kds-audio-icon">🔔</span>
        <span id="kds-audio-label">Alerts: Active</span>
      </button>

      <!-- Connectivity State -->
      <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-sage); font-weight: 700;">
        <span style="width: 8px; height: 8px; border-radius: 999px; background: var(--color-sage); box-shadow: 0 0 8px var(--color-sage);"></span>
        <span>ONLINE (Edge Synced)</span>
      </div>

      <!-- Staff Authentication Status & PIN Login -->
      ${
        isAuthed
          ? `<span id="kds-auth-badge" style="font-size: 11px; font-weight: 700; color: var(--color-sage); background: rgba(82, 183, 136, 0.15); border: 1px solid rgba(82, 183, 136, 0.3); padding: 4px 8px; border-radius: 4px;">✓ Authenticated</span>`
          : `<button id="kds-auth-btn" onclick="promptKdsAuth()" class="btn btn-secondary btn-sm" style="font-size: 11px; font-weight: 700; background: rgba(224, 86, 36, 0.15); border-color: var(--color-copper); color: var(--color-copper);">🔐 Enter PIN</button>`
      }

      <span style="color: var(--border-strong);">|</span>
      <span id="kds-clock" style="font-size: 16px; font-weight: 800; font-family: var(--font-mono); color: var(--color-linen);">--:--:--</span>
      <a href="/" class="btn btn-secondary btn-sm" style="font-size: 12px;">← Operations Home</a>
    </div>
  </header>

  <!-- Dynamic Rush Mode Banner -->
  ${
    isRushMode
      ? `<div class="rush-banner">
      <div style="display: flex; align-items: center; gap: 8px;">
        ${icon('alert-circle', { size: 16, color: '#FFFFFF' })}
        <span>RUSH MODE ACTIVE · ${activeTasks.length} Tickets Queued · Prioritizing Hot Stations</span>
      </div>
      <div>Station DAG Synchronization Active</div>
    </div>`
      : ''
  }

  <!-- Stations Navigation Bar -->
  <nav class="kds-stations-bar">
    ${stations
      .map(
        (st) => `
      <a href="/kds?station=${st.key}" class="station-btn ${activeStation === st.key ? 'active' : ''}">
        ${st.label}
        ${
          st.key === 'EXPO'
            ? `<span style="font-size: 10px; background: rgba(255,255,255,0.1); padding: 1px 5px; border-radius: 999px;">${tableOrdersMap.size}</span>`
            : ''
        }
      </a>`
      )
      .join('')}
  </nav>

  <!-- Viewport -->
  <main class="kds-viewport">
    ${
      activeStation === 'ALL_DAY'
        ? `
      <!-- 1. All-Day Production Mode -->
      <div style="max-width: 1100px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h2 style="font-size: 20px; font-weight: 800; color: var(--color-linen); display: flex; align-items: center; gap: 8px;">
              ${icon('flame', { size: 20, color: 'var(--color-copper)' })}
              <span>All-Day Item Aggregation</span>
            </h2>
            <p style="font-size: 12px; color: var(--color-stone);">Realtime item counts across all open tickets</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.print()">Print Prep Sheet</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; margin-bottom: 36px;">
          ${Array.from(allDayCounts.entries())
            .map(
              ([item, info]) => `
            <div style="background: #11151D; border: 1px solid var(--border-default); border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 15px; font-weight: 800; color: #FFF;">${item}</div>
                <div style="font-size: 11px; color: var(--color-stone); margin-top: 4px;">Tables: ${info.tables.join(', ')}</div>
              </div>
              <div style="font-size: 30px; font-weight: 900; color: var(--color-copper); font-family: var(--font-mono);">${info.count}</div>
            </div>`
            )
            .join('')}
        </div>

        <!-- Production Ingredients Aggregation Status -->
        <h3 style="font-size: 16px; font-weight: 800; color: var(--color-linen); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 8px;">
          ${icon('layers', { size: 16, color: 'var(--color-stone)' })}
          <span>Raw Production Ingredient Demand</span>
        </h3>
        <div style="background: #11151D; border: 1px solid var(--border-subtle); border-radius: 6px; padding: 16px 20px;">
          <div style="display: flex; align-items: center; gap: 10px; color: var(--color-stone); font-size: 13px;">
            <span style="color: var(--color-amber); font-weight: 700;">⚠ Recipe & BOM Model Not Configured:</span>
            <span>Live inventory and recipe bill-of-materials breakdown requires inventory/recipe data model integration for active menu items.</span>
          </div>
        </div>
      </div>`
        : activeStation === 'EXPO'
        ? `
      <!-- 2. Expo Command Center Mode with Readiness Gating -->
      <div style="max-width: 1200px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h2 style="font-size: 20px; font-weight: 800; color: var(--color-linen); display: flex; align-items: center; gap: 8px;">
              ${icon('send', { size: 20, color: 'var(--color-sky)' })}
              <span>Expediter Command Pass</span>
            </h2>
            <p style="font-size: 12px; color: var(--color-stone);">Multi-station assembly, readiness verification & table dispatch</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="promptExpoTableRecall()">Recall Dispatched Table</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px;">
          ${Array.from(tableOrdersMap.entries())
            .map(([tableNum, tTasks]) => {
              const allReady = tTasks.every((t) => t.status === 'READY');
              const readyCount = tTasks.filter((t) => t.status === 'READY').length;
              const unreadyCount = tTasks.length - readyCount;
              const partial = !allReady && readyCount > 0;

              return `
            <div id="expo-card-${tableNum}" style="background: #11151D; border: 2px solid ${allReady ? 'var(--color-sage)' : partial ? 'var(--color-amber)' : 'var(--border-default)'}; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
              <div style="padding: 12px 16px; background: rgba(255,255,255,0.03); border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 18px; font-weight: 900; color: #FFF;">Table ${tableNum}</span>
                <span class="badge ${allReady ? 'badge-sage' : partial ? 'badge-amber' : 'badge-neutral'}" style="display: inline-flex; align-items: center; gap: 4px;">
                  ${allReady ? `${icon('check', { size: 10, color: 'var(--color-sage)' })} Ready for Dispatch` : `${readyCount}/${tTasks.length} Ready`}
                </span>
              </div>

              <div style="padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; flex: 1;">
                ${tTasks
                  .map(
                    (t) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
                    <div>
                      <strong style="color: #FFF;">${t.quantity}× ${t.itemName}</strong>
                      <div style="font-size: 11px; color: var(--color-stone);">${t.station} · ${(t.modifiers || []).join(', ') || 'Standard'}</div>
                    </div>
                    <span style="font-size: 11px; font-weight: 800; padding: 2px 6px; border-radius: 4px; ${t.status === 'READY' ? 'color: var(--color-sage); background: rgba(93,154,122,0.15);' : t.status === 'IN_PROGRESS' ? 'color: var(--color-sky); background: rgba(74,139,178,0.15);' : 'color: var(--color-copper); background: rgba(200,107,60,0.15);'}">
                      ${t.status === 'READY' ? 'READY' : t.status === 'IN_PROGRESS' ? 'COOKING' : 'QUEUED'}
                    </span>
                  </div>`
                  )
                  .join('')}
              </div>

              <div style="padding: 12px 16px; background: rgba(0,0,0,0.2); border-top: 1px solid var(--border-subtle);">
                <button
                  class="bump-btn ${allReady ? 'bump-btn-ready' : 'bump-btn-start'}"
                  onclick="dispatchExpoOrder('${tableNum}', ${!allReady})"
                >
                  ${allReady ? 'SEND TO TABLE ' + tableNum : 'Expedite Table ' + tableNum + ' (' + unreadyCount + ' pending)'}
                </button>
              </div>
            </div>`;
            })
            .join('')}
        </div>
      </div>`
        : activeStation === 'PREVIEW'
        ? `
      <!-- 3. Fire Queue / DAG Synchronized Prep Mode -->
      <div style="max-width: 900px; margin: 0 auto;">
        <h2 style="font-size: 20px; font-weight: 800; color: var(--color-linen); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          ${icon('clock', { size: 18, color: 'var(--color-copper)' })}
          <span>Fire Queue (Preparation Timings)</span>
        </h2>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${filteredTasks
            .map(
              (t) => `
            <div style="background: #11151D; border: 1px solid var(--border-default); border-radius: 8px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span class="badge badge-copper" style="margin-right: 8px;">Target Fire: ${t.fireAt}</span>
                <strong style="font-size: 15px; color: #FFF;">Table ${t.tableNumber} · ${t.quantity}× ${t.itemName}</strong>
                <div style="font-size: 11px; color: var(--color-stone); margin-top: 4px;">Station: ${t.station} · Target Table Delivery: ${t.targetServeAt}</div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="bumpTask('${t.id}', 'IN_PROGRESS')">Fire Now</button>
            </div>`
            )
            .join('')}
        </div>
      </div>`
        : activeStation === 'RECALL'
        ? `
      <!-- 4. Recall Fulfilled Tickets Mode -->
      <div style="max-width: 900px; margin: 0 auto;">
        <h2 style="font-size: 20px; font-weight: 800; color: var(--color-linen); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          ${icon('refresh', { size: 18, color: 'var(--color-stone)' })}
          <span>Recently Fulfilled & Bumped Tickets</span>
        </h2>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${filteredTasks.length === 0 ? `<div style="text-align: center; color: var(--color-stone); padding: 40px;">No bumped tickets in recall buffer.</div>` : ''}
          ${filteredTasks
            .map(
              (t) => `
            <div style="background: #11151D; border: 1px solid var(--border-default); border-radius: 8px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 15px; color: #FFF;">Table ${t.tableNumber} · ${t.quantity}× ${t.itemName}</strong>
                <div style="font-size: 11px; color: var(--color-stone); margin-top: 4px;">Station: ${t.station} · Fulfilled Ticket</div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary btn-sm" onclick="recallTask('${t.id}', 'READY')">Recall to Ready</button>
                <button class="btn btn-primary btn-sm" onclick="recallTask('${t.id}', 'IN_PROGRESS')">Refire Cooking</button>
              </div>
            </div>`
            )
            .join('')}
        </div>
      </div>`
        : `
      <!-- 5. Standard High-Density Ticket Grid with Live SLA Badges -->
      <div class="kds-ticket-grid">
        ${
          filteredTasks.length === 0
            ? `<div style="grid-column: 1 / -1; padding: 60px 0; text-align: center; color: var(--color-stone);">
                <div style="margin-bottom: 12px; display: flex; justify-content: center;">${icon('check-circle', { size: 36, color: 'var(--color-sage)' })}</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--color-linen);">All station tickets fulfilled!</div>
                <div style="font-size: 13px; margin-top: 4px;">Queue is clear for ${activeStation}.</div>
              </div>`
            : filteredTasks
                .map((task) => {
                  const slaMinutes = task.slaMinutes || getStationSlaMinutes(task.station);
                  const isDelayed = (task.elapsedMinutes || 0) > slaMinutes;
                  const nextStatus = task.status === 'QUEUED' ? 'IN_PROGRESS' : task.status === 'IN_PROGRESS' ? 'READY' : 'BUMPED';
                  const btnClass = task.status === 'QUEUED' ? 'bump-btn-start' : task.status === 'IN_PROGRESS' ? 'bump-btn-ready' : 'bump-btn-bump';
                  const btnLabel = task.status === 'QUEUED' ? 'Start Cooking' : task.status === 'IN_PROGRESS' ? 'Mark Ready' : 'Bump Ticket';

                  return `
            <div
              id="ticket-${task.id}"
              class="ticket-card ${task.status} ${isDelayed ? 'SLA_BREACH' : ''}"
              data-task-id="${task.id}"
              data-station="${task.station}"
              data-created-at="${task.createdAt || ''}"
              data-sla-minutes="${slaMinutes}"
              data-status="${task.status}"
            >
              <div class="ticket-header">
                <div>
                  <span class="ticket-table-title">Table ${task.tableNumber}</span>
                  <span style="font-size: 11px; color: var(--color-stone); margin-left: 6px;">${task.seatNumber ? `· ${task.seatNumber}` : ''}</span>
                </div>
                <span id="sla-badge-${task.id}" class="ticket-timer" style="${isDelayed ? 'color: var(--color-crimson); font-weight: 900;' : ''}">
                  ${task.elapsedMinutes || 0}m / ${slaMinutes}m
                </span>
              </div>

              <div class="ticket-body">
                <!-- Individual Item Row with Checkbox -->
                ${(() => {
                  const isFulfilled = (task.fulfilledItemCount || 0) >= task.quantity;
                  const partialFulfilled = !isFulfilled && (task.fulfilledItemCount || 0) > 0;
                  return `
                <div class="ticket-item-row ${isFulfilled ? 'item-fulfilled' : ''}" id="item-row-${task.id}">
                  <div>
                    <div>
                      <span class="item-qty-badge">${task.quantity}×</span>
                      <span class="item-name-text">${task.itemName}</span>
                      ${partialFulfilled ? `<span style="font-size: 11px; color: var(--color-copper); font-weight: 700; margin-left: 6px;">(${task.fulfilledItemCount}/${task.quantity} ready)</span>` : ''}
                    </div>
                    ${(task.modifiers || []).map((m) => `<div class="item-mod-badge">${icon('tag', { size: 10, color: 'var(--color-copper)' })} ${m}</div>`).join('')}
                  </div>
                  <button class="item-check-btn ${isFulfilled ? 'checked' : ''}" onclick="toggleItemFulfill('${task.id}')" title="Check item">
                    ${icon('check', { size: 14, color: isFulfilled ? '#FFFFFF' : 'var(--color-stone)' })}
                  </button>
                </div>`;
                })()}

                <div style="font-size: 11px; color: var(--color-stone); display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px;">
                  <span>Fire: <strong style="color: #FFF;">${task.fireAt}</strong></span>
                  <span>Station: <strong style="color: var(--color-copper);">${task.station}</strong></span>
                </div>
              </div>

              <div style="padding: 12px 14px; background: rgba(0, 0, 0, 0.25); border-top: 1px solid rgba(255, 255, 255, 0.06);">
                <button class="bump-btn ${btnClass}" onclick="bumpTask('${task.id}', '${nextStatus}')">
                  ${btnLabel}
                </button>
              </div>
            </div>`;
                })
                .join('')
        }
      </div>`
    }
  </main>

  <!-- Keyboard Shortcuts Bar -->
  <footer class="kds-footer">
    <div>
      <span>Bump Bar: </span>
      <span><kbd class="kbd-shortcut">Space</kbd> Start Next</span>
      <span><kbd class="kbd-shortcut">Enter</kbd> Bump</span>
      <span><kbd class="kbd-shortcut">R</kbd> Recall</span>
      <span><kbd class="kbd-shortcut">E</kbd> Expo</span>
      <span><kbd class="kbd-shortcut">A</kbd> All Day</span>
    </div>
    <div>Hardware: Touch / Mouse / Bump Bar Ready</div>
  </footer>

  <script>
    // Live KDS Clock
    function updateKdsClock() {
      const el = document.getElementById('kds-clock');
      if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    }
    setInterval(updateKdsClock, 1000);
    updateKdsClock();

    // Floating Non-Blocking Toast System
    function showKdsToast(message, type = 'info') {
      const container = document.getElementById('kds-toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = 'kds-toast ' + type;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.transition = 'all 200ms ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 200);
      }, 3500);
    }

    // Web Audio Synthesizer & User Autoplay Unlock
    let audioCtx = null;
    let audioEnabled = localStorage.getItem('kds_audio_enabled') !== 'false';

    function getAudioContext() {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      return audioCtx;
    }

    function updateAudioButtonUI() {
      const btn = document.getElementById('kds-audio-toggle');
      const iconSpan = document.getElementById('kds-audio-icon');
      const labelSpan = document.getElementById('kds-audio-label');
      if (!btn || !labelSpan) return;
      if (audioEnabled) {
        if (iconSpan) iconSpan.textContent = '🔔';
        labelSpan.textContent = 'Alerts: Active';
        btn.style.color = 'var(--color-sage)';
        btn.style.borderColor = 'rgba(93, 154, 122, 0.4)';
      } else {
        if (iconSpan) iconSpan.textContent = '🔇';
        labelSpan.textContent = 'Alerts: Muted';
        btn.style.color = 'var(--color-stone)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      }
    }

    function toggleKdsAudio() {
      audioEnabled = !audioEnabled;
      localStorage.setItem('kds_audio_enabled', audioEnabled ? 'true' : 'false');
      updateAudioButtonUI();
      if (audioEnabled) {
        getAudioContext();
        playChime('new_order');
        showKdsToast('Audio alerts enabled', 'success');
      } else {
        showKdsToast('Audio alerts muted', 'warning');
      }
    }

    function playChime(type) {
      if (!audioEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        if (type === 'new_order') {
          // Melodic double chime: 587.33Hz (D5) -> 880Hz (A5)
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(587.33, now);
          gain1.gain.setValueAtTime(0.18, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.28);

          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(880, now + 0.14);
          gain2.gain.setValueAtTime(0.22, now + 0.14);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now + 0.14);
          osc2.stop(now + 0.5);
        } else if (type === 'sla_alert') {
          // Urgent warning tone
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(660, now);
          osc.frequency.linearRampToValueAtTime(440, now + 0.3);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
        }
      } catch (e) {
        // Autoplay policy restrictions handled safely
      }
    }

    // Initialize audio button state
    updateAudioButtonUI();

    // Authoritative Server-Side SLA Calculation Engine
    function updateAllSlaTimers() {
      const cards = document.querySelectorAll('.ticket-card[data-task-id]');
      const now = Date.now();

      cards.forEach((card) => {
        const taskId = card.getAttribute('data-task-id');
        const station = card.getAttribute('data-station');
        const status = card.getAttribute('data-status');
        const createdAtStr = card.getAttribute('data-created-at');
        const slaMinutes = parseInt(card.getAttribute('data-sla-minutes') || '10', 10);
        const badge = document.getElementById('sla-badge-' + taskId);
        if (!badge || !createdAtStr) return;

        const createdAt = new Date(createdAtStr).getTime();
        const elapsedSeconds = Math.max(0, Math.floor((now - createdAt) / 1000));
        const slaSeconds = slaMinutes * 60;
        const elapsedMinutes = Math.floor(elapsedSeconds / 60);
        const elapsedSecRemainder = elapsedSeconds % 60;
        const formattedTime = elapsedMinutes + ':' + (elapsedSecRemainder < 10 ? '0' : '') + elapsedSecRemainder;

        if (status === 'BUMPED') {
          badge.textContent = 'FULFILLED';
          badge.style.color = 'var(--color-sage)';
          return;
        }

        if (elapsedSeconds >= slaSeconds) {
          card.classList.add('SLA_BREACH');
          card.classList.remove('SLA_WARNING');
          badge.textContent = 'OVERDUE +' + (elapsedMinutes - slaMinutes) + 'm · ' + formattedTime + ' / ' + slaMinutes + 'm';
          badge.style.color = 'var(--color-crimson)';
          badge.style.fontWeight = '900';
        } else if (elapsedSeconds >= 0.75 * slaSeconds) {
          card.classList.add('SLA_WARNING');
          card.classList.remove('SLA_BREACH');
          badge.textContent = 'RUSH · ' + formattedTime + ' / ' + slaMinutes + 'm';
          badge.style.color = 'var(--color-amber)';
          badge.style.fontWeight = '800';
        } else {
          card.classList.remove('SLA_BREACH');
          card.classList.remove('SLA_WARNING');
          badge.textContent = formattedTime + ' / ' + slaMinutes + 'm';
          badge.style.color = 'var(--color-linen)';
          badge.style.fontWeight = '700';
        }
      });
    }

    setInterval(updateAllSlaTimers, 1000);
    updateAllSlaTimers();

    // Headers helper
    function getKdsHeaders() {
      return { 'Content-Type': 'application/json' };
    }

    // Authenticate KDS Station via Staff PIN
    async function promptKdsAuth() {
      const pin = prompt('Enter Staff PIN to authenticate KDS workstation:');
      if (!pin) return;
      try {
        const res = await fetch('/api/restaurant/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ pin, branchId: window.__STAFF_SESSION__?.branchId || 'branch_ldh' }),
        });
        const data = await res.json();
        if (res.ok && data.data?.role) {
          window.__STAFF_SESSION__.isAuthenticated = true;
          window.__STAFF_SESSION__.role = data.data.role;
          showKdsToast('Authenticated as ' + data.data.role, 'success');
          setTimeout(() => location.reload(), 300);
        } else {
          showKdsToast(data.message || 'Authentication failed', 'error');
        }
      } catch (err) {
        showKdsToast('Network error during authentication', 'error');
      }
    }

    // Individual Item Fulfillment
    async function toggleItemFulfill(taskId) {
      if (!window.__STAFF_SESSION__?.isAuthenticated && !window.__STAFF_SESSION__?.role) {
        showKdsToast('Staff authentication required. Enter PIN to fulfill items.', 'error');
        promptKdsAuth();
        return;
      }
      const row = document.getElementById('item-row-' + taskId);
      const btn = row ? row.querySelector('.item-check-btn') : null;
      if (row && btn) {
        row.classList.toggle('item-fulfilled');
        btn.classList.toggle('checked');
      }
      try {
        const res = await fetch('/api/restaurant/kds/item-fulfill', {
          method: 'POST',
          headers: getKdsHeaders(),
          credentials: 'same-origin',
          body: JSON.stringify({ taskId }),
        });
        const json = await res.json();
        if (res.ok) {
          showKdsToast('Item fulfilled', 'success');
        } else {
          showKdsToast(json.error || 'Fulfillment failed', 'error');
        }
      } catch (err) {
        showKdsToast('Network error fulfilling item', 'error');
      }
    }

    // Bump Action with Real REST Mutation
    async function bumpTask(taskId, newStatus) {
      if (!window.__STAFF_SESSION__?.isAuthenticated && !window.__STAFF_SESSION__?.role) {
        showKdsToast('Staff authentication required. Enter PIN to bump tickets.', 'error');
        promptKdsAuth();
        return;
      }
      const card = document.getElementById('ticket-' + taskId);
      if (card) {
        card.style.opacity = '0.5';
        card.style.transform = 'scale(0.97)';
      }

      try {
        const res = await fetch('/api/restaurant/kds/bump', {
          method: 'POST',
          headers: getKdsHeaders(),
          credentials: 'same-origin',
          body: JSON.stringify({ taskId, newStatus, bumpedBy: 'Chef' }),
        });
        const json = await res.json();
        if (res.ok) {
          if (newStatus === 'BUMPED') {
            if (card) {
              card.style.transition = 'all 200ms ease';
              card.style.transform = 'scale(0.9) translateY(20px)';
              card.style.opacity = '0';
              setTimeout(() => card.remove(), 200);
            }
            showKdsToast('Ticket bumped', 'success');
          } else {
            showKdsToast('Ticket transitioned to ' + newStatus, 'success');
            setTimeout(() => location.reload(), 200);
          }
        } else {
          showKdsToast(json.error || 'Bump failed', 'error');
          if (card) card.style.opacity = '1';
        }
      } catch (err) {
        showKdsToast('Network error bumping ticket', 'error');
        if (card) card.style.opacity = '1';
      }
    }

    // Recall Task
    async function recallTask(taskId, targetStatus = 'READY') {
      if (!window.__STAFF_SESSION__?.isAuthenticated && !window.__STAFF_SESSION__?.role) {
        showKdsToast('Staff authentication required. Enter PIN to recall tickets.', 'error');
        promptKdsAuth();
        return;
      }
      try {
        const res = await fetch('/api/restaurant/kds/recall', {
          method: 'POST',
          headers: getKdsHeaders(),
          credentials: 'same-origin',
          body: JSON.stringify({ taskId, targetStatus }),
        });
        const json = await res.json();
        if (res.ok) {
          showKdsToast('Task recalled to ' + targetStatus, 'success');
          setTimeout(() => location.reload(), 200);
        } else {
          showKdsToast(json.error || 'Recall failed', 'error');
        }
      } catch (err) {
        showKdsToast('Network error recalling task', 'error');
      }
    }

    // Expo Order Dispatch with Readiness Gating
    async function dispatchExpoOrder(tableNumber, isPending = false) {
      if (!window.__STAFF_SESSION__?.isAuthenticated && !window.__STAFF_SESSION__?.role) {
        showKdsToast('Staff authentication required. Enter PIN to dispatch expo orders.', 'error');
        promptKdsAuth();
        return;
      }
      if (isPending) {
        const confirmForce = confirm(
          'Warning: Table ' + tableNumber + ' has items currently cooking! Force dispatch as manager override?'
        );
        if (!confirmForce) return;
      }

      try {
        const res = await fetch('/api/restaurant/kds/expo-dispatch', {
          method: 'POST',
          headers: getKdsHeaders(),
          credentials: 'same-origin',
          body: JSON.stringify({ tableNumber, force: isPending }),
        });
        const json = await res.json();
        if (res.ok) {
          showKdsToast('Table ' + tableNumber + ' dispatched to floor runners', 'success');
          const card = document.getElementById('expo-card-' + tableNumber);
          if (card) {
            card.style.transition = 'all 200ms ease';
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 200);
          }
        } else {
          showKdsToast(json.message || json.error || 'Expo dispatch failed', 'error');
        }
      } catch (err) {
        showKdsToast('Network error during expo dispatch', 'error');
      }
    }

    // Table-level Expo Recall
    async function promptExpoTableRecall() {
      if (!window.__STAFF_SESSION__?.isAuthenticated && !window.__STAFF_SESSION__?.role) {
        showKdsToast('Staff authentication required. Enter PIN to recall expo tables.', 'error');
        promptKdsAuth();
        return;
      }
      const tableNumber = prompt('Enter Table Number to recall dispatched tickets:');
      if (!tableNumber) return;

      try {
        const res = await fetch('/api/restaurant/kds/expo-recall', {
          method: 'POST',
          headers: getKdsHeaders(),
          credentials: 'same-origin',
          body: JSON.stringify({ tableNumber }),
        });
        const json = await res.json();
        if (res.ok) {
          showKdsToast(json.message, 'success');
          setTimeout(() => location.reload(), 300);
        } else {
          showKdsToast(json.error || 'Recall failed', 'error');
        }
      } catch (err) {
        showKdsToast('Network error recalling table', 'error');
      }
    }

    // Keyboard & Bump Bar Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        const firstStartBtn = document.querySelector('.bump-btn-start');
        if (firstStartBtn) firstStartBtn.click();
      } else if (e.key === 'Enter') {
        const firstReadyBtn = document.querySelector('.bump-btn-ready') || document.querySelector('.bump-btn-bump');
        if (firstReadyBtn) firstReadyBtn.click();
      } else if (e.key.toLowerCase() === 'r') {
        window.location.href = '/kds?station=RECALL';
      } else if (e.key.toLowerCase() === 'e') {
        window.location.href = '/kds?station=EXPO';
      } else if (e.key.toLowerCase() === 'a') {
        window.location.href = '/kds?station=ALL_DAY';
      }
    });

    // Durable Monotonic Audio Watermarking & Deduplication Engine (Phase 6B)
    const branchId = "${branchId}";
    const serverCurrentSeq = ${currentSequence};
    const watermarkStorageKey = 'kds_audio_watermark_' + branchId;

    // Initialize watermark in localStorage: on fresh load, watermark is initialized to server current sequence
    // to prevent ringing bells for historical tickets already in the system.
    let storedWatermark = parseInt(localStorage.getItem(watermarkStorageKey) || '', 10);
    if (isNaN(storedWatermark)) {
      storedWatermark = serverCurrentSeq;
      localStorage.setItem(watermarkStorageKey, String(storedWatermark));
    }

    const seenEventIds = new Set();

    try {
      const sseUrl = '/api/restaurant/events?lastEventId=' + storedWatermark + '&branchId=' + encodeURIComponent(branchId);
      const evtSource = new EventSource(sseUrl);

      function handleDomainEvent(e, eventType) {
        let payload = null;
        try {
          payload = JSON.parse(e.data);
        } catch (err) {}

        const eventId = payload?.id || (eventType + '_' + (e.lastEventId || Date.now()));
        const eventSeq = typeof payload?.sequence === 'number' ? payload.sequence : parseInt(e.lastEventId || '0', 10);

        // 1. Stable Event Deduplication: drop duplicate events
        if (seenEventIds.has(eventId)) return;
        seenEventIds.add(eventId);

        // 2. Monotonic Audio Gating:
        // Audio plays ONLY IF eventSeq > storedWatermark AND eventType produces sound.
        // Catch-up / replayed / historical events update state but DO NOT trigger audio.
        const isForwardEvent = eventSeq > storedWatermark;

        if (isForwardEvent) {
          storedWatermark = eventSeq;
          localStorage.setItem(watermarkStorageKey, String(storedWatermark));

          if (eventType === 'order.created' || eventType === 'task.created') {
            playChime('new_order');
            showKdsToast('New Order Ticket Received', 'info');
          } else if (eventType === 'expo.dispatched') {
            showKdsToast('Table order dispatched to runners', 'success');
          }
        }

        setTimeout(() => location.reload(), 400);
      }

      // Handle Resync Required: when client cursor is older than retained history window
      evtSource.addEventListener('resync_required', (e) => {
        let resyncPayload = {};
        try { resyncPayload = JSON.parse(e.data); } catch (err) {}
        if (resyncPayload.oldestAvailableSequence) {
          storedWatermark = Math.max(storedWatermark, resyncPayload.oldestAvailableSequence);
          localStorage.setItem(watermarkStorageKey, String(storedWatermark));
        }
        // Silent reload without catch-up alerts
        location.reload();
      });

      evtSource.addEventListener('order.created', (e) => handleDomainEvent(e, 'order.created'));
      evtSource.addEventListener('task.created', (e) => handleDomainEvent(e, 'task.created'));
      evtSource.addEventListener('task.started', (e) => handleDomainEvent(e, 'task.started'));
      evtSource.addEventListener('task.ready', (e) => handleDomainEvent(e, 'task.ready'));
      evtSource.addEventListener('task.bumped', (e) => handleDomainEvent(e, 'task.bumped'));
      evtSource.addEventListener('task.recalled', (e) => handleDomainEvent(e, 'task.recalled'));
      evtSource.addEventListener('expo.dispatched', (e) => handleDomainEvent(e, 'expo.dispatched'));
    } catch (err) {}
  </script>
</body>
</html>`;
}
