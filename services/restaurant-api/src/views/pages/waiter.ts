/**
 * 📱 RestaurantOS — Dedicated Waiter Mobile App (/waiter)
 * ─────────────────────────────────────────────────────────────────────────────
 * Matches approved concepts:
 * - '43 · Waiter phone · My tables.png'
 * - '44 · Waiter phone · Take order.png'
 *
 * Designed for touch-first floor service on 390px viewports with strict
 * staff-scope awareness (never escalates SERVER/WAITER to Manager/Owner tools).
 */

import {
  MenuItem,
  TableFloorRecord,
  BranchRecord,
  RestaurantOrder,
  KitchenTask,
  ServiceRequest,
} from '../../shared';

export interface WaiterWorkspaceOptions {
  tables: TableFloorRecord[];
  menuItems: MenuItem[];
  branches: BranchRecord[];
  orders: RestaurantOrder[];
  kitchenTasks?: KitchenTask[];
  serviceRequests: ServiceRequest[];
  currentBranchId: string;
  tenantName: string;
  staffIdentity?: {
    id: string;
    name?: string;
    role?: string;
    type?: string;
  };
  requiresLogin?: boolean;
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderWaiterWorkspace(opts: WaiterWorkspaceOptions): string {
  const {
    tables,
    menuItems,
    branches,
    orders,
    kitchenTasks = [],
    serviceRequests,
    currentBranchId,
    tenantName,
    staffIdentity,
    requiresLogin = false,
  } = opts;

  const currentBranch = branches.find((b) => b.id === currentBranchId) || branches[0];
  const branchName = currentBranch?.name || 'Main Dining';
  const serverDisplayName = staffIdentity?.name || staffIdentity?.id || '';
  const staffRole = (staffIdentity?.role || (staffIdentity?.type === 'ADMIN' ? 'ADMIN' : '')).toUpperCase();
  const isSignedInStaff = Boolean(staffIdentity && staffIdentity.type !== 'ANONYMOUS' && staffIdentity.type !== 'DINER');

  const safeData = JSON.stringify({
    branchId: currentBranch?.id || currentBranchId || 'branch_ldh',
    branchName,
    tenantName,
    staff: {
      signedIn: isSignedInStaff,
      id: staffIdentity?.id || '',
      name: serverDisplayName,
      role: staffRole,
    },
    tables: tables.map((t) => ({
      id: t.id,
      number: t.number,
      capacity: t.capacity,
      status: t.status,
      section: t.section || 'Main',
      serverName: t.serverName || '',
      activeSessionId: t.activeSessionId || null,
      branchId: t.branchId,
    })),
    orders: orders.map((o) => ({
      id: o.id,
      tableNumber: o.tableNumber,
      status: o.status,
      totalMinor: o.totalMinor || 0,
      subtotalMinor: o.subtotalMinor || 0,
      taxMinor: o.taxMinor || 0,
      serverName: (o as any).serverName || '',
      createdAt: o.createdAt,
      items: (o.items || []).map((i: any) => ({
        name: i.name || i.menuItemName || 'Dish',
        quantity: Number(i.quantity || 1),
        priceMinor: Number(i.priceMinor || i.unitPriceMinor || 0),
      })),
    })),
    kitchenTasks: kitchenTasks.map((k) => ({
      id: k.id,
      orderId: k.orderId,
      tableNumber: k.tableNumber,
      station: k.station,
      status: k.status,
      items: ((k as any).items || []).map((i: any) => ({
        name: i.name || 'Dish',
        quantity: Number(i.quantity || 1),
      })),
    })),
    serviceRequests: serviceRequests.filter((r) => r.status === 'PENDING'),
    menu: menuItems
      .filter((m) => (m as any).available !== false && (m as any).isAvailable !== false)
      .map((m) => ({
        id: m.id,
        name: m.name,
        category: (m as any).categoryName || m.category || 'Mains',
        description: m.description || '',
        priceMinor: Number(m.basePriceMinor || 0),
        isVeg:
          (m as any).isVegetarian ??
          (!((m.dietaryFlags || []) as string[]).includes('NON_VEG') ||
            ((m.dietaryFlags || []) as string[]).includes('VEG') ||
            ((m.dietaryFlags || []) as string[]).includes('VEGAN')),
        prepMinutes: Number(m.prepDurationMinutes || 12),
      })),
  }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Waiter Mobile · ${esc(tenantName)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg-canvas: #090D16;
      --bg-surface: #111827;
      --bg-card: #161F33;
      --bg-card-elev: #1D2842;
      --border-subtle: rgba(148, 163, 184, 0.16);
      --text-primary: #F8FAFC;
      --text-muted: #94A3B8;
      --accent-blue: #2563EB;
      --accent-green: #10B981;
      --accent-amber: #F59E0B;
      --accent-rose: #F43F5E;
    }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body {
      margin: 0;
      padding: 0;
      background: var(--bg-canvas);
      color: var(--text-primary);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      overflow-x: hidden;
      min-height: 100vh;
    }
    .waiter-shell {
      max-width: 520px;
      margin: 0 auto;
      min-height: 100vh;
      padding: 14px 16px 156px 16px;
      position: relative;
    }
    .waiter-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 0 14px 0;
      position: sticky;
      top: 0;
      z-index: 30;
      background: rgba(9, 13, 22, 0.92);
      backdrop-filter: blur(12px);
    }
    .brand-mark {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .brand-badge {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      background: linear-gradient(135deg, #2563EB, #1D4ED8);
      color: #fff;
      font-weight: 800;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .topbar-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .topbar-sub {
      font-size: 11px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .chip-btn {
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface);
      color: var(--text-primary);
      border-radius: 9999px;
      padding: 7px 12px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .chip-btn.active {
      background: #F8FAFC;
      color: #090D16;
      border-color: #F8FAFC;
    }
    .live-banner {
      display: none;
      margin-bottom: 12px;
      background: rgba(16, 185, 129, 0.14);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 16px;
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 600;
      color: #A7F3D0;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .live-banner.show { display: flex; }
    .kpi-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .kpi-cell {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 10px 10px;
    }
    .kpi-num {
      font-size: 20px;
      font-weight: 800;
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
    .kpi-lbl {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 3px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 18px 0 10px 0;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .table-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 14px 16px;
      margin-bottom: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .table-card.ready {
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.16), rgba(16, 185, 129, 0.06));
      border-color: rgba(16, 185, 129, 0.42);
    }
    .table-card.calling {
      background: linear-gradient(180deg, rgba(37, 99, 235, 0.2), rgba(37, 99, 235, 0.08));
      border-color: rgba(59, 130, 246, 0.45);
    }
    .table-card.bill {
      background: linear-gradient(180deg, rgba(245, 158, 11, 0.16), rgba(245, 158, 11, 0.06));
      border-color: rgba(245, 158, 11, 0.42);
    }
    .card-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .tbl-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      font-size: 16px;
    }
    .status-tag {
      font-size: 11px;
      font-weight: 700;
      border-radius: 9999px;
      padding: 4px 10px;
    }
    .tag-ready { background: rgba(16, 185, 129, 0.2); color: #6EE7B7; }
    .tag-cooking { background: rgba(148, 163, 184, 0.16); color: #E2E8F0; }
    .tag-calling { background: rgba(59, 130, 246, 0.25); color: #93C5FD; }
    .tag-bill { background: rgba(245, 158, 11, 0.22); color: #FCD34D; }
    .card-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn-w {
      border: none;
      border-radius: 9999px;
      padding: 9px 14px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn-w.primary { background: #F8FAFC; color: #090D16; }
    .btn-w.emerald { background: #10B981; color: #052E16; }
    .btn-w.blue { background: #2563EB; color: #FFFFFF; }
    .btn-w.ghost { background: rgba(255,255,255,0.08); color: #E2E8F0; border: 1px solid rgba(255,255,255,0.1); }
    .free-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .free-tile {
      background: var(--bg-surface);
      border: 1px dashed rgba(148, 163, 184, 0.35);
      border-radius: 16px;
      padding: 12px 10px;
      text-align: left;
      color: var(--text-primary);
      cursor: pointer;
    }
    .free-tile:active { transform: scale(0.98); }

    /* Take order view */
    .order-table-strip {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }
    .search-dark {
      width: 100%;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: #fff;
      border-radius: 14px;
      padding: 11px 14px;
      font-size: 14px;
      outline: none;
      margin-bottom: 10px;
    }
    .dish-row-w {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      padding: 12px 14px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .veg-dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      display: inline-block;
      margin-right: 6px;
    }
    .stepper {
      display: inline-flex;
      align-items: center;
      background: #0B1120;
      border: 1px solid var(--border-subtle);
      border-radius: 9999px;
      padding: 3px;
      gap: 6px;
      flex-shrink: 0;
    }
    .step-btn {
      width: 30px;
      height: 30px;
      border-radius: 9999px;
      border: none;
      background: #1E293B;
      color: #F8FAFC;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .step-btn.add { background: #2563EB; }
    .step-qty {
      min-width: 18px;
      text-align: center;
      font-size: 13px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .send-kitchen-bar {
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      bottom: 78px;
      width: min(488px, calc(100vw - 24px));
      background: #0F172A;
      border: 1px solid rgba(59, 130, 246, 0.45);
      border-radius: 22px;
      padding: 10px 12px 10px 16px;
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      z-index: 35;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
    }
    .send-kitchen-bar.show { display: flex; }

    /* Bottom Dock */
    .waiter-dock {
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      bottom: 12px;
      width: min(488px, calc(100vw - 24px));
      background: rgba(17, 24, 39, 0.96);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 26px;
      padding: 6px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      z-index: 40;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
    }
    .dock-item {
      border: none;
      background: transparent;
      color: var(--text-muted);
      border-radius: 20px;
      padding: 8px 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .dock-item.active {
      background: #F8FAFC;
      color: #090D16;
      font-weight: 800;
    }

    /* Bottom sheets / Modals */
    .sheet-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.72);
      backdrop-filter: blur(4px);
      z-index: 60;
      display: none;
      align-items: flex-end;
      justify-content: center;
    }
    .sheet-backdrop.open { display: flex; }
    .sheet-card {
      width: min(520px, 100vw);
      background: #111827;
      border-top: 1px solid var(--border-subtle);
      border-radius: 28px 28px 0 0;
      padding: 18px 20px 28px 20px;
      max-height: 85vh;
      overflow-y: auto;
    }
    .sheet-handle {
      width: 40px;
      height: 4px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.35);
      margin: 0 auto 14px auto;
    }
    .toast-w {
      position: fixed;
      top: 66px;
      left: 50%;
      transform: translateX(-50%);
      background: #F8FAFC;
      color: #090D16;
      padding: 9px 16px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      z-index: 80;
      display: none;
      box-shadow: 0 12px 30px rgba(0,0,0,0.4);
      max-width: calc(100vw - 32px);
      text-align: center;
    }
    .toast-w.show { display: block; }
  </style>
</head>
<body>
  <div id="waiter-toast" class="toast-w" role="status"></div>

  <div class="waiter-shell">
    <header class="waiter-topbar">
      <div class="brand-mark">
        <div class="brand-badge">W</div>
        <div style="min-width:0;">
          <div class="topbar-title" id="waiter-title">My tables</div>
          <div class="topbar-sub" id="waiter-subtitle">${esc(branchName)} · ${esc(isSignedInStaff ? `${serverDisplayName} (${staffRole || 'STAFF'})` : 'Floor Mode')}</div>
        </div>
      </div>
      <div style="display:flex; gap:6px; align-items:center;">
        <button type="button" id="scope-toggle-btn" class="chip-btn" onclick="toggleTableScope()">All Hall</button>
        <button type="button" id="staff-auth-btn" class="chip-btn" onclick="openStaffAuthSheet()">${isSignedInStaff ? 'Switch Staff' : 'Staff Sign In'}</button>
      </div>
    </header>

    ${requiresLogin ? `
      <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 24px; padding: 24px; margin-top: 20px;">
        <h2 style="margin:0 0 6px 0; font-size: 18px;">Waiter &amp; Floor Sign In</h2>
        <p style="margin:0 0 16px 0; font-size: 13px; color: var(--text-muted);">
          Sign in with your floor server credentials (SERVER / WAITER / RUNNER / HOST) to open your assigned tables and fire kitchen orders.
        </p>
        <button type="button" class="btn-w blue" style="width:100%; padding:12px;" onclick="openStaffAuthSheet()">Sign in to Floor Shift</button>
      </div>
    ` : `
      <div id="live-kitchen-banner" class="live-banner">
        <span id="live-kitchen-banner-text">Kitchen ticket ready</span>
        <button type="button" class="chip-btn" onclick="dismissLiveBanner()">Dismiss</button>
      </div>

      <!-- SCREEN A: MY TABLES -->
      <section id="view-tables">
        <div class="kpi-strip" id="waiter-kpis"></div>
        <div id="waiter-sections"></div>
      </section>

      <!-- SCREEN B: TAKE ORDER -->
      <section id="view-take-order" style="display:none;">
        <div class="order-table-strip" id="order-table-strip"></div>
        <div id="active-table-sent-summary" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 10px 14px; margin-bottom: 10px; font-size: 12px; color: var(--text-muted); display:flex; justify-content:space-between; align-items:center;"></div>
        <input type="search" id="waiter-menu-search" class="search-dark" placeholder="Search dishes (e.g. Naan, Tikka, Chai)..." oninput="renderTakeOrder()" />
        <div class="order-table-strip" id="waiter-diet-pills"></div>
        <div class="order-table-strip" id="waiter-cat-pills"></div>
        <div id="waiter-menu-list"></div>
      </section>

      <!-- SCREEN C: LIVE FLOOR ALERTS -->
      <section id="view-alerts" style="display:none;"></section>

      <!-- SCREEN D: ACTIVE KITCHEN & TABLE ORDERS -->
      <section id="view-orders" style="display:none;"></section>
    `}
  </div>

  ${!requiresLogin ? `
    <div id="send-kitchen-bar" class="send-kitchen-bar">
      <div>
        <div id="draft-count-label" style="font-size:13px; font-weight:800; color:#fff;">0 items selected</div>
        <div id="draft-subtotal-label" style="font-size:11px; color:#94A3B8;">Table —</div>
      </div>
      <button type="button" id="send-kitchen-btn" class="btn-w blue" style="padding:11px 18px; font-size:13px;" onclick="submitWaiterOrder()">
        Send to kitchen
      </button>
    </div>

    <nav class="waiter-dock" aria-label="Waiter workspace navigation">
      <button type="button" class="dock-item active" data-tab="tables" onclick="switchWaiterTab('tables')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
        <span>My tables</span>
      </button>
      <button type="button" class="dock-item" data-tab="take-order" onclick="switchWaiterTab('take-order')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        <span>Take order</span>
      </button>
      <button type="button" class="dock-item" data-tab="alerts" onclick="switchWaiterTab('alerts')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        <span id="dock-alerts-lbl">Alerts</span>
      </button>
      <button type="button" class="dock-item" data-tab="orders" onclick="switchWaiterTab('orders')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
        <span>Orders</span>
      </button>
    </nav>
  ` : ''}

  <!-- Seat Party Bottom Sheet -->
  <div id="seat-sheet" class="sheet-backdrop" onclick="if(event.target===this) closeSeatSheet()">
    <div class="sheet-card">
      <div class="sheet-handle"></div>
      <h3 style="margin:0 0 4px 0; font-size:18px;" id="seat-sheet-title">Seat a new party</h3>
      <p style="margin:0 0 14px 0; font-size:12px; color:var(--text-muted);">Opens a dining session and prepares this table for ordering.</p>
      <form onsubmit="confirmSeatParty(event)">
        <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:6px;">Guest / Party Name</label>
        <input id="seat-guest-name" class="search-dark" required placeholder="e.g. Sharma Family" />
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:8px;">
          <button type="button" class="btn-w ghost" onclick="closeSeatSheet()">Cancel</button>
          <button type="submit" id="seat-submit-btn" class="btn-w blue">Seat &amp; Take Order</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Table Bill Viewer Bottom Sheet -->
  <div id="bill-sheet" class="sheet-backdrop" onclick="if(event.target===this) closeBillSheet()">
    <div class="sheet-card">
      <div class="sheet-handle"></div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="margin:0; font-size:18px;" id="bill-sheet-title">Table Bill</h3>
        <button type="button" class="chip-btn" onclick="closeBillSheet()">Close</button>
      </div>
      <div id="bill-sheet-body" style="font-size:13px; color:#E2E8F0;">Loading bill...</div>
    </div>
  </div>

  <!-- Staff Sign-In Bottom Sheet -->
  <div id="staff-auth-sheet" class="sheet-backdrop" onclick="if(event.target===this) closeStaffAuthSheet()">
    <div class="sheet-card">
      <div class="sheet-handle"></div>
      <h3 style="margin:0 0 4px 0; font-size:18px;">Floor Staff Sign In</h3>
      <p style="margin:0 0 14px 0; font-size:12px; color:var(--text-muted);">
        Sign in with Staff ID, phone, or email and password (or enrolled device token + PIN).
      </p>
      <div id="staff-auth-error" style="display:none; background:rgba(244,63,94,0.16); border:1px solid rgba(244,63,94,0.4); color:#FDA4AF; padding:8px 12px; border-radius:12px; font-size:12px; margin-bottom:10px;"></div>
      <form onsubmit="submitStaffAuth(event)">
        <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:5px;">Staff ID / Email</label>
        <input id="auth-identifier" class="search-dark" required placeholder="e.g. staff_aman or aman@spicegarden.in" />
        <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:5px;">Password / PIN</label>
        <input id="auth-secret" type="password" class="search-dark" required placeholder="Enter staff secret or PIN" />
        <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:5px;">Device Token (optional for short PIN)</label>
        <input id="auth-device-token" class="search-dark" placeholder="Optional enrolled device token" />
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:6px;">
          <button type="button" class="btn-w ghost" onclick="closeStaffAuthSheet()">Cancel</button>
          <button type="submit" id="auth-submit-btn" class="btn-w blue">Sign In</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    const INITIAL_STATE = ${safeData};
    function matchesStaffName(t, staffObj) {
      if (!staffObj || !staffObj.name) return true;
      const myName = String(staffObj.name).toLowerCase().split(' ')[0];
      if (!t.serverName) return false;
      return String(t.serverName).toLowerCase().includes(myName);
    }
    const _hasAssigned = INITIAL_STATE.tables.some((t) => matchesStaffName(t, INITIAL_STATE.staff));
    let state = {
      ...INITIAL_STATE,
      activeTab: 'tables',
      showAllTables: !INITIAL_STATE.staff.signedIn || !_hasAssigned,
      selectedTableNum: (INITIAL_STATE.tables.find(t => t.activeSessionId || t.status === 'OCCUPIED') || INITIAL_STATE.tables[0] || {}).number || 'T-01',
      selectedCategory: 'ALL',
      dietFilter: 'ALL',
      draftCart: {}, // menuId -> qty
      pendingSeatTable: null,
    };

    function matchesMyServer(t) {
      return matchesStaffName(t, state && state.staff);
    }

    function escH(s) {
      return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function showToastW(msg) {
      const el = document.getElementById('waiter-toast');
      if (!el) return;
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(window.__waiterToastTimer);
      window.__waiterToastTimer = setTimeout(() => el.classList.remove('show'), 3600);
    }

    function dismissLiveBanner() {
      const b = document.getElementById('live-kitchen-banner');
      if (b) b.classList.remove('show');
    }

    function toggleTableScope() {
      state.showAllTables = !state.showAllTables;
      const btn = document.getElementById('scope-toggle-btn');
      if (btn) btn.textContent = state.showAllTables ? 'My Section' : 'All Hall';
      renderWaiterTables();
    }

    function switchWaiterTab(tab) {
      state.activeTab = tab;
      document.querySelectorAll('.dock-item').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-tab') === tab);
      });
      const views = ['tables', 'take-order', 'alerts', 'orders'];
      views.forEach((v) => {
        const el = document.getElementById('view-' + v);
        if (el) el.style.display = v === tab ? 'block' : 'none';
      });
      const titleEl = document.getElementById('waiter-title');
      if (titleEl) {
        titleEl.textContent =
          tab === 'tables'
            ? 'My tables'
            : tab === 'take-order'
              ? state.selectedTableNum + ' · Take order'
              : tab === 'alerts'
                ? 'Floor Alerts'
                : 'Active Orders';
      }
      renderAll();
    }

    function openTakeOrderForTable(tableNumber) {
      state.selectedTableNum = tableNumber;
      state.draftCart = {};
      switchWaiterTab('take-order');
    }

    function getVisibleTables() {
      if (state.showAllTables) return state.tables;
      const mine = state.tables.filter(matchesMyServer);
      return mine.length > 0 ? mine : state.tables;
    }

    function getActiveOrdersForTable(tableNumber) {
      return state.orders.filter(
        (o) =>
          String(o.tableNumber).replace(/^T-/i, '') === String(tableNumber).replace(/^T-/i, '') &&
          !['CANCELLED', 'VOID', 'PAID', 'COMPLETED'].includes(String(o.status || '').toUpperCase())
      );
    }

    function getReadyOrders() {
      const doneStatuses = new Set(['SERVED', 'COMPLETED', 'PAID', 'CANCELLED', 'VOID']);
      const readyTaskOrderIds = new Set(
        (state.kitchenTasks || [])
          .filter((k) => String(k.status || '').toUpperCase() === 'READY')
          .map((k) => String(k.orderId))
      );
      return (state.orders || []).filter((o) => {
        const st = String(o.status || '').toUpperCase();
        if (doneStatuses.has(st)) return false;
        return st === 'READY' || readyTaskOrderIds.has(String(o.id));
      });
    }

    function renderWaiterTables() {
      const kpiEl = document.getElementById('waiter-kpis');
      const secEl = document.getElementById('waiter-sections');
      if (!kpiEl || !secEl) return;

      const visibleTables = getVisibleTables();
      const scopeBtn = document.getElementById('scope-toggle-btn');
      if (scopeBtn) {
        scopeBtn.textContent = state.showAllTables ? 'My Section' : 'All Hall';
        scopeBtn.classList.toggle('active', !state.showAllTables);
      }

      const readyOrders = getReadyOrders();
      const readyTableNums = new Set(readyOrders.map((o) => String(o.tableNumber)));
      const pendingCalls = state.serviceRequests.filter((r) => r.status === 'PENDING');
      const callingNums = new Set(pendingCalls.map((r) => String(r.tableNumber)));

      const foodReadyTables = visibleTables.filter((t) => readyTableNums.has(String(t.number)));
      const callingTables = visibleTables.filter((t) => !readyTableNums.has(String(t.number)) && callingNums.has(String(t.number)));
      const billAskedTables = visibleTables.filter((t) => t.status === 'BILL_REQUESTED');
      const cookingTables = visibleTables.filter(
        (t) =>
          (t.activeSessionId || t.status === 'OCCUPIED') &&
          t.status !== 'BILL_REQUESTED' &&
          !readyTableNums.has(String(t.number)) &&
          !callingNums.has(String(t.number))
      );
      const sectionFreeTables = visibleTables.filter(
        (t) => !t.activeSessionId && t.status !== 'OCCUPIED' && t.status !== 'BILL_REQUESTED'
      );
      const freeTables = sectionFreeTables.length > 0
        ? sectionFreeTables
        : state.tables.filter((t) => !t.activeSessionId && t.status !== 'OCCUPIED' && t.status !== 'BILL_REQUESTED');

      kpiEl.innerHTML = \`
        <div class="kpi-cell"><div class="kpi-num" style="color:#6EE7B7;">\${foodReadyTables.length}</div><div class="kpi-lbl">Ready</div></div>
        <div class="kpi-cell"><div class="kpi-num" style="color:#93C5FD;">\${pendingCalls.length}</div><div class="kpi-lbl">Calling</div></div>
        <div class="kpi-cell"><div class="kpi-num" style="color:#FCD34D;">\${billAskedTables.length}</div><div class="kpi-lbl">Bill</div></div>
        <div class="kpi-cell"><div class="kpi-num">\${freeTables.length}</div><div class="kpi-lbl">Free</div></div>
      \`;

      const dockAlertEl = document.getElementById('dock-alerts-lbl');
      if (dockAlertEl) {
        const totalAlerts = readyOrders.length + pendingCalls.length;
        dockAlertEl.textContent = totalAlerts > 0 ? \`Alerts (\${totalAlerts})\` : 'Alerts';
      }

      let html = '';

      if (foodReadyTables.length > 0) {
        html += \`<div class="section-head"><span>Food ready · Pick up</span><span>\${foodReadyTables.length}</span></div>\`;
        html += foodReadyTables.map((t) => {
          const tReady = readyOrders.filter((o) => String(o.tableNumber) === String(t.number));
          const latest = tReady[0];
          const itemsSummary = latest ? latest.items.map((i) => \`\${i.name} x\${i.quantity}\`).slice(0, 3).join(', ') : 'Order ready at pass';
          return \`
            <div class="table-card ready">
              <div class="card-row">
                <span class="tbl-pill">Table \${escH(t.number)}</span>
                <span class="status-tag tag-ready">Food ready</span>
              </div>
              <div style="font-size:12px; color:#A7F3D0;">\${escH(itemsSummary)}</div>
              <div class="card-actions">
                \${latest ? \`<button type="button" class="btn-w emerald" onclick="markOrderServed('\${escH(latest.id)}', '\${escH(t.number)}')">Mark Served</button>\` : ''}
                <button type="button" class="btn-w ghost" onclick="openTakeOrderForTable('\${escH(t.number)}')">+ Add items</button>
              </div>
            </div>
          \`;
        }).join('');
      }

      if (callingTables.length > 0 || pendingCalls.length > 0) {
        html += \`<div class="section-head"><span>Calling you</span><span>\${pendingCalls.length}</span></div>\`;
        html += pendingCalls.map((req) => \`
          <div class="table-card calling">
            <div class="card-row">
              <span class="tbl-pill">Table \${escH(req.tableNumber)}</span>
              <span class="status-tag tag-calling">\${escH(req.type || 'Call')}</span>
            </div>
            <div style="font-size:12px; color:#BFDBFE;">\${escH(req.note || 'Guest requested assistance at table')} · \${escH(req.requestedAt || 'Just now')}</div>
            <div class="card-actions">
              <button type="button" class="btn-w blue" onclick="resolveCall('\${escH(req.id)}', '\${escH(req.tableNumber)}')">Acknowledge</button>
              <button type="button" class="btn-w ghost" onclick="openTakeOrderForTable('\${escH(req.tableNumber)}')">Take order</button>
            </div>
          </div>
        \`).join('');
      }

      if (billAskedTables.length > 0) {
        html += \`<div class="section-head"><span>Bill asked</span><span>\${billAskedTables.length}</span></div>\`;
        html += billAskedTables.map((t) => {
          const tOrders = getActiveOrdersForTable(t.number);
          const totalRs = Math.round(tOrders.reduce((s, o) => s + Number(o.totalMinor || 0), 0) / 100);
          return \`
            <div class="table-card bill">
              <div class="card-row">
                <span class="tbl-pill">Table \${escH(t.number)}</span>
                <span class="status-tag tag-bill">Bill asked</span>
              </div>
              <div style="font-size:12px; color:#FDE68A;">\${t.capacity} seats · Running total ₹\${totalRs.toLocaleString('en-IN')}</div>
              <div class="card-actions">
                <button type="button" class="btn-w primary" onclick="openBillSheet(\${t.id}, '\${escH(t.number)}')">View Bill Summary</button>
              </div>
            </div>
          \`;
        }).join('');
      }

      html += \`<div class="section-head"><span>Active / Cooking</span><span>\${cookingTables.length}</span></div>\`;
      if (cookingTables.length === 0) {
        html += \`<div style="font-size:12px; color:var(--text-muted); padding: 10px 2px;">No active tables in preparation.</div>\`;
      } else {
        html += cookingTables.map((t) => {
          const tOrders = getActiveOrdersForTable(t.number);
          const sentCount = tOrders.reduce((s, o) => s + o.items.reduce((a, b) => a + b.quantity, 0), 0);
          const totalRs = Math.round(tOrders.reduce((s, o) => s + Number(o.totalMinor || 0), 0) / 100);
          return \`
            <div class="table-card">
              <div class="card-row">
                <span class="tbl-pill">Table \${escH(t.number)}</span>
                <span class="status-tag tag-cooking">\${sentCount > 0 ? \`Cooking · \${sentCount} items\` : 'Seated'}</span>
              </div>
              <div style="font-size:12px; color:var(--text-muted);">
                \${t.serverName ? 'Server: ' + escH(t.serverName) + ' · ' : ''}₹\${totalRs.toLocaleString('en-IN')}
              </div>
              <div class="card-actions">
                <button type="button" class="btn-w blue" onclick="openTakeOrderForTable('\${escH(t.number)}')">+ Take order</button>
                <button type="button" class="btn-w ghost" onclick="requestTableBill(\${t.id}, '\${escH(t.number)}')">Request Bill</button>
              </div>
            </div>
          \`;
        }).join('');
      }

      html += \`<div class="section-head"><span>Free · seat a new party +</span><span>\${freeTables.length}</span></div>\`;
      html += \`<div class="free-grid">\`;
      html += freeTables.map((t) => \`
        <button type="button" class="free-tile" onclick="openSeatSheet('\${escH(t.number)}')">
          <div style="font-size:15px; font-weight:800;">\${escH(t.number)}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">\${t.capacity} seats · Tap +</div>
        </button>
      \`).join('');
      html += \`</div>\`;

      secEl.innerHTML = html;
    }

    function renderTakeOrder() {
      const stripEl = document.getElementById('order-table-strip');
      const sentSummaryEl = document.getElementById('active-table-sent-summary');
      const dietEl = document.getElementById('waiter-diet-pills');
      const catEl = document.getElementById('waiter-cat-pills');
      const listEl = document.getElementById('waiter-menu-list');
      const barEl = document.getElementById('send-kitchen-bar');
      if (!stripEl || !listEl) return;

      const visibleTables = getVisibleTables();
      stripEl.innerHTML = visibleTables.map((t) => {
        const active = String(t.number) === String(state.selectedTableNum);
        return \`<button type="button" class="chip-btn \${active ? 'active' : ''}" onclick="selectOrderTable('\${escH(t.number)}')">\${escH(t.number)}</button>\`;
      }).join('');

      const existingOrders = getActiveOrdersForTable(state.selectedTableNum);
      const sentItemsCount = existingOrders.reduce((s, o) => s + o.items.reduce((a, b) => a + b.quantity, 0), 0);
      if (sentSummaryEl) {
        const preview = existingOrders.flatMap((o) => o.items).slice(0, 3).map((i) => \`\${i.name} x\${i.quantity}\`).join(', ');
        sentSummaryEl.innerHTML = \`
          <span><strong style="color:#fff;">\${escH(state.selectedTableNum)}</strong> · \${sentItemsCount} previously sent \${preview ? '(' + escH(preview) + ')' : ''}</span>
          <span>\${existingOrders.length} active ticket(s)</span>
        \`;
      }

      if (dietEl) {
        dietEl.innerHTML = ['ALL', 'VEG', 'NON_VEG'].map((d) => {
          const label = d === 'ALL' ? 'All Dietary' : d === 'VEG' ? 'Veg Only' : 'Non-Veg';
          return \`<button type="button" class="chip-btn \${state.dietFilter === d ? 'active' : ''}" onclick="setWaiterDiet('\${d}')">\${label}</button>\`;
        }).join('');
      }

      const cats = ['ALL', ...Array.from(new Set(state.menu.map((m) => m.category)))];
      if (catEl) {
        catEl.innerHTML = cats.map((c) => \`<button type="button" class="chip-btn \${state.selectedCategory === c ? 'active' : ''}" onclick="setWaiterCat('\${escH(c)}')">\${escH(c)}</button>\`).join('');
      }

      const q = (document.getElementById('waiter-menu-search')?.value || '').trim().toLowerCase();
      const filtered = state.menu.filter((m) => {
        if (state.selectedCategory !== 'ALL' && m.category !== state.selectedCategory) return false;
        if (state.dietFilter === 'VEG' && !m.isVeg) return false;
        if (state.dietFilter === 'NON_VEG' && m.isVeg) return false;
        if (q && !m.name.toLowerCase().includes(q) && !m.category.toLowerCase().includes(q)) return false;
        return true;
      });

      listEl.innerHTML = filtered.length === 0
        ? \`<div style="text-align:center; padding:24px; color:var(--text-muted); font-size:13px;">No matching dishes available.</div>\`
        : filtered.map((m) => {
            const qty = Number(state.draftCart[m.id] || 0);
            const priceRs = Math.round(m.priceMinor / 100);
            return \`
              <div class="dish-row-w">
                <div style="min-width:0; flex:1;">
                  <div style="font-size:14px; font-weight:700; color:#F8FAFC;">
                    <span class="veg-dot" style="background:\${m.isVeg ? '#10B981' : '#EF4444'};"></span>\${escH(m.name)}
                  </div>
                  <div style="font-size:11px; color:var(--text-muted); margin-top:3px;">
                    ₹\${priceRs.toLocaleString('en-IN')} · \${escH(m.category)} · ~\${m.prepMinutes}m
                  </div>
                </div>
                <div class="stepper">
                  <button type="button" class="step-btn" aria-label="Decrease \${escH(m.name)}" onclick="adjCart('\${escH(m.id)}', -1)">−</button>
                  <span class="step-qty" data-qty-id="\${escH(m.id)}">\${qty}</span>
                  <button type="button" class="step-btn add" aria-label="Increase \${escH(m.name)}" onclick="adjCart('\${escH(m.id)}', 1)">+</button>
                </div>
              </div>
            \`;
          }).join('');

      let totalCount = 0;
      let totalMinor = 0;
      Object.entries(state.draftCart).forEach(([id, qVal]) => {
        const qty = Number(qVal || 0);
        if (qty > 0) {
          const item = state.menu.find((x) => x.id === id);
          if (item) {
            totalCount += qty;
            totalMinor += qty * item.priceMinor;
          }
        }
      });

      if (barEl) {
        if (state.activeTab === 'take-order' && totalCount > 0) {
          barEl.classList.add('show');
          document.getElementById('draft-count-label').textContent = \`\${totalCount} dish\${totalCount === 1 ? '' : 'es'} selected\`;
          document.getElementById('draft-subtotal-label').textContent = \`\${state.selectedTableNum} · Est. ₹\${Math.round((totalMinor * 1.05) / 100).toLocaleString('en-IN')} incl. 5% GST\`;
        } else {
          barEl.classList.remove('show');
        }
      }
    }

    function selectOrderTable(num) {
      state.selectedTableNum = num;
      const titleEl = document.getElementById('waiter-title');
      if (titleEl && state.activeTab === 'take-order') titleEl.textContent = num + ' · Take order';
      renderTakeOrder();
    }
    function setWaiterDiet(d) { state.dietFilter = d; renderTakeOrder(); }
    function setWaiterCat(c) { state.selectedCategory = c; renderTakeOrder(); }
    function adjCart(id, delta) {
      const next = Math.max(0, Number(state.draftCart[id] || 0) + delta);
      if (next === 0) delete state.draftCart[id];
      else state.draftCart[id] = next;
      renderTakeOrder();
    }

    function renderAlertsView() {
      const el = document.getElementById('view-alerts');
      if (!el) return;
      const ready = getReadyOrders();
      const calls = state.serviceRequests.filter((r) => r.status === 'PENDING');
      el.innerHTML = \`
        <div class="section-head"><span>Kitchen Food Ready</span><span>\${ready.length}</span></div>
        \${ready.length === 0 ? '<div class="table-card" style="color:var(--text-muted); font-size:12px;">No dishes waiting at pass.</div>' : ready.map((o) => \`
          <div class="table-card ready">
            <div class="card-row"><span class="tbl-pill">Table \${escH(o.tableNumber)}</span><span class="status-tag tag-ready">READY</span></div>
            <div style="font-size:12px;">\${escH(o.items.map((i) => i.name + ' x' + i.quantity).join(', '))}</div>
            <button type="button" class="btn-w emerald" onclick="markOrderServed('\${escH(o.id)}', '\${escH(o.tableNumber)}')">Mark Served</button>
          </div>
        \`).join('')}
        <div class="section-head"><span>Table Service Calls</span><span>\${calls.length}</span></div>
        \${calls.length === 0 ? '<div class="table-card" style="color:var(--text-muted); font-size:12px;">No active guest calls.</div>' : calls.map((c) => \`
          <div class="table-card calling">
            <div class="card-row"><span class="tbl-pill">Table \${escH(c.tableNumber)}</span><span class="status-tag tag-calling">\${escH(c.type)}</span></div>
            <button type="button" class="btn-w blue" onclick="resolveCall('\${escH(c.id)}', '\${escH(c.tableNumber)}')">Acknowledge</button>
          </div>
        \`).join('')}
      \`;
    }

    function renderOrdersView() {
      const el = document.getElementById('view-orders');
      if (!el) return;
      const active = state.orders.filter((o) => !['PAID', 'CANCELLED', 'VOID'].includes(String(o.status).toUpperCase()));
      el.innerHTML = \`
        <div class="section-head"><span>Shift Orders</span><span>\${active.length}</span></div>
        \${active.length === 0 ? '<div class="table-card" style="color:var(--text-muted); font-size:12px;">No active orders yet.</div>' : active.map((o) => \`
          <div class="table-card">
            <div class="card-row">
              <span class="tbl-pill">Table \${escH(o.tableNumber)}</span>
              <span class="status-tag \${String(o.status).toUpperCase() === 'READY' ? 'tag-ready' : 'tag-cooking'}">\${escH(o.status)}</span>
            </div>
            <div style="font-size:12px; color:#CBD5E1;">\${escH(o.items.map((i) => i.name + ' x' + i.quantity).join(', '))}</div>
            <div style="font-size:11px; color:var(--text-muted);">Order #\${escH(String(o.id).slice(-6))} · ₹\${Math.round(Number(o.totalMinor || 0) / 100).toLocaleString('en-IN')}</div>
          </div>
        \`).join('')}
      \`;
    }

    function renderAll() {
      renderWaiterTables();
      renderTakeOrder();
      renderAlertsView();
      renderOrdersView();
    }

    async function refreshWaiterData() {
      try {
        const [tRes, oRes, kRes, sRes] = await Promise.all([
          fetch('/api/restaurant/tables?branchId=' + encodeURIComponent(state.branchId), { credentials: 'same-origin', cache: 'no-store' }),
          fetch('/api/restaurant/orders?branchId=' + encodeURIComponent(state.branchId), { credentials: 'same-origin', cache: 'no-store' }),
          fetch('/api/restaurant/kds?branchId=' + encodeURIComponent(state.branchId), { credentials: 'same-origin', cache: 'no-store' }),
          fetch('/api/restaurant/service-requests?branchId=' + encodeURIComponent(state.branchId), { credentials: 'same-origin', cache: 'no-store' }),
        ]);
        if (tRes.ok) {
          const tj = await tRes.json();
          if (Array.isArray(tj.tables)) state.tables = tj.tables;
        }
        if (oRes.ok) {
          const oj = await oRes.json();
          const list = Array.isArray(oj.orders) ? oj.orders : Array.isArray(oj.data) ? oj.data : [];
          state.orders = list;
        }
        if (kRes.ok) {
          const kj = await kRes.json();
          const kList = Array.isArray(kj.tasks) ? kj.tasks : Array.isArray(kj.data) ? kj.data : [];
          state.kitchenTasks = kList;
        }
        if (sRes.ok) {
          const sj = await sRes.json();
          const reqs = Array.isArray(sj.data) ? sj.data : [];
          state.serviceRequests = reqs.filter((r) => r.status === 'PENDING');
        }
        renderAll();
      } catch {}
    }

    async function submitWaiterOrder() {
      const items = Object.entries(state.draftCart)
        .filter(([, q]) => Number(q) > 0)
        .map(([id, quantity]) => ({ id, quantity: Number(quantity) }));
      if (items.length === 0) return;

      const btn = document.getElementById('send-kitchen-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
      try {
        const idempotencyKey = 'waiter_' + state.selectedTableNum + '_' + Date.now();
        const res = await fetch('/api/restaurant/orders', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'x-idempotency-key': idempotencyKey },
          body: JSON.stringify({
            tableNumber: state.selectedTableNum,
            branchId: state.branchId,
            diningType: 'DINE_IN',
            guestName: 'Table ' + state.selectedTableNum,
            serverName: state.staff.name || undefined,
            items,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || json.error || 'Could not send order.');
        state.draftCart = {};
        showToastW('Order sent to kitchen for Table ' + state.selectedTableNum);
        await refreshWaiterData();
        switchWaiterTab('tables');
      } catch (err) {
        showToastW(err.message || 'Order submission failed');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Send to kitchen'; }
      }
    }

    async function markOrderServed(orderId, tableNum) {
      try {
        const res = await fetch('/api/restaurant/orders/' + encodeURIComponent(orderId) + '/status', {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'SERVED' }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || json.error || 'Could not update order.');
        showToastW('Table ' + tableNum + ' marked served');
        await refreshWaiterData();
      } catch (err) {
        showToastW(err.message || 'Failed to update order');
      }
    }

    async function resolveCall(reqId, tableNum) {
      try {
        const res = await fetch('/api/restaurant/service-requests/' + encodeURIComponent(reqId) + '/resolve', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || json.error || 'Sign in as staff to acknowledge calls');
        showToastW('Acknowledged Table ' + tableNum);
        await refreshWaiterData();
      } catch (err) {
        showToastW(err.message || 'Could not resolve service request');
      }
    }

    async function requestTableBill(tableId, tableNum) {
      try {
        const res = await fetch('/api/restaurant/tables/' + encodeURIComponent(tableId) + '/request-bill', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || json.error || 'Could not flag bill request.');
        showToastW('Bill requested for Table ' + tableNum);
        await refreshWaiterData();
      } catch (err) {
        showToastW(err.message || 'Bill request failed');
      }
    }

    function openSeatSheet(tableNum) {
      state.pendingSeatTable = tableNum;
      document.getElementById('seat-sheet-title').textContent = 'Seat party on Table ' + tableNum;
      document.getElementById('seat-guest-name').value = '';
      document.getElementById('seat-sheet').classList.add('open');
    }
    function closeSeatSheet() { document.getElementById('seat-sheet').classList.remove('open'); }

    async function confirmSeatParty(e) {
      e.preventDefault();
      if (!state.pendingSeatTable) return;
      const guestName = document.getElementById('seat-guest-name').value.trim() || 'Walk-in Guest';
      const btn = document.getElementById('seat-submit-btn');
      btn.disabled = true; btn.textContent = 'Seating...';
      try {
        const res = await fetch('/api/restaurant/sessions/join', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableNumber: state.pendingSeatTable,
            guestName,
            seatingType: 'WAITER_SEATED',
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || json.error || 'Could not seat party.');
        const seatedTbl = state.pendingSeatTable;
        closeSeatSheet();
        showToastW('Seated ' + guestName + ' at ' + seatedTbl);
        await refreshWaiterData();
        openTakeOrderForTable(seatedTbl);
      } catch (err) {
        showToastW(err.message || 'Seating failed');
      } finally {
        btn.disabled = false; btn.textContent = 'Seat & Take Order';
      }
    }

    async function openBillSheet(tableId, tableNum) {
      document.getElementById('bill-sheet-title').textContent = 'Table ' + tableNum + ' · Running Bill';
      document.getElementById('bill-sheet-body').innerHTML = 'Loading itemized bill...';
      document.getElementById('bill-sheet').classList.add('open');
      try {
        const res = await fetch('/api/restaurant/tables/' + encodeURIComponent(tableId), { credentials: 'same-origin', cache: 'no-store' });
        const json = await res.json();
        const bill = json.bill || {};
        const items = Array.isArray(bill.items) ? bill.items : [];
        const totalRs = Math.round(Number(bill.totalMinor || 0) / 100);
        const taxRs = Math.round(Number(bill.taxMinor || 0) / 100);
        document.getElementById('bill-sheet-body').innerHTML = \`
          <div style="margin-bottom:12px;">
            \${items.length === 0 ? '<div style="color:var(--text-muted);">No billed items yet.</div>' : items.map((it) => \`
              <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(148,163,184,0.12);">
                <span>\${escH(it.name)} × \${it.quantity}</span>
                <span>₹\${Math.round(Number(it.totalMinor || (it.priceMinor || 0) * (it.quantity || 1)) / 100).toLocaleString('en-IN')}</span>
              </div>
            \`).join('')}
          </div>
          <div style="display:flex; justify-content:space-between; color:var(--text-muted); margin-bottom:4px;"><span>GST Included / Taxes</span><span>₹\${taxRs.toLocaleString('en-IN')}</span></div>
          <div style="display:flex; justify-content:space-between; font-size:17px; font-weight:800; color:#fff; margin-top:6px;"><span>Total Due</span><span>₹\${totalRs.toLocaleString('en-IN')}</span></div>
        \`;
      } catch {
        document.getElementById('bill-sheet-body').textContent = 'Unable to load table bill.';
      }
    }
    function closeBillSheet() { document.getElementById('bill-sheet').classList.remove('open'); }

    function openStaffAuthSheet() {
      document.getElementById('staff-auth-error').style.display = 'none';
      document.getElementById('staff-auth-sheet').classList.add('open');
    }
    function closeStaffAuthSheet() { document.getElementById('staff-auth-sheet').classList.remove('open'); }

    async function submitStaffAuth(e) {
      e.preventDefault();
      const identifier = document.getElementById('auth-identifier').value.trim();
      const secret = document.getElementById('auth-secret').value.trim();
      const deviceToken = document.getElementById('auth-device-token').value.trim() || undefined;
      const errBox = document.getElementById('staff-auth-error');
      const btn = document.getElementById('auth-submit-btn');
      errBox.style.display = 'none';
      btn.disabled = true; btn.textContent = 'Signing in...';
      try {
        const res = await fetch('/api/restaurant/auth/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, secret, deviceToken }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          throw new Error(json.message || json.error || 'Authentication failed.');
        }
        closeStaffAuthSheet();
        window.location.reload();
      } catch (err) {
        errBox.textContent = err.message || 'Sign in failed';
        errBox.style.display = 'block';
      } finally {
        btn.disabled = false; btn.textContent = 'Sign In';
      }
    }

    // Live SSE synchronization from RestaurantOS event bus
    try {
      const es = new EventSource('/api/restaurant/events');
      es.onmessage = (msg) => {
        try {
          const evt = JSON.parse(msg.data);
          if (evt && (evt.type === 'kds.updated' || evt.type === 'order.status_updated' || evt.type === 'service_request.created' || evt.type === 'table.updated' || evt.type === 'order.created')) {
            if (evt.payload && String(evt.payload.status || '').toUpperCase() === 'READY') {
              const b = document.getElementById('live-kitchen-banner');
              const bt = document.getElementById('live-kitchen-banner-text');
              if (b && bt) {
                bt.textContent = 'Table ' + (evt.payload.tableNumber || '') + ' · Food ready at pass';
                b.classList.add('show');
              }
            }
            refreshWaiterData();
          }
        } catch {}
      };
    } catch {}

    renderAll();
  </script>
</body>
</html>`;
}
