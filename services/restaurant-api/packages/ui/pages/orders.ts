/**
 * 🍷 RestaurantOS 2.0 Operational Orders Workspace
 * ─────────────────────────────────────────────────────────────────────────────
 * Real multi-dimensional order state inspection (Commercial, Fulfillment,
 * Kitchen, Payment). No fake status fixtures.
 * Single source of truth shared with Floor POS, KDS, and Commerce.
 */

import { RestaurantOrder, BranchRecord, DEFAULT_BRANCHES } from '../../domain';

export function renderOrdersWorkspace(
  initialOrders: RestaurantOrder[] = [],
  branches: BranchRecord[] = DEFAULT_BRANCHES,
  currentBranchId?: string
): string {
  const activeBranch = branches.find((b) => b.id === currentBranchId) || branches[0] || { id: 'branch_ldh', name: 'Ludhiana Main' };
  const serializedInitialOrders = JSON.stringify(initialOrders).replace(/</g, '\\u003c');

  return `
  <div class="orders-workspace-container" style="padding: 24px; max-width: 1400px; margin: 0 auto; width: 100%; min-height: calc(100vh - 120px); display: flex; flex-direction: column; gap: 20px;">
    <!-- Workspace Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; letter-spacing: 0.05em;">Operations & Fulfillment</span>
          <span style="display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: var(--color-stone);"></span>
          <span style="font-size: 11px; font-weight: 700; color: var(--color-copper);">${activeBranch.name}</span>
        </div>
        <h1 style="font-size: 26px; font-weight: 800; color: var(--color-linen); letter-spacing: -0.02em;">Service Orders</h1>
      </div>
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <button id="btn-refresh-orders" class="btn btn-secondary btn-sm" onclick="window.ordersApp && window.ordersApp.refreshOrders()" title="Refresh live orders from server">
          <span id="refresh-icon" style="display: inline-block; transition: transform 0.4s ease;">↺</span> Refresh
        </button>
        <a href="/kds?branch=${encodeURIComponent(activeBranch.id)}" class="btn btn-secondary btn-sm">
          Kitchen Queue ↗
        </a>
        <a href="/operations/floor?branch=${encodeURIComponent(activeBranch.id)}" class="btn btn-primary btn-sm">
          Floor POS ↗
        </a>
      </div>
    </div>

    <!-- KPI Summary Cards -->
    <div class="orders-kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
      <div style="background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 8px; padding: 14px 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Active Queue</div>
        <div id="kpi-active-count" style="font-size: 24px; font-weight: 800; color: var(--color-linen); margin-top: 4px;">--</div>
      </div>
      <div style="background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 8px; padding: 14px 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--color-sky); text-transform: uppercase;">In Preparation</div>
        <div id="kpi-prep-count" style="font-size: 24px; font-weight: 800; color: var(--color-sky); margin-top: 4px;">--</div>
      </div>
      <div style="background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 8px; padding: 14px 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--color-sage); text-transform: uppercase;">Served (Unsettled)</div>
        <div id="kpi-served-count" style="font-size: 24px; font-weight: 800; color: var(--color-sage); margin-top: 4px;">--</div>
      </div>
      <div style="background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 8px; padding: 14px 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--color-copper); text-transform: uppercase;">Active Pipeline Total</div>
        <div id="kpi-revenue-total" style="font-size: 24px; font-weight: 800; color: var(--color-copper); margin-top: 4px; font-family: var(--font-mono);">₹0.00</div>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; background: rgba(255,255,255,0.02); padding: 12px 16px; border: 1px solid var(--border-subtle); border-radius: 8px;">
      <!-- Filter Tabs -->
      <div id="status-filter-pills" style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button class="filter-pill active" data-filter="ALL" onclick="window.ordersApp.setFilter('ALL')">All Orders</button>
        <button class="filter-pill" data-filter="ACTIVE" onclick="window.ordersApp.setFilter('ACTIVE')">Active Pipeline</button>
        <button class="filter-pill" data-filter="CONFIRMED" onclick="window.ordersApp.setFilter('CONFIRMED')">New Confirmed</button>
        <button class="filter-pill" data-filter="IN_PREPARATION" onclick="window.ordersApp.setFilter('IN_PREPARATION')">In Kitchen</button>
        <button class="filter-pill" data-filter="SERVED" onclick="window.ordersApp.setFilter('SERVED')">Served</button>
        <button class="filter-pill" data-filter="PAID" onclick="window.ordersApp.setFilter('PAID')">Settled & Paid</button>
        <button class="filter-pill" data-filter="TERMINAL" onclick="window.ordersApp.setFilter('TERMINAL')">Cancelled / Void</button>
      </div>

      <!-- Search Input -->
      <div style="position: relative; min-width: 260px; flex: 1; max-width: 360px;">
        <input 
          id="orders-search-input" 
          type="text" 
          placeholder="Search order #, table, customer, item..." 
          style="width: 100%; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 6px; padding: 7px 12px 7px 30px; font-size: 13px; color: var(--color-linen); outline: none; transition: border-color 0.2s;"
          onfocus="this.style.borderColor='var(--color-copper)'"
          onblur="this.style.borderColor='var(--border-default)'"
          oninput="window.ordersApp.handleSearch(this.value)"
        />
        <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 13px; color: var(--color-stone); pointer-events: none;">🔍</span>
      </div>
    </div>

    <!-- Orders Master View & Details Drawer Layout -->
    <div style="display: flex; gap: 20px; position: relative; align-items: flex-start;">
      <!-- Orders List Table Card -->
      <div style="flex: 1; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 10px; overflow: hidden; min-width: 0;">
        <!-- Table Header (Desktop) -->
        <div class="orders-table-header" style="padding: 12px 16px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border-subtle); display: grid; grid-template-columns: 110px 80px 140px 1fr 110px 90px 100px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); letter-spacing: 0.04em;">
          <div>Order #</div>
          <div>Table</div>
          <div>Status</div>
          <div>Items Summary</div>
          <div style="text-align: right;">Amount</div>
          <div style="text-align: right;">Time</div>
          <div style="text-align: center;">Action</div>
        </div>

        <!-- Orders Container -->
        <div id="orders-list-body" style="display: flex; flex-direction: column; min-height: 240px;">
          <!-- Dynamically populated -->
        </div>
      </div>

      <!-- Slide-Out / Responsive Order Detail Drawer -->
      <div id="order-detail-drawer" class="order-detail-drawer" style="display: none; width: 420px; background: var(--color-elevated); border: 1px solid var(--border-strong); border-radius: 10px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.6); position: sticky; top: 20px; max-height: calc(100vh - 140px); flex-direction: column;">
        <!-- Drawer Header -->
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02);">
          <div>
            <div style="font-size: 10px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; letter-spacing: 0.05em;">Order Details</div>
            <h2 id="drawer-order-id" style="font-size: 18px; font-weight: 800; color: var(--color-linen); font-family: var(--font-mono); margin-top: 2px;">--</h2>
          </div>
          <button onclick="window.ordersApp.closeDrawer()" class="btn btn-ghost btn-sm" style="font-size: 16px; width: 28px; height: 28px; padding: 0;" title="Close drawer">✕</button>
        </div>

        <!-- Drawer Content Scroll Area -->
        <div id="drawer-body" style="padding: 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px;">
          <!-- Order Metadata Card -->
          <div style="background: var(--color-charcoal); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
            <div>
              <span style="color: var(--color-stone); display: block; font-size: 10px; text-transform: uppercase;">Table / Location</span>
              <strong id="drawer-table-num" style="color: var(--color-linen); font-size: 14px;">--</strong>
            </div>
            <div>
              <span style="color: var(--color-stone); display: block; font-size: 10px; text-transform: uppercase;">Current Status</span>
              <span id="drawer-status-badge" class="badge badge-neutral" style="margin-top: 2px;">--</span>
            </div>
            <div>
              <span style="color: var(--color-stone); display: block; font-size: 10px; text-transform: uppercase;">Session ID</span>
              <span id="drawer-session-id" style="font-family: var(--font-mono); color: var(--color-stone);">--</span>
            </div>
            <div>
              <span style="color: var(--color-stone); display: block; font-size: 10px; text-transform: uppercase;">Created At</span>
              <span id="drawer-created-time" style="font-family: var(--font-mono); color: var(--color-stone);">--</span>
            </div>
            <div id="drawer-customer-block" style="grid-column: span 2; border-top: 1px solid var(--border-subtle); padding-top: 8px; display: none;">
              <span style="color: var(--color-stone); display: block; font-size: 10px; text-transform: uppercase;">Customer Info</span>
              <span id="drawer-customer-info" style="color: var(--color-linen); font-weight: 600;">--</span>
            </div>
          </div>

          <!-- Line Items List -->
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; margin-bottom: 8px;">Order Line Items</div>
            <div id="drawer-items-list" style="display: flex; flex-direction: column; gap: 6px;">
              <!-- Populated dynamically -->
            </div>
          </div>

          <!-- Financial Breakdown -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; color: var(--color-stone);">
              <span>Subtotal:</span>
              <span id="drawer-subtotal" style="font-family: var(--font-mono); color: var(--color-linen);">₹0.00</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: var(--color-stone);">
              <span>Tax (5% GST):</span>
              <span id="drawer-tax" style="font-family: var(--font-mono); color: var(--color-linen);">₹0.00</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 14px; border-top: 1px solid var(--border-subtle); padding-top: 6px; margin-top: 2px;">
              <span style="color: var(--color-linen);">Total Amount:</span>
              <span id="drawer-total" style="font-family: var(--font-mono); color: var(--color-copper);">₹0.00</span>
            </div>
          </div>

          <!-- Kitchen Task Progression -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Kitchen Progression</span>
              <a href="/kds?branch=${encodeURIComponent(activeBranch.id)}" style="font-size: 11px; color: var(--color-copper); text-decoration: none;">View KDS Queue ↗</a>
            </div>
            <div id="drawer-tasks-list" style="display: flex; flex-direction: column; gap: 6px;">
              <!-- Populated dynamically -->
            </div>
          </div>

          <!-- Cancellation Reason Box (Shown when cancelling) -->
          <div id="drawer-cancel-box" style="display: none; background: rgba(201, 87, 87, 0.08); border: 1px solid rgba(201, 87, 87, 0.3); border-radius: 8px; padding: 12px;">
            <div style="font-size: 11px; font-weight: 700; color: var(--color-crimson); text-transform: uppercase; margin-bottom: 6px;">Mandatory Cancellation Reason</div>
            <textarea id="drawer-cancel-reason" rows="2" placeholder="e.g. Guest requested change before cook fire..." style="width: 100%; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 4px; padding: 6px 8px; color: var(--color-linen); font-size: 12px; resize: none; margin-bottom: 8px;"></textarea>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button class="btn btn-secondary btn-sm" onclick="window.ordersApp.toggleCancelBox(false)">Dismiss</button>
              <button id="btn-confirm-cancel" class="btn btn-sm" style="background: var(--color-crimson); color: #FFF;" onclick="window.ordersApp.submitCancellation()">Confirm Void & Cancel</button>
            </div>
          </div>
        </div>

        <!-- Drawer Actions Footer -->
        <div id="drawer-footer-actions" style="padding: 14px 20px; border-top: 1px solid var(--border-subtle); background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 8px;">
          <!-- Dynamically populated buttons based on status -->
        </div>
      </div>
    </div>
  </div>

  <!-- Toast Notification Container -->
  <div id="orders-toast-container" style="position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;"></div>

  <!-- Page Styles -->
  <style>
    .filter-pill {
      background: var(--color-charcoal);
      color: var(--color-stone);
      border: 1px solid var(--border-default);
      border-radius: 6px;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .filter-pill:hover {
      background: var(--color-elevated);
      color: var(--color-linen);
      border-color: var(--border-strong);
    }
    .filter-pill.active {
      background: var(--color-copper);
      color: #FFFFFF;
      border-color: var(--color-copper);
    }
    .order-row {
      display: grid;
      grid-template-columns: 110px 80px 140px 1fr 110px 90px 100px;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-subtle);
      transition: background 0.15s ease;
      cursor: pointer;
    }
    .order-row:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    .order-row.selected {
      background: rgba(200, 107, 60, 0.08);
      border-left: 3px solid var(--color-copper);
    }

    @media (max-width: 960px) {
      .orders-table-header {
        display: none !important;
      }
      .order-row {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        padding: 16px;
      }
      .order-detail-drawer {
        position: fixed !important;
        inset: auto 0 0 0 !important;
        width: 100% !important;
        max-height: 85vh !important;
        border-radius: 16px 16px 0 0 !important;
        z-index: 1000 !important;
      }
    }
  </style>

  <!-- Operational Client Logic -->
  <script>
    (function() {
      const initialOrdersData = ${serializedInitialOrders};
      const currentBranchId = "${activeBranch.id}";

      let allOrders = initialOrdersData;
      let activeFilter = 'ALL';
      let searchQuery = '';
      let selectedOrderId = null;
      let currentOrderDetails = null;

      function getStaffHeaders() {
        const token = (window.__STAFF_SESSION__ && window.__STAFF_SESSION__.token) || '';
        const headers = {
          'Content-Type': 'application/json',
          'X-Staff-Role': (window.__STAFF_SESSION__ && window.__STAFF_SESSION__.role) || 'OPERATIONS',
          'X-Branch-Id': currentBranchId
        };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return headers;
      }

      function showToast(message, type) {
        const container = document.getElementById('orders-toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.style.cssText = 'pointer-events: auto; padding: 10px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); animation: slideIn 0.2s ease;';
        if (type === 'error') {
          toast.style.background = 'var(--color-crimson)';
          toast.style.color = '#FFF';
        } else if (type === 'success') {
          toast.style.background = 'var(--color-sage)';
          toast.style.color = '#FFF';
        } else {
          toast.style.background = 'var(--color-elevated)';
          toast.style.color = 'var(--color-linen)';
          toast.style.border = '1px solid var(--border-strong)';
        }
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(function() {
          toast.style.opacity = '0';
          toast.style.transition = 'opacity 0.3s ease';
          setTimeout(function() { toast.remove(); }, 300);
        }, 3200);
      }

      function getStatusBadge(status) {
        let badgeClass = 'badge-neutral';
        let label = status;
        if (status === 'CONFIRMED') {
          badgeClass = 'badge-copper';
          label = 'CONFIRMED';
        } else if (status === 'IN_PREPARATION') {
          badgeClass = 'badge-sky';
          label = 'IN KITCHEN';
        } else if (status === 'SERVED') {
          badgeClass = 'badge-sage';
          label = 'SERVED';
        } else if (status === 'PAID') {
          badgeClass = 'badge-sage';
          label = 'PAID / SETTLED';
        } else if (status === 'COMPED') {
          badgeClass = 'badge-copper';
          label = 'COMPED';
        } else if (status === 'CANCELLED') {
          badgeClass = 'badge-crimson';
          label = 'CANCELLED';
        } else if (status === 'VOIDED') {
          badgeClass = 'badge-neutral';
          label = 'VOIDED';
        }
        return '<span class="badge ' + badgeClass + '">' + label + '</span>';
      }

      function updateKPIs() {
        const activeOrders = allOrders.filter(function(o) {
          return !['PAID', 'VOIDED', 'CANCELLED', 'COMPED'].includes(o.status);
        });
        const prepOrders = allOrders.filter(function(o) { return o.status === 'IN_PREPARATION'; });
        const servedOrders = allOrders.filter(function(o) { return o.status === 'SERVED'; });
        const activeMinor = activeOrders.reduce(function(sum, o) { return sum + (o.totalMinor || 0); }, 0);

        document.getElementById('kpi-active-count').textContent = activeOrders.length;
        document.getElementById('kpi-prep-count').textContent = prepOrders.length;
        document.getElementById('kpi-served-count').textContent = servedOrders.length;
        document.getElementById('kpi-revenue-total').textContent = '₹' + (activeMinor / 100).toFixed(2);
      }

      function getFilteredOrders() {
        return allOrders.filter(function(o) {
          if (activeFilter === 'ACTIVE') {
            if (['PAID', 'VOIDED', 'CANCELLED', 'COMPED'].includes(o.status)) return false;
          } else if (activeFilter === 'TERMINAL') {
            if (!['CANCELLED', 'VOIDED'].includes(o.status)) return false;
          } else if (activeFilter !== 'ALL') {
            if (o.status !== activeFilter) return false;
          }

          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const idMatch = o.orderId.toLowerCase().includes(q);
            const tblMatch = o.tableNumber.toLowerCase().includes(q);
            const custMatch = (o.customer && ((o.customer.name && o.customer.name.toLowerCase().includes(q)) || (o.customer.phone && o.customer.phone.includes(q)))) ||
                              (o.guestName && o.guestName.toLowerCase().includes(q));
            const itemMatch = (o.items || []).some(function(it) { return it.name.toLowerCase().includes(q); });
            if (!idMatch && !tblMatch && !custMatch && !itemMatch) return false;
          }
          return true;
        });
      }

      function renderOrdersList() {
        const body = document.getElementById('orders-list-body');
        if (!body) return;

        const filtered = getFilteredOrders();
        updateKPIs();

        if (filtered.length === 0) {
          body.innerHTML = 
            '<div style="padding: 48px 20px; text-align: center; color: var(--color-stone); font-size: 13px;">' +
              '<div style="font-size: 28px; margin-bottom: 8px;">📋</div>' +
              '<div style="font-weight: 700; color: var(--color-linen); margin-bottom: 4px;">No matching orders found</div>' +
              '<div>Try adjusting your active filter or search keywords.</div>' +
            '</div>';
          return;
        }

        body.innerHTML = filtered.map(function(ord) {
          const isSelected = ord.orderId === selectedOrderId;
          const itemsSummary = (ord.items || []).map(function(it) {
            return it.quantity + '× ' + it.name;
          }).join(' · ');

          let quickAction = '';
          if (ord.status === 'CONFIRMED') {
            quickAction = '<button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.ordersApp.updateStatus(&quot;' + ord.orderId + '&quot;, &quot;IN_PREPARATION&quot;)">Start Prep</button>';
          } else if (ord.status === 'IN_PREPARATION') {
            quickAction = '<button class="btn btn-secondary btn-sm" style="color:var(--color-sage);border-color:rgba(93,154,122,0.4);" onclick="event.stopPropagation(); window.ordersApp.updateStatus(&quot;' + ord.orderId + '&quot;, &quot;SERVED&quot;)">Mark Served</button>';
          } else {
            quickAction = '<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); window.ordersApp.selectOrder(&quot;' + ord.orderId + '&quot;)">Details →</button>';
          }

          return (
            '<div class="order-row' + (isSelected ? ' selected' : '') + '" onclick="window.ordersApp.selectOrder(&quot;' + ord.orderId + '&quot;)">' +
              '<div style="font-family: var(--font-mono); font-weight: 700; color: var(--color-linen); font-size: 13px;">' + ord.orderId + '</div>' +
              '<div style="font-weight: 800; color: var(--color-linen);">' + ord.tableNumber + '</div>' +
              '<div>' + getStatusBadge(ord.status) + '</div>' +
              '<div style="font-size: 13px; color: var(--color-linen); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 12px;" title="' + itemsSummary + '">' +
                itemsSummary +
              '</div>' +
              '<div style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--color-copper);">' +
                '₹' + ((ord.totalMinor || 0) / 100).toFixed(2) +
              '</div>' +
              '<div style="text-align: right; font-size: 12px; color: var(--color-stone); font-family: var(--font-mono);">' +
                ord.createdAt +
              '</div>' +
              '<div style="text-align: center;">' +
                quickAction +
              '</div>' +
            '</div>'
          );
        }).join('');
      }

      async function refreshOrders() {
        const icon = document.getElementById('refresh-icon');
        if (icon) icon.style.transform = 'rotate(360deg)';

        try {
          const res = await fetch('/api/restaurant/orders?branchId=' + encodeURIComponent(currentBranchId), {
            headers: getStaffHeaders()
          });
          const json = await res.json();
          if (res.ok && json.success) {
            allOrders = json.data || json.orders || [];
            renderOrdersList();
            if (selectedOrderId) {
              const updated = allOrders.find(function(o) { return o.orderId === selectedOrderId; });
              if (updated) openDrawerWithOrder(updated);
            }
          }
        } catch (err) {
          console.error('Failed to refresh orders:', err);
        } finally {
          setTimeout(function() {
            if (icon) icon.style.transform = 'none';
          }, 400);
        }
      }

      async function selectOrder(orderId) {
        selectedOrderId = orderId;
        renderOrdersList();

        const order = allOrders.find(function(o) { return o.orderId === orderId; });
        if (!order) return;

        openDrawerWithOrder(order);

        // Fetch detailed order and linked tasks from server
        try {
          const res = await fetch('/api/restaurant/orders/' + encodeURIComponent(orderId), {
            headers: getStaffHeaders()
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              currentOrderDetails = data.data;
              populateDrawerTasks(data.tasks || []);
            }
          }
        } catch (err) {
          console.error('Failed to fetch order details:', err);
        }
      }

      function openDrawerWithOrder(ord) {
        const drawer = document.getElementById('order-detail-drawer');
        if (!drawer) return;
        drawer.style.display = 'flex';

        document.getElementById('drawer-order-id').textContent = ord.orderId;
        document.getElementById('drawer-table-num').textContent = ord.tableNumber;
        document.getElementById('drawer-status-badge').innerHTML = getStatusBadge(ord.status);
        document.getElementById('drawer-session-id').textContent = ord.sessionId ? ord.sessionId.substring(0, 14) + '...' : 'Direct Walk-in';
        document.getElementById('drawer-created-time').textContent = ord.createdAt;

        // Customer Info
        const custBlock = document.getElementById('drawer-customer-block');
        const custInfo = document.getElementById('drawer-customer-info');
        if (ord.customer && (ord.customer.name || ord.customer.phone)) {
          custBlock.style.display = 'block';
          custInfo.textContent = (ord.customer.name || 'Guest') + (ord.customer.phone ? ' · ' + ord.customer.phone : '') + (ord.customer.address ? ' (' + ord.customer.address + ')' : '');
        } else if (ord.guestName) {
          custBlock.style.display = 'block';
          custInfo.textContent = ord.guestName;
        } else {
          custBlock.style.display = 'none';
        }

        // Line Items
        const itemsList = document.getElementById('drawer-items-list');
        itemsList.innerHTML = (ord.items || []).map(function(it) {
          const lineTotal = ((it.unitPriceMinor || 0) * (it.quantity || 1)) / 100;
          return (
            '<div style="background: var(--color-charcoal); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center;">' +
              '<div>' +
                '<div style="font-weight: 700; color: var(--color-linen); font-size: 13px;">' + it.quantity + '× ' + it.name + '</div>' +
                '<div style="font-size: 11px; color: var(--color-stone); display: flex; gap: 8px; margin-top: 2px;">' +
                  '<span>Station: ' + (it.station || 'EXPO') + '</span>' +
                  (it.guestName ? '<span>· ' + it.guestName + '</span>' : '') +
                '</div>' +
              '</div>' +
              '<div style="font-family: var(--font-mono); font-weight: 700; color: var(--color-copper); font-size: 13px;">' +
                '₹' + lineTotal.toFixed(2) +
              '</div>' +
            '</div>'
          );
        }).join('');

        // Totals
        document.getElementById('drawer-subtotal').textContent = '₹' + ((ord.subtotalMinor || 0) / 100).toFixed(2);
        document.getElementById('drawer-tax').textContent = '₹' + ((ord.taxMinor || 0) / 100).toFixed(2);
        document.getElementById('drawer-total').textContent = '₹' + ((ord.totalMinor || 0) / 100).toFixed(2);

        // Reset Cancel Box
        toggleCancelBox(false);

        // Actions Footer
        renderDrawerActions(ord);
      }

      function populateDrawerTasks(tasks) {
        const tasksList = document.getElementById('drawer-tasks-list');
        if (!tasksList) return;

        if (tasks.length === 0) {
          tasksList.innerHTML = '<div style="color: var(--color-stone); font-size: 12px;">No active kitchen task tracking for this order.</div>';
          return;
        }

        tasksList.innerHTML = tasks.map(function(t) {
          let taskStatusClass = 'badge-neutral';
          if (t.status === 'READY') taskStatusClass = 'badge-sage';
          else if (t.status === 'IN_PROGRESS') taskStatusClass = 'badge-sky';
          else if (t.status === 'BUMPED') taskStatusClass = 'badge-neutral';
          else if (t.status === 'QUEUED') taskStatusClass = 'badge-copper';

          return (
            '<div style="background: var(--color-charcoal); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">' +
              '<div>' +
                '<span style="font-weight: 600; color: var(--color-linen);">' + t.quantity + '× ' + t.itemName + '</span>' +
                '<span style="font-size: 10px; color: var(--color-stone); margin-left: 6px;">(' + t.station + ')</span>' +
              '</div>' +
              '<span class="badge ' + taskStatusClass + '">' + t.status + '</span>' +
            '</div>'
          );
        }).join('');
      }

      function renderDrawerActions(ord) {
        const footer = document.getElementById('drawer-footer-actions');
        if (!footer) return;

        if (ord.status === 'CONFIRMED') {
          footer.innerHTML = 
            '<button class="btn btn-primary" style="width: 100%;" onclick="window.ordersApp.updateStatus(&quot;' + ord.orderId + '&quot;, &quot;IN_PREPARATION&quot;)">▶ Advance to Kitchen Preparation</button>' +
            '<button class="btn btn-secondary" style="width: 100%; color: var(--color-crimson); border-color: rgba(201,87,87,0.3);" onclick="window.ordersApp.toggleCancelBox(true)">Cancel / Void Order</button>';
        } else if (ord.status === 'IN_PREPARATION') {
          footer.innerHTML = 
            '<button class="btn btn-primary" style="width: 100%; background: var(--color-sage);" onclick="window.ordersApp.updateStatus(&quot;' + ord.orderId + '&quot;, &quot;SERVED&quot;)">✓ Mark All Items Served</button>' +
            '<button class="btn btn-secondary" style="width: 100%; color: var(--color-crimson); border-color: rgba(201,87,87,0.3);" onclick="window.ordersApp.toggleCancelBox(true)">Cancel / Void Order</button>';
        } else if (ord.status === 'SERVED') {
          footer.innerHTML = 
            '<div style="font-size: 12px; color: var(--color-sage); font-weight: 600; text-align: center; padding: 4px;">Items Served · Awaiting Bill Settlement</div>' +
            '<a href="/operations/floor?branch=' + encodeURIComponent(currentBranchId) + '&table=' + encodeURIComponent(ord.tableNumber) + '" class="btn btn-secondary" style="width: 100%; text-align: center;">Open Table ' + ord.tableNumber + ' in Floor POS ↗</a>';
        } else if (ord.status === 'PAID') {
          footer.innerHTML = 
            '<div style="font-size: 12px; color: var(--color-stone); text-align: center; padding: 4px;">✓ Order Settled & Paid via Table Checkout</div>';
        } else if (ord.status === 'CANCELLED' || ord.status === 'VOIDED') {
          footer.innerHTML = 
            '<div style="font-size: 12px; color: var(--color-crimson); text-align: center; padding: 4px;">✕ Order is ' + ord.status + '</div>';
        } else {
          footer.innerHTML = '';
        }
      }

      async function updateStatus(orderId, newStatus) {
        try {
          const res = await fetch('/api/restaurant/orders/' + encodeURIComponent(orderId) + '/status', {
            method: 'PATCH',
            headers: getStaffHeaders(),
            body: JSON.stringify({ newStatus: newStatus })
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            showToast(json.error || 'Status update failed', 'error');
            return;
          }
          showToast('Order ' + orderId + ' advanced to ' + newStatus, 'success');
          await refreshOrders();
        } catch (err) {
          console.error('Status update failed:', err);
          showToast('Network error updating order status', 'error');
        }
      }

      function toggleCancelBox(show) {
        const box = document.getElementById('drawer-cancel-box');
        if (box) box.style.display = show ? 'block' : 'none';
        if (show) {
          const reasonInput = document.getElementById('drawer-cancel-reason');
          if (reasonInput) reasonInput.focus();
        }
      }

      async function submitCancellation() {
        if (!selectedOrderId) return;
        const reasonInput = document.getElementById('drawer-cancel-reason');
        const reason = reasonInput ? reasonInput.value.trim() : '';

        if (!reason || reason.length < 3) {
          showToast('Please provide a mandatory reason with at least 3 characters', 'error');
          return;
        }

        const confirmBtn = document.getElementById('btn-confirm-cancel');
        if (confirmBtn) {
          confirmBtn.disabled = true;
          confirmBtn.textContent = 'Processing...';
        }

        try {
          const res = await fetch('/api/restaurant/orders/' + encodeURIComponent(selectedOrderId) + '/cancel', {
            method: 'POST',
            headers: getStaffHeaders(),
            body: JSON.stringify({ reason: reason })
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            showToast(json.error || 'Cancellation rejected by server', 'error');
            if (confirmBtn) {
              confirmBtn.disabled = false;
              confirmBtn.textContent = 'Confirm Void & Cancel';
            }
            return;
          }
          showToast('Order ' + selectedOrderId + ' cancelled and active bill deducted', 'success');
          toggleCancelBox(false);
          await refreshOrders();
        } catch (err) {
          console.error('Cancellation failed:', err);
          showToast('Network error cancelling order', 'error');
          if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm Void & Cancel';
          }
        }
      }

      function closeDrawer() {
        const drawer = document.getElementById('order-detail-drawer');
        if (drawer) drawer.style.display = 'none';
        selectedOrderId = null;
        renderOrdersList();
      }

      function setFilter(filter) {
        activeFilter = filter;
        const pills = document.querySelectorAll('#status-filter-pills .filter-pill');
        pills.forEach(function(p) {
          if (p.getAttribute('data-filter') === filter) {
            p.classList.add('active');
          } else {
            p.classList.remove('active');
          }
        });
        renderOrdersList();
      }

      let searchTimeout = null;
      function handleSearch(val) {
        searchQuery = val.trim();
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function() {
          renderOrdersList();
        }, 150);
      }

      // Expose to window for inline events
      window.ordersApp = {
        refreshOrders: refreshOrders,
        selectOrder: selectOrder,
        closeDrawer: closeDrawer,
        setFilter: setFilter,
        handleSearch: handleSearch,
        updateStatus: updateStatus,
        toggleCancelBox: toggleCancelBox,
        submitCancellation: submitCancellation
      };

      // Initial Render
      renderOrdersList();

      // Background Polling (every 5 seconds) to maintain single source of truth across Floor, KDS & Storefront
      setInterval(function() {
        refreshOrders();
      }, 5000);
    })();
  </script>
  `;
}
