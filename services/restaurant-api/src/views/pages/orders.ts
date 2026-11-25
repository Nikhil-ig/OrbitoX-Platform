/**
 * 🪐 RestaurantOS Modern — Orders Docket Workspace (SCR-OPS-ORDERS)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pixel-perfect implementation of 'Orders · desktop.png':
 * - Status filter tabs: Live, Completed, Cancelled
 * - Realtime order pipeline metric strip (in progress, New, Cooking, Ready, Late)
 * - Dynamic order docket cards mapped from database orders with status badges, elapsed timers, items count, and tender amounts
 * - 1-Click Order Lifecycle Action buttons (Start Cooking, Mark Ready, Settle / Complete, Cancel)
 * - Real API persistence: PATCH /api/restaurant/orders/:id/status, POST /api/restaurant/orders/:id/cancel
 */

import { RestaurantOrder, BranchRecord, DEFAULT_BRANCHES } from '../../shared';

export function renderOrdersWorkspace(
  initialOrders: RestaurantOrder[] = [],
  branches: BranchRecord[] = DEFAULT_BRANCHES,
  currentBranchId?: string
): string {
  const ordersList: any[] = Array.isArray(initialOrders) ? initialOrders : [];

  // Pipeline telemetry math
  const inProgressOrders = ordersList.filter((o) => ['PLACED', 'PENDING', 'CONFIRMED', 'NEW', 'QUEUED', 'PREPARING', 'IN_PREP', 'IN_PROGRESS', 'COOKING', 'READY'].includes(o.status));
  const newOrdersCount = ordersList.filter((o) => ['PLACED', 'PENDING', 'CONFIRMED', 'NEW', 'QUEUED'].includes(o.status)).length;
  const cookingCount = ordersList.filter((o) => ['PREPARING', 'IN_PREP', 'COOKING'].includes(o.status)).length;
  const readyCount = ordersList.filter((o) => ['READY'].includes(o.status)).length;
  const lateCount = ordersList.filter((o) => o.isLate || o.elapsedMinutes > 20).length;

  return `
  <div class="orders-container" style="padding: 24px 32px 48px 32px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 24px;">
    
    <!-- 1. Header: Meta, Title & Tabs -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="font-size: 13px; font-weight: 500; color: #64748B; margin-bottom: 4px;">
          Tonight's service orders · active floor & takeout
        </div>
        <h1 style="font-size: 34px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; margin: 0;">
          Orders
        </h1>
      </div>

      <!-- Live / Completed / Cancelled Tabs + Search -->
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <input
          type="text"
          id="orders-search-input"
          placeholder="Search table, server or ID..."
          oninput="filterOrdersSearch(this.value)"
          style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 9999px; padding: 8px 16px; font-size: 13px; color: #0F172A; width: 210px; max-width: 100%; outline: none;"
        />
        <div id="status-filter-pills" style="display: flex; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 9999px; padding: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
          <button type="button" class="order-tab active" onclick="switchOrderTab('live', this)">
            Live · ${inProgressOrders.length}
          </button>
          <button type="button" class="order-tab" onclick="switchOrderTab('completed', this)">
            Completed
          </button>
          <button type="button" class="order-tab" onclick="switchOrderTab('cancelled', this)">
            Cancelled
          </button>
        </div>
      </div>
    </div>

    <!-- 2. Pipeline Summary Bar -->
    <div style="background: #FFFFFF; border-radius: 24px; border: 1px solid rgba(0,0,0,0.06); padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
      <div>
        <div style="font-size: 42px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; line-height: 1;">
          ${inProgressOrders.length}
        </div>
        <div style="font-size: 13px; color: #64748B; margin-top: 6px; font-weight: 500;">
          orders in progress right now
        </div>
      </div>

      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <!-- New -->
        <div style="background: #F1F5F9; border-radius: 18px; padding: 14px 20px; min-width: 90px; text-align: center;">
          <div style="font-size: 22px; font-weight: 800; color: #0F172A;">${newOrdersCount}</div>
          <div style="font-size: 11px; font-weight: 600; color: #64748B; margin-top: 2px;">New</div>
        </div>

        <!-- Cooking (Solid Black Card) -->
        <div style="background: #111827; border-radius: 18px; padding: 14px 20px; min-width: 90px; text-align: center; color: #FFFFFF;">
          <div style="font-size: 22px; font-weight: 800;">${cookingCount}</div>
          <div style="font-size: 11px; font-weight: 600; color: #94A3B8; margin-top: 2px;">Cooking</div>
        </div>

        <!-- Ready -->
        <div style="background: #F1F5F9; border-radius: 18px; padding: 14px 20px; min-width: 90px; text-align: center;">
          <div style="font-size: 22px; font-weight: 800; color: #0F172A;">${readyCount}</div>
          <div style="font-size: 11px; font-weight: 600; color: #64748B; margin-top: 2px;">Ready</div>
        </div>

        <!-- Running Late -->
        <div style="background: ${lateCount > 0 ? '#FEE2E2' : '#F1F5F9'}; border-radius: 18px; padding: 14px 20px; min-width: 100px; text-align: center;">
          <div style="font-size: 22px; font-weight: 800; color: ${lateCount > 0 ? '#DC2626' : '#64748B'};">${lateCount}</div>
          <div style="font-size: 11px; font-weight: 600; color: ${lateCount > 0 ? '#DC2626' : '#64748B'}; margin-top: 2px;">Running late</div>
        </div>
      </div>
    </div>

    <!-- Mobile & Desktop Quick Stage Filter Chips (Matching 'Owner phone · Orders.png') -->
    <div id="order-stage-chips" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px;">
      <button type="button" class="stage-chip active" onclick="filterOrderStage('ALL', this)">All (${ordersList.length})</button>
      <button type="button" class="stage-chip ${lateCount > 0 ? 'warn' : ''}" onclick="filterOrderStage('LATE', this)">Late (${lateCount})</button>
      <button type="button" class="stage-chip" onclick="filterOrderStage('NEW', this)">New (${newOrdersCount})</button>
      <button type="button" class="stage-chip" onclick="filterOrderStage('COOKING', this)">Cooking (${cookingCount})</button>
      <button type="button" class="stage-chip" onclick="filterOrderStage('READY', this)">Ready (${readyCount})</button>
    </div>

    <!-- 3. Order Docket Cards Grid (Matching Orders desktop mockup) -->
    <div id="orders-grid-container" class="orders-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
      ${ordersList.length === 0 ? `
        <div class="ui-card" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center;">
          <div style="font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 6px;">No orders in this branch yet</div>
          <div style="font-size: 13px; color: #64748B; margin-bottom: 18px;">Orders placed from POS or table QR codes will appear here live.</div>
          <a href="/pos" class="btn btn-primary" style="border-radius: 9999px; padding: 10px 20px; font-size: 13px; font-weight: 600; text-decoration: none; display: inline-block;">Open POS Terminal</a>
        </div>
      ` : ''}
      ${ordersList
      .map((order) => {
        const isCooking = ['PREPARING', 'IN_PREP', 'IN_PROGRESS', 'COOKING'].includes(order.status);
        const isNew = ['PLACED', 'PENDING', 'CONFIRMED', 'NEW', 'QUEUED'].includes(order.status);
        const isReady = order.status === 'READY';
        const isCompleted = ['COMPLETED', 'SERVED', 'PAID'].includes(order.status);
        const isCancelled = order.status === 'CANCELLED';
        const isLate = order.isLate || order.elapsedMinutes > 20;

        // Card Background & Styling
        let cardBg = '#FFFFFF';
        let textColor = '#0F172A';
        let subTextColor = '#64748B';
        let cardBorder = '1px solid rgba(0,0,0,0.06)';
        let badgeBg = '#F1F5F9';
        let badgeColor = '#475569';
        let badgeLabel = 'New';

        if (isCooking) {
          cardBg = '#111827';
          textColor = '#FFFFFF';
          subTextColor = '#94A3B8';
          badgeBg = '#FFFFFF';
          badgeColor = '#111827';
          badgeLabel = 'Cooking';
        } else if (isReady) {
          badgeBg = '#D1FAE5';
          badgeColor = '#065F46';
          badgeLabel = 'Ready';
        } else if (isLate) {
          cardBorder = '1.5px solid #FCA5A5';
          badgeBg = '#FEE2E2';
          badgeColor = '#DC2626';
          badgeLabel = 'Late';
        } else if (isCompleted) {
          badgeBg = '#F1F5F9';
          badgeColor = '#475569';
          badgeLabel = 'Completed';
        }

        const oid = String(order.orderId || order.id || '');
        const label = order.tableNumber || `Table ${order.tableId || order.orderNumber || oid.slice(0, 8)}`;
        const minor = Number(order.totalMinor ?? order.quote?.totalMinor ?? order.totalAmountMinor ?? 0);
        const price = order.formattedTotal || `₹${Math.round(minor / 100).toLocaleString('en-IN')}`;
        const itemsText = `${order.itemCount || (order.items || []).length || 1} item${((order.items || []).length || 1) === 1 ? '' : 's'} · ${order.diningType === 'TAKEAWAY' ? 'takeaway' : 'dine-in'}`;

        // Next Action Button
        let actionBtn = '';
        if (isNew) {
          actionBtn = `<button type="button" class="btn btn-primary btn-sm" onclick="advanceOrderStatus('${escapeHtml(oid)}', 'PREPARING')" style="border-radius: 9999px; font-size: 11px; padding: 6px 14px;">Start Cooking</button>`;
        } else if (isCooking) {
          actionBtn = `<button type="button" class="btn btn-secondary btn-sm" onclick="advanceOrderStatus('${escapeHtml(oid)}', 'READY')" style="border-radius: 9999px; font-size: 11px; padding: 6px 14px; background: #FFFFFF; color: #111827;">Mark Ready</button>`;
        } else if (isReady) {
          actionBtn = `<button type="button" class="btn btn-primary btn-sm" onclick="advanceOrderStatus('${escapeHtml(oid)}', 'COMPLETED')" style="border-radius: 9999px; font-size: 11px; padding: 6px 14px;">Settle / Done</button>`;
        }

        const categoryTab = isCompleted ? 'completed' : isCancelled ? 'cancelled' : 'live';

        return `
          <div 
            class="order-card-docket" 
            data-tab-category="${categoryTab}"
            data-search="${escapeHtml(`${oid} ${label} ${order.serverName || ''}`.toLowerCase())}"
            style="background: ${cardBg}; color: ${textColor}; border-radius: 24px; padding: 24px; display: ${categoryTab === 'live' ? 'flex' : 'none'}; flex-direction: column; justify-content: space-between; min-height: 200px; border: ${cardBorder}; box-shadow: 0 4px 20px rgba(0,0,0,0.04); transition: transform 120ms ease;"
          >
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-size: 20px; font-weight: 800; color: ${textColor};">${escapeHtml(label)}</div>
                <span style="background: ${badgeBg}; color: ${badgeColor}; border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 700;">
                  ${badgeLabel}
                </span>
              </div>
              <div style="font-size: 12px; color: ${subTextColor};">
                ${escapeHtml(order.serverName || 'Staff')} · ${itemsText}
              </div>

              <!-- Progress Bar Track -->
              <div style="display: flex; gap: 4px; margin: 16px 0;">
                <div style="flex: 1; height: 4px; background: ${isCooking ? '#FFFFFF' : '#0F172A'}; border-radius: 999px;"></div>
                <div style="flex: 1; height: 4px; background: ${isCooking || isReady || isCompleted ? (isCooking ? '#FFFFFF' : '#0F172A') : '#E2E8F0'}; border-radius: 999px;"></div>
                <div style="flex: 1; height: 4px; background: ${isReady || isCompleted ? '#0F172A' : (isCooking ? '#374151' : '#E2E8F0')}; border-radius: 999px;"></div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; gap: 8px; flex-wrap: wrap;">
              <div>
                <span style="font-size: 24px; font-weight: 800; color: ${textColor};">${price}</span>
                <span style="font-size: 12px; color: ${subTextColor}; margin-left: 6px;">${order.elapsedMinutes || 5} min</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                ${categoryTab === 'live' ? `<button type="button" class="btn btn-secondary btn-sm" onclick="openOrderDrawer('${escapeHtml(oid)}', '${escapeHtml(label)}', '${escapeHtml(price)}')" style="border-radius: 9999px; font-size: 11px; padding: 6px 12px;">Manage</button>` : ''}
                ${actionBtn}
              </div>
            </div>
          </div>`;
      })
      .join('')}
    </div>

  </div>

  <!-- Order Detail & Cancellation Drawer / Mobile Bottom Sheet -->
  <div id="order-detail-drawer" onclick="if(event.target === this) closeOrderDrawer()" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(4px); z-index: 99999; align-items: center; justify-content: flex-end;">
    <div class="order-drawer-panel" style="background: #FFFFFF; width: 400px; max-width: 100vw; height: 100%; padding: 28px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; box-shadow: -12px 0 40px rgba(0,0,0,0.15);">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <h3 id="drawer-order-title" style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 0;">Order Details</h3>
          <button type="button" onclick="closeOrderDrawer()" style="background: #F1F5F9; border: none; border-radius: 999px; width: 32px; height: 32px; cursor: pointer; font-weight: 700;">✕</button>
        </div>
        <div style="font-size: 13px; color: #64748B; margin-bottom: 16px;" id="drawer-order-meta">Order ID</div>
        <div id="drawer-cancel-box" style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 18px; padding: 16px; display: flex; flex-direction: column; gap: 10px;">
          <label style="font-size: 12px; font-weight: 700; color: #991B1B;">Void / Cancellation Reason</label>
          <input type="text" id="drawer-cancel-reason" placeholder="Reason required (min 3 chars)" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid #FCA5A5; font-size: 13px; box-sizing: border-box;" />
          <button type="button" onclick="submitCancelOrder()" style="border: none; background: #DC2626; color: #FFFFFF; border-radius: 9999px; padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer;">Confirm Cancel Order</button>
        </div>
      </div>
      <button type="button" onclick="closeOrderDrawer()" class="btn btn-secondary" style="border-radius: 9999px; width: 100%;">Close</button>
    </div>
  </div>

  <style>
    .order-tab {
      background: transparent;
      border: none;
      border-radius: 9999px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
      transition: all 120ms ease;
    }
    .order-tab:hover {
      color: #0F172A;
    }
    .order-tab.active {
      background: #000000;
      color: #FFFFFF;
    }
    .order-card-docket:hover {
      transform: translateY(-2px);
    }
    .stage-chip {
      border: 1px solid #E2E8F0;
      background: #FFFFFF;
      color: #475569;
      border-radius: 9999px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .stage-chip.warn {
      border-color: #FECACA;
      color: #DC2626;
      background: #FEF2F2;
    }
    .stage-chip.active {
      background: #0F172A;
      color: #FFFFFF;
      border-color: #0F172A;
    }
    @media (max-width: 768px) {
      .orders-container {
        padding: 16px 16px 96px 16px !important;
      }
      #order-detail-drawer {
        align-items: flex-end !important;
        justify-content: center !important;
      }
      .order-drawer-panel {
        width: 100% !important;
        height: auto !important;
        max-height: 85vh !important;
        border-radius: 28px 28px 0 0 !important;
        padding: 20px 20px 28px 20px !important;
      }
    }
  </style>

  <script>
    let currentOrderTab = 'live';
    let currentOrderStage = 'ALL';
    let drawerActiveOrderId = '';

    function switchOrderTab(tabName, btn) {
      currentOrderTab = tabName;
      document.querySelectorAll('.order-tab').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      applyOrderFilters();
    }

    function filterOrderStage(stage, btn) {
      currentOrderStage = stage;
      document.querySelectorAll('.stage-chip').forEach(c => c.classList.remove('active'));
      if (btn) btn.classList.add('active');
      applyOrderFilters();
    }

    function filterOrdersSearch(q) {
      applyOrderFilters(q);
    }

    function applyOrderFilters(queryOverride) {
      const q = String(queryOverride !== undefined ? queryOverride : (document.getElementById('orders-search-input')?.value || '')).toLowerCase().trim();
      const dockets = document.querySelectorAll('.order-card-docket');
      dockets.forEach(d => {
        const cat = d.getAttribute('data-tab-category');
        const hay = d.getAttribute('data-search') || '';
        const text = (d.textContent || '').toLowerCase();
        const matchTab = currentOrderStage !== 'ALL' ? true : cat === currentOrderTab;
        const matchSearch = !q || hay.includes(q);
        let matchStage = true;
        if (currentOrderStage === 'LATE') matchStage = text.includes('late');
        else if (currentOrderStage === 'NEW') matchStage = text.includes('new');
        else if (currentOrderStage === 'COOKING') matchStage = text.includes('cooking');
        else if (currentOrderStage === 'READY') matchStage = text.includes('ready');
        d.style.display = (matchTab && matchSearch && matchStage) ? 'flex' : 'none';
      });
    }

    function openOrderDrawer(orderId, label, price) {
      drawerActiveOrderId = orderId;
      document.getElementById('drawer-order-title').textContent = label + ' · ' + price;
      document.getElementById('drawer-order-meta').textContent = 'Order ID: ' + orderId;
      document.getElementById('drawer-cancel-reason').value = '';
      document.getElementById('order-detail-drawer').style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }

    function closeOrderDrawer() {
      document.getElementById('order-detail-drawer').style.display = 'none';
      document.body.style.overflow = '';
    }
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOrderDrawer(); });

    async function submitCancelOrder() {
      const reason = String(document.getElementById('drawer-cancel-reason')?.value || '').trim();
      if (reason.length < 3) {
        window.showToast('Please enter a cancellation reason (min 3 characters).', 'error');
        return;
      }
      try {
        await window.apiFetch('/api/restaurant/orders/' + encodeURIComponent(drawerActiveOrderId) + '/cancel', {
          method: 'POST',
          body: { reason }
        });
        closeOrderDrawer();
        window.showToast('Order cancelled and audited.', 'success');
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {}
    }

    async function advanceOrderStatus(orderId, nextStatus) {
      try {
        await window.apiFetch('/api/restaurant/orders/' + encodeURIComponent(orderId) + '/status', {
          method: 'PATCH',
          body: { status: nextStatus }
        });
        window.showToast('Order status updated to ' + nextStatus, 'success');
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {
        window.showToast((err && err.message) ? err.message : 'Failed to update order status', 'error');
      }
    }
  </script>
  `;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
