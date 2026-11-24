/**
 * 🪐 RestaurantOS Modern — Reports & Business Intelligence (SCR-OPS-REPORTS)
 * ─────────────────────────────────────────────────────────────────────────────
 * Live analytical aggregations backed by active RestaurantOS orders, tasks, tables & branches:
 * - Total revenue & avg bill computed directly from repository orders
 * - Top dishes sorted strictly descending
 * - Hourly order distribution histogram & branch revenue split
 */

import { RestaurantOrder, KitchenTask, TableFloorRecord, BranchRecord } from '../../shared';
import { icon } from '../icons';

function esc(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderReportsWorkspace(
  orders: RestaurantOrder[] = [],
  tasks: KitchenTask[] = [],
  tables: TableFloorRecord[] = [],
  branches: BranchRecord[] = [],
  tenantName = 'RestaurantOS'
): string {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeBranches = Array.isArray(branches) ? branches : [];

  const totalMinor = safeOrders.reduce(
    (s, o) => s + (Number((o as any).totalMinor || (o as any).quote?.totalMinor) || 0),
    0
  );
  const totalInr = Math.round(totalMinor / 100);
  const avgBill = safeOrders.length > 0 ? Math.round(totalInr / safeOrders.length) : 0;

  const avgStayMin = safeTasks.length > 0
    ? Math.max(15, Math.round(safeTasks.reduce((s, t) => s + (Number(t.elapsedMinutes) || 12), 0) / safeTasks.length))
    : 0;

  // Top dishes strictly sorted descending
  const dishMap = new Map<string, number>();
  for (const ord of safeOrders) {
    for (const it of ord.items || []) {
      const name = String((it as any).name || (it as any).itemName || 'Dish');
      dishMap.set(name, (dishMap.get(name) || 0) + (Number(it.quantity) || 1));
    }
  }
  const topDishes = Array.from(dishMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // Branch revenue split
  const branchTotals = safeBranches.map((b) => {
    const branchMinor = safeOrders
      .filter((o) => o.branchId === b.id)
      .reduce((s, o) => s + (Number((o as any).totalMinor || (o as any).quote?.totalMinor) || 0), 0);
    return {
      name: b.name,
      inr: Math.round(branchMinor / 100),
    };
  });
  const maxBranchInr = Math.max(1, ...branchTotals.map((b) => b.inr));

  // Weekday pin heights computed by day-of-week of live orders
  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const daySums = [0, 0, 0, 0, 0, 0, 0];
  for (const o of safeOrders) {
    const dt = new Date((o as any).createdAt || Date.now());
    const idx = (dt.getDay() + 6) % 7; // Mon=0 .. Sun=6
    daySums[idx] += Math.round((Number((o as any).totalMinor || (o as any).quote?.totalMinor) || 0) / 100);
  }
  const maxDaySum = Math.max(1, ...daySums);

  return `
  <div class="reports-container" style="padding: 24px 32px 72px 32px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 24px;">
    
    <!-- 1. Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="font-size: 13px; font-weight: 500; color: #64748B; margin-bottom: 4px;">
          ${esc(tenantName)} · ${safeBranches.length || 1} branch${safeBranches.length === 1 ? '' : 'es'} · ${tables.length} tables
        </div>
        <h1 style="font-size: 34px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; margin: 0;">
          Reports
        </h1>
      </div>

      <div style="display: flex; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; padding: 4px;">
        <button type="button" class="report-tab" onclick="switchReportTab('day', this)">Day</button>
        <button type="button" class="report-tab active" onclick="switchReportTab('week', this)">Week</button>
        <button type="button" class="report-tab" onclick="switchReportTab('month', this)">Month</button>
      </div>
    </div>

    <!-- 2. Sales Hero Card -->
    <div class="ui-card reports-hero-card" style="padding: 32px 36px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 24px;">
      <div>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
          <div style="width: 28px; height: 28px; border-radius: 9999px; background: #F1F5F9; display: flex; align-items: center; justify-content: center;">
            ${icon('reports', { size: 14, color: '#0F172A' })}
          </div>
          <h2 style="font-size: 20px; font-weight: 700; color: #0F172A; margin: 0;">
            Sales
          </h2>
        </div>
        <div style="font-size: 13px; color: #64748B; margin-left: 38px;">
          Recorded orders, including GST
        </div>

        <div style="margin-top: 32px;">
          <div style="font-size: 48px; font-weight: 800; color: #0F172A; letter-spacing: -0.03em; line-height: 1; font-variant-numeric: tabular-nums;">
            ₹${totalInr.toLocaleString('en-IN')}
          </div>
          <div style="font-size: 13px; font-weight: 600; color: #64748B; margin-top: 6px;">
            ${safeOrders.length} total order${safeOrders.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <!-- 7-Day Pin Bar Chart -->
      <div class="reports-pin-chart" style="display: flex; gap: 24px; align-items: flex-end; padding-bottom: 8px; flex-wrap: wrap;">
        ${dayNames.map((lbl, idx) => {
    const val = daySums[idx];
    const barH = Math.max(18, Math.round((val / maxDaySum) * 90));
    const isPeak = val > 0 && val === Math.max(...daySums);
    return `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
              ${isPeak ? `<span style="background: #000000; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">₹${val.toLocaleString('en-IN')}</span>` : ''}
              <div style="width: 8px; height: ${barH}px; background: ${isPeak ? '#000000' : '#CBD5E1'}; border-radius: 999px;"></div>
              <span style="width: 28px; height: 28px; border-radius: 999px; background: ${isPeak ? '#000000' : '#F1F5F9'}; color: ${isPeak ? '#FFFFFF' : '#64748B'}; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;">
                ${lbl}
              </span>
            </div>
          `;
  }).join('')}
      </div>
    </div>

    <!-- 3. 3-Column Analytical Grid -->
    <div class="reports-3-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
      
      <!-- Card 1: Top Dishes (Dark Bento Card) -->
      <div style="background: #0F172A; color: #FFFFFF; border-radius: 28px; padding: 28px; display: flex; flex-direction: column; gap: 18px;">
        <h3 style="font-size: 17px; font-weight: 700; color: #FFFFFF; margin: 0;">Top dishes</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${topDishes.length === 0 ? `
            <div style="padding: 20px; border-radius: 16px; background: #1E293B; color: #94A3B8; font-size: 13px; text-align: center;">
              No dishes ordered yet
            </div>
          ` : topDishes.map(([dishName, count], idx) => `
            <div style="background: ${idx === 0 ? '#FFFFFF' : '#1E293B'}; color: ${idx === 0 ? '#0F172A' : '#FFFFFF'}; border-radius: 9999px; padding: 10px 18px; display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="width: 20px; height: 20px; border-radius: 999px; background: ${idx === 0 ? '#0F172A' : '#334155'}; color: #FFFFFF; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center;">${idx + 1}</span>
                <span style="font-size: 13px; font-weight: 600;">${esc(dishName)}</span>
              </div>
              <span style="font-size: 13px; font-weight: 700; color: ${idx === 0 ? '#0F172A' : '#94A3B8'};">${count}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Card 2: Busiest Hours -->
      <div class="ui-card" style="padding: 28px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0 0 20px 0;">Busiest hours</h3>
          <div style="display: flex; gap: 10px; align-items: flex-end; height: 110px; padding-bottom: 8px;">
            ${[12, 14, 16, 18, 20, 22].map((hr) => {
    const hrCount = safeOrders.filter((o) => {
      const h = new Date((o as any).createdAt || Date.now()).getHours();
      return h >= hr && h < hr + 2;
    }).length;
    const barH = Math.max(16, Math.min(105, hrCount * 22 + 16));
    const isPeak = hr >= 18 && hr <= 21;
    return `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                  <div style="width: 100%; height: ${barH}px; background: ${isPeak ? '#2563EB' : '#E2E8F0'}; border-radius: 8px;"></div>
                  <span style="font-size: 11px; font-weight: 600; color: #64748B;">${hr}</span>
                </div>
              `;
  }).join('')}
          </div>
        </div>
        <div style="font-size: 12px; color: #64748B; margin-top: 14px;">
          Order timestamps aggregated across active restaurant hours.
        </div>
      </div>

      <!-- Card 3: Branches Split -->
      <div class="ui-card" style="padding: 28px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0 0 18px 0;">Branches</h3>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${branchTotals.length === 0 ? `
              <div style="font-size: 13px; color: #64748B;">No branch revenue recorded yet.</div>
            ` : branchTotals.map((bt, idx) => `
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                  <span>${esc(bt.name)}</span>
                  <span style="font-weight: 700; color: #0F172A;">₹${bt.inr.toLocaleString('en-IN')}</span>
                </div>
                <div style="height: 6px; background: #F1F5F9; border-radius: 999px; overflow: hidden;">
                  <div style="width: ${Math.max(4, Math.round((bt.inr / maxBranchInr) * 100))}%; height: 100%; background: ${idx === 0 ? '#000000' : '#93C5FD'}; border-radius: 999px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display: flex; gap: 16px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #F1F5F9;">
          <div style="background: #F8FAFC; border-radius: 16px; padding: 12px 18px; flex: 1;">
            <div style="font-size: 22px; font-weight: 800; color: #0F172A;">₹${avgBill.toLocaleString('en-IN')}</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">avg. bill</div>
          </div>
          <div style="background: #F8FAFC; border-radius: 16px; padding: 12px 18px; flex: 1;">
            <div style="font-size: 22px; font-weight: 800; color: #0F172A;">${avgStayMin ? `${avgStayMin}'` : '—'}</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">avg. prep/stay</div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <style>
    @media (max-width: 768px) {
      .reports-container {
        padding: 16px 16px 88px 16px !important;
      }
      .reports-hero-card {
        padding: 20px !important;
      }
      .reports-pin-chart {
        gap: 12px !important;
      }
      .reports-3-grid {
        grid-template-columns: 1fr !important;
      }
    }
    .report-tab {
      background: transparent;
      border: none;
      border-radius: 9999px;
      padding: 7px 18px;
      font-size: 13px;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
      transition: all 120ms ease;
    }
    .report-tab:hover { color: #0F172A; }
    .report-tab.active { background: #000000; color: #FFFFFF; }
  </style>

  <script>
    function switchReportTab(tab, btn) {
      document.querySelectorAll('.report-tab').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
    }
  </script>
  `;
}
