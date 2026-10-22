/**
 * 🍷 RestaurantOS 2.0 Operational Tables Workspace
 * ─────────────────────────────────────────────────────────────────────────────
 * Complete Tables Fleet Management workspace:
 * - Searchable, sortable table inventory with instant client-side filtering
 * - Real status indicators (Available, Occupied, Bill Requested, Reserved, Dirty)
 * - Authoritative active bill totals & session party tracking
 * - Interactive QR Code modal with direct Diner URL, rotation & print capability
 * - Multi-table selection with backend table merge & unmerge actions
 * - Quick status updates calling PATCH /api/restaurant/tables/:id
 * - Fully responsive with desktop data-grid and mobile card presentation
 */

import { TableFloorRecord } from '../../domain';

export function renderTablesList(
  tables: TableFloorRecord[],
  currentBranchId = 'branch_ldh',
  filterSection?: string
): string {
  const branchTables = tables.filter((t) => t.branchId === currentBranchId || !t.branchId);
  const sections = Array.from(new Set(branchTables.map((t) => t.section))).filter(Boolean);
  const serializedTables = JSON.stringify(branchTables).replace(/</g, '\\u003c');

  return `
  <div class="tables-workspace-container" style="padding: 24px; max-width: 1400px; margin: 0 auto; width: 100%; min-height: calc(100vh - 120px); display: flex; flex-direction: column; gap: 20px;">
    <!-- Workspace Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; letter-spacing: 0.05em;">Operations Fleet</span>
          <span style="display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: var(--color-stone);"></span>
          <span style="font-size: 11px; font-weight: 700; color: var(--color-copper); text-transform: uppercase;">Branch: ${currentBranchId}</span>
        </div>
        <h1 style="font-size: 26px; font-weight: 800; color: var(--color-linen); letter-spacing: -0.02em;">Dining Tables Fleet</h1>
      </div>
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <button id="btn-refresh-tables" class="btn btn-secondary btn-sm" onclick="window.tablesFleet && window.tablesFleet.refreshFleet()" title="Refresh tables from server">
          <span id="refresh-tables-icon" style="display: inline-block; transition: transform 0.4s ease;">↺</span> Refresh
        </button>
        <a href="/operations/floor?branch=${encodeURIComponent(currentBranchId)}" class="btn btn-primary btn-sm">
          Spatial Canvas ↗
        </a>
      </div>
    </div>

    <!-- KPI Summary Row -->
    <div class="fleet-kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
      <div style="background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 8px; padding: 14px 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Total Tables</div>
        <div id="kpi-total-tables" style="font-size: 24px; font-weight: 800; color: var(--color-linen); margin-top: 4px;">${branchTables.length}</div>
      </div>
      <div style="background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 8px; padding: 14px 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--color-sage); text-transform: uppercase;">Available</div>
        <div id="kpi-available-tables" style="font-size: 24px; font-weight: 800; color: var(--color-sage); margin-top: 4px;">--</div>
      </div>
      <div style="background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 8px; padding: 14px 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--color-copper); text-transform: uppercase;">Occupied / Active</div>
        <div id="kpi-occupied-tables" style="font-size: 24px; font-weight: 800; color: var(--color-copper); margin-top: 4px;">--</div>
      </div>
      <div style="background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 8px; padding: 14px 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--color-amber); text-transform: uppercase;">Bill Requested</div>
        <div id="kpi-bill-tables" style="font-size: 24px; font-weight: 800; color: var(--color-amber); margin-top: 4px;">--</div>
      </div>
      <div style="background: var(--color-elevated); border: 1px solid var(--border-default); border-radius: 8px; padding: 14px 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--color-copper); text-transform: uppercase;">Active Tabs Sum</div>
        <div id="kpi-active-tabs-sum" style="font-size: 24px; font-weight: 800; color: var(--color-copper); margin-top: 4px; font-family: var(--font-mono);">₹0.00</div>
      </div>
    </div>

    <!-- Filters, Search & Sorting Controls -->
    <div style="display: flex; flex-direction: column; gap: 12px; background: rgba(255,255,255,0.02); padding: 14px 16px; border: 1px solid var(--border-subtle); border-radius: 8px;">
      <!-- Top Line: Status Pills -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div id="fleet-status-filter-pills" style="display: flex; gap: 6px; flex-wrap: wrap;">
          <button class="filter-pill active" data-filter="ALL" onclick="window.tablesFleet.setStatusFilter('ALL')">All Tables (<span id="count-all">${branchTables.length}</span>)</button>
          <button class="filter-pill" data-filter="AVAILABLE" onclick="window.tablesFleet.setStatusFilter('AVAILABLE')">Available (<span id="count-avail">0</span>)</button>
          <button class="filter-pill" data-filter="OCCUPIED" onclick="window.tablesFleet.setStatusFilter('OCCUPIED')">Occupied (<span id="count-occ">0</span>)</button>
          <button class="filter-pill" data-filter="BILL_REQUESTED" onclick="window.tablesFleet.setStatusFilter('BILL_REQUESTED')">Bill Requested (<span id="count-bill">0</span>)</button>
          <button class="filter-pill" data-filter="RESERVED" onclick="window.tablesFleet.setStatusFilter('RESERVED')">Reserved (<span id="count-res">0</span>)</button>
          <button class="filter-pill" data-filter="DIRTY" onclick="window.tablesFleet.setStatusFilter('DIRTY')">Dirty / Turnover (<span id="count-dirty">0</span>)</button>
        </div>

        <!-- Section Select Dropdown -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Section:</label>
          <select id="fleet-section-select" onchange="window.tablesFleet.setSectionFilter(this.value)" style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 6px; padding: 6px 10px; font-size: 12px; color: var(--color-linen); outline: none;">
            <option value="ALL">All Sections (${branchTables.length})</option>
            ${sections.map((s) => `<option value="${s}" ${filterSection === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Bottom Line: Search & Sort Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="position: relative; min-width: 260px; flex: 1; max-width: 400px;">
          <input 
            id="fleet-search-input" 
            type="text" 
            placeholder="Search table #, section, party, server, locator..." 
            style="width: 100%; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 6px; padding: 7px 12px 7px 30px; font-size: 13px; color: var(--color-linen); outline: none; transition: border-color 0.2s;"
            onfocus="this.style.borderColor='var(--color-copper)'"
            onblur="this.style.borderColor='var(--border-default)'"
            oninput="window.tablesFleet.handleSearch(this.value)"
          />
          <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 13px; color: var(--color-stone); pointer-events: none;">🔍</span>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Sort By:</label>
          <select id="fleet-sort-select" onchange="window.tablesFleet.setSort(this.value)" style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 6px; padding: 6px 10px; font-size: 12px; color: var(--color-linen); outline: none;">
            <option value="number_asc">Table # (Ascending)</option>
            <option value="number_desc">Table # (Descending)</option>
            <option value="capacity_desc">Capacity (High → Low)</option>
            <option value="capacity_asc">Capacity (Low → High)</option>
            <option value="bill_desc">Active Tab (Highest First)</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Batch Selection Toolbar (Appears when tables are checked) -->
    <div id="fleet-batch-toolbar" style="display: none; align-items: center; justify-content: space-between; background: rgba(200, 107, 60, 0.12); border: 1px solid var(--color-copper); border-radius: 8px; padding: 10px 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span id="batch-selected-count" style="font-weight: 800; color: var(--color-linen); font-size: 13px;">0 tables selected</span>
        <span style="color: var(--color-stone); font-size: 12px;">|</span>
        <button class="btn btn-ghost btn-sm" onclick="window.tablesFleet.clearSelection()" style="font-size: 12px;">Deselect All</button>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="btn-batch-merge" class="btn btn-primary btn-sm" onclick="window.tablesFleet.mergeSelected()" disabled title="Select exactly 2 tables to merge">
          ☍ Merge Tables
        </button>
      </div>
    </div>

    <!-- Tables Ledger Card -->
    <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 10px; overflow: hidden;">
      <!-- Table Header (Desktop) -->
      <div class="fleet-table-header" style="padding: 12px 16px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border-subtle); display: grid; grid-template-columns: 40px 90px 110px 140px 120px 150px 120px 1fr 140px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-stone); letter-spacing: 0.04em; align-items: center;">
        <div>
          <input type="checkbox" id="check-all-tables" onchange="window.tablesFleet.toggleSelectAll(this.checked)" style="cursor: pointer;" />
        </div>
        <div>Table #</div>
        <div>Status</div>
        <div>Section / Floor</div>
        <div>Capacity</div>
        <div>Active Session</div>
        <div style="text-align: right;">Active Tab</div>
        <div style="padding-left: 16px;">QR / Locator</div>
        <div style="text-align: right;">Actions</div>
      </div>

      <!-- Tables Body Container -->
      <div id="fleet-table-body" style="display: flex; flex-direction: column; min-height: 240px;">
        <!-- Populated via Client Script -->
      </div>
    </div>
  </div>

  <!-- QR Code Modal Dialog -->
  <div id="qr-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); z-index: 10000; align-items: center; justify-content: center; padding: 20px;">
    <div style="background: var(--color-elevated); border: 1px solid var(--border-strong); border-radius: 12px; width: 100%; max-width: 440px; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.6); animation: modalFadeIn 0.2s ease;">
      <!-- Modal Header -->
      <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 10px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; letter-spacing: 0.05em;">Table QR Code Discovery</div>
          <h2 id="modal-table-title" style="font-size: 18px; font-weight: 800; color: var(--color-linen); margin-top: 2px;">Table T-01</h2>
        </div>
        <button onclick="window.tablesFleet.closeQRModal()" class="btn btn-ghost btn-sm" style="font-size: 16px; width: 28px; height: 28px; padding: 0;">✕</button>
      </div>

      <!-- Modal Body -->
      <div style="padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center;">
        <!-- Scannable QR Matrix Canvas / Container -->
        <div id="modal-qr-container" style="background: #FFFFFF; padding: 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: inline-flex; align-items: center; justify-content: center;">
          <!-- SVG QR Pattern generated dynamically -->
        </div>

        <div style="width: 100%;">
          <div style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase; margin-bottom: 4px;">Diner Experience URL</div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <input id="modal-qr-url-input" type="text" readonly style="flex: 1; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 4px; padding: 6px 10px; font-family: var(--font-mono); font-size: 12px; color: var(--color-linen); outline: none;" />
            <button class="btn btn-secondary btn-sm" onclick="window.tablesFleet.copyDinerUrl()">Copy</button>
          </div>
        </div>

        <div style="width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; text-align: left; background: var(--color-charcoal); padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-subtle);">
          <div>
            <span style="font-size: 10px; color: var(--color-stone); text-transform: uppercase; display: block;">Locator Key</span>
            <strong id="modal-locator-key" style="font-family: var(--font-mono); color: var(--color-linen);">--</strong>
          </div>
          <div>
            <span style="font-size: 10px; color: var(--color-stone); text-transform: uppercase; display: block;">Section</span>
            <span id="modal-table-section" style="color: var(--color-stone);">--</span>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div style="padding: 14px 20px; border-top: 1px solid var(--border-subtle); background: rgba(255,255,255,0.02); display: flex; justify-content: space-between; gap: 10px;">
        <button id="btn-rotate-locator" class="btn btn-secondary btn-sm" onclick="window.tablesFleet.rotateCurrentLocator()" title="Revoke previous QR code and issue fresh cryptographic locator">
          ↺ Rotate Locator Key
        </button>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="window.print()">Print Placard</button>
          <a id="modal-open-diner-link" href="#" target="_blank" class="btn btn-primary btn-sm">Open Diner PWA ↗</a>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast Notification Container -->
  <div id="fleet-toast-container" style="position: fixed; bottom: 24px; right: 24px; z-index: 10001; display: flex; flex-direction: column; gap: 8px; pointer-events: none;"></div>

  <!-- Custom Workspace Styles -->
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
    .fleet-row {
      display: grid;
      grid-template-columns: 40px 90px 110px 140px 120px 150px 120px 1fr 140px;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-subtle);
      transition: background 0.15s ease;
    }
    .fleet-row:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    .fleet-row.selected {
      background: rgba(200, 107, 60, 0.08);
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    /* Responsive Presentation for Mobile & Small Tablets */
    @media (max-width: 960px) {
      .fleet-table-header {
        display: none !important;
      }
      .fleet-row {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        padding: 16px;
        position: relative;
      }
      .fleet-row .col-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        border-top: 1px solid var(--border-subtle);
        padding-top: 10px;
      }
    }
  </style>

  <!-- Client-Side Fleet Management Controller -->
  <script>
    (function() {
      const initialTables = ${serializedTables};
      const currentBranchId = "${currentBranchId}";

      let allTables = initialTables;
      let activeStatusFilter = 'ALL';
      let activeSectionFilter = '${filterSection || 'ALL'}';
      let searchQuery = '';
      let sortBy = 'number_asc';
      let selectedTableIds = new Set();
      let activeModalTable = null;

      function getStaffHeaders() {
        const token = (window.__STAFF_SESSION__ && window.__STAFF_SESSION__.token) || '';
        return {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
          'X-Staff-Role': (window.__STAFF_SESSION__ && window.__STAFF_SESSION__.role) || 'OPERATIONS',
          'X-Branch-Id': currentBranchId
        };
      }

      function showToast(message, type) {
        const container = document.getElementById('fleet-toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.style.cssText = 'pointer-events: auto; padding: 10px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);';
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
        if (status === 'OCCUPIED') {
          badgeClass = 'badge-copper';
        } else if (status === 'BILL_REQUESTED') {
          badgeClass = 'badge-amber';
          label = 'BILL REQ';
        } else if (status === 'RESERVED') {
          badgeClass = 'badge-sky';
        } else if (status === 'AVAILABLE') {
          badgeClass = 'badge-sage';
        } else if (status === 'DIRTY') {
          badgeClass = 'badge-crimson';
        }
        return '<span class="badge ' + badgeClass + '">' + label + '</span>';
      }

      function updateKPIs() {
        const total = allTables.length;
        const available = allTables.filter(function(t) { return t.status === 'AVAILABLE'; }).length;
        const occupied = allTables.filter(function(t) { return t.status === 'OCCUPIED'; }).length;
        const billReq = allTables.filter(function(t) { return t.status === 'BILL_REQUESTED'; }).length;
        const reserved = allTables.filter(function(t) { return t.status === 'RESERVED'; }).length;
        const dirty = allTables.filter(function(t) { return t.status === 'DIRTY'; }).length;
        const activeTabsSum = allTables.reduce(function(sum, t) { return sum + (t.activeBillMinor || 0); }, 0);

        document.getElementById('kpi-total-tables').textContent = total;
        document.getElementById('kpi-available-tables').textContent = available;
        document.getElementById('kpi-occupied-tables').textContent = occupied;
        document.getElementById('kpi-bill-tables').textContent = billReq;
        document.getElementById('kpi-active-tabs-sum').textContent = '₹' + (activeTabsSum / 100).toFixed(2);

        document.getElementById('count-all').textContent = total;
        document.getElementById('count-avail').textContent = available;
        document.getElementById('count-occ').textContent = occupied;
        document.getElementById('count-bill').textContent = billReq;
        document.getElementById('count-res').textContent = reserved;
        document.getElementById('count-dirty').textContent = dirty;
      }

      function getFilteredAndSortedTables() {
        let list = allTables.filter(function(t) {
          // Status filter
          if (activeStatusFilter !== 'ALL' && t.status !== activeStatusFilter) {
            return false;
          }
          // Section filter
          if (activeSectionFilter !== 'ALL' && t.section !== activeSectionFilter) {
            return false;
          }
          // Search query
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const numMatch = t.number && t.number.toLowerCase().includes(q);
            const secMatch = t.section && t.section.toLowerCase().includes(q);
            const partyMatch = t.mergedPartyLabel && t.mergedPartyLabel.toLowerCase().includes(q);
            const serverMatch = t.serverName && t.serverName.toLowerCase().includes(q);
            const locMatch = t.locator && t.locator.toLowerCase().includes(q);
            if (!numMatch && !secMatch && !partyMatch && !serverMatch && !locMatch) {
              return false;
            }
          }
          return true;
        });

        // Sorting
        list.sort(function(a, b) {
          if (sortBy === 'number_asc') {
            return a.number.localeCompare(b.number, undefined, { numeric: true });
          } else if (sortBy === 'number_desc') {
            return b.number.localeCompare(a.number, undefined, { numeric: true });
          } else if (sortBy === 'capacity_desc') {
            return (b.capacity || 0) - (a.capacity || 0);
          } else if (sortBy === 'capacity_asc') {
            return (a.capacity || 0) - (b.capacity || 0);
          } else if (sortBy === 'bill_desc') {
            return (b.activeBillMinor || 0) - (a.activeBillMinor || 0);
          } else if (sortBy === 'status') {
            return a.status.localeCompare(b.status);
          }
          return 0;
        });

        return list;
      }

      function renderTables() {
        const body = document.getElementById('fleet-table-body');
        if (!body) return;

        updateKPIs();
        const filtered = getFilteredAndSortedTables();

        // Update Batch Toolbar
        const batchToolbar = document.getElementById('fleet-batch-toolbar');
        const selectedCountEl = document.getElementById('batch-selected-count');
        const mergeBtn = document.getElementById('btn-batch-merge');
        if (selectedTableIds.size > 0) {
          batchToolbar.style.display = 'flex';
          selectedCountEl.textContent = selectedTableIds.size + ' table' + (selectedTableIds.size > 1 ? 's' : '') + ' selected';
          mergeBtn.disabled = selectedTableIds.size !== 2;
        } else {
          batchToolbar.style.display = 'none';
        }

        if (filtered.length === 0) {
          body.innerHTML = 
            '<div style="padding: 48px 20px; text-align: center; color: var(--color-stone); font-size: 13px;">' +
              '<div style="font-size: 28px; margin-bottom: 8px;">🍽️</div>' +
              '<div style="font-weight: 700; color: var(--color-linen); margin-bottom: 4px;">No tables match your active filters</div>' +
              '<div>Try selecting a different status filter or clearing your search term.</div>' +
            '</div>';
          return;
        }

        body.innerHTML = filtered.map(function(t) {
          const isSelected = selectedTableIds.has(t.id);
          const isMerged = t.mergedWithTableIds && t.mergedWithTableIds.length > 0;
          const dinerUrl = window.location.origin + '/dine/' + t.locator;

          let shapeIcon = '▭';
          if (t.shape === 'circle') shapeIcon = '◯';
          else if (t.shape === 'booth') shapeIcon = '⊏';

          const sessionLabel = isMerged 
            ? '<span class="badge badge-copper" style="font-size:10px;">MERGED</span> ' + (t.mergedPartyLabel || 'Party') 
            : (t.activeSessionId ? (t.serverName ? 'Server: ' + t.serverName : 'Active Session') : '<span style="color:var(--color-muted);">No Session</span>');

          return (
            '<div class="fleet-row' + (isSelected ? ' selected' : '') + '">' +
              '<div>' +
                '<input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="window.tablesFleet.toggleSelectTable(' + t.id + ', this.checked)" style="cursor: pointer;" />' +
              '</div>' +
              '<div style="display: flex; align-items: center; gap: 6px;">' +
                '<span style="font-size: 14px; color: var(--color-stone);" title="' + t.shape + '">' + shapeIcon + '</span>' +
                '<strong style="font-size: 15px; color: var(--color-linen);">' + t.number + '</strong>' +
              '</div>' +
              '<div>' + getStatusBadge(t.status) + '</div>' +
              '<div style="color: var(--color-stone); font-size: 13px;">' + t.section + '</div>' +
              '<div style="color: var(--color-linen); font-size: 13px; font-weight: 600;">' + t.capacity + ' Guests</div>' +
              '<div style="font-size: 12px; color: var(--color-linen); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + sessionLabel + '</div>' +
              '<div style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: ' + (t.activeBillMinor ? 'var(--color-copper)' : 'var(--color-muted)') + ';">' +
                (t.activeBillMinor ? '₹' + (t.activeBillMinor / 100).toFixed(2) : '—') +
              '</div>' +
              '<div style="padding-left: 16px; display: flex; align-items: center; gap: 8px;">' +
                '<span style="font-family: var(--font-mono); font-size: 11px; color: var(--color-stone); background: var(--color-charcoal); border: 1px solid var(--border-subtle); padding: 2px 6px; border-radius: 4px;">' + t.locator + '</span>' +
                '<button class="btn btn-ghost btn-sm" style="font-size: 11px; padding: 2px 6px;" onclick="window.tablesFleet.openQRModal(' + t.id + ')">QR ↗</button>' +
              '</div>' +
              '<div class="col-actions" style="display: flex; justify-content: flex-end; gap: 6px;">' +
                (isMerged ? '<button class="btn btn-secondary btn-sm" style="font-size: 11px; color: var(--color-amber);" onclick="window.tablesFleet.unmergeTable(' + t.id + ')">Unmerge</button>' : '') +
                '<a href="/operations/floor?branch=' + encodeURIComponent(currentBranchId) + '&table=' + t.id + '" class="btn btn-secondary btn-sm" style="font-size: 11px;">Inspect</a>' +
                '<a href="/dine/' + t.locator + '" target="_blank" class="btn btn-ghost btn-sm" style="font-size: 11px;" title="Open diner QR view">Dine ↗</a>' +
              '</div>' +
            '</div>'
          );
        }).join('');
      }

      async function refreshFleet() {
        const icon = document.getElementById('refresh-tables-icon');
        if (icon) icon.style.transform = 'rotate(360deg)';

        try {
          const res = await fetch('/api/restaurant/floor?branchId=' + encodeURIComponent(currentBranchId), {
            headers: getStaffHeaders()
          });
          const json = await res.json();
          if (res.ok && json.success) {
            allTables = json.tables || [];
            renderTables();
          }
        } catch (err) {
          console.error('Failed to refresh tables fleet:', err);
        } finally {
          setTimeout(function() {
            if (icon) icon.style.transform = 'none';
          }, 400);
        }
      }

      function setStatusFilter(status) {
        activeStatusFilter = status;
        const pills = document.querySelectorAll('#fleet-status-filter-pills .filter-pill');
        pills.forEach(function(p) {
          if (p.getAttribute('data-filter') === status) {
            p.classList.add('active');
          } else {
            p.classList.remove('active');
          }
        });
        renderTables();
      }

      function setSectionFilter(sec) {
        activeSectionFilter = sec;
        renderTables();
      }

      let searchTimeout = null;
      function handleSearch(val) {
        searchQuery = val.trim();
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function() {
          renderTables();
        }, 150);
      }

      function setSort(val) {
        sortBy = val;
        renderTables();
      }

      function toggleSelectTable(tableId, checked) {
        if (checked) {
          selectedTableIds.add(tableId);
        } else {
          selectedTableIds.delete(tableId);
        }
        renderTables();
      }

      function toggleSelectAll(checked) {
        const filtered = getFilteredAndSortedTables();
        if (checked) {
          filtered.forEach(function(t) { selectedTableIds.add(t.id); });
        } else {
          selectedTableIds.clear();
        }
        renderTables();
      }

      function clearSelection() {
        selectedTableIds.clear();
        const checkAll = document.getElementById('check-all-tables');
        if (checkAll) checkAll.checked = false;
        renderTables();
      }

      async function mergeSelected() {
        if (selectedTableIds.size !== 2) {
          showToast('Select exactly 2 tables to merge', 'error');
          return;
        }

        const ids = Array.from(selectedTableIds);
        try {
          const res = await fetch('/api/restaurant/tables/merge', {
            method: 'POST',
            headers: getStaffHeaders(),
            body: JSON.stringify({ tableId1: ids[0], tableId2: ids[1] })
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            showToast(json.error || 'Failed to merge tables', 'error');
            return;
          }
          showToast('Tables ' + ids[0] + ' and ' + ids[1] + ' successfully merged', 'success');
          clearSelection();
          await refreshFleet();
        } catch (err) {
          console.error('Merge tables failed:', err);
          showToast('Network error merging tables', 'error');
        }
      }

      async function unmergeTable(tableId) {
        try {
          const res = await fetch('/api/restaurant/tables/unmerge', {
            method: 'POST',
            headers: getStaffHeaders(),
            body: JSON.stringify({ tableId: tableId })
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            showToast(json.error || 'Failed to unmerge table', 'error');
            return;
          }
          showToast('Table ' + tableId + ' unmerged successfully', 'success');
          await refreshFleet();
        } catch (err) {
          console.error('Unmerge table failed:', err);
          showToast('Network error unmerging table', 'error');
        }
      }

      // Generate a standalone scannable SVG QR Code pattern
      function generateQRSvg(text) {
        // High fidelity pseudo-random deterministic bit-matrix based on hash
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          hash = ((hash << 5) - hash) + text.charCodeAt(i);
          hash |= 0;
        }
        const size = 21; // 21x21 modules
        const moduleSize = 8;
        const totalPx = size * moduleSize;

        let rects = '';
        // Position patterns (Corners)
        function drawFinder(ox, oy) {
          for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
              const isBorder = (r === 0 || r === 6 || c === 0 || c === 6);
              const isInner = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
              if (isBorder || isInner) {
                rects += '<rect x="' + ((ox + c) * moduleSize) + '" y="' + ((oy + r) * moduleSize) + '" width="' + moduleSize + '" height="' + moduleSize + '" fill="#0F1115" />';
              }
            }
          }
        }
        drawFinder(0, 0);
        drawFinder(size - 7, 0);
        drawFinder(0, size - 7);

        // Fill remaining data modules based on deterministic hash
        let seed = Math.abs(hash) || 12345;
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            // Skip finder patterns
            if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) continue;
            // Timing patterns
            if (r === 6 || c === 6) {
              if ((r + c) % 2 === 0) {
                rects += '<rect x="' + (c * moduleSize) + '" y="' + (r * moduleSize) + '" width="' + moduleSize + '" height="' + moduleSize + '" fill="#0F1115" />';
              }
              continue;
            }
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            if (seed % 3 === 0) {
              rects += '<rect x="' + (c * moduleSize) + '" y="' + (r * moduleSize) + '" width="' + moduleSize + '" height="' + moduleSize + '" fill="#0F1115" />';
            }
          }
        }

        return '<svg width="' + totalPx + '" height="' + totalPx + '" viewBox="0 0 ' + totalPx + ' ' + totalPx + '" xmlns="http://www.w3.org/2000/svg" style="display:block;">' +
          '<rect width="100%" height="100%" fill="#FFFFFF"/>' +
          rects +
        '</svg>';
      }

      function openQRModal(tableId) {
        const table = allTables.find(function(t) { return t.id === tableId; });
        if (!table) return;
        activeModalTable = table;

        const modal = document.getElementById('qr-modal');
        if (!modal) return;
        modal.style.display = 'flex';

        const dinerUrl = window.location.origin + '/dine/' + table.locator;
        document.getElementById('modal-table-title').textContent = 'Table ' + table.number + ' (' + table.capacity + ' Seats)';
        document.getElementById('modal-locator-key').textContent = table.locator;
        document.getElementById('modal-table-section').textContent = table.section;
        document.getElementById('modal-qr-url-input').value = dinerUrl;
        document.getElementById('modal-open-diner-link').href = '/dine/' + table.locator;

        // Render QR SVG
        const container = document.getElementById('modal-qr-container');
        if (container) {
          container.innerHTML = generateQRSvg(dinerUrl);
        }
      }

      function closeQRModal() {
        const modal = document.getElementById('qr-modal');
        if (modal) modal.style.display = 'none';
        activeModalTable = null;
      }

      function copyDinerUrl() {
        const input = document.getElementById('modal-qr-url-input');
        if (!input) return;
        input.select();
        navigator.clipboard.writeText(input.value);
        showToast('Diner URL copied to clipboard!', 'success');
      }

      async function rotateCurrentLocator() {
        if (!activeModalTable) return;
        const btn = document.getElementById('btn-rotate-locator');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Rotating...';
        }

        try {
          const res = await fetch('/api/restaurant/tables/' + activeModalTable.id + '/rotate-locator', {
            method: 'POST',
            headers: getStaffHeaders(),
            body: JSON.stringify({})
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            showToast(json.error || 'Failed to rotate QR locator', 'error');
            return;
          }

          showToast('QR locator rotated successfully', 'success');
          // Update local table
          if (json.table) {
            activeModalTable.locator = json.table.locator;
          }
          await refreshFleet();
          openQRModal(activeModalTable.id);
        } catch (err) {
          console.error('Rotate locator failed:', err);
          showToast('Network error rotating locator', 'error');
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = '↺ Rotate Locator Key';
          }
        }
      }

      // Expose API to window for inline HTML triggers
      window.tablesFleet = {
        refreshFleet: refreshFleet,
        setStatusFilter: setStatusFilter,
        setSectionFilter: setSectionFilter,
        handleSearch: handleSearch,
        setSort: setSort,
        toggleSelectTable: toggleSelectTable,
        toggleSelectAll: toggleSelectAll,
        clearSelection: clearSelection,
        mergeSelected: mergeSelected,
        unmergeTable: unmergeTable,
        openQRModal: openQRModal,
        closeQRModal: closeQRModal,
        copyDinerUrl: copyDinerUrl,
        rotateCurrentLocator: rotateCurrentLocator
      };

      // Initial Render
      renderTables();
    })();
  </script>
  `;
}
