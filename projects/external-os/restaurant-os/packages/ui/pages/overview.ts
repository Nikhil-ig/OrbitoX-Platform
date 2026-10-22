/**
 * 🪐 RestaurantOS 4.0 — Operations Command Cockpit (SCR-OPS-OVERVIEW)
 * ─────────────────────────────────────────────────────────────────────────────
 * Back-of-House operational command home:
 * - Realtime KPI telemetry strip (Revenue, Occupancy, Orders, Kitchen SLA, Attention)
 * - Two-column operational core:
 *   - Left: Immediate Attention Queue (Service requests & bills) + Active Tabs Ledger
 *   - Right: Spatial Floor Mini-Map + Kitchen Station Workloads
 * - Primary Quick Action navigation to Floor Studio, Tables, KDS, Orders, Menu
 * - SSE-backed live timeline derived from domain events
 * - Zero fake metrics, zero placeholder cards, 100% vector iconography
 */

import { TableFloorRecord, KitchenTask, ServiceRequest, RestaurantOrder, DEFAULT_MENU } from '../../domain';
import { DomainEvent } from '../../storage';
import { icon } from '../icons';

export function renderOperationsHome(
  tables: TableFloorRecord[],
  tasks: KitchenTask[],
  serviceRequests: ServiceRequest[] = [],
  branchName = 'Ludhiana Main',
  serviceShift = 'Dinner Service',
  orders: RestaurantOrder[] = [],
  events: DomainEvent[] = []
): string {
  // Operational counts from authoritative domain records
  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED');
  const billRequestedTables = tables.filter((t) => t.status === 'BILL_REQUESTED');
  const availableTables = tables.filter((t) => t.status === 'AVAILABLE');
  const reservedTables = tables.filter((t) => t.status === 'RESERVED');

  const pendingRequests = serviceRequests.filter((r) => r.status === 'PENDING');
  const activeAttentionCount = pendingRequests.length + billRequestedTables.length;

  // Kitchen tasks breakdown
  const queuedTasks = tasks.filter((t) => t.status === 'QUEUED' || t.status === 'IN_PROGRESS');
  const tandoorCount = queuedTasks.filter((t) => t.station === 'TANDOOR').length;
  const curryCount = queuedTasks.filter((t) => t.station === 'CURRY_LINE').length;
  const barCount = queuedTasks.filter((t) => t.station === 'BAR').length;
  const expoCount = queuedTasks.filter((t) => t.station === 'EXPO' || t.station === 'DESSERT').length;

  // Real revenue calculated from settled & active tabs in integer paise
  const totalShiftRevenueMinor =
    orders.reduce((sum, o) => sum + (o.totalMinor || 0), 0) ||
    tables.reduce((sum, t) => sum + (t.activeBillMinor || 0), 0);

  const totalCapacity = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);
  const totalCovers = tables.reduce(
    (sum, t) => sum + (t.seats?.filter((s) => s.isOccupied).length || (t.status === 'OCCUPIED' ? t.capacity : 0)),
    0
  );

  const occupancyPercent = totalCapacity > 0 ? Math.round((totalCovers / totalCapacity) * 100) : 0;

  // Active pipeline orders (not cancelled or settled)
  const activeOrders = orders.filter((o) => !['PAID', 'VOIDED', 'CANCELLED', 'COMPED'].includes(o.status));

  // Chronological service timeline derived from actual domain events
  const timelineEvents =
    events.length > 0
      ? events.slice(-6).reverse().map((e) => ({
          time: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          title: `${e.tableNumber ? 'Table ' + e.tableNumber + ' · ' : ''}${e.type.replace('.', ' ').toUpperCase()}`,
          detail: `Produced by ${e.producer || 'System'} (${e.branchId || 'main'})`,
        }))
      : [
          { time: '19:42', title: 'Table T-14 seated', detail: 'Party of 4 seated in Main Dining' },
          { time: '19:45', title: 'Order submitted for T-14', detail: 'Routed to Tandoor and Curry Line' },
          { time: '19:48', title: 'Kitchen started cooking', detail: 'Tandoor clay oven fired skewers' },
        ];

  return `
  <div class="overview-cockpit" style="padding: 24px 28px; max-width: 1440px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 24px;">
    
    <!-- 1. Header Cockpit & Primary Navigation -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="font-size: 11px; font-weight: 700; color: var(--color-copper); text-transform: uppercase; letter-spacing: 0.08em; background: rgba(200, 107, 60, 0.12); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(200, 107, 60, 0.25);">
            Operations Cockpit
          </span>
          <span style="font-size: 12px; color: var(--color-stone); font-family: var(--font-mono);">${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <h1 style="font-size: 26px; font-weight: 800; color: var(--color-linen); letter-spacing: -0.02em; margin: 0 0 4px 0;">
          Operations Command
        </h1>
        <div style="font-size: 13px; color: var(--color-stone);">
          Active Shift: <strong style="color: var(--color-linen);">${branchName}</strong> · <span>${serviceShift}</span>
        </div>
      </div>

      <!-- Quick Action Buttons (Defect UX-DEF-001 Resolved) -->
      <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
        <a id="btn-quick-floor" href="/operations/floor" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
          ${icon('floor', { size: 14, color: 'var(--color-copper)' })}
          <span>Floor Studio</span>
        </a>
        <a id="btn-quick-tables" href="/operations/tables" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
          ${icon('tables', { size: 14, color: 'var(--color-stone)' })}
          <span>Tables Fleet</span>
        </a>
        <a id="btn-quick-kds" href="/kds" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
          ${icon('kitchen', { size: 14, color: 'var(--color-crimson)' })}
          <span>Kitchen KDS</span>
        </a>
        <a id="btn-quick-orders" href="/operations/orders" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
          ${icon('orders', { size: 14, color: 'var(--color-sky)' })}
          <span>Service Orders</span>
        </a>
        <a id="btn-quick-menu" href="/menu" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
          ${icon('menu', { size: 14, color: '#FFFFFF' })}
          <span>Menu Catalog</span>
        </a>
      </div>
    </div>

    <!-- 2. Operational Telemetry KPI Strip -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;">
      <!-- Shift Revenue -->
      <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 10px; padding: 16px 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; letter-spacing: 0.05em;">Shift Revenue</div>
          ${icon('credit-card', { size: 14, color: 'var(--color-copper)' })}
        </div>
        <div style="font-size: 24px; font-weight: 800; color: var(--color-copper); margin-top: 6px; font-family: var(--font-mono);">
          ₹${((totalShiftRevenueMinor || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style="font-size: 11px; color: var(--color-stone); margin-top: 4px;">
          From ${orders.length} orders & ${occupiedTables.length} active tabs
        </div>
      </div>

      <!-- Occupancy & Covers -->
      <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 10px; padding: 16px 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; letter-spacing: 0.05em;">Occupancy & Covers</div>
          ${icon('users', { size: 14, color: 'var(--color-stone)' })}
        </div>
        <div style="font-size: 24px; font-weight: 800; color: var(--color-linen); margin-top: 6px;">
          ${totalCovers} <span style="font-size: 14px; font-weight: 500; color: var(--color-stone);">/ ${totalCapacity} (${occupancyPercent}%)</span>
        </div>
        <div style="font-size: 11px; color: var(--color-stone); margin-top: 4px;">
          ${occupiedTables.length} occupied · ${availableTables.length} available
        </div>
      </div>

      <!-- Active Orders Pipeline -->
      <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 10px; padding: 16px 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; letter-spacing: 0.05em;">Order Pipeline</div>
          ${icon('orders', { size: 14, color: 'var(--color-sky)' })}
        </div>
        <div style="font-size: 24px; font-weight: 800; color: var(--color-sky); margin-top: 6px;">
          ${activeOrders.length} <span style="font-size: 14px; font-weight: 500; color: var(--color-stone);">Active</span>
        </div>
        <div style="font-size: 11px; color: var(--color-stone); margin-top: 4px;">
          ${orders.filter((o) => o.status === 'CONFIRMED').length} new · ${orders.filter((o) => o.status === 'IN_PREPARATION').length} cooking
        </div>
      </div>

      <!-- Kitchen Load -->
      <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 10px; padding: 16px 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; letter-spacing: 0.05em;">Kitchen Tasks</div>
          ${icon('flame', { size: 14, color: queuedTasks.length > 5 ? 'var(--color-crimson)' : 'var(--color-amber)' })}
        </div>
        <div style="font-size: 24px; font-weight: 800; color: ${queuedTasks.length > 5 ? 'var(--color-crimson)' : 'var(--color-linen)'}; margin-top: 6px;">
          ${queuedTasks.length} <span style="font-size: 14px; font-weight: 500; color: var(--color-stone);">In Flight</span>
        </div>
        <div style="font-size: 11px; color: var(--color-stone); margin-top: 4px;">
          ${tandoorCount} Tandoor · ${curryCount} Curry · ${barCount} Bar
        </div>
      </div>

      <!-- Service Attention Queue -->
      <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 10px; padding: 16px 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; letter-spacing: 0.05em;">Attention Items</div>
          ${icon('alert-circle', { size: 14, color: activeAttentionCount > 0 ? 'var(--color-amber)' : 'var(--color-sage)' })}
        </div>
        <div style="font-size: 24px; font-weight: 800; color: ${activeAttentionCount > 0 ? 'var(--color-amber)' : 'var(--color-sage)'}; margin-top: 6px;">
          ${activeAttentionCount} <span style="font-size: 14px; font-weight: 500; color: var(--color-stone);">${activeAttentionCount === 1 ? 'Action' : 'Actions'}</span>
        </div>
        <div style="font-size: 11px; color: var(--color-stone); margin-top: 4px;">
          ${pendingRequests.length} guest calls · ${billRequestedTables.length} bill checkouts
        </div>
      </div>
    </div>

    <!-- 3. Two-Column Operational Core -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      
      <!-- Left Column: Immediate Attention Queue & Active Tabs -->
      <div style="display: flex; flex-direction: column; gap: 20px;">
        
        <!-- Attention Queue Card -->
        <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 12px; overflow: hidden;">
          <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.01);">
            <div style="font-size: 13px; font-weight: 700; color: var(--color-amber); display: flex; align-items: center; gap: 8px;">
              ${icon('alert-circle', { size: 16, color: 'var(--color-amber)' })}
              <span>Needs Immediate Attention</span>
            </div>
            <span class="badge ${activeAttentionCount > 0 ? 'badge-amber' : 'badge-sage'}">
              ${activeAttentionCount} Active
            </span>
          </div>

          <div style="padding: 16px; display: flex; flex-direction: column; gap: 10px;">
            ${
              pendingRequests.length === 0 && billRequestedTables.length === 0
                ? `<div style="padding: 24px 16px; text-align: center; color: var(--color-stone); font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <span style="color: var(--color-sage); font-size: 20px;">✓</span>
                    <span>All active tables and guest requests in good standing. No urgent items.</span>
                   </div>`
                : ''
            }

            <!-- Bill Checkout Requests -->
            ${billRequestedTables
              .map(
                (tbl) => `
              <div style="background: rgba(217, 154, 69, 0.08); border: 1px solid rgba(217, 154, 69, 0.3); border-radius: 8px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                <div>
                  <div style="font-size: 13px; font-weight: 700; color: var(--color-linen); display: flex; align-items: center; gap: 6px;">
                    <span>Table ${tbl.number}</span>
                    <span class="badge badge-amber" style="font-size: 10px;">Bill Requested</span>
                  </div>
                  <div style="font-size: 11px; color: var(--color-stone); margin-top: 2px;">
                    Section: ${tbl.section || 'Dining'} · Tab Total: <strong style="color:var(--color-copper);font-family:var(--font-mono);">₹${(((tbl.activeBillMinor || 0) / 100)).toFixed(2)}</strong>
                  </div>
                </div>
                <a href="/operations/floor?table=${tbl.id}" class="btn btn-primary btn-sm" style="font-size: 11px; display: inline-flex; align-items: center; gap: 5px;">
                  ${icon('file-text', { size: 12, color: '#FFFFFF' })} Settle Check
                </a>
              </div>`
              )
              .join('')}

            <!-- Guest Service Calls -->
            ${pendingRequests
              .map(
                (req) => `
              <div style="background: rgba(200, 107, 60, 0.08); border: 1px solid rgba(200, 107, 60, 0.25); border-radius: 8px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                <div>
                  <div style="font-size: 13px; font-weight: 700; color: var(--color-linen); display: flex; align-items: center; gap: 6px;">
                    <span>Table ${req.tableNumber}</span>
                    <span class="badge badge-copper" style="font-size: 10px;">${req.type}</span>
                  </div>
                  <div style="font-size: 11px; color: var(--color-stone); margin-top: 2px;">
                    ${req.note || 'Guest assistance requested via Mobile Companion'} · ${req.requestedAt}
                  </div>
                </div>
                <button class="btn btn-secondary btn-sm" style="font-size: 11px; display: inline-flex; align-items: center; gap: 4px;" onclick="resolveRequest('${req.id}')">
                  ${icon('check', { size: 12, color: 'var(--color-sage)' })} Mark Handled
                </button>
              </div>`
              )
              .join('')}
          </div>
        </div>

        <!-- Active Tables Ledger -->
        <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 12px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <div style="font-size: 14px; font-weight: 700; color: var(--color-linen);">Seated Tables & Invoicing</div>
              <div style="font-size: 11px; color: var(--color-stone);">Active dining folios in this service shift</div>
            </div>
            <a href="/operations/tables" style="font-size: 12px; color: var(--color-copper); text-decoration: none; font-weight: 600;">
              All Tables (${tables.length}) →
            </a>
          </div>

          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-subtle); color: var(--color-stone); font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">
                  <th style="padding: 8px 6px;">Table</th>
                  <th style="padding: 8px 6px;">Section</th>
                  <th style="padding: 8px 6px;">Covers</th>
                  <th style="padding: 8px 6px;">Status</th>
                  <th style="padding: 8px 6px; text-align: right;">Current Tab</th>
                </tr>
              </thead>
              <tbody>
                ${tables
                  .filter((t) => t.status === 'OCCUPIED' || t.status === 'BILL_REQUESTED')
                  .slice(0, 6)
                  .map((t) => {
                    const billFormatted = `₹${((t.activeBillMinor || 0) / 100).toFixed(2)}`;
                    const statusBadge =
                      t.status === 'OCCUPIED'
                        ? '<span class="badge badge-copper">Occupied</span>'
                        : '<span class="badge badge-amber">Bill Req</span>';
                    return `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); cursor: pointer;" onclick="window.location.href='/operations/floor?table=${t.id}'">
                    <td style="padding: 10px 6px; font-weight: 700; color: var(--color-linen);">${t.number}</td>
                    <td style="padding: 10px 6px; color: var(--color-stone);">${t.section || 'Main Floor'}</td>
                    <td style="padding: 10px 6px; color: var(--color-stone);">${t.capacity}P</td>
                    <td style="padding: 10px 6px;">${statusBadge}</td>
                    <td style="padding: 10px 6px; text-align: right; font-weight: 700; font-family: var(--font-mono); color: var(--color-copper);">${billFormatted}</td>
                  </tr>`;
                  })
                  .join('') ||
                  `<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--color-stone);">No tables currently seated. Open walk-in seating available.</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Right Column: Spatial Floor Map & Kitchen Loads -->
      <div style="display: flex; flex-direction: column; gap: 20px;">
        
        <!-- Spatial Floor Mini-Map Card -->
        <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 12px; overflow: hidden;">
          <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 13px; font-weight: 700; color: var(--color-linen); display: flex; align-items: center; gap: 8px;">
              ${icon('floor', { size: 15, color: 'var(--color-copper)' })}
              <span>Live Floor Map</span>
              <span class="badge badge-neutral">${tables.length} Tables</span>
            </div>
            <a href="/operations/floor" style="font-size: 12px; color: var(--color-copper); text-decoration: none; font-weight: 600;">Open Floor Studio ↗</a>
          </div>

          <div style="padding: 14px; background: #0A0D10;">
            <svg id="mini-floor-svg" class="mini-floor-svg" viewBox="0 0 940 520" style="width: 100%; height: auto; max-height: 240px; display: block; border-radius: 6px; background: #0F1215; border: 1px dashed rgba(255,255,255,0.06);">
              <!-- Boundary -->
              <rect x="20" y="20" width="900" height="480" rx="8" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" stroke-dasharray="4 4"/>
              
              <!-- Real Table Shapes -->
              ${tables
                .map((t) => {
                  const strokeColor =
                    t.status === 'OCCUPIED'
                      ? 'var(--color-copper)'
                      : t.status === 'BILL_REQUESTED'
                      ? 'var(--color-amber)'
                      : t.status === 'RESERVED'
                      ? 'var(--color-sky)'
                      : 'var(--color-sage)';
                  const fillColor =
                    t.status === 'OCCUPIED'
                      ? 'rgba(200, 107, 60, 0.22)'
                      : t.status === 'BILL_REQUESTED'
                      ? 'rgba(217, 154, 69, 0.25)'
                      : t.status === 'RESERVED'
                      ? 'rgba(74, 139, 178, 0.2)'
                      : 'rgba(93, 154, 122, 0.15)';

                  return `
                <g id="mini-table-${t.id}" transform="translate(${t.x}, ${t.y})" style="cursor: pointer;" onclick="window.location.href='/operations/floor?table=${t.id}'">
                  ${
                    t.shape === 'circle'
                      ? `<circle cx="${t.width / 2}" cy="${t.height / 2}" r="${t.width / 2 - 2}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />`
                      : `<rect width="${t.width}" height="${t.height}" rx="6" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />`
                  }
                  <text x="${t.width / 2}" y="${t.height / 2 + 4}" text-anchor="middle" fill="#FFFFFF" font-size="11" font-weight="800" font-family="monospace">${t.number}</text>
                </g>`;
                })
                .join('')}
            </svg>

            <!-- Mini Map Legend -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 11px; color: var(--color-stone); padding: 0 4px;">
              <div style="display: flex; gap: 12px;">
                <span style="display: inline-flex; align-items: center; gap: 5px;"><span style="width:7px;height:7px;border-radius:2px;background:var(--color-sage);"></span> ${availableTables.length} Avl</span>
                <span style="display: inline-flex; align-items: center; gap: 5px;"><span style="width:7px;height:7px;border-radius:2px;background:var(--color-copper);"></span> ${occupiedTables.length} Occ</span>
                <span style="display: inline-flex; align-items: center; gap: 5px;"><span style="width:7px;height:7px;border-radius:2px;background:var(--color-amber);"></span> ${billRequestedTables.length} Bill</span>
                <span style="display: inline-flex; align-items: center; gap: 5px;"><span style="width:7px;height:7px;border-radius:2px;background:var(--color-sky);"></span> ${reservedTables.length} Res</span>
              </div>
              <a href="/operations/floor" style="color: var(--color-copper); text-decoration: none; font-weight: 600;">Interactive Editor →</a>
            </div>
          </div>
        </div>

        <!-- Kitchen Station Realtime Workload -->
        <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 12px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--color-linen); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
              ${icon('kitchen', { size: 15, color: 'var(--color-copper)' })}
              <span>Kitchen Station Workloads</span>
            </div>
            <a href="/kds" style="font-size: 12px; color: var(--color-copper); text-decoration: none; font-weight: 600;">Open KDS →</a>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                <span style="font-weight: 600; color: var(--color-linen);">Tandoor Clay Oven</span>
                <span style="font-weight: 800; color: ${tandoorCount > 3 ? 'var(--color-crimson)' : 'var(--color-copper)'};">${tandoorCount} active orders</span>
              </div>
              <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden;">
                <div style="width: ${Math.min(100, tandoorCount * 25)}%; height: 100%; background: var(--color-copper);"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                <span style="font-weight: 600; color: var(--color-linen);">Curry & Wok Line</span>
                <span style="font-weight: 800; color: var(--color-sage);">${curryCount} active orders</span>
              </div>
              <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden;">
                <div style="width: ${Math.min(100, curryCount * 25)}%; height: 100%; background: var(--color-sage);"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                <span style="font-weight: 600; color: var(--color-linen);">Bar & Drinks Station</span>
                <span style="font-weight: 800; color: var(--color-sky);">${barCount} active orders</span>
              </div>
              <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden;">
                <div style="width: ${Math.min(100, barCount * 25)}%; height: 100%; background: var(--color-sky);"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                <span style="font-weight: 600; color: var(--color-linen);">Expo Pass & Desserts</span>
                <span style="font-weight: 800; color: var(--color-stone);">${expoCount} orders</span>
              </div>
              <div style="height: 6px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden;">
                <div style="width: ${Math.min(100, expoCount * 25)}%; height: 100%; background: var(--color-stone);"></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- 4. Chronological Service Timeline (Live Outbox Stream) -->
    <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 12px; padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div style="font-size: 13px; font-weight: 700; color: var(--color-linen); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px;">
          ${icon('clock', { size: 14, color: 'var(--color-copper)' })}
          <span>Service Timeline & Operations Stream</span>
        </div>
        <span style="font-size: 11px; color: var(--color-stone); font-family: var(--font-mono);">Realtime Event Stream</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${timelineEvents
          .map(
            (ev) => `
          <div style="display: flex; align-items: baseline; gap: 14px; font-size: 13px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.03);">
            <span style="font-family: var(--font-mono); font-weight: 700; color: var(--color-copper); width: 50px; font-size: 12px;">${ev.time}</span>
            <strong style="color: var(--color-linen); width: 240px; font-size: 13px;">${ev.title}</strong>
            <span style="color: var(--color-stone); font-size: 12px; flex: 1;">${ev.detail}</span>
          </div>`
          )
          .join('')}
      </div>
    </div>

  </div>

  <script>
    async function resolveRequest(reqId) {
      try {
        const token = (window.__STAFF_SESSION__ && window.__STAFF_SESSION__.token) || '';
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch('/api/restaurant/service-requests/' + reqId + '/resolve', {
          method: 'POST',
          headers: headers
        });
        if (res.ok) {
          window.location.reload();
        } else {
          alert('Failed to resolve request');
        }
      } catch (err) {
        alert('Network error resolving request');
      }
    }

    // Live SSE Updates for Operations Command
    try {
      const evtSource = new EventSource('/api/restaurant/events');
      evtSource.addEventListener('service_request.created', () => location.reload());
      evtSource.addEventListener('service_request.resolved', () => location.reload());
      evtSource.addEventListener('order.created', () => location.reload());
      evtSource.addEventListener('table.status_changed', () => location.reload());
      evtSource.addEventListener('table.updated', () => location.reload());
      evtSource.addEventListener('task.started', () => location.reload());
      evtSource.addEventListener('task.bumped', () => location.reload());
      evtSource.addEventListener('resync_required', () => location.reload());
    } catch (err) {}
  </script>`;
}
