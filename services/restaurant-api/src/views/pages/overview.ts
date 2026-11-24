/**
 * 🪐 RestaurantOS Modern — R1 "Today" Operations Command (SCR-OPS-OVERVIEW)
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative live telemetry backed by domain records:
 * - Real shift revenue, order pipeline count, table occupancy ratio, and kitchen avg wait
 * - Dynamic "Needs you now" alerts (calling waiter service requests, bill requested tables, late KDS)
 * - Live Main Hall matrix from active Branch Tables
 * - Aggregated Top Dishes sorted strictly descending by quantity
 * - Responsive grids (zero overflow at 390x844 and 1440x900)
 */

import { TableFloorRecord, KitchenTask, ServiceRequest, RestaurantOrder } from '../../shared';
import { DomainEvent } from '../../storage';
import { icon } from '../icons';

function esc(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderOperationsHome(
  tables: TableFloorRecord[],
  tasks: KitchenTask[],
  serviceRequests: ServiceRequest[] = [],
  branchName = 'Main Branch',
  serviceShift = 'Dinner Service',
  orders: RestaurantOrder[] = [],
  _events: DomainEvent[] = [],
  branchId = 'branch_ldh'
): string {
  const encodedBranch = encodeURIComponent(branchId);
  const safeTables = Array.isArray(tables) ? tables : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeRequests = Array.isArray(serviceRequests) ? serviceRequests : [];

  const billRequestedTables = safeTables.filter((t) => t.status === 'BILL_REQUESTED');
  const occupiedTables = safeTables.filter((t) => Boolean(t.activeSessionId) || t.status === 'OCCUPIED');
  const activeSeatedCount = new Set([...occupiedTables.map((t) => t.id), ...billRequestedTables.map((t) => t.id)]).size;

  const settledOrders = safeOrders.filter((o) => ['PAID', 'COMPLETED', 'SETTLED'].includes(String(o.status || '').toUpperCase()));
  const settledRevenueMinor = settledOrders.reduce((sum, o) => sum + (Number((o as any).totalMinor || (o as any).quote?.totalMinor) || 0), 0);
  const displayRevenue = `₹${Math.round(settledRevenueMinor / 100).toLocaleString('en-IN')}`;

  const ordersCount = safeOrders.length;
  const seatedRatio = `${activeSeatedCount}/${safeTables.length}`;

  const activeTasks = safeTasks.filter((t) => !['BUMPED', 'DISPATCHED', 'COMPLETED', 'CANCELLED'].includes(String(t.status || '').toUpperCase()));
  const avgKitchenMins = activeTasks.length > 0
    ? `${Math.round(activeTasks.reduce((s, t) => s + (Number(t.elapsedMinutes) || 1), 0) / activeTasks.length)} m`
    : '0 m';
  const lateTasks = activeTasks.filter((t) => (Number(t.elapsedMinutes) || 0) >= (Number(t.slaMinutes) || 20));
  const pendingReqs = safeRequests.filter((r) => String(r.status || 'PENDING').toUpperCase() === 'PENDING');

  const alertsCount = pendingReqs.length + billRequestedTables.length + (lateTasks.length > 0 ? 1 : 0);

  // Aggregate real top dishes strictly descending
  const dishCounts = new Map<string, number>();
  for (const ord of safeOrders) {
    for (const item of ord.items || []) {
      const n = String((item as any).name || (item as any).itemName || 'Dish');
      dishCounts.set(n, (dishCounts.get(n) || 0) + (Number(item.quantity) || 1));
    }
  }
  const topDishes = Array.from(dishCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return `
  <div class="today-container" style="padding: 24px 32px 72px 32px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 28px;">
    
    <!-- 1. Header Area: Shift Context, Greeting & Action Buttons -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="font-size: 13px; font-weight: 500; color: #64748B; margin-bottom: 4px;">
          ${esc(branchName)} · ${esc(serviceShift)}
        </div>
        <h1 style="font-size: 34px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; margin: 0; line-height: 1.15;">
          ${greeting}
        </h1>
      </div>

      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <a href="/operations/floor?branch=${encodedBranch}" class="btn btn-secondary" style="padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 9999px; text-decoration: none;">
          Floor Studio
        </a>
        <a href="/operations/tables?branch=${encodedBranch}" class="btn btn-secondary" style="padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 9999px; text-decoration: none;">
          Tables Fleet
        </a>
        <a href="/kds?branch=${encodedBranch}" class="btn btn-secondary" style="padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 9999px; text-decoration: none;">
          Kitchen KDS
        </a>
        <a href="/operations/orders?branch=${encodedBranch}" class="btn btn-secondary" style="padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 9999px; text-decoration: none;">
          Service Orders
        </a>
        <a href="/menu?branch=${encodedBranch}" class="btn btn-secondary" style="padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 9999px; text-decoration: none;">
          Menu &amp; Catalog
        </a>
        <a href="/pos?branch=${encodedBranch}" class="btn btn-primary" style="padding: 9px 22px; font-size: 13px; font-weight: 600; border-radius: 9999px; text-decoration: none;">
          New order
        </a>
      </div>
    </div>

    <!-- 2. 4 Key Metric Cards -->
    <div class="today-metrics-grid">
      <div class="today-metric-cell">
        <div class="today-metric-val">${displayRevenue}</div>
        <div class="today-metric-lbl">Sales today</div>
        <div style="font-size: 12px; font-weight: 600; color: #64748B; margin-top: 3px;">
          ${settledOrders.length} settled order${settledOrders.length === 1 ? '' : 's'}
        </div>
      </div>

      <div class="today-metric-cell">
        <div class="today-metric-val">${ordersCount}</div>
        <div class="today-metric-lbl">Orders</div>
      </div>

      <div class="today-metric-cell">
        <div class="today-metric-val">${seatedRatio}</div>
        <div class="today-metric-lbl">Tables seated</div>
      </div>

      <div class="today-metric-cell last">
        <div class="today-metric-val">${avgKitchenMins}</div>
        <div class="today-metric-lbl">Avg. kitchen time</div>
      </div>
    </div>

    <!-- 3. 3-Column Operational Triage Deck -->
    <div class="today-triage-grid">
      
      <!-- Card 1: Needs You Now -->
      <div class="ui-card" style="padding: 26px 24px; display: flex; flex-direction: column; gap: 18px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <h2 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0;">
            Needs you now
          </h2>
          <span style="background: #EFF6FF; color: #2563EB; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">
            ${alertsCount}
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${alertsCount === 0 ? `
            <div style="padding: 24px 16px; border-radius: 18px; background: #F8FAFC; color: #64748B; font-size: 13px; text-align: center;">
              All caught up — no pending guest calls, bills, or kitchen SLA alerts.
            </div>
          ` : ''}

          ${pendingReqs.map((r) => `
            <div style="background: #F8FAFC; border-radius: 18px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid rgba(0, 0, 0, 0.03);">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; border-radius: 9999px; background: #2563EB; color: #FFFFFF; font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  ${esc(r.tableNumber || 'T')}
                </div>
                <div>
                  <div style="font-size: 13px; font-weight: 600; color: #0F172A; line-height: 1.25;">
                    ${esc(r.tableNumber)} · ${esc(r.type || 'Assistance')}
                  </div>
                  <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
                    Guest service request
                  </div>
                </div>
              </div>
              <button type="button" class="btn btn-primary" onclick="resolveServiceRequest('${esc(r.id)}', this)" style="padding: 6px 14px; font-size: 12px; font-weight: 600; flex-shrink: 0;">
                Resolve
              </button>
            </div>
          `).join('')}

          ${billRequestedTables.map((t) => `
            <div style="background: #F8FAFC; border-radius: 18px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid rgba(0, 0, 0, 0.03);">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; border-radius: 9999px; background: #FEF3C7; color: #D97706; font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  ${esc(t.number)}
                </div>
                <div>
                  <div style="font-size: 13px; font-weight: 600; color: #0F172A; line-height: 1.25;">
                    Table ${esc(t.number)} asked for the bill
                  </div>
                  <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
                    ${t.capacity} seats · ${esc(t.section || 'Main Hall')}
                  </div>
                </div>
              </div>
              <a href="/operations/orders" class="btn btn-secondary" style="padding: 6px 14px; font-size: 12px; font-weight: 600; flex-shrink: 0; text-decoration: none;">
                Settle
              </a>
            </div>
          `).join('')}

          ${lateTasks.length > 0 ? `
            <div style="background: #F8FAFC; border-radius: 18px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid rgba(0, 0, 0, 0.03);">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; border-radius: 9999px; background: #FEE2E2; color: #DC2626; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  ${icon('clock', { size: 16, color: '#DC2626' })}
                </div>
                <div>
                  <div style="font-size: 13px; font-weight: 600; color: #0F172A; line-height: 1.25;">
                    ${lateTasks.length} kitchen ticket${lateTasks.length === 1 ? '' : 's'} running late
                  </div>
                  <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
                    ${esc(lateTasks[0].station || 'Kitchen')}
                  </div>
                </div>
              </div>
              <a href="/kds" style="font-size: 12px; font-weight: 600; color: #2563EB; text-decoration: none; flex-shrink: 0; padding: 6px 4px;">
                Open KDS
              </a>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Card 2: Main Hall Right Now (Live Floor Matrix) -->
      <div class="ui-card" style="padding: 26px 24px; display: flex; flex-direction: column; gap: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0;">
            Main hall right now
          </h2>
          <a href="/operations/floor" style="font-size: 13px; font-weight: 600; color: #2563EB; text-decoration: none;">
            Floor plan (${safeTables.length})
          </a>
        </div>

        <div id="mini-floor-svg" class="today-hall-grid">
          ${safeTables.slice(0, 18).map((tbl) => {
    const isBillAsked = tbl.status === 'BILL_REQUESTED';
    const isSeated = !isBillAsked && (Boolean(tbl.activeSessionId) || tbl.status === 'OCCUPIED');
    let bg = '#F1F5F9';
    let color = '#64748B';
    let border = '1px solid #E2E8F0';
    if (isSeated) { bg = '#2563EB'; color = '#FFFFFF'; border = '1px solid #2563EB'; }
    else if (isBillAsked) { bg = '#111827'; color = '#FFFFFF'; border = '1px solid #111827'; }

    return `
              <a id="mini-table-${tbl.id}" href="/operations/floor?table=${tbl.id}" style="background: ${bg}; color: ${color}; border: ${border}; border-radius: 12px; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; text-decoration: none; transition: transform 120ms ease;">
                ${esc(String(tbl.number).replace(/^T-/i, ''))}
              </a>`;
  }).join('')}
        </div>

        <div style="display: flex; gap: 18px; align-items: center; font-size: 12px; color: #64748B; padding-top: 4px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 999px; background: #2563EB;"></span>
            <span>Seated</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 999px; background: #111827;"></span>
            <span>Bill asked</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 999px; background: #E2E8F0; border: 1px solid #CBD5E1;"></span>
            <span>Free</span>
          </div>
        </div>
      </div>

      <!-- Card 3: Top Dishes Tonight -->
      <div class="ui-card" style="padding: 26px 24px; display: flex; flex-direction: column; gap: 18px;">
        <h2 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0;">
          Top dishes tonight
        </h2>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${topDishes.length === 0 ? `
            <div style="padding: 24px 16px; border-radius: 18px; background: #F8FAFC; color: #64748B; font-size: 13px; text-align: center;">
              No orders recorded in this shift yet.
            </div>
          ` : topDishes.map(([dishName, count], idx) => `
            <div style="background: ${idx === 0 ? '#111827' : '#F8FAFC'}; border: ${idx === 0 ? 'none' : '1px solid #E2E8F0'}; color: ${idx === 0 ? '#FFFFFF' : '#0F172A'}; border-radius: 9999px; padding: 10px 18px; display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="width: 20px; height: 20px; border-radius: 999px; background: ${idx === 0 ? '#FFFFFF' : '#E2E8F0'}; color: ${idx === 0 ? '#111827' : '#64748B'}; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center;">
                  ${idx + 1}
                </span>
                <span style="font-size: 13px; font-weight: 600;">
                  ${esc(dishName)}
                </span>
              </div>
              <span style="font-size: 13px; font-weight: 700; color: ${idx === 0 ? '#94A3B8' : '#64748B'};">
                ${count}
              </span>
            </div>
          `).join('')}
        </div>
      </div>

    </div>
  </div>

  <style>
    .today-metrics-grid {
      background: #FFFFFF;
      border-radius: 28px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04);
      padding: 28px 36px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
    }
    .today-metric-cell {
      border-right: 1px solid #F1F5F9;
      padding-right: 20px;
    }
    .today-metric-cell.last {
      border-right: none;
      padding-right: 0;
    }
    .today-metric-val {
      font-size: 38px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.025em;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .today-metric-lbl {
      font-size: 13px;
      color: #64748B;
      margin-top: 8px;
      font-weight: 500;
    }
    .today-triage-grid {
      display: grid;
      grid-template-columns: 1fr 1.15fr 1fr;
      gap: 24px;
      align-items: start;
    }
    .today-hall-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      margin: 6px 0;
    }
    @media (max-width: 1024px) {
      .today-metrics-grid {
        grid-template-columns: repeat(2, 1fr);
        padding: 20px;
      }
      .today-metric-cell {
        border-right: none;
        padding-right: 0;
      }
      .today-triage-grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 640px) {
      .today-container {
        padding: 16px 16px 88px 16px !important;
      }
      .today-metrics-grid {
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        padding: 18px;
      }
      .today-metric-val {
        font-size: 28px;
      }
      .today-hall-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
  </style>

  <script>
    async function resolveServiceRequest(id, btn) {
      try {
        await window.apiFetch('/api/restaurant/service-requests/' + encodeURIComponent(id) + '/resolve', {
          method: 'POST',
          body: {}
        });
        btn.textContent = 'Resolved';
        btn.style.background = '#10B981';
        btn.disabled = true;
        if (window.showToast) window.showToast('Service request marked resolved.', 'success');
      } catch (err) {
        if (window.showToast) window.showToast((err && err.message) || 'Failed to resolve request.', 'error');
      }
    }
  </script>
  `;
}
