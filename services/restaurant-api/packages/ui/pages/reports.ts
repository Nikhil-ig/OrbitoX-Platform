/**
 * 🍷 RestaurantOS 2.0 Operational Analytics & Reports Workspace
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time computed shift metrics: revenue, covers, average ticket, station throughput.
 * Zero hardcoded values.
 */

import { RestaurantOrder, KitchenTask, TableFloorRecord } from '../../domain';

export function renderReportsWorkspace(
  orders: RestaurantOrder[] = [],
  tasks: KitchenTask[] = [],
  tables: TableFloorRecord[] = []
): string {
  const totalRevenueMinor = orders.reduce((sum, o) => sum + (o.totalMinor || 0), 0);
  const totalCovers = tables.reduce((sum, t) => sum + (t.seats?.filter((s) => s.isOccupied).length || 0), 0);
  const avgTicketMinor = orders.length > 0 ? Math.round(totalRevenueMinor / orders.length) : 0;

  const tandoorTasks = tasks.filter((t) => t.station === 'TANDOOR');
  const curryTasks = tasks.filter((t) => t.station === 'CURRY_LINE');
  const barTasks = tasks.filter((t) => t.station === 'BAR');
  const totalTasks = tasks.length || 1;

  const tandoorPct = Math.round((tandoorTasks.length / totalTasks) * 100);
  const curryPct = Math.round((curryTasks.length / totalTasks) * 100);
  const barPct = Math.round((barTasks.length / totalTasks) * 100);

  return `
  <div style="padding: 24px; max-width: 1200px; margin: 0 auto; width: 100%;">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Performance Analytics</div>
        <h1 style="font-size: 24px; font-weight: 800; color: var(--color-linen);">Service Shift Report</h1>
      </div>
      <div style="display: flex; gap: 8px;">
        <span class="badge badge-copper">Live Shift Compute</span>
      </div>
    </div>

    <!-- Analytics Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 24px;">
      <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 8px; padding: 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Gross Shift Revenue</div>
        <div style="font-size: 26px; font-weight: 900; color: var(--color-copper); margin-top: 4px;">₹${(totalRevenueMinor / 100).toFixed(2)}</div>
        <div style="font-size: 11px; color: var(--color-sage); margin-top: 4px;">${orders.length} active commercial orders</div>
      </div>
      <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 8px; padding: 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Total Seated Covers</div>
        <div style="font-size: 26px; font-weight: 900; color: var(--color-linen); margin-top: 4px;">${totalCovers} Guests</div>
        <div style="font-size: 11px; color: var(--color-stone); margin-top: 4px;">Across ${tables.filter((t) => t.status === 'OCCUPIED').length} active tables</div>
      </div>
      <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 8px; padding: 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Avg Ticket Size</div>
        <div style="font-size: 26px; font-weight: 900; color: var(--color-linen); margin-top: 4px;">₹${(avgTicketMinor / 100).toFixed(2)}</div>
        <div style="font-size: 11px; color: var(--color-stone); margin-top: 4px;">Server-validated quotes</div>
      </div>
      <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 8px; padding: 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Kitchen Velocity</div>
        <div style="font-size: 26px; font-weight: 900; color: var(--color-sage); margin-top: 4px;">${tasks.length} Tasks</div>
        <div style="font-size: 11px; color: var(--color-stone); margin-top: 4px;">Routed to kitchen stations</div>
      </div>
    </div>

    <!-- Throughput by Station -->
    <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 10px; padding: 20px;">
      <h3 style="font-size: 16px; font-weight: 800; color: var(--color-linen); margin-bottom: 14px;">Station Production Throughput</h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
            <span>Tandoor Clay Oven</span>
            <span style="font-weight: 700;">${tandoorTasks.length} dishes (${tandoorPct}%)</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden;">
            <div style="width: ${Math.max(5, tandoorPct)}%; height: 100%; background: var(--color-copper);"></div>
          </div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
            <span>Curry & Wok Line</span>
            <span style="font-weight: 700;">${curryTasks.length} dishes (${curryPct}%)</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden;">
            <div style="width: ${Math.max(5, curryPct)}%; height: 100%; background: var(--color-sage);"></div>
          </div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
            <span>Cocktail & Mocktail Bar</span>
            <span style="font-weight: 700;">${barTasks.length} drinks (${barPct}%)</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden;">
            <div style="width: ${Math.max(5, barPct)}%; height: 100%; background: var(--color-sky);"></div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}
